  function renderPromptDescriptionPreview() {
    const preview = document.getElementById('prompt-description-preview');
    if (!preview) return;

    const prompt = isPromptPreviewSuppressed
      ? null
      : (prompts.find(item => item.id === activePromptPreviewId)
        || selected.find(item => item.source === 'prompt' && item.imageData)
        || selected.find(item => item.source === 'prompt'));

    if (activeSelectedPromptGridMode) {
      const selectedPrompts = selected.filter(item => item.source === 'prompt');
      if (selectedPrompts.length) {
        renderSelectedPromptGrid(preview, selectedPrompts);
        return;
      }
      activeSelectedPromptGridMode = false;
    }

    if (activePromptCategoryGridMode && leftPanelTab === 'prompt' && activeCategoryPrompt && activeSubCategoryPrompt) {
      renderPromptCategoryGrid(preview);
      return;
    }

    if (activePromptComposedGridMode && leftPanelTab === 'prompt' && prompt) {
      renderPromptComposedGrid(preview, prompt);
      return;
    }

    if (activePromptTagFilter) {
      renderPromptTagImageGrid(preview, activePromptTagFilter);
      return;
    }

    if (activePromptTagBrowser && leftPanelTab === 'prompt' && activeCategoryPrompt && activeSubCategoryPrompt) {
      renderPromptTagBrowser(preview);
      return;
    }

    if (leftPanelTab === 'prompt' && !prompt && activeCategoryPrompt && activeSubCategoryPrompt) {
      if (activePromptCategoryGridMode) {
        renderPromptCategoryGrid(preview);
        return;
      }
      renderPromptTagBrowser(preview);
      return;
    }

    const promptId = prompt?.id || '';
    if (promptPreviewOrientationItemId !== promptId) {
      promptPreviewOrientation = 'portrait';
      promptPreviewOrientationItemId = promptId;
    }
    const canTogglePromptOrientation = !!prompt && promptHasOrientationImage(prompt, 'portrait') && promptHasOrientationImage(prompt, 'landscape');
    const promptOrientation = canTogglePromptOrientation ? promptPreviewOrientation : 'portrait';
    const imageSrc = getPromptImageSource(prompt, promptOrientation);
    queuePromptImageLoad(prompt, promptOrientation);
    if (canTogglePromptOrientation) queuePromptImageLoad(prompt, promptOrientation === 'portrait' ? 'landscape' : 'portrait');
    if (!imageSrc && !prompt) {
      const selectedPrompts = selected.filter(item => item.source === 'prompt');
      if (selectedPrompts.length) {
        renderSelectedPromptGrid(preview, selectedPrompts);
        return;
      }
    }
    if (imageSrc) {
      const altText = prompt.imageName || getPromptDisplayName(prompt.mainCategory, prompt.subCategory);
      const nextImageKey = `${prompt.id || ''}:${promptOrientation}:${imageSrc}`;
      const shouldAnimateTransition = nextImageKey !== lastRenderedPromptPreviewImageKey;
      const portraitDescription = `<div class="preview-description-text">${prompt?.description && isSubCategoryCoreEnabled(prompt.mainCategory, prompt.subCategory) ? esc(formatPromptDescriptionForDisplay(prompt.description)) : ''}</div>`;
      const portraitTags = `<button class="preview-tag-list-header" type="button">태그</button>${normalizePromptTags(prompt?.tags).map(tag => `<span class="preview-tag-swipe-item"><button class="preview-tag-chip" type="button" data-tag="${esc(tag)}">${esc(tag)}</button></span>`).join('')}`;
      const portraitCaption = `<div class="preview-details-panel">${portraitDescription}<div class="preview-tag-list">${portraitTags}</div></div>`;
      const orientationDots = canTogglePromptOrientation
        ? `<div class="preview-orientation-dots is-prompt" aria-hidden="true"><span class="preview-orientation-dot${promptOrientation === 'portrait' ? ' active' : ''}"></span><span class="preview-orientation-dot${promptOrientation === 'landscape' ? ' active' : ''}"></span></div>`
        : '';
      const promptGridBackButton = activePromptGridReturn
        ? '<button class="preview-grid-back-btn" type="button" aria-label="이전 그리드로 돌아가기">&larr;</button>'
        : '';
      shouldAnimatePromptPreviewClear = false;
      preview.classList.add('has-image');
      preview.classList.remove('image-clear-feedback');
      preview.classList.remove('image-switch-feedback');
      preview.title = '터치하면 이미지를 크게 봅니다';
      preview.innerHTML = `<div class="preview-portrait-stack has-caption"><div class="preview-image-shell">${promptGridBackButton}${orientationDots}<img class="${shouldAnimateTransition ? 'preview-image-enter' : ''}" src="${imageSrc}" alt="${esc(altText)}" /></div>${portraitCaption}</div>`;
      bindPreviewTagSwipe(preview.querySelector('.preview-tag-list'), '.preview-tag-swipe-item');
      if (canTogglePromptOrientation) {
        bindPreviewOrientationSwipe(preview.querySelector('.preview-image-shell'), {
          canSwipeForward: () => promptPreviewOrientation === 'portrait',
          canSwipeBack: () => promptPreviewOrientation === 'landscape',
          onSwipeForward: () => setPromptPreviewOrientation('landscape'),
          onSwipeBack: () => setPromptPreviewOrientation('portrait'),
        });
      }
      if (shouldAnimateTransition) {
        // 클래스를 다시 붙여 연속 전환에서도 피드백 애니메이션이 반복 실행되도록 한다.
        void preview.offsetWidth;
        preview.classList.add('image-switch-feedback');
      }
      lastRenderedPromptPreviewImageKey = nextImageKey;
      return;
    }

    preview.classList.remove('has-image');
    preview.classList.remove('image-switch-feedback');
    preview.classList.remove('image-clear-feedback');
    if (shouldAnimatePromptPreviewClear) {
      void preview.offsetWidth;
      preview.classList.add('image-clear-feedback');
      shouldAnimatePromptPreviewClear = false;
    }
    preview.title = '';
    preview.innerHTML = '<span class="empty-state">설명 이미지가 표시됩니다.</span>';
    lastRenderedPromptPreviewImageKey = '';
  }

  function getComposedItemsLinkedToPrompt(promptId) {
    const targetPromptId = String(promptId || '');
    const isEntryLinkedToPrompt = (entry, visitedComposedIds = new Set()) => {
      if (!entry) return false;

      if (typeof entry === 'string' || typeof entry === 'number') {
        const entryId = String(entry);
        if (entryId === targetPromptId) return true;

        // 레거시/편집용 데이터 호환: item이 프롬프트 객체가 아니라 composed id일 수 있다.
        if (visitedComposedIds.has(entryId)) return false;
        const nestedComposed = composedPrompts.find(composed => String(composed.id) === entryId);
        if (!nestedComposed || !Array.isArray(nestedComposed.items)) return false;

        visitedComposedIds.add(entryId);
        return nestedComposed.items.some(nestedEntry => isEntryLinkedToPrompt(nestedEntry, visitedComposedIds));
      }

      return String(entry.id || '') === targetPromptId;
    };

    return composedPrompts.filter(item => (
      Array.isArray(item.items) && item.items.some(entry => isEntryLinkedToPrompt(entry))
    ));
  }

  function isPromptLinkedToAnyComposed(promptId) {
    return getComposedItemsLinkedToPrompt(promptId).length > 0;
  }

  function renderPromptComposedGrid(preview, prompt) {
    const composedItems = getComposedItemsLinkedToPrompt(prompt.id).sort((a, b) => {
      const categoryOrder = String(a.mainCategory || '').localeCompare(String(b.mainCategory || ''), 'ko');
      if (categoryOrder !== 0) return categoryOrder;
      const nameOrder = String(a.subCategory || '').localeCompare(String(b.subCategory || ''), 'ko');
      if (nameOrder !== 0) return nameOrder;
      return String(a.id || '').localeCompare(String(b.id || ''), 'ko');
    });

    preview.classList.add('has-image');
    preview.classList.remove('image-clear-feedback', 'image-switch-feedback');
    preview.title = '';

    const promptMainCategoryEmoji = String(getMainCategoryConfig(prompt.mainCategory).emoji || '').trim();
    const promptEmojiMarkup = promptMainCategoryEmoji
      ? `<span class="preview-tag-category-emoji" aria-hidden="true">${esc(promptMainCategoryEmoji)}</span>`
      : '';
    const isPromptComposedGridCore = isSubCategoryCoreEnabled(prompt.mainCategory, prompt.subCategory);

    const cards = composedItems.map(item => {
      const imageSrc = getPromptImageSource(item);
      queuePromptImageLoad(item);
      const label = item.subCategory || '이름없음';
      const composedMainConfig = getComposedMainCategoryConfig(item.mainCategory);
      const composedMainEmoji = String(composedMainConfig.emoji || '').trim();
      const isEditOnlyComposed = !!composedMainConfig.editOnly;
      const titleMetaMarkup = (composedMainEmoji || isEditOnlyComposed)
        ? `${composedMainEmoji ? `<span class="tag-image-name-meta"><span class="tag-image-name-main-emoji" aria-hidden="true">${esc(composedMainEmoji)}</span></span>` : ''}${isEditOnlyComposed ? '<span class="tag-image-name-edit-label is-edit-prefix" aria-hidden="true">편집</span>' : ''}`
        : '';
      const flipMarkup = isEditOnlyComposed ? renderComposedEditFlipImage(item, label) : '';
      const imageMarkup = flipMarkup || (imageSrc
        ? `<img src="${imageSrc}" alt="${esc(label)}" />`
        : '<span class="empty-state">이미지 로딩 중</span>');
      return `<div class="preview-tag-image-card composed-card-summary is-combo-card is-category-name-only" data-composed-id="${esc(item.id)}" title="${esc(label)}">${imageMarkup}<span class="tag-image-name${isEditOnlyComposed ? ' has-edit-prefix' : ''}">${titleMetaMarkup}${esc(label)}</span></div>`;
    }).join('');

    preview.innerHTML = `<div class="preview-tag-image-grid is-combo-grid is-prompt-composed-grid${isPromptComposedGridCore ? ' is-core-category-grid' : ''}"><div class="preview-tag-grid-header">${promptEmojiMarkup}<span class="preview-tag-grid-category-chip cat-chip active is-prompt">${esc(prompt.content || '프롬프트')}</span><span class="preview-tag-grid-hint">연결된 커스텀 조합 카드</span><span class="tag-image-grid-total">(${composedItems.length})</span></div>${cards || '<span class="empty-state is-composed-grid-empty">연결된 커스텀 컴포즈 카드가 없습니다.</span>'}</div>`;

    const composedGridHeader = preview.querySelector('.preview-tag-grid-header');
    const composedGridHint = composedGridHeader?.querySelector('.preview-tag-grid-hint');
    // 힌트가 말줄임표로 잘리면 카테고리 칩 아래 2열로 내려 전체 텍스트를 보여준다.
    if (composedGridHint && composedGridHint.scrollWidth > composedGridHint.clientWidth + 1) {
      composedGridHeader.classList.add('is-hint-wrapped');
    }

    preview.querySelectorAll('.composed-card-summary').forEach(card => {
      card.addEventListener('click', event => {
        event.stopPropagation();
        runComposedSwipeShortcut(card.dataset.composedId);
      });
    });
    lastRenderedPromptPreviewImageKey = `prompt-composed:${prompt.id}`;
  }

  function showSelectedPromptGrid() {
    if (selected.filter(item => item.source === 'prompt').length === 0) return;
    activeSelectedPromptGridMode = true;
    activePromptPreviewId = null;
    activePromptTagFilter = null;
    activePromptCategoryGridMode = false;
    activeCategoryPrompt = null;
    activeSubCategoryPrompt = null;
    selectingFromPreviewId = null;
    isPromptPreviewSuppressed = true;
    if (leftPanelTab !== 'prompt') setLeftPanelTab('prompt');
    render();
  }

  function clearSelectedPromptGridMode() {
    activeSelectedPromptGridMode = false;
  }

  function getActiveComposedPreviewItem() {
    return composedPrompts.find(item => item.id === activeComposedPreviewId) || null;
  }

  function getComposedPreviewImageItem(composed, stage) {
    if (!composed) return null;
    if (stage !== 'before') return composed;
    return {
      ...composed,
      imageId: composed.beforeImageId,
      imageData: composed.beforeImageData,
      imageName: composed.beforeImageName,
      portraitImageId: composed.beforePortraitImageId,
      portraitImageData: composed.beforePortraitImageData,
      portraitImageName: composed.beforePortraitImageName,
    };
  }

  function getComposedPreviewImageSource(composed, stage, orientation) {
    const image = getComposedPreviewImageItem(composed, stage);
    return promptHasOrientationImage(image, orientation) ? getPromptImageSource(image, orientation) : '';
  }

  function hasComposedPreviewImage(composed, stage, orientation) {
    return promptHasOrientationImage(getComposedPreviewImageItem(composed, stage), orientation);
  }

  // 편집용 커스텀 조합 카드 그리드용 전/후 자동 교차(GIF-like) 마크업.
  // 전/후 이미지가 모두 등록된 경우에만 플립 레이어를 렌더링한다.
  function renderComposedEditFlipImage(item, label) {
    if (!item) return '';
    const hasAfterImage = !!(item.imageId || item.imageData || item.portraitImageId || item.portraitImageData);
    const hasBeforeImage = !!(item.beforeImageId || item.beforeImageData || item.beforePortraitImageId || item.beforePortraitImageData);
    if (!hasAfterImage || !hasBeforeImage) return '';
    const afterSrc = getPromptImageSource(item);
    const beforeItem = getComposedPreviewImageItem(item, 'before');
    const beforeSrc = getPromptImageSource(beforeItem);
    queuePromptImageLoad(beforeItem);
    return `<span class="composed-card-edit-flip"><img class="composed-card-edit-after"${afterSrc ? ` src="${afterSrc}"` : ''} alt="${esc(label)}" /><img class="composed-card-edit-before"${beforeSrc ? ` src="${beforeSrc}"` : ''} alt="" aria-hidden="true" /></span>`;
  }

  function renderComposedDescriptionPreview() {
    const preview = document.getElementById('composed-description-preview');
    if (!preview) return;

    if (leftPanelTab === 'combo' && isCustomComboTabOpen && activeSelectedCustomComboGridMode) {
      const composed = composedPrompts.find(item => item.id === activeComposedPreviewId);
      const selectedItems = composed
        ? (Array.isArray(composed.items) ? composed.items : [])
          .map(entry => {
            const entryId = typeof entry === 'object' ? entry.id : entry;
            return prompts.find(item => String(item.id) === String(entryId)) || entry;
          })
          .filter(entry => entry && typeof entry === 'object')
        : selectedCustomCombo;
      const cards = selectedItems.map(item => {
        const imageSrc = getPromptImageSource(item);
        queuePromptImageLoad(item);
        const label = item.subCategory || item.content || '커스텀 조합';
        return `<div class="preview-tag-image-card composed-card-summary is-combo-card is-category-name-only" data-prompt-id="${esc(item.id)}" title="${esc(label)}">${imageSrc
          ? `<img src="${imageSrc}" alt="${esc(label)}" />`
          : '<span class="empty-state">이미지 로딩 중</span>'}<span class="tag-image-name">${esc(label)}</span></div>`;
      }).join('');

      preview.classList.add('has-image');
      preview.classList.remove('image-switch-feedback');
      preview.style.removeProperty('--custom-combo-flow-count');
      preview.title = '터치하면 해당 프롬프트 카드로 이동합니다';
      preview.innerHTML = `<div class="preview-tag-image-grid is-combo-grid is-selected-custom-combo-grid"><div class="preview-tag-grid-header"><span class="preview-tag-grid-category-chip cat-chip active is-combo">현재 조합</span><span class="tag-image-grid-total">(${selectedItems.length})</span></div>${cards || '<span class="empty-state is-composed-grid-empty">선택된 커스텀 조합 카드가 없습니다.</span>'}</div>`;
      return;
    }

    if (leftPanelTab === 'combo' && isCustomComboTabOpen && activeComposedPreviewId) {
      const composed = composedPrompts.find(item => item.id === activeComposedPreviewId);
      if (composed) {
        const imageSrc = getPromptImageSource(composed);
        queuePromptImageLoad(composed);
        const label = composed.subCategory || composed.content || '커스텀 조합';
        preview.classList.add('has-image');
        preview.classList.remove('image-switch-feedback');
        preview.style.removeProperty('--custom-combo-flow-count');
        preview.title = '터치하면 전체화면으로 봅니다';
        preview.innerHTML = imageSrc
          ? `<div class="preview-image-shell"><img src="${imageSrc}" alt="${esc(label)}" /></div>`
          : `<span class="empty-state">이미지 로딩 중</span>`;
        return;
      }
    }

    if (leftPanelTab === 'combo' && !isCustomComboTabOpen && activeComposedSelectedGridMode) {
      const composed = composedPrompts.find(item => item.id === activeComposedPreviewId);
      const selectedItems = (Array.isArray(composed?.items) ? composed.items : [])
        .map(entry => {
          const entryId = typeof entry === 'object' ? entry.id : entry;
          return prompts.find(item => String(item.id) === String(entryId)) || entry;
        })
        .filter(entry => entry && typeof entry === 'object');
      const cards = selectedItems.map(item => {
        const imageSrc = getPromptImageSource(item);
        queuePromptImageLoad(item);
        const label = item.content || item.subCategory || '프롬프트';
        return `<div class="preview-tag-image-card is-prompt-card is-composition-selected" data-prompt-id="${esc(item.id)}" title="${esc(label)}">${imageSrc
          ? `<img src="${imageSrc}" alt="${esc(label)}" />`
          : '<span class="empty-state">이미지 로딩 중</span>'}<span class="tag-image-name">${esc(label)}</span></div>`;
      }).join('');
      preview.classList.add('has-image');
      preview.classList.remove('image-switch-feedback');
      preview.style.removeProperty('--custom-combo-flow-count');
      preview.title = '터치하면 해당 프롬프트 카드로 이동합니다';
      preview.innerHTML = `<div class="preview-tag-image-grid is-prompt-grid is-composed-selection-grid"><div class="preview-tag-grid-header"><span class="preview-tag-grid-category-chip cat-chip active is-combo">현재 조합</span><span class="tag-image-grid-total">(${selectedItems.length})</span></div>${cards || '<span class="empty-state is-composed-grid-empty">현재 조합에 선택된 프롬프트가 없습니다.</span>'}</div>`;
      return;
    }

    if (leftPanelTab === 'combo' && !isCustomComboTabOpen && activeCategoryComposed && activeComposedCategoryGridMode) {
      const categoryItems = composedPrompts.filter(item => item.mainCategory === activeCategoryComposed).sort((a, b) => {
        const aText = String(a.subCategory || '').localeCompare(String(b.subCategory || ''), 'ko');
        if (aText !== 0) return aText;
        return String(a.id || '').localeCompare(String(b.id || ''), 'ko');
      });

      preview.classList.add('has-image');
      preview.classList.remove('image-switch-feedback');
      preview.title = '';

      if (!categoryItems.length) {
        preview.innerHTML = '<span class="empty-state">이 대분류에 커스텀 조합이 없습니다.</span>';
        return;
      }

      const isEditOnlyCategoryGrid = !!getComposedMainCategoryConfig(activeCategoryComposed).editOnly;
      const cards = categoryItems.map(item => {
        const imageSrc = getPromptImageSource(item);
        queuePromptImageLoad(item);
        const label = item.subCategory || '이름없음';
        const flipMarkup = isEditOnlyCategoryGrid ? renderComposedEditFlipImage(item, label) : '';
        const imageMarkup = flipMarkup || (imageSrc
          ? `<img src="${imageSrc}" alt="${esc(label)}" />`
          : '<span class="empty-state">이미지 로딩 중</span>');
        return `<div class="preview-tag-image-card composed-card-summary is-combo-card is-category-name-only" data-composed-id="${esc(item.id)}" title="${esc(label)}">${imageMarkup}<span class="tag-image-name">${esc(label)}</span></div>`;
      }).join('');

      const composedCategoryEmoji = String(getComposedMainCategoryConfig(activeCategoryComposed).emoji || '').trim();
      const composedCategoryEmojiMarkup = composedCategoryEmoji
        ? `<span class="preview-tag-category-emoji" aria-hidden="true">${esc(composedCategoryEmoji)}</span>`
        : '';
      preview.innerHTML = `<div class="preview-tag-image-grid is-combo-grid"><div class="preview-tag-grid-header">${composedCategoryEmojiMarkup}<span class="preview-tag-grid-category-chip cat-chip active is-combo">${esc(activeCategoryComposed || '카테고리')}</span><span class="tag-image-grid-total">(${categoryItems.length})</span></div>${cards}</div>`;

      preview.querySelectorAll('.composed-card-summary').forEach(card => {
        card.addEventListener('click', event => {
          event.stopPropagation();
          focusComposedCardFromTagGrid(card.dataset.composedId);
        });
      });
      return;
    }

    if (leftPanelTab === 'combo' && isCustomComboTabOpen) {
      const items = selectedCustomCombo;
      if (items.length === 0) {
        preview.classList.remove('has-image');
        preview.style.removeProperty('--custom-combo-flow-count');
        preview.title = '';
        preview.innerHTML = '<span class="empty-state">선택된 커스텀 조합이 없습니다.</span>';
        lastRenderedComposedPreviewImageKey = '';
        return;
      }

      const activeCustomCombo = customCombos.find(item => item.id === activeCustomComboId);
      const imageTiles = items.map((item, index) => {
        const label = item.subCategory || item.content || '커스텀 조합';
        const comboItemImage = activeCustomCombo?.itemImages?.[item.id] || null;
        const imageSrc = comboItemImage ? getPromptImageSource(comboItemImage) : getPromptImageSource(item);
        queuePromptImageLoad(comboItemImage ? { ...comboItemImage, id: item.id } : item);
        const tile = imageSrc
          ? `<img src="${imageSrc}" alt="${esc(label)}" />`
          : `<div class="custom-combo-image-placeholder">${esc(label)}</div>`;
        const isLastItem = index === items.length - 1;
        const isFocused = activeCustomComboFocusId && String(item.id) === String(activeCustomComboFocusId);
        return `<div class="custom-combo-image-tile${isLastItem ? ' custom-combo-flow-end-tile' : ''}${isFocused ? ' custom-combo-focus-image' : ''}" data-flow-index="${index}" data-composed-id="${esc(String(item.id))}"><div class="custom-combo-image-shell">${tile}</div><span>${esc(label)}</span></div>`;
      });
      const imageMarkup = imageTiles.join('<span class="custom-combo-image-flow-arrow" aria-hidden="true">→</span>');
      const comboImageSource = getPromptImageSource(activeCustomCombo);
      queuePromptImageLoad(activeCustomCombo);
      const comboImageMarkup = activeCustomCombo ? `
        <div class="custom-combo-image-tile custom-combo-combo-image-tile" data-flow-index="${items.length}" data-composed-id="${esc(String(activeCustomCombo.id))}">
          <div class="custom-combo-image-shell">
            ${comboImageSource
              ? `<img src="${comboImageSource}" alt="${esc(activeCustomCombo.subCategory || '커스텀 콤보')}" />`
              : `<div class="custom-combo-image-placeholder">${esc(activeCustomCombo.subCategory || '커스텀 콤보')}</div>`}
          </div>
          <span class="custom-combo-image-label" aria-hidden="true"></span>
        </div>
      ` : '';
      const flowCount = items.length + (activeCustomCombo ? 1 : 0);
      const flowTiles = (activeCustomCombo?.comboImagePosition === 'end'
        ? [imageMarkup, comboImageMarkup]
        : [comboImageMarkup, imageMarkup]
      ).filter(Boolean).join('<span class="custom-combo-image-flow-arrow" aria-hidden="true">→</span>');

      preview.classList.add('has-image');
      preview.classList.remove('image-switch-feedback');
      preview.style.setProperty('--custom-combo-flow-count', String(Math.max(1, flowCount)));
      preview.title = '커스텀 콤보의 조합 흐름을 확인하는 영역입니다';
      preview.innerHTML = `
        <div class="custom-combo-preview-split">
          <div class="custom-combo-preview-images">${flowTiles}</div>
        </div>
      `;
      lastRenderedComposedPreviewImageKey = '';
      return;
    }

    const composed = getActiveComposedPreviewItem();
    preview.style.removeProperty('--custom-combo-flow-count');
    const composedId = composed?.id || '';
    if (composedPreviewOrientationItemId !== composedId) {
      composedPreviewOrientation = 'portrait';
      composedPreviewOrientationItemId = composedId;
    }
    const isEditOnlyComposed = !!composed && !!getComposedMainCategoryConfig(composed.mainCategory).editOnly;
    const beforeImage = getComposedPreviewImageItem(composed, 'before');
    const afterImage = getComposedPreviewImageItem(composed, 'after');
    const canToggleComposedOrientation = !!composed
      && ['portrait', 'landscape'].every(orientation => (
        hasComposedPreviewImage(composed, 'before', orientation)
        || hasComposedPreviewImage(composed, 'after', orientation)
      ));
    const composedOrientation = canToggleComposedOrientation ? composedPreviewOrientation : 'portrait';
    const currentImage = afterImage;
    const imageSrc = getComposedPreviewImageSource(composed, 'after', composedOrientation);
    const beforeImageSrc = isEditOnlyComposed ? getComposedPreviewImageSource(composed, 'before', composedOrientation) : '';
    // 편집용 조합의 전/후 이미지가 모두 있으면 토글 없이 자동으로 무한 교차(GIF-like) 표시한다.
    const shouldAutoFlipEditStage = isEditOnlyComposed && !!imageSrc && !!beforeImageSrc;
    queuePromptImageLoad(currentImage, composedOrientation);
    if (shouldAutoFlipEditStage) queuePromptImageLoad(beforeImage, composedOrientation);
    if (canToggleComposedOrientation) queuePromptImageLoad(currentImage, composedOrientation === 'portrait' ? 'landscape' : 'portrait');
    if (imageSrc) {
      const altText = currentImage.imageName || getPromptDisplayName(composed.mainCategory, composed.subCategory);
      const nextImageKey = `${composed.id || ''}:${composedOrientation}:${imageSrc}:${shouldAutoFlipEditStage ? beforeImageSrc : ''}`;
      const shouldAnimateTransition = nextImageKey !== lastRenderedComposedPreviewImageKey;
      const orientationDots = canToggleComposedOrientation
        ? `<div class="preview-orientation-dots is-combo" aria-hidden="true"><span class="preview-orientation-dot${composedOrientation === 'portrait' ? ' active' : ''}"></span><span class="preview-orientation-dot${composedOrientation === 'landscape' ? ' active' : ''}"></span></div>`
        : '';
      preview.classList.add('has-image');
      preview.classList.remove('image-switch-feedback');
      preview.title = shouldAutoFlipEditStage ? '편집 전후 이미지가 자동으로 전환됩니다' : '터치하면 이미지를 크게 봅니다';
      preview.innerHTML = `<div class="preview-image-shell${shouldAutoFlipEditStage ? ' is-edit-auto-flip' : ''}">${orientationDots}<img class="${shouldAnimateTransition && !shouldAutoFlipEditStage ? 'preview-image-enter' : ''}${shouldAutoFlipEditStage ? ' preview-edit-flip-after' : ''}" src="${imageSrc}" alt="${esc(altText)}" />${shouldAutoFlipEditStage ? `<img class="preview-edit-flip-before" src="${beforeImageSrc}" alt="" aria-hidden="true" />` : ''}</div>`;
      if (canToggleComposedOrientation) {
        bindPreviewOrientationSwipe(preview.querySelector('.preview-image-shell'), {
          canSwipeForward: () => composedPreviewOrientation === 'portrait',
          canSwipeBack: () => composedPreviewOrientation === 'landscape',
          onSwipeForward: () => setComposedPreviewOrientation('landscape'),
          onSwipeBack: () => setComposedPreviewOrientation('portrait'),
        });
      }
      if (shouldAnimateTransition) {
        void preview.offsetWidth;
        preview.classList.add('image-switch-feedback');
      }
      lastRenderedComposedPreviewImageKey = nextImageKey;
      return;
    }

    preview.classList.remove('has-image');
    preview.classList.remove('image-switch-feedback');
    preview.style.removeProperty('--custom-combo-flow-count');
    preview.title = '';
    preview.innerHTML = '<span class="empty-state">선택한 커스텀 조합의 설명 이미지가 표시됩니다.</span>';
    lastRenderedComposedPreviewImageKey = '';
  }

  function bindPreviewOrientationSwipe(shell, { canSwipeForward, canSwipeBack, onSwipeForward, onSwipeBack }) {
    if (!shell) return;
    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let swiping = false;
    const SWIPE_THRESHOLD = 40;

    shell.addEventListener('pointerdown', event => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      swiping = false;
    });

    shell.addEventListener('pointermove', event => {
      if (event.pointerId !== pointerId) return;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      if (!swiping) {
        if (Math.abs(dx) < 8 || Math.abs(dx) <= Math.abs(dy)) return;
        swiping = true;
        try { shell.setPointerCapture(event.pointerId); } catch {}
      }
      event.preventDefault();
    });

    const finishSwipe = event => {
      if (event.pointerId !== pointerId) return;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      pointerId = null;
      if (swiping && Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0 && canSwipeForward()) onSwipeForward();
        else if (dx > 0 && canSwipeBack()) onSwipeBack();
      }
      swiping = false;
    };
    shell.addEventListener('pointerup', finishSwipe);
    shell.addEventListener('pointercancel', finishSwipe);
  }

  function setPromptPreviewOrientation(orientation) {
    const normalized = orientation === 'landscape' ? 'landscape' : 'portrait';
    if (promptPreviewOrientation === normalized) return;
    promptPreviewOrientation = normalized;
    renderPromptDescriptionPreview();
  }

  function setComposedPreviewOrientation(orientation) {
    const normalized = orientation === 'landscape' ? 'landscape' : 'portrait';
    if (composedPreviewOrientation === normalized) return;
    composedPreviewOrientation = normalized;
    renderComposedDescriptionPreview();
  }

  function getActivePromptPreviewImage() {
    const prompt = prompts.find(item => item.id === activePromptPreviewId)
      || selected.find(item => item.source === 'prompt' && item.imageData)
      || selected.find(item => item.source === 'prompt');
    if (!prompt) return [];

    queuePromptImageLoad(prompt, 'portrait');
    queuePromptImageLoad(prompt, 'landscape');
    const portraitSrc = promptHasOrientationImage(prompt, 'portrait') ? getPromptImageSource(prompt, 'portrait') : '';
    const landscapeSrc = promptHasOrientationImage(prompt, 'landscape') ? getPromptImageSource(prompt, 'landscape') : '';
    const portraitEntry = portraitSrc ? { src: portraitSrc, ...getPromptActiveImageMeta(prompt, 'portrait') } : null;
    const landscapeEntry = landscapeSrc ? { src: landscapeSrc, ...getPromptActiveImageMeta(prompt, 'landscape') } : null;

    if (portraitEntry && landscapeEntry) {
      return promptPreviewOrientation === 'landscape' ? [landscapeEntry, portraitEntry] : [portraitEntry, landscapeEntry];
    }
    return [portraitEntry || landscapeEntry].filter(Boolean);
  }

  function getActiveComposedPreviewImage() {
    const composed = getActiveComposedPreviewItem();
    if (!composed) return [];

    const isEditOnlyComposed = !!getComposedMainCategoryConfig(composed.mainCategory).editOnly;
    if (isEditOnlyComposed) {
      const orientation = composedPreviewOrientation;
      // \uc790\ub3d9 \ub8e8\ud504 \uc804\ud658\uc774\ub77c \ud0ed \uc2dc \uace0\uc815\ub41c \ub2e8\uacc4\uac00 \uc5c6\uc73c\ubbc0\ub85c \ud56d\uc0c1 \ud6c4(after) \uc774\ubbf8\uc9c0\ub97c \ud06c\uac8c \ubcf4\uc5ec\uc900\ub2e4.
      const stage = hasComposedPreviewImage(composed, 'after', orientation) ? 'after' : 'before';
      const image = getComposedPreviewImageItem(composed, stage);
      const src = getComposedPreviewImageSource(composed, stage, orientation);
      if (!src) return [];
      return [{
        src,
        ...getPromptActiveImageMeta(image, orientation),
        alt: image.imageName || getPromptDisplayName(composed.mainCategory, composed.subCategory),
      }];
    }

    queuePromptImageLoad(composed, 'portrait');
    queuePromptImageLoad(composed, 'landscape');
    const portraitSrc = promptHasOrientationImage(composed, 'portrait') ? getPromptImageSource(composed, 'portrait') : '';
    const landscapeSrc = promptHasOrientationImage(composed, 'landscape') ? getPromptImageSource(composed, 'landscape') : '';
    const portraitEntry = portraitSrc ? { src: portraitSrc, ...getPromptActiveImageMeta(composed, 'portrait') } : null;
    const landscapeEntry = landscapeSrc ? { src: landscapeSrc, ...getPromptActiveImageMeta(composed, 'landscape') } : null;

    if (portraitEntry && landscapeEntry) {
      return composedPreviewOrientation === 'landscape' ? [landscapeEntry, portraitEntry] : [portraitEntry, landscapeEntry];
    }
    return [portraitEntry || landscapeEntry].filter(Boolean);
  }


  function getCustomComboFlowEntries() {
    if (leftPanelTab !== 'combo' || !isCustomComboTabOpen || selectedCustomCombo.length === 0) return [];
    const activeCustomCombo = customCombos.find(item => item.id === activeCustomComboId);
    const items = selectedCustomCombo.map((item) => {
      const override = activeCustomCombo?.itemImages?.[item.id] || null;
      const itemPrompt = override
        ? { ...override, id: item.id }
        : item;
      const src = getPromptImageSource(itemPrompt);
      if (!src) return null;
      return {
        src,
        alt: item.subCategory || item.content || '커스텀 조합',
        imageId: override ? (override.imageId || item.id) : (item.imageId || item.id),
        label: item.subCategory || item.content || '커스텀 조합',
      };
    }).filter(Boolean);

    const comboSrc = activeCustomCombo ? getPromptImageSource(activeCustomCombo) : '';
    const comboEntry = comboSrc ? {
      src: comboSrc,
      alt: activeCustomCombo.subCategory || '커스텀 콤보',
      imageId: activeCustomCombo.imageId || activeCustomCombo.id,
      label: activeCustomCombo.subCategory || '커스텀 콤보',
    } : null;

    const ordered = activeCustomCombo?.comboImagePosition === 'end'
      ? [...items, comboEntry].filter(Boolean)
      : [comboEntry, ...items].filter(Boolean);
    return ordered;
  }

  function createPlaceholderCanvasImage(label) {
    const canvas = document.createElement('canvas');
    const width = 1200;
    const height = 800;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.fillStyle = '#121824';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#dbeafe';
    ctx.font = '700 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label || '커스텀 콤보', width / 2, height / 2);
    return canvas.toDataURL('image/png');
  }

  async function getCustomComboFlowGallery() {
    const entries = getCustomComboFlowEntries();
    if (entries.length === 0) return [];
    const firstEntry = entries[0];
    const lastEntry = entries[entries.length - 1];
    const transitionEntry = entries.length > 1 && firstEntry?.src && lastEntry?.src
      ? {
          alt: '커스텀 콤보 시작과 끝 전환',
          label: '시작 → 끝',
          imageId: 'custom-combo-flow-transition',
          transition: {
            fromSrc: firstEntry.src,
            fromAlt: firstEntry.alt,
            toSrc: lastEntry.src,
            toAlt: lastEntry.alt,
          },
        }
      : null;
    return [
      ...entries,
      ...(transitionEntry ? [transitionEntry] : []),
    ];
  }

