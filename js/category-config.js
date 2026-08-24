  function createDefaultCategoryConfig() {
    return {
      mainOrder: [],
      mains: {},
    };
  }

  function createDefaultComposedCategoryConfig() {
    return {
      mains: {},
    };
  }
  function uniqueInOrder(values) {
    const seen = new Set();
    const result = [];
    values.forEach(value => {
      if (!value || seen.has(value)) return;
      seen.add(value);
      result.push(value);
    });
    return result;
  }

  function getPromptTagLayoutKey(mainCategory, subCategory) {
    return JSON.stringify([mainCategory || '', subCategory || '']);
  }

  function getPromptTagLayout(tags) {
    const key = getPromptTagLayoutKey(activeCategoryPrompt, activeSubCategoryPrompt);
    const availableTags = uniqueInOrder(tags);
    const availableSet = new Set(availableTags);
    const stored = Array.isArray(promptTagLayouts[key]) ? promptTagLayouts[key] : [];

    // 원본 레이아웃은 프라이빗 모드 토글로 파괴되지 않도록 비가시 태그도 유지한다.
    const canonicalLayout = [];
    const canonicalTagSet = new Set();
    stored.forEach(item => {
      if (!item || typeof item !== 'object') return;
      if (item.type === 'divider') {
        if (typeof item.id === 'string' && item.id) canonicalLayout.push({ type: 'divider', id: item.id });
        return;
      }
      if (item.type !== 'tag') return;
      const tag = typeof item.tag === 'string' ? item.tag : '';
      if (!tag || canonicalTagSet.has(tag)) return;
      canonicalTagSet.add(tag);
      canonicalLayout.push({ type: 'tag', tag });
    });

    // 새로 생긴 태그만 canonical 끝에 추가한다.
    let canonicalChanged = false;
    availableTags.forEach(tag => {
      if (canonicalTagSet.has(tag)) return;
      canonicalTagSet.add(tag);
      canonicalLayout.push({ type: 'tag', tag });
      canonicalChanged = true;
    });
    if (canonicalChanged || !Array.isArray(promptTagLayouts[key])) {
      promptTagLayouts[key] = canonicalLayout;
    }

    // 화면 표시용 레이아웃은 현재 가시 태그만 사용하되 연속 구분선은 정리한다.
    const visibleLayout = [];
    canonicalLayout.forEach(item => {
      if (item.type === 'tag') {
        if (availableSet.has(item.tag)) visibleLayout.push(item);
        return;
      }
      visibleLayout.push(item);
    });

    const normalizedVisibleLayout = [];
    visibleLayout.forEach(item => {
      const last = normalizedVisibleLayout[normalizedVisibleLayout.length - 1];
      if (item.type === 'divider') {
        if (!last || last.type === 'divider') return;
        normalizedVisibleLayout.push(item);
        return;
      }
      normalizedVisibleLayout.push(item);
    });
    return normalizedVisibleLayout;
  }

  function savePromptTagLayout(layout) {
    const key = getPromptTagLayoutKey(activeCategoryPrompt, activeSubCategoryPrompt);
    promptTagLayouts[key] = layout;
    save();
  }

  function ensureMainCategoryConfig(mainCategory) {
    if (!mainCategory) return null;
    if (!categoryConfig.mains[mainCategory]) {
      categoryConfig.mains[mainCategory] = {
        hiddenByDefault: false,
        isPrivate: false,
        emoji: '',
        subOrder: [],
        subSettings: {},
      };
    }
    if (!categoryConfig.mains[mainCategory].subSettings || typeof categoryConfig.mains[mainCategory].subSettings !== 'object') {
      categoryConfig.mains[mainCategory].subSettings = {};
    }
    return categoryConfig.mains[mainCategory];
  }

  function getMainCategoryConfig(mainCategory) {
    if (!mainCategory) return { hiddenByDefault: false, isPrivate: false, emoji: '', subOrder: [], subSettings: {} };
    const found = categoryConfig.mains[mainCategory];
    if (found) {
      if (!found.subSettings || typeof found.subSettings !== 'object') {
        found.subSettings = {};
      }
      if (typeof found.isPrivate !== 'boolean') {
        found.isPrivate = false;
      }
      return found;
    }
    return { hiddenByDefault: false, isPrivate: false, emoji: '', subOrder: [], subSettings: {} };
  }

  function getSubCategoryConfig(mainCategory, subCategory) {
    const mainConfig = getMainCategoryConfig(mainCategory);
    if (!subCategory) return { randomSelection: false, isCore: false, isPrivate: false };
    const found = mainConfig.subSettings?.[subCategory];
    if (found && typeof found === 'object') return found;
    return { randomSelection: false, isCore: false, isPrivate: false };
  }

  function isMainCategoryPrivate(mainCategory) {
    return !!getMainCategoryConfig(mainCategory).isPrivate;
  }

  function isSubCategoryPrivate(mainCategory, subCategory) {
    return !!getSubCategoryConfig(mainCategory, subCategory).isPrivate;
  }

  function isPromptCategoryPrivate(mainCategory, subCategory) {
    return isMainCategoryPrivate(mainCategory) || isSubCategoryPrivate(mainCategory, subCategory);
  }

  function isPrivateStealthModeEnabled() {
    return !!isPrivateStealthMode;
  }

  function isPromptVisibleInCurrentMode(prompt) {
    if (!prompt) return false;
    if (!isPrivateStealthModeEnabled()) return true;
    return !(!!prompt.isPrivate || isPromptCategoryPrivate(prompt.mainCategory, prompt.subCategory));
  }

  function getSubCategoryDescription(mainCategory, subCategory) {
    return String(getSubCategoryConfig(mainCategory, subCategory).description || '').trim();
  }

  function setSubCategoryDescription(mainCategory, subCategory, description) {
    if (!mainCategory || !subCategory) return;
    const mainConfig = ensureMainCategoryConfig(mainCategory);
    mainConfig.subSettings[subCategory] = {
      ...(mainConfig.subSettings[subCategory] || {}),
      description: String(description || '').trim(),
    };
  }

  function setMainCategoryPrivate(mainCategory, enabled) {
    if (!mainCategory) return;
    const mainConfig = ensureMainCategoryConfig(mainCategory);
    mainConfig.isPrivate = !!enabled;
    applyCategoryPrivacyRules();
  }

  function setSubCategoryPrivate(mainCategory, subCategory, enabled) {
    if (!mainCategory || !subCategory) return;
    const mainConfig = ensureMainCategoryConfig(mainCategory);
    mainConfig.subSettings[subCategory] = {
      ...(mainConfig.subSettings[subCategory] || {}),
      isPrivate: !!enabled,
    };
    applyCategoryPrivacyRules();
  }

  function isSubCategoryRandomSelectionEnabled(mainCategory, subCategory) {
    return !!getSubCategoryConfig(mainCategory, subCategory).randomSelection;
  }

  function isSubCategoryCoreEnabled(mainCategory, subCategory) {
    return !!getSubCategoryConfig(mainCategory, subCategory).isCore;
  }

  function getSubCategoryLinkedComposedId(mainCategory, subCategory) {
    return String(getSubCategoryConfig(mainCategory, subCategory).linkedComposedId || '').trim();
  }

  function setSubCategoryLinkedComposedId(mainCategory, subCategory, composedId) {
    if (!mainCategory || !subCategory) return;
    const mainConfig = ensureMainCategoryConfig(mainCategory);
    mainConfig.subSettings[subCategory] = {
      ...(mainConfig.subSettings[subCategory] || {}),
      linkedComposedId: String(composedId || '').trim(),
    };
  }

  // IRP(이미지 레퍼런스 프롬프트): 중분류에 연결된 커스텀 조합 카드의 실제 아이템들을 현재 조합(selected)에 그대로 불러온다.
  // customOutputText로 텍스트만 덮어쓰면 selected가 갱신되지 않아, 이후 전체 아이템 그리드 스와이프 선택 시
  // 엉뚱한 이전 selected 내용으로 되돌아가는 문제가 있었다 (커스텀 조합 카드 로드와 동일하게 selected를 채워야 함).
  function copyLinkedIrpPrompt(mainCategory, subCategory) {
    const composedId = getSubCategoryLinkedComposedId(mainCategory, subCategory);
    const composed = composedPrompts.find(item => item.id === composedId);
    if (!composed) {
      showToast('연결된 IRP가 없습니다');
      return;
    }
    clearOutputOverride();
    selected = (composed.items || []).map(entry => ({ ...normalizeSelected(entry), source: 'prompt' })).filter(entry => entry && entry.content);
    const text = getComposedOutputText();
    if (!text) {
      showToast('연결된 IRP가 없습니다');
      return;
    }
    updateOutput();
    renderSelected();
    renderPromptList();
    copyPromptSilently(text).then(ok => {
      if (ok) showToast('IRP가 복사되었습니다!');
    });
  }

  function findCoreSubCategorySelection() {
    const mainCategories = getMainCategories();
    for (const mainCategory of mainCategories) {
      const subCategories = getSubCategories(mainCategory);
      for (const subCategory of subCategories) {
        if (isSubCategoryCoreEnabled(mainCategory, subCategory)) {
          return { mainCategory, subCategory };
        }
      }
    }
    return null;
  }

  function applyCoreSubCategorySelection() {
    const coreSelection = findCoreSubCategorySelection();
    if (!coreSelection) return false;
    activeCategoryPrompt = coreSelection.mainCategory;
    activeSubCategoryPrompt = coreSelection.subCategory;
    if (getMainCategoryConfig(coreSelection.mainCategory).hiddenByDefault) {
      openedHiddenMainCategories.add(coreSelection.mainCategory);
    }
    return true;
  }

  function setSubCategoryRandomSelection(mainCategory, subCategory, enabled) {
    if (!mainCategory || !subCategory) return;
    const mainConfig = ensureMainCategoryConfig(mainCategory);
    mainConfig.subSettings = mainConfig.subSettings || {};
    mainConfig.subSettings[subCategory] = {
      ...(mainConfig.subSettings[subCategory] || {}),
      randomSelection: !!enabled,
    };
  }

  function setSubCategoryCore(mainCategory, subCategory, enabled) {
    if (!mainCategory || !subCategory) return;
    ensureCategoryConfigConsistency();
    const mainCategories = [...categoryConfig.mainOrder];
    mainCategories.forEach((currentMain) => {
      const mainConfig = ensureMainCategoryConfig(currentMain);
      const subCategories = uniqueInOrder(mainConfig.subOrder || []);
      subCategories.forEach((currentSub) => {
        const prev = mainConfig.subSettings[currentSub] || {};
        if (currentMain === mainCategory && currentSub === subCategory) {
          mainConfig.subSettings[currentSub] = {
            ...prev,
            isCore: !!enabled,
          };
        } else if (enabled && prev.isCore) {
          mainConfig.subSettings[currentSub] = {
            ...prev,
            isCore: false,
          };
        }
      });
    });
  }

  function ensureCategoryConfigConsistency() {
    const promptMainOrder = uniqueInOrder(prompts.map(p => p.mainCategory).filter(Boolean));
    const configuredMainKeys = Object.keys(categoryConfig.mains || {});
    categoryConfig.mainOrder = uniqueInOrder([...(categoryConfig.mainOrder || []), ...configuredMainKeys, ...promptMainOrder]);

    let hasCoreSubCategory = false;

    categoryConfig.mainOrder.forEach(mainCategory => {
      const mainConfig = ensureMainCategoryConfig(mainCategory);
      const promptSubOrder = uniqueInOrder(
        prompts
          .filter(p => p.mainCategory === mainCategory)
          .map(p => p.subCategory)
          .filter(Boolean)
      );
      mainConfig.subOrder = uniqueInOrder([...(mainConfig.subOrder || []), ...promptSubOrder]);
      if (!mainConfig.subSettings || typeof mainConfig.subSettings !== 'object') {
        mainConfig.subSettings = {};
      }
      if (typeof mainConfig.hiddenByDefault !== 'boolean') {
        mainConfig.hiddenByDefault = false;
      }
      if (typeof mainConfig.isPrivate !== 'boolean') {
        mainConfig.isPrivate = false;
      }
      if (typeof mainConfig.emoji !== 'string') {
        mainConfig.emoji = '';
      }
      mainConfig.subOrder.forEach((subCategory) => {
        const prev = mainConfig.subSettings[subCategory];
        const next = prev && typeof prev === 'object' ? prev : {};
        if (typeof next.randomSelection !== 'boolean') {
          next.randomSelection = false;
        }
        if (typeof next.isCore !== 'boolean') {
          next.isCore = false;
        }
        if (typeof next.description !== 'string') {
          next.description = '';
        }
        if (typeof next.isPrivate !== 'boolean') {
          next.isPrivate = false;
        }
        if (next.isCore) {
          if (hasCoreSubCategory) {
            next.isCore = false;
          } else {
            hasCoreSubCategory = true;
          }
        }
        mainConfig.subSettings[subCategory] = next;
      });
    });

    hiddenMainCategories.forEach(mainCategory => {
      const mainConfig = ensureMainCategoryConfig(mainCategory);
      mainConfig.hiddenByDefault = true;
    });

    hiddenMainCategories = new Set(
      categoryConfig.mainOrder.filter(mainCategory => getMainCategoryConfig(mainCategory).hiddenByDefault)
    );
  }

  function applyPromptDescriptionRules() {
    const normalizeDescription = (prompt) => {
      if (!prompt) return prompt;
      return {
        ...prompt,
        description: isSubCategoryCoreEnabled(prompt.mainCategory, prompt.subCategory)
          ? String(prompt.description ?? '').trim()
          : '',
      };
    };

    prompts = prompts.map(normalizeDescription);
    composedPrompts = composedPrompts.map((composed) => ({
      ...composed,
      items: Array.isArray(composed.items) ? composed.items.map(normalizeDescription) : [],
    }));
  }

  function ensureComposedMainCategoryConfig(mainCategory) {
    if (!mainCategory) return null;
    if (!composedCategoryConfig.mains[mainCategory]) {
      composedCategoryConfig.mains[mainCategory] = {
        editOnly: false,
        isPrivate: false,
        emoji: '',
        subSettings: {},
      };
    }
    if (!composedCategoryConfig.mains[mainCategory].subSettings || typeof composedCategoryConfig.mains[mainCategory].subSettings !== 'object') {
      composedCategoryConfig.mains[mainCategory].subSettings = {};
    }
    return composedCategoryConfig.mains[mainCategory];
  }

  function getComposedMainCategoryConfig(mainCategory) {
    if (!mainCategory) return { editOnly: false, isPrivate: false, emoji: '', subSettings: {} };
    const found = composedCategoryConfig.mains[mainCategory];
    if (found) {
      if (!found.subSettings || typeof found.subSettings !== 'object') {
        found.subSettings = {};
      }
      if (typeof found.isPrivate !== 'boolean') {
        found.isPrivate = false;
      }
      return found;
    }
    return { editOnly: false, isPrivate: false, emoji: '', subSettings: {} };
  }

  function getComposedSubCategoryConfig(mainCategory, subCategory) {
    const mainConfig = getComposedMainCategoryConfig(mainCategory);
    if (!subCategory) return { isPrivate: false };
    const found = mainConfig.subSettings?.[subCategory];
    if (found && typeof found === 'object') return found;
    return { isPrivate: false };
  }

  function isComposedCategoryPrivate(mainCategory, subCategory) {
    return !!getComposedMainCategoryConfig(mainCategory).isPrivate || !!getComposedSubCategoryConfig(mainCategory, subCategory).isPrivate;
  }

  function isComposedPromptVisibleInCurrentMode(composed) {
    if (!composed) return false;
    if (!isPrivateStealthModeEnabled()) return true;
    if (!!composed.isPrivate || isComposedCategoryPrivate(composed.mainCategory, composed.subCategory)) return false;
    const items = Array.isArray(composed.items) ? composed.items : [];
    return items.every((entry) => isPromptVisibleInCurrentMode(entry));
  }

  function isCustomComboVisibleInCurrentMode(combo) {
    if (!combo) return false;
    if (!isPrivateStealthModeEnabled()) return true;
    if (!!combo.isPrivate || isComposedCategoryPrivate('콤보', combo.subCategory)) return false;
    const itemIds = Array.isArray(combo.items) ? combo.items : [];
    return itemIds.every((itemId) => {
      const composed = composedPrompts.find((item) => String(item.id) === String(itemId));
      return isComposedPromptVisibleInCurrentMode(composed);
    });
  }

  function applyPrivateStealthModeSanitization() {
    if (!isPrivateStealthModeEnabled()) return;

    selected = selected.filter((item) => {
      if (item.source === 'prompt') {
        const sourcePrompt = prompts.find((entry) => String(entry.id) === String(item.id));
        return isPromptVisibleInCurrentMode(sourcePrompt || item);
      }
      if (item.source === 'composed') {
        const sourceComposed = composedPrompts.find((entry) => String(entry.id) === String(item.id));
        return isComposedPromptVisibleInCurrentMode(sourceComposed || item);
      }
      return true;
    });

    selectedCustomCombo = selectedCustomCombo.filter((item) => isComposedPromptVisibleInCurrentMode(item));

    if (activePromptPreviewId) {
      const previewPrompt = prompts.find((item) => String(item.id) === String(activePromptPreviewId));
      if (!isPromptVisibleInCurrentMode(previewPrompt)) {
        activePromptPreviewId = null;
      }
    }

    if (activeComposedPreviewId) {
      const previewComposed = composedPrompts.find((item) => String(item.id) === String(activeComposedPreviewId));
      if (!isComposedPromptVisibleInCurrentMode(previewComposed)) {
        activeComposedPreviewId = null;
      }
    }

    if (activeCustomComboId) {
      const customCombo = customCombos.find((item) => String(item.id) === String(activeCustomComboId));
      if (!isCustomComboVisibleInCurrentMode(customCombo)) {
        activeCustomComboId = null;
      }
    }

    if (activeCategoryPrompt) {
      const visibleMainCategory = getMainCategories().includes(activeCategoryPrompt);
      if (!visibleMainCategory) {
        activeCategoryPrompt = null;
        activeSubCategoryPrompt = null;
      } else if (activeSubCategoryPrompt && !getSubCategories(activeCategoryPrompt).includes(activeSubCategoryPrompt)) {
        activeSubCategoryPrompt = null;
      }
    }

    if (activeCategoryComposed && !getComposedMainCategoryOrder().includes(activeCategoryComposed)) {
      activeCategoryComposed = null;
    }
  }

  function setComposedMainCategoryPrivate(mainCategory, enabled) {
    if (!mainCategory) return;
    const mainConfig = ensureComposedMainCategoryConfig(mainCategory);
    mainConfig.isPrivate = !!enabled;
    applyCategoryPrivacyRules();
  }

  function setComposedSubCategoryPrivate(mainCategory, subCategory, enabled) {
    if (!mainCategory || !subCategory) return;
    const mainConfig = ensureComposedMainCategoryConfig(mainCategory);
    mainConfig.subSettings[subCategory] = {
      ...(mainConfig.subSettings[subCategory] || {}),
      isPrivate: !!enabled,
    };
    applyCategoryPrivacyRules();
  }

  function applyCategoryPrivacyRules() {
    prompts = prompts.map((item) => {
      const forcedPrivate = isPromptCategoryPrivate(item.mainCategory, item.subCategory);
      return {
        ...item,
        isPrivate: forcedPrivate || !!item.isPrivate,
      };
    });

    const promptById = new Map(prompts.map((item) => [String(item.id), item]));
    composedPrompts = composedPrompts.map((item) => {
      const forcedPrivate = isComposedCategoryPrivate(item.mainCategory, item.subCategory);
      const nextItems = Array.isArray(item.items)
        ? item.items.map((entry) => {
          const sourcePrompt = promptById.get(String(entry?.id || ''));
          const mainCategory = sourcePrompt?.mainCategory || entry?.mainCategory || '';
          const subCategory = sourcePrompt?.subCategory || entry?.subCategory || '';
          const basePrivate = sourcePrompt ? !!sourcePrompt.isPrivate : !!entry?.isPrivate;
          const forcedItemPrivate = isPromptCategoryPrivate(mainCategory, subCategory);
          return {
            ...entry,
            isPrivate: basePrivate || forcedItemPrivate,
          };
        })
        : [];
      return {
        ...item,
        isPrivate: forcedPrivate || !!item.isPrivate,
        items: nextItems,
      };
    });

    customCombos = customCombos.map((item) => ({
      ...item,
      isPrivate: !!item.isPrivate,
    }));

    selected = selected.map((item) => {
      if (item.source === 'prompt') {
        const sourcePrompt = promptById.get(String(item.id || ''));
        if (!sourcePrompt) return item;
        return {
          ...item,
          isPrivate: !!sourcePrompt.isPrivate,
        };
      }
      if (item.source === 'composed') {
        const sourceComposed = composedPrompts.find((entry) => String(entry.id || '') === String(item.id || ''));
        if (!sourceComposed) return item;
        return {
          ...item,
          isPrivate: !!sourceComposed.isPrivate,
        };
      }
      return item;
    });
  }

  function ensureComposedCategoryConfigConsistency() {
    const mainCategories = uniqueInOrder(composedPrompts.map(item => item.mainCategory).filter(Boolean));
    const nextMains = {};
    mainCategories.forEach((mainCategory) => {
      const prev = composedCategoryConfig.mains?.[mainCategory];
      nextMains[mainCategory] = {
        editOnly: !!prev?.editOnly,
        isPrivate: !!prev?.isPrivate,
        emoji: typeof prev?.emoji === 'string' ? prev.emoji : '',
        subSettings: Object.fromEntries(
          Object.entries((prev?.subSettings && typeof prev.subSettings === 'object') ? prev.subSettings : {}).map(([subKey, subValue]) => [subKey, { ...(subValue || {}) }])
        ),
      };
      const subOrder = uniqueInOrder(
        composedPrompts
          .filter(item => item.mainCategory === mainCategory)
          .map(item => item.subCategory)
          .filter(Boolean)
      );
      subOrder.forEach((subCategory) => {
        const prevSub = nextMains[mainCategory].subSettings[subCategory] || {};
        nextMains[mainCategory].subSettings[subCategory] = {
          ...prevSub,
          isPrivate: !!prevSub.isPrivate,
        };
      });
    });
    composedCategoryConfig.mains = nextMains;

    if (activeCategoryComposed && !mainCategories.includes(activeCategoryComposed)) {
      activeCategoryComposed = null;
    }
  }

  // ── Persistence ──
