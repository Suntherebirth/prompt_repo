  function renderPromptDescriptionPreview() {
    const preview = document.getElementById('prompt-description-preview');
    if (!preview) return;

    const prompt = isPromptPreviewSuppressed
      ? null
      : (prompts.find(item => item.id === activePromptPreviewId)
        || selected.find(item => item.source === 'prompt' && item.imageData)
        || selected.find(item => item.source === 'prompt'));

    preview.classList.toggle('preview-animation-level-1', previewAnimationLevel === 1);
    preview.classList.toggle('preview-animation-level-2', previewAnimationLevel === 2);
    preview.classList.toggle('preview-animation-level-3', previewAnimationLevel === 3);
    preview.classList.toggle('preview-animation-enabled', previewAnimationLevel > 0);

    if (activePromptTagFilter) {
      renderPromptTagImageGrid(preview, activePromptTagFilter);
      return;
    }

    if (leftPanelTab === 'prompt' && !prompt && activeCategoryPrompt && activeSubCategoryPrompt) {
      renderPromptTagBrowser(preview);
      return;
    }

    const imageSrc = getPromptImageSource(prompt);
    queuePromptImageLoad(prompt);
    if (imageSrc) {
      const altText = prompt.imageName || getPromptDisplayName(prompt.mainCategory, prompt.subCategory);
      const nextImageKey = `${prompt.id || ''}:${imageSrc}`;
      const shouldAnimateTransition = nextImageKey !== lastRenderedPromptPreviewImageKey;
      const portraitDescription = previewRenderMode === 'portrait'
        ? `<div class="preview-description-text">${prompt?.description && isSubCategoryCoreEnabled(prompt.mainCategory, prompt.subCategory) ? esc(formatPromptDescriptionForDisplay(prompt.description)) : ''}</div>`
        : '';
      const portraitTags = previewRenderMode === 'portrait'
        ? normalizePromptTags(prompt?.tags).map(tag => `<span class="preview-tag-swipe-item"><button class="preview-tag-chip" type="button" data-tag="${esc(tag)}">${esc(tag)}</button></span>`).join('')
        : '';
      const portraitCaption = previewRenderMode === 'portrait'
        ? `${portraitDescription}<div class="preview-tag-list">${portraitTags}</div>`
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

  function getActiveComposedPreviewItem() {
    return composedPrompts.find(item => item.id === activeComposedPreviewId) || null;
  }

  function renderComposedDescriptionPreview() {
    const preview = document.getElementById('composed-description-preview');
    if (!preview) return;

    preview.classList.toggle('preview-animation-level-1', previewAnimationLevel === 1);
    preview.classList.toggle('preview-animation-level-2', previewAnimationLevel === 2);
    preview.classList.toggle('preview-animation-level-3', previewAnimationLevel === 3);
    preview.classList.toggle('preview-animation-enabled', previewAnimationLevel > 0);

    const composed = getActiveComposedPreviewItem();
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

  function normalizePromptPreviewSizeLevel(level) {
    const value = Number(level);
    return value === 1 || value === 2 || value === 3 ? value : 2;
  }

  function normalizePreviewRenderMode(value) {
    if (value === 'portrait' || value === 'vertical') return 'portrait';
    return 'landscape';
  }

  function getPreviewRenderModeLabel(mode) {
    return mode === 'portrait' ? '세로 렌더링' : '기본(가로)';
  }

  function getPromptPreviewSizeLabel(level) {
    if (level === 1) return '1단계';
    if (level === 3) return '3단계';
    return '2단계';
  }

  function renderPromptPreviewSizeLevel() {
    const panel = document.querySelector('.panel-library');
    const main = document.querySelector('.main');
    document.querySelectorAll('.prompt-description-preview').forEach((preview) => {
      preview.style.setProperty('--prompt-preview-max-width', PROMPT_PREVIEW_MAX_WIDTH_BY_LEVEL[promptPreviewSizeLevel]);
    });
    if (main) {
      const portraitInset = promptPreviewSizeLevel === 1 ? '12px' : promptPreviewSizeLevel === 3 ? '2px' : '6px';
      main.style.setProperty('--portrait-preview-inner-padding', portraitInset);
    }
    if (panel) {
      panel.classList.toggle('preview-level-3-full', promptPreviewSizeLevel === 3);
    }

    document.querySelectorAll('[data-preview-size-level]').forEach(button => {
      const level = normalizePromptPreviewSizeLevel(button.dataset.previewSizeLevel);
      const isActive = level === promptPreviewSizeLevel;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      button.title = isActive ? `현재 이미지 영역 크기 ${getPromptPreviewSizeLabel(level)}` : `이미지 영역 크기를 ${getPromptPreviewSizeLabel(level)}로 변경`;
    });
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

