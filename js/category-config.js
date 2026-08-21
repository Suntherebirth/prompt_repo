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
    const usedTags = new Set();
    const layout = stored.filter(item => {
      if (!item || typeof item !== 'object') return false;
      if (item.type === 'divider') return typeof item.id === 'string' && item.id;
      if (item.type !== 'tag' || !availableSet.has(item.tag) || usedTags.has(item.tag)) return false;
      usedTags.add(item.tag);
      return true;
    });
    availableTags.forEach(tag => {
      if (!usedTags.has(tag)) layout.push({ type: 'tag', tag });
    });
    promptTagLayouts[key] = layout;
    return layout;
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
    if (!mainCategory) return { hiddenByDefault: false, emoji: '', subOrder: [], subSettings: {} };
    const found = categoryConfig.mains[mainCategory];
    if (found) {
      if (!found.subSettings || typeof found.subSettings !== 'object') {
        found.subSettings = {};
      }
      return found;
    }
    return { hiddenByDefault: false, emoji: '', subOrder: [], subSettings: {} };
  }

  function getSubCategoryConfig(mainCategory, subCategory) {
    const mainConfig = getMainCategoryConfig(mainCategory);
    if (!subCategory) return { randomSelection: false, isCore: false };
    const found = mainConfig.subSettings?.[subCategory];
    if (found && typeof found === 'object') return found;
    return { randomSelection: false, isCore: false };
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
        emoji: '',
      };
    }
    return composedCategoryConfig.mains[mainCategory];
  }

  function getComposedMainCategoryConfig(mainCategory) {
    if (!mainCategory) return { editOnly: false, emoji: '' };
    return composedCategoryConfig.mains[mainCategory] || { editOnly: false, emoji: '' };
  }

  function ensureComposedCategoryConfigConsistency() {
    const mainCategories = uniqueInOrder(composedPrompts.map(item => item.mainCategory).filter(Boolean));
    const nextMains = {};
    mainCategories.forEach((mainCategory) => {
      const prev = composedCategoryConfig.mains?.[mainCategory];
      nextMains[mainCategory] = {
        editOnly: !!prev?.editOnly,
        emoji: typeof prev?.emoji === 'string' ? prev.emoji : '',
      };
    });
    composedCategoryConfig.mains = nextMains;

    if (activeCategoryComposed && !mainCategories.includes(activeCategoryComposed)) {
      activeCategoryComposed = null;
    }
  }

  // ── Persistence ──
