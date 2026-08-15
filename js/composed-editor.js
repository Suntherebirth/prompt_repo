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

  function setLeftPanelTab(tab) {
    const previousTab = leftPanelTab;
    leftPanelTab = tab === 'combo' ? 'combo' : 'prompt';
    if (previousTab !== leftPanelTab) {
      clearPromptDescriptionPreview({ feedback: true });
    }
    const isPromptTab = leftPanelTab === 'prompt';
    if (isPromptTab && shouldAutoSelectCoreSubCategoryOnPromptTab) {
      shouldAutoSelectCoreSubCategoryOnPromptTab = false;
      applyCoreSubCategorySelection();
    }
    document.getElementById('panel-view-prompt').classList.toggle('active', isPromptTab);
    document.getElementById('panel-view-combo').classList.toggle('active', !isPromptTab);
    document.getElementById('mode-btn-prompt').classList.toggle('active', isPromptTab);
    document.getElementById('mode-btn-combo').classList.toggle('active', !isPromptTab);
    localStorage.setItem(LEFT_PANEL_TAB_KEY, leftPanelTab);
    render();
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
    renderSaveComposedModalMode();
    renderComposedCategorySelectors();
    setComposedImageEditOrientation('landscape');
    clearPendingComposedImage({ all: true });
    const modal = document.getElementById('save-composed-modal');
    modal.classList.add('open');
    renderComposedModalItemEditor();
    document.getElementById('combo-main-category').focus();
  }

  function closeSaveComposedModal() {
    const modal = document.getElementById('save-composed-modal');
    modal.classList.remove('open');
    editingComposedPromptId = null;
    editingComposedImageId = '';
    editingComposedImageData = '';
    editingComposedPortraitImageId = '';
    editingComposedPortraitImageData = '';
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

    const [landscapeUrl, portraitUrl] = await Promise.all([
      (!editingComposedImageData && target.imageId)
        ? getPromptImageObjectUrl(target.imageId)
        : Promise.resolve(''),
      (!editingComposedPortraitImageData && target.portraitImageId)
        ? getPromptImageObjectUrl(target.portraitImageId)
        : Promise.resolve(''),
    ]);

    const landscapeDataUrl = editingComposedImageData || landscapeUrl || '';
    const portraitDataUrl = editingComposedPortraitImageData || portraitUrl || '';

    pendingComposedImages = {
      landscape: landscapeDataUrl ? {
        dataUrl: landscapeDataUrl,
        fileName: target.imageName || '',
        mimeType: '',
        file: null,
        imageName: target.imageName || buildComposedImageName(target.mainCategory, target.subCategory, getComposedItemText(target)),
      } : null,
      portrait: portraitDataUrl ? {
        dataUrl: portraitDataUrl,
        fileName: target.portraitImageName || '',
        mimeType: '',
        file: null,
        imageName: target.portraitImageName || buildComposedImageName(target.mainCategory, target.subCategory, getComposedItemText(target)),
      } : null,
    };
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
