  function getActiveImageViewerEntry() {
    if (!activeImageViewer) return null;
    const gallery = Array.isArray(activeImageViewer.gallery) && activeImageViewer.gallery.length > 0
      ? activeImageViewer.gallery
      : [activeImageViewer];
    const index = Number.isInteger(activeImageViewer.index) ? activeImageViewer.index : 0;
    const safeIndex = Math.min(Math.max(index, 0), gallery.length - 1);
    return {
      gallery,
      index: safeIndex,
      current: gallery[safeIndex] || gallery[0],
    };
  }

  function navigateImageViewer(step) {
    if (!activeImageViewer?.gallery || activeImageViewer.gallery.length <= 1) return;
    const nextIndex = (activeImageViewer.index + step + activeImageViewer.gallery.length) % activeImageViewer.gallery.length;
    const nextEntry = activeImageViewer.gallery[nextIndex];
    if (!nextEntry) return;
    activeImageViewer = { ...nextEntry, gallery: activeImageViewer.gallery, index: nextIndex };
    renderImageViewer();
  }

  function renderImageViewer() {
    const modal = document.getElementById('image-viewer-modal');
    const image = document.getElementById('image-viewer-image');
    const stage = modal?.querySelector('.image-viewer-stage');
    const transition = document.getElementById('image-viewer-transition');
    const transitionFrom = document.getElementById('image-viewer-transition-from');
    const transitionTo = document.getElementById('image-viewer-transition-to');
    if (!modal || !image || !stage || !transition || !transitionFrom || !transitionTo) return;

    const activeEntry = getActiveImageViewerEntry();
    const current = activeEntry?.current || null;
    const gallery = activeEntry?.gallery || (current ? [current] : []);
    const isTransition = !!current?.transition?.fromSrc && !!current?.transition?.toSrc;
    const isOpen = !!(current?.src || isTransition);

    modal.classList.toggle('open', isOpen);
    stage.classList.toggle('is-transition-viewer', isTransition);
    if (isOpen) {
      if (isTransition) {
        image.removeAttribute('src');
        transitionFrom.src = current.transition.fromSrc;
        transitionFrom.alt = current.transition.fromAlt || '시작 이미지';
        transitionTo.src = current.transition.toSrc;
        transitionTo.alt = current.transition.toAlt || '마지막 이미지';
      } else {
        image.src = current.src;
        image.alt = current.alt || '설명 이미지';
        transitionFrom.removeAttribute('src');
        transitionTo.removeAttribute('src');
      }
      resetImageViewerTransform();
    } else {
      image.removeAttribute('src');
      image.alt = '';
      transitionFrom.removeAttribute('src');
      transitionTo.removeAttribute('src');
      resetImageViewerTransform();
    }
  }

  function clampImageViewerScale(scale) {
    return Math.min(5, Math.max(1, scale));
  }

  function applyImageViewerTransform() {
    const image = document.getElementById('image-viewer-image');
    if (!image) return;
    image.style.transform = `translate(${imageViewerTranslateX}px, ${imageViewerTranslateY}px) scale(${imageViewerScale})`;
  }

  function resetImageViewerTransform() {
    imageViewerScale = 1;
    imageViewerTranslateX = 0;
    imageViewerTranslateY = 0;
    imageViewerPointers = new Map();
    imageViewerPinchStartDistance = 0;
    imageViewerPinchStartScale = 1;
    imageViewerDragPointerId = null;
    imageViewerDragOffsetX = 0;
    imageViewerDragOffsetY = 0;
    imageViewerSwipeStartX = 0;
    imageViewerSwipeStartY = 0;
    applyImageViewerTransform();
  }

  function getPointerDistance(pointerA, pointerB) {
    const dx = pointerA.x - pointerB.x;
    const dy = pointerA.y - pointerB.y;
    return Math.hypot(dx, dy);
  }

  function markImageViewerGesture() {
    imageViewerLastGestureAt = Date.now();
  }

  function onImageViewerPointerDown(e) {
    if (!activeImageViewer?.src && !activeImageViewer?.transition) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    imageViewerPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}

    imageViewerSwipeStartX = e.clientX;
    imageViewerSwipeStartY = e.clientY;

    if (imageViewerPointers.size === 1 && imageViewerScale > 1) {
      imageViewerDragPointerId = e.pointerId;
      imageViewerDragOffsetX = e.clientX - imageViewerTranslateX;
      imageViewerDragOffsetY = e.clientY - imageViewerTranslateY;
    }

    if (imageViewerPointers.size === 2) {
      const [first, second] = [...imageViewerPointers.values()];
      imageViewerPinchStartDistance = getPointerDistance(first, second);
      imageViewerPinchStartScale = imageViewerScale;
      imageViewerDragPointerId = null;
    }
  }

  function onImageViewerPointerMove(e) {
    if (!imageViewerPointers.has(e.pointerId)) return;
    imageViewerPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (imageViewerPointers.size === 2) {
      const [first, second] = [...imageViewerPointers.values()];
      const distance = getPointerDistance(first, second);
      if (imageViewerPinchStartDistance > 0) {
        const nextScale = clampImageViewerScale((distance / imageViewerPinchStartDistance) * imageViewerPinchStartScale);
        if (Math.abs(nextScale - imageViewerScale) > 0.001) {
          imageViewerScale = nextScale;
          if (imageViewerScale <= 1.01) {
            imageViewerScale = 1;
            imageViewerTranslateX = 0;
            imageViewerTranslateY = 0;
          }
          applyImageViewerTransform();
          markImageViewerGesture();
        }
      }
      e.preventDefault();
      return;
    }

    if (imageViewerPointers.size === 1 && imageViewerDragPointerId === e.pointerId && imageViewerScale > 1) {
      const nextX = e.clientX - imageViewerDragOffsetX;
      const nextY = e.clientY - imageViewerDragOffsetY;
      if (Math.abs(nextX - imageViewerTranslateX) > 0.5 || Math.abs(nextY - imageViewerTranslateY) > 0.5) {
        imageViewerTranslateX = nextX;
        imageViewerTranslateY = nextY;
        applyImageViewerTransform();
        markImageViewerGesture();
      }
      e.preventDefault();
      return;
    }

    if (imageViewerPointers.size === 1 && imageViewerScale <= 1.01 && activeImageViewer?.gallery?.length > 1) {
      const deltaX = e.clientX - imageViewerSwipeStartX;
      const deltaY = e.clientY - imageViewerSwipeStartY;
      if (Math.abs(deltaX) > 4 && Math.abs(deltaX) > Math.abs(deltaY)) {
        imageViewerTranslateX = deltaX;
        imageViewerTranslateY = 0;
        applyImageViewerTransform();
        e.preventDefault();
      }
    }
  }

  function onImageViewerPointerEnd(e) {
    imageViewerPointers.delete(e.pointerId);
    if (imageViewerDragPointerId === e.pointerId) {
      imageViewerDragPointerId = null;
    }

    if (imageViewerPointers.size < 2) {
      imageViewerPinchStartDistance = 0;
      imageViewerPinchStartScale = imageViewerScale;
    }

    if (imageViewerPointers.size === 1 && imageViewerScale > 1) {
      const [pointerId, pointer] = [...imageViewerPointers.entries()][0];
      imageViewerDragPointerId = pointerId;
      imageViewerDragOffsetX = pointer.x - imageViewerTranslateX;
      imageViewerDragOffsetY = pointer.y - imageViewerTranslateY;
    }

    if (imageViewerScale <= 1.01 && activeImageViewer?.gallery?.length > 1) {
      const deltaX = e.clientX - imageViewerSwipeStartX;
      const deltaY = e.clientY - imageViewerSwipeStartY;
      if (Math.abs(deltaX) > 60 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
        navigateImageViewer(deltaX < 0 ? 1 : -1);
      } else {
        resetImageViewerTransform();
      }
    }
  }

  function handleImageViewerImageTap(e) {
    e.stopPropagation();
    if (Date.now() - imageViewerLastGestureAt < 220) return;
    closeImageViewer();
  }

