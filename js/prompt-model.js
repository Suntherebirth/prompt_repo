  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function normalizePromptTags(tags) {
    const values = Array.isArray(tags) ? tags : String(tags ?? '').split(/[\n,]/);
    return uniqueInOrder(values.map(tag => String(tag).trim()).filter(Boolean));
  }

  function normalizePrompt(prompt) {
    if (!prompt) return null;
    const mainCategory = (prompt.mainCategory ?? '').trim();
    const subCategory = (prompt.subCategory ?? prompt.category ?? '').trim();
    const content = (prompt.content ?? '').trim();
    if (!content) return null;
    return {
      id: prompt.id || uid(),
      mainCategory: mainCategory || '기타',
      subCategory: subCategory || '기타',
      isPrivate: !!prompt.isPrivate,
      content,
      tags: normalizePromptTags(prompt.tags),
      description: String(prompt.description ?? '').trim(),
      // 기존 image* 필드는 기본 이미지 슬롯으로 보존한다.
      imageId: (prompt.imageId ?? '').trim(),
      // 레거시 데이터 호환용. 새 저장에서는 사용하지 않는다.
      imageData: (prompt.imageData ?? '').trim(),
      imageName: (prompt.imageName ?? '').trim(),
      portraitImageId: (prompt.portraitImageId ?? '').trim(),
      // 레거시 데이터 호환용. 새 저장에서는 사용하지 않는다.
      portraitImageData: (prompt.portraitImageData ?? '').trim(),
      portraitImageName: (prompt.portraitImageName ?? '').trim(),
    };
  }

  function cleanPrompt(prompt) {
    const isCore = !!prompt && isSubCategoryCoreEnabled(prompt.mainCategory, prompt.subCategory);
    return {
      id: prompt.id,
      mainCategory: prompt.mainCategory,
      subCategory: prompt.subCategory,
      isPrivate: !!prompt.isPrivate,
      content: prompt.content,
      tags: normalizePromptTags(prompt.tags),
      description: isCore ? (prompt.description || '').trim() : '',
      imageId: prompt.imageId || '',
      imageData: !prompt.imageId && prompt.imageData ? prompt.imageData : '',
      imageName: prompt.imageName,
      portraitImageId: prompt.portraitImageId || '',
      portraitImageData: !prompt.portraitImageId && prompt.portraitImageData ? prompt.portraitImageData : '',
      portraitImageName: prompt.portraitImageName,
    };
  }

  function syncPromptUpdateToComposedPrompts(prompt) {
    const updatedPrompt = cleanPrompt(prompt);
    composedPrompts = composedPrompts.map(composed => {
      if (!Array.isArray(composed.items)) return composed;

      let wasUpdated = false;
      const items = composed.items.map(item => {
        if (item.id !== updatedPrompt.id) return item;
        wasUpdated = true;
        return updatedPrompt;
      });

      if (!wasUpdated) return composed;
      const sortedItems = sortPromptsByCategoryOrder(items);
      return {
        ...composed,
        items: sortedItems,
        content: sortedItems.map(item => item.content).join(', '),
      };
    });
  }

  function getPromptDisplayName(mainCategory, subCategory) {
    return [mainCategory, subCategory].filter(Boolean).join(' / ');
  }

  function sanitizePromptImageNamePart(value) {
    return String(value ?? '')
      .trim()
      .replace(/[\\/:*?"<>|]/g, '_')
      .replace(/\s+/g, ' ')
      .replace(/\s*\/\s*/g, ' / ')
      .trim();
  }

  function buildPromptImageName(mainCategory, subCategory, content) {
    const parts = [mainCategory, subCategory, content]
      .map(sanitizePromptImageNamePart)
      .filter(Boolean);
    if (parts.length === 0) return '프롬프트 설명 이미지';
    const fileName = parts.join(' - ');
    return fileName.length > 120 ? fileName.slice(0, 120).trim() : fileName;
  }

  function buildComposedImageName(mainCategory, subCategory, content) {
    const parts = [mainCategory, subCategory, content]
      .map(sanitizePromptImageNamePart)
      .filter(Boolean);
    if (parts.length === 0) return '커스텀 조합 설명 이미지';
    const fileName = parts.join(' - ');
    return fileName.length > 120 ? fileName.slice(0, 120).trim() : fileName;
  }

  function normalizeSelected(item) {
    if (!item) return null;
    return {
      ...item,
      mainCategory: (item.mainCategory ?? item.category ?? '기타').trim() || '기타',
      subCategory: (item.subCategory ?? item.category ?? '기타').trim() || '기타',
      content: (item.content ?? '').trim(),
    };
  }

  function sortPromptsByCategoryOrder(items) {
    if (!Array.isArray(items)) return [];
    const mainRank = new Map((categoryConfig.mainOrder || []).map((category, index) => [category, index]));
    return items
      .map((item, index) => ({ item, index }))
      .sort((a, b) => {
        const aMainRank = mainRank.get(a.item.mainCategory) ?? Number.MAX_SAFE_INTEGER;
        const bMainRank = mainRank.get(b.item.mainCategory) ?? Number.MAX_SAFE_INTEGER;
        if (aMainRank !== bMainRank) return aMainRank - bMainRank;

        const aSubOrder = getMainCategoryConfig(a.item.mainCategory).subOrder || [];
        const bSubOrder = getMainCategoryConfig(b.item.mainCategory).subOrder || [];
        const aSubRank = aSubOrder.indexOf(a.item.subCategory);
        const bSubRank = bSubOrder.indexOf(b.item.subCategory);
        if (aSubRank !== bSubRank) {
          return (aSubRank < 0 ? Number.MAX_SAFE_INTEGER : aSubRank)
            - (bSubRank < 0 ? Number.MAX_SAFE_INTEGER : bSubRank);
        }
        return a.index - b.index;
      })
      .map(({ item }) => item);
  }

  function normalizeComposedPromptItemOrder() {
    composedPrompts = composedPrompts.map((composed) => {
      if (!Array.isArray(composed.items)) return composed;
      const items = sortPromptsByCategoryOrder(composed.items);
      return { ...composed, items, content: items.map(item => item.content).join(', ') };
    });
  }

  function normalizeComposedPrompt(item, composedSourceById = null) {
    if (!item) return null;
    const mainCategory = (item.mainCategory ?? item.category ?? '').trim() || '커스텀 조합';
    const subCategory = (item.subCategory ?? item.name ?? '').trim() || '이름없음';
    let items = Array.isArray(item.items)
      ? item.items.map((entry) => {
        if (typeof entry === 'string' || typeof entry === 'number') {
          const referencedComposed = composedSourceById?.get(String(entry))
            || composedPrompts.find(composed => String(composed.id) === String(entry));
          if (!referencedComposed) return null;
          return {
            id: referencedComposed.id,
            mainCategory: referencedComposed.mainCategory,
            subCategory: referencedComposed.subCategory,
            isPrivate: !!referencedComposed.isPrivate,
            content: String(referencedComposed.content || '').trim() || getComposedItemText(referencedComposed),
          };
        }
        return normalizePrompt(entry);
      }).filter(Boolean)
      : [];

    // 이전 포맷({category, content}) 호환: 단일 문자열을 1개 프롬프트 아이템으로 변환
    if (items.length === 0 && typeof item.content === 'string' && item.content.trim()) {
      items = [{
        id: uid(),
        mainCategory,
        subCategory,
        isPrivate: false,
        content: item.content.trim(),
      }];
    }

    if (items.length === 0) return null;

    return {
      id: item.id || uid(),
      mainCategory,
      subCategory,
      isPrivate: !!item.isPrivate,
      category: mainCategory,
      items,
      content: items.map(p => p.content).join(', '),
      imageId: (item.imageId ?? '').trim(),
      // 레거시 데이터 호환용. 새 저장에서는 사용하지 않는다.
      imageData: (item.imageData ?? '').trim(),
      imageName: (item.imageName ?? '').trim(),
      portraitImageId: (item.portraitImageId ?? '').trim(),
      // 레거시 데이터 호환용. 새 저장에서는 사용하지 않는다.
      portraitImageData: (item.portraitImageData ?? '').trim(),
      portraitImageName: (item.portraitImageName ?? '').trim(),
      // 편집용(editOnly) 대분류에서 사용하는 편집 전 이미지. 일반 조합에서는 비어 있다.
      beforeImageId: (item.beforeImageId ?? '').trim(),
      beforeImageData: (item.beforeImageData ?? '').trim(),
      beforeImageName: (item.beforeImageName ?? '').trim(),
      beforePortraitImageId: (item.beforePortraitImageId ?? '').trim(),
      beforePortraitImageData: (item.beforePortraitImageData ?? '').trim(),
      beforePortraitImageName: (item.beforePortraitImageName ?? '').trim(),
    };
  }

  function normalizeCustomCombo(item) {
    const itemImages = Object.fromEntries(
      Object.entries(item.itemImages && typeof item.itemImages === 'object' ? item.itemImages : {}).map(([itemId, image]) => [itemId, {
        imageId: String(image?.imageId || '').trim(),
        imageData: String(image?.imageData || '').trim(),
        imageName: String(image?.imageName || '').trim(),
      }])
    );
    return {
      id: item.id || uid(),
      mainCategory: '콤보',
      subCategory: String(item.subCategory || '').trim(),
      isPrivate: !!item.isPrivate,
      category: '콤보',
      items: Array.isArray(item.items) ? item.items.filter(Boolean) : [],
      content: String(item.content || '').trim(),
      itemImages,
      imageId: String(item.imageId || '').trim(),
      imageData: String(item.imageData || '').trim(),
      imageName: String(item.imageName || '').trim(),
      portraitImageId: String(item.portraitImageId || '').trim(),
      portraitImageData: String(item.portraitImageData || '').trim(),
      portraitImageName: String(item.portraitImageName || '').trim(),
      comboImagePosition: item.comboImagePosition === 'end' ? 'end' : 'start',
    };
  }

  function cleanCustomCombo(item) {
    const normalized = normalizeCustomCombo(item);
    return {
      ...normalized,
      imageData: normalized.imageId ? '' : normalized.imageData,
      portraitImageData: normalized.portraitImageId ? '' : normalized.portraitImageData,
      itemImages: Object.fromEntries(Object.entries(normalized.itemImages).map(([itemId, image]) => [itemId, {
        ...image,
        imageData: image.imageId ? '' : image.imageData,
      }])),
    };
  }

  function getComposedItemText(item) {
    if (!item) return '';
    if (Array.isArray(item.items) && item.items.length > 0) {
      return item.items.map(p => p.content).join(', ');
    }
    return (item.content ?? '').trim();
  }

  // ── Categories ──
