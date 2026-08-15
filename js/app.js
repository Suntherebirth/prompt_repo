
  document.addEventListener('pointerdown', event => {
    const tagChip = event.target.closest?.('.preview-tag-swipe-item.is-swipe-action-visible .preview-tag-chip');
    const promptAction = event.target.closest?.('.prompt-item.actions-open .edit-btn, .prompt-item.actions-open .del-btn, .prompt-item .combo-card-choice-btn');
    const actionElement = tagChip || promptAction;
    const actionOwner = tagChip
      ? tagChip.closest('.preview-tag-swipe-item')
      : promptAction?.closest('.prompt-item');
    if (!actionElement || !isSwipeActionTransitioning(actionOwner)) return;
    event.preventDefault();
    event.stopPropagation();
    notifyInvalidSwipeTouch(actionOwner);
  }, true);

  function renderPromptTagImageGrid(preview, tag) {
    const taggedPrompts = prompts
      .filter(prompt => normalizePromptTags(prompt.tags).includes(tag));

    const getDescriptionParts = prompt => String(prompt.description || '')
      .split('|')
      .map(part => part.trim())
      .filter(Boolean);
    const getBirthDateValue = prompt => {
      const birthText = getDescriptionParts(prompt)[1] || '';
      const parsed = parseBirthDatePart(birthText);
      if (!parsed) return null;
      return Date.UTC(parsed.year, parsed.month - 1, parsed.day);
    };
    const getHeightValue = prompt => {
      const heightText = getDescriptionParts(prompt)[2] || '';
      const match = heightText.match(/(\d+(?:\.\d+)?)\s*cm/i);
      return match ? Number(match[1]) : null;
    };

    taggedPrompts.sort((a, b) => {
      if (activePromptTagSort === 'birth') {
        const birthA = getBirthDateValue(a);
        const birthB = getBirthDateValue(b);
        if (birthA !== null && birthB !== null && birthA !== birthB) return birthB - birthA;
        if (birthA !== null && birthB === null) return -1;
        if (birthA === null && birthB !== null) return 1;
      }
      if (activePromptTagSort === 'height') {
        const heightA = getHeightValue(a);
        const heightB = getHeightValue(b);
        if (heightA !== null && heightB !== null && heightA !== heightB) return heightB - heightA;
        if (heightA !== null && heightB === null) return -1;
        if (heightA === null && heightB !== null) return 1;
      }

      const descriptionA = getDescriptionParts(a)[0] || '';
      const descriptionB = getDescriptionParts(b)[0] || '';
      const firstCharacterOrder = (descriptionA[0] || '힣').localeCompare(descriptionB[0] || '힣', 'ko');
      if (firstCharacterOrder !== 0) return firstCharacterOrder;
      const descriptionOrder = descriptionA.localeCompare(descriptionB, 'ko');
      if (descriptionOrder !== 0) return descriptionOrder;
      return String(a.content || '').localeCompare(String(b.content || ''), 'ko');
    });

    const cards = taggedPrompts.map(prompt => {
      const imageSrc = getPromptImageSource(prompt);
      queuePromptImageLoad(prompt);
      const altText = prompt.imageName || getPromptDisplayName(prompt.mainCategory, prompt.subCategory);
      const descriptionParts = getDescriptionParts(prompt);
      if (descriptionParts[0]) descriptionParts[0] = formatDescriptionNamePart(descriptionParts[0]);
      if (descriptionParts[1]) descriptionParts[1] = formatDescriptionBirthPart(descriptionParts[1]);
      const descriptionLines = [];
      let currentDescriptionLine = '';
      descriptionParts.forEach(part => {
        const candidate = currentDescriptionLine ? `${currentDescriptionLine} | ${part}` : part;
        if (currentDescriptionLine && candidate.length > 14) {
          descriptionLines.push(currentDescriptionLine);
          currentDescriptionLine = part;
        } else {
          currentDescriptionLine = candidate;
        }
      });
      if (currentDescriptionLine) descriptionLines.push(currentDescriptionLine);
      const description = descriptionLines
        .map(line => `<span class="tag-image-description-part">${esc(line)}</span>`)
        .join('');
      return `<div class="preview-tag-image-card${shouldAnimatePromptTagGridEntry ? ' is-entering' : ''}" data-prompt-id="${esc(prompt.id)}" title="${esc(altText)}">${imageSrc
        ? `<img src="${imageSrc}" alt="${esc(altText)}" />`
        : '<span class="empty-state">이미지 로딩 중</span>'}<span class="tag-image-name">${esc(prompt.content)}</span>${description ? `<span class="tag-image-description">${description}</span>` : ''}</div>`;
    }).join('');

    preview.classList.add('has-image');
    preview.classList.remove('image-clear-feedback', 'image-switch-feedback');
    preview.title = `태그 이미지: ${tag}`;
    const sortLabel = activePromptTagSort === 'birth' ? '출생순' : activePromptTagSort === 'height' ? '신장순' : '이름순';
    const nextSortLabel = activePromptTagSort === 'birth' ? '이름순' : activePromptTagSort === 'name' ? '신장순' : '출생순';
    const randomToggleLabel = '무작위로 선택';
    const randomToggle = `<button class="preview-tag-grid-random-toggle" type="button" data-random-tag="${esc(tag)}" aria-label="${esc(tag)} 안에서 무작위로 선택">${randomToggleLabel}</button>`;
    if (cards) {
      preview.innerHTML = `<div class="preview-tag-image-grid${shouldAnimatePromptTagGridEntry ? ' is-entering' : ''}"><div class="preview-tag-grid-header${shouldAnimatePromptTagGridEntry ? ' is-entering' : ''}"><span class="preview-tag-chip">${esc(tag)}</span>${randomToggle}<button class="preview-tag-grid-sort-toggle" type="button" data-tag-sort="${activePromptTagSort}" aria-label="현재 ${sortLabel}. ${nextSortLabel}(으)로 정렬">${sortLabel}</button></div>${cards}</div>`;
    } else {
      preview.innerHTML = `<div class="preview-tag-image-grid${shouldAnimatePromptTagGridEntry ? ' is-entering' : ''}"><div class="preview-tag-grid-header${shouldAnimatePromptTagGridEntry ? ' is-entering' : ''}"><span class="preview-tag-chip">${esc(tag)}</span>${randomToggle}<button class="preview-tag-grid-sort-toggle" type="button" data-tag-sort="${activePromptTagSort}" aria-label="현재 ${sortLabel}. ${nextSortLabel}(으)로 정렬">${sortLabel}</button></div><span class="empty-state">이 태그가 연결된 이미지가 없습니다.</span></div>`;
    }
    shouldAnimatePromptTagGridEntry = false;
    const sortToggleButton = preview.querySelector('.preview-tag-grid-sort-toggle');
    if (sortToggleButton && shouldAnimatePromptTagSort) {
      sortToggleButton.classList.add('is-changing');
      shouldAnimatePromptTagSort = false;
    }
    lastRenderedPromptPreviewImageKey = `tag:${tag}`;
  }

  function jumpToPromptCardFromTagImage(prompt) {
    if (!prompt) return;
    activePromptTagFilter = null;
    lastRenderedPromptPreviewImageKey = '';
    activePromptPreviewId = prompt.id;
    isPromptPreviewSuppressed = false;
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

    requestAnimationFrame(() => {
      const target = document.querySelector(`.prompt-item[data-prompt-id="${prompt.id}"]`);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    });
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

  function normalizeComposedPrompt(item) {
    if (!item) return null;
    const mainCategory = (item.mainCategory ?? item.category ?? '').trim() || '커스텀 조합';
    const subCategory = (item.subCategory ?? item.name ?? '').trim() || '이름없음';
    let items = Array.isArray(item.items)
      ? item.items.map(normalizePrompt).filter(Boolean)
      : [];

    // 이전 포맷({category, content}) 호환: 단일 문자열을 1개 프롬프트 아이템으로 변환
    if (items.length === 0 && typeof item.content === 'string' && item.content.trim()) {
      items = [{
        id: uid(),
        mainCategory,
        subCategory,
        content: item.content.trim(),
      }];
    }

    if (items.length === 0) return null;

    return {
      id: item.id || uid(),
      mainCategory,
      subCategory,
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
  function render() {
    renderTapComposeToggle();
    renderCoreQuickAccessRow();
    renderPreviewAnimationLevel();
    renderPreviewTransitionMode();
    renderPromptPreviewSizeLevel();
    renderPreviewRenderMode();
    ensureActiveCategoryState();
    renderMainCategoryFilter();
    renderAddFilterTabs();
    renderComposedFilter();
    renderComposedLoadList();
    renderLibraryHeader();
    renderLibraryLayout();
    renderCategorySelectors();
    renderComposedCategorySelectors();
    syncAddFormSelection();
    renderPromptList();
    renderSelected();
    renderComposedModalItemEditor();
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

  function renderSelected() {
    const container = document.getElementById('selected-chips');
    if (!container) return;

    container.ondragover = dragOverSelectedContainer;
    container.ondrop = dropOnSelectedContainer;

    container.innerHTML = '';

    if (selected.length === 0) {
      const e = document.createElement('span');
      e.id = 'chips-empty';
      e.className = 'empty-state';
      e.textContent = '선택된 프롬프트가 없습니다';
      container.appendChild(e);
    } else {
      const selectedForRender = selected
        .map((prompt, index) => ({ prompt, index }))
        .sort((a, b) => {
          const aIsCore = isSubCategoryCoreEnabled(a.prompt.mainCategory, a.prompt.subCategory);
          const bIsCore = isSubCategoryCoreEnabled(b.prompt.mainCategory, b.prompt.subCategory);
          return Number(bIsCore) - Number(aIsCore);
        });

      selectedForRender.forEach(({ prompt: p, index: i }) => {
        const isCore = isSubCategoryCoreEnabled(p.mainCategory, p.subCategory);
        const chip = document.createElement('div');
        chip.className = `selected-chip${isCore ? ' core' : ''}`;
        chip.draggable = true;
        chip.dataset.idx = i;
        chip.title = '탭하면 중앙 목록의 해당 프롬프트 카드로 이동합니다';
        chip.innerHTML = `
          ${isCore ? '<span class="chip-core-mark">핵심</span>' : ''}
          <span class="chip-cat">${esc(p.mainCategory || p.category)}</span>
          <span class="chip-cat" style="color:#8ab4ff">${esc(p.subCategory || '')}</span>
          <span>${esc(p.content)}</span>
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
        chip.addEventListener('dragstart', dragStart);
        chip.addEventListener('dragend', dragEnd);
        chip.addEventListener('dragover', dragOver);
        chip.addEventListener('drop', drop);
        chip.addEventListener('dragleave', dragLeave);
        chip.addEventListener('pointerdown', chipPointerDown);
        chip.addEventListener('pointermove', chipPointerMove);
        chip.addEventListener('pointerup', chipPointerEnd);
        chip.addEventListener('pointercancel', chipPointerEnd);
        container.appendChild(chip);
      });
    }

    updateOutput();
  }

