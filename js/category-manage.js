  function getCategories() {
    return [...new Set([...prompts, ...composedPrompts].map(p => p.category).filter(Boolean))].sort();
  }

  function getMainCategories() {
    ensureCategoryConfigConsistency();
    return [...categoryConfig.mainOrder];
  }

  function getSubCategories(mainCategory) {
    if (!mainCategory) return [];
    ensureCategoryConfigConsistency();
    const mainConfig = getMainCategoryConfig(mainCategory);
    return uniqueInOrder(mainConfig.subOrder || []);
  }

  function setMainCategoryHidden(mainCategory, hiddenByDefault) {
    if (!mainCategory) return;
    const mainConfig = ensureMainCategoryConfig(mainCategory);
    mainConfig.hiddenByDefault = !!hiddenByDefault;
    hiddenMainCategories = new Set(
      getMainCategories().filter(category => getMainCategoryConfig(category).hiddenByDefault)
    );
  }

  function setMainCategoryEmoji(mainCategory, emoji) {
    if (!mainCategory) return;
    const mainConfig = ensureMainCategoryConfig(mainCategory);
    mainConfig.emoji = String(emoji || '').trim();
    save();
    render();
  }

  function moveArrayItem(items, fromIndex, toIndex) {
    if (!Array.isArray(items)) return;
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= items.length || toIndex >= items.length || fromIndex === toIndex) return;
    const [moved] = items.splice(fromIndex, 1);
    items.splice(toIndex, 0, moved);
  }

  function moveMainCategory(mainCategory, direction) {
    const order = categoryConfig.mainOrder;
    const index = order.indexOf(mainCategory);
    if (index < 0) return;
    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    moveArrayItem(order, index, nextIndex);
    save();
    render();
    renderCategoryManageList();
  }

  function moveSubCategory(mainCategory, subCategory, direction) {
    const mainConfig = ensureMainCategoryConfig(mainCategory);
    const order = mainConfig.subOrder || [];
    const index = order.indexOf(subCategory);
    if (index < 0) return;
    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    moveArrayItem(order, index, nextIndex);
    mainConfig.subOrder = order;
    save();
    render();
    renderCategoryManageList();
  }

  function renameMainCategory(mainCategory) {
    if (!mainCategory) return;
    const nextValue = prompt('새 대분류 이름을 입력하세요', mainCategory);
    if (!nextValue) return;
    const nextMainCategory = nextValue.trim();
    if (!nextMainCategory) {
      showToast('대분류 이름이 비어 있습니다');
      return;
    }
    if (nextMainCategory === mainCategory) return;
    if (getMainCategories().includes(nextMainCategory)) {
      showToast('이미 존재하는 대분류 이름입니다');
      return;
    }

    prompts = prompts.map(promptItem => {
      if (promptItem.mainCategory !== mainCategory) return promptItem;
      return { ...promptItem, mainCategory: nextMainCategory };
    });

    selected = selected.map(item => {
      if (item.mainCategory !== mainCategory) return item;
      return { ...item, mainCategory: nextMainCategory };
    });

    const prevConfig = getMainCategoryConfig(mainCategory);
    delete categoryConfig.mains[mainCategory];
    categoryConfig.mains[nextMainCategory] = {
      hiddenByDefault: !!prevConfig.hiddenByDefault,
      emoji: prevConfig.emoji || '',
      subOrder: uniqueInOrder(Array.isArray(prevConfig.subOrder) ? prevConfig.subOrder : []),
      subSettings: Object.fromEntries(
        Object.entries(prevConfig.subSettings || {}).map(([subKey, subValue]) => [subKey, { ...(subValue || {}) }])
      ),
    };
    categoryConfig.mainOrder = categoryConfig.mainOrder.map(category => category === mainCategory ? nextMainCategory : category);

    if (activeCategoryPrompt === mainCategory) activeCategoryPrompt = nextMainCategory;
    if (hiddenMainCategories.has(mainCategory)) {
      hiddenMainCategories.delete(mainCategory);
      hiddenMainCategories.add(nextMainCategory);
    }
    if (openedHiddenMainCategories.has(mainCategory)) {
      openedHiddenMainCategories.delete(mainCategory);
      openedHiddenMainCategories.add(nextMainCategory);
    }

    ensureCategoryConfigConsistency();
    save();
    render();
    renderCategoryManageList();
    showToast('대분류 이름이 변경되었습니다');
  }

  function deleteMainCategory(mainCategory) {
    if (!mainCategory) return;
    const count = prompts.filter(promptItem => promptItem.mainCategory === mainCategory).length;
    if (!confirm(`대분류 "${mainCategory}"를 삭제하면 해당 프롬프트 ${count}개가 함께 삭제됩니다. 계속하시겠습니까?`)) {
      return;
    }

    const deletedPromptIds = new Set(
      prompts.filter(promptItem => promptItem.mainCategory === mainCategory).map(promptItem => promptItem.id)
    );
    prompts = prompts.filter(promptItem => promptItem.mainCategory !== mainCategory);
    selected = selected.filter(item => !deletedPromptIds.has(item.id));

    categoryConfig.mainOrder = categoryConfig.mainOrder.filter(category => category !== mainCategory);
    delete categoryConfig.mains[mainCategory];
    hiddenMainCategories.delete(mainCategory);
    openedHiddenMainCategories.delete(mainCategory);

    if (activeCategoryPrompt === mainCategory) {
      activeCategoryPrompt = null;
      activeSubCategoryPrompt = null;
    }
    if (activePromptPreviewId && deletedPromptIds.has(activePromptPreviewId)) {
      activePromptPreviewId = null;
    }

    ensureCategoryConfigConsistency();
    save();
    render();
    renderCategoryManageList();
    showToast('대분류가 삭제되었습니다');
  }

  function renameSubCategory(mainCategory, subCategory) {
    if (!mainCategory || !subCategory) return;
    const nextValue = prompt('새 중분류 이름을 입력하세요', subCategory);
    if (!nextValue) return;
    const nextSubCategory = nextValue.trim();
    if (!nextSubCategory) {
      showToast('중분류 이름이 비어 있습니다');
      return;
    }
    if (nextSubCategory === subCategory) return;

    const sameMainSubs = getSubCategories(mainCategory);
    if (sameMainSubs.includes(nextSubCategory)) {
      showToast('이미 존재하는 중분류 이름입니다');
      return;
    }

    prompts = prompts.map(promptItem => {
      if (promptItem.mainCategory !== mainCategory || promptItem.subCategory !== subCategory) return promptItem;
      return { ...promptItem, subCategory: nextSubCategory };
    });

    selected = selected.map(item => {
      if (item.mainCategory !== mainCategory || item.subCategory !== subCategory) return item;
      return { ...item, subCategory: nextSubCategory };
    });

    const mainConfig = ensureMainCategoryConfig(mainCategory);
    mainConfig.subOrder = (mainConfig.subOrder || []).map(value => value === subCategory ? nextSubCategory : value);
    if (mainConfig.subSettings?.[subCategory]) {
      mainConfig.subSettings[nextSubCategory] = { ...mainConfig.subSettings[subCategory] };
      delete mainConfig.subSettings[subCategory];
    }

    if (activeCategoryPrompt === mainCategory && activeSubCategoryPrompt === subCategory) {
      activeSubCategoryPrompt = nextSubCategory;
    }

    ensureCategoryConfigConsistency();
    save();
    render();
    renderCategoryManageList();
    showToast('중분류 이름이 변경되었습니다');
  }

  function moveSubCategoryToMain(mainCategory, subCategory, nextMainCategory) {
    if (!mainCategory || !subCategory) return;

    if (!nextMainCategory || nextMainCategory === mainCategory) return;
    if (!getMainCategories().includes(nextMainCategory)) {
      showToast('존재하는 대분류를 입력해 주세요');
      return;
    }
    if (getSubCategories(nextMainCategory).includes(subCategory)) {
      showToast(`"${nextMainCategory}"에 이미 같은 이름의 중분류가 있습니다`);
      return;
    }

    const sourceConfig = ensureMainCategoryConfig(mainCategory);
    const targetConfig = ensureMainCategoryConfig(nextMainCategory);
    const subSettings = sourceConfig.subSettings?.[subCategory];

    prompts = prompts.map(promptItem => {
      if (promptItem.mainCategory !== mainCategory || promptItem.subCategory !== subCategory) return promptItem;
      return { ...promptItem, mainCategory: nextMainCategory };
    });

    selected = selected.map(item => {
      if (item.mainCategory !== mainCategory || item.subCategory !== subCategory) return item;
      return { ...item, mainCategory: nextMainCategory };
    });

    sourceConfig.subOrder = (sourceConfig.subOrder || []).filter(value => value !== subCategory);
    targetConfig.subOrder = uniqueInOrder([...(targetConfig.subOrder || []), subCategory]);
    if (subSettings) {
      targetConfig.subSettings[subCategory] = { ...subSettings };
      delete sourceConfig.subSettings[subCategory];
    }

    const sourceTagLayoutKey = getPromptTagLayoutKey(mainCategory, subCategory);
    const targetTagLayoutKey = getPromptTagLayoutKey(nextMainCategory, subCategory);
    if (promptTagLayouts[sourceTagLayoutKey]) {
      promptTagLayouts[targetTagLayoutKey] = promptTagLayouts[sourceTagLayoutKey];
      delete promptTagLayouts[sourceTagLayoutKey];
    }

    if (activeCategoryPrompt === mainCategory && activeSubCategoryPrompt === subCategory) {
      activeCategoryPrompt = nextMainCategory;
    }

    ensureCategoryConfigConsistency();
    save();
    render();
    renderCategoryManageList();
    showToast(`중분류 "${subCategory}"를 "${nextMainCategory}"로 이동했습니다`);
  }

  function deleteSubCategory(mainCategory, subCategory) {
    if (!mainCategory || !subCategory) return;
    const count = prompts.filter(promptItem => promptItem.mainCategory === mainCategory && promptItem.subCategory === subCategory).length;
    if (!confirm(`중분류 "${subCategory}"를 삭제하면 해당 프롬프트 ${count}개가 함께 삭제됩니다. 계속하시겠습니까?`)) {
      return;
    }

    const deletedPromptIds = new Set(
      prompts
        .filter(promptItem => promptItem.mainCategory === mainCategory && promptItem.subCategory === subCategory)
        .map(promptItem => promptItem.id)
    );
    prompts = prompts.filter(promptItem => !(promptItem.mainCategory === mainCategory && promptItem.subCategory === subCategory));
    selected = selected.filter(item => !deletedPromptIds.has(item.id));

    const mainConfig = ensureMainCategoryConfig(mainCategory);
    mainConfig.subOrder = (mainConfig.subOrder || []).filter(value => value !== subCategory);
    if (mainConfig.subSettings) {
      delete mainConfig.subSettings[subCategory];
    }

    if (activeCategoryPrompt === mainCategory && activeSubCategoryPrompt === subCategory) {
      activeSubCategoryPrompt = null;
    }
    if (activePromptPreviewId && deletedPromptIds.has(activePromptPreviewId)) {
      activePromptPreviewId = null;
    }

    ensureCategoryConfigConsistency();
    save();
    render();
    renderCategoryManageList();
    showToast('중분류가 삭제되었습니다');
  }

  function getComposedMainCategoryOrder() {
    ensureComposedCategoryConfigConsistency();
    return uniqueInOrder(composedPrompts.map(item => item.mainCategory).filter(Boolean));
  }

  function getComposedSubCategoryOrder(mainCategory) {
    if (!mainCategory) return [];
    return uniqueInOrder(
      composedPrompts
        .filter(item => item.mainCategory === mainCategory)
        .map(item => item.subCategory)
        .filter(Boolean)
    );
  }

  function getComposedEditOnlyMainCategories() {
    return getComposedMainCategoryOrder().filter(mainCategory => getComposedMainCategoryConfig(mainCategory).editOnly);
  }

  function getStandardComposedCategories() {
    return getComposedMainCategoryOrder().filter(mainCategory => !getComposedMainCategoryConfig(mainCategory).editOnly);
  }

  function setComposedMainCategoryEditOnly(mainCategory, editOnly) {
    if (!mainCategory) return;
    const mainConfig = ensureComposedMainCategoryConfig(mainCategory);
    mainConfig.editOnly = !!editOnly;
    if (mainConfig.editOnly && activeCategoryComposed === mainCategory) {
      activeCategoryComposed = null;
    }
    ensureComposedCategoryConfigConsistency();
  }

  function setComposedMainCategoryEmoji(mainCategory, emoji) {
    if (!mainCategory) return;
    const mainConfig = ensureComposedMainCategoryConfig(mainCategory);
    mainConfig.emoji = String(emoji || '').trim();
    save();
    render();
  }

  function moveComposedMainCategory(mainCategory, direction) {
    const order = getComposedMainCategoryOrder();
    const index = order.indexOf(mainCategory);
    if (index < 0) return;
    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= order.length) return;
    moveArrayItem(order, index, nextIndex);

    const grouped = new Map();
    composedPrompts.forEach((item) => {
      const key = item.mainCategory;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(item);
    });

    composedPrompts = order.flatMap(category => grouped.get(category) || []);
    ensureComposedCategoryConfigConsistency();
    save();
    render();
    renderCategoryManageList();
  }

  function moveComposedSubCategory(mainCategory, subCategory, direction) {
    if (!mainCategory || !subCategory) return;
    const subOrder = getComposedSubCategoryOrder(mainCategory);
    const index = subOrder.indexOf(subCategory);
    if (index < 0) return;
    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= subOrder.length) return;
    moveArrayItem(subOrder, index, nextIndex);

    const rank = new Map(subOrder.map((value, idx) => [value, idx]));
    const targetItems = composedPrompts
      .filter(item => item.mainCategory === mainCategory)
      .map((item, idx) => ({ item, idx }))
      .sort((a, b) => {
        const aRank = rank.has(a.item.subCategory) ? rank.get(a.item.subCategory) : Number.MAX_SAFE_INTEGER;
        const bRank = rank.has(b.item.subCategory) ? rank.get(b.item.subCategory) : Number.MAX_SAFE_INTEGER;
        if (aRank !== bRank) return aRank - bRank;
        return a.idx - b.idx;
      })
      .map(entry => entry.item);

    let pointer = 0;
    composedPrompts = composedPrompts.map(item => {
      if (item.mainCategory !== mainCategory) return item;
      const nextItem = targetItems[pointer];
      pointer += 1;
      return nextItem || item;
    });

    save();
    render();
    renderCategoryManageList();
  }

  function renameComposedMainCategory(mainCategory) {
    if (!mainCategory) return;
    const nextValue = prompt('새 커스텀 대분류 이름을 입력하세요', mainCategory);
    if (!nextValue) return;
    const nextMainCategory = nextValue.trim();
    if (!nextMainCategory) {
      showToast('대분류 이름이 비어 있습니다');
      return;
    }
    if (nextMainCategory === mainCategory) return;
    if (getComposedMainCategoryOrder().includes(nextMainCategory)) {
      showToast('이미 존재하는 커스텀 대분류 이름입니다');
      return;
    }

    composedPrompts = composedPrompts.map(item => {
      if (item.mainCategory !== mainCategory) return item;
      return {
        ...item,
        mainCategory: nextMainCategory,
        category: nextMainCategory,
      };
    });

    if (activeCategoryComposed === mainCategory) {
      activeCategoryComposed = nextMainCategory;
    }

    const prevConfig = getComposedMainCategoryConfig(mainCategory);
    delete composedCategoryConfig.mains[mainCategory];
    composedCategoryConfig.mains[nextMainCategory] = {
      editOnly: !!prevConfig.editOnly,
      emoji: prevConfig.emoji || '',
    };

    save();
    render();
    renderCategoryManageList();
    showToast('커스텀 대분류 이름이 변경되었습니다');
  }

  async function deleteComposedMainCategory(mainCategory) {
    if (!mainCategory) return;
    const count = composedPrompts.filter(item => item.mainCategory === mainCategory).length;
    if (!confirm(`커스텀 대분류 "${mainCategory}"를 삭제하면 해당 조합 ${count}개가 함께 삭제됩니다. 계속하시겠습니까?`)) {
      return;
    }

    const removedImageIds = composedPrompts
      .filter(item => item.mainCategory === mainCategory)
      .flatMap(item => [item.imageId, item.portraitImageId])
      .filter(Boolean);

    composedPrompts = composedPrompts.filter(item => item.mainCategory !== mainCategory);
    delete composedCategoryConfig.mains[mainCategory];
    if (activeCategoryComposed === mainCategory) {
      activeCategoryComposed = null;
    }
    if (activeComposedPreviewId && !composedPrompts.some(item => item.id === activeComposedPreviewId)) {
      activeComposedPreviewId = null;
    }

    for (const imageId of removedImageIds) {
      await deleteImageIfOrphaned(imageId);
    }

    ensureComposedCategoryConfigConsistency();
    save();
    render();
    renderCategoryManageList();
    showToast('커스텀 대분류가 삭제되었습니다');
  }

  function renameComposedSubCategory(mainCategory, subCategory) {
    if (!mainCategory || !subCategory) return;
    const nextValue = prompt('새 커스텀 이름(중분류)을 입력하세요', subCategory);
    if (!nextValue) return;
    const nextSubCategory = nextValue.trim();
    if (!nextSubCategory) {
      showToast('중분류 이름이 비어 있습니다');
      return;
    }
    if (nextSubCategory === subCategory) return;

    const sameMainSubs = getComposedSubCategoryOrder(mainCategory);
    if (sameMainSubs.includes(nextSubCategory)) {
      showToast('이미 존재하는 커스텀 이름입니다');
      return;
    }

    composedPrompts = composedPrompts.map(item => {
      if (item.mainCategory !== mainCategory || item.subCategory !== subCategory) return item;
      return { ...item, subCategory: nextSubCategory };
    });

    save();
    render();
    renderCategoryManageList();
    showToast('커스텀 이름이 변경되었습니다');
  }

  async function deleteComposedSubCategory(mainCategory, subCategory) {
    if (!mainCategory || !subCategory) return;
    const count = composedPrompts.filter(item => item.mainCategory === mainCategory && item.subCategory === subCategory).length;
    if (!confirm(`커스텀 이름 "${subCategory}"를 삭제하면 해당 조합 ${count}개가 함께 삭제됩니다. 계속하시겠습니까?`)) {
      return;
    }

    const removedImageIds = composedPrompts
      .filter(item => item.mainCategory === mainCategory && item.subCategory === subCategory)
      .flatMap(item => [item.imageId, item.portraitImageId])
      .filter(Boolean);

    composedPrompts = composedPrompts.filter(item => !(item.mainCategory === mainCategory && item.subCategory === subCategory));
    if (activeComposedPreviewId && !composedPrompts.some(item => item.id === activeComposedPreviewId)) {
      activeComposedPreviewId = null;
    }

    for (const imageId of removedImageIds) {
      await deleteImageIfOrphaned(imageId);
    }

    ensureComposedCategoryConfigConsistency();
    save();
    render();
    renderCategoryManageList();
    showToast('커스텀 이름이 삭제되었습니다');
  }

  function toggleMainCategoryHidden(mainCategory, checked) {
    setMainCategoryHidden(mainCategory, checked);
    save();
    render();
    renderCategoryManageList();
  }

  function toggleSubCategoryCore(mainCategory, subCategory, checked) {
    setSubCategoryCore(mainCategory, subCategory, checked);
    save();
    render();
    renderCategoryManageList();
  }

  function toggleSubCategoryRandomSelection(mainCategory, subCategory, checked) {
    setSubCategoryRandomSelection(mainCategory, subCategory, checked);
    save();
    render();
    renderCategoryManageList();
  }

  function toggleComposedMainCategoryEditOnly(mainCategory, checked) {
    setComposedMainCategoryEditOnly(mainCategory, checked);
    save();
    render();
    renderCategoryManageList();
  }

  function setCategoryManageTab(tab) {
    categoryManageTab = tab === 'combo' ? 'combo' : 'prompt';
    renderCategoryManageTabs();
    renderCategoryManageList();
  }

  function renderCategoryManageTabs() {
    const promptBtn = document.getElementById('category-manage-tab-prompt');
    const comboBtn = document.getElementById('category-manage-tab-combo');
    if (!promptBtn || !comboBtn) return;
    const isPrompt = categoryManageTab === 'prompt';
    promptBtn.classList.toggle('active', isPrompt);
    comboBtn.classList.toggle('active', !isPrompt);
  }

  function openCategoryManageModal() {
    const modal = document.getElementById('category-manage-modal');
    if (!modal) return;
    categoryManageTab = leftPanelTab === 'combo' ? 'combo' : 'prompt';
    renderCategoryManageTabs();
    renderCategoryManageList();
    modal.classList.add('open');
  }

  function closeCategoryManageModal() {
    const modal = document.getElementById('category-manage-modal');
    if (!modal) return;
    modal.classList.remove('open');
  }

  function handleCategoryManageModalBackdrop(e) {
    if (e.target.id === 'category-manage-modal') {
      closeCategoryManageModal();
    }
  }

  function renderCategoryManageList() {
    const list = document.getElementById('category-manage-main-list');
    if (!list) return;

    if (categoryManageTab === 'combo') {
      renderCategoryManageComposedList(list);
      return;
    }

    renderCategoryManagePromptList(list);
  }

  function renderCategoryManagePromptList(list) {
    const mainCategories = getMainCategories();
    list.innerHTML = '';

    if (mainCategories.length === 0) {
      list.innerHTML = '<div class="category-manage-empty">관리할 대분류가 없습니다.</div>';
      return;
    }

    mainCategories.forEach((mainCategory, mainIndex) => {
      const mainConfig = getMainCategoryConfig(mainCategory);
      const mainItem = document.createElement('div');
      mainItem.className = 'category-manage-main-item';

      const top = document.createElement('div');
      top.className = 'category-manage-main-top';

      const mainMeta = document.createElement('div');
      mainMeta.className = 'category-manage-main-meta';

      const title = document.createElement('span');
      title.className = 'category-manage-main-title';
      title.textContent = mainCategory;

      const emojiInput = document.createElement('input');
      emojiInput.type = 'text';
      emojiInput.className = 'category-manage-emoji-input';
      emojiInput.value = mainConfig.emoji || '';
      emojiInput.maxLength = 8;
      emojiInput.placeholder = '이모지';
      emojiInput.setAttribute('aria-label', `${mainCategory} 이모지`);
      emojiInput.onchange = () => setMainCategoryEmoji(mainCategory, emojiInput.value);

      const actions = document.createElement('div');
      actions.className = 'category-manage-actions category-manage-actions-main';

      const hiddenLabel = document.createElement('label');
      hiddenLabel.className = 'hidden-option-row category-manage-option';
      hiddenLabel.style.marginTop = '0';
      hiddenLabel.innerHTML = '<input type="checkbox" /><span>기본 숨김</span>';
      const hiddenInput = hiddenLabel.querySelector('input');
      hiddenInput.checked = !!mainConfig.hiddenByDefault;
      hiddenInput.onchange = () => toggleMainCategoryHidden(mainCategory, hiddenInput.checked);

      const upBtn = document.createElement('button');
      upBtn.type = 'button';
      upBtn.className = 'btn btn-secondary btn-sm category-manage-btn-move';
      upBtn.textContent = '↑ 위로';
      upBtn.disabled = mainIndex === 0;
      upBtn.onclick = () => moveMainCategory(mainCategory, 'up');

      const downBtn = document.createElement('button');
      downBtn.type = 'button';
      downBtn.className = 'btn btn-secondary btn-sm category-manage-btn-move';
      downBtn.textContent = '↓ 아래로';
      downBtn.disabled = mainIndex === mainCategories.length - 1;
      downBtn.onclick = () => moveMainCategory(mainCategory, 'down');

      const renameBtn = document.createElement('button');
      renameBtn.type = 'button';
      renameBtn.className = 'btn btn-secondary btn-sm category-manage-btn-edit';
      renameBtn.textContent = '이름변경';
      renameBtn.onclick = () => renameMainCategory(mainCategory);

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'btn btn-danger btn-sm category-manage-btn-delete';
      deleteBtn.textContent = '삭제';
      deleteBtn.onclick = () => deleteMainCategory(mainCategory);

      mainMeta.appendChild(emojiInput);
      mainMeta.appendChild(title);
      mainMeta.appendChild(hiddenLabel);
      actions.appendChild(upBtn);
      actions.appendChild(downBtn);
      actions.appendChild(renameBtn);
      actions.appendChild(deleteBtn);
      top.appendChild(mainMeta);
      top.appendChild(actions);

      const subList = document.createElement('div');
      subList.className = 'category-manage-sub-list';
      const subCategories = getSubCategories(mainCategory);

      if (subCategories.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'category-manage-empty';
        empty.textContent = '중분류가 없습니다.';
        subList.appendChild(empty);
      } else {
        subCategories.forEach((subCategory, subIndex) => {
          const subItem = document.createElement('div');
          subItem.className = 'category-manage-sub-item';

          const subTitle = document.createElement('span');
          subTitle.className = 'category-manage-sub-title';
          subTitle.textContent = subCategory;

          const subDescription = document.createElement('textarea');
          subDescription.className = 'category-manage-sub-description';
          subDescription.rows = 2;
          subDescription.maxLength = 300;
          subDescription.placeholder = '중분류 설명을 입력하세요';
          subDescription.value = getSubCategoryDescription(mainCategory, subCategory);
          subDescription.setAttribute('aria-label', `${subCategory} 설명`);
          subDescription.hidden = true;
          subDescription.onchange = () => {
            setSubCategoryDescription(mainCategory, subCategory, subDescription.value);
            save();
            render();
          };

          const subHeaderRight = document.createElement('div');
          subHeaderRight.className = 'category-manage-sub-head-right';

          const subButtonRow = document.createElement('div');
          subButtonRow.className = 'category-manage-actions category-manage-actions-sub category-manage-sub-button-row';

          const randomLabel = document.createElement('label');
          randomLabel.className = 'hidden-option-row category-manage-option';
          randomLabel.style.marginTop = '0';
          randomLabel.innerHTML = '<input type="checkbox" /><span>무작위 선택</span>';
          const randomInput = randomLabel.querySelector('input');
          randomInput.checked = isSubCategoryRandomSelectionEnabled(mainCategory, subCategory);
          randomInput.onchange = () => toggleSubCategoryRandomSelection(mainCategory, subCategory, randomInput.checked);

          const coreLabel = document.createElement('label');
          coreLabel.className = 'hidden-option-row category-manage-option';
          coreLabel.style.marginTop = '0';
          coreLabel.innerHTML = '<input type="checkbox" /><span>핵심 분류</span>';
          const coreInput = coreLabel.querySelector('input');
          coreInput.checked = isSubCategoryCoreEnabled(mainCategory, subCategory);
          coreInput.onchange = () => toggleSubCategoryCore(mainCategory, subCategory, coreInput.checked);

          const subUpBtn = document.createElement('button');
          subUpBtn.type = 'button';
          subUpBtn.className = 'btn btn-secondary btn-sm category-manage-btn-move';
          subUpBtn.textContent = '↑';
          subUpBtn.disabled = subIndex === 0;
          subUpBtn.onclick = () => moveSubCategory(mainCategory, subCategory, 'up');

          const subDownBtn = document.createElement('button');
          subDownBtn.type = 'button';
          subDownBtn.className = 'btn btn-secondary btn-sm category-manage-btn-move';
          subDownBtn.textContent = '↓';
          subDownBtn.disabled = subIndex === subCategories.length - 1;
          subDownBtn.onclick = () => moveSubCategory(mainCategory, subCategory, 'down');

          const subDescriptionBtn = document.createElement('button');
          subDescriptionBtn.type = 'button';
          subDescriptionBtn.className = 'btn btn-secondary btn-sm category-manage-btn-edit';
          subDescriptionBtn.textContent = '설명 수정';
          subDescriptionBtn.onclick = () => {
            subDescription.hidden = false;
            subDescriptionBtn.hidden = true;
            subDescription.focus();
          };

          const subRenameBtn = document.createElement('button');
          subRenameBtn.type = 'button';
          subRenameBtn.className = 'btn btn-secondary btn-sm category-manage-btn-edit';
          subRenameBtn.textContent = '이름변경';
          subRenameBtn.onclick = () => renameSubCategory(mainCategory, subCategory);

          const subMoveBtn = document.createElement('button');
          subMoveBtn.type = 'button';
          subMoveBtn.className = 'btn btn-secondary btn-sm category-manage-btn-edit';
          subMoveBtn.textContent = '대분류 이동';

          const subMoveSelect = document.createElement('select');
          subMoveSelect.className = 'category-manage-move-select';
          subMoveSelect.classList.add('category-manage-move-target');
          subMoveSelect.setAttribute('aria-label', `${subCategory}를 이동할 대분류`);
          subMoveSelect.hidden = true;
          const movePlaceholder = document.createElement('option');
          movePlaceholder.value = '';
          movePlaceholder.textContent = '이동할 대분류 선택';
          subMoveSelect.appendChild(movePlaceholder);
          mainCategories
            .filter(targetMainCategory => targetMainCategory !== mainCategory)
            .forEach(targetMainCategory => {
              const option = document.createElement('option');
              option.value = targetMainCategory;
              option.textContent = targetMainCategory;
              subMoveSelect.appendChild(option);
            });

          const subMoveConfirmBtn = document.createElement('button');
          subMoveConfirmBtn.type = 'button';
          subMoveConfirmBtn.className = 'btn btn-primary btn-sm category-manage-btn-primary';
          subMoveConfirmBtn.textContent = '이동';
          subMoveConfirmBtn.hidden = true;
          subMoveConfirmBtn.disabled = true;

          const subMoveCancelBtn = document.createElement('button');
          subMoveCancelBtn.type = 'button';
          subMoveCancelBtn.className = 'btn btn-secondary btn-sm category-manage-btn-edit';
          subMoveCancelBtn.textContent = '취소';
          subMoveCancelBtn.hidden = true;

          subMoveBtn.onclick = () => {
            subMoveBtn.hidden = true;
            subMoveSelect.hidden = false;
            subMoveConfirmBtn.hidden = false;
            subMoveCancelBtn.hidden = false;
            subMoveSelect.focus();
          };
          subMoveSelect.onchange = () => {
            subMoveConfirmBtn.disabled = !subMoveSelect.value;
          };
          subMoveConfirmBtn.onclick = () => moveSubCategoryToMain(mainCategory, subCategory, subMoveSelect.value);
          subMoveCancelBtn.onclick = () => {
            subMoveSelect.value = '';
            subMoveSelect.hidden = true;
            subMoveConfirmBtn.hidden = true;
            subMoveCancelBtn.hidden = true;
            subMoveBtn.hidden = false;
          };

          const subDeleteBtn = document.createElement('button');
          subDeleteBtn.type = 'button';
          subDeleteBtn.className = 'btn btn-danger btn-sm category-manage-btn-delete';
          subDeleteBtn.textContent = '삭제';
          subDeleteBtn.onclick = () => deleteSubCategory(mainCategory, subCategory);

          subHeaderRight.appendChild(randomLabel);
          subHeaderRight.appendChild(coreLabel);
          subButtonRow.appendChild(subUpBtn);
          subButtonRow.appendChild(subDownBtn);
          subButtonRow.appendChild(subDescriptionBtn);
          subButtonRow.appendChild(subRenameBtn);
          subButtonRow.appendChild(subMoveBtn);
          subButtonRow.appendChild(subMoveSelect);
          subButtonRow.appendChild(subMoveConfirmBtn);
          subButtonRow.appendChild(subMoveCancelBtn);
          subButtonRow.appendChild(subDeleteBtn);
          subItem.appendChild(subTitle);
          subItem.appendChild(subHeaderRight);
          subItem.appendChild(subButtonRow);
          subItem.appendChild(subDescription);
          subList.appendChild(subItem);
        });
      }

      mainItem.appendChild(top);
      mainItem.appendChild(subList);
      list.appendChild(mainItem);
    });
  }

  function renderCategoryManageComposedList(list) {
    const mainCategories = getComposedMainCategoryOrder();
    list.innerHTML = '';

    if (mainCategories.length === 0) {
      list.innerHTML = '<div class="category-manage-empty">관리할 커스텀 대분류가 없습니다.</div>';
      return;
    }

    mainCategories.forEach((mainCategory, mainIndex) => {
      const mainConfig = getComposedMainCategoryConfig(mainCategory);
      const mainItem = document.createElement('div');
      mainItem.className = 'category-manage-main-item';

      const top = document.createElement('div');
      top.className = 'category-manage-main-top';

      const mainMeta = document.createElement('div');
      mainMeta.className = 'category-manage-main-meta';

      const title = document.createElement('span');
      title.className = 'category-manage-main-title';
      title.textContent = mainCategory;

      const emojiInput = document.createElement('input');
      emojiInput.type = 'text';
      emojiInput.className = 'category-manage-emoji-input';
      emojiInput.value = mainConfig.emoji || '';
      emojiInput.maxLength = 8;
      emojiInput.placeholder = '이모지';
      emojiInput.setAttribute('aria-label', `${mainCategory} 이모지`);
      emojiInput.onchange = () => setComposedMainCategoryEmoji(mainCategory, emojiInput.value);

      const actions = document.createElement('div');
      actions.className = 'category-manage-actions category-manage-actions-main';

      const editOnlyLabel = document.createElement('label');
      editOnlyLabel.className = 'hidden-option-row category-manage-option';
      editOnlyLabel.style.marginTop = '0';
      editOnlyLabel.innerHTML = '<input type="checkbox" /><span>편집용</span>';
      const editOnlyInput = editOnlyLabel.querySelector('input');
      editOnlyInput.checked = !!mainConfig.editOnly;
      editOnlyInput.onchange = () => toggleComposedMainCategoryEditOnly(mainCategory, editOnlyInput.checked);

      const upBtn = document.createElement('button');
      upBtn.type = 'button';
      upBtn.className = 'btn btn-secondary btn-sm category-manage-btn-move';
      upBtn.textContent = '↑ 위로';
      upBtn.disabled = mainIndex === 0;
      upBtn.onclick = () => moveComposedMainCategory(mainCategory, 'up');

      const downBtn = document.createElement('button');
      downBtn.type = 'button';
      downBtn.className = 'btn btn-secondary btn-sm category-manage-btn-move';
      downBtn.textContent = '↓ 아래로';
      downBtn.disabled = mainIndex === mainCategories.length - 1;
      downBtn.onclick = () => moveComposedMainCategory(mainCategory, 'down');

      const renameBtn = document.createElement('button');
      renameBtn.type = 'button';
      renameBtn.className = 'btn btn-secondary btn-sm category-manage-btn-edit';
      renameBtn.textContent = '이름변경';
      renameBtn.onclick = () => renameComposedMainCategory(mainCategory);

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'btn btn-danger btn-sm category-manage-btn-delete';
      deleteBtn.textContent = '삭제';
      deleteBtn.onclick = () => deleteComposedMainCategory(mainCategory);

      mainMeta.appendChild(emojiInput);
      mainMeta.appendChild(title);
      mainMeta.appendChild(editOnlyLabel);
      actions.appendChild(upBtn);
      actions.appendChild(downBtn);
      actions.appendChild(renameBtn);
      actions.appendChild(deleteBtn);
      top.appendChild(mainMeta);
      top.appendChild(actions);

      const subList = document.createElement('div');
      subList.className = 'category-manage-sub-list';
      const subCategories = getComposedSubCategoryOrder(mainCategory);

      if (subCategories.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'category-manage-empty';
        empty.textContent = '커스텀 이름(중분류)이 없습니다.';
        subList.appendChild(empty);
      } else {
        subCategories.forEach((subCategory, subIndex) => {
          const subItem = document.createElement('div');
          subItem.className = 'category-manage-sub-item';

          const subTitle = document.createElement('span');
          subTitle.className = 'category-manage-sub-title';
          subTitle.textContent = subCategory;

          const subButtonRow = document.createElement('div');
          subButtonRow.className = 'category-manage-actions category-manage-actions-sub category-manage-sub-button-row';

          const subUpBtn = document.createElement('button');
          subUpBtn.type = 'button';
          subUpBtn.className = 'btn btn-secondary btn-sm category-manage-btn-move';
          subUpBtn.textContent = '↑';
          subUpBtn.disabled = subIndex === 0;
          subUpBtn.onclick = () => moveComposedSubCategory(mainCategory, subCategory, 'up');

          const subDownBtn = document.createElement('button');
          subDownBtn.type = 'button';
          subDownBtn.className = 'btn btn-secondary btn-sm category-manage-btn-move';
          subDownBtn.textContent = '↓';
          subDownBtn.disabled = subIndex === subCategories.length - 1;
          subDownBtn.onclick = () => moveComposedSubCategory(mainCategory, subCategory, 'down');

          const subRenameBtn = document.createElement('button');
          subRenameBtn.type = 'button';
          subRenameBtn.className = 'btn btn-secondary btn-sm category-manage-btn-edit';
          subRenameBtn.textContent = '이름변경';
          subRenameBtn.onclick = () => renameComposedSubCategory(mainCategory, subCategory);

          const subDeleteBtn = document.createElement('button');
          subDeleteBtn.type = 'button';
          subDeleteBtn.className = 'btn btn-danger btn-sm category-manage-btn-delete';
          subDeleteBtn.textContent = '삭제';
          subDeleteBtn.onclick = () => deleteComposedSubCategory(mainCategory, subCategory);

          subButtonRow.appendChild(subUpBtn);
          subButtonRow.appendChild(subDownBtn);
          subButtonRow.appendChild(subRenameBtn);
          subButtonRow.appendChild(subDeleteBtn);
          subItem.appendChild(subTitle);
          subItem.appendChild(subButtonRow);
          subList.appendChild(subItem);
        });
      }

      mainItem.appendChild(top);
      mainItem.appendChild(subList);
      list.appendChild(mainItem);
    });
  }

  function getComposedCategories() {
    return getComposedMainCategoryOrder();
  }

  function getComposedSubCategories(mainCategory) {
    const filtered = mainCategory ? composedPrompts.filter(p => p.mainCategory === mainCategory) : composedPrompts;
    return uniqueInOrder(filtered.map(p => p.subCategory).filter(Boolean));
  }

  function getCoreSubCategorySelections() {
    const cores = [];
    getMainCategories().forEach((mainCategory) => {
      getSubCategories(mainCategory).forEach((subCategory) => {
        if (!isSubCategoryCoreEnabled(mainCategory, subCategory)) return;
        cores.push({ mainCategory, subCategory });
      });
    });
    return cores;
  }

  function openCoreSubCategory(mainCategory, subCategory) {
    if (!mainCategory || !subCategory) return;

    clearSelectedPromptGridMode();
    const isCurrentlyFocused = leftPanelTab === 'prompt'
      && activeCategoryPrompt === mainCategory
      && activeSubCategoryPrompt === subCategory;

    if (isCurrentlyFocused) {
      activePromptCategoryGridMode = !activePromptCategoryGridMode;
      activePromptTagFilter = null;
    } else {
      activePromptCategoryGridMode = false;
      activePromptTagFilter = null;
    }

    activeCategoryPrompt = mainCategory;
    activeSubCategoryPrompt = subCategory;
    clearPromptDescriptionPreview();
    if (getMainCategoryConfig(mainCategory).hiddenByDefault) {
      openedHiddenMainCategories.add(mainCategory);
    }
    if (leftPanelTab !== 'prompt') {
      setLeftPanelTab('prompt');
      return;
    }
    render();
  }

  function renderCoreQuickAccessRow() {
    const row = document.getElementById('core-quick-access-row');
    if (!row) return;
    const isPromptTab = leftPanelTab === 'prompt';
    const isComboTab = leftPanelTab === 'combo';
    const coreSelections = getCoreSubCategorySelections();
    row.innerHTML = '';
    row.classList.toggle('visible', (isPromptTab && coreSelections.length > 0) || isComboTab);

    if (isComboTab) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'core-quick-access-btn custom-category-view-toggle';
      button.classList.toggle('active', isComposedEditOnlyView);
      button.setAttribute('aria-pressed', String(isComposedEditOnlyView));
      button.innerHTML = `
        <span class="custom-category-view-label">일반</span>
        <span class="custom-category-switch" aria-hidden="true"><span></span></span>
        <span class="custom-category-view-label">편집용</span>
      `;
      button.title = isComposedEditOnlyView ? '일반 커스텀 카테고리로 전환' : '편집용 커스텀 카테고리로 전환';
      button.onclick = () => {
        toggleComposedEditOnlyView();
      };
      row.appendChild(button);
      return;
    }

    if (!isPromptTab || !coreSelections.length) return;

    coreSelections.forEach(({ mainCategory, subCategory }) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'core-quick-access-btn';
      const isActive = leftPanelTab === 'prompt' && activeCategoryPrompt === mainCategory && activeSubCategoryPrompt === subCategory;
      if (isActive) button.classList.add('active');
      button.textContent = `핵심 : ${subCategory}`;
      button.title = `${mainCategory} > ${subCategory} 핵심 분류 바로 열기`;
      button.onclick = () => openCoreSubCategory(mainCategory, subCategory);
      row.appendChild(button);
    });
  }

  // ── Render ──
