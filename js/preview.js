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

    const imageSrc = getPromptImageSource(prompt);
    queuePromptImageLoad(prompt);
    if (!imageSrc && !prompt) {
      const selectedPrompts = selected.filter(item => item.source === 'prompt');
      if (selectedPrompts.length) {
        renderSelectedPromptGrid(preview, selectedPrompts);
        return;
      }
    }
    if (imageSrc) {
      const altText = prompt.imageName || getPromptDisplayName(prompt.mainCategory, prompt.subCategory);
      const nextImageKey = `${prompt.id || ''}:${imageSrc}`;
      const shouldAnimateTransition = nextImageKey !== lastRenderedPromptPreviewImageKey;
      const portraitDescription = previewRenderMode === 'portrait'
        ? `<div class="preview-description-text">${prompt?.description && isSubCategoryCoreEnabled(prompt.mainCategory, prompt.subCategory) ? esc(formatPromptDescriptionForDisplay(prompt.description)) : ''}</div>`
        : '';
      const portraitTags = previewRenderMode === 'portrait'
        ? `<button class="preview-tag-list-header" type="button">태그</button>${normalizePromptTags(prompt?.tags).map(tag => `<span class="preview-tag-swipe-item"><button class="preview-tag-chip" type="button" data-tag="${esc(tag)}">${esc(tag)}</button></span>`).join('')}`
        : '';
      const portraitCaption = previewRenderMode === 'portrait'
        ? `<div class="preview-details-panel">${portraitDescription}<div class="preview-tag-list">${portraitTags}</div></div>`
        : '';
      shouldAnimatePromptPreviewClear = false;
      preview.classList.add('has-image');
      preview.classList.remove('image-clear-feedback');
      preview.classList.remove('image-switch-feedback');
      preview.title = '터치하면 이미지를 크게 봅니다';
      preview.innerHTML = portraitCaption
        ? `<div class="preview-portrait-stack has-caption"><div class="preview-image-shell"><img class="${shouldAnimateTransition ? 'preview-image-enter' : ''}" src="${imageSrc}" alt="${esc(altText)}" /></div>${portraitCaption}</div>`
        : `<div class="preview-image-shell"><img class="${shouldAnimateTransition ? 'preview-image-enter' : ''}" src="${imageSrc}" alt="${esc(altText)}" /></div>`;
      if (portraitTags) bindPreviewTagSwipe(preview.querySelector('.preview-tag-list'), '.preview-tag-swipe-item');
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

  function renderComposedDescriptionPreview() {
    const preview = document.getElementById('composed-description-preview');
    if (!preview) return;

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

      const cards = categoryItems.map(item => {
        const imageSrc = getPromptImageSource(item);
        queuePromptImageLoad(item);
        const label = item.subCategory || '이름없음';
        return `<div class="preview-tag-image-card composed-card-summary is-combo-card is-category-name-only" data-composed-id="${esc(item.id)}" title="${esc(label)}">${imageSrc
          ? `<img src="${imageSrc}" alt="${esc(label)}" />`
          : '<span class="empty-state">이미지 로딩 중</span>'}<span class="tag-image-name">${esc(label)}</span></div>`;
      }).join('');

      const composedCategoryEmoji = String(getComposedMainCategoryConfig(activeCategoryComposed).emoji || '').trim();
      const composedCategoryEmojiMarkup = composedCategoryEmoji
        ? `<span class="preview-tag-category-emoji" aria-hidden="true">${esc(composedCategoryEmoji)}</span>`
        : '';
      preview.innerHTML = `<div class="preview-tag-image-grid is-combo-grid"><div class="preview-tag-grid-header">${composedCategoryEmojiMarkup}<span class="preview-tag-grid-category-chip cat-chip active is-combo">${esc(activeCategoryComposed || '카테고리')}</span><span class="tag-image-grid-total">${categoryItems.length}개</span></div>${cards}</div>`;

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
    const imageSrc = getPromptImageSource(composed);
    queuePromptImageLoad(composed);
    if (imageSrc) {
      const altText = composed.imageName || getPromptDisplayName(composed.mainCategory, composed.subCategory);
      const nextImageKey = `${composed.id || ''}:${imageSrc}`;
      const shouldAnimateTransition = nextImageKey !== lastRenderedComposedPreviewImageKey;
      preview.classList.add('has-image');
      preview.classList.remove('image-switch-feedback');
      preview.title = '터치하면 이미지를 크게 봅니다';
      preview.innerHTML = `<div class="preview-image-shell"><img class="${shouldAnimateTransition ? 'preview-image-enter' : ''}" src="${imageSrc}" alt="${esc(altText)}" /></div>`;
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

  function getActivePromptPreviewImage() {
    const prompt = prompts.find(item => item.id === activePromptPreviewId)
      || selected.find(item => item.source === 'prompt' && item.imageData)
      || selected.find(item => item.source === 'prompt');

    queuePromptImageLoad(prompt);
    const imageSrc = getPromptImageSource(prompt);
    if (!imageSrc) {
      queuePromptImageLoad(prompt);
      return null;
    }
    return {
      src: imageSrc,
      ...getPromptActiveImageMeta(prompt),
    };
  }

  function getActiveComposedPreviewImage() {
    const composed = getActiveComposedPreviewItem();
    queuePromptImageLoad(composed);
    const imageSrc = getPromptImageSource(composed);
    if (!imageSrc) {
      queuePromptImageLoad(composed);
      return null;
    }
    return {
      src: imageSrc,
      ...getPromptActiveImageMeta(composed),
    };
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

  function normalizePreviewRenderMode(value) {
    if (value === 'portrait' || value === 'vertical') return 'portrait';
    return 'landscape';
  }

  function getPreviewRenderModeLabel(mode) {
    return mode === 'portrait' ? '세로 렌더링' : '기본(가로)';
  }

  function renderPreviewRenderMode() {
    const nextMode = normalizePreviewRenderMode(previewRenderMode);
    const aspectRatio = nextMode === 'portrait' ? '3 / 4' : '4 / 3';
    const main = document.querySelector('.main');
    if (main) {
      main.classList.toggle('preview-render-portrait', nextMode === 'portrait');
    }
    document.body.classList.toggle('preview-render-portrait-mode', nextMode === 'portrait');

    document.querySelectorAll('.prompt-description-preview, .prompt-image-preview').forEach((element) => {
      element.style.setProperty('--preview-aspect-ratio', aspectRatio);
    });

    document.querySelectorAll('[data-preview-render-mode]').forEach(button => {
      const mode = button.getAttribute('data-preview-render-mode');
      const normalizedMode = normalizePreviewRenderMode(mode);
      const isActive = normalizedMode === nextMode;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      button.title = isActive ? `현재 모드: ${getPreviewRenderModeLabel(nextMode)}` : `모드를 ${getPreviewRenderModeLabel(normalizedMode)}로 변경`;
    });
  }

