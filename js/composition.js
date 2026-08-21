  async function addPrompt() {
    const isEditMode = promptFormMode === 'edit' && !!editingPromptId;
    const mainCategory = document.getElementById('input-main-category').value.trim();
    const subCategory = document.getElementById('input-sub-category').value.trim();
    const content = document.getElementById('input-content').value.trim();
    const tags = normalizePromptTags(document.getElementById('input-tags').value);
    const isCore = !!mainCategory && !!subCategory && isSubCategoryCoreEnabled(mainCategory, subCategory);
    const description = isCore ? document.getElementById('input-description').value.trim() : '';
    if (!mainCategory) { showToast('대분류를 입력하세요'); return; }
    if (!subCategory) { showToast('중분류를 입력하세요'); return; }
    if (!content) { showToast('프롬프트 내용을 입력하세요'); return; }

    ensureMainCategoryConfig(mainCategory);
    categoryConfig.mainOrder = uniqueInOrder([...(categoryConfig.mainOrder || []), mainCategory]);
    const mainConfig = ensureMainCategoryConfig(mainCategory);
    mainConfig.subOrder = uniqueInOrder([...(mainConfig.subOrder || []), subCategory]);

    const previousPrompt = isEditMode ? prompts.find(prompt => prompt.id === editingPromptId) : null;
    const previousImageId = previousPrompt?.imageId || editingPromptImageId || '';
    const previousPortraitImageId = previousPrompt?.portraitImageId || editingPromptPortraitImageId || '';
    let nextImageId = previousImageId;
    let nextPortraitImageId = previousPortraitImageId;

    const pendingLandscapeImage = getPendingPromptImage('landscape');
    const pendingPortraitImage = getPendingPromptImage('portrait');
    if (isEditMode && removedPromptImages.landscape) nextImageId = '';
    if (isEditMode && removedPromptImages.portrait) nextPortraitImageId = '';

    try {
      if (pendingLandscapeImage?.file instanceof File) {
        nextImageId = await saveImageBlobRecord({
          blob: pendingLandscapeImage.file,
          mimeType: pendingLandscapeImage.mimeType || pendingLandscapeImage.file.type || '',
          fileName: pendingLandscapeImage.fileName || pendingLandscapeImage.file.name || '',
        });
      } else if (!previousImageId && pendingLandscapeImage?.dataUrl?.startsWith('data:')) {
        const blob = dataUrlToBlob(pendingLandscapeImage.dataUrl);
        nextImageId = await saveImageBlobRecord({
          blob,
          mimeType: pendingLandscapeImage.mimeType || blob.type || '',
          fileName: pendingLandscapeImage.fileName || '',
        });
      }

      if (pendingPortraitImage?.file instanceof File) {
        nextPortraitImageId = await saveImageBlobRecord({
          blob: pendingPortraitImage.file,
          mimeType: pendingPortraitImage.mimeType || pendingPortraitImage.file.type || '',
          fileName: pendingPortraitImage.fileName || pendingPortraitImage.file.name || '',
        });
      } else if (!previousPortraitImageId && pendingPortraitImage?.dataUrl?.startsWith('data:')) {
        const blob = dataUrlToBlob(pendingPortraitImage.dataUrl);
        nextPortraitImageId = await saveImageBlobRecord({
          blob,
          mimeType: pendingPortraitImage.mimeType || blob.type || '',
          fileName: pendingPortraitImage.fileName || '',
        });
      }
    } catch {
      showToast('이미지 저장 중 오류가 발생했습니다');
      return;
    }

    const nextPrompt = {
      id: editingPromptId || uid(),
      mainCategory,
      subCategory,
      content,
      tags,
      description: isCore ? description : '',
      imageId: nextImageId,
      imageData: '',
      imageName: buildPromptImageName(mainCategory, subCategory, content),
      portraitImageId: nextPortraitImageId,
      portraitImageData: '',
      portraitImageName: buildPromptImageName(mainCategory, subCategory, content),
    };

    if (promptFormMode === 'edit' && editingPromptId) {
      prompts = prompts.map(prompt => prompt.id === editingPromptId ? nextPrompt : prompt);
      syncPromptUpdateToComposedPrompts(nextPrompt);
      selected = selected.map(item => {
        if (item.source !== 'prompt' || item.id !== editingPromptId) return item;
        return { ...item, ...nextPrompt };
      });
    } else {
      prompts.push(nextPrompt);
    }

    if (isEditMode) {
      const removedImageIds = [];
      if (previousImageId && previousImageId !== nextImageId) removedImageIds.push(previousImageId);
      if (previousPortraitImageId && previousPortraitImageId !== nextPortraitImageId) removedImageIds.push(previousPortraitImageId);
      for (const imageId of uniqueInOrder(removedImageIds)) {
        await deleteImageIfOrphaned(imageId);
      }
    }

    ensureCategoryConfigConsistency();
    save();
    document.getElementById('input-content').value = '';
    document.getElementById('input-tags').value = '';
    document.getElementById('input-description').value = '';
    clearPendingPromptImage({ all: true });
    resetPromptFormToAdd();
    renderCategorySelectors();
    render();
    closeAddPromptModal();
    showToast(isEditMode ? '프롬프트가 수정되었습니다' : '저장되었습니다');
  }

  async function deletePrompt(id, source, e) {
    e.stopPropagation();
    if (source === 'prompt' && !confirm('정말 삭제하시겠습니까?')) return;
    clearOutputOverride();
    let removedImageIds = [];
    if (source === 'composed') {
      composedPrompts = composedPrompts.filter(p => p.id !== id);
    } else {
      const removedPrompt = prompts.find(p => p.id === id);
      removedImageIds = [removedPrompt?.imageId || '', removedPrompt?.portraitImageId || ''].filter(Boolean);
      prompts = prompts.filter(p => p.id !== id);
      ensureCategoryConfigConsistency();
    }
    selected = selected.filter(s => !(s.id === id && s.source === source));
    save();
    for (const imageId of removedImageIds) {
      await deleteImageIfOrphaned(imageId);
    }
    render();
  }

  function handlePromptTap(p) {
    if (isDoubleTapTouchCooldownActive()) {
      return;
    }

    if (activePromptPreviewId === p.id) {
      activePromptComposedGridMode = !activePromptComposedGridMode;
      render();
      return;
    }

    clearSelectedPromptGridMode();
    activePromptComposedGridMode = false;
    isPromptPreviewSuppressed = false;
    activePromptGridReturn = null;
    activePromptTagFilter = null;
    activePromptTagBrowser = false;
    activePromptCategoryGridMode = false;

    const idx = selected.findIndex(s => s.id === p.id && s.source === 'prompt');
    if (idx >= 0) {
      clearOutputOverride();
      selected.splice(idx, 1);
      render();
      return;
    }

    if (tapComposeMode === PROMPT_ADD_MODE.TAP) {
      addPromptToComposition(p);
      return;
    }

    if (tapComposeMode === PROMPT_ADD_MODE.DOUBLE_TAP_PREVIEW && activePromptPreviewId === p.id) {
      const added = addPromptToComposition(p);
      if (added) {
        activateDoubleTapTouchCooldown();
      }
      return;
    }

    if (activePromptPreviewId !== p.id) {
      activePromptPreviewId = p.id;
      render();
    }
  }

  function addPromptToComposition(p, options = {}) {
    isPromptPreviewSuppressed = false;
    activePromptTagFilter = null;
    activePromptTagBrowser = false;
    activePromptCategoryGridMode = false;
    activePromptComposedGridMode = false;
    activeSelectedPromptGridMode = false;
    const suppressToast = !!options.suppressToast;
    const idx = selected.findIndex(s => s.id === p.id && s.source === 'prompt');
    if (idx >= 0) {
      if (!suppressToast) showToast('이미 조합에 추가된 프롬프트입니다');
      return false;
    }

    if (activePromptPreviewId !== p.id) {
      activePromptPreviewId = p.id;
    }

    clearOutputOverride();
    selectingFromPreviewId = p.id;
    selected.push({ ...p, source: 'prompt' });
    render();
    scrollSelectedPromptChipIntoView(p.id);
    if (options.scrollToCard) {
      requestAnimationFrame(() => {
        const list = document.getElementById('prompt-list');
        const card = list
          ? [...list.querySelectorAll('.prompt-item')].find(item => item.dataset.promptId === p.id)
          : null;
        if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
    if (!suppressToast) showToast('조합에 추가되었습니다');
    setTimeout(() => {
      if (selectingFromPreviewId !== p.id) return;
      selectingFromPreviewId = null;
      renderPromptList();
    }, 300);
    return true;
  }

  function removeSelected(i) {
    clearOutputOverride();
    selected.splice(i, 1);
    render();
  }

  function jumpToPromptCardFromSelected(index) {
    const item = selected[index];
    if (!item || !item.id) {
      showToast('선택한 프롬프트를 찾지 못했습니다');
      return;
    }
    if (item.source && item.source !== 'prompt') {
      showToast('개별 프롬프트 카드에서만 편집으로 이동할 수 있습니다');
      return;
    }

    const prompt = prompts.find(entry => entry.id === item.id);
    if (!prompt) {
      showToast('원본 프롬프트를 찾지 못했습니다');
      return;
    }

    // 선택 칩 탭은 항상 해당 프롬프트 단일 미리보기로 진입한다.
    isPromptPreviewSuppressed = false;
    activePromptGridReturn = null;
    activePromptTagFilter = null;
    activePromptTagBrowser = false;
    activePromptCategoryGridMode = false;
    activePromptComposedGridMode = false;
    activeSelectedPromptGridMode = false;
    activePromptPreviewId = prompt.id;
    activeCategoryPrompt = prompt.mainCategory || activeCategoryPrompt;
    activeSubCategoryPrompt = prompt.subCategory || activeSubCategoryPrompt;

    if (prompt.mainCategory && getMainCategoryConfig(prompt.mainCategory).hiddenByDefault) {
      openedHiddenMainCategories.add(prompt.mainCategory);
    }

    if (leftPanelTab !== 'prompt') {
      setLeftPanelTab('prompt');
    } else {
      render();
    }

    highlightSelectedPromptChip(prompt.id);
    focusSubCategoryChip(prompt.mainCategory, prompt.subCategory);

    requestAnimationFrame(() => {
      const target = document.querySelector(`.prompt-item[data-prompt-id="${prompt.id}"]`);
      if (!target) return;

      closeAllPromptSwipeActions(prompt.id);
      target.classList.add('actions-open');
      const swipeContent = target.querySelector('.prompt-item-swipe-content');
      if (swipeContent) {
        swipeContent.style.transition = '';
        swipeContent.style.transform = `translateX(-${PROMPT_SWIPE_ACTION_WIDTH}px)`;
      }

      target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    });
  }

  function clearSelected() {
    clearOutputOverride();
    selected = [];
    render();
  }

  function clearCurrentComposition() {
    const resetButton = document.getElementById('clear-composition-button');
    if (resetButton?.dataset.resetArmed !== 'true') {
      if (resetButton) {
        resetButton.dataset.resetArmed = 'true';
        resetButton.textContent = '🧹 초기화!';
      }
      return;
    }

    clearOutputOverride();
    selected = [];
    render();
    if (resetButton) {
      resetButton.dataset.resetArmed = 'false';
      resetButton.textContent = '🧹 초기화';
    }
    showToast('현재 조합이 초기화되었습니다');
  }

  function copyPrompt() {
    const text = isOutputEditing ? document.getElementById('output-editor').value : getComposedOutputText();
    if (!text.trim()) { showToast('복사할 프롬프트가 없습니다'); return; }
    navigator.clipboard.writeText(text).then(() => showToast('클립보드에 복사되었습니다!')).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('클립보드에 복사되었습니다!');
    });
  }

  function copyPromptSilently(text) {
    if (!text.trim()) return Promise.resolve(false);
    return navigator.clipboard.writeText(text).then(() => true).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      return true;
    });
  }

  async function saveCustomCombo() {
    const nameInput = document.getElementById('custom-combo-name');
    const subCategory = nameInput?.value.trim() || '';
    if (!subCategory) {
      showToast('커스텀 콤보 이름을 입력하세요');
      nameInput?.focus();
      return;
    }
    if (!editingCustomComboId && selectedCustomCombo.length === 0) {
      showToast('저장할 커스텀 조합이 없습니다');
      return;
    }

    const existingCombo = editingCustomComboId ? customCombos.find(item => item.id === editingCustomComboId) : null;
    const comboImagePosition = getCustomComboImagePosition();
    let imageId = existingCombo?.imageId || '';
    let portraitImageId = existingCombo?.portraitImageId || '';
    const landscapeImage = pendingCustomComboImages.landscape;
    const portraitImage = pendingCustomComboImages.portrait;
    const previousCustomComboImageIds = [
      existingCombo?.imageId || '',
      existingCombo?.portraitImageId || '',
      ...Object.values(existingCombo?.itemImages || {}).map(image => image?.imageId || ''),
    ].filter(Boolean);
    if (editingCustomComboId && removedCustomComboImages.landscape) imageId = '';
    if (editingCustomComboId && removedCustomComboImages.portrait) portraitImageId = '';
    try {
      if (landscapeImage?.file instanceof File) {
        imageId = await saveImageBlobRecord({
          id: imageId,
          blob: landscapeImage.file,
          mimeType: landscapeImage.mimeType || landscapeImage.file.type || '',
          fileName: landscapeImage.fileName || landscapeImage.file.name || '',
        });
      }
      if (portraitImage?.file instanceof File) {
        portraitImageId = await saveImageBlobRecord({
          id: portraitImageId,
          blob: portraitImage.file,
          mimeType: portraitImage.mimeType || portraitImage.file.type || '',
          fileName: portraitImage.fileName || portraitImage.file.name || '',
        });
      }
    } catch {
      showToast('커스텀 콤보 이미지 저장 중 오류가 발생했습니다');
      return;
    }
    const imageName = buildComposedImageName('콤보', subCategory, '');
    const itemImages = {};
    try {
      for (const [itemId, pendingImage] of Object.entries(pendingCustomComboItemImages)) {
        if (!pendingImage) continue;
        let itemImageId = pendingImage.imageId || '';
        if (pendingImage.file instanceof File) {
          itemImageId = await saveImageBlobRecord({
            id: itemImageId,
            blob: pendingImage.file,
            mimeType: pendingImage.mimeType || pendingImage.file.type || '',
            fileName: pendingImage.fileName || pendingImage.file.name || '',
          });
        }
        itemImages[itemId] = {
          imageId: itemImageId,
          imageData: itemImageId ? '' : (pendingImage.dataUrl || ''),
          imageName: pendingImage.fileName || '',
        };
      }
    } catch {
      showToast('커스텀 조합 이미지 저장 중 오류가 발생했습니다');
      return;
    }

    if (editingCustomComboId) {
      customCombos = customCombos.map(item => item.id === editingCustomComboId
        ? {
          ...item,
          mainCategory: '콤보',
          category: '콤보',
          subCategory,
          imageId,
          imageData: imageId ? '' : (landscapeImage?.dataUrl || item.imageData || ''),
          imageName,
          portraitImageId,
          portraitImageData: portraitImageId ? '' : (portraitImage?.dataUrl || item.portraitImageData || ''),
          portraitImageName: imageName,
          comboImagePosition,
          itemImages,
        }
        : item);
    } else {
      customCombos.push({
        id: uid(),
        mainCategory: '콤보',
        subCategory,
        category: '콤보',
        items: selectedCustomCombo.map(item => item.id),
        content: selectedCustomCombo.map(item => item.content || item.subCategory || '').filter(Boolean).join(', '),
        itemImages,
        imageId,
        imageData: imageId ? '' : (landscapeImage?.dataUrl || ''),
        imageName,
        portraitImageId,
        portraitImageData: portraitImageId ? '' : (portraitImage?.dataUrl || ''),
        portraitImageName: imageName,
        comboImagePosition,
      });
    }
    save();
    for (const oldImageId of uniqueInOrder(previousCustomComboImageIds)) {
      await deleteImageIfOrphaned(oldImageId);
    }
    closeSaveCustomComboModal();
    render();
    showToast('커스텀 콤보가 저장되었습니다');
  }

  async function saveComposedPrompt() {
    const mainCategoryInput = document.getElementById('combo-main-category');
    const subCategoryInput = document.getElementById('combo-sub-category');
    const isEditMode = !!editingComposedPromptId;
    const mainCategory = mainCategoryInput.value.trim();
    const subCategory = subCategoryInput.value.trim();
    const items = selected.map(normalizeSelected).filter(item => item && item.content).map(cleanPrompt);
    const previousComposed = isEditMode ? composedPrompts.find(item => item.id === editingComposedPromptId) : null;
    const previousImageId = previousComposed?.imageId || editingComposedImageId || '';
    const previousPortraitImageId = previousComposed?.portraitImageId || editingComposedPortraitImageId || '';
    let nextImageId = previousImageId;
    let nextPortraitImageId = previousPortraitImageId;

    const pendingLandscapeImage = getPendingComposedImage('landscape');
    const pendingPortraitImage = getPendingComposedImage('portrait');
    if (isEditMode && removedComposedImages.landscape) nextImageId = '';
    if (isEditMode && removedComposedImages.portrait) nextPortraitImageId = '';

    if (!mainCategory) {
      showToast('커스텀 조합 대분류를 입력하세요');
      return;
    }
    if (!subCategory) {
      showToast('커스텀 조합 이름(중분류)을 입력하세요');
      return;
    }
    if (items.length === 0) {
      showToast('저장할 조합이 없습니다');
      return;
    }

    try {
      if (pendingLandscapeImage?.file instanceof File) {
        nextImageId = await saveImageBlobRecord({
          blob: pendingLandscapeImage.file,
          mimeType: pendingLandscapeImage.mimeType || pendingLandscapeImage.file.type || '',
          fileName: pendingLandscapeImage.fileName || pendingLandscapeImage.file.name || '',
        });
      } else if (!previousImageId && pendingLandscapeImage?.dataUrl?.startsWith('data:')) {
        const blob = dataUrlToBlob(pendingLandscapeImage.dataUrl);
        nextImageId = await saveImageBlobRecord({
          blob,
          mimeType: pendingLandscapeImage.mimeType || blob.type || '',
          fileName: pendingLandscapeImage.fileName || '',
        });
      }

      if (pendingPortraitImage?.file instanceof File) {
        nextPortraitImageId = await saveImageBlobRecord({
          blob: pendingPortraitImage.file,
          mimeType: pendingPortraitImage.mimeType || pendingPortraitImage.file.type || '',
          fileName: pendingPortraitImage.fileName || pendingPortraitImage.file.name || '',
        });
      } else if (!previousPortraitImageId && pendingPortraitImage?.dataUrl?.startsWith('data:')) {
        const blob = dataUrlToBlob(pendingPortraitImage.dataUrl);
        nextPortraitImageId = await saveImageBlobRecord({
          blob,
          mimeType: pendingPortraitImage.mimeType || blob.type || '',
          fileName: pendingPortraitImage.fileName || '',
        });
      }
    } catch {
      showToast('이미지 저장 중 오류가 발생했습니다');
      return;
    }

    const imageName = pendingLandscapeImage?.imageName
      || buildComposedImageName(mainCategory, subCategory, items.map(p => p.content).join(', '));
    const portraitImageName = pendingPortraitImage?.imageName
      || buildComposedImageName(mainCategory, subCategory, items.map(p => p.content).join(', '));

    const nextComposed = {
      id: editingComposedPromptId || uid(),
      mainCategory,
      subCategory,
      category: mainCategory,
      items,
      content: items.map(p => p.content).join(', '),
      imageId: nextImageId,
      imageData: nextImageId ? '' : (pendingLandscapeImage?.dataUrl || editingComposedImageData || ''),
      imageName,
      portraitImageId: nextPortraitImageId,
      portraitImageData: nextPortraitImageId ? '' : (pendingPortraitImage?.dataUrl || editingComposedPortraitImageData || ''),
      portraitImageName,
    };

    if (isEditMode) {
      composedPrompts = composedPrompts.map(item => item.id === editingComposedPromptId ? nextComposed : item);
      selected = selected.map(item => {
        if (item.source !== 'composed' || item.id !== editingComposedPromptId) return item;
        return { ...item, ...nextComposed };
      });
    } else {
      composedPrompts.push(nextComposed);
    }

    if (isEditMode) {
      const removedImageIds = [];
      if (previousImageId && previousImageId !== nextImageId) removedImageIds.push(previousImageId);
      if (previousPortraitImageId && previousPortraitImageId !== nextPortraitImageId) removedImageIds.push(previousPortraitImageId);
      for (const imageId of uniqueInOrder(removedImageIds)) {
        await deleteImageIfOrphaned(imageId);
      }
    }

    save();
    render();
    closeSaveComposedModal();
    showToast(isEditMode ? '조합 프롬프트가 수정되었습니다' : '조합 프롬프트가 저장되었습니다');
  }

  // ── ZIP Backup (metadata + images) ──
