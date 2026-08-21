  function normalizePreviewTransitionMode(value) {
    if (value === 'fade') return 'fade';
    if (value === 'cut') return 'cut';
    return 'scale';
  }

  function getPreviewTransitionModeLabel(mode) {
    if (mode === 'fade') return '페이드 인/아웃';
    if (mode === 'cut') return '컷 전환';
    return '스케일 업';
  }

  function getPreviewTransitionModeText(mode) {
    if (mode === 'fade') return '페이드 인/아웃';
    if (mode === 'cut') return '컷 전환';
    return '스케일 업';
  }

  function renderPreviewTransitionMode() {
    document.querySelectorAll('[data-preview-transition-mode]').forEach(button => {
      const mode = button.getAttribute('data-preview-transition-mode');
      const isActive = previewTransitionMode === mode;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      button.title = isActive ? `현재 전환 효과: ${getPreviewTransitionModeLabel(mode)}` : `전환 효과를 ${getPreviewTransitionModeLabel(mode)}로 변경`;
    });

    document.querySelectorAll('.prompt-description-preview').forEach((preview) => {
      preview.classList.toggle('preview-transition-mode-scale', previewTransitionMode === 'scale');
      preview.classList.toggle('preview-transition-mode-fade', previewTransitionMode === 'fade');
      preview.classList.toggle('preview-transition-mode-cut', previewTransitionMode === 'cut');
    });
  }

  function renderTapComposeToggle() {
    const btn = document.getElementById('tap-compose-toggle-btn');
    if (!btn) return;
    btn.classList.toggle('active', tapComposeMode !== PROMPT_ADD_MODE.SWIPE);
    if (tapComposeMode === PROMPT_ADD_MODE.TAP) {
      btn.textContent = '터치로 추가';
      btn.title = '한 번 탭하면 조합에 바로 추가됩니다';
      return;
    }
    if (tapComposeMode === PROMPT_ADD_MODE.DOUBLE_TAP_PREVIEW) {
      btn.textContent = '두번 터치로 추가';
      btn.title = '첫 탭은 미리보기, 같은 항목을 한 번 더 탭하면 조합에 추가됩니다';
      return;
    }
    btn.textContent = '밀어서 추가';
    btn.title = '한 번 탭하면 미리보기만 되고, 오른쪽 스와이프로 조합에 추가됩니다';
  }

  function renderSettingsDrawer() {
    const drawer = document.getElementById('settings-drawer');
    const trigger = document.getElementById('settings-trigger-btn');
    if (!drawer || !trigger) return;
    drawer.classList.toggle('open', isSettingsDrawerOpen);
    trigger.classList.toggle('active', isSettingsDrawerOpen);
    trigger.setAttribute('aria-expanded', isSettingsDrawerOpen ? 'true' : 'false');
    trigger.title = isSettingsDrawerOpen ? '설정 닫기' : '설정 열기';
  }

  function normalizeTapComposeMode(value) {
    if (value === true || value === '1') return PROMPT_ADD_MODE.TAP;
    if (value === false || value === '0' || value === null || value === undefined || value === '') return PROMPT_ADD_MODE.SWIPE;
    if (value === PROMPT_ADD_MODE.SWIPE || value === PROMPT_ADD_MODE.TAP || value === PROMPT_ADD_MODE.DOUBLE_TAP_PREVIEW) {
      return value;
    }
    return PROMPT_ADD_MODE.SWIPE;
  }

  function isSwipeComposeMode() {
    return tapComposeMode === PROMPT_ADD_MODE.SWIPE;
  }

  function isDoubleTapTouchCooldownActive() {
    return Date.now() < doubleTapTouchLockUntil;
  }

  function activateDoubleTapTouchCooldown() {
    doubleTapTouchLockUntil = Date.now() + DOUBLE_TAP_ADD_TOUCH_COOLDOWN_MS;
  }

  function setTapComposeMode(mode, options = {}) {
    tapComposeMode = normalizeTapComposeMode(mode);
    saveSettings();
    renderTapComposeToggle();
    render();
    if (options.notify) {
      if (tapComposeMode === PROMPT_ADD_MODE.TAP) {
        showToast('터치로 추가 모드가 켜졌습니다');
      } else if (tapComposeMode === PROMPT_ADD_MODE.DOUBLE_TAP_PREVIEW) {
        showToast('두번 터치로 추가 모드가 켜졌습니다');
      } else {
        showToast('밀어서 추가 모드가 켜졌습니다');
      }
    }
  }

  function toggleTapComposeMode() {
    const nextMode = tapComposeMode === PROMPT_ADD_MODE.SWIPE
      ? PROMPT_ADD_MODE.TAP
      : tapComposeMode === PROMPT_ADD_MODE.TAP
        ? PROMPT_ADD_MODE.DOUBLE_TAP_PREVIEW
        : PROMPT_ADD_MODE.SWIPE;
    setTapComposeMode(nextMode, { notify: true });
  }

  async function openImageViewer(options = {}) {
    let gallery = Array.isArray(options.gallery) && options.gallery.length > 0
      ? options.gallery
      : (
        leftPanelTab === 'combo' && isCustomComboTabOpen && !activeComposedPreviewId
          ? await getCustomComboFlowGallery()
          : (leftPanelTab === 'combo' ? getActiveComposedPreviewImage() : getActivePromptPreviewImage())
      );

    gallery = gallery.filter(Boolean);
    if (!gallery.length) return;
    const desiredIndex = Number.isInteger(options.index) ? options.index : 0;
    const safeIndex = Math.min(Math.max(desiredIndex, 0), gallery.length - 1);
    activeImageViewer = {
      ...gallery[safeIndex],
      gallery,
      index: safeIndex,
    };
    imageViewerLastGestureAt = 0;
    renderImageViewer();
  }

  function closeImageViewer() {
    activeImageViewer = null;
    imageViewerLastGestureAt = 0;
    renderImageViewer();
  }

  function handleImageViewerBackdrop(e) {
    if (e.target.id === 'image-viewer-modal') {
      closeImageViewer();
    }
  }

  function normalizeCoreCategoryWideCard(value) {
    if (value === true || value === '1' || value === 1) return true;
    return false;
  }

  function normalizeLargeItemGrid(value) {
    if (value === true || value === '1' || value === 1) return true;
    return false;
  }

  function renderCoreCategoryWideCardToggle() {
    const btn = document.getElementById('core-category-wide-card-toggle-btn');
    if (!btn) return;
    btn.classList.toggle('active', isCoreCategoryWideCardEnabled);
    btn.setAttribute('aria-pressed', isCoreCategoryWideCardEnabled ? 'true' : 'false');
    btn.textContent = isCoreCategoryWideCardEnabled ? '가로 카드 켜짐' : '가로 카드 꺼짐';
  }

  function renderLargeItemGridToggle() {
    const button = document.getElementById('large-item-grid-toggle-btn');
    document.body.classList.toggle('large-item-grid-mode', isLargeItemGridEnabled);
    if (!button) return;
    button.classList.toggle('active', isLargeItemGridEnabled);
    button.setAttribute('aria-pressed', isLargeItemGridEnabled ? 'true' : 'false');
    button.textContent = isLargeItemGridEnabled ? '2열 크게 보기 켜짐' : '3열 기본 보기';
  }

  function renderExportMetadataSanitizationToggle() {
    const button = document.getElementById('export-metadata-sanitization-toggle-btn');
    if (!button) return;
    button.classList.toggle('active', isExportMetadataSanitizationEnabled);
    button.setAttribute('aria-pressed', isExportMetadataSanitizationEnabled ? 'true' : 'false');
    button.textContent = isExportMetadataSanitizationEnabled ? 'C2PA/XMP 제거 켜짐' : 'C2PA/XMP 제거 꺼짐';
  }

  function setExportMetadataSanitizationEnabled(enabled, options = {}) {
    isExportMetadataSanitizationEnabled = enabled === true || enabled === '1' || enabled === 1;
    saveSettings();
    renderExportMetadataSanitizationToggle();
    if (options.notify) showToast(isExportMetadataSanitizationEnabled ? 'ZIP 내보내기 시 C2PA/XMP를 제거합니다' : 'ZIP 내보내기 시 원본 메타데이터를 유지합니다');
  }

  function toggleExportMetadataSanitization() {
    setExportMetadataSanitizationEnabled(!isExportMetadataSanitizationEnabled, { notify: true });
  }

  function setLargeItemGrid(enabled, options = {}) {
    isLargeItemGridEnabled = normalizeLargeItemGrid(enabled);
    saveSettings();
    renderLargeItemGridToggle();
    renderPromptDescriptionPreview();
    renderComposedDescriptionPreview();
    if (options.notify) {
      showToast(isLargeItemGridEnabled ? '아이템 그리드를 2열로 크게 표시합니다' : '아이템 그리드를 3열 기본으로 표시합니다');
    }
  }

  function toggleLargeItemGrid() {
    setLargeItemGrid(!isLargeItemGridEnabled, { notify: true });
  }

  function setCoreCategoryWideCard(enabled, options = {}) {
    isCoreCategoryWideCardEnabled = normalizeCoreCategoryWideCard(enabled);
    saveSettings();
    renderCoreCategoryWideCardToggle();
    renderPromptDescriptionPreview();
    if (options.notify) {
      showToast(isCoreCategoryWideCardEnabled ? '핵심 분류 가로 카드가 켜졌습니다' : '핵심 분류 가로 카드가 꺼졌습니다');
    }
  }

  function toggleCoreCategoryWideCard() {
    setCoreCategoryWideCard(!isCoreCategoryWideCardEnabled, { notify: true });
  }

  function setPreviewTransitionMode(mode, options = {}) {
    previewTransitionMode = normalizePreviewTransitionMode(mode);
    saveSettings();
    renderPreviewTransitionMode();
    // 같은 이미지를 보고 있는 상태에서도 전환 효과 변경이 체감되도록 다음 렌더에서 재진입 애니메이션을 강제한다.
    lastRenderedPromptPreviewImageKey = '';
    lastRenderedComposedPreviewImageKey = '';
    renderPromptDescriptionPreview();
    renderComposedDescriptionPreview();
    if (options.notify) {
      showToast(`이미지 전환 효과를 ${getPreviewTransitionModeText(previewTransitionMode)}로 변경했습니다`);
    }
  }

  function openSettingsDrawer() {
    isSettingsDrawerOpen = true;
    renderSettingsDrawer();
  }

  function closeSettingsDrawer() {
    isSettingsDrawerOpen = false;
    renderSettingsDrawer();
  }

  function toggleSettingsDrawer() {
    isSettingsDrawerOpen = !isSettingsDrawerOpen;
    renderSettingsDrawer();
  }

  function openCategoryManageFromSettings() {
    closeSettingsDrawer();
    openCategoryManageModal();
  }

  function handleSettingsDrawerBackdrop(e) {
    if (e.target.id === 'settings-drawer') {
      closeSettingsDrawer();
    }
  }

