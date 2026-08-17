  function normalizePreviewAnimationLevel(value) {
    if (value === true || value === 'true' || value === '1') return 2;
    if (value === false || value === '0') return 1;
    const level = Number(value);
    if (Number.isInteger(level) && level >= 1 && level <= 3) return level;
    return 2;
  }

  function renderPreviewAnimationLevel() {
    const buttons = document.querySelectorAll('[data-preview-animation-level]');
    buttons.forEach(button => {
      const level = Number(button.getAttribute('data-preview-animation-level'));
      const isActive = previewAnimationLevel === level;
      button.classList.toggle('active', isActive);
      button.title = getPreviewAnimationLevelLabel(level);
    });
  }

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

  function getPreviewAnimationLevelLabel(level) {
    if (level === 1) return '미리보기 애니메이션: 더 약하게';
    if (level === 3) return '미리보기 애니메이션: 더 강하게';
    return '미리보기 애니메이션: 기본';
  }

  function getPreviewAnimationLevelText(level) {
    if (level === 1) return '더 약하게';
    if (level === 3) return '더 강하게';
    return '기본';
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
        leftPanelTab === 'combo' && isCustomComboTabOpen
          ? await getCustomComboFlowGallery()
          : [leftPanelTab === 'combo' ? getActiveComposedPreviewImage() : getActivePromptPreviewImage()]
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

  function setPromptPreviewSizeLevel(level, options = {}) {
    promptPreviewSizeLevel = normalizePromptPreviewSizeLevel(level);
    saveSettings();
    renderPromptPreviewSizeLevel();
    renderPreviewRenderMode();
    renderPromptDescriptionPreview();
    renderComposedDescriptionPreview();
    if (options.notify) {
      showToast(`이미지 영역 크기를 ${getPromptPreviewSizeLabel(promptPreviewSizeLevel)}로 변경했습니다`);
    }
  }

  function setPreviewAnimationLevel(level, options = {}) {
    previewAnimationLevel = normalizePreviewAnimationLevel(level);
    saveSettings();
    renderPreviewAnimationLevel();
    renderPromptDescriptionPreview();
    renderComposedDescriptionPreview();
    if (options.notify) {
      showToast(`미리보기 애니메이션을 ${getPreviewAnimationLevelText(previewAnimationLevel)}로 변경했습니다`);
    }
  }

  function normalizeCoreCategoryWideCard(value) {
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

  function setPreviewRenderMode(mode, options = {}) {
    const nextMode = normalizePreviewRenderMode(mode);
    const didModeChange = previewRenderMode !== nextMode;
    previewRenderMode = nextMode;
    saveSettings();
    renderPreviewRenderMode();
    renderPromptList();
    if (didModeChange) {
      lastRenderedPromptPreviewImageKey = '';
      lastRenderedComposedPreviewImageKey = '';
    }
    renderPromptDescriptionPreview();
    renderComposedDescriptionPreview();
    renderPendingPromptImagePreview();
    renderPendingComposedImagePreview();
    if (options.notify) {
      showToast(`미리보기 렌더링 모드를 ${getPreviewRenderModeLabel(previewRenderMode)}로 변경했습니다`);
    }
  }

  function togglePreviewAnimation() {
    const nextLevel = previewAnimationLevel >= 3 ? 1 : previewAnimationLevel + 1;
    setPreviewAnimationLevel(nextLevel, { notify: true });
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

