  const backupDebugLogEntries = [];

  function writeBackupDebugLog(message, details) {
    const time = new Date().toLocaleTimeString('ko-KR', { hour12: false });
    const detailText = details === undefined ? '' : ` ${typeof details === 'string' ? details : JSON.stringify(details)}`;
    const entry = `[${time}] ${message}${detailText}`;
    backupDebugLogEntries.push(entry);
    if (backupDebugLogEntries.length > 100) backupDebugLogEntries.shift();
    console.info('[Backup]', entry);

    const output = document.getElementById('backup-debug-log');
    if (output) {
      output.textContent = backupDebugLogEntries.join('\n');
      output.scrollTop = output.scrollHeight;
    }
  }

  function clearBackupDebugLog() {
    backupDebugLogEntries.length = 0;
    const output = document.getElementById('backup-debug-log');
    if (output) output.textContent = '백업 동작을 실행하면 여기에 로그가 표시됩니다.';
  }

  async function copyBackupDebugLog() {
    const text = backupDebugLogEntries.join('\n');
    if (!text) {
      showToast('복사할 백업 로그가 없습니다');
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      showToast('백업 로그를 복사했습니다');
    } catch (error) {
      writeBackupDebugLog('로그 복사 실패', error?.message || String(error));
      showToast('백업 로그를 복사하지 못했습니다');
    }
  }

  writeBackupDebugLog('디버그 로거 준비됨', {
    jsZipAvailable: typeof window.JSZip !== 'undefined',
  });

  function buildBackupPayload() {
    return {
      version: 7,
      exportedAt: new Date().toISOString(),
      prompts: prompts.map(cleanPrompt),
      composedPrompts: composedPrompts.map(item => ({
        id: item.id,
        mainCategory: item.mainCategory,
        subCategory: item.subCategory,
        isPrivate: !!item.isPrivate,
        category: item.category,
        items: Array.isArray(item.items) ? item.items.map(cleanPrompt) : [],
        content: item.content,
        imageId: item.imageId || '',
        imageData: !item.imageId && item.imageData ? item.imageData : '',
        imageName: item.imageName || '',
        portraitImageId: item.portraitImageId || '',
        portraitImageData: !item.portraitImageId && item.portraitImageData ? item.portraitImageData : '',
        portraitImageName: item.portraitImageName || '',
        beforeImageId: item.beforeImageId || '',
        beforeImageData: !item.beforeImageId && item.beforeImageData ? item.beforeImageData : '',
        beforeImageName: item.beforeImageName || '',
        beforePortraitImageId: item.beforePortraitImageId || '',
        beforePortraitImageData: !item.beforePortraitImageId && item.beforePortraitImageData ? item.beforePortraitImageData : '',
        beforePortraitImageName: item.beforePortraitImageName || '',
      })),
      customCombos: customCombos.map(item => ({
        id: item.id,
        mainCategory: item.mainCategory || '콤보',
        subCategory: item.subCategory || '',
        isPrivate: !!item.isPrivate,
        category: item.category || '콤보',
        items: Array.isArray(item.items) ? item.items.filter(Boolean) : [],
        content: item.content || '',
        itemImages: Object.fromEntries(Object.entries(item.itemImages || {}).map(([itemId, image]) => [itemId, {
          imageId: image.imageId || '',
          imageData: !image.imageId && image.imageData ? image.imageData : '',
          imageName: image.imageName || '',
        }])),
        imageId: item.imageId || '',
        imageData: !item.imageId && item.imageData ? item.imageData : '',
        imageName: item.imageName || '',
        portraitImageId: item.portraitImageId || '',
        portraitImageData: !item.portraitImageId && item.portraitImageData ? item.portraitImageData : '',
        portraitImageName: item.portraitImageName || '',
        comboImagePosition: item.comboImagePosition === 'end' ? 'end' : 'start',
      })),
      categoryConfig,
      composedCategoryConfig,
      promptTagLayouts,
      hiddenMainCategories: [...hiddenMainCategories],
      leftPanelTab,
    };
  }

  function applyImportedBackupData(parsed) {
    const nextPrompts = Array.isArray(parsed.prompts) ? parsed.prompts.map(normalizePrompt).filter(Boolean) : [];
    const composedEntries = Array.isArray(parsed.composedPrompts) ? parsed.composedPrompts : [];
    const composedSourceById = new Map(
      composedEntries.filter(item => item?.id).map(item => [String(item.id), item])
    );
    const nextComposed = composedEntries.map(item => normalizeComposedPrompt(item, composedSourceById)).filter(Boolean);
    const nextCustomCombos = Array.isArray(parsed.customCombos)
      ? parsed.customCombos.filter(item => item && item.id).map(item => ({
        id: item.id,
        mainCategory: '콤보',
        subCategory: String(item.subCategory || '').trim(),
        isPrivate: !!item.isPrivate,
        category: '콤보',
        items: Array.isArray(item.items) ? item.items.filter(Boolean) : [],
        content: String(item.content || '').trim(),
        itemImages: item.itemImages && typeof item.itemImages === 'object' ? item.itemImages : {},
        imageId: String(item.imageId || '').trim(),
        imageData: String(item.imageData || '').trim(),
        imageName: String(item.imageName || '').trim(),
        portraitImageId: String(item.portraitImageId || '').trim(),
        portraitImageData: String(item.portraitImageData || '').trim(),
        portraitImageName: String(item.portraitImageName || '').trim(),
        comboImagePosition: item.comboImagePosition === 'end' ? 'end' : 'start',
      }))
      : [];
    const nextHidden = Array.isArray(parsed.hiddenMainCategories) ? parsed.hiddenMainCategories.filter(Boolean) : [];
    const nextCategoryConfig = parsed.categoryConfig && typeof parsed.categoryConfig === 'object' ? parsed.categoryConfig : null;
    const nextComposedCategoryConfig = parsed.composedCategoryConfig && typeof parsed.composedCategoryConfig === 'object' ? parsed.composedCategoryConfig : null;
    const nextPromptTagLayouts = parsed.promptTagLayouts && typeof parsed.promptTagLayouts === 'object' && !Array.isArray(parsed.promptTagLayouts)
      ? parsed.promptTagLayouts
      : {};

    if (nextPrompts.length === 0 && nextComposed.length === 0 && nextCustomCombos.length === 0) {
      throw new Error('EMPTY_DATA');
    }

    prompts = nextPrompts;
    composedPrompts = nextComposed;
    customCombos = nextCustomCombos;
    hiddenMainCategories = new Set(nextHidden);
    promptTagLayouts = nextPromptTagLayouts;
    if (nextCategoryConfig) {
      categoryConfig = createDefaultCategoryConfig();
      categoryConfig.mainOrder = uniqueInOrder(Array.isArray(nextCategoryConfig.mainOrder) ? nextCategoryConfig.mainOrder.filter(Boolean) : []);
      const mains = nextCategoryConfig.mains && typeof nextCategoryConfig.mains === 'object' ? nextCategoryConfig.mains : {};
      Object.entries(mains).forEach(([key, value]) => {
        if (!key || !value || typeof value !== 'object') return;
        categoryConfig.mains[key] = {
          hiddenByDefault: !!value.hiddenByDefault,
          isPrivate: !!value.isPrivate,
          emoji: typeof value.emoji === 'string' ? value.emoji.trim() : '',
          subOrder: uniqueInOrder(Array.isArray(value.subOrder) ? value.subOrder.filter(Boolean) : []),
          subSettings: Object.fromEntries(
            Object.entries((value.subSettings && typeof value.subSettings === 'object') ? value.subSettings : {}).map(([subKey, subValue]) => [subKey, { ...(subValue || {}) }])
          ),
        };
      });
    } else {
      categoryConfig = createDefaultCategoryConfig();
    }

    if (nextComposedCategoryConfig) {
      composedCategoryConfig = createDefaultComposedCategoryConfig();
      const mains = nextComposedCategoryConfig.mains && typeof nextComposedCategoryConfig.mains === 'object' ? nextComposedCategoryConfig.mains : {};
      Object.entries(mains).forEach(([key, value]) => {
        if (!key || !value || typeof value !== 'object') return;
        composedCategoryConfig.mains[key] = {
          editOnly: !!value.editOnly,
          isPrivate: !!value.isPrivate,
          emoji: typeof value.emoji === 'string' ? value.emoji.trim() : '',
          subSettings: Object.fromEntries(
            Object.entries((value.subSettings && typeof value.subSettings === 'object') ? value.subSettings : {}).map(([subKey, subValue]) => [subKey, { ...(subValue || {}) }])
          ),
        };
      });
    } else {
      composedCategoryConfig = createDefaultComposedCategoryConfig();
    }

    applyPromptDescriptionRules();
    ensureCategoryConfigConsistency();
    ensureComposedCategoryConfigConsistency();
    applyCategoryPrivacyRules();
    activePromptPreviewId = prompts[0]?.id || null;
    save();
    render();
  }

  async function exportJSONBackup() {
    writeBackupDebugLog('ZIP 내보내기 시작', {
      prompts: prompts.length,
      composedPrompts: composedPrompts.length,
      customCombos: customCombos.length,
      jsZipAvailable: typeof window.JSZip !== 'undefined',
      metadataSanitization: isExportMetadataSanitizationEnabled,
    });
    if (prompts.length === 0 && composedPrompts.length === 0 && customCombos.length === 0) {
      writeBackupDebugLog('ZIP 내보내기 중단: 내보낼 데이터 없음');
      showToast('내보낼 프롬프트가 없습니다');
      return;
    }

    if (typeof window.JSZip === 'undefined') {
      writeBackupDebugLog('ZIP 내보내기 중단: JSZip 미로드');
      showToast('ZIP 기능을 불러오지 못했습니다. 잠시 후 다시 시도하세요');
      return;
    }

    const defaultFileName = 'prompt_backup_' + new Date().toISOString().slice(0, 10) + '.zip';
    const inputName = prompt('내보낼 ZIP 파일 이름을 입력하세요', defaultFileName);
    if (inputName === null) {
      writeBackupDebugLog('ZIP 내보내기 취소');
      showToast('ZIP 내보내기가 취소되었습니다');
      return;
    }

    let fileName = inputName.trim() || defaultFileName;
    if (!/\.zip$/i.test(fileName)) fileName += '.zip';

    try {
      const zip = new window.JSZip();
      const payload = buildBackupPayload();
      const referencedImageIds = [...getAllReferencedImageIds()];
      const imageManifest = {};
      const imageFolder = zip.folder('images');
      writeBackupDebugLog('참조 이미지 확인', { count: referencedImageIds.length });

      for (const imageId of referencedImageIds) {
        const record = await getImageRecord(imageId);
        if (!record?.blob) {
          writeBackupDebugLog('이미지 누락', imageId);
          continue;
        }
        const extension = record.extension || getImageExtension(record.fileName, record.mimeType);
        const path = `images/${imageId}.${extension}`;
        imageManifest[imageId] = {
          path,
          mimeType: record.mimeType || record.blob.type || 'application/octet-stream',
          fileName: record.fileName || '',
        };
        let exportBlob = record.blob;
        if (isExportMetadataSanitizationEnabled && typeof window.sanitizeExportImage === 'function') {
          const sanitized = await window.sanitizeExportImage(record.blob);
          exportBlob = sanitized.blob;
          writeBackupDebugLog('이미지 메타데이터 정제', {
            imageId,
            format: sanitized.format,
            removedXmp: sanitized.removedXmp,
            removedC2pa: sanitized.removedC2pa,
          });
        }
        imageFolder.file(`${imageId}.${extension}`, exportBlob);
      }

      zip.file('backup.json', JSON.stringify({ ...payload, imageManifest }, null, 2));
      writeBackupDebugLog('ZIP 파일 생성', { images: Object.keys(imageManifest).length });

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      writeBackupDebugLog('ZIP 생성 완료', { bytes: zipBlob.size });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      writeBackupDebugLog('다운로드 요청 완료', fileName);
      showToast('ZIP 내보내기 완료');
    } catch (error) {
      writeBackupDebugLog('ZIP 내보내기 실패', error?.stack || error?.message || String(error));
      showToast('ZIP 내보내기에 실패했습니다');
    }
  }

  async function importJSONBackup(e) {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) {
      writeBackupDebugLog('가져오기 취소: 파일 미선택');
      return;
    }

    const lowerName = String(file.name || '').toLowerCase();
    writeBackupDebugLog('백업 가져오기 시작', { name: file.name, bytes: file.size, type: file.type || 'unknown' });

    try {
      if (lowerName.endsWith('.zip')) {
        if (typeof window.JSZip === 'undefined') {
          writeBackupDebugLog('ZIP 가져오기 중단: JSZip 미로드');
          showToast('ZIP 기능을 불러오지 못했습니다. 잠시 후 다시 시도하세요');
          return;
        }

        const zip = await window.JSZip.loadAsync(file);
        writeBackupDebugLog('ZIP 읽기 완료', { entries: Object.keys(zip.files).length });
        const backupEntry = zip.file('backup.json');
        if (!backupEntry) {
          writeBackupDebugLog('ZIP 가져오기 중단: backup.json 없음');
          showToast('backup.json이 없는 ZIP입니다');
          return;
        }

        const backupText = await backupEntry.async('text');
        const parsed = JSON.parse(backupText || '{}');
        writeBackupDebugLog('backup.json 파싱 완료', {
          prompts: Array.isArray(parsed.prompts) ? parsed.prompts.length : 0,
          composedPrompts: Array.isArray(parsed.composedPrompts) ? parsed.composedPrompts.length : 0,
          customCombos: Array.isArray(parsed.customCombos) ? parsed.customCombos.length : 0,
          images: Object.keys(parsed.imageManifest || {}).length,
        });

        if (!confirm('현재 저장된 프롬프트를 가져온 ZIP으로 덮어쓰시겠습니까?')) {
          writeBackupDebugLog('ZIP 가져오기 취소: 덮어쓰기 거부');
          return;
        }

        await clearAllImageRecords();
        writeBackupDebugLog('기존 이미지 레코드 삭제 완료');

        const manifest = parsed.imageManifest && typeof parsed.imageManifest === 'object' ? parsed.imageManifest : {};
        let restoredImages = 0;
        for (const [imageId, info] of Object.entries(manifest)) {
          if (!imageId || !info || typeof info !== 'object') continue;
          const imagePath = String(info.path || '').replace(/^\/+/, '');
          if (!imagePath) continue;
          const imageEntry = zip.file(imagePath);
          if (!imageEntry) continue;
          const imageBuffer = await imageEntry.async('arraybuffer');
          const blob = new Blob([imageBuffer], { type: info.mimeType || 'application/octet-stream' });
          await saveImageBlobRecord({
            id: imageId,
            blob,
            mimeType: info.mimeType || blob.type || 'application/octet-stream',
            fileName: info.fileName || '',
          });
          restoredImages += 1;
        }

        applyImportedBackupData(parsed);
        writeBackupDebugLog('ZIP 가져오기 완료', { restoredImages });
        showToast('ZIP 가져오기 완료');
        return;
      }

      // 구버전 JSON 백업도 계속 가져올 수 있게 유지한다.
      const text = await file.text();
      const parsed = JSON.parse(text || '{}');
      writeBackupDebugLog('JSON 백업 파싱 완료');
      if (!confirm('현재 저장된 프롬프트를 가져온 JSON으로 덮어쓰시겠습니까?')) {
        writeBackupDebugLog('JSON 가져오기 취소: 덮어쓰기 거부');
        return;
      }

      applyImportedBackupData(parsed);
      writeBackupDebugLog('JSON 가져오기 완료');
      showToast('JSON 가져오기 완료');
    } catch (error) {
      writeBackupDebugLog('백업 가져오기 실패', error?.stack || error?.message || String(error));
      if (error?.message === 'EMPTY_DATA') {
        showToast('가져올 데이터가 없습니다');
        return;
      }
      showToast('백업 파일을 읽지 못했습니다');
    }
  }

  window.exportJSONBackup = exportJSONBackup;
  window.importJSONBackup = importJSONBackup;
  window.clearBackupDebugLog = clearBackupDebugLog;
  window.copyBackupDebugLog = copyBackupDebugLog;
  window.writeBackupDebugLog('backup.js 로드 완료');

