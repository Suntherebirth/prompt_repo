  function clearSelectedChipDragState() {
    const chips = document.querySelectorAll('.selected-chip');
    chips.forEach(chip => chip.classList.remove('dragging', 'drag-over'));
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

  function chipPointerDown(e) {
    if (e.pointerType !== 'touch') return;
    if (e.target.closest('.chip-remove')) return;

    touchDragIdx = +e.currentTarget.dataset.idx;
    touchDropIdx = touchDragIdx;
    touchPointerId = e.pointerId;
    e.currentTarget.classList.add('dragging');
    if (typeof e.currentTarget.setPointerCapture === 'function') {
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  }

  function chipPointerMove(e) {
    if (e.pointerType !== 'touch') return;
    if (touchDragIdx === null || touchPointerId !== e.pointerId) return;

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

    touchDragIdx = null;
    touchDropIdx = null;
    touchPointerId = null;

    if (typeof e.currentTarget.releasePointerCapture === 'function') {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Browsers may auto-release capture on pointerup.
      }
    }

    if (fromIdx === null || toIdx === null || fromIdx === toIdx) {
      clearSelectedChipDragState();
      return;
    }

    clearOutputOverride();
    const item = selected.splice(fromIdx, 1)[0];
    selected.splice(toIdx, 0, item);
    clearSelectedChipDragState();
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
