  function renderLibraryHeader() {
    const title = document.getElementById('library-title');
    if (!title) return;
    title.textContent = leftPanelTab === 'combo' ? '커스텀 조합 카드' : '개별 프롬프트';

    const workspaceTitle = document.getElementById('workspace-title-btn');
    const workspaceModeToggle = document.getElementById('workspace-mode-toggle');
    const selectedChipsTitle = document.getElementById('selected-chips-title');
    const isComboTab = leftPanelTab === 'combo';
    const isCustomComboMode = isComboTab && isCustomComboTabOpen;
    if (selectedChipsTitle) {
      selectedChipsTitle.textContent = isCustomComboMode ? '커스텀 콤보 카드' : '선택된 프롬프트';
    }
    if (workspaceTitle) {
      const nextTitle = isComboTab ? '커스텀 저장소' : '프롬프트 저장소';
      const titleState = isComboTab ? (isCustomComboMode ? 'custom-combo' : 'combo') : 'prompt';
      workspaceTitle.innerHTML = Array.from(nextTitle, (character) => (
        `<span class="workspace-title-char${character === ' ' ? ' workspace-title-space' : ''}" aria-hidden="true">${character === ' ' ? '&nbsp;' : esc(character)}</span>`
      )).join('');
      workspaceTitle.setAttribute('aria-label', isComboTab ? '프롬프트 관리로 이동' : '커스텀 조합으로 이동');
      if (workspaceTitle.dataset.workspaceState !== titleState) {
        workspaceTitle.dataset.workspaceState = titleState;
        workspaceTitle.classList.remove('workspace-title-btn-changing');
        void workspaceTitle.offsetWidth;
        workspaceTitle.classList.add('workspace-title-btn-changing');
      }
    }
    if (workspaceModeToggle) {
      workspaceModeToggle.hidden = !isComboTab;
      const nextMode = isCustomComboMode ? '콤보' : '조합';
      const modeState = isCustomComboMode ? 'custom-combo' : 'combo';
      workspaceModeToggle.textContent = nextMode;
      workspaceModeToggle.setAttribute('aria-pressed', isCustomComboMode ? 'true' : 'false');
      workspaceModeToggle.title = isCustomComboMode ? '커스텀 조합으로 전환' : '커스텀 콤보로 전환';
      if (workspaceModeToggle.dataset.workspaceState !== modeState) {
        workspaceModeToggle.dataset.workspaceState = modeState;
        workspaceModeToggle.classList.remove('workspace-mode-toggle-changing');
        void workspaceModeToggle.offsetWidth;
        workspaceModeToggle.classList.add('workspace-mode-toggle-changing');
      }
    }
  }

  function renderLibraryLayout() {
    const panel = document.querySelector('.panel-library');
    const main = document.querySelector('.main');
    const comboFooter = document.querySelector('.combo-library-footer');
    const selectedPromptGridButton = document.getElementById('selected-prompt-grid-button');
    if (!panel) return;
    const isCustomComboMode = leftPanelTab === 'combo' && isCustomComboTabOpen;
    const isEditOnlyCombinationMode = leftPanelTab === 'combo' && isComposedEditOnlyView;
    const hasSelectedPrompts = selected.some(item => item.source === 'prompt');
    if (!hasSelectedPrompts) activeSelectedPromptGridMode = false;
    const coreSelection = activeSelectedPromptGridMode ? findCoreSubCategorySelection() : null;
    panel.classList.toggle('combo-mode', leftPanelTab === 'combo');
    if (main) main.classList.toggle('combo-mode', leftPanelTab === 'combo');
    panel.classList.toggle('custom-combo-mode', isCustomComboMode);
    if (main) main.classList.toggle('edit-only-combination-mode', isEditOnlyCombinationMode);
    if (main) main.classList.toggle('custom-combo-theme', isCustomComboMode);
    if (comboFooter) comboFooter.classList.toggle('custom-combo-footer', isCustomComboMode);
    if (selectedPromptGridButton) {
      selectedPromptGridButton.hidden = isCustomComboMode;
      selectedPromptGridButton.classList.toggle('core-quick-access-btn', !!coreSelection);
      selectedPromptGridButton.classList.toggle('selected-prompt-grid-return-feedback', selectedPromptGridReturnFeedback);
      selectedPromptGridButton.removeAttribute('aria-pressed');
      if (coreSelection) {
        const { mainCategory, subCategory } = coreSelection;
        selectedPromptGridButton.disabled = false;
        selectedPromptGridButton.textContent = `핵심 : ${subCategory}`;
        selectedPromptGridButton.title = `${mainCategory} > ${subCategory} 핵심 분류 바로 열기`;
        selectedPromptGridButton.onclick = () => {
          selectedPromptGridReturnFeedback = true;
          if (selectedPromptGridReturnFeedbackTimer) window.clearTimeout(selectedPromptGridReturnFeedbackTimer);
          selectedPromptGridReturnFeedbackTimer = window.setTimeout(() => {
            selectedPromptGridReturnFeedback = false;
            selectedPromptGridReturnFeedbackTimer = null;
            render();
          }, 360);
          openCoreSubCategory(mainCategory, subCategory);
        };
      } else {
        selectedPromptGridButton.disabled = !hasSelectedPrompts;
        selectedPromptGridButton.textContent = '현재 조합 보기';
        selectedPromptGridButton.removeAttribute('title');
        selectedPromptGridButton.onclick = showSelectedPromptGrid;
      }
    }
  }

  function ensureActiveCategoryState() {
    const mainCategories = getMainCategories();
    if (activeCategoryPrompt && !mainCategories.includes(activeCategoryPrompt)) {
      activeCategoryPrompt = null;
      activeSubCategoryPrompt = null;
      return;
    }

    if (!activeCategoryPrompt) {
      activeSubCategoryPrompt = null;
      return;
    }

    const subCategories = getSubCategories(activeCategoryPrompt);
    if (activeSubCategoryPrompt && !subCategories.includes(activeSubCategoryPrompt)) {
      activeSubCategoryPrompt = null;
    }
  }

  function renderAddFilterTabs() {
    const mainEl = document.getElementById('add-main-tabs');
    const subEl = document.getElementById('add-sub-tabs');
    if (!mainEl || !subEl) return;

    const mainCategories = getMainCategories();
    mainEl.innerHTML = '';
    subEl.innerHTML = '';

    if (mainCategories.length === 0) {
      mainEl.innerHTML = '<span class="tab-empty">아직 저장된 대분류가 없습니다.</span>';
      subEl.innerHTML = '<span class="tab-empty">중분류 탭은 저장 후 표시됩니다.</span>';
      return;
    }

    mainCategories.forEach(category => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tab-btn' + (activeCategoryPrompt === category ? ' active' : '');
      btn.textContent = category;
      btn.onclick = () => {
        activeCategoryPrompt = category;
        const subCategories = getSubCategories(category);
        if (!subCategories.includes(activeSubCategoryPrompt)) {
          activeSubCategoryPrompt = null;
        }
        render();
      };
      mainEl.appendChild(btn);
    });

    if (!activeCategoryPrompt) {
      subEl.innerHTML = '<span class="tab-empty">대분류 탭을 선택하면 중분류 탭이 표시됩니다.</span>';
      return;
    }

    const subCategories = getSubCategories(activeCategoryPrompt);
    if (subCategories.length === 0) {
      subEl.innerHTML = '<span class="tab-empty">선택한 대분류에 중분류가 없습니다.</span>';
      return;
    }

    subCategories.forEach(subCategory => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tab-btn' + (activeSubCategoryPrompt === subCategory ? ' active' : '');
      btn.textContent = subCategory;
      btn.onclick = () => {
        clearPromptDescriptionPreview({ feedback: true });
        activeSubCategoryPrompt = subCategory;
        render();
      };
      subEl.appendChild(btn);
    });
  }

  function renderCategorySelectors() {
    renderMainCategorySelect();
    renderSubCategorySelect();
  }

  function renderComposedCategorySelectors() {
    renderComposedMainCategorySelect();
    renderComposedSubCategorySelect();
  }

  function syncAddFormSelection() {
    const mainSelect = document.getElementById('input-main-category');
    const subSelect = document.getElementById('input-sub-category');

    if (activeCategoryPrompt) {
      mainSelect.value = activeCategoryPrompt;
    }

    renderSubCategorySelect();

    if (activeCategoryPrompt && activeSubCategoryPrompt) {
      subSelect.value = activeSubCategoryPrompt;
    } else if (activeCategoryPrompt) {
      subSelect.value = '';
    }
  }

  function renderMainCategoryFilter() {
    const el = document.getElementById('main-filter');
    el.innerHTML = '';
    const mainCategories = getMainCategories();
    if (mainCategories.length === 0) {
      el.innerHTML = '<div class="subcategory-filter-empty">아직 대분류가 없습니다. 새 프롬프트를 추가하세요.</div>';
      return;
    }

    const list = document.createElement('div');
    list.className = 'main-category-filter-list';

    mainCategories.forEach(mainCategory => {
      const subCategories = getSubCategories(mainCategory);
      const hideByDefault = getMainCategoryConfig(mainCategory).hiddenByDefault;
      const isHiddenOpen = openedHiddenMainCategories.has(mainCategory);
      const group = document.createElement('div');
      group.className = 'main-category-filter-group';

      if (activeCategoryPrompt === mainCategory) {
        group.classList.add('main-category-filter-active');
      }

      const header = document.createElement('div');
      header.className = 'main-category-filter-header';
      const mainConfig = getMainCategoryConfig(mainCategory);
      const label = document.createElement('span');
      label.textContent = `${mainConfig.emoji ? `${mainConfig.emoji} ` : ''}${mainCategory}`;
      const count = document.createElement('span');
      count.className = 'group-count';
      count.textContent = `${subCategories.length}개`;
      header.appendChild(label);
      header.appendChild(count);
      header.style.cursor = 'pointer';
      header.onclick = () => {
        // 기본숨김 카테고리는 헤더 탭으로 펼침/접힘만 토글한다.
        if (hideByDefault) {
          if (openedHiddenMainCategories.has(mainCategory)) {
            openedHiddenMainCategories.delete(mainCategory);
            if (activeCategoryPrompt === mainCategory) {
              activeCategoryPrompt = null;
              activeSubCategoryPrompt = null;
            }
          } else {
            openedHiddenMainCategories.add(mainCategory);
            activeCategoryPrompt = mainCategory;
            if (!subCategories.includes(activeSubCategoryPrompt)) {
              activeSubCategoryPrompt = null;
            }
          }
          render();
          return;
        }

        activeCategoryPrompt = mainCategory;
        if (!subCategories.includes(activeSubCategoryPrompt)) {
          activeSubCategoryPrompt = null;
        }
        render();
      };
      group.appendChild(header);

      const body = document.createElement('div');
      body.className = 'main-category-filter-body';

      if (hideByDefault && !isHiddenOpen) {
        body.style.display = 'none';
      } else if (subCategories.length === 0) {
        const empty = document.createElement('span');
        empty.className = 'subcategory-filter-empty';
        empty.style.padding = '0';
        empty.textContent = '중분류 없음';
        body.appendChild(empty);
      } else {
        subCategories.forEach(subCategory => {
          const used = isSubCategoryUsed(mainCategory, subCategory);
          const isActive = activeCategoryPrompt === mainCategory && activeSubCategoryPrompt === subCategory;
          const chip = document.createElement('span');
          chip.className = 'cat-chip' + (used ? ' used' : '') + (isActive ? ' active' : '');
          chip.innerHTML = `<span class="cat-chip-mark${used ? '' : ' hidden'}">✓</span>${esc(subCategory)}`;
          bindPressAction(chip, () => {
            clearSelectedPromptGridMode();
            const isCurrentlyFocused = isActive;
            if (used && !isCurrentlyFocused && jumpToSelectedPromptCardInCategory(mainCategory, subCategory)) {
              return;
            }

            if (isCurrentlyFocused) {
              activePromptCategoryGridMode = !activePromptCategoryGridMode;
              activePromptTagFilter = null;
            } else {
              // 새 카테고리 선택 시에는 태그 브라우저보다 전체 아이템 그리드를 먼저 연다.
              activePromptCategoryGridMode = true;
              activePromptTagFilter = null;
            }
            clearPromptDescriptionPreview({ feedback: true });
            activeCategoryPrompt = mainCategory;
            activeSubCategoryPrompt = subCategory;
            render();
          });
          body.appendChild(chip);
        });
      }

      group.appendChild(body);
      list.appendChild(group);
    });

    el.appendChild(list);
  }

  function renderComposedFilter() {
    const cats = isComposedEditOnlyView
      ? getComposedEditOnlyMainCategories()
      : getStandardComposedCategories();
    const el = document.getElementById('combo-filter');
    el.innerHTML = '';

    if (cats.length === 0) {
      el.innerHTML = `<div class="combo-load-guide">${isComposedEditOnlyView ? '편집용' : '일반'} 커스텀 대분류가 없습니다.</div>`;
      return;
    }

    cats.forEach(c => {
      const chip = document.createElement('span');
      const mainConfig = getComposedMainCategoryConfig(c);
      const isEditOnlyCategory = isComposedEditOnlyView;
      chip.className = 'cat-chip'
        + (activeCategoryComposed === c ? ' active' : '')
        + (isEditOnlyCategory ? ' edit-only-category-chip' : '');
      chip.innerHTML = isEditOnlyCategory
        ? `<span class="cat-chip-edit-label" aria-hidden="true">편집</span><span class="cat-chip-text">${mainConfig.emoji ? `${esc(mainConfig.emoji)} ` : ''}${esc(c)}</span>`
        : `${mainConfig.emoji ? `${esc(mainConfig.emoji)} ` : ''}${esc(c)}`;
      bindPressAction(chip, () => {
        clearSelectedPromptGridMode();
        const isCurrentlySelected = activeCategoryComposed === c;
        if (isCurrentlySelected) {
          if (!activeComposedCategoryGridMode) {
            activeComposedCategoryGridMode = true;
            activeComposedPreviewId = null;
            render();
          }
          return;
        }
        activeComposedCategoryGridMode = true;
        activeCategoryComposed = c;
        activeComposedPreviewId = null;
        render();
      });
      el.appendChild(chip);
    });
  }

  function renderCustomComboCollection() {
    return;
  }

  function addComposedPromptToCustomCombo(item) {
    if (!item || !item.id) return false;
    if (selectedCustomCombo.some(entry => entry.id === item.id)) {
      showToast('이미 조합된 커스텀 조합 목록에 있습니다');
      return false;
    }

    const entry = {
      ...item,
      source: 'composed',
      content: item.content || item.subCategory || '커스텀 조합',
    };

    selectedCustomCombo.push(entry);
    render();
    showToast('조합된 커스텀 조합에 추가되었습니다');
    return true;
  }

  function loadCustomCombo(customCombo) {
    if (!customCombo?.id) return;
    const itemIds = Array.isArray(customCombo.items) ? customCombo.items : [];
    selectedCustomCombo = itemIds
      .map(itemId => composedPrompts.find(item => item.id === itemId))
      .filter(Boolean)
      .map(item => ({
        ...item,
        source: 'composed',
        content: item.content || item.subCategory || '커스텀 조합',
      }));
    activeCustomComboId = customCombo.id;
    render();
  }

  function clearCustomComboSelection() {
    if (selectedCustomCombo.length === 0) return;
    if (!confirm('선택된 커스텀 조합을 모두 초기화하시겠습니까?')) return;
    selectedCustomCombo = [];
    activeCustomComboId = null;
    render();
  }

  function deleteCustomCombo(customCombo) {
    if (!customCombo?.id) return;
    if (!confirm(`'${customCombo.subCategory || '커스텀 콤보'}'을(를) 삭제하시겠습니까?`)) return;
    customCombos = customCombos.filter(item => item.id !== customCombo.id);
    if (activeCustomComboId === customCombo.id) {
      activeCustomComboId = null;
      selectedCustomCombo = [];
    }
    save();
    render();
  }

  function buildComposedLoadItem(item, options = {}) {
    const showCategory = options.showCategory !== false;
    const composedText = getComposedItemText(item);
    const row = document.createElement('div');
    row.className = 'combo-load-item clickable' + (activeComposedPreviewId === item.id ? ' active' : '');
    row.title = '터치하면 현재 조합으로 불러옵니다';
    row.innerHTML = `
      <div class="meta">
        ${showCategory ? `<div class="cat">${esc(item.mainCategory || '')}</div>` : ''}
        <div class="title">${esc(item.subCategory || '이름없음')}</div>
        <div class="text">${esc(composedText)}</div>
      </div>
    `;
    bindPressAction(row, () => loadComposedPrompt(item.id));
    return row;
  }

  function loadComposedPrompt(id) {
    const item = composedPrompts.find(p => p.id === id);
    if (!item) {
      showToast('불러올 조합을 찾지 못했습니다');
      return;
    }
    clearCoreRandomVisualState();
    activeComposedCategoryGridMode = false;
    const shouldArmCoreSelection = !getComposedMainCategoryConfig(item.mainCategory).editOnly;
    if (shouldArmCoreSelection) {
      shouldAutoSelectCoreSubCategoryOnPromptTab = true;
    }
    activeCategoryComposed = item.mainCategory;
    activeComposedPreviewId = id;
    clearOutputOverride();
    selected = item.items.map(entry => ({ ...normalizeSelected(entry), source: 'prompt' })).filter(entry => entry && entry.content);
    render();

    requestAnimationFrame(() => {
      const target = document.querySelector(`.prompt-item.combo-card-item[data-prompt-id="${CSS.escape(String(id))}"]`);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      }
    });
  }

  function openComposedPromptCardAndCopy(id) {
    const item = composedPrompts.find(p => p.id === id);
    if (!item) {
      showToast('해당 커스텀 조합을 찾지 못했습니다');
      return;
    }

    activeCustomComboFocusId = id;
    if (customComboFocusTimer) {
      window.clearTimeout(customComboFocusTimer);
    }
    customComboFocusTimer = window.setTimeout(() => {
      activeCustomComboFocusId = null;
      render();
    }, 1200);

    loadComposedPrompt(id);

    const copyText = getComposedOutputText();
    copyPromptSilently(copyText)
      .then((copied) => {
        showToast(copied ? '커스텀 조합 카드로 이동해 클립보드에 복사했습니다' : '커스텀 조합으로 이동했지만 복사할 내용이 없습니다');
      })
      .catch(() => showToast('클립보드 복사에 실패했습니다'));
  }

  async function deleteComposedPrompt(id, e) {
    if (e) e.stopPropagation();
    if (!confirm('정말 삭제하시겠습니까?')) return;
    clearOutputOverride();
    const removed = composedPrompts.find(p => p.id === id);
    const removedImageId = removed?.imageId || '';
    composedPrompts = composedPrompts.filter(p => p.id !== id);
    if (activeComposedPreviewId === id) {
      activeComposedPreviewId = null;
    }
    if (armedCoreRandomComposedId === id || morphingCoreRandomComposedId === id) {
      clearCoreRandomVisualState();
    }
    selected = selected.filter(s => !(s.id === id && s.source === 'composed'));
    if (removedImageId) {
      await deleteImageIfOrphaned(removedImageId);
    }
    save();
    render();
    showToast('커스텀 조합이 삭제되었습니다');
  }

  function closeAllPromptSwipeActions(exceptPromptId = null) {
    const items = document.querySelectorAll('.prompt-item.actions-open');
    items.forEach(item => {
      if (exceptPromptId && item.dataset.promptId === exceptPromptId) return;
      item.classList.remove('actions-open');
      const swipeContent = item.querySelector('.prompt-item-swipe-content');
      if (swipeContent) {
        swipeContent.style.transform = '';
        swipeContent.style.opacity = '';
        swipeContent.style.transition = '';
      }
      item.classList.remove('swipe-commit');
    });
  }

  function getSortedPromptsForSubCategory(mainCategory, subCategory) {
    return prompts.filter(p => {
      if (mainCategory && p.mainCategory !== mainCategory) return false;
      if (subCategory && p.subCategory !== subCategory) return false;
      return true;
    }).sort((a, b) => {
      const byContent = String(a.content || '').localeCompare(String(b.content || ''), 'ko');
      if (byContent !== 0) return byContent;
      return String(a.id || '').localeCompare(String(b.id || ''), 'ko');
    });
  }

  function applyRandomSelectionForSubCategory(mainCategory, subCategory) {
    const filteredPrompts = getSortedPromptsForSubCategory(mainCategory, subCategory);
    if (filteredPrompts.length === 0) {
      showToast('선택 가능한 프롬프트가 없습니다');
      return false;
    }

    const previousSelections = selected.filter(item => item.source === 'prompt' && item.mainCategory === mainCategory && item.subCategory === subCategory);
    if (previousSelections.length > 0) {
      selected = selected.filter(item => !(item.source === 'prompt' && item.mainCategory === mainCategory && item.subCategory === subCategory));
    }

    const availablePrompts = filteredPrompts.filter(p => !selected.some(s => s.id === p.id && s.source === 'prompt'));
    const targetPrompt = availablePrompts.length > 0
      ? availablePrompts[Math.floor(Math.random() * availablePrompts.length)]
      : null;
    if (!targetPrompt) {
      showToast('선택 가능한 프롬프트가 없습니다');
      if (previousSelections.length > 0) render();
      return false;
    }

    const added = addPromptToComposition(targetPrompt, { suppressToast: true, scrollToCard: true });
    if (!added) {
      return false;
    }

    if (isSubCategoryCoreEnabled(mainCategory, subCategory)) {
      copyPromptSilently(getComposedOutputText())
        .then((copied) => {
          showToast(copied ? '핵심 분류 무작위 선택이 조합에 추가되고 클립보드에 복사되었습니다' : '핵심 분류 무작위 선택은 추가되었지만 복사에 실패했습니다');
        })
        .catch(() => showToast('핵심 분류 무작위 선택은 추가되었지만 복사에 실패했습니다'));
    }
    return true;
  }

  function applyRandomSelectionForActiveTag() {
    const tag = activePromptTagFilter || '';
    if (!tag) {
      showToast('선택된 태그가 없습니다');
      return false;
    }

    const filteredPrompts = prompts.filter(prompt => {
      if (!normalizePromptTags(prompt.tags).includes(tag)) return false;
      if (activeCategoryPrompt && prompt.mainCategory !== activeCategoryPrompt) return false;
      if (activeSubCategoryPrompt && prompt.subCategory !== activeSubCategoryPrompt) return false;
      return true;
    }).sort((a, b) => {
      const byContent = String(a.content || '').localeCompare(String(b.content || ''), 'ko');
      if (byContent !== 0) return byContent;
      return String(a.id || '').localeCompare(String(b.id || ''), 'ko');
    });

    if (filteredPrompts.length === 0) {
      showToast('이 태그 안에 선택 가능한 프롬프트가 없습니다');
      return false;
    }

    const previousSelections = selected.filter(item => (
      item.source === 'prompt'
      && item.mainCategory === activeCategoryPrompt
      && item.subCategory === activeSubCategoryPrompt
    ));
    if (previousSelections.length > 0) {
      selected = selected.filter(item => !(item.source === 'prompt'
        && item.mainCategory === activeCategoryPrompt
        && item.subCategory === activeSubCategoryPrompt));
    }

    const availablePrompts = filteredPrompts.filter(p => !selected.some(s => s.id === p.id && s.source === 'prompt'));
    const targetPrompt = availablePrompts.length > 0
      ? availablePrompts[Math.floor(Math.random() * availablePrompts.length)]
      : null;
    if (!targetPrompt) {
      showToast('이 태그 안에 선택 가능한 프롬프트가 없습니다');
      if (previousSelections.length > 0) render();
      return false;
    }

    const added = addPromptToComposition(targetPrompt, { suppressToast: true, scrollToCard: true });
    if (!added) {
      return false;
    }

    copyPromptSilently(getComposedOutputText())
      .then((copied) => {
        showToast(copied ? '태그 무작위 선택이 조합에 추가되고 클립보드에 복사되었습니다' : '태그 무작위 선택은 추가되었지만 복사에 실패했습니다');
      })
      .catch(() => showToast('태그 무작위 선택은 추가되었지만 복사에 실패했습니다'));
    return true;
  }

  function setFrozenComboCardHeight(composedPromptId, height) {
    if (!composedPromptId || !height) return;
    frozenComboCardId = composedPromptId;
    frozenComboCardHeight = height;
  }

  function getFrozenComboCardHeight(composedPromptId) {
    return frozenComboCardId === composedPromptId ? frozenComboCardHeight : 0;
  }

  function clearFrozenComboCardHeight() {
    frozenComboCardId = null;
    frozenComboCardHeight = 0;
  }

  function clearCoreRandomVisualState() {
    armedCoreRandomComposedId = null;
    morphingCoreRandomComposedId = null;
    armedComposedCopyId = null;
    clearFrozenComboCardHeight();
    if (coreRandomMorphTimer) {
      window.clearTimeout(coreRandomMorphTimer);
      coreRandomMorphTimer = null;
    }
    isCoreRandomFadeOutRunning = false;
  }

  function fadeOutArmedCoreRandomCard(onAfterFade) {
    const runNext = () => {
      clearCoreRandomVisualState();
      if (typeof onAfterFade === 'function') {
        onAfterFade();
      }
    };

    const armedId = armedCoreRandomComposedId;
    if (!armedId || leftPanelTab !== 'combo') {
      runNext();
      return;
    }
    if (isCoreRandomFadeOutRunning) return;

    const cards = Array.from(document.querySelectorAll('.prompt-item.combo-card-item'));
    const armedCard = cards.find(card => card.dataset.promptId === armedId);
    if (!armedCard) {
      runNext();
      return;
    }

    isCoreRandomFadeOutRunning = true;
    armedCard.classList.remove('core-random-morph');
    armedCard.classList.add('core-random-fade-out');
    window.setTimeout(() => {
      runNext();
    }, 120);
  }

  function armComposedCardCoreRandomShortcut(composedPromptId, options = {}) {
    const skipFadeOut = options.skipFadeOut === true;
    const item = composedPrompts.find(p => p.id === composedPromptId);
    if (!item) {
      showToast('선택한 커스텀 카드를 찾지 못했습니다');
      return;
    }

    if (!skipFadeOut && armedCoreRandomComposedId && armedCoreRandomComposedId !== composedPromptId) {
      fadeOutArmedCoreRandomCard(() => {
        armComposedCardCoreRandomShortcut(composedPromptId, { skipFadeOut: true, frozenHeight: options.frozenHeight });
      });
      return;
    }

    const shouldArmCoreSelection = !getComposedMainCategoryConfig(item.mainCategory).editOnly;
    if (shouldArmCoreSelection) {
      shouldAutoSelectCoreSubCategoryOnPromptTab = true;
    }

    activeCategoryComposed = item.mainCategory;
    activeComposedPreviewId = composedPromptId;
    armedCoreRandomComposedId = composedPromptId;
    morphingCoreRandomComposedId = composedPromptId;
    armedComposedCopyId = null;
    if (options.frozenHeight) {
      setFrozenComboCardHeight(composedPromptId, options.frozenHeight);
    }
    if (coreRandomMorphTimer) {
      window.clearTimeout(coreRandomMorphTimer);
    }
    coreRandomMorphTimer = window.setTimeout(() => {
      if (morphingCoreRandomComposedId === composedPromptId) {
        morphingCoreRandomComposedId = null;
        render();
      }
      coreRandomMorphTimer = null;
    }, 190);
    render();
    showToast('핵심 분류 무작위 선택 카드로 전환되었습니다');
  }

  function armComposedCardCopyShortcut(composedPromptId, options = {}) {
    const item = composedPrompts.find(p => p.id === composedPromptId);
    if (!item) {
      showToast('선택한 커스텀 카드를 찾지 못했습니다');
      return;
    }

    const isEditOnly = !!getComposedMainCategoryConfig(item.mainCategory).editOnly;
    if (!isEditOnly) {
      armComposedCardCoreRandomShortcut(composedPromptId, options);
      return;
    }

    activeCategoryComposed = item.mainCategory;
    activeComposedPreviewId = composedPromptId;
    armedCoreRandomComposedId = null;
    morphingCoreRandomComposedId = null;
    armedComposedCopyId = composedPromptId;
    if (options.frozenHeight) {
      setFrozenComboCardHeight(composedPromptId, options.frozenHeight);
    }
    render();
    showToast('클립보드 복사 버튼으로 전환되었습니다');
  }

  function focusComposedCardFromTagGrid(composedPromptId) {
    const item = composedPrompts.find(entry => String(entry.id) === String(composedPromptId));
    if (!item) return;

    activeComposedCategoryGridMode = false;
    activeCategoryComposed = item.mainCategory;
    const isEditOnlyCategory = !!getComposedMainCategoryConfig(item.mainCategory).editOnly;
    if (isEditOnlyCategory) {
      armComposedCardCopyShortcut(item.id);
    } else {
      armComposedCardCoreRandomShortcut(item.id);
    }

    window.setTimeout(() => {
      const card = Array.from(document.querySelectorAll('.combo-card-item'))
        .find(entry => String(entry.dataset.promptId) === String(item.id));
      card?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 220);
  }

  function runComposedCopyAndOpenCoreShortcut(composedPromptId) {
    const item = composedPrompts.find(p => p.id === composedPromptId);
    if (!item) {
      showToast('선택한 커스텀 카드를 찾지 못했습니다');
      return;
    }

    loadComposedPrompt(composedPromptId);
    const coreSelection = findCoreSubCategorySelection();
    if (!coreSelection) {
      showToast('핵심 분류가 설정되지 않았습니다');
      return;
    }

    copyPromptSilently(getComposedOutputText())
      .then((copied) => {
        showToast(copied ? '클립보드에 복사되었습니다' : '복사할 내용이 없습니다');
      })
      .catch(() => showToast('클립보드 복사에 실패했습니다'));

    activeCategoryPrompt = coreSelection.mainCategory;
    activeSubCategoryPrompt = coreSelection.subCategory;
    if (getMainCategoryConfig(coreSelection.mainCategory).hiddenByDefault) {
      openedHiddenMainCategories.add(coreSelection.mainCategory);
    }
    if (leftPanelTab !== 'prompt') {
      setLeftPanelTab('prompt');
    } else {
      render();
    }
  }

  function runComposedCopyShortcut(composedPromptId) {
    const item = composedPrompts.find(p => p.id === composedPromptId);
    if (!item) {
      showToast('선택한 커스텀 카드를 찾지 못했습니다');
      return;
    }

    armedComposedCopyId = null;
    loadComposedPrompt(composedPromptId);
    const text = getComposedOutputText();
    copyPromptSilently(text)
      .then((copied) => {
        if (copied) {
          showToast('클립보드에 복사되었습니다');
        } else {
          showToast('복사할 내용이 없습니다');
        }
      })
      .catch(() => showToast('클립보드 복사에 실패했습니다'));
  }

  function runComposedSwipeShortcut(composedPromptId) {
    const item = composedPrompts.find(p => p.id === composedPromptId);
    if (!item) {
      showToast('선택한 커스텀 카드를 찾지 못했습니다');
      return;
    }

    loadComposedPrompt(composedPromptId);

    const coreSelection = findCoreSubCategorySelection();
    if (!coreSelection) {
      showToast('핵심 분류가 설정되지 않았습니다');
      return;
    }

    activeCategoryPrompt = coreSelection.mainCategory;
    activeSubCategoryPrompt = coreSelection.subCategory;
    if (getMainCategoryConfig(coreSelection.mainCategory).hiddenByDefault) {
      openedHiddenMainCategories.add(coreSelection.mainCategory);
    }

    if (!isSubCategoryRandomSelectionEnabled(coreSelection.mainCategory, coreSelection.subCategory)) {
      if (leftPanelTab !== 'prompt') {
        setLeftPanelTab('prompt');
      } else {
        render();
      }
      showToast('핵심 분류 중분류의 무작위 선택 카드가 비활성화되어 있습니다');
      return;
    }

    if (leftPanelTab !== 'prompt') {
      setLeftPanelTab('prompt');
    } else {
      render();
    }

    isPromptPreviewSuppressed = false;
    applyRandomSelectionForSubCategory(coreSelection.mainCategory, coreSelection.subCategory);
  }

  function bindPromptItemSwipe(item, promptData, options = {}) {
    const swipeContent = item.querySelector('.prompt-item-swipe-content');
    if (!swipeContent) return;
    const onTap = typeof options.onTap === 'function'
      ? options.onTap
      : () => handlePromptTap(promptData);
    const onSwipeCommit = typeof options.onSwipeCommit === 'function'
      ? options.onSwipeCommit
      : () => addPromptToComposition(promptData);
    const allowRightSwipeCommit = options.allowRightSwipeCommit !== false;
    const allowLeftSwipeActions = options.allowLeftSwipeActions !== false;
    const requireSwipeComposeMode = options.requireSwipeComposeMode !== false;
    const canCommitRightSwipe = () => allowRightSwipeCommit && (!requireSwipeComposeMode || isSwipeComposeMode());

    const closedX = 0;
    const openedX = -PROMPT_SWIPE_ACTION_WIDTH;
    const rightSwipeLimitX = 92;
    const rightSwipeCommitX = 56;
    let pointerId = null;
    let tracking = false;
    let swiping = false;
    let startX = 0;
    let startY = 0;
    let baseX = 0;
    let currentX = 0;

    const setSwipeX = (x) => {
      const minX = allowLeftSwipeActions ? openedX : closedX;
      const maxX = canCommitRightSwipe() ? rightSwipeLimitX : closedX;
      currentX = Math.min(maxX, Math.max(minX, x));
      swipeContent.style.transform = `translateX(${currentX}px)`;
    };

    const openActions = () => {
      closeAllPromptSwipeActions(promptData.id);
      item.classList.add('actions-open');
      item._swipeActionTransitionUntil = performance.now() + 180;
      swipeContent.style.transition = '';
      setSwipeX(openedX);
    };

    const closeActions = () => {
      item.classList.remove('actions-open');
      swipeContent.style.transition = '';
      setSwipeX(closedX);
    };

    const triggerSwipeMissFeedback = () => {
      notifyInvalidSwipeTouch(item);
    };

    const commitAddAnimation = () => {
      if (item.classList.contains('swipe-commit')) return;
      item.classList.add('swipe-commit');
      const startCommitX = Math.max(0, currentX);
      swipeContent.style.transition = 'none';
      swipeContent.style.transform = `translateX(${startCommitX}px) scale(1)`;
      swipeContent.style.opacity = '1';
      swipeContent.style.filter = 'saturate(1)';

      requestAnimationFrame(() => {
        swipeContent.style.transition = 'transform .32s cubic-bezier(0.16, 1, 0.3, 1), opacity .24s ease-out, filter .28s ease-out';
        swipeContent.style.transform = 'translateX(128px) scale(0.972)';
        swipeContent.style.opacity = '0';
        swipeContent.style.filter = 'saturate(1.05)';
      });

      // 스와이프 커밋 후 짧은 지연 뒤 조합에 반영한다.
      window.setTimeout(() => {
        if (item.classList.contains('combo-card-item')) {
          composedCardActionTransitionUntil.set(promptData.id, performance.now() + 240);
        }
        onSwipeCommit();
      }, 80);

      window.setTimeout(() => {
        swipeContent.style.transition = '';
        swipeContent.style.transform = '';
        swipeContent.style.opacity = '';
        swipeContent.style.filter = '';
        item.classList.remove('swipe-commit');
      }, 320);
    };

    item.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (e.target.closest('.prompt-item-actions')) return;
      if (isDoubleTapTouchCooldownActive()) return;

      pointerId = e.pointerId;
      tracking = true;
      swiping = false;
      startX = e.clientX;
      startY = e.clientY;
      baseX = item.classList.contains('actions-open') && allowLeftSwipeActions ? openedX : closedX;
      currentX = baseX;
      swipeContent.style.transition = 'none';
      try { item.setPointerCapture(pointerId); } catch {}
    });

    item.addEventListener('pointermove', (e) => {
      if (!tracking || e.pointerId !== pointerId) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if (!swiping) {
        if (Math.abs(dx) < 8) return;
        if (Math.abs(dx) <= Math.abs(dy)) {
          tracking = false;
          swipeContent.style.transition = '';
          return;
        }
        swiping = true;
      }

      e.preventDefault();
      setSwipeX(baseX + dx);
    });

    const onPointerEnd = (e) => {
      if (!tracking || e.pointerId !== pointerId) return;
      tracking = false;
      swipeContent.style.transition = '';

      if (swiping) {
        const swipeDx = e.clientX - startX;
        if (canCommitRightSwipe() && currentX >= rightSwipeCommitX) {
          closeAllPromptSwipeActions(promptData.id);
          commitAddAnimation();
          return;
        }

        if (swipeDx > 0) triggerSwipeMissFeedback();

        if (allowLeftSwipeActions && currentX <= openedX / 2) openActions();
        else closeActions();
        return;
      }

      if (item.classList.contains('actions-open')) {
        closeActions();
        return;
      }

      closeAllPromptSwipeActions();
      onTap(e);
    };

    item.addEventListener('pointerup', onPointerEnd);
    item.addEventListener('pointercancel', onPointerEnd);
  }

  function renderPromptList() {
    const list = document.getElementById('prompt-list');
    const randomSlot = document.getElementById('prompt-random-slot');
    const libraryHeader = document.querySelector('.panel-library .panel-header');

    const setLibraryHeaderVisible = (visible) => {
      if (!libraryHeader) return;
      libraryHeader.style.display = visible ? '' : 'none';
    };

    setLibraryHeaderVisible(true);

    if (randomSlot) {
      randomSlot.innerHTML = '';
      randomSlot.classList.remove('active');
    }

    if (leftPanelTab === 'combo') {
      if (!activeCategoryComposed) {
        list.innerHTML = '<div class="empty-state">좌측에서 대분류를 선택하면 커스텀 조합 카드가 표시됩니다.</div>';
        return;
      }

      const filteredComposed = composedPrompts.filter(item => item.mainCategory === activeCategoryComposed);
      if (filteredComposed.length === 0) {
        list.innerHTML = '<div class="empty-state">선택한 대분류에 표시할 커스텀 조합 카드가 없습니다.</div>';
        return;
      }

      list.innerHTML = '';
      filteredComposed.forEach(item => {
        const composedText = getComposedItemText(item);
        const isPreview = activeComposedPreviewId === item.id;
        const isArmedRandomCard = armedCoreRandomComposedId === item.id;
        const isArmedCopyCard = armedComposedCopyId === item.id;
        const isMorphingRandomCard = morphingCoreRandomComposedId === item.id;
        const isEditOnlyCategory = !!getComposedMainCategoryConfig(item.mainCategory).editOnly;
        const card = document.createElement('div');
        card.dataset.promptId = item.id;
        card.className = 'prompt-item combo-card-item'
          + (isPreview ? ' preview' : '')
          + (isArmedRandomCard ? ' core-random-armed' : '')
          + (isArmedCopyCard ? ' core-random-armed' : '')
          + (isArmedCopyCard ? ' copy-armed' : '')
          + (isMorphingRandomCard ? ' core-random-morph' : '');
        const actionTransitionUntil = composedCardActionTransitionUntil.get(item.id) || 0;
        if (actionTransitionUntil > performance.now()) {
          card._swipeActionTransitionUntil = actionTransitionUntil;
        }
        card.title = isArmedRandomCard
          ? '왼쪽은 클립보드 복사, 오른쪽은 핵심 분류 무작위 선택'
          : isArmedCopyCard
            ? '탭하면 클립보드에 복사합니다'
            : '클릭하면 현재 조합으로 불러옵니다';
        if (isArmedRandomCard || isArmedCopyCard) {
          // 스와이프 직전 카드 높이를 유지해 전환 시 크기가 줄어들며 출렁이지 않게 한다.
          const frozenHeight = getFrozenComboCardHeight(item.id);
          if (frozenHeight) card.style.minHeight = `${frozenHeight}px`;
        }
        const isFocusedFlowCard = activeCustomComboFocusId === item.id;
        card.classList.toggle('custom-combo-focus-target', isFocusedFlowCard);
        card.innerHTML = isArmedRandomCard
          ? `
          <div class="prompt-item-swipe-content">
            <div class="prompt-item-body">
              <div class="combo-card-text">
                <div class="combo-card-choice-row">
                  <button class="combo-card-choice-btn copy" type="button" data-combo-choice="copy">
                    📋 클립보드 복사
                  </button>
                  <button class="combo-card-choice-btn" type="button" data-combo-choice="random">
                    🎲 핵심 분류 무작위 선택
                  </button>
                </div>
              </div>
            </div>
          </div>
          `
          : isArmedCopyCard
            ? `
          <div class="prompt-item-swipe-content">
            <div class="prompt-item-body">
              <div class="combo-card-text">
                <span class="combo-card-name combo-card-random-name"><span class="combo-card-random-icon">📋</span><span>클립보드 복사</span></span>
              </div>
            </div>
          </div>
          `
            : `
          <div class="prompt-item-swipe-content">
            <div class="prompt-item-body">
              <div class="combo-card-text">
                <span class="combo-card-name">${esc(item.subCategory || '이름없음')}</span>
                <span class="combo-card-preview" title="${esc(composedText)}">${esc(composedText)}</span>
              </div>
            </div>
          </div>
          <div class="prompt-item-actions">
            <button class="edit-btn" title="편집" type="button">편집</button>
            <button class="del-btn" title="삭제" type="button">삭제</button>
          </div>
        `;

        if (isArmedRandomCard) {
          bindPromptItemSwipe(card, item, {
            allowRightSwipeCommit: false,
            allowLeftSwipeActions: false,
            requireSwipeComposeMode: true,
            onTap: (event) => {
              const tappedChoice = event
                ? (document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-combo-choice]')
                  || event.target?.closest?.('[data-combo-choice]'))
                : null;
              if (tappedChoice?.dataset.comboChoice === 'copy') {
                runComposedCopyAndOpenCoreShortcut(item.id);
                return;
              }
              runComposedSwipeShortcut(item.id);
            },
          });
        } else if (isArmedCopyCard) {
          bindPromptItemSwipe(card, item, {
            allowRightSwipeCommit: false,
            allowLeftSwipeActions: false,
            requireSwipeComposeMode: true,
            onTap: () => runComposedCopyShortcut(item.id),
          });
        } else {
          const editBtn = card.querySelector('.edit-btn');
          const delBtn = card.querySelector('.del-btn');
          if (editBtn) {
            editBtn.addEventListener('click', (e) => {
              if (isSwipeActionTransitioning(card)) {
                e.preventDefault();
                e.stopPropagation();
                notifyInvalidSwipeTouch(card);
                return;
              }
              openEditComposedPromptModal(item.id, e);
            });
          }
          if (delBtn) {
            delBtn.addEventListener('click', (e) => {
              if (isSwipeActionTransitioning(card)) {
                e.preventDefault();
                e.stopPropagation();
                notifyInvalidSwipeTouch(card);
                return;
              }
              deleteComposedPrompt(item.id, e);
            });
          }

          bindPromptItemSwipe(card, item, {
            allowRightSwipeCommit: true,
            requireSwipeComposeMode: true,
            onSwipeCommit: () => {
              if (isCustomComboTabOpen) {
                addComposedPromptToCustomCombo(item);
                return;
              }
              const frozenHeight = card.getBoundingClientRect().height;
              if (isEditOnlyCategory) {
                armComposedCardCopyShortcut(item.id, { frozenHeight });
              } else {
                armComposedCardCoreRandomShortcut(item.id, { frozenHeight });
              }
            },
            onTap: () => {
              if (isCustomComboTabOpen) {
                if (tapComposeMode === PROMPT_ADD_MODE.SWIPE) {
                  return;
                }
                if (tapComposeMode === PROMPT_ADD_MODE.DOUBLE_TAP_PREVIEW) {
                  if (activeComposedPreviewId === item.id) {
                    addComposedPromptToCustomCombo(item);
                  } else {
                    activeComposedPreviewId = item.id;
                    render();
                  }
                  return;
                }
                addComposedPromptToCustomCombo(item);
                return;
              }
              if (isArmedRandomCard) {
                runComposedSwipeShortcut(item.id);
                return;
              }
              if (isArmedCopyCard) {
                runComposedCopyShortcut(item.id);
                return;
              }
              if (armedCoreRandomComposedId && armedCoreRandomComposedId !== item.id) {
                fadeOutArmedCoreRandomCard(() => {
                  if (tapComposeMode === PROMPT_ADD_MODE.TAP) {
                    if (isEditOnlyCategory) {
                      armComposedCardCopyShortcut(item.id);
                    } else {
                      armComposedCardCoreRandomShortcut(item.id);
                    }
                  } else if (tapComposeMode === PROMPT_ADD_MODE.DOUBLE_TAP_PREVIEW) {
                    activeComposedPreviewId = item.id;
                    render();
                  } else {
                    loadComposedPrompt(item.id);
                  }
                });
                return;
              }
              if (armedComposedCopyId && armedComposedCopyId !== item.id) {
                armedComposedCopyId = null;
              }
              if (tapComposeMode === PROMPT_ADD_MODE.DOUBLE_TAP_PREVIEW) {
                if (activeComposedPreviewId === item.id) {
                  activateDoubleTapTouchCooldown();
                  if (isEditOnlyCategory) {
                    armComposedCardCopyShortcut(item.id);
                  } else {
                    armComposedCardCoreRandomShortcut(item.id);
                  }
                } else {
                  activeComposedPreviewId = item.id;
                  render();
                }
                return;
              }
              if (tapComposeMode === PROMPT_ADD_MODE.TAP) {
                if (isEditOnlyCategory) {
                  armComposedCardCopyShortcut(item.id);
                } else {
                  armComposedCardCoreRandomShortcut(item.id);
                }
                return;
              }
              loadComposedPrompt(item.id);
            },
          });
        }
        list.appendChild(card);
      });
      return;
    }

    if (!activeCategoryPrompt || !activeSubCategoryPrompt) {
      list.innerHTML = '<div class="empty-state">중분류 칩을 선택하면 개별 프롬프트가 표시됩니다.</div>';
      return;
    }

    const filteredPrompts = prompts.filter(p => {
      if (activeCategoryPrompt && p.mainCategory !== activeCategoryPrompt) return false;
      if (activeSubCategoryPrompt && p.subCategory !== activeSubCategoryPrompt) return false;
      return true;
    }).sort((a, b) => {
      const byContent = String(a.content || '').localeCompare(String(b.content || ''), 'ko');
      if (byContent !== 0) return byContent;
      return String(a.id || '').localeCompare(String(b.id || ''), 'ko');
    });

    if (filteredPrompts.length === 0) {
      list.innerHTML = '<div class="empty-state">표시할 개별 프롬프트가 없습니다.</div>';
      return;
    }

    list.innerHTML = '';

    const randomSelectionEnabled = isSubCategoryRandomSelectionEnabled(activeCategoryPrompt, activeSubCategoryPrompt);
    if (randomSelectionEnabled && filteredPrompts.length > 0) {
      setLibraryHeaderVisible(false);
      const randomCard = document.createElement('div');
      randomCard.dataset.promptId = `__random__:${activeCategoryPrompt || ''}:${activeSubCategoryPrompt || ''}`;
      randomCard.className = 'prompt-item random-card' + (activePromptPreviewId === randomCard.dataset.promptId ? ' preview' : '') + (selectingFromPreviewId === randomCard.dataset.promptId ? ' select-feedback' : '');
      randomCard.innerHTML = `
        <div class="prompt-item-swipe-content">
          <div class="prompt-item-body">
            <span class="random-content"><span class="random-icon">🎲</span><span>무작위로 선택</span></span>
          </div>
        </div>
      `;

      const applyRandomSelection = () => {
        applyRandomSelectionForSubCategory(activeCategoryPrompt, activeSubCategoryPrompt);
      };

      const handleRandomCardTap = () => {
        isPromptPreviewSuppressed = false;
        applyRandomSelection();
      };

      bindPromptItemSwipe(randomCard, { id: randomCard.dataset.promptId, content: '무작위로 선택' }, {
        onTap: handleRandomCardTap,
        onSwipeCommit: applyRandomSelection,
        allowLeftSwipeActions: false,
      });
      if (randomSlot) {
        randomSlot.appendChild(randomCard);
        randomSlot.classList.add('active');
      } else {
        list.appendChild(randomCard);
      }
    }

    filteredPrompts.forEach(p => {
      const isSelected = selected.some(s => s.id === p.id && s.source === 'prompt');
      const isPreview = activePromptPreviewId === p.id;
      const item = document.createElement('div');
      item.dataset.promptId = p.id;
      item.className = 'prompt-item'
        + (isSelected ? ' selected' : '')
        + (isPreview ? ' preview' : '')
        + (selectingFromPreviewId === p.id ? ' select-feedback' : '');
      item.innerHTML = `
        <div class="prompt-item-swipe-content">
          <div class="prompt-item-body">
            <div class="prompt-item-meta">
              <span class="cat-badge">${esc(p.mainCategory)}</span>
              <span class="cat-badge sub">${esc(p.subCategory)}</span>
            </div>
            <span class="content">${esc(p.content)}</span>
          </div>
          <span class="prompt-item-indicator">✓</span>
        </div>
        <div class="prompt-item-actions">
          <button class="edit-btn" title="편집" type="button">편집</button>
          <button class="del-btn" title="삭제" type="button">삭제</button>
        </div>
      `;

      const editBtn = item.querySelector('.edit-btn');
      const delBtn = item.querySelector('.del-btn');
      if (editBtn) {
        editBtn.addEventListener('click', (e) => {
          if (isSwipeActionTransitioning(item)) {
            e.preventDefault();
            e.stopPropagation();
            notifyInvalidSwipeTouch(item);
            return;
          }
          openEditPromptModal(p.id, e);
        });
      }
      if (delBtn) {
        delBtn.addEventListener('click', (e) => {
          if (isSwipeActionTransitioning(item)) {
            e.preventDefault();
            e.stopPropagation();
            notifyInvalidSwipeTouch(item);
            return;
          }
          deletePrompt(p.id, 'prompt', e);
        });
      }

      bindPromptItemSwipe(item, p);
      list.appendChild(item);
    });
  }

  function render() {
    renderTapComposeToggle();
    renderCoreCategoryWideCardToggle();
    renderLargeItemGridToggle();
    renderExportMetadataSanitizationToggle();
    renderCoreQuickAccessRow();
    renderPreviewTransitionMode();
    ensureActiveCategoryState();
    renderMainCategoryFilter();
    renderAddFilterTabs();
    renderComposedFilter();
    renderLibraryHeader();
    renderLibraryLayout();
    renderCategorySelectors();
    renderComposedCategorySelectors();
    syncAddFormSelection();
    renderPromptList();
    renderSelected();
    renderComposedModalItemEditor();
    renderCustomComboCollection();
    renderPromptDescriptionPreview();
    renderComposedDescriptionPreview();
    if (document.getElementById('category-manage-modal')?.classList.contains('open')) {
      renderCategoryManageTabs();
      renderCategoryManageList();
    }
    const countBadge = document.getElementById('count-badge');
    if (leftPanelTab === 'combo') {
      const count = activeCategoryComposed
        ? composedPrompts.filter(item => item.mainCategory === activeCategoryComposed).length
        : 0;
      countBadge.textContent = count ? `(${count})` : '';
    } else {
      countBadge.textContent = prompts.length ? `(${prompts.length})` : '';
    }
  }

  function isSubCategoryUsed(mainCategory, subCategory) {
    return selected.some(item => {
      if (item.source === 'prompt') {
        return item.mainCategory === mainCategory && item.subCategory === subCategory;
      }
      return false;
    });
  }

  function jumpToSelectedPromptCardInCategory(mainCategory, subCategory) {
    const selectedPrompt = selected.find(item => (
      item.source === 'prompt'
      && item.mainCategory === mainCategory
      && item.subCategory === subCategory
    ));
    if (!selectedPrompt) return false;

    activePromptCategoryGridMode = false;
    activePromptTagFilter = null;
    activeCategoryPrompt = mainCategory;
    activeSubCategoryPrompt = subCategory;
    render();

    requestAnimationFrame(() => {
      const card = document.querySelector(`.prompt-item[data-prompt-id="${CSS.escape(String(selectedPrompt.id))}"]`);
      if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    });
    return true;
  }

  function scrollSelectedPromptChipIntoView(promptId) {
    if (!promptId) return;
    requestAnimationFrame(() => {
      const chip = document.querySelector(`#selected-chips .selected-chip[data-prompt-id="${CSS.escape(String(promptId))}"]`);
      if (!chip) return;
      chip.classList.remove('scroll-focus');
      void chip.offsetWidth;
      chip.classList.add('scroll-focus');
      chip.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      window.setTimeout(() => chip.classList.remove('scroll-focus'), 620);
    });
  }

  function highlightSelectedPromptChip(promptId) {
    if (!promptId) return;
    requestAnimationFrame(() => {
      const chip = document.querySelector(`.selected-chip[data-prompt-id="${CSS.escape(String(promptId))}"]`);
      if (!chip) return;
      chip.classList.remove('scroll-focus');
      void chip.offsetWidth;
      chip.classList.add('scroll-focus');
      window.setTimeout(() => chip.classList.remove('scroll-focus'), 620);
    });
  }

  function renderSelected() {
    const container = document.getElementById('selected-chips');
    if (!container) return;
    const coreContainer = document.getElementById('selected-chips-core');
    const customPreviewContainer = document.getElementById('custom-combo-preview-chips');

    container.innerHTML = '';
    if (coreContainer) {
      coreContainer.innerHTML = '';
      coreContainer.hidden = true;
    }

    if (leftPanelTab === 'combo' && isCustomComboTabOpen) {
      const renderCustomComboChips = (target, includeEmptyId) => {
        target.innerHTML = '';
        if (selectedCustomCombo.length === 0) {
          const empty = document.createElement('span');
          if (includeEmptyId) empty.id = 'chips-empty';
          empty.className = 'empty-state';
          empty.textContent = '선택된 커스텀 조합이 없습니다';
          target.appendChild(empty);
          return;
        }

        selectedCustomCombo.forEach((item, index) => {
          const chip = document.createElement('div');
          chip.className = 'selected-chip';
          chip.dataset.idx = String(index);
          chip.title = '이 커스텀 조합 카드를 제거합니다';
          chip.innerHTML = `
            <span class="chip-cat">커스텀 조합</span>
            <span>${esc(item.subCategory || item.content || '커스텀 조합')}</span>
            <button class="chip-remove" title="제거" data-custom-combo-index="${index}">×</button>
          `;
          const removeBtn = chip.querySelector('.chip-remove');
          if (removeBtn) {
            removeBtn.addEventListener('click', (event) => {
              event.stopPropagation();
              selectedCustomCombo.splice(index, 1);
              render();
            });
          }
          target.appendChild(chip);
        });
      };

      container.innerHTML = '';
      if (customCombos.length === 0) {
        const empty = document.createElement('span');
        empty.id = 'chips-empty';
        empty.className = 'empty-state';
        empty.textContent = '저장된 커스텀 콤보가 없습니다';
        container.appendChild(empty);
      } else {
        customCombos.forEach((customCombo) => {
          const comboCard = document.createElement('div');
          const isActive = activeCustomComboId === customCombo.id;
          comboCard.className = `prompt-item custom-combo-selected-card${isActive ? ' selected' : ''}`;
          comboCard.dataset.customComboId = customCombo.id;
          comboCard.innerHTML = `
            <div class="prompt-item-swipe-content">
              <div class="prompt-item-body">
                <div class="custom-combo-selected-card-body">
                  <div class="custom-combo-selected-card-title">
                    ${isActive ? '<span class="custom-combo-selected-mark">✓</span>' : ''}
                    <span class="custom-combo-selected-card-order">${esc(customCombo.subCategory || '이름없는 커스텀 콤보')}</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="prompt-item-actions">
              <button class="edit-btn" title="편집" type="button">편집</button>
              <button class="del-btn" title="삭제" type="button">삭제</button>
            </div>
          `;
          comboCard.querySelector('.edit-btn')?.addEventListener('click', (event) => {
            event.stopPropagation();
            openEditCustomComboModal(customCombo);
          });
          comboCard.querySelector('.del-btn')?.addEventListener('click', (event) => {
            event.stopPropagation();
            deleteCustomCombo(customCombo);
          });
          bindPromptItemSwipe(comboCard, customCombo, {
            allowRightSwipeCommit: false,
            requireSwipeComposeMode: false,
            onTap: () => loadCustomCombo(customCombo),
          });
          container.appendChild(comboCard);
        });
      }
      if (customPreviewContainer) {
        customPreviewContainer.innerHTML = '';
        if (selectedCustomCombo.length === 0) {
          const empty = document.createElement('span');
          empty.className = 'empty-state';
          empty.textContent = '선택된 커스텀 조합이 없습니다';
          customPreviewContainer.appendChild(empty);
        } else {
          selectedCustomCombo.forEach((item, index) => {
            const card = document.createElement('div');
            card.className = 'custom-combo-flow-card';
            card.title = '이 커스텀 조합 카드를 제거합니다';
            const composedCategoryConfig = getComposedMainCategoryConfig(item.mainCategory);
            const composedCategoryEmoji = String(composedCategoryConfig.emoji || '').trim();
            card.innerHTML = `
              <span class="custom-combo-flow-order">${index + 1}</span>
              <span class="custom-combo-flow-label">${esc(item.subCategory || item.content || '커스텀 조합')}</span>
              <span class="custom-combo-flow-category">${composedCategoryEmoji ? `<span class="custom-combo-flow-category-emoji" aria-hidden="true">${esc(composedCategoryEmoji)}</span>` : ''}<span>${esc(item.mainCategory || '대분류 없음')}</span></span>
              <button class="chip-remove" title="제거" data-custom-combo-index="${index}">×</button>
            `;
            const removeBtn = card.querySelector('.chip-remove');
            if (removeBtn) {
              removeBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                selectedCustomCombo.splice(index, 1);
                render();
              });
            }
            card.addEventListener('click', (event) => {
              if (event.target.closest('.chip-remove')) return;
              openComposedPromptCardAndCopy(item.id);
            });
            customPreviewContainer.appendChild(card);

            if (index < selectedCustomCombo.length - 1) {
              const arrow = document.createElement('span');
              arrow.className = 'custom-combo-flow-arrow';
              arrow.setAttribute('aria-hidden', 'true');
              arrow.textContent = '↓';
              customPreviewContainer.appendChild(arrow);
            }
          });
        }
      }
      updateOutput();
      return;
    }

    if (customPreviewContainer) customPreviewContainer.innerHTML = '';

    if (selected.length === 0) {
      const e = document.createElement('span');
      e.id = 'chips-empty';
      e.className = 'empty-state';
      e.textContent = '선택된 프롬프트가 없습니다';
      container.appendChild(e);
    } else {
      const mainCategoryRank = new Map(categoryConfig.mainOrder.map((category, index) => [category, index]));
      const selectedForRender = selected
        .map((prompt, index) => ({ prompt, index }))
        .sort((a, b) => {
          const aMainRank = mainCategoryRank.get(a.prompt.mainCategory) ?? Number.MAX_SAFE_INTEGER;
          const bMainRank = mainCategoryRank.get(b.prompt.mainCategory) ?? Number.MAX_SAFE_INTEGER;
          if (aMainRank !== bMainRank) return aMainRank - bMainRank;

          const aSubOrder = getMainCategoryConfig(a.prompt.mainCategory).subOrder || [];
          const bSubOrder = getMainCategoryConfig(b.prompt.mainCategory).subOrder || [];
          const aSubRank = aSubOrder.indexOf(a.prompt.subCategory);
          const bSubRank = bSubOrder.indexOf(b.prompt.subCategory);
          if (aSubRank !== bSubRank) return aSubRank - bSubRank;

          return a.index - b.index;
        });

      selectedForRender.forEach(({ prompt: p, index: i }) => {
        const isCore = isSubCategoryCoreEnabled(p.mainCategory, p.subCategory);
        const chip = document.createElement('div');
        chip.className = `selected-chip${isCore ? ' core' : ''}`;
        chip.dataset.idx = i;
        chip.dataset.promptId = p.id;
        chip.title = '탭하면 중앙 목록의 해당 프롬프트 카드로 이동합니다';
        chip.innerHTML = `
          ${isCore ? '<span class="chip-core-mark">핵심</span>' : ''}
          <span class="chip-category-stack"><span class="chip-cat">${esc(p.mainCategory || p.category)}</span><span class="chip-cat">${esc(p.subCategory || '')}</span></span>
          <span class="chip-label">${esc(p.content)}</span>
          <button class="chip-remove" title="제거" onclick="removeSelected(${i})">×</button>
        `;
        const removeBtn = chip.querySelector('.chip-remove');
        if (removeBtn) {
          removeBtn.addEventListener('click', (event) => {
            event.stopPropagation();
          });
        }
        chip.addEventListener('click', (event) => {
          if (event.target.closest('.chip-remove')) return;
          jumpToPromptCardFromSelected(i);
        });
        if (isCore && coreContainer) {
          coreContainer.hidden = false;
          coreContainer.appendChild(chip);
        } else {
          container.appendChild(chip);
        }
      });
    }

    updateOutput();
  }

