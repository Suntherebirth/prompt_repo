  function clearPromptDescriptionPreview(options = {}) {
    activePromptPreviewId = null;
    activePromptTagFilter = null;
    activePromptTagBrowser = false;
    selectingFromPreviewId = null;
    isPromptPreviewSuppressed = true;
    if (options.feedback) {
      shouldAnimatePromptPreviewClear = true;
    }
  }

  function formatDescriptionNamePart(name) {
    const trimmedName = String(name || '').trim();
    const compactName = trimmedName.replace(/\s+/g, '');
    const characters = Array.from(compactName);
    if (characters.length !== 3) return trimmedName;
    return characters.join(' ');
  }

  function parseBirthDatePart(text) {
    const match = String(text || '').match(/^\s*(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일(?:\s*\(\s*\d+\s*세\s*\))?\s*$/);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const birthDate = new Date(year, month - 1, day);
    if (
      birthDate.getFullYear() !== year
      || birthDate.getMonth() !== month - 1
      || birthDate.getDate() !== day
    ) {
      return null;
    }
    return { year, month, day, date: birthDate };
  }

  function calculateAgeFromBirthDate(birthDate) {
    // 브라우저가 실행 중인 기기의 로컬 시스템 날짜/시간을 기준으로 만 나이를 계산한다.
    const now = new Date();
    let age = now.getFullYear() - birthDate.getFullYear();
    const hasHadBirthdayThisYear = (
      now.getMonth() > birthDate.getMonth()
      || (now.getMonth() === birthDate.getMonth() && now.getDate() >= birthDate.getDate())
    );
    if (!hasHadBirthdayThisYear) age -= 1;
    return Math.max(0, age);
  }

  function formatDescriptionBirthPart(part) {
    const parsed = parseBirthDatePart(part);
    if (!parsed) return String(part || '').trim();
    const age = calculateAgeFromBirthDate(parsed.date);
    return `${parsed.year}년 ${parsed.month}월 ${parsed.day}일 (${age}세)`;
  }

  function formatPromptDescriptionForDisplay(description) {
    const parts = String(description || '').split('|').map(part => part.trim());
    if (parts[0]) parts[0] = formatDescriptionNamePart(parts[0]);
    if (parts[1]) parts[1] = formatDescriptionBirthPart(parts[1]);
    return parts.join(' | ').trim();
  }

  function renderPromptTagImageCards(promptItems, animateEntry = false) {
    return promptItems.map(prompt => {
      const imageSrc = getPromptImageSource(prompt);
      queuePromptImageLoad(prompt);
      const altText = prompt.imageName || getPromptDisplayName(prompt.mainCategory, prompt.subCategory);
      const descriptionParts = String(prompt.description || '')
        .split('|')
        .map(part => part.trim())
        .filter(Boolean);
      if (descriptionParts[0]) descriptionParts[0] = formatDescriptionNamePart(descriptionParts[0]);
      if (descriptionParts[1]) descriptionParts[1] = formatDescriptionBirthPart(descriptionParts[1]);
      const descriptionLines = [];
      if (isLargeItemGridEnabled && descriptionParts.length >= 2) {
        descriptionLines.push(`${descriptionParts[0]} | ${descriptionParts[1]}`);
        if (descriptionParts.length > 2) descriptionLines.push(descriptionParts.slice(2).join(' | '));
      } else {
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
      }
      const description = descriptionLines
        .map(line => `<span class="tag-image-description-part">${esc(line)}</span>`)
        .join('');
      return `<div class="preview-tag-image-card is-prompt-card${animateEntry ? ' is-entering' : ''}" data-prompt-id="${esc(prompt.id)}" title="${esc(altText)}">${imageSrc
        ? `<img src="${imageSrc}" alt="${esc(altText)}" />`
        : '<span class="empty-state">이미지 로딩 중</span>'}<span class="tag-image-name">${esc(prompt.content)}</span>${description ? `<span class="tag-image-description">${description}</span>` : ''}<button class="preview-tag-image-select-btn" type="button" aria-label="${esc(prompt.content)} 프롬프트 선택">프롬프트 선택</button></div>`;
    }).join('');
  }

  function renderSelectedPromptGrid(preview, selectedPrompts) {
    const mainCategoryRank = new Map(categoryConfig.mainOrder.map((category, index) => [category, index]));
    const sortedPrompts = [...selectedPrompts].sort((a, b) => {
      const aMainRank = mainCategoryRank.get(a.mainCategory) ?? Number.MAX_SAFE_INTEGER;
      const bMainRank = mainCategoryRank.get(b.mainCategory) ?? Number.MAX_SAFE_INTEGER;
      if (aMainRank !== bMainRank) return aMainRank - bMainRank;

      const aSubOrder = getMainCategoryConfig(a.mainCategory).subOrder || [];
      const bSubOrder = getMainCategoryConfig(b.mainCategory).subOrder || [];
      const aSubRank = aSubOrder.indexOf(a.subCategory);
      const bSubRank = bSubOrder.indexOf(b.subCategory);
      return aSubRank - bSubRank;
    });
    const cards = sortedPrompts.map(prompt => {
      const isCore = isSubCategoryCoreEnabled(prompt.mainCategory, prompt.subCategory);
      const isWideCard = isCore && isCoreCategoryWideCardEnabled;
      const forceOrientation = isWideCard ? 'landscape' : undefined;
      const imageSrc = getPromptImageSource(prompt, forceOrientation);
      queuePromptImageLoad(prompt, forceOrientation);
      const altText = prompt.imageName || getPromptDisplayName(prompt.mainCategory, prompt.subCategory);
      const description = [prompt.mainCategory, prompt.subCategory].filter(Boolean).join(' · ');
      return `<div class="preview-tag-image-card is-prompt-card is-composition-selected${isCore ? ' is-composition-core' : ''}${isWideCard ? ' is-composition-core-wide' : ''}" data-prompt-id="${esc(prompt.id)}" title="${esc(altText)}">${imageSrc
        ? `<img src="${imageSrc}" alt="${esc(altText)}" />`
        : '<span class="empty-state">이미지 로딩 중</span>'}${isCore ? '<span class="preview-composition-core-mark">핵심</span>' : ''}<span class="tag-image-name">${esc(prompt.content)}</span>${(!isWideCard && description) ? `<span class="tag-image-description"><span class="tag-image-description-part">${esc(description)}</span></span>` : ''}<button class="preview-composition-remove-btn" type="button" aria-label="${esc(prompt.content)} 선택 제외">×</button></div>`;
    }).join('');

    preview.classList.add('has-image');
    preview.classList.remove('image-clear-feedback', 'image-switch-feedback');
    preview.title = '현재 조합에 선택된 프롬프트입니다';
    preview.innerHTML = `<div class="preview-tag-image-grid is-prompt-grid"><div class="preview-tag-grid-header"><span class="preview-tag-grid-category-chip cat-chip active is-prompt">현재 조합</span><span class="tag-image-grid-total">${sortedPrompts.length}개</span></div>${cards}</div>`;
    bindPromptTagImageCardSwipe(preview);
    lastRenderedPromptPreviewImageKey = `selected:${sortedPrompts.map(prompt => prompt.id).join(',')}`;
  }

  function sortPromptsForTagGrid(promptItems) {
    const getDescriptionParts = prompt => String(prompt.description || '')
      .split('|')
      .map(part => part.trim())
      .filter(Boolean);
    const getBirthDateValue = prompt => {
      const birthText = getDescriptionParts(prompt)[1] || '';
      const parsed = parseBirthDatePart(birthText);
      return parsed ? Date.UTC(parsed.year, parsed.month - 1, parsed.day) : null;
    };
    const getHeightValue = prompt => {
      const heightText = getDescriptionParts(prompt)[2] || '';
      const match = heightText.match(/(\d+(?:\.\d+)?)\s*cm/i);
      return match ? Number(match[1]) : null;
    };

    return [...promptItems].sort((a, b) => {
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
  }

  function renderPromptCategoryGrid(preview) {
    let categoryPrompts = prompts.filter(prompt => (
      prompt.mainCategory === activeCategoryPrompt && prompt.subCategory === activeSubCategoryPrompt
    )).sort((a, b) => {
      const aText = String(a.content || '').localeCompare(String(b.content || ''), 'ko');
      if (aText !== 0) return aText;
      return String(a.id || '').localeCompare(String(b.id || ''), 'ko');
    });

    preview.classList.add('has-image');
    preview.classList.remove('image-clear-feedback', 'image-switch-feedback');
    preview.title = '';

    if (!categoryPrompts.length) {
      preview.innerHTML = '<span class="empty-state">이 중분류에 등록된 프롬프트가 없습니다.</span>';
      lastRenderedPromptPreviewImageKey = '';
      return;
    }

    const usesTagGridCards = isSubCategoryCoreEnabled(activeCategoryPrompt, activeSubCategoryPrompt);
    if (usesTagGridCards) categoryPrompts = sortPromptsForTagGrid(categoryPrompts);
    const cards = usesTagGridCards
      ? renderPromptTagImageCards(categoryPrompts)
      : categoryPrompts.map(prompt => {
      const imageSrc = getPromptImageSource(prompt);
      queuePromptImageLoad(prompt);
      const altText = prompt.imageName || getPromptDisplayName(prompt.mainCategory, prompt.subCategory);
      return `<div class="preview-tag-image-card is-prompt-card is-category-name-only" data-prompt-id="${esc(prompt.id)}" title="${esc(altText)}">${imageSrc
        ? `<img src="${imageSrc}" alt="${esc(altText)}" />`
        : '<span class="empty-state">이미지 로딩 중</span>'}<span class="tag-image-name">${esc(prompt.content)}</span><button class="preview-tag-image-select-btn" type="button" aria-label="${esc(prompt.content)} 프롬프트 선택">프롬프트 선택</button></div>`;
    }).join('');

    const categoryDescription = getSubCategoryDescription(activeCategoryPrompt, activeSubCategoryPrompt);
    const descriptionMarkup = categoryDescription
      ? `<div class="preview-tag-grid-description">${esc(categoryDescription)}</div>`
      : '';
    const mainCategoryEmoji = leftPanelTab === 'prompt'
      ? String(getMainCategoryConfig(activeCategoryPrompt).emoji || '').trim()
      : '';
    const categoryEmojiMarkup = mainCategoryEmoji
      ? `<span class="preview-tag-category-emoji" aria-hidden="true">${esc(mainCategoryEmoji)}</span>`
      : '';
    const categoryChipLabel = esc(activeSubCategoryPrompt || activeCategoryPrompt || '카테고리');
    const sortLabel = activePromptTagSort === 'birth' ? '출생순' : activePromptTagSort === 'height' ? '신장순' : '이름순';
    const nextSortLabel = activePromptTagSort === 'birth' ? '이름순' : activePromptTagSort === 'name' ? '신장순' : '출생순';
    const sortToggleMarkup = usesTagGridCards
      ? `<button class="preview-tag-grid-sort-toggle${shouldAnimatePromptTagSort ? ' is-changing' : ''}" type="button" data-tag-sort="${activePromptTagSort}" aria-label="현재 ${sortLabel}. ${nextSortLabel}(으)로 정렬">${sortLabel}</button>`
      : '';
    shouldAnimatePromptTagSort = false;
    preview.innerHTML = `<div class="preview-tag-image-grid is-prompt-grid${usesTagGridCards ? ' is-core-category-grid' : ''}"><div class="preview-tag-grid-header">${categoryEmojiMarkup}<span class="preview-tag-grid-category-chip cat-chip active is-prompt">${categoryChipLabel}</span><span class="tag-image-grid-total">${categoryPrompts.length}개</span>${sortToggleMarkup}${descriptionMarkup}</div>${cards}</div>`;

    // 클릭 처리는 태그 그리드와 동일하게 main.js의 위임 리스너에 맡겨 카드마다 리스너/조회를 반복하지 않는다.
    bindPromptTagImageCardSwipe(preview);
    lastRenderedPromptPreviewImageKey = `category:${activeCategoryPrompt}:${activeSubCategoryPrompt}`;
  }

  function renderPromptTagBrowser(preview) {
    const categoryPrompts = prompts.filter(prompt => (
      prompt.mainCategory === activeCategoryPrompt && prompt.subCategory === activeSubCategoryPrompt
    ));
    const tags = uniqueInOrder(categoryPrompts.flatMap(prompt => normalizePromptTags(prompt.tags)));
    if (!tags.length) {
      // 태그가 없는 중분류는 빈 태그 그리드를 보여주지 않고 바로 전체 아이템 그리드로 넘어간다.
      activePromptCategoryGridMode = true;
      renderPromptCategoryGrid(preview);
      return;
    }
    const layout = getPromptTagLayout(tags);
    const categoryTheme = leftPanelTab === 'combo'
      ? (isCustomComboTabOpen ? 'is-custom-combo' : 'is-combo')
      : 'is-prompt';
    const mainCategoryEmoji = leftPanelTab === 'prompt'
      ? String(getMainCategoryConfig(activeCategoryPrompt).emoji || '').trim()
      : '';
    const tagBrowserEmojiMarkup = mainCategoryEmoji
      ? `<span class="preview-tag-category-emoji" aria-hidden="true">${esc(mainCategoryEmoji)}</span>`
      : '';
    const tagBrowserCategoryLabel = esc(activeSubCategoryPrompt);
    preview.classList.add('has-image');
    preview.classList.remove('image-clear-feedback', 'image-switch-feedback');
    preview.title = '';
    preview.innerHTML = tags.length
      ? `<div class="preview-tag-browser ${isPromptTagEditMode ? 'is-edit-mode' : ''}"><div class="preview-tag-browser-header"><div class="preview-tag-browser-title">${tagBrowserEmojiMarkup}<span class="preview-tag-browser-category-chip cat-chip active ${categoryTheme}">${tagBrowserCategoryLabel}</span><span class="preview-tag-browser-title-suffix">의 태그</span></div><div class="preview-tag-browser-actions">${isPromptTagEditMode ? '<button class="preview-tag-divider-add" type="button">구분선 추가</button>' : ''}<button class="preview-tag-mode-toggle" type="button" aria-pressed="${isPromptTagEditMode ? 'true' : 'false'}">${isPromptTagEditMode ? '기본 모드로 전환' : '편집 모드로 전환'}</button></div></div><div class="preview-tag-browser-layout">${layout.map((item, index) => item.type === 'divider'
        ? `<div class="preview-tag-divider preview-tag-layout-item" ${isPromptTagEditMode ? 'draggable="true"' : ''} data-layout-index="${index}"><button class="preview-tag-divider-remove" type="button" data-divider-id="${esc(item.id)}" aria-label="구분선 삭제">×</button></div>`
        : `<span class="preview-tag-swipe-item preview-tag-layout-item" ${isPromptTagEditMode ? 'draggable="true"' : ''} data-layout-index="${index}"><button class="preview-tag-chip" type="button" data-tag="${esc(item.tag)}" title="${isPromptTagEditMode ? '드래그하여 순서 변경' : ''}">${esc(item.tag)}</button></span>`).join('')}</div></div>`
      : '<span class="empty-state">이 중분류에 등록된 태그가 없습니다.</span>';
    if (tags.length) bindPromptTagLayoutInteractions(preview, layout);
    lastRenderedPromptPreviewImageKey = '';
  }

  function bindPromptTagLayoutInteractions(preview, layout) {
    const browser = preview.querySelector('.preview-tag-browser');
    const modeToggle = preview.querySelector('.preview-tag-mode-toggle');
    const addButton = preview.querySelector('.preview-tag-divider-add');
    if (!browser || !modeToggle) return;

    modeToggle.addEventListener('click', event => {
      event.stopPropagation();
      isPromptTagEditMode = !isPromptTagEditMode;
      promptTagDragIndex = null;
      renderPromptDescriptionPreview();
    });

    if (!isPromptTagEditMode) {
      bindPreviewTagSwipe(browser, '.preview-tag-swipe-item');
      return;
    }
    if (!addButton) return;

    const moveLayoutItem = (fromIndex, toIndex) => {
      if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
      const nextLayout = [...layout];
      const [movedItem] = nextLayout.splice(fromIndex, 1);
      if (!movedItem) return;
      nextLayout.splice(toIndex, 0, movedItem);
      savePromptTagLayout(nextLayout);
      renderPromptDescriptionPreview();
    };

    addButton.addEventListener('click', event => {
      event.stopPropagation();
      savePromptTagLayout([...layout, { type: 'divider', id: uid() }]);
      renderPromptDescriptionPreview();
    });

    browser.addEventListener('click', event => {
      const removeButton = event.target.closest('.preview-tag-divider-remove');
      if (!removeButton) return;
      event.stopPropagation();
      savePromptTagLayout(layout.filter(item => item.id !== removeButton.dataset.dividerId));
      renderPromptDescriptionPreview();
    });

    let dividerPressTimer = null;
    let pressedDivider = null;
    const clearDividerPress = () => {
      if (dividerPressTimer) window.clearTimeout(dividerPressTimer);
      dividerPressTimer = null;
      pressedDivider = null;
    };

    browser.addEventListener('pointerdown', event => {
      const divider = event.target.closest('.preview-tag-divider');
      if (!divider || event.target.closest('.preview-tag-divider-remove')) return;
      clearDividerPress();
      pressedDivider = divider;
      dividerPressTimer = window.setTimeout(() => {
        if (pressedDivider === divider) divider.classList.add('is-delete-visible');
        clearDividerPress();
      }, LONG_PRESS_DURATION_MS);
    });

    browser.addEventListener('pointermove', clearDividerPress);
    browser.addEventListener('pointerup', clearDividerPress);
    browser.addEventListener('pointercancel', clearDividerPress);

    let touchDragIndex = null;
    let touchDropIndex = null;
    let touchPointerId = null;
    let touchDragPressTimer = null;
    let touchDragItem = null;
    let isTouchTagDragActive = false;
    let touchDragStartX = 0;
    let touchDragStartY = 0;
    let didTouchDrag = false;
    let suppressTagClickUntil = 0;

    const clearTouchTagDragPress = () => {
      if (touchDragPressTimer) window.clearTimeout(touchDragPressTimer);
      touchDragPressTimer = null;
    };

    const resetTouchTagDrag = () => {
      clearTouchTagDragPress();
      touchDragIndex = null;
      touchDropIndex = null;
      touchPointerId = null;
      touchDragItem = null;
      isTouchTagDragActive = false;
      touchDragStartX = 0;
      touchDragStartY = 0;
      didTouchDrag = false;
      browser.querySelectorAll('.is-dragging, .is-drag-over').forEach(element => {
        element.classList.remove('is-dragging', 'is-drag-over');
      });
    };

    browser.querySelectorAll('.preview-tag-layout-item').forEach(item => {
      item.addEventListener('dragover', event => {
        if (promptTagDragIndex === null) return;
        event.preventDefault();
        event.stopPropagation();
        browser.querySelectorAll('.is-drag-over').forEach(element => element.classList.remove('is-drag-over'));
        if (Number(item.dataset.layoutIndex) !== promptTagDragIndex) item.classList.add('is-drag-over');
      });

      item.addEventListener('drop', event => {
        if (promptTagDragIndex === null) return;
        event.preventDefault();
        event.stopPropagation();
        moveLayoutItem(promptTagDragIndex, Number(item.dataset.layoutIndex));
        promptTagDragIndex = null;
      });
    });

    browser.addEventListener('pointerdown', event => {
      if (event.pointerType !== 'touch') return;
      const item = event.target.closest('.preview-tag-swipe-item');
      if (!item) return;
      resetTouchTagDrag();
      touchDragIndex = Number(item.dataset.layoutIndex);
      touchDropIndex = touchDragIndex;
      touchPointerId = event.pointerId;
      touchDragItem = item;
      touchDragStartX = event.clientX;
      touchDragStartY = event.clientY;
      touchDragPressTimer = window.setTimeout(() => {
        if (touchDragIndex === null || touchPointerId !== event.pointerId || touchDragItem !== item) return;
        isTouchTagDragActive = true;
        item.classList.add('is-dragging');
        signalDragReady(item);
        try { item.setPointerCapture(event.pointerId); } catch {}
      }, LONG_PRESS_DURATION_MS);
    });

    browser.addEventListener('pointermove', event => {
      if (event.pointerType !== 'touch' || touchPointerId !== event.pointerId || touchDragIndex === null) return;
      if (!isTouchTagDragActive) {
        const movedDistance = Math.hypot(event.clientX - touchDragStartX, event.clientY - touchDragStartY);
        if (movedDistance >= LONG_PRESS_MOVE_TOLERANCE_PX) resetTouchTagDrag();
        return;
      }
      const pointed = document.elementFromPoint(event.clientX, event.clientY);
      const target = pointed?.closest('.preview-tag-layout-item');
      if (!target) return;
      const targetIndex = Number(target.dataset.layoutIndex);
      if (targetIndex === touchDragIndex) return;
      event.preventDefault();
      didTouchDrag = true;
      touchDropIndex = targetIndex;
      browser.querySelectorAll('.is-drag-over').forEach(element => element.classList.remove('is-drag-over'));
      target.classList.add('is-drag-over');
    });

    const finishTouchDrag = event => {
      if (event.pointerType !== 'touch' || touchPointerId !== event.pointerId) return;
      const fromIndex = touchDragIndex;
      const toIndex = touchDropIndex;
      const wasTouchTagDragActive = isTouchTagDragActive;
      const moved = didTouchDrag;
      clearTouchTagDragPress();
      if (wasTouchTagDragActive && typeof event.currentTarget.releasePointerCapture === 'function') {
        try { event.currentTarget.releasePointerCapture(event.pointerId); } catch {}
      }
      resetTouchTagDrag();
      if (!wasTouchTagDragActive || !moved || fromIndex === null || toIndex === null) return;
      suppressTagClickUntil = Date.now() + 350;
      moveLayoutItem(fromIndex, toIndex);
    };

    browser.addEventListener('pointerup', finishTouchDrag);
    browser.addEventListener('pointercancel', finishTouchDrag);
    browser.addEventListener('click', event => {
      if (Date.now() < suppressTagClickUntil && event.target.closest('.preview-tag-layout-item')) {
        event.preventDefault();
        event.stopPropagation();
      }
    }, true);

    browser.addEventListener('dragstart', event => {
      const item = event.target.closest('.preview-tag-layout-item');
      if (!item) return;
      clearDividerPress();
      promptTagDragIndex = Number(item.dataset.layoutIndex);
      item.classList.add('is-dragging');
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(promptTagDragIndex));
    });

    browser.addEventListener('dragend', () => {
      promptTagDragIndex = null;
      browser.querySelectorAll('.is-dragging, .is-drag-over').forEach(element => {
        element.classList.remove('is-dragging', 'is-drag-over');
      });
    });

  }

  function bindPreviewTagSwipe(container, selector) {
    if (!container) return;
    let pointerId = null;
    let activeItem = null;
    let startX = 0;
    let startY = 0;
    let swiping = false;

    const triggerSwipeMissFeedback = item => {
      if (!item) return;
      item.classList.remove('swipe-miss-feedback');
      void item.offsetWidth;
      item.classList.add('swipe-miss-feedback');
      window.setTimeout(() => item.classList.remove('swipe-miss-feedback'), 300);
      if (typeof navigator.vibrate === 'function') navigator.vibrate(18);
    };

    const clearSwipe = () => {
      if (activeItem) activeItem._swipeStartX = 0;
      pointerId = null;
      activeItem = null;
      swiping = false;
    };

    const hideSwipeAction = item => {
      if (!item) return;
      const chip = item.querySelector('.preview-tag-chip');
      item.classList.remove('is-swipe-action-visible');
      if (chip) {
        chip.textContent = chip.dataset.tag || '';
        chip.style.removeProperty('--preview-tag-swipe-width');
        chip.removeAttribute('aria-label');
      }
    };

    container.addEventListener('pointerdown', event => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      const item = event.target.closest(selector);
      if (!item || !event.target.closest('.preview-tag-chip')) return;
      container.querySelectorAll(`${selector}.is-swipe-action-visible`).forEach(other => {
        if (other !== item) hideSwipeAction(other);
      });
      pointerId = event.pointerId;
      activeItem = item;
      activeItem._swipeStartX = event.clientX;
      startX = event.clientX;
      startY = event.clientY;
      swiping = false;
      try { item.setPointerCapture(event.pointerId); } catch {}
    });

    container.addEventListener('pointermove', event => {
      if (event.pointerId !== pointerId || !activeItem) return;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      if (!swiping) {
        if (Math.abs(dx) < 8) return;
        if (Math.abs(dx) <= Math.abs(dy) || dx < 0) {
          hideSwipeAction(activeItem);
          clearSwipe();
          return;
        }
        swiping = true;
      }
      event.preventDefault();
      if (dx >= 36) {
        const chip = activeItem.querySelector('.preview-tag-chip');
        const wasActionVisible = activeItem.classList.contains('is-swipe-action-visible');
        activeItem.classList.add('is-swipe-action-visible');
        if (chip) {
          if (!wasActionVisible) {
            activeItem._swipeActionTransitionUntil = performance.now() + 320;
            chip.style.setProperty('--preview-tag-swipe-width', `${chip.offsetWidth}px`);
            chip.textContent = '🎲';
          }
          chip.setAttribute('aria-label', `${chip.dataset.tag} 안에서 무작위로 선택`);
        }
      }
    });

    const finishSwipe = event => {
      if (event.pointerId !== pointerId) return;
      if (swiping) event.preventDefault();
      const swipeDx = activeItem ? event.clientX - startX : 0;
      if (swiping && swipeDx > 0 && swipeDx < 36) triggerSwipeMissFeedback(activeItem);
      clearSwipe();
    };

    container.addEventListener('pointerup', finishSwipe);
    container.addEventListener('pointercancel', finishSwipe);
  }

  function commitPreviewTagRandomSelection(item, chip) {
    if (!item || !chip || item.classList.contains('swipe-commit')) return;
    const tag = chip.dataset.tag || '';
    if (!tag) return;
    item.classList.add('swipe-commit');
    chip.style.transition = 'none';
    chip.style.transform = 'translateX(0) scale(1)';
    chip.style.opacity = '1';
    chip.style.filter = 'saturate(1)';

    requestAnimationFrame(() => {
      chip.style.transition = 'transform .32s cubic-bezier(0.16, 1, 0.3, 1), opacity .24s ease-out, filter .28s ease-out';
      chip.style.transform = 'translateX(40px) scale(0.972)';
      chip.style.opacity = '0';
      chip.style.filter = 'saturate(1.05)';
    });

    window.setTimeout(() => {
      activePromptTagSort = 'name';
      activePromptTagFilter = tag;
      isPromptPreviewSuppressed = false;
      applyRandomSelectionForActiveTag();
    }, 80);
  }

  function bindPromptTagImageCardSwipe(preview) {
    if (!preview || preview._tagImageCardSwipeBound) return;
    preview._tagImageCardSwipeBound = true;
    let pointerId = null;
    let activeCard = null;
    let startX = 0;
    let startY = 0;
    let swiping = false;

    preview.addEventListener('pointerdown', event => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      const card = event.target.closest('.preview-tag-image-card');
      if (!card || event.target.closest('.preview-tag-image-select-btn, .preview-composition-remove-btn')) return;
      pointerId = event.pointerId;
      activeCard = card;
      startX = event.clientX;
      startY = event.clientY;
      swiping = false;
      try { card.setPointerCapture(event.pointerId); } catch {}
    });

    preview.addEventListener('pointermove', event => {
      if (event.pointerId !== pointerId || !activeCard) return;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      if (!swiping) {
        if (Math.abs(dx) < 8) return;
        if (Math.abs(dx) <= Math.abs(dy) || dx < 0) {
          pointerId = null;
          activeCard = null;
          return;
        }
        swiping = true;
      }
      event.preventDefault();
      if (dx < 36) return;
      preview.querySelectorAll('.preview-tag-image-card.is-swipe-action-visible').forEach(card => {
        if (card !== activeCard) card.classList.remove('is-swipe-action-visible');
      });
      if (!activeCard.classList.contains('is-swipe-action-visible')) {
        activeCard.classList.add('is-swipe-action-visible');
        activeCard._swipeActionTransitionUntil = performance.now() + 240;
      }
    });

    const finishSwipe = event => {
      if (event.pointerId !== pointerId || !activeCard) return;
      const card = activeCard;
      if (swiping) {
        event.preventDefault();
        card._swipeClickSuppressUntil = Date.now() + 350;
        if (!card.classList.contains('is-swipe-action-visible')) notifyInvalidSwipeTouch(card);
      }
      pointerId = null;
      activeCard = null;
      swiping = false;
    };

    preview.addEventListener('pointerup', finishSwipe);
    preview.addEventListener('pointercancel', finishSwipe);
  }

  function selectPromptFromTagImage(prompt) {
    if (!prompt) return;
    activePromptCategoryGridMode = false;
    activePromptTagFilter = null;
    activePromptTagBrowser = false;
    activePromptPreviewId = prompt.id;
    isPromptPreviewSuppressed = false;
    if (isSubCategoryCoreEnabled(prompt.mainCategory, prompt.subCategory)) {
      selected = selected.filter(item => !(item.source === 'prompt'
        && item.mainCategory === prompt.mainCategory
        && item.subCategory === prompt.subCategory));
    }
    const added = addPromptToComposition(prompt, { suppressToast: true });
    if (!added) return;
    copyPromptSilently(getComposedOutputText())
      .then(copied => {
        showToast(copied ? '선택한 프롬프트가 조합에 추가되고 클립보드에 복사되었습니다' : '선택한 프롬프트는 추가되었지만 복사에 실패했습니다');
      })
      .catch(() => showToast('선택한 프롬프트는 추가되었지만 복사에 실패했습니다'));
  }

  function isSwipeActionTransitioning(element) {
    return Number(element?._swipeActionTransitionUntil || 0) > performance.now();
  }

  function notifyInvalidSwipeTouch(element) {
    if (!element) return;
    element.classList.remove('swipe-miss-feedback');
    void element.offsetWidth;
    element.classList.add('swipe-miss-feedback');
    window.setTimeout(() => element.classList.remove('swipe-miss-feedback'), 300);
    if (typeof navigator.vibrate === 'function') navigator.vibrate(18);
  }

  function renderPromptTagImageGrid(preview, tag) {
    const taggedPrompts = prompts
      .filter(prompt => normalizePromptTags(prompt.tags).includes(tag));
    const sortedPrompts = sortPromptsForTagGrid(taggedPrompts);

    const cards = renderPromptTagImageCards(sortedPrompts, shouldAnimatePromptTagGridEntry);

    preview.classList.add('has-image');
    preview.classList.remove('image-clear-feedback', 'image-switch-feedback');
    preview.title = `태그 이미지: ${tag}`;
    const sortLabel = activePromptTagSort === 'birth' ? '출생순' : activePromptTagSort === 'height' ? '신장순' : '이름순';
    const nextSortLabel = activePromptTagSort === 'birth' ? '이름순' : activePromptTagSort === 'name' ? '신장순' : '출생순';
    const randomToggleLabel = '무작위로 선택';
    const randomToggle = `<button class="preview-tag-grid-random-toggle" type="button" data-random-tag="${esc(tag)}" aria-label="${esc(tag)} 안에서 무작위로 선택">${randomToggleLabel}</button>`;
    if (cards) {
      preview.innerHTML = `<div class="preview-tag-image-grid is-tag-filter-grid${shouldAnimatePromptTagGridEntry ? ' is-entering' : ''}"><div class="preview-tag-grid-header${shouldAnimatePromptTagGridEntry ? ' is-entering' : ''}"><span class="preview-tag-chip">${esc(tag)}</span>${randomToggle}<button class="preview-tag-grid-sort-toggle" type="button" data-tag-sort="${activePromptTagSort}" aria-label="현재 ${sortLabel}. ${nextSortLabel}(으)로 정렬">${sortLabel}</button></div>${cards}</div>`;
    } else {
      preview.innerHTML = `<div class="preview-tag-image-grid is-tag-filter-grid${shouldAnimatePromptTagGridEntry ? ' is-entering' : ''}"><div class="preview-tag-grid-header${shouldAnimatePromptTagGridEntry ? ' is-entering' : ''}"><span class="preview-tag-chip">${esc(tag)}</span>${randomToggle}<button class="preview-tag-grid-sort-toggle" type="button" data-tag-sort="${activePromptTagSort}" aria-label="현재 ${sortLabel}. ${nextSortLabel}(으)로 정렬">${sortLabel}</button></div><span class="empty-state">이 태그가 연결된 이미지가 없습니다.</span></div>`;
    }
    shouldAnimatePromptTagGridEntry = false;
    const sortToggleButton = preview.querySelector('.preview-tag-grid-sort-toggle');
    if (sortToggleButton && shouldAnimatePromptTagSort) {
      sortToggleButton.classList.add('is-changing');
      shouldAnimatePromptTagSort = false;
    }
    bindPromptTagImageCardSwipe(preview);
    lastRenderedPromptPreviewImageKey = `tag:${tag}`;
  }

  function jumpToPromptCardFromTagImage(prompt) {
    if (!prompt) return;
    activePromptTagFilter = null;
    activePromptTagBrowser = false;
    activePromptCategoryGridMode = false;
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
      scrollSelectedPromptChipIntoView(prompt.id);
      const target = document.querySelector(`.prompt-item[data-prompt-id="${prompt.id}"]`);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    });
  }

