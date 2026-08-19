  const EXPORT_METADATA_SANITIZER_VERSION = 1;

  function readAscii(bytes, start, length) {
    let value = '';
    const end = Math.min(bytes.length, start + length);
    for (let index = start; index < end; index += 1) value += String.fromCharCode(bytes[index]);
    return value;
  }

  function asciiLower(bytes, start = 0, length = bytes.length - start) {
    return readAscii(bytes, start, length).toLowerCase();
  }

  function concatUint8Arrays(parts) {
    const size = parts.reduce((total, part) => total + part.length, 0);
    const result = new Uint8Array(size);
    let offset = 0;
    parts.forEach((part) => {
      result.set(part, offset);
      offset += part.length;
    });
    return result;
  }

  function hasAsciiToken(bytes, tokens) {
    const text = asciiLower(bytes);
    return tokens.some(token => text.includes(token));
  }

  function isXmpPayload(bytes) {
    const text = asciiLower(bytes);
    return text.includes('http://ns.adobe.com/xap/1.0/')
      || text.includes('http://ns.adobe.com/xmp/extension/')
      || text.includes('xml:com.adobe.xmp');
  }

  function isC2paPayload(bytes) {
    return hasAsciiToken(bytes, ['c2pa', 'jumbf', 'claim_generator', 'claimgenerator']);
  }

  function readUint32BE(bytes, offset) {
    return ((bytes[offset] << 24) >>> 0)
      + (bytes[offset + 1] << 16)
      + (bytes[offset + 2] << 8)
      + bytes[offset + 3];
  }

  function writeUint32BE(bytes, offset, value) {
    bytes[offset] = (value >>> 24) & 0xff;
    bytes[offset + 1] = (value >>> 16) & 0xff;
    bytes[offset + 2] = (value >>> 8) & 0xff;
    bytes[offset + 3] = value & 0xff;
  }

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit += 1) {
        crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
      }
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function removeJpegMetadata(bytes) {
    if (bytes.length < 2 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
    const parts = [bytes.slice(0, 2)];
    let offset = 2;
    let removedXmp = false;
    let removedC2pa = false;

    while (offset < bytes.length) {
      if (bytes[offset] !== 0xff) return null;
      const markerStart = offset;
      while (bytes[offset] === 0xff) offset += 1;
      const marker = bytes[offset++];
      if (marker === 0xd9 || marker === 0xda) {
        parts.push(bytes.slice(markerStart));
        break;
      }
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        parts.push(bytes.slice(markerStart, offset));
        continue;
      }
      if (offset + 2 > bytes.length) return null;
      const segmentLength = (bytes[offset] << 8) | bytes[offset + 1];
      const segmentEnd = offset + segmentLength;
      if (segmentLength < 2 || segmentEnd > bytes.length) return null;
      const payload = bytes.slice(offset + 2, segmentEnd);
      const removeXmp = marker === 0xe1 && isXmpPayload(payload);
      const removeC2pa = marker === 0xeb && isC2paPayload(payload);
      if (removeXmp) removedXmp = true;
      if (removeC2pa) removedC2pa = true;
      if (!removeXmp && !removeC2pa) parts.push(bytes.slice(markerStart, segmentEnd));
      offset = segmentEnd;
    }

    return { bytes: concatUint8Arrays(parts), removedXmp, removedC2pa };
  }

  function removePngMetadata(bytes) {
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    if (bytes.length < 8 || !signature.every((value, index) => bytes[index] === value)) return null;
    const parts = [bytes.slice(0, 8)];
    let offset = 8;
    let removedXmp = false;
    let removedC2pa = false;

    while (offset + 12 <= bytes.length) {
      const length = readUint32BE(bytes, offset);
      const end = offset + 12 + length;
      if (end > bytes.length) return null;
      const type = readAscii(bytes, offset + 4, 4);
      const data = bytes.slice(offset + 8, offset + 8 + length);
      const lowerType = type.toLowerCase();
      const removeXmp = (type === 'iTXt' || type === 'tEXt' || type === 'zTXt')
        && (asciiLower(data).includes('xml:com.adobe.xmp') || asciiLower(data).includes('adobe:xmp'));
      const removeC2pa = type === 'caBX' || hasAsciiToken(data, ['c2pa', 'jumbf', 'claim_generator', 'claimgenerator']);
      if (removeXmp) removedXmp = true;
      if (removeC2pa) removedC2pa = true;
      if (!removeXmp && !removeC2pa) {
        if (lowerType === 'ihdr' || lowerType === 'idat' || lowerType === 'iend' || lowerType === 'plte' || lowerType === 'trns' || lowerType === 'gama' || lowerType === 'srgb' || lowerType === 'iccp') {
          parts.push(bytes.slice(offset, end));
        } else {
          parts.push(bytes.slice(offset, end));
        }
      }
      offset = end;
      if (type === 'IEND') break;
    }

    return { bytes: concatUint8Arrays(parts), removedXmp, removedC2pa };
  }

  function removeWebpMetadata(bytes) {
    if (bytes.length < 12 || readAscii(bytes, 0, 4) !== 'RIFF' || readAscii(bytes, 8, 4) !== 'WEBP') return null;
    const parts = [bytes.slice(0, 8)];
    let offset = 12;
    let removedXmp = false;
    let removedC2pa = false;

    while (offset + 8 <= bytes.length) {
      const type = readAscii(bytes, offset, 4);
      const length = readUint32BE(bytes, offset + 4);
      const end = offset + 8 + length + (length & 1);
      if (end > bytes.length) return null;
      const data = bytes.slice(offset + 8, offset + 8 + length);
      const removeXmp = type === 'XMP ' || isXmpPayload(data);
      const removeC2pa = type === 'C2PA' || type === 'JUMBF' || isC2paPayload(data);
      if (removeXmp) removedXmp = true;
      if (removeC2pa) removedC2pa = true;
      if (!removeXmp && !removeC2pa) parts.push(bytes.slice(offset, end));
      offset = end;
    }

    const result = concatUint8Arrays(parts);
    writeUint32BE(result, 4, result.length - 8);
    return { bytes: result, removedXmp, removedC2pa };
  }

  async function sanitizeExportImage(blob) {
    const source = new Uint8Array(await blob.arrayBuffer());
    const detected = removeJpegMetadata(source) || removePngMetadata(source) || removeWebpMetadata(source);
    if (!detected) {
      return { blob, format: 'unsupported', removedXmp: false, removedC2pa: false };
    }
    const nextBlob = new Blob([detected.bytes], { type: blob.type || 'application/octet-stream' });
    return { ...detected, blob: nextBlob, format: blob.type || 'unknown' };
  }

  window.sanitizeExportImage = sanitizeExportImage;