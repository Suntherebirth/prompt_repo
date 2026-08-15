  function renderImageViewer() {
    const modal = document.getElementById('image-viewer-modal');
    const image = document.getElementById('image-viewer-image');
    if (!modal || !image) return;

    const isOpen = !!activeImageViewer?.src;
    modal.classList.toggle('open', isOpen);
    if (isOpen) {
      image.src = activeImageViewer.src;
      image.alt = activeImageViewer.alt || '설명 이미지';
      resetImageViewerTransform();
    } else {
      image.removeAttribute('src');
      image.alt = '';
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
    if (!activeImageViewer?.src) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    imageViewerPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}

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
  }

  function handleImageViewerImageTap(e) {
    e.stopPropagation();
    if (Date.now() - imageViewerLastGestureAt < 220) return;
    closeImageViewer();
  }

