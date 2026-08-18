  function clearSelectedChipDragState() {
    const chips = document.querySelectorAll('.selected-chip');
    chips.forEach(chip => chip.classList.remove('dragging', 'drag-over'));
  }

  function signalDragReady(element) {
    if (!element) return;
    element.classList.remove('is-drag-ready');
    void element.offsetWidth;
    element.classList.add('is-drag-ready');
    window.setTimeout(() => element.classList.remove('is-drag-ready'), 420);
    if (typeof navigator.vibrate === 'function') navigator.vibrate(18);
  }

  function dragStart(e) {
    dragIdx = +e.currentTarget.dataset.idx;
    e.currentTarget.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(dragIdx));
  }

  function dragEnd() {
    dragIdx = null;
    clearSelectedChipDragState();
  }

  function clearTouchChipDragPress() {
    if (touchDragPressTimer) window.clearTimeout(touchDragPressTimer);
    touchDragPressTimer = null;
  }

  function resetTouchChipDrag() {
    clearTouchChipDragPress();
    if (touchDragElement) touchDragElement.draggable = true;
    touchDragIdx = null;
    touchDropIdx = null;
    touchPointerId = null;
    isTouchChipDragActive = false;
    touchDragStartX = 0;
    touchDragStartY = 0;
    touchDragElement = null;
    clearSelectedChipDragState();
  }

  function chipPointerDown(e, chip = e.currentTarget) {
    if (e.pointerType !== 'touch') return;
    if (e.target.closest('.chip-remove')) return;
    if (!chip) return;

    resetTouchChipDrag();
    touchDragIdx = +chip.dataset.idx;
    touchDropIdx = touchDragIdx;
    touchPointerId = e.pointerId;
    touchDragStartX = e.clientX;
    touchDragStartY = e.clientY;
    touchDragElement = chip;
    chip.draggable = false;
    touchDragPressTimer = window.setTimeout(() => {
      if (touchDragIdx === null || touchPointerId !== e.pointerId) return;
      isTouchChipDragActive = true;
      chip.classList.add('dragging');
      signalDragReady(chip);
      if (typeof chip.setPointerCapture === 'function') {
        try { chip.setPointerCapture(e.pointerId); } catch {}
      }
    }, LONG_PRESS_DURATION_MS);
  }

  function chipPointerMove(e) {
    if (e.pointerType !== 'touch') return;
    if (touchDragIdx === null || touchPointerId !== e.pointerId) return;
    if (!isTouchChipDragActive) {
      const movedDistance = Math.hypot(e.clientX - touchDragStartX, e.clientY - touchDragStartY);
      if (movedDistance >= LONG_PRESS_MOVE_TOLERANCE_PX) resetTouchChipDrag();
      return;
    }

    e.preventDefault();
    clearSelectedChipDragState();

    const draggingChip = document.querySelector(`.selected-chip[data-idx="${touchDragIdx}"]`);
    if (draggingChip) {
      draggingChip.classList.add('dragging');
    }

    const pointed = document.elementFromPoint(e.clientX, e.clientY);
    const targetChip = pointed ? pointed.closest('.selected-chip') : null;
    if (targetChip) {
      const targetIdx = +targetChip.dataset.idx;
      touchDropIdx = targetIdx;
      if (targetIdx !== touchDragIdx) {
        targetChip.classList.add('drag-over');
      }
      return;
    }

    const container = pointed ? pointed.closest('#selected-chips') : null;
    if (container && selected.length > 0) {
      touchDropIdx = selected.length - 1;
    }
  }

  function chipPointerEnd(e) {
    if (e.pointerType !== 'touch') return;
    if (touchDragIdx === null || touchPointerId !== e.pointerId) return;

    const fromIdx = touchDragIdx;
    const toIdx = touchDropIdx;
    const wasTouchDragActive = isTouchChipDragActive;

    clearTouchChipDragPress();

    if (wasTouchDragActive && typeof touchDragElement?.releasePointerCapture === 'function') {
      try { touchDragElement.releasePointerCapture(e.pointerId); } catch {}
    }

    resetTouchChipDrag();

    if (!wasTouchDragActive || fromIdx === null || toIdx === null || fromIdx === toIdx) {
      return;
    }

    clearOutputOverride();
    const item = selected.splice(fromIdx, 1)[0];
    selected.splice(toIdx, 0, item);
    render();
  }

  function dragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    clearSelectedChipDragState();
    const targetChip = e.currentTarget;
    if (targetChip && +targetChip.dataset.idx !== dragIdx) {
      targetChip.classList.add('drag-over');
    }
  }

  function dragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
  }

  function drop(e) {
    e.preventDefault();
    e.stopPropagation();
    const toIdx = +e.currentTarget.dataset.idx;
    if (dragIdx === null || dragIdx === toIdx) return;
    clearOutputOverride();
    const item = selected.splice(dragIdx, 1)[0];
    selected.splice(toIdx, 0, item);
    dragIdx = null;
    clearSelectedChipDragState();
    render();
  }

  function dragOverSelectedContainer(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  function dropOnSelectedContainer(e) {
    e.preventDefault();
    if (dragIdx === null) return;

    const targetChip = e.target.closest('.selected-chip');
    if (targetChip) {
      return;
    }

    clearOutputOverride();
    const item = selected.splice(dragIdx, 1)[0];
    selected.push(item);
    dragIdx = null;
    clearSelectedChipDragState();
    render();
  }

  // ── Toast ──
