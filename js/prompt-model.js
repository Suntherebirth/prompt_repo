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
      content,
      tags: normalizePromptTags(prompt.tags),
      description: String(prompt.description ?? '').trim(),
      // 기존 image* 필드는 가로 이미지(기본)로 간주한다.
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
      return {
        ...composed,
        items,
        content: items.map(item => item.content).join(', '),
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

