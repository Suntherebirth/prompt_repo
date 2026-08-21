  function getComposedPromptOptionLabel(prompt) {
    const content = prompt?.content || '';
    return content;
  }

  function getComposedEditorPromptMainCategories() {
    return uniqueInOrder(prompts.map(prompt => prompt.mainCategory).filter(Boolean));
  }

  function getComposedEditorPromptSubCategories(mainCategory) {
    if (!mainCategory) return [];
    return uniqueInOrder(
      prompts
        .filter(prompt => prompt.mainCategory === mainCategory)
        .map(prompt => prompt.subCategory)
        .filter(Boolean)
    );
  }

  function handleComposedEditorAddMainChange() {
    const subSelect = document.getElementById('composed-item-add-sub');
    const promptSelect = document.getElementById('composed-item-add-select');
    if (subSelect) subSelect.value = '';
    if (promptSelect) promptSelect.value = '';
    renderComposedModalItemEditor();
  }

  function handleComposedEditorAddSubChange() {
    const promptSelect = document.getElementById('composed-item-add-select');
    if (promptSelect) promptSelect.value = '';
    renderComposedModalItemEditor();
  }

  function renderComposedModalItemEditor() {
    const list = document.getElementById('composed-items-edit-list');
    const addMainSelect = document.getElementById('composed-item-add-main');
    const addSubSelect = document.getElementById('composed-item-add-sub');
    const addSelect = document.getElementById('composed-item-add-select');
    const addBtn = document.getElementById('composed-item-add-btn');
    if (!list || !addMainSelect || !addSubSelect || !addSelect || !addBtn) return;

    const previousMainValue = addMainSelect.value;
    const previousSubValue = addSubSelect.value;
    const previousValue = addSelect.value;

    const mainCategories = getComposedEditorPromptMainCategories();
    addMainSelect.innerHTML = '';
    appendSelectOption(addMainSelect, '', '1단계: 대분류 선택');
    mainCategories.forEach(mainCategory => appendSelectOption(addMainSelect, mainCategory, mainCategory));
    if (previousMainValue && mainCategories.includes(previousMainValue)) {
      addMainSelect.value = previousMainValue;
    }

    const currentMainCategory = addMainSelect.value;
    const subCategories = getComposedEditorPromptSubCategories(currentMainCategory);
    addSubSelect.innerHTML = '';
    appendSelectOption(addSubSelect, '', currentMainCategory ? '2단계: 중분류 선택' : '1단계에서 대분류를 선택');
    subCategories.forEach(subCategory => appendSelectOption(addSubSelect, subCategory, subCategory));
    addSubSelect.disabled = !currentMainCategory;
    if (previousSubValue && subCategories.includes(previousSubValue)) {
      addSubSelect.value = previousSubValue;
    }

    const currentSubCategory = addSubSelect.value;
    const filteredPrompts = prompts
      .filter(prompt => {
        if (!currentMainCategory || prompt.mainCategory !== currentMainCategory) return false;
        if (!currentSubCategory || prompt.subCategory !== currentSubCategory) return false;
        return true;
      })
      .sort((a, b) => {
        const byContent = String(a.content || '').localeCompare(String(b.content || ''), 'ko');
        if (byContent !== 0) return byContent;
        return String(a.id || '').localeCompare(String(b.id || ''), 'ko');
      });

    addSelect.innerHTML = '';
    appendSelectOption(addSelect, '', currentSubCategory ? '3단계: 프롬프트 선택' : '2단계에서 중분류를 선택');
    filteredPrompts.forEach(prompt => {
      appendSelectOption(addSelect, prompt.id, getComposedPromptOptionLabel(prompt));
    });
    addSelect.disabled = !currentSubCategory;
    if (previousValue && filteredPrompts.some(prompt => prompt.id === previousValue)) {
      addSelect.value = previousValue;
    }
    addBtn.disabled = filteredPrompts.length === 0 || !addSelect.value;

    list.innerHTML = '';
    addSelect.onchange = () => {
      addBtn.disabled = !addSelect.value;
    };

    if (selected.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.style.padding = '14px 8px';
      empty.textContent = '조합에 프롬프트가 없습니다. 위에서 추가해 주세요.';
      list.appendChild(empty);
      return;
    }

    selected.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'composed-modal-item';

      const text = document.createElement('div');
      text.className = 'composed-modal-item-text';
      text.innerHTML = `<span class="chip-cat">${index + 1}</span><span class="chip-cat">${esc(item.mainCategory || item.category || '')}</span><span class="chip-cat" style="color:#8ab4ff">${esc(item.subCategory || '')}</span><span>${esc(item.content || '')}</span>`;

      const actions = document.createElement('div');
      actions.className = 'composed-modal-item-actions';

      const upBtn = document.createElement('button');
      upBtn.type = 'button';
      upBtn.className = 'btn btn-secondary btn-sm';
      upBtn.textContent = '↑';
      upBtn.disabled = index === 0;
      upBtn.addEventListener('click', () => moveSelectedItemInComposedEditor(index, -1));

      const downBtn = document.createElement('button');
      downBtn.type = 'button';
      downBtn.className = 'btn btn-secondary btn-sm';
      downBtn.textContent = '↓';
      downBtn.disabled = index === selected.length - 1;
      downBtn.addEventListener('click', () => moveSelectedItemInComposedEditor(index, 1));

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'btn btn-danger btn-sm';
      removeBtn.textContent = '삭제';
      removeBtn.addEventListener('click', () => removeSelectedItemInComposedEditor(index));

      actions.appendChild(upBtn);
      actions.appendChild(downBtn);
      actions.appendChild(removeBtn);

      row.appendChild(text);
      row.appendChild(actions);
      list.appendChild(row);
    });
  }

  function addPromptToComposedEditor() {
    const addSelect = document.getElementById('composed-item-add-select');
    if (!addSelect) return;

    const promptId = addSelect.value;
    if (!promptId) {
      showToast('추가할 프롬프트를 선택해 주세요');
      return;
    }

    const prompt = prompts.find(item => item.id === promptId);
    if (!prompt) {
      showToast('선택한 프롬프트를 찾지 못했습니다');
      return;
    }

    const added = addPromptToComposition(prompt, { suppressToast: true });
    if (!added) {
      showToast('이미 조합에 추가된 프롬프트입니다');
      return;
    }

    addSelect.value = '';
    showToast('조합에 프롬프트가 추가되었습니다');
  }

  function moveSelectedItemInComposedEditor(index, delta) {
    const toIndex = index + delta;
    if (index < 0 || toIndex < 0 || index >= selected.length || toIndex >= selected.length) return;
    clearOutputOverride();
    const item = selected.splice(index, 1)[0];
    selected.splice(toIndex, 0, item);
    render();
  }

  function removeSelectedItemInComposedEditor(index) {
    if (index < 0 || index >= selected.length) return;
    clearOutputOverride();
    selected.splice(index, 1);
    render();
  }

  function getComposedOutputText() {
    if (customOutputText !== null) return customOutputText;
    if (selected.length === 0) return '';
    const sep = ', ';
    return selected.map(p => p.content).join(sep);
  }

  function setOutputEditMode(editing) {
    const box = document.getElementById('output-box');
    const editor = document.getElementById('output-editor');
    const actions = document.getElementById('output-edit-actions');
    isOutputEditing = editing;
    box.style.display = editing ? 'none' : 'block';
    editor.style.display = editing ? 'block' : 'none';
    actions.style.display = editing ? 'flex' : 'none';
  }

  function startOutputEdit() {
    const text = getComposedOutputText();
    if (!text) {
      showToast('편집할 조합 프롬프트가 없습니다');
      return;
    }
    const editor = document.getElementById('output-editor');
    editor.value = text;
    setOutputEditMode(true);
    editor.focus();
  }

  function applyOutputEdit() {
    const editor = document.getElementById('output-editor');
    const text = editor.value;
    if (!text.trim()) {
      showToast('빈 내용으로는 적용할 수 없습니다');
      return;
    }
    customOutputText = text;
    setOutputEditMode(false);
    updateOutput();
    showToast('조합 프롬프트가 수정되었습니다');
  }

  function cancelOutputEdit() {
    setOutputEditMode(false);
    updateOutput();
  }

  function clearOutputOverride() {
    customOutputText = null;
    if (isOutputEditing) setOutputEditMode(false);
  }

  function updateOutput() {
    if (isOutputEditing) return;
    const box = document.getElementById('output-box');
    const text = getComposedOutputText();
    box.textContent = text || OUTPUT_PLACEHOLDER;
    box.classList.toggle('is-placeholder', !text);
  }

  function renderCategorySuggestions() {
    renderCategorySelectors();
  }

  function appendSelectOption(select, value, label) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    select.appendChild(option);
  }

  function renderMainCategorySelect() {
    const select = document.getElementById('input-main-category');
    const categories = getMainCategories();
    const current = select.value;

    select.innerHTML = '';
    appendSelectOption(select, '', '1단계: 대분류 선택');
    categories.forEach(category => appendSelectOption(select, category, category));
    appendSelectOption(select, '__new__', '＋ 새 대분류 추가');

    if (current && categories.includes(current)) {
      select.value = current;
    }
  }

  function renderSubCategorySelect() {
    const mainSelect = document.getElementById('input-main-category');
    const select = document.getElementById('input-sub-category');
    const mainCategory = mainSelect.value ? mainSelect.value : '';
    const categories = mainCategory ? getSubCategories(mainCategory) : [];
    const current = select.value;

    select.innerHTML = '';
    appendSelectOption(select, '', mainCategory ? '2단계: 중분류 이름 선택' : '1단계에서 대분류를 먼저 선택');

    if (mainCategory) {
      categories.forEach(category => appendSelectOption(select, category, category));
      if (categories.length === 0) {
        appendSelectOption(select, '기타', '기타');
      }
      appendSelectOption(select, '__new__', '＋ 새 중분류 추가');
      select.disabled = false;
      if (current && [...categories, '기타'].includes(current)) {
        select.value = current;
      }
    } else {
      select.disabled = true;
    }
  }

  function renderComposedMainCategorySelect() {
    const select = document.getElementById('combo-main-category');
    const categories = getComposedCategories();
    const current = select.value;

    select.innerHTML = '';
    appendSelectOption(select, '', '커스텀 대분류 선택');
    categories.forEach(category => appendSelectOption(select, category, category));
    appendSelectOption(select, '__new__', '＋ 새 대분류 추가');

    if (current && categories.includes(current)) {
      select.value = current;
    }
  }

  function renderComposedSubCategorySelect() {
    const mainSelect = document.getElementById('combo-main-category');
    const select = document.getElementById('combo-sub-category');
    const mainCategory = mainSelect.value && mainSelect.value !== '__new__' ? mainSelect.value : '';
    const categories = mainCategory ? getComposedSubCategories(mainCategory) : [];
    const current = select.value;

    select.innerHTML = '';
    appendSelectOption(select, '', mainCategory ? '커스텀 이름(중분류) 선택' : '대분류를 먼저 선택');

    if (mainCategory) {
      categories.forEach(category => appendSelectOption(select, category, category));
      appendSelectOption(select, '__new__', '＋ 새 이름 추가');
      select.disabled = false;
      if (current && categories.includes(current)) {
        select.value = current;
      }
    } else {
      select.disabled = true;
    }
  }

  function handleMainCategoryChange() {
    const select = document.getElementById('input-main-category');
    if (select.value === '__new__') {
      const nextValue = prompt('새 대분류 이름을 입력하세요');
      if (nextValue && nextValue.trim()) {
        const value = nextValue.trim();
        appendSelectOption(select, value, value);
        select.value = value;
      } else {
        select.value = '';
      }
    }
    renderSubCategorySelect();
    renderPromptDescriptionField();
    renderPendingPromptImagePreview();
  }

  function handleSubCategoryChange() {
    const select = document.getElementById('input-sub-category');
    if (select.value === '__new__') {
      const nextValue = prompt('새 중분류 이름을 입력하세요');
      if (nextValue && nextValue.trim()) {
        const value = nextValue.trim();
        appendSelectOption(select, value, value);
        select.value = value;
      } else {
        select.value = '';
      }
    }
    renderPromptDescriptionField();
    renderPendingPromptImagePreview();
  }

  function handleComposedMainCategoryChange() {
    const select = document.getElementById('combo-main-category');
    if (select.value === '__new__') {
      const nextValue = prompt('새 커스텀 대분류 이름을 입력하세요');
      if (nextValue && nextValue.trim()) {
        const value = nextValue.trim();
        appendSelectOption(select, value, value);
        select.value = value;
      } else {
        select.value = '';
      }
    }
    renderComposedSubCategorySelect();
    renderPendingComposedImagePreview();
  }

  function handleComposedSubCategoryChange() {
    const select = document.getElementById('combo-sub-category');
    if (select.value === '__new__') {
      const nextValue = prompt('새 커스텀 이름(중분류)을 입력하세요');
      if (nextValue && nextValue.trim()) {
        const value = nextValue.trim();
        appendSelectOption(select, value, value);
        select.value = value;
      } else {
        select.value = '';
      }
    }
    renderPendingComposedImagePreview();
  }

  function setLeftPanelTab(tab, options = {}) {
    const isComboTabRequest = tab === 'combo';
    const isAlreadyOnComboTab = leftPanelTab === 'combo';

    if (isComboTabRequest && isAlreadyOnComboTab) {
      isCustomComboTabOpen = !isCustomComboTabOpen;
      if (isCustomComboTabOpen) {
        clearCoreRandomVisualState();
      }
      render();
      return;
    }

    const previousTab = leftPanelTab;
    leftPanelTab = isComboTabRequest ? 'combo' : 'prompt';
    isCustomComboTabOpen = false;

    if (previousTab !== leftPanelTab && !options.preservePromptPreview) {
      clearPromptDescriptionPreview({ feedback: true });
    }
    const isPromptTab = leftPanelTab === 'prompt';
    if (isPromptTab && shouldAutoSelectCoreSubCategoryOnPromptTab) {
      shouldAutoSelectCoreSubCategoryOnPromptTab = false;
      // 선택 칩 탭 등 명시적 이동이 선행된 경우 핵심 분류 자동 선택을 건너뛴다.
      if (!options.skipCoreAutoSelect) {
        applyCoreSubCategorySelection();
      }
    }
    document.getElementById('panel-view-prompt').classList.toggle('active', isPromptTab);
    document.getElementById('panel-view-combo').classList.toggle('active', !isPromptTab);
    localStorage.setItem(LEFT_PANEL_TAB_KEY, leftPanelTab);
    render();
  }

  function toggleWorkspaceTab() {
    setLeftPanelTab(leftPanelTab === 'prompt' ? 'combo' : 'prompt');
  }

  function bindWorkspaceTitleSwipe() {
    const title = document.getElementById('workspace-title-btn');
    if (!title) return;

    const SWIPE_COMMIT_X = 56;
    const SWIPE_PREVIEW_MAX_X = 82;
    const SWIPE_COMMIT_Y = 48;
    const SWIPE_PREVIEW_MAX_Y = 72;
    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let tracking = false;
    let swiping = false;
    let swipeDirection = null;

    title.addEventListener('pointerdown', event => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      tracking = true;
      swiping = false;
      swipeDirection = null;
      try { title.setPointerCapture(pointerId); } catch {}
    });

    title.addEventListener('pointermove', event => {
      if (!tracking || event.pointerId !== pointerId) return;

      const deltaX = event.clientX - startX;
      const deltaY = event.clientY - startY;
      const canSwipeToPrompt = leftPanelTab === 'combo' && deltaX < 0;
      if (!swiping) {
        if (Math.abs(deltaX) < 8) return;
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          swipeDirection = 'horizontal';
        } else if (deltaY > 0) {
          swipeDirection = 'vertical';
        } else {
          tracking = false;
          return;
        }
        swiping = true;
      }

      if (swipeDirection === 'horizontal' && (deltaX > 0 || canSwipeToPrompt)) {
        event.preventDefault();
        const previewX = Math.max(-SWIPE_PREVIEW_MAX_X, Math.min(deltaX, SWIPE_PREVIEW_MAX_X));
        title.style.transform = `translateX(${previewX * 0.34}px)`;
        title.classList.toggle('workspace-title-swipe-ready', deltaX >= SWIPE_COMMIT_X);
        title.classList.toggle('workspace-title-swipe-left-ready', canSwipeToPrompt && deltaX <= -SWIPE_COMMIT_X);
        title.classList.remove('workspace-title-swipe-down-ready');
      } else if ((leftPanelTab === 'combo' || leftPanelTab === 'prompt') && swipeDirection === 'vertical' && deltaY > 0) {
        event.preventDefault();
        const previewY = Math.min(deltaY, SWIPE_PREVIEW_MAX_Y);
        title.style.transform = `translateY(${previewY * 0.34}px)`;
        title.classList.toggle('workspace-title-swipe-down-ready', deltaY >= SWIPE_COMMIT_Y);
        title.classList.remove('workspace-title-swipe-ready');
      } else {
        title.style.transform = '';
        title.classList.remove('workspace-title-swipe-ready');
        title.classList.remove('workspace-title-swipe-left-ready');
        title.classList.remove('workspace-title-swipe-down-ready');
      }
    });

    const endSwipe = event => {
      if (!tracking || event.pointerId !== pointerId) return;
      tracking = false;

      const deltaX = event.clientX - startX;
      const deltaY = event.clientY - startY;
      if (swiping && leftPanelTab === 'combo' && swipeDirection === 'horizontal' && deltaX <= -SWIPE_COMMIT_X) {
        event.preventDefault();
        title.blur();
        title.dataset.suppressClickUntil = String(Date.now() + 500);
        title.style.transform = '';
        title.classList.remove('workspace-title-swipe-ready');
        title.classList.remove('workspace-title-swipe-left-ready');
        title.classList.remove('workspace-title-swipe-down-ready');
        setLeftPanelTab('prompt');
      } else if (swiping && swipeDirection === 'horizontal' && deltaX >= SWIPE_COMMIT_X) {
        event.preventDefault();
        title.blur();
        title.dataset.suppressClickUntil = String(Date.now() + 500);
        title.style.transform = '';
        title.classList.remove('workspace-title-swipe-ready');
        title.classList.remove('workspace-title-swipe-left-ready');
        title.classList.remove('workspace-title-swipe-down-ready');
        if (leftPanelTab === 'combo') {
          toggleCustomComboTab();
        } else {
          openCustomComboTab();
        }
      } else if (swiping && (leftPanelTab === 'combo' || leftPanelTab === 'prompt') && swipeDirection === 'vertical' && deltaY >= SWIPE_COMMIT_Y) {
        event.preventDefault();
        title.blur();
        title.dataset.suppressClickUntil = String(Date.now() + 500);
        title.style.transform = '';
        title.classList.remove('workspace-title-swipe-ready');
        title.classList.remove('workspace-title-swipe-left-ready');
        title.classList.remove('workspace-title-swipe-down-ready');
        if (leftPanelTab === 'combo') {
          toggleComposedEditOnlyView();
        } else {
          triggerPromptCoreSubCategorySwipe();
        }
      } else if (swiping && swipeDirection === 'horizontal' && deltaX > 0) {
        title.style.transform = '';
        title.classList.remove('workspace-title-swipe-ready');
        title.classList.remove('workspace-title-swipe-left-ready');
        title.classList.remove('workspace-title-swipe-down-ready');
        title.classList.remove('workspace-title-swipe-miss');
        void title.offsetWidth;
        title.classList.add('workspace-title-swipe-miss');
      } else {
        title.style.transform = '';
        title.classList.remove('workspace-title-swipe-ready');
        title.classList.remove('workspace-title-swipe-down-ready');
      }
      swipeDirection = null;
      pointerId = null;
    };

    title.addEventListener('pointerup', endSwipe);
    title.addEventListener('pointercancel', endSwipe);
    title.addEventListener('click', event => {
      if (Date.now() < Number(title.dataset.suppressClickUntil || 0)) {
        event.preventDefault();
        event.stopPropagation();
      }
    }, true);
  }

  function toggleCustomComboTab() {
    if (leftPanelTab === 'combo') {
      setLeftPanelTab('combo');
    }
  }

  function openCustomComboTab() {
    if (leftPanelTab !== 'combo') {
      setLeftPanelTab('combo');
    }
    if (isCustomComboTabOpen) return;
    isCustomComboTabOpen = true;
    clearCoreRandomVisualState();
    render();
  }

  function toggleComposedEditOnlyView() {
    isComposedEditOnlyView = !isComposedEditOnlyView;
    activeCategoryComposed = null;
    activeComposedPreviewId = null;
    render();
  }

  function triggerPromptCoreSubCategorySwipe() {
    const coreSelection = findCoreSubCategorySelection();
    if (!coreSelection) return;
    openCoreSubCategory(coreSelection.mainCategory, coreSelection.subCategory);
  }

  function openAddPromptModal() {
    const modal = document.getElementById('add-prompt-modal');
    modal.classList.add('open');
    resetPromptFormToAdd();
    renderCategorySelectors();
    syncAddFormSelection();
    setPromptImageEditOrientation('landscape');
    clearPendingPromptImage({ all: true });
    document.getElementById('input-content').focus();
  }

  function closeAddPromptModal() {
    const modal = document.getElementById('add-prompt-modal');
    modal.classList.remove('open');
    clearPendingPromptImage({ all: true });
    resetPromptFormToAdd();
    editingPromptImageData = '';
    editingPromptPortraitImageData = '';
  }

  function handleAddPromptModalBackdrop(e) {
    if (e.target.id === 'add-prompt-modal') {
      closeAddPromptModal();
    }
  }

  function openSaveComposedModal() {
    editingComposedPromptId = null;
    editingComposedImageId = '';
    editingComposedImageData = '';
    editingComposedPortraitImageId = '';
    editingComposedPortraitImageData = '';
    editingComposedBeforeImageId = '';
    editingComposedBeforeImageData = '';
    editingComposedBeforePortraitImageId = '';
    editingComposedBeforePortraitImageData = '';
    removedComposedImages = { landscape: { after: false, before: false }, portrait: { after: false, before: false } };
    renderSaveComposedModalMode();
    renderComposedCategorySelectors();
    setComposedImageEditStage('after');
    setComposedImageEditOrientation('landscape');
    clearPendingComposedImage({ all: true });
    const modal = document.getElementById('save-composed-modal');
    modal.classList.add('open');
    renderComposedModalItemEditor();
    document.getElementById('combo-main-category').focus();
  }

  function openSaveCustomComboModal() {
    if (selectedCustomCombo.length === 0) {
      showToast('저장할 커스텀 조합이 없습니다');
      return;
    }
    editingCustomComboId = null;
    const nameInput = document.getElementById('custom-combo-name');
    if (nameInput) nameInput.value = '';
    const title = document.getElementById('save-custom-combo-title');
    const submitButton = document.querySelector('#save-custom-combo-modal .modal-actions .btn-primary');
    if (title) title.textContent = '커스텀 콤보 저장';
    if (submitButton) submitButton.textContent = '저장';
    setCustomComboImagePosition('start');
    pendingCustomComboImages = { landscape: null, portrait: null };
    removedCustomComboImages = { landscape: false, portrait: false };
    pendingCustomComboItemImages = {};
    const imageFileInput = document.getElementById('custom-combo-image-file');
    if (imageFileInput) imageFileInput.value = '';
    renderCustomComboCompositionImageList(selectedCustomCombo.map(item => item.id));
    setCustomComboImageEditOrientation('portrait');
    document.getElementById('save-custom-combo-modal')?.classList.add('open');
    nameInput?.focus();
  }

  function openEditCustomComboModal(customCombo) {
    if (!customCombo?.id) return;
    editingCustomComboId = customCombo.id;
    const nameInput = document.getElementById('custom-combo-name');
    if (nameInput) nameInput.value = customCombo.subCategory || '';
    const title = document.getElementById('save-custom-combo-title');
    const submitButton = document.querySelector('#save-custom-combo-modal .modal-actions .btn-primary');
    if (title) title.textContent = '커스텀 콤보 편집';
    if (submitButton) submitButton.textContent = '수정 저장';
    setCustomComboImagePosition(customCombo.comboImagePosition || 'start');
    removedCustomComboImages = { landscape: false, portrait: false };
    pendingCustomComboItemImages = Object.fromEntries(
      Object.entries(customCombo.itemImages || {}).map(([itemId, image]) => [itemId, { ...image, file: null }])
    );
    const imageFileInput = document.getElementById('custom-combo-image-file');
    if (imageFileInput) imageFileInput.value = '';
    renderCustomComboCompositionImageList(customCombo.items || []);
    pendingCustomComboImages = {
      landscape: customCombo.imageData ? { dataUrl: customCombo.imageData, fileName: customCombo.imageName || '', mimeType: '', file: null } : null,
      portrait: customCombo.portraitImageData ? { dataUrl: customCombo.portraitImageData, fileName: customCombo.portraitImageName || '', mimeType: '', file: null } : null,
    };
    Promise.all([
      !pendingCustomComboImages.landscape && customCombo.imageId ? getPromptImageObjectUrl(customCombo.imageId) : Promise.resolve(''),
      !pendingCustomComboImages.portrait && customCombo.portraitImageId ? getPromptImageObjectUrl(customCombo.portraitImageId) : Promise.resolve(''),
    ]).then(([landscapeUrl, portraitUrl]) => {
      if (editingCustomComboId !== customCombo.id) return;
      if (landscapeUrl) pendingCustomComboImages.landscape = { dataUrl: landscapeUrl, fileName: customCombo.imageName || '', mimeType: '', file: null };
      if (portraitUrl) pendingCustomComboImages.portrait = { dataUrl: portraitUrl, fileName: customCombo.portraitImageName || '', mimeType: '', file: null };
      renderPendingCustomComboImagePreview();
    });
    setCustomComboImageEditOrientation('portrait');
    document.getElementById('save-custom-combo-modal')?.classList.add('open');
    nameInput?.focus();
  }

  function setCustomComboImagePosition(position) {
    const normalizedPosition = position === 'end' ? 'end' : 'start';
    document.querySelectorAll('input[name="custom-combo-image-position"]').forEach(input => {
      input.checked = input.value === normalizedPosition;
    });
  }

  function getCustomComboImagePosition() {
    return document.querySelector('input[name="custom-combo-image-position"]:checked')?.value === 'end'
      ? 'end'
      : 'start';
  }

  function closeSaveCustomComboModal() {
    document.getElementById('save-custom-combo-modal')?.classList.remove('open');
    editingCustomComboId = null;
    pendingCustomComboImages = { landscape: null, portrait: null };
    pendingCustomComboItemImages = {};
  }

  function handleSaveCustomComboModalBackdrop(event) {
    if (event.target.id === 'save-custom-combo-modal') {
      closeSaveCustomComboModal();
    }
  }

  function setCustomComboImageEditOrientation(orientation) {
    customComboImageEditOrientation = normalizeImageOrientation(orientation);
    renderPendingCustomComboImagePreview();
  }

  function renderPendingCustomComboImagePreview() {
    const preview = document.getElementById('custom-combo-image-preview');
    const nameInput = document.getElementById('custom-combo-image-name');
    const meta = document.getElementById('custom-combo-image-meta');
    const landscapeButton = document.getElementById('custom-combo-image-tab-landscape');
    const portraitButton = document.getElementById('custom-combo-image-tab-portrait');
    if (!preview || !nameInput || !meta) return;
    const name = document.getElementById('custom-combo-name')?.value.trim() || '커스텀 콤보';
    const orientation = customComboImageEditOrientation;
    const imageName = buildComposedImageName('콤보', name, '');
    const pendingImage = pendingCustomComboImages[orientation];
    nameInput.value = imageName;
    preview.classList.toggle('orientation-portrait', orientation === 'portrait');
    preview.style.setProperty('--preview-aspect-ratio', orientation === 'portrait' ? '3 / 4' : '4 / 3');
    landscapeButton?.classList.toggle('active', orientation === 'landscape');
    portraitButton?.classList.toggle('active', orientation === 'portrait');
    if (pendingImage?.dataUrl) {
      preview.innerHTML = `<img src="${pendingImage.dataUrl}" alt="${esc(imageName)}" /><button class="prompt-image-remove-btn" type="button" onclick="removePendingCustomComboImage()" title="이 방향 이미지 삭제" aria-label="이 방향 이미지 삭제">삭제</button>`;
      meta.textContent = `${getImageOrientationLabel(orientation)} 이미지 편집 중 · ${imageName}`;
    } else {
      preview.innerHTML = '<span class="empty-state" style="padding:0">선택한 커스텀 콤보 이미지가 여기에 표시됩니다.</span>';
      meta.textContent = `${getImageOrientationLabel(orientation)} 이미지가 비어 있습니다. ${imageName} 이름으로 저장됩니다.`;
    }
  }

  function setPendingCustomComboImage(file, dataUrl) {
    const orientation = customComboImageEditOrientation;
    pendingCustomComboImages[orientation] = file && dataUrl ? {
      dataUrl,
      fileName: file.name || '',
      mimeType: file.type || '',
      file,
    } : null;
    removedCustomComboImages[orientation] = false;
    renderPendingCustomComboImagePreview();
  }

  function removePendingCustomComboImage() {
    const orientation = normalizeImageOrientation(customComboImageEditOrientation);
    pendingCustomComboImages[orientation] = null;
    removedCustomComboImages[orientation] = true;
    const fileInput = document.getElementById('custom-combo-image-file');
    if (fileInput) fileInput.value = '';
    renderPendingCustomComboImagePreview();
  }

  function clearPendingCustomComboImage() {
    pendingCustomComboImages[customComboImageEditOrientation] = null;
    const fileInput = document.getElementById('custom-combo-image-file');
    if (fileInput) fileInput.value = '';
    renderPendingCustomComboImagePreview();
  }

  function renderCustomComboCompositionImageList(itemIds) {
    const list = document.getElementById('custom-combo-modal-composition-list');
    if (!list) return;
    list.innerHTML = '';
    const uniqueIds = uniqueInOrder(Array.isArray(itemIds) ? itemIds.filter(Boolean) : []);
    if (uniqueIds.length === 0) {
      list.innerHTML = '<span class="empty-state">선택된 커스텀 조합이 없습니다.</span>';
      return;
    }

    uniqueIds.forEach((itemId) => {
      const composed = composedPrompts.find(item => item.id === itemId);
      if (!composed) return;
      const override = pendingCustomComboItemImages[itemId];
      const imageSource = getPromptImageSource(override) || getPromptImageSource(composed);
      queuePromptImageLoad(override ? { ...override, id: itemId } : composed);
      const row = document.createElement('div');
      row.className = 'custom-combo-modal-composition-row';
      row.innerHTML = `
        <div class="custom-combo-modal-composition-preview">
          ${imageSource
            ? `<img src="${imageSource}" alt="${esc(composed.subCategory || '커스텀 조합')}" />`
            : '<span class="empty-state">이미지 없음</span>'}
        </div>
        <div class="custom-combo-modal-composition-info">
          <span>${esc(composed.subCategory || '이름없는 커스텀 조합')}</span>
          <input type="file" accept="image/*" data-custom-combo-item-image="${esc(itemId)}" />
        </div>
      `;
      const input = row.querySelector('[data-custom-combo-item-image]');
      if (override) {
        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'prompt-image-remove-btn custom-combo-item-image-remove-btn';
        removeButton.textContent = '저장 이미지 삭제';
        removeButton.addEventListener('click', () => {
          delete pendingCustomComboItemImages[itemId];
          renderCustomComboCompositionImageList(uniqueIds);
        });
        input?.insertAdjacentElement('afterend', removeButton);
      }
      input?.addEventListener('change', async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
          pendingCustomComboItemImages[itemId] = {
            imageId: pendingCustomComboItemImages[itemId]?.imageId || '',
            dataUrl: await readFileAsDataUrl(file),
            file,
            fileName: file.name || '',
            mimeType: file.type || '',
          };
          renderCustomComboCompositionImageList(uniqueIds);
        } catch {
          showToast('이미지를 읽지 못했습니다');
        }
      });
      list.appendChild(row);
    });
  }

  function closeSaveComposedModal() {
    const modal = document.getElementById('save-composed-modal');
    modal.classList.remove('open');
    editingComposedPromptId = null;
    editingComposedImageId = '';
    editingComposedImageData = '';
    editingComposedPortraitImageId = '';
    editingComposedPortraitImageData = '';
    editingComposedBeforeImageId = '';
    editingComposedBeforeImageData = '';
    editingComposedBeforePortraitImageId = '';
    editingComposedBeforePortraitImageData = '';
    clearPendingComposedImage({ all: true });
    renderSaveComposedModalMode();
  }

  function renderSaveComposedModalMode() {
    const title = document.getElementById('save-composed-title');
    const submitBtn = document.querySelector('#save-composed-modal .modal-actions .btn-primary');
    const isEditMode = !!editingComposedPromptId;
    if (title) {
      title.textContent = isEditMode ? '조합 편집' : '조합 저장';
    }
    if (submitBtn) {
      submitBtn.textContent = isEditMode ? '수정 저장' : '저장';
    }
  }

  async function openEditComposedPromptModal(id, e) {
    if (e) e.stopPropagation();
    const target = composedPrompts.find(item => item.id === id);
    if (!target) {
      showToast('편집할 조합을 찾지 못했습니다');
      return;
    }

    clearOutputOverride();
    selected = (Array.isArray(target.items) ? target.items : [])
      .map(entry => ({ ...normalizeSelected(entry), source: 'prompt' }))
      .filter(entry => entry && entry.content);
    render();

    editingComposedPromptId = id;
    renderSaveComposedModalMode();
    renderComposedCategorySelectors();

    const mainSelect = document.getElementById('combo-main-category');
    const subSelect = document.getElementById('combo-sub-category');
    if (mainSelect) {
      if (![...mainSelect.options].some(opt => opt.value === target.mainCategory)) {
        appendSelectOption(mainSelect, target.mainCategory, target.mainCategory);
      }
      mainSelect.value = target.mainCategory || '';
    }

    renderComposedSubCategorySelect();

    if (subSelect) {
      if (![...subSelect.options].some(opt => opt.value === target.subCategory)) {
        appendSelectOption(subSelect, target.subCategory, target.subCategory);
      }
      subSelect.value = target.subCategory || '';
    }

    editingComposedImageId = target.imageId || '';
    editingComposedImageData = target.imageData || '';
    editingComposedPortraitImageId = target.portraitImageId || '';
    editingComposedPortraitImageData = target.portraitImageData || '';
    editingComposedBeforeImageId = target.beforeImageId || '';
    editingComposedBeforeImageData = target.beforeImageData || '';
    editingComposedBeforePortraitImageId = target.beforePortraitImageId || '';
    editingComposedBeforePortraitImageData = target.beforePortraitImageData || '';
    removedComposedImages = { landscape: { after: false, before: false }, portrait: { after: false, before: false } };

    const [landscapeUrl, portraitUrl, beforeLandscapeUrl, beforePortraitUrl] = await Promise.all([
      (!editingComposedImageData && target.imageId)
        ? getPromptImageObjectUrl(target.imageId)
        : Promise.resolve(''),
      (!editingComposedPortraitImageData && target.portraitImageId)
        ? getPromptImageObjectUrl(target.portraitImageId)
        : Promise.resolve(''),
      (!editingComposedBeforeImageData && target.beforeImageId)
        ? getPromptImageObjectUrl(target.beforeImageId)
        : Promise.resolve(''),
      (!editingComposedBeforePortraitImageData && target.beforePortraitImageId)
        ? getPromptImageObjectUrl(target.beforePortraitImageId)
        : Promise.resolve(''),
    ]);

    const landscapeDataUrl = editingComposedImageData || landscapeUrl || '';
    const portraitDataUrl = editingComposedPortraitImageData || portraitUrl || '';
    const beforeLandscapeDataUrl = editingComposedBeforeImageData || beforeLandscapeUrl || '';
    const beforePortraitDataUrl = editingComposedBeforePortraitImageData || beforePortraitUrl || '';

    pendingComposedImages = {
      landscape: {
        after: landscapeDataUrl ? {
          dataUrl: landscapeDataUrl,
          fileName: target.imageName || '',
          mimeType: '',
          file: null,
          imageName: target.imageName || buildComposedImageName(target.mainCategory, target.subCategory, getComposedItemText(target)),
        } : null,
        before: beforeLandscapeDataUrl ? {
          dataUrl: beforeLandscapeDataUrl,
          fileName: target.beforeImageName || '',
          mimeType: '',
          file: null,
          imageName: target.beforeImageName || buildComposedImageName(target.mainCategory, target.subCategory, getComposedItemText(target)),
        } : null,
      },
      portrait: {
        after: portraitDataUrl ? {
          dataUrl: portraitDataUrl,
          fileName: target.portraitImageName || '',
          mimeType: '',
          file: null,
          imageName: target.portraitImageName || buildComposedImageName(target.mainCategory, target.subCategory, getComposedItemText(target)),
        } : null,
        before: beforePortraitDataUrl ? {
          dataUrl: beforePortraitDataUrl,
          fileName: target.beforePortraitImageName || '',
          mimeType: '',
          file: null,
          imageName: target.beforePortraitImageName || buildComposedImageName(target.mainCategory, target.subCategory, getComposedItemText(target)),
        } : null,
      },
    };
    setComposedImageEditStage('after');
    setComposedImageEditOrientation('landscape');
    renderPendingComposedImagePreview();

    const modal = document.getElementById('save-composed-modal');
    modal.classList.add('open');
    renderComposedModalItemEditor();
    if (subSelect) subSelect.focus();
  }

  function handleSaveComposedModalBackdrop(e) {
    if (e.target.id === 'save-composed-modal') {
      closeSaveComposedModal();
    }
  }

  function selectCategory(value) {
    const select = document.getElementById('input-main-category');
    select.value = value;
    activeCategoryPrompt = value;
    activeSubCategoryPrompt = null;
    renderSubCategorySelect();
  }

  function selectSubCategory(value) {
    const select = document.getElementById('input-sub-category');
    select.value = value;
    activeSubCategoryPrompt = value;
  }

  // ── Actions ──
