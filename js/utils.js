  function resolveToastTone(message, toneHint) {
    const allowed = new Set(['success', 'info', 'warning', 'danger']);
    if (typeof toneHint === 'string' && allowed.has(toneHint)) return toneHint;

    const text = String(message || '').trim();

    if (!text) return 'info';

    if (/완료|복사되었습니다|저장되었습니다|수정되었습니다|삭제되었습니다|추가되었습니다|변경되었습니다|전환되었습니다|이동했습니다|가져오기 완료|내보내기 완료/.test(text)) {
      return 'success';
    }

    if (/실패|오류|복사하지 못|읽지 못|불러오지 못/.test(text)) {
      return 'danger';
    }

    if (/없습니다|비어 있|취소|찾지 못|입력하세요|입력해 주세요/.test(text)) {
      return 'warning';
    }

    if (/유지합니다|제거합니다|켜졌습니다|꺼졌습니다|변경했습니다|기본으로 표시|크게 표시/.test(text)) {
      return 'info';
    }

    return 'info';
  }

  function showToast(msg, toneHint) {
    const t = document.getElementById('toast');
    if (!t) return;

    const tone = resolveToastTone(msg, toneHint);
    t.textContent = String(msg || '');
    t.classList.remove('toast-success', 'toast-info', 'toast-warning', 'toast-danger');
    t.classList.add(`toast-${tone}`);
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 2000);
  }

  // ── Escape HTML ──
  function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function bindPressAction(element, handler) {
    if (!element || typeof handler !== 'function') return;

    let lastTouchPressAt = 0;

    element.addEventListener('pointerup', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (e.pointerType !== 'mouse') {
        lastTouchPressAt = Date.now();
      }
      handler(e);
    });

    element.addEventListener('click', (e) => {
      if (Date.now() - lastTouchPressAt < 500) return;
      handler(e);
    });
  }

  function preventSafariDoubleTapZoom() {
    const DOUBLE_TAP_DELAY = 320;
    let lastTouchEndAt = 0;

    document.addEventListener('touchend', (e) => {
      const target = e.target;
      if (!(target instanceof Element)) return;

      // 더블탭이 자주 발생하는 상호작용 영역에서만 확대 제스처를 차단한다.
      if (!target.closest('.prompt-item, .prompt-list, .cat-chip, .mode-toggle-btn, .btn, .tap-compose-toggle-btn, .settings-trigger-btn, .prompt-description-preview')) return;

      const now = Date.now();
      if (now - lastTouchEndAt <= DOUBLE_TAP_DELAY) {
        e.preventDefault();
      }
      lastTouchEndAt = now;
    }, { passive: false });
  }

