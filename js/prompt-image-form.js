  function normalizeImageOrientation(value) {
    return value === 'portrait' ? 'portrait' : 'landscape';
  }

  function getImageOrientationLabel(orientation) {
    return orientation === 'portrait' ? '세로' : '가로';
  }

  function getOtherImageOrientation(orientation) {
    return orientation === 'portrait' ? 'landscape' : 'portrait';
  }

  function normalizeImageEditStage(value) {
    return value === 'before' ? 'before' : 'after';
  }

  function getImageEditStageLabel(stage) {
    return stage === 'before' ? '편집 전' : '편집 후';
  }

  function isComposedImageEditOnlyModalActive() {
    const mainCategory = document.getElementById('combo-main-category')?.value?.trim() || '';
    return !!mainCategory && !!getComposedMainCategoryConfig(mainCategory).editOnly;
  }

  function getPendingPromptImage(orientation = promptImageEditOrientation) {
    return pendingPromptImages?.[normalizeImageOrientation(orientation)] || null;
  }

  function getPendingComposedImage(orientation = composedImageEditOrientation, stage = composedImageEditStage) {
    return pendingComposedImages?.[normalizeImageOrientation(orientation)]?.[normalizeImageEditStage(stage)] || null;
  }

  function renderPromptImageOrientationTabs() {
    const current = normalizeImageOrientation(promptImageEditOrientation);
    const landscapeBtn = document.getElementById('input-image-tab-landscape');
    const portraitBtn = document.getElementById('input-image-tab-portrait');
    if (landscapeBtn) {
      const isActive = current === 'landscape';
      landscapeBtn.classList.toggle('active', isActive);
      landscapeBtn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    }
    if (portraitBtn) {
      const isActive = current === 'portrait';
      portraitBtn.classList.toggle('active', isActive);
      portraitBtn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    }
  }

  function renderComposedImageOrientationTabs() {
    const current = normalizeImageOrientation(composedImageEditOrientation);
    const landscapeBtn = document.getElementById('combo-image-tab-landscape');
    const portraitBtn = document.getElementById('combo-image-tab-portrait');
    if (landscapeBtn) {
      const isActive = current === 'landscape';
      landscapeBtn.classList.toggle('active', isActive);
      landscapeBtn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    }
    if (portraitBtn) {
      const isActive = current === 'portrait';
      portraitBtn.classList.toggle('active', isActive);
      portraitBtn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    }
  }

  function setPromptImageEditOrientation(orientation) {
    promptImageEditOrientation = normalizeImageOrientation(orientation);
    renderPromptImageOrientationTabs();
    renderPendingPromptImagePreview();
  }

  function setComposedImageEditOrientation(orientation) {
    composedImageEditOrientation = normalizeImageOrientation(orientation);
    renderComposedImageOrientationTabs();
    renderPendingComposedImagePreview();
  }

  function renderComposedImageStageTabs() {
    const wrap = document.getElementById('combo-image-stage-tabs');
    const afterBtn = document.getElementById('combo-image-tab-after');
    const beforeBtn = document.getElementById('combo-image-tab-before');
    const isEditOnly = isComposedImageEditOnlyModalActive();
    if (wrap) wrap.hidden = !isEditOnly;
    if (!isEditOnly && composedImageEditStage !== 'after') {
      composedImageEditStage = 'after';
    }
    const current = normalizeImageEditStage(composedImageEditStage);
    if (afterBtn) {
      const isActive = current === 'after';
      afterBtn.classList.toggle('active', isActive);
      afterBtn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    }
    if (beforeBtn) {
      const isActive = current === 'before';
      beforeBtn.classList.toggle('active', isActive);
      beforeBtn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    }
  }

  function setComposedImageEditStage(stage) {
    composedImageEditStage = normalizeImageEditStage(stage);
    renderComposedImageStageTabs();
    renderPendingComposedImagePreview();
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error || new Error('파일을 읽을 수 없습니다'));
      reader.readAsDataURL(file);
    });
  }

  function renderPendingPromptImagePreview() {
    const preview = document.getElementById('input-image-preview');
    const nameInput = document.getElementById('input-image-name');
    const meta = document.getElementById('input-image-meta');
    if (!preview || !nameInput || !meta) return;

    const mainCategory = document.getElementById('input-main-category')?.value?.trim() || '';
    const subCategory = document.getElementById('input-sub-category')?.value?.trim() || '';
    const content = document.getElementById('input-content')?.value?.trim() || '';
    const imageName = buildPromptImageName(mainCategory, subCategory, content);
    nameInput.value = imageName;

    const orientation = normalizeImageOrientation(promptImageEditOrientation);
    const orientationLabel = getImageOrientationLabel(orientation);
    const otherImage = getPendingPromptImage(getOtherImageOrientation(orientation));
    const pendingPromptImage = getPendingPromptImage(orientation);
    preview.classList.toggle('orientation-portrait', orientation === 'portrait');
    preview.style.setProperty('--preview-aspect-ratio', orientation === 'portrait' ? '3 / 4' : '4 / 3');
    renderPromptImageOrientationTabs();

    if (pendingPromptImage?.dataUrl) {
      preview.innerHTML = `<img src="${pendingPromptImage.dataUrl}" alt="${esc(imageName)}" /><button class="prompt-image-remove-btn" type="button" onclick="removePendingPromptImage()" title="이 방향 이미지 삭제" aria-label="이 방향 이미지 삭제">삭제</button>`;
      const fileText = pendingPromptImage.fileName
        ? `${imageName} · ${pendingPromptImage.fileName}`
        : imageName;
      meta.textContent = `${orientationLabel} 이미지 편집 중 · ${fileText}`;
      return;
    }

    preview.innerHTML = '<span class="empty-state" style="padding:0">선택한 설명 이미지가 여기에 표시됩니다.</span>';
    meta.textContent = `${orientationLabel} 이미지가 비어 있습니다. ${otherImage?.dataUrl ? '다른 방향 이미지는 유지됩니다. ' : ''}${imageName} 이름으로 저장됩니다.`;
  }

  function setPendingPromptImage(file, dataUrl) {
    const orientation = normalizeImageOrientation(promptImageEditOrientation);
    if (!file || !dataUrl) {
      pendingPromptImages[orientation] = null;
      renderPendingPromptImagePreview();
      return;
    }

    pendingPromptImages[orientation] = {
      dataUrl,
      fileName: file.name || '',
      mimeType: file.type || '',
      file,
      imageName: buildPromptImageName(
        document.getElementById('input-main-category')?.value?.trim(),
        document.getElementById('input-sub-category')?.value?.trim(),
        document.getElementById('input-content')?.value?.trim(),
      ),
    };
    removedPromptImages[orientation] = false;
    renderPendingPromptImagePreview();
  }

  function removePendingPromptImage() {
    const orientation = normalizeImageOrientation(promptImageEditOrientation);
    pendingPromptImages[orientation] = null;
    removedPromptImages[orientation] = true;
    const fileInput = document.getElementById('input-image-file');
    if (fileInput) fileInput.value = '';
    renderPendingPromptImagePreview();
  }

  function renderPendingComposedImagePreview() {
    const preview = document.getElementById('combo-image-preview');
    const nameInput = document.getElementById('combo-image-name');
    const meta = document.getElementById('combo-image-meta');
    if (!preview || !nameInput || !meta) return;

    renderComposedImageStageTabs();

    const mainCategory = document.getElementById('combo-main-category')?.value?.trim() || '';
    const subCategory = document.getElementById('combo-sub-category')?.value?.trim() || '';
    const content = getComposedOutputText();
    const stage = normalizeImageEditStage(composedImageEditStage);
    const stageLabel = getImageEditStageLabel(stage);
    const isEditOnly = isComposedImageEditOnlyModalActive();
    const baseImageName = buildComposedImageName(mainCategory, subCategory, content);
    const imageName = isEditOnly ? `${baseImageName} - ${stageLabel}` : baseImageName;
    nameInput.value = imageName;

    const orientation = normalizeImageOrientation(composedImageEditOrientation);
    const orientationLabel = getImageOrientationLabel(orientation);
    const otherImage = getPendingComposedImage(getOtherImageOrientation(orientation), stage);
    const pendingComposedImage = getPendingComposedImage(orientation, stage);
    preview.classList.toggle('orientation-portrait', orientation === 'portrait');
    preview.style.setProperty('--preview-aspect-ratio', orientation === 'portrait' ? '3 / 4' : '4 / 3');
    renderComposedImageOrientationTabs();

    const stagePrefix = isEditOnly ? `${stageLabel} ` : '';
    if (pendingComposedImage?.dataUrl) {
      preview.innerHTML = `<img src="${pendingComposedImage.dataUrl}" alt="${esc(imageName)}" /><button class="prompt-image-remove-btn" type="button" onclick="removePendingComposedImage()" title="이 방향 이미지 삭제" aria-label="이 방향 이미지 삭제">삭제</button>`;
      const fileText = pendingComposedImage.fileName
        ? `${imageName} · ${pendingComposedImage.fileName}`
        : imageName;
      meta.textContent = `${stagePrefix}${orientationLabel} 이미지 편집 중 · ${fileText}`;
      return;
    }

    preview.innerHTML = '<span class="empty-state" style="padding:0">선택한 설명 이미지가 여기에 표시됩니다.</span>';
    meta.textContent = `${stagePrefix}${orientationLabel} 이미지가 비어 있습니다. ${otherImage?.dataUrl ? '다른 방향 이미지는 유지됩니다. ' : ''}${imageName} 이름으로 저장됩니다.`;
  }

  function setPendingComposedImage(file, dataUrl) {
    const orientation = normalizeImageOrientation(composedImageEditOrientation);
    const stage = normalizeImageEditStage(composedImageEditStage);
    if (!file || !dataUrl) {
      pendingComposedImages[orientation][stage] = null;
      renderPendingComposedImagePreview();
      return;
    }

    const isEditOnly = isComposedImageEditOnlyModalActive();
    const baseImageName = buildComposedImageName(
      document.getElementById('combo-main-category')?.value?.trim(),
      document.getElementById('combo-sub-category')?.value?.trim(),
      getComposedOutputText(),
    );
    pendingComposedImages[orientation][stage] = {
      dataUrl,
      fileName: file.name || '',
      mimeType: file.type || '',
      file,
      imageName: isEditOnly ? `${baseImageName} - ${getImageEditStageLabel(stage)}` : baseImageName,
    };
    removedComposedImages[orientation][stage] = false;
    renderPendingComposedImagePreview();
  }

  function removePendingComposedImage() {
    const orientation = normalizeImageOrientation(composedImageEditOrientation);
    const stage = normalizeImageEditStage(composedImageEditStage);
    pendingComposedImages[orientation][stage] = null;
    removedComposedImages[orientation][stage] = true;
    const fileInput = document.getElementById('combo-image-file');
    if (fileInput) fileInput.value = '';
    renderPendingComposedImagePreview();
  }

  function clearPendingPromptImage(options = {}) {
    if (options.all) {
      pendingPromptImages = { landscape: null, portrait: null };
      removedPromptImages = { landscape: false, portrait: false };
    } else {
      pendingPromptImages[normalizeImageOrientation(promptImageEditOrientation)] = null;
    }
    const fileInput = document.getElementById('input-image-file');
    if (fileInput) fileInput.value = '';
    renderPendingPromptImagePreview();
  }

  function clearPendingComposedImage(options = {}) {
    if (options.all) {
      pendingComposedImages = { landscape: { after: null, before: null }, portrait: { after: null, before: null } };
      removedComposedImages = { landscape: { after: false, before: false }, portrait: { after: false, before: false } };
    } else {
      pendingComposedImages[normalizeImageOrientation(composedImageEditOrientation)][normalizeImageEditStage(composedImageEditStage)] = null;
    }
    const fileInput = document.getElementById('combo-image-file');
    if (fileInput) fileInput.value = '';
    renderPendingComposedImagePreview();
  }

  function resetPromptFormToAdd() {
    promptFormMode = 'add';
    editingPromptId = null;
    editingPromptImageId = '';
    editingPromptImageData = '';
    editingPromptPortraitImageId = '';
    editingPromptPortraitImageData = '';
    removedPromptImages = { landscape: false, portrait: false };
    const modalTitle = document.getElementById('add-prompt-title');
    const saveButton = document.querySelector('#add-prompt-modal .modal-actions .btn-primary');
    const tagsInput = document.getElementById('input-tags');
    if (modalTitle) modalTitle.textContent = '새 프롬프트 추가';
    if (saveButton) saveButton.textContent = '+ 저장';
    if (tagsInput) tagsInput.value = '';
  }

  function setPromptFormToEdit(prompt) {
    promptFormMode = 'edit';
    editingPromptId = prompt.id;
    editingPromptImageId = prompt.imageId || '';
    editingPromptImageData = '';
    editingPromptPortraitImageId = prompt.portraitImageId || '';
    editingPromptPortraitImageData = '';
    removedPromptImages = { landscape: false, portrait: false };
    const modalTitle = document.getElementById('add-prompt-title');
    const saveButton = document.querySelector('#add-prompt-modal .modal-actions .btn-primary');
    if (modalTitle) modalTitle.textContent = '프롬프트 편집';
    if (saveButton) saveButton.textContent = '적용';
  }

  function getPromptImageSource(prompt, forceOrientation) {
    if (!prompt) return '';
    const preferPortrait = forceOrientation ? forceOrientation === 'portrait' : true;
    const imageDataCandidates = preferPortrait
      ? [prompt.portraitImageData, prompt.imageData]
      : [prompt.imageData, prompt.portraitImageData];
    for (const imageData of imageDataCandidates) {
      if (imageData) return imageData;
    }

    const imageIdCandidates = preferPortrait
      ? [prompt.portraitImageId, prompt.imageId]
      : [prompt.imageId, prompt.portraitImageId];
    for (const imageId of imageIdCandidates) {
      if (!imageId) continue;
      const cached = promptImageUrlCache.get(imageId);
      if (cached) return cached;
    }
    return '';
  }

  // fallback 없이 해당 방향 전용 필드(id 또는 data)가 실제로 존재하는지만 확인한다.
  function promptHasOrientationImage(prompt, orientation) {
    if (!prompt) return false;
    return orientation === 'landscape'
      ? !!(prompt.imageId || prompt.imageData)
      : !!(prompt.portraitImageId || prompt.portraitImageData);
  }

  function getPromptActiveImageMeta(prompt, forceOrientation) {
    if (!prompt) return { imageId: '', alt: '' };
    const preferPortrait = forceOrientation ? forceOrientation === 'portrait' : true;
    const imageId = preferPortrait
      ? (prompt.portraitImageId || prompt.imageId || '')
      : (prompt.imageId || prompt.portraitImageId || '');
    const imageName = preferPortrait
      ? (prompt.portraitImageName || prompt.imageName || '')
      : (prompt.imageName || prompt.portraitImageName || '');
    return {
      imageId,
      alt: imageName || getPromptDisplayName(prompt.mainCategory, prompt.subCategory),
    };
  }

  function updatePromptImageElements(promptId, url) {
    if (!promptId || !url) return;

    document.querySelectorAll('.preview-tag-image-card, .custom-combo-image-tile[data-composed-id]').forEach((card) => {
      const cardId = card.dataset.promptId || card.dataset.composedId;
      if (String(cardId) !== String(promptId)) return;
      const loadingState = card.querySelector('.empty-state, .custom-combo-image-placeholder');
      if (loadingState) {
        const image = document.createElement('img');
        image.src = url;
        image.alt = card.title || '';
        loadingState.replaceWith(image);
        return;
      }
      const image = card.querySelector('img');
      if (image && image.src !== url) image.src = url;
    });

    if (activePromptPreviewId === promptId) {
      const previewImage = document.querySelector('#prompt-description-preview .preview-image-shell img');
      if (previewImage && previewImage.src !== url) previewImage.src = url;
    }
    if (activeComposedPreviewId === promptId) {
      const previewImage = document.querySelector('#composed-description-preview .preview-image-shell img');
      if (previewImage && previewImage.src !== url) previewImage.src = url;
    }
  }

  function queuePromptImageLoad(prompt, forceOrientation) {
    if (!prompt) return;
    const preferPortrait = forceOrientation ? forceOrientation === 'portrait' : true;
    const preferredImageId = preferPortrait
      ? (prompt.portraitImageId || prompt.imageId || '')
      : (prompt.imageId || prompt.portraitImageId || '');
    const preferredImageData = preferPortrait
      ? (prompt.portraitImageData || prompt.imageData || '')
      : (prompt.imageData || prompt.portraitImageData || '');
    if (!preferredImageId || preferredImageData || promptImageUrlCache.has(preferredImageId)) return;

    getPromptImageObjectUrl(preferredImageId)
      .then((url) => {
        if (!url) return;
        updatePromptImageElements(prompt.id, url);
        if (activePromptPreviewId === prompt.id && !isPromptPreviewSuppressed) {
          renderPromptDescriptionPreview();
        }
        if (activeComposedPreviewId === prompt.id) {
          renderComposedDescriptionPreview();
        }
        if (activeImageViewer?.imageId === preferredImageId && activeImageViewer.src !== url) {
          activeImageViewer = { ...activeImageViewer, src: url };
          renderImageViewer();
        }
      })
      .catch(() => {});
  }

  function renderPromptDescriptionField() {
    const fieldWrap = document.getElementById('prompt-description-field');
    const descriptionInput = document.getElementById('input-description');
    if (!fieldWrap || !descriptionInput) return;

    const mainCategory = document.getElementById('input-main-category')?.value?.trim() || '';
    const subCategory = document.getElementById('input-sub-category')?.value?.trim() || '';
    const isCore = !!mainCategory && !!subCategory && isSubCategoryCoreEnabled(mainCategory, subCategory);
    fieldWrap.style.display = isCore ? 'block' : 'none';
    descriptionInput.disabled = !isCore;
    if (!isCore) {
      descriptionInput.value = '';
      descriptionInput.placeholder = '핵심 분류 항목만 설명을 입력할 수 있습니다.';
      return;
    }
    descriptionInput.placeholder = '이미지 아래에 표시될 설명을 입력하세요.';
  }

  function syncPromptFormFields(prompt) {
    const mainSelect = document.getElementById('input-main-category');
    const subSelect = document.getElementById('input-sub-category');
    const contentInput = document.getElementById('input-content');
    const tagsInput = document.getElementById('input-tags');
    const descriptionInput = document.getElementById('input-description');
    if (!mainSelect || !subSelect || !contentInput || !prompt) return;

    mainSelect.value = prompt.mainCategory || '';
    renderSubCategorySelect();
    if (prompt.subCategory && ![...subSelect.options].some(option => option.value === prompt.subCategory)) {
      appendSelectOption(subSelect, prompt.subCategory, prompt.subCategory);
    }
    subSelect.value = prompt.subCategory || '';
    contentInput.value = prompt.content || '';
    if (tagsInput) tagsInput.value = normalizePromptTags(prompt.tags).join(', ');
    if (descriptionInput) {
      descriptionInput.value = prompt.description || '';
    }
    renderPromptDescriptionField();
  }

  async function openEditPromptModal(id, e) {
    if (e) e.stopPropagation();
    const prompt = prompts.find(item => item.id === id);
    if (!prompt) {
      showToast('편집할 프롬프트를 찾지 못했습니다');
      return;
    }

    const modal = document.getElementById('add-prompt-modal');
    modal.classList.add('open');
    setPromptFormToEdit(prompt);
    renderCategorySelectors();
    syncPromptFormFields(prompt);
    const [landscapeUrl, portraitUrl] = await Promise.all([
      (!prompt.imageData && prompt.imageId)
        ? getPromptImageObjectUrl(prompt.imageId)
        : Promise.resolve(''),
      (!prompt.portraitImageData && prompt.portraitImageId)
        ? getPromptImageObjectUrl(prompt.portraitImageId)
        : Promise.resolve(''),
    ]);

    const landscapeDataUrl = prompt.imageData || landscapeUrl || '';
    const portraitDataUrl = prompt.portraitImageData || portraitUrl || '';

    pendingPromptImages = {
      landscape: landscapeDataUrl ? {
        dataUrl: landscapeDataUrl,
        fileName: prompt.imageName || '',
        mimeType: '',
        file: null,
        imageName: prompt.imageName || buildPromptImageName(prompt.mainCategory, prompt.subCategory, prompt.content),
      } : null,
      portrait: portraitDataUrl ? {
        dataUrl: portraitDataUrl,
        fileName: prompt.portraitImageName || '',
        mimeType: '',
        file: null,
        imageName: prompt.portraitImageName || buildPromptImageName(prompt.mainCategory, prompt.subCategory, prompt.content),
      } : null,
    };
    setPromptImageEditOrientation('portrait');
    renderPendingPromptImagePreview();
    document.getElementById('input-content').focus();
  }

