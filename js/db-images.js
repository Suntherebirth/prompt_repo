  function getImageExtensionFromMimeType(mimeType) {
    const mime = String(mimeType || '').toLowerCase();
    if (mime === 'image/jpeg') return 'jpg';
    if (mime === 'image/png') return 'png';
    if (mime === 'image/webp') return 'webp';
    if (mime === 'image/gif') return 'gif';
    if (mime === 'image/bmp') return 'bmp';
    if (mime === 'image/svg+xml') return 'svg';
    if (mime === 'image/avif') return 'avif';
    return 'bin';
  }

  function getImageExtension(fileName, mimeType) {
    const file = String(fileName || '');
    const extMatch = file.match(/\.([a-zA-Z0-9]+)$/);
    if (extMatch?.[1]) return extMatch[1].toLowerCase();
    return getImageExtensionFromMimeType(mimeType);
  }

  function dataUrlToBlob(dataUrl) {
    const value = String(dataUrl || '');
    const match = value.match(/^data:([^;,]+)?(;base64)?,(.*)$/);
    if (!match) throw new Error('유효하지 않은 데이터 URL입니다');
    const mimeType = match[1] || 'application/octet-stream';
    const isBase64 = !!match[2];
    const body = match[3] || '';
    let binary;
    if (isBase64) {
      binary = atob(body);
    } else {
      binary = decodeURIComponent(body);
    }
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mimeType });
  }

  function openImageDb() {
    if (imageDbPromise) return imageDbPromise;
    imageDbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(IMAGE_DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IMAGE_STORE_NAME)) {
          db.createObjectStore(IMAGE_STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('이미지 DB를 열 수 없습니다'));
    });
    return imageDbPromise;
  }

  async function withImageStore(mode, worker) {
    const db = await openImageDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IMAGE_STORE_NAME, mode);
      const store = tx.objectStore(IMAGE_STORE_NAME);
      let settled = false;

      const finishResolve = (value) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };

      const finishReject = (error) => {
        if (settled) return;
        settled = true;
        reject(error);
      };

      tx.onerror = () => finishReject(tx.error || new Error('이미지 DB 트랜잭션 실패'));
      tx.onabort = () => finishReject(tx.error || new Error('이미지 DB 트랜잭션 중단'));

      Promise.resolve()
        .then(() => worker(store))
        .then((result) => {
          tx.oncomplete = () => finishResolve(result);
        })
        .catch(finishReject);
    });
  }

  async function saveImageBlobRecord({ id, blob, mimeType = '', fileName = '' }) {
    const imageId = id || uid();
    const nextMimeType = String(mimeType || blob?.type || '').trim() || 'application/octet-stream';
    const ext = getImageExtension(fileName, nextMimeType);
    const record = {
      id: imageId,
      blob,
      mimeType: nextMimeType,
      extension: ext,
      fileName: String(fileName || '').trim(),
      updatedAt: Date.now(),
    };
    await withImageStore('readwrite', (store) => {
      store.put(record);
    });
    revokePromptImageObjectUrl(imageId);
    return imageId;
  }

  async function getImageRecord(imageId) {
    if (!imageId) return null;
    return withImageStore('readonly', (store) => new Promise((resolve, reject) => {
      const request = store.get(imageId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error('이미지 레코드를 읽지 못했습니다'));
    }));
  }

  async function deleteImageRecord(imageId) {
    if (!imageId) return;
    await withImageStore('readwrite', (store) => {
      store.delete(imageId);
    });
    revokePromptImageObjectUrl(imageId);
  }

  async function getAllImageRecords() {
    return withImageStore('readonly', (store) => new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result : []);
      request.onerror = () => reject(request.error || new Error('이미지 목록을 읽지 못했습니다'));
    }));
  }

  async function clearAllImageRecords() {
    await withImageStore('readwrite', (store) => {
      store.clear();
    });
    promptImageUrlCache.forEach((url) => URL.revokeObjectURL(url));
    promptImageUrlCache.clear();
    promptImageLoadPromises.clear();
  }

  function revokePromptImageObjectUrl(imageId) {
    const cachedUrl = promptImageUrlCache.get(imageId);
    if (cachedUrl) URL.revokeObjectURL(cachedUrl);
    promptImageUrlCache.delete(imageId);
    promptImageLoadPromises.delete(imageId);
  }

  async function getPromptImageObjectUrl(imageId) {
    if (!imageId) return '';
    const cached = promptImageUrlCache.get(imageId);
    if (cached) return cached;

    const pending = promptImageLoadPromises.get(imageId);
    if (pending) return pending;

    const loader = (async () => {
      const record = await getImageRecord(imageId);
      if (!record?.blob) return '';

      // Safari 안정성을 위해 blob을 직접 재사용하지 않고 새 Blob으로 복제한다.
      const buffer = await record.blob.arrayBuffer();
      const freshBlob = new Blob([buffer], { type: record.mimeType || record.blob.type || 'application/octet-stream' });
      const objectUrl = URL.createObjectURL(freshBlob);
      promptImageUrlCache.set(imageId, objectUrl);
      promptImageLoadPromises.delete(imageId);
      return objectUrl;
    })().catch(() => {
      promptImageLoadPromises.delete(imageId);
      return '';
    });

    promptImageLoadPromises.set(imageId, loader);
    return loader;
  }

  function getAllReferencedImageIds() {
    const ids = new Set();
    prompts.forEach((item) => {
      if (item?.imageId) ids.add(item.imageId);
      if (item?.portraitImageId) ids.add(item.portraitImageId);
    });
    composedPrompts.forEach((composed) => {
      if (composed?.imageId) ids.add(composed.imageId);
      if (composed?.portraitImageId) ids.add(composed.portraitImageId);
      if (composed?.beforeImageId) ids.add(composed.beforeImageId);
      if (composed?.beforePortraitImageId) ids.add(composed.beforePortraitImageId);
      if (!Array.isArray(composed?.items)) return;
      composed.items.forEach((item) => {
        if (item?.imageId) ids.add(item.imageId);
        if (item?.portraitImageId) ids.add(item.portraitImageId);
      });
    });
    customCombos.forEach((combo) => {
      if (combo?.imageId) ids.add(combo.imageId);
      if (combo?.portraitImageId) ids.add(combo.portraitImageId);
      Object.values(combo?.itemImages || {}).forEach((image) => {
        if (image?.imageId) ids.add(image.imageId);
      });
    });
    return ids;
  }

  async function deleteImageIfOrphaned(imageId) {
    if (!imageId) return;
    if (getAllReferencedImageIds().has(imageId)) return;
    await deleteImageRecord(imageId);
  }

