  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const loaded = raw ? JSON.parse(raw) : [];
      prompts = loaded.map(normalizePrompt).filter(Boolean);
    } catch { prompts = []; }

    try {
      const rawComposed = localStorage.getItem(COMPOSED_STORAGE_KEY);
      const loadedComposed = rawComposed ? JSON.parse(rawComposed) : [];
      const composedSourceById = new Map(
        (Array.isArray(loadedComposed) ? loadedComposed : [])
          .filter(item => item?.id)
          .map(item => [String(item.id), item])
      );
      composedPrompts = (Array.isArray(loadedComposed) ? loadedComposed : [])
        .map(item => normalizeComposedPrompt(item, composedSourceById))
        .filter(Boolean);
    } catch { composedPrompts = []; }

    try {
      const rawCustomCombos = localStorage.getItem(CUSTOM_COMBO_STORAGE_KEY);
      const loadedCustomCombos = rawCustomCombos ? JSON.parse(rawCustomCombos) : [];
      customCombos = Array.isArray(loadedCustomCombos) ? loadedCustomCombos.filter(item => item && item.id).map(normalizeCustomCombo) : [];
    } catch { customCombos = []; }

    try {
      const rawHidden = localStorage.getItem(HIDDEN_MAIN_CATEGORIES_KEY);
      const loadedHidden = rawHidden ? JSON.parse(rawHidden) : [];
      hiddenMainCategories = new Set(Array.isArray(loadedHidden) ? loadedHidden.filter(Boolean) : []);
    } catch { hiddenMainCategories = new Set(); }

    try {
      const rawCategoryConfig = localStorage.getItem(CATEGORY_CONFIG_KEY);
      const parsed = rawCategoryConfig ? JSON.parse(rawCategoryConfig) : null;
      if (parsed && typeof parsed === 'object') {
        const mainOrder = Array.isArray(parsed.mainOrder) ? parsed.mainOrder.filter(Boolean) : [];
        const mains = parsed.mains && typeof parsed.mains === 'object' ? parsed.mains : {};
        categoryConfig = createDefaultCategoryConfig();
        categoryConfig.mainOrder = uniqueInOrder(mainOrder);
        Object.entries(mains).forEach(([key, value]) => {
          if (!key || !value || typeof value !== 'object') return;
          categoryConfig.mains[key] = {
            hiddenByDefault: !!value.hiddenByDefault,
            emoji: typeof value.emoji === 'string' ? value.emoji.trim() : '',
            subOrder: uniqueInOrder(Array.isArray(value.subOrder) ? value.subOrder.filter(Boolean) : []),
            subSettings: Object.fromEntries(
              Object.entries((value.subSettings && typeof value.subSettings === 'object') ? value.subSettings : {}).map(([subKey, subValue]) => [subKey, { ...(subValue || {}) }])
            ),
          };
        });
      } else {
        categoryConfig = createDefaultCategoryConfig();
      }
    } catch {
      categoryConfig = createDefaultCategoryConfig();
    }

    try {
      const rawComposedCategoryConfig = localStorage.getItem(COMPOSED_CATEGORY_CONFIG_KEY);
      const parsed = rawComposedCategoryConfig ? JSON.parse(rawComposedCategoryConfig) : null;
      if (parsed && typeof parsed === 'object') {
        const mains = parsed.mains && typeof parsed.mains === 'object' ? parsed.mains : {};
        composedCategoryConfig = createDefaultComposedCategoryConfig();
        Object.entries(mains).forEach(([key, value]) => {
          if (!key || !value || typeof value !== 'object') return;
          composedCategoryConfig.mains[key] = {
            editOnly: !!value.editOnly,
            emoji: typeof value.emoji === 'string' ? value.emoji.trim() : '',
          };
        });
      } else {
        composedCategoryConfig = createDefaultComposedCategoryConfig();
      }
    } catch {
      composedCategoryConfig = createDefaultComposedCategoryConfig();
    }

    try {
      const rawTagLayouts = localStorage.getItem(TAG_LAYOUT_STORAGE_KEY);
      const parsed = rawTagLayouts ? JSON.parse(rawTagLayouts) : {};
      promptTagLayouts = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      promptTagLayouts = {};
    }

    applyPromptDescriptionRules();
    ensureCategoryConfigConsistency();
    ensureComposedCategoryConfigConsistency();

  }

  function save() {
    const promptPayload = prompts.map(cleanPrompt);
    const composedPayload = composedPrompts.map(item => ({
      id: item.id,
      mainCategory: item.mainCategory,
      subCategory: item.subCategory,
      category: item.category,
      items: Array.isArray(item.items) ? item.items.map(cleanPrompt) : [],
      content: item.content,
      imageId: item.imageId || '',
      imageData: !item.imageId && item.imageData ? item.imageData : '',
      imageName: item.imageName || '',
      portraitImageId: item.portraitImageId || '',
      portraitImageData: !item.portraitImageId && item.portraitImageData ? item.portraitImageData : '',
      portraitImageName: item.portraitImageName || '',
      beforeImageId: item.beforeImageId || '',
      beforeImageData: !item.beforeImageId && item.beforeImageData ? item.beforeImageData : '',
      beforeImageName: item.beforeImageName || '',
      beforePortraitImageId: item.beforePortraitImageId || '',
      beforePortraitImageData: !item.beforePortraitImageId && item.beforePortraitImageData ? item.beforePortraitImageData : '',
      beforePortraitImageName: item.beforePortraitImageName || '',
    }));

    localStorage.setItem(STORAGE_KEY, JSON.stringify(promptPayload));
    localStorage.setItem(COMPOSED_STORAGE_KEY, JSON.stringify(composedPayload));
    localStorage.setItem(CUSTOM_COMBO_STORAGE_KEY, JSON.stringify(customCombos.map(cleanCustomCombo)));
    localStorage.setItem(HIDDEN_MAIN_CATEGORIES_KEY, JSON.stringify([...hiddenMainCategories]));
    localStorage.setItem(CATEGORY_CONFIG_KEY, JSON.stringify(categoryConfig));
    localStorage.setItem(COMPOSED_CATEGORY_CONFIG_KEY, JSON.stringify(composedCategoryConfig));
    localStorage.setItem(TAG_LAYOUT_STORAGE_KEY, JSON.stringify(promptTagLayouts));
  }

  function getSettingsPayload() {
    return {
      tapComposeMode,
      previewTransitionMode,
      isCoreCategoryWideCardEnabled,
      isLargeItemGridEnabled,
      isExportMetadataSanitizationEnabled,
    };
  }

  function saveSettings() {
    const payload = getSettingsPayload();
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(payload));
    localStorage.setItem(TAP_COMPOSE_MODE_KEY, payload.tapComposeMode);
    localStorage.removeItem('prompt_repo_preview_render_mode_v1');
    localStorage.removeItem('prompt_repo_view_orientation_v1');
    localStorage.removeItem('prompt_repo_prompt_preview_size_level_v1');
    localStorage.removeItem('prompt_repo_preview_animation_v1');
    localStorage.setItem(PREVIEW_TRANSITION_MODE_KEY, payload.previewTransitionMode);
    localStorage.setItem(CORE_CATEGORY_WIDE_CARD_KEY, payload.isCoreCategoryWideCardEnabled ? '1' : '0');
    localStorage.setItem(LARGE_ITEM_GRID_KEY, payload.isLargeItemGridEnabled ? '1' : '0');
    localStorage.setItem(EXPORT_METADATA_SANITIZATION_KEY, payload.isExportMetadataSanitizationEnabled ? '1' : '0');
  }

  function loadSettings() {
    let storedSettings = null;
    try {
      const rawSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
      storedSettings = rawSettings ? JSON.parse(rawSettings) : null;
    } catch {
      storedSettings = null;
    }

    setTapComposeMode(storedSettings?.tapComposeMode ?? localStorage.getItem(TAP_COMPOSE_MODE_KEY));
    setPreviewTransitionMode(storedSettings?.previewTransitionMode ?? localStorage.getItem(PREVIEW_TRANSITION_MODE_KEY) ?? 'scale');
    setCoreCategoryWideCard(storedSettings?.isCoreCategoryWideCardEnabled ?? localStorage.getItem(CORE_CATEGORY_WIDE_CARD_KEY));
    setLargeItemGrid(storedSettings?.isLargeItemGridEnabled ?? localStorage.getItem(LARGE_ITEM_GRID_KEY));
    isExportMetadataSanitizationEnabled = storedSettings?.isExportMetadataSanitizationEnabled
      ?? localStorage.getItem(EXPORT_METADATA_SANITIZATION_KEY) !== '0';
    saveSettings();
  }

