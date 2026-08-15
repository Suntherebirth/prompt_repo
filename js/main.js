  // ── Keyboard shortcut: Enter in textarea ──
  document.getElementById('input-content').addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) addPrompt();
  });

  document.getElementById('input-content').addEventListener('input', () => {
    renderPendingPromptImagePreview();
  });

  document.getElementById('input-image-file').addEventListener('change', async e => {
    const file = e.target.files && e.target.files[0];
    if (!file) {
      clearPendingPromptImage();
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setPendingPromptImage(file, dataUrl);
    } catch {
      pendingPromptImages[normalizeImageOrientation(promptImageEditOrientation)] = null;
      renderPendingPromptImagePreview();
      showToast('이미지를 읽지 못했습니다');
    }
  });

  document.getElementById('combo-image-file').addEventListener('change', async e => {
    const file = e.target.files && e.target.files[0];
    if (!file) {
      clearPendingComposedImage();
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setPendingComposedImage(file, dataUrl);
    } catch {
      pendingComposedImages[normalizeImageOrientation(composedImageEditOrientation)] = null;
      renderPendingComposedImagePreview();
      showToast('이미지를 읽지 못했습니다');
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeAddPromptModal();
      closeSaveComposedModal();
      closeCategoryManageModal();
      closeSettingsDrawer();
      closeImageViewer();
    }
  });

  document.getElementById('prompt-description-preview').addEventListener('click', e => {
    const swipeActionChip = e.target.closest('.preview-tag-swipe-item.is-swipe-action-visible .preview-tag-chip');
    if (swipeActionChip) {
      e.stopPropagation();
      const swipeItem = swipeActionChip.closest('.preview-tag-swipe-item');
      if (isSwipeActionTransitioning(swipeItem)) {
        e.preventDefault();
        notifyInvalidSwipeTouch(swipeItem);
        return;
      }
      commitPreviewTagRandomSelection(swipeItem, swipeActionChip);
      return;
    }

    const tagRandomButton = e.target.closest('.preview-tag-grid-random-toggle');
    if (tagRandomButton) {
      e.stopPropagation();
      const tag = tagRandomButton.dataset.randomTag || activePromptTagFilter || '';
      if (!tag) return;
      activePromptTagSort = 'name';
      activePromptTagFilter = tag;
      isPromptPreviewSuppressed = false;
      applyRandomSelectionForActiveTag();
      return;
    }

    const sortToggle = e.target.closest('.preview-tag-grid-sort-toggle');
    if (sortToggle) {
      e.stopPropagation();
      activePromptTagSort = activePromptTagSort === 'birth'
        ? 'name'
        : activePromptTagSort === 'name'
          ? 'height'
          : 'birth';
      shouldAnimatePromptTagSort = true;
      if (activePromptTagFilter) renderPromptDescriptionPreview();
      return;
    }

    const tagGridHeader = e.target.closest('.preview-tag-grid-header');
    if (tagGridHeader) {
      e.stopPropagation();
      activePromptTagFilter = null;
      activePromptPreviewId = null;
      isPromptPreviewSuppressed = true;
      renderPromptDescriptionPreview();
      return;
    }

    const tagChip = e.target.closest('.preview-tag-chip');
    if (tagChip) {
      e.stopPropagation();
      const tag = tagChip.dataset.tag || '';
      activePromptTagSort = 'birth';
      shouldAnimatePromptTagGridEntry = true;
      activePromptTagFilter = activePromptTagFilter === tag ? null : tag;
      isPromptPreviewSuppressed = false;
      renderPromptDescriptionPreview();
      return;
    }

    const tagImageCard = e.target.closest('.preview-tag-image-card');
    if (tagImageCard) {
      e.stopPropagation();
      const prompt = prompts.find(item => item.id === tagImageCard.dataset.promptId);
      if (!prompt) return;
      jumpToPromptCardFromTagImage(prompt);
      return;
    }

    if (!e.target.closest('img')) return;
    openImageViewer();
  });

  document.getElementById('composed-description-preview').addEventListener('click', (e) => {
    if (!e.target.closest('img')) return;
    openImageViewer();
  });

  const imageViewerImage = document.getElementById('image-viewer-image');
  imageViewerImage.addEventListener('click', handleImageViewerImageTap);
  imageViewerImage.addEventListener('pointerdown', onImageViewerPointerDown);
  imageViewerImage.addEventListener('pointermove', onImageViewerPointerMove);
  imageViewerImage.addEventListener('pointerup', onImageViewerPointerEnd);
  imageViewerImage.addEventListener('pointercancel', onImageViewerPointerEnd);

  // ── Category selectors ──
  const categoryInput = document.getElementById('input-main-category');
  const subCategoryInput = document.getElementById('input-sub-category');
  const comboMainCategoryInput = document.getElementById('combo-main-category');
  const comboSubCategoryInput = document.getElementById('combo-sub-category');

  categoryInput.addEventListener('change', handleMainCategoryChange);
  subCategoryInput.addEventListener('change', handleSubCategoryChange);
  comboMainCategoryInput.addEventListener('change', handleComposedMainCategoryChange);
  comboSubCategoryInput.addEventListener('change', handleComposedSubCategoryChange);

  window.addEventListener('resize', () => {
    if (normalizePreviewRenderMode(previewRenderMode) === 'portrait') {
      renderPreviewRenderMode();
    }
  });

  // ── Init ──
  preventSafariDoubleTapZoom();
  loadSettings();
  renderSettingsDrawer();
  renderPreviewRenderMode();
  renderImageViewer();
  setLeftPanelTab(localStorage.getItem(LEFT_PANEL_TAB_KEY) || 'prompt');
  load();
  render();
