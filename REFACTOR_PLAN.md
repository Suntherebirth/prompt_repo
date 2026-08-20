# index.html 분해 리팩터링 계획서

## 0. 배경 및 현재 상태

- `index.html` 한 파일에 HTML(`<body>`), CSS(`<style>`), JS(`<script>`)가 모두 들어있음.
- 총 9,375줄
  - CSS: 16~3,058행 (약 3,040줄)
  - HTML body: 3,060~3,369행 (약 300줄)
  - JS: 3,371~9,373행 (약 6,000줄, 전역 함수 약 276개)
- 빌드 도구/번들러/패키지 매니저 없음 (`package.json` 없음). GitHub Pages 등 정적 호스팅으로 그대로 서빙되는 순수 정적 사이트.
- JS는 ES module이 아니라 **전역 스코프의 일반 스크립트**이며, HTML 요소들이 `onclick="functionName()"` 형태의 **인라인 이벤트 핸들러**로 전역 함수를 직접 참조함 (예: `onclick="openCategoryManageModal()"`).
- 상태(`prompts`, `composedPrompts`, `selected` 등)와 설정값들은 전부 스크립트 최상단에 선언된 `let/const` 전역 변수이며, localStorage/IndexedDB 키 상수도 함께 선언되어 있음.
- 스크립트 안에는 함수 선언뿐 아니라 **최상위(top-level) 즉시 실행 코드**도 섞여 있음 (예: 4943행 부근의 `document.addEventListener('pointerdown', ...)`, 9209~9372행의 각종 `addEventListener` 등록과 마지막 `load(); render();` 호출). 이 부분은 파일을 분리할 때 실행 순서에 민감하므로 별도로 취급해야 함.
- 자동화된 테스트가 없음 → 리팩터링 중 회귀를 잡을 안전망이 없다는 점을 계획에 반영해야 함.

## 1. 원칙

1. **동작을 바꾸지 않는다.** 이번 작업은 순수 구조 분해(파일 분리)이며 기능/UX 변경은 하지 않는다.
2. **한 번에 다 하지 않는다.** CSS → HTML → JS 순서로, JS는 다시 "안전한 물리적 분리(파일만 쪼갬)" → "선택적 모듈화" 순서로 단계적으로 진행한다.
3. **전역 스코프를 깨지 않는다(1차 목표).** 인라인 `onclick` 핸들러와 276개 함수 간 상호 참조가 매우 많으므로, 1차 분해에서는 ES module이나 IIFE로 감싸지 않고 여러 개의 일반 `<script src="...">` 태그로 순서대로 로드해 지금과 동일한 전역 스코프를 유지한다. 이러면 함수 참조 관계를 손대지 않아도 된다.
4. **최상위 즉시 실행 코드는 별도 파일(부트스트랩)로 모은다.** 함수 선언은 호이스팅되어 순서에 관계없이 안전하지만, `addEventListener` 등록/`load()`/`render()` 같은 즉시 실행 코드는 반드시 관련 함수/DOM 요소가 정의된 뒤에 실행되어야 하므로 가장 마지막에 로드되는 파일에 모은다.
5. **각 단계마다 수동 스모크 테스트를 거친다.** 테스트 자동화가 없으므로, 매 단계 이후 브라우저에서 직접 열어 핵심 시나리오(추가/편집/삭제/조합 저장/이미지 업로드/백업 내보내기·가져오기)를 확인한다.
6. **git 커밋을 잘게 쪼갠다.** 단계별로 커밋해서 문제 발생 시 바로 되돌릴 수 있게 한다.

## 2. 목표 디렉터리 구조 (1차 분해 후)

```
index.html                # HTML 골격 + <link>/<script> 태그만 남음
css/
  styles.css               # 기존 <style> 내용 전체 이동
js/
  constants.js              # 스토리지 키, enum 상수
  state.js                  # 전역 상태 변수 선언 (let prompts = [] 등)
  db-images.js              # IndexedDB 이미지 저장/조회 (openImageDb, withImageStore, ...)
  category-config.js        # 카테고리 설정 구조 (createDefaultCategoryConfig, ensure*, get/setSubCategory*)
  storage.js                 # load()/save()/settings 저장/불러오기
  prompt-model.js            # normalizePrompt, cleanPrompt, uid, 텍스트 유틸
  prompt-image-form.js       # 추가/편집 폼의 이미지 미리보기, orientation 처리
  tag-preview.js             # 태그 브라우저, 스와이프, 랜덤 선택, 태그 그리드
  preview.js                  # 설명/이미지 미리보기 렌더링, 사이즈/전환 모드
  image-viewer.js            # 이미지 뷰어 확대/축소/드래그 제스처
  category-manage.js         # 카테고리 관리 모달 (이름변경/삭제/순서변경/렌더)
  library.js                  # renderPromptList, renderSelected, 메인 render()
  composed-editor.js          # 조합 프롬프트 편집 모달
  prompt-image-form.js         # 프롬프트 CRUD 폼과 이미지 편집 보조 함수
  composition.js                # selected 배열 조작, 복사, 클립보드
  backup.js                     # JSON 백업 내보내기/가져오기
  dnd.js                          # 드래그앤드롭, 칩 포인터 드래그
  settings.js                     # 설정 드로어, 미리보기 옵션 토글
  utils.js                          # esc, showToast, bindPressAction, preventSafariDoubleTapZoom
  main.js                            # 최상위 즉시 실행 코드 전부 (addEventListener 등록, load(); render();) — 반드시 마지막에 로드
vendor/
  jszip.min.js               # 기존 유지
```

> 실제 파일 이름/그룹핑은 3단계 작업 중 코드를 옮기면서 자연스럽게 조정 가능. 핵심은 "그룹 단위로 나누고, 실행 순서에 민감한 코드는 `main.js`로 모은다"는 원칙.

## 3. 단계별 진행 계획

### Phase 0 — 준비
- [ ] 새 브랜치 생성 (예: `refactor/split-index-html`).
- [x] 수동 스모크 테스트 체크리스트 작성 (5절 참고). 기준 동작 확인은 브라우저 회귀 테스트 단계에서 수행한다.

### Phase 1 — CSS 분리
- [x] `<style>...</style>` 내용을 그대로 `css/styles.css`로 이동.
- [x] `index.html`의 `<head>`에 `<link rel="stylesheet" href="./css/styles.css">` 추가.
- [ ] 브라우저에서 레이아웃/색상 깨짐 없는지 확인.

### Phase 2 — JS 최상위 실행 코드 격리
- [x] `addEventListener` 등록, DOM 참조, 마지막 `load(); render();` 호출을 식별했다.
- [x] 실행 순서에 민감한 코드를 `main.js`로 이동했다.

### Phase 3 — JS 파일 분해 (전역 스코프 유지)
- [x] 기능별 `js/*.js` 파일 생성.
- [x] 함수를 주제별로 이동하고 전역 스코프 호환을 유지했다.
- [x] 최상위 실행 코드를 `js/main.js`에 모으고 마지막에 로드되도록 배치했다.
- [x] `index.html` `</body>` 직전에 스크립트 태그를 등록했다.
  ```html
  <script src="./vendor/jszip.min.js"></script>
  <script src="./js/constants.js"></script>
  <script src="./js/state.js"></script>
  <script src="./js/db-images.js"></script>
  ... (중간 파일들, 순서 크게 안 중요) ...
  <script src="./js/main.js"></script>
  ```
- [x] 각 파일의 JavaScript 문법과 중복 함수 정의를 검사했다.
- [ ] 한 그룹 옮길 때마다 커밋.

### Phase 4 — 수동 회귀 테스트 (5절 체크리스트 전체 수행)
- [ ] 브라우저에서 모든 기능 시나리오 확인.
- [x] 정적 서버에서 HTML과 모든 로컬 리소스가 HTTP 200으로 로드되는지 확인.

### Phase 5 — (선택, 이후 별도 작업으로 진행 권장) 구조 개선
1차 분해가 끝나고 안정화된 뒤에만 고려:
- [ ] `<script type="module">`로 전환 + `import/export` 도입 (진짜 모듈화). 이 경우 인라인 `onclick="..."` 속성을 전부 `addEventListener` 기반으로 바꿔야 함 (module 스크립트의 함수는 전역(window)에 노출되지 않으므로).
- [ ] 빌드 도구(Vite 등) 도입 여부 검토.
- [ ] CSS를 컴포넌트 단위로 추가 분할 (`base.css`, `layout.css`, `components/*.css`).
- [ ] HTML을 템플릿 partial로 쪼갤지 검토 (정적 사이트라 서버사이드 include 불가 → JS로 template 문자열 분리하거나 그대로 유지).

> Phase 5는 위험도가 높고 (onclick 전수 교체, 전역 참조 방식 변경) 별도 계획서/별도 작업으로 분리하는 것을 권장.

## 4. JS 함수 그룹핑 (Phase 3 참고용 매핑)

| 대상 파일 | 주요 함수/역할 |
|---|---|
| `constants.js` | `STORAGE_KEY`, `COMPOSED_STORAGE_KEY`, 각종 `*_KEY` 상수, `PROMPT_ADD_MODE`, `IMAGE_DB_NAME` 등 |
| `state.js` | `let prompts/composedPrompts/selected/...` 전역 상태 변수 전부 |
| `db-images.js` | `openImageDb`, `withImageStore`, `saveImageBlobRecord`, `getImageRecord`, `deleteImageRecord`, `getAllImageRecords`, `clearAllImageRecords`, `getPromptImageObjectUrl`, `revokePromptImageObjectUrl`, `getAllReferencedImageIds`, `deleteImageIfOrphaned`, `dataUrlToBlob`, `getImageExtension*` |
| `category-config.js` | `createDefaultCategoryConfig`, `createDefaultComposedCategoryConfig`, `ensure*CategoryConfig*`, `get/setSubCategory*`, `getMainCategories`, `getSubCategories`, `moveMainCategory`, `renameMainCategory`, `deleteMainCategory` 등 카테고리 CRUD/설정 |
| `storage.js` | `load`, `save`, `getSettingsPayload`, `saveSettings`, `loadSettings` |
| `prompt-model.js` | `uid`, `normalizePromptTags`, `normalizePrompt`, `cleanPrompt`, `normalizeSelected`, `normalizeComposedPrompt`, `syncPromptUpdateToComposedPrompts`, `getPromptDisplayName`, `sanitizePromptImageNamePart`, `buildPromptImageName`, `buildComposedImageName` |
| `prompt-image-form.js` | `normalizeImageOrientation`, `get/setPending*Image`, `renderPending*ImagePreview`, `clearPending*Image`, `readFileAsDataUrl`, `render*ImageOrientationTabs`, `getPromptImageSource`, `getPromptActiveImageMeta`, `queuePromptImageLoad` |
| `tag-layout.js` | `getPromptTagLayout*`, `savePromptTagLayout`, `renderPromptTagBrowser`, `bindPromptTagLayoutInteractions`, `bindPreviewTagSwipe`, `commitPreviewTagRandomSelection`, `renderPromptTagImageGrid`, `jumpToPromptCardFromTagImage`, 관련 top-level `pointerdown` 리스너(→ `main.js`로 이동 대상 표시) |
| `preview.js` | `renderPromptDescriptionPreview`, `renderComposedDescriptionPreview`, `formatDescriptionNamePart`, `parseBirthDatePart`, `calculateAgeFromBirthDate`, `formatDescriptionBirthPart`, `formatPromptDescriptionForDisplay`, `getActive*PreviewItem/Image` |
| `image-viewer.js` | `renderImageViewer`, `clampImageViewerScale`, `applyImageViewerTransform`, `resetImageViewerTransform`, `getPointerDistance`, `markImageViewerGesture`, `onImageViewerPointer*`, `handleImageViewerImageTap`, `open/closeImageViewer`, `handleImageViewerBackdrop` |
| `category-manage.js` | `setCategoryManageTab`, `renderCategoryManageTabs`, `open/closeCategoryManageModal`, `renderCategoryManage*List`, `getComposed*Categories`, `getCoreSubCategorySelections`, `openCoreSubCategory`, `renderCoreQuickAccessRow`, `toggle*Hidden/Core/RandomSelection`, `rename/delete/move*MainCategory/SubCategory`(prompt/composed 둘 다) |
| `render-list.js` | `render`, `renderLibraryHeader`, `renderLibraryLayout`, `ensureActiveCategoryState`, `renderAddFilterTabs`, `renderCategorySelectors`, `renderMainCategoryFilter`, `renderComposedFilter`, `renderComposedLoadList`, `buildComposedLoadItem`, `renderPromptList`, `renderSelected`, `getSortedPromptsForSubCategory`, `applyRandomSelectionFor*`, `isSubCategoryUsed`, 관련 swipe/shortcut 함수(`bindPromptItemSwipe`, `arm*Shortcut`, `runComposed*Shortcut`, `closeAllPromptSwipeActions`, `setFrozenComboCardHeight` 등) |
| `composed-editor.js` | `getComposedPromptOptionLabel`, `getComposedEditorPrompt*Categories`, `handleComposedEditor*Change`, `renderComposedModalItemEditor`, `addPromptToComposedEditor`, `move/removeSelectedItemInComposedEditor`, `getComposedOutputText`, `setOutputEditMode`, `start/apply/cancelOutputEdit`, `clearOutputOverride`, `updateOutput`, `open/closeSaveComposedModal`, `renderSaveComposedModalMode`, `openEditComposedPromptModal`, `handleSaveComposedModalBackdrop`, `loadComposedPrompt`, `deleteComposedPrompt` |
| `prompt-crud.js` | `openAddPromptModal`, `closeAddPromptModal`, `handleAddPromptModalBackdrop`, `resetPromptFormToAdd`, `setPromptFormToEdit`, `syncPromptFormFields`, `openEditPromptModal`, `renderPromptDescriptionField`, `clearPromptDescriptionPreview`, `addPrompt`, `deletePrompt`, `selectCategory`, `selectSubCategory`, `handle*CategoryChange`, `render*CategorySelect`, `appendSelectOption`, `renderCategorySuggestions` |
| `composition.js` | `handlePromptTap`, `addPromptToComposition`, `removeSelected`, `jumpToPromptCardFromSelected`, `clearSelected`, `clearCurrentComposition`, `copyPrompt`, `copyPromptSilently`, `saveComposedPrompt` |
| `backup.js` | `buildBackupPayload`, `applyImportedBackupData`, `exportJSONBackup`, `importJSONBackup` |
| `dnd.js` | `clearSelectedChipDragState`, `dragStart/dragEnd`, `chipPointerDown/Move/End`, `dragOver/dragLeave/drop`, `dragOverSelectedContainer`, `dropOnSelectedContainer` |
| `settings.js` | `renderSettingsDrawer`, `open/close/toggleSettingsDrawer`, `handleSettingsDrawerBackdrop`, `normalizePreviewTransitionMode`, `renderPreviewTransitionMode`, `renderTapComposeToggle`, `normalizeTapComposeMode`, `isSwipeComposeMode`, `is/activateDoubleTapTouchCooldown`, `setTapComposeMode`, `toggleTapComposeMode`, `set*Level/Mode` 함수들, `setLeftPanelTab` |
| `utils.js` | `uniqueInOrder`, `esc`, `showToast`, `bindPressAction`, `preventSafariDoubleTapZoom`, `moveArrayItem`, `getComposedItemText` |
| `main.js` | 4943행 `document.addEventListener('pointerdown', ...)`, 9209~9372행 구간 전체 (`DOM 요소 const` 선언 + 모든 `addEventListener` 등록 + `preventSafariDoubleTapZoom(); loadSettings(); ...; load(); render();`) |

> 위 표는 초안이며, 실제로 코드를 옮기면서 세부 함수가 다른 그룹과 더 밀접하다고 판단되면 조정 가능. 중요한 건 "함수 단위로만 이동하고 실행 순서는 그대로 유지"하는 것.

## 5. 회귀 테스트 체크리스트 (각 Phase 이후 수행)

- [ ] 앱 최초 로드 시 기존 데이터(로컬스토리지) 정상 표시
- [ ] 프롬프트 추가 / 수정 / 삭제
- [ ] 프롬프트 이미지 업로드(가로/세로), 미리보기, 삭제
- [ ] 카테고리 추가/이름변경/순서변경/숨김/삭제 (개별 프롬프트, 조합 프롬프트 둘 다)
- [ ] 태그 브라우저: 스와이프, 랜덤 선택, 드래그 정렬
- [ ] 조합 프롬프트 만들기 → 저장 → 불러오기 → 수정 → 삭제
- [ ] 프롬프트 탭하여 조합에 추가 (스와이프 모드/탭 모드/더블탭 모드 각각)
- [ ] 클립보드 복사 동작
- [ ] 이미지 뷰어 확대/축소/드래그, 배경 클릭 닫기
- [ ] 설정 드로어: 미리보기 크기/애니메이션/전환모드 토글 및 세로 렌더링 확인
- [ ] JSON 백업 내보내기 → 가져오기 라운드트립
- [ ] 브라우저 콘솔에 에러 없음 (특히 `ReferenceError`)
- [ ] 모바일 뷰(반응형) 레이아웃 확인

## 6. 롤백 전략

- 각 Phase/파일 그룹 이동마다 별도 커밋.
- 문제 발생 시 `git revert` 또는 `git reset`으로 직전 정상 커밋까지 되돌리고 원인 재분석.
- Phase 5(모듈화/onclick 제거)는 위험도가 크므로 Phase 1~4가 충분히 안정화된 뒤 별도 브랜치/별도 계획으로 진행.
