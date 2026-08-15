  function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
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

