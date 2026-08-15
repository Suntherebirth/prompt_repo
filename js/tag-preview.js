  function clearPromptDescriptionPreview(options = {}) {
    activePromptPreviewId = null;
    activePromptTagFilter = null;
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

  function renderPromptTagBrowser(preview) {
    const categoryPrompts = prompts.filter(prompt => (
      prompt.mainCategory === activeCategoryPrompt && prompt.subCategory === activeSubCategoryPrompt
    ));
    const tags = uniqueInOrder(categoryPrompts.flatMap(prompt => normalizePromptTags(prompt.tags)));
    const layout = getPromptTagLayout(tags);
    preview.classList.add('has-image');
    preview.classList.remove('image-clear-feedback', 'image-switch-feedback');
    preview.title = '';
    preview.innerHTML = tags.length
      ? `<div class="preview-tag-browser ${isPromptTagEditMode ? 'is-edit-mode' : ''}"><div class="preview-tag-browser-header"><div class="preview-tag-browser-title">[${esc(activeSubCategoryPrompt)}]의 태그</div><div class="preview-tag-browser-actions"><button class="preview-tag-mode-toggle" type="button" aria-pressed="${isPromptTagEditMode ? 'true' : 'false'}">${isPromptTagEditMode ? '기본 모드로 전환' : '편집 모드로 전환'}</button>${isPromptTagEditMode ? '<button class="preview-tag-divider-add" type="button">구분선 추가</button>' : ''}</div></div><div class="preview-tag-browser-layout">${layout.map((item, index) => item.type === 'divider'
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
      }, 600);
    });

    browser.addEventListener('pointermove', clearDividerPress);
    browser.addEventListener('pointerup', clearDividerPress);
    browser.addEventListener('pointercancel', clearDividerPress);

    let touchDragIndex = null;
    let touchDropIndex = null;
    let touchPointerId = null;
    let didTouchDrag = false;
    let suppressTagClickUntil = 0;

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
      const item = event.target.closest('.preview-tag-layout-item');
      if (!item) return;
      if (event.target.closest('.preview-tag-chip')) return;
      touchDragIndex = Number(item.dataset.layoutIndex);
      touchDropIndex = touchDragIndex;
      touchPointerId = event.pointerId;
      didTouchDrag = false;
      item.classList.add('is-dragging');
      try { item.setPointerCapture(event.pointerId); } catch {}
    });

    browser.addEventListener('pointermove', event => {
      if (event.pointerType !== 'touch' || touchPointerId !== event.pointerId || touchDragIndex === null) return;
      const swipeItem = event.target.closest('.preview-tag-swipe-item');
      const swipeDx = event.clientX - (swipeItem ? swipeItem._swipeStartX || event.clientX : event.clientX);
      if (swipeItem && swipeDx > 8) return;
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
      const moved = didTouchDrag;
      touchDragIndex = null;
      touchDropIndex = null;
      touchPointerId = null;
      didTouchDrag = false;
      browser.querySelectorAll('.is-dragging, .is-drag-over').forEach(element => {
        element.classList.remove('is-dragging', 'is-drag-over');
      });
      if (!moved || fromIndex === null || toIndex === null) return;
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

