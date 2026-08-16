  function buildBackupPayload() {
    return {
      version: 7,
      exportedAt: new Date().toISOString(),
      prompts: prompts.map(cleanPrompt),
      composedPrompts: composedPrompts.map(item => ({
        id: item.id,
        mainCategory: item.mainCategory,
        subCategory: item.subCategory,
        category: item.category,
        items: Array.isArray(item.items) ? item.items.map(cleanPrompt) : [],
        content: item.content,
        imageId: item.imageId || '',
        imageData: !item.imageId && item.imageData ? item.imageData : '',
        imageName: item.imageName || '',
        portraitImageId: item.portraitImageId || '',
        portraitImageData: !item.portraitImageId && item.portraitImageData ? item.portraitImageData : '',
        portraitImageName: item.portraitImageName || '',
      })),
      customCombos: customCombos.map(item => ({
        id: item.id,
        mainCategory: item.mainCategory || '콤보',
        subCategory: item.subCategory || '',
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
    const nextComposed = Array.isArray(parsed.composedPrompts) ? parsed.composedPrompts.map(normalizeComposedPrompt).filter(Boolean) : [];
    const nextCustomCombos = Array.isArray(parsed.customCombos)
      ? parsed.customCombos.filter(item => item && item.id).map(item => ({
        id: item.id,
        mainCategory: '콤보',
        subCategory: String(item.subCategory || '').trim(),
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
        };
      });
    } else {
      composedCategoryConfig = createDefaultComposedCategoryConfig();
    }

    applyPromptDescriptionRules();
    ensureCategoryConfigConsistency();
    ensureComposedCategoryConfigConsistency();
    activePromptPreviewId = prompts[0]?.id || null;
    save();
    render();
  }

  async function exportJSONBackup() {
    if (prompts.length === 0 && composedPrompts.length === 0 && customCombos.length === 0) {
      showToast('내보낼 프롬프트가 없습니다');
      return;
    }

    if (typeof window.JSZip === 'undefined') {
      showToast('ZIP 기능을 불러오지 못했습니다. 잠시 후 다시 시도하세요');
      return;
    }

    const defaultFileName = 'prompt_backup_' + new Date().toISOString().slice(0, 10) + '.zip';
    const inputName = prompt('내보낼 ZIP 파일 이름을 입력하세요', defaultFileName);
    if (inputName === null) {
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

      for (const imageId of referencedImageIds) {
        const record = await getImageRecord(imageId);
        if (!record?.blob) continue;
        const extension = record.extension || getImageExtension(record.fileName, record.mimeType);
        const path = `images/${imageId}.${extension}`;
        imageManifest[imageId] = {
          path,
          mimeType: record.mimeType || record.blob.type || 'application/octet-stream',
          fileName: record.fileName || '',
        };
        imageFolder.file(`${imageId}.${extension}`, record.blob);
      }

      zip.file('backup.json', JSON.stringify({ ...payload, imageManifest }, null, 2));

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      showToast('ZIP 내보내기 완료');
    } catch {
      showToast('ZIP 내보내기에 실패했습니다');
    }
  }

  async function importJSONBackup(e) {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;

    const lowerName = String(file.name || '').toLowerCase();

    try {
      if (lowerName.endsWith('.zip')) {
        if (typeof window.JSZip === 'undefined') {
          showToast('ZIP 기능을 불러오지 못했습니다. 잠시 후 다시 시도하세요');
          return;
        }

        const zip = await window.JSZip.loadAsync(file);
        const backupEntry = zip.file('backup.json');
        if (!backupEntry) {
          showToast('backup.json이 없는 ZIP입니다');
          return;
        }

        const backupText = await backupEntry.async('text');
        const parsed = JSON.parse(backupText || '{}');

        if (!confirm('현재 저장된 프롬프트를 가져온 ZIP으로 덮어쓰시겠습니까?')) {
          return;
        }

        await clearAllImageRecords();

        const manifest = parsed.imageManifest && typeof parsed.imageManifest === 'object' ? parsed.imageManifest : {};
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
        }

        applyImportedBackupData(parsed);
        showToast('ZIP 가져오기 완료');
        return;
      }

      // 구버전 JSON 백업도 계속 가져올 수 있게 유지한다.
      const text = await file.text();
      const parsed = JSON.parse(text || '{}');
      if (!confirm('현재 저장된 프롬프트를 가져온 JSON으로 덮어쓰시겠습니까?')) {
        return;
      }

      applyImportedBackupData(parsed);
      showToast('JSON 가져오기 완료');
    } catch (error) {
      if (error?.message === 'EMPTY_DATA') {
        showToast('가져올 데이터가 없습니다');
        return;
      }
      showToast('백업 파일을 읽지 못했습니다');
    }
  }

  // ── Drag to reorder ──
  let dragIdx = null;
  let touchDragIdx = null;
  let touchDropIdx = null;
  let touchPointerId = null;

