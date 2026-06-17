const TRANSITION_MS = 300;
const AUTO_CLOSE_MS = 2000;
const CLICK_WAVE_DELAY_MS = 42;
const TARGET_PANEL_COUNT = 32;
const OPEN_THRESHOLD_RATIO = 1 / 2;
// Tiles now read as one seamless surface (no gray grid), so there is no border
// inset to compensate for when aligning the tiled content across cells.
const PANEL_GAP_SIZE = 0;
const GRID_LINE_FG_MIX = 0.18;
const SLIDE_OVERSHOOT = 2;
const THRESHOLD_SEQUENCE_MS = 1000;
const SCROLL_SEQUENCE_MS = 1000;
// Total click transition time: the last tile finishes its collapse at about
// this point (mirrors SCROLL_SEQUENCE_MS).
const CLICK_SEQUENCE_MS = 1500;
const WHEEL_IDLE_RELEASE_MS = 220;
const WHEEL_POST_TRANSITION_LOCK_MS = 900;
const TRACE_HINT_DELAY_MS = 3000;
const ACTION_HINT_DELAY_MS = 10000;
const HINT_MIN_VISIBLE_MS = 3000;
const ACTION_AFTER_TRACE_DELAY_MS = 3000;
// Chance a closed tile ignites this step, indexed by how many of its 4 facing
// tiles are already open: 1->12.5%, 2->25%, 3->50%, 4->always.
const CLICK_NEIGHBOR_PROBABILITY = [0, 0.125, 0.25, 0.5, 1];
// Soft cap for a retarget (close-then-reopen) transition so the reopen spread
// is compressed if the close phase has already consumed too much wall time.
const RETARGET_MAX_MS = SCROLL_SEQUENCE_MS + 1000 + OPEN_THRESHOLD_RATIO * 1000;

const screens = [
  {
    label: "SAMPLE",
    bg: "#ece8dc",
    fg: "#2f3630",
  },
  {
    label: "ABOUT",
    bg: "#40584f",
    fg: "#edf1e8",
  },
  {
    label: "SERVICE",
    bg: "#514653",
    fg: "#eee8ed",
  },
  {
    label: "WORKS",
    bg: "#4e6268",
    fg: "#edf0ed",
  },
  {
    label: "CONTACT",
    bg: "#6a535a",
    fg: "#f4ecee",
  },
];

const screenSlugMap = new Map(
  screens.map((screen, index) => [screen.label.toLowerCase(), index]),
);

const screenDetails = [
  null,
  {
    eyebrow: "ABOUT COMPANY",
    heading: "相談から公開後の改善まで任せられるWeb制作パートナー。",
    summary:
      "レイヤーワークスITは、中小企業や店舗のホームページ制作を代行する制作会社です。要件整理、設計、デザイン、実装、保守までを小さなチームで一貫して進めます。",
    stats: [
      { value: "15日", label: "初回提案までの目安" },
      { value: "3名", label: "専任ミニチーム" },
      { value: "100%", label: "公開後の運用引き継ぎ" },
    ],
    cards: [
      {
        title: "事業理解から始める",
        body: "強み、顧客層、問い合わせまでの流れを整理し、ページ構成と導線に落とし込みます。",
      },
      {
        title: "公開後も扱いやすい",
        body: "お知らせ更新、文章差し替え、フォーム管理など、社内で続けやすい運用形に整えます。",
      },
      {
        title: "小さく速く改善",
        body: "公開して終わりにせず、アクセス状況と問い合わせ内容を見ながら改善を積み重ねます。",
      },
    ],
  },
  {
    eyebrow: "SERVICE",
    heading: "設計、制作、公開、保守までをまとめて代行。",
    summary:
      "新規制作だけでなく、既存サイトのリニューアル、採用ページ、ランディングページ、フォーム改善、保守運用まで必要な範囲を選んで依頼できます。",
    stats: [
      { value: "4領域", label: "設計・制作・実装・運用" },
      { value: "5P〜", label: "小規模サイト対応" },
      { value: "月1回", label: "改善レポート対応" },
    ],
    cards: [
      {
        title: "コーポレートサイト",
        body: "会社案内、サービス紹介、問い合わせ導線を整理し、信頼感のある基本サイトを制作します。",
      },
      {
        title: "採用・LP制作",
        body: "応募や資料請求など、目的が明確なページを短い制作期間で組み立てます。",
      },
      {
        title: "保守・改善",
        body: "軽微な修正、CMS更新、表示速度、フォーム改善など公開後の運用を継続支援します。",
      },
    ],
  },
  {
    eyebrow: "WORKS",
    heading: "伝わる構成と、更新しやすい実装を両立。",
    summary:
      "業種ごとの見せ方に合わせて、導入事例、料金、スタッフ紹介、予約導線などを設計。運用担当者が迷わない管理方法まで整えます。",
    stats: [
      { value: "6週間", label: "標準的な制作期間" },
      { value: "38%", label: "問い合わせ増の例" },
      { value: "0件", label: "公開後の重大障害" },
    ],
    cards: [
      {
        title: "製造業サイト",
        body: "技術力と設備情報を整理し、問い合わせ前の不安を減らす会社案内へ改修しました。",
      },
      {
        title: "士業事務所サイト",
        body: "相談内容別の導線を用意し、初回相談フォームまでの迷いを減らしました。",
      },
      {
        title: "地域店舗サイト",
        body: "スマートフォンで予約しやすい構成に変更し、営業時間やメニュー更新も簡単にしました。",
      },
    ],
  },
  null,
];

const collapseDirections = [
  { name: "left", transform: `translateX(calc(-100% - ${SLIDE_OVERSHOOT}px))` },
  { name: "right", transform: `translateX(calc(100% + ${SLIDE_OVERSHOOT}px))` },
  { name: "up", transform: `translateY(calc(-100% - ${SLIDE_OVERSHOOT}px))` },
  { name: "down", transform: `translateY(calc(100% + ${SLIDE_OVERSHOOT}px))` },
];

const stage = document.getElementById("stage");
const panelLayer = document.getElementById("panelLayer");
const nextPanelLayer = document.getElementById("nextPanelLayer");
const gridLineLayer = document.getElementById("gridLineLayer");
const currentTitle = document.getElementById("currentTitle");
const nextScreen = document.getElementById("nextScreen");
const nextTitle = document.getElementById("nextTitle");
const detailOverlay = document.getElementById("detailOverlay");
const titleOverlay = document.getElementById("titleOverlay");
const screenWordmark = document.getElementById("screenWordmark");
const contactForm = document.getElementById("contactForm");
const contactStatus = document.getElementById("contactStatus");
const contactOverlay = document.getElementById("contactOverlay");
const pageIndicator = document.getElementById("pageIndicator");

const CONTACT_INDEX = screens.length - 1;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

let currentIndex = 0;
let pendingTarget = 0;
let revealIndex = 1;
let indicatorItems = [];
let indicatorTrack = null;
let lastHoverPoint = null;
let lastHoverIndex = -1;
let gridRows = 4;
let gridCols = 8;
let panels = [];
let openedPanels = new Set();
let autoCloseTimers = new Map();
let closingTimers = new Map();
let transitionTimer = 0;
// Timestamp (performance.now) when the current screen's entrance transitions
// began, used to resume them seamlessly inside tile-bound clones.
let contentEntranceStart = 0;
let isTransitioning = false;
let wheelLocked = false;
let wheelUnlockTimer = 0;
let lastWheelAt = 0;
let suppressedWheelEvents = 0;
let transitionCompletedAt = 0;
let queuedHistoryTarget = null;
const hintState = {
  root: null,
  trace: null,
  action: null,
  traceTimer: 0,
  actionTimer: 0,
  traceHideTimer: 0,
  actionHideTimer: 0,
  traceVisible: false,
  actionVisible: false,
  traceSuppressed: false,
  actionSuppressed: false,
  traceShownAt: 0,
  traceHiddenAt: 0,
  actionShownAt: 0,
  actionDueAt: 0,
  tracedPanels: new Set(),
  pointerX: window.innerWidth / 2,
  pointerY: window.innerHeight / 2,
};

function nextIndex() {
  return (currentIndex + 1) % screens.length;
}

function screenSlug(index) {
  return screens[index].label.toLowerCase();
}

function screenHash(index) {
  return `#${screenSlug(index)}`;
}

function indexFromHash(hash = window.location.hash) {
  let slug = hash.replace(/^#/, "");
  try {
    slug = decodeURIComponent(slug);
  } catch {
    return -1;
  }
  slug = slug.trim().toLowerCase();
  return screenSlugMap.has(slug) ? screenSlugMap.get(slug) : -1;
}

function writeScreenHistory(index, mode = "push") {
  const state = {
    screenIndex: index,
    screen: screenSlug(index),
  };
  const hash = screenHash(index);

  if (window.location.hash === hash && history.state?.screenIndex === index) {
    return;
  }

  if (mode === "replace") {
    history.replaceState(state, "", hash);
    return;
  }

  history.pushState(state, "", hash);
}

function syncInitialScreenFromHash() {
  const index = indexFromHash();
  if (index >= 0) {
    currentIndex = index;
  }
  pendingTarget = currentIndex;
  writeScreenHistory(currentIndex, "replace");
}

function syncScreenFromHistory() {
  const targetIndex = indexFromHash();
  if (targetIndex < 0) {
    writeScreenHistory(currentIndex, "replace");
    return;
  }

  writeScreenHistory(targetIndex, "replace");

  if (isTransitioning) {
    queuedHistoryTarget = targetIndex;
    return;
  }

  if (targetIndex === currentIndex) {
    return;
  }

  startTransition("scroll", null, targetIndex > currentIndex ? 1 : -1, targetIndex, {
    updateHistory: false,
  });
}

function setTheme() {
  const current = screens[currentIndex];
  const nextIdx = nextIndex();
  const next = screens[nextIdx];

  stage.style.setProperty("--current-bg", current.bg);
  stage.style.setProperty("--current-fg", current.fg);
  stage.style.setProperty("--next-bg", next.bg);
  stage.style.setProperty("--next-fg", next.fg);
  stage.style.background = current.bg;

  nextScreen.style.background = next.bg;
  nextScreen.style.color = next.fg;
  currentTitle.textContent = current.label;
  nextTitle.textContent = next.label;
  setLayerTheme(panelLayer, current);
  setLayerTheme(nextPanelLayer, next);
  revealIndex = nextIdx;
  updateGridLineColor(0);
}

function setLayerTheme(layer, screen) {
  layer.style.setProperty("--layer-bg", screen.bg);
  layer.style.setProperty("--layer-fg", screen.fg);
}

function hexToRgb(hex) {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function mixRgb(from, to, ratio) {
  const amount = Math.max(0, Math.min(1, ratio));

  return {
    r: Math.round(from.r + (to.r - from.r) * amount),
    g: Math.round(from.g + (to.g - from.g) * amount),
    b: Math.round(from.b + (to.b - from.b) * amount),
  };
}

function rgbToCss(rgb) {
  return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
}

function getGridLineRgb(screen) {
  return mixRgb(hexToRgb(screen.bg), hexToRgb(screen.fg), GRID_LINE_FG_MIX);
}

function getOpenRatio() {
  return panels.length > 0 ? openedPanels.size / panels.length : 0;
}

function updateGridLineColor(ratio = getOpenRatio()) {
  if (!gridLineLayer) {
    return;
  }

  const targetScreen = screens[revealIndex] || screens[nextIndex()];
  const currentGrid = getGridLineRgb(screens[currentIndex]);
  const targetGrid = getGridLineRgb(targetScreen);
  const mixedGrid = mixRgb(currentGrid, targetGrid, ratio);

  stage.style.setProperty("--current-grid", rgbToCss(currentGrid));
  stage.style.setProperty("--next-grid", rgbToCss(targetGrid));
  gridLineLayer.style.color = rgbToCss(mixedGrid);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function createHintIcon(name) {
  const icon = document.createElement("span");
  icon.className = `hint-icon hint-icon-${name}`;
  icon.setAttribute("aria-hidden", "true");
  return icon;
}

function createCycleIcon(baseName, activeName) {
  const root = document.createElement("span");
  const base = document.createElement("span");
  const active = document.createElement("span");

  root.className = "hint-cycle-icon";
  base.className = "hint-cycle-frame hint-cycle-frame-base";
  active.className = "hint-cycle-frame hint-cycle-frame-active";
  base.append(createHintIcon(baseName));
  active.append(createHintIcon(activeName));
  root.append(base, active);

  return root;
}

function createWheelHintIcon() {
  const root = document.createElement("span");
  const base = document.createElement("span");
  const active = document.createElement("span");

  root.className = "hint-cycle-icon hint-cycle-icon-wheel";
  base.className = "hint-cycle-frame hint-cycle-frame-base";
  active.className = "hint-cycle-frame hint-cycle-frame-active";
  base.append(createHintIcon("mouse"));
  active.append(createHintIcon("mouse-scroll-down"));
  root.append(base, active);

  return root;
}

function buildInteractionHints() {
  const root = document.createElement("div");
  const trace = document.createElement("div");
  const action = document.createElement("div");
  const traceIcon = document.createElement("span");
  const separator = document.createElement("span");

  root.className = "interaction-hints";
  root.setAttribute("aria-hidden", "true");

  trace.className = "interaction-hint interaction-hint-trace";
  traceIcon.className = "hint-trace-icon";
  traceIcon.append(createHintIcon("mouse-pointer-2"));
  trace.append(traceIcon);

  action.className = "interaction-hint interaction-hint-action";
  separator.className = "hint-separator";
  separator.textContent = "or";
  action.append(createCycleIcon("mouse", "mouse-left"), separator, createWheelHintIcon());

  root.append(trace, action);
  stage.append(root);

  hintState.root = root;
  hintState.trace = trace;
  hintState.action = action;
}

function setHintPosition(element, x, y) {
  element.style.setProperty("--hint-x", `${x}px`);
  element.style.setProperty("--hint-y", `${y}px`);
}

function positionTraceHint() {
  if (!hintState.trace) {
    return;
  }

  const title = panelLayer.querySelector(".panel-title");
  const titleRect = title ? title.getBoundingClientRect() : null;
  const margin = 28;
  let x = window.innerWidth / 2;
  let y = window.innerHeight - 74;

  if (titleRect) {
    const candidateX = titleRect.left + titleRect.width / 2;
    const candidateY = titleRect.bottom + 44;

    if (candidateY <= window.innerHeight - 58) {
      x = candidateX;
      y = candidateY;
    } else {
      x = window.innerWidth - 72;
      y = window.innerHeight - 72;
    }
  }

  setHintPosition(
    hintState.trace,
    clamp(x, margin, window.innerWidth - margin),
    clamp(y, margin, window.innerHeight - margin),
  );
}

function positionActionHint() {
  if (!hintState.action) {
    return;
  }

  setHintPosition(
    hintState.action,
    clamp(hintState.pointerX, 82, window.innerWidth - 82),
    clamp(hintState.pointerY - 58, 34, window.innerHeight - 34),
  );
}

function hideHint(kind) {
  const element = hintState[kind];
  if (!element) {
    return;
  }

  const wasVisible = hintState[`${kind}Visible`];
  hintState[`${kind}Visible`] = false;
  element.classList.remove("is-visible");

  if (kind === "trace" && wasVisible) {
    hintState.traceHiddenAt = performance.now();
    if (
      !hintState.actionSuppressed &&
      !hintState.actionVisible &&
      hintState.traceHiddenAt >= hintState.actionDueAt
    ) {
      scheduleActionHint(ACTION_AFTER_TRACE_DELAY_MS);
    }
  }
}

function scheduleActionHint(delay) {
  if (hintState.actionSuppressed || hintState.actionVisible) {
    return;
  }

  window.clearTimeout(hintState.actionTimer);
  hintState.actionTimer = window.setTimeout(showActionHint, Math.max(0, delay));
}

function scheduleHintHide(kind) {
  if (!hintState[`${kind}Visible`]) {
    hideHint(kind);
    return;
  }

  const hideTimerKey = `${kind}HideTimer`;
  const shownAt = hintState[`${kind}ShownAt`];
  const elapsed = performance.now() - shownAt;
  const delay = Math.max(0, HINT_MIN_VISIBLE_MS - elapsed);

  window.clearTimeout(hintState[hideTimerKey]);
  hintState[hideTimerKey] = window.setTimeout(() => {
    hideHint(kind);
  }, delay);
}

function suppressTraceHint() {
  if (hintState.traceSuppressed) {
    return;
  }

  hintState.traceSuppressed = true;
  window.clearTimeout(hintState.traceTimer);
  scheduleHintHide("trace");
}

function suppressActionHint() {
  if (hintState.actionSuppressed) {
    return;
  }

  hintState.actionSuppressed = true;
  window.clearTimeout(hintState.actionTimer);
  scheduleHintHide("action");
}

function showTraceHint() {
  if (
    hintState.traceSuppressed ||
    hintState.tracedPanels.size >= 2 ||
    currentIndex !== 0 ||
    isTransitioning
  ) {
    suppressTraceHint();
    return;
  }

  positionTraceHint();
  hintState.traceVisible = true;
  hintState.traceShownAt = performance.now();
  hintState.trace.classList.add("is-visible");
}

function showActionHint() {
  if (hintState.actionSuppressed || currentIndex !== 0 || isTransitioning) {
    suppressActionHint();
    return;
  }

  const now = performance.now();
  const untilDue = hintState.actionDueAt - now;
  if (untilDue > 0) {
    scheduleActionHint(untilDue);
    return;
  }

  if (hintState.traceVisible) {
    return;
  }

  if (hintState.traceHiddenAt > 0) {
    const untilAfterTrace = ACTION_AFTER_TRACE_DELAY_MS - (now - hintState.traceHiddenAt);
    if (untilAfterTrace > 0) {
      scheduleActionHint(untilAfterTrace);
      return;
    }
  }

  positionActionHint();
  hintState.actionVisible = true;
  hintState.actionShownAt = performance.now();
  hintState.action.classList.add("is-visible");
}

function markTraceHintPanel(index) {
  if (hintState.traceSuppressed) {
    return;
  }

  hintState.tracedPanels.add(index);
  if (hintState.tracedPanels.size >= 2) {
    suppressTraceHint();
  }
}

function trackHintPointer(clientX, clientY) {
  hintState.pointerX = clientX;
  hintState.pointerY = clientY;

  if (hintState.actionVisible && !hintState.actionSuppressed) {
    positionActionHint();
  }
}

function initializeInteractionHints() {
  buildInteractionHints();
  hintState.actionDueAt = performance.now() + ACTION_HINT_DELAY_MS;
  hintState.traceTimer = window.setTimeout(showTraceHint, TRACE_HINT_DELAY_MS);
  hintState.actionTimer = window.setTimeout(showActionHint, ACTION_HINT_DELAY_MS);
}

function suppressTransitionHints() {
  suppressTraceHint();
  suppressActionHint();
}

// Paints the layer that gets revealed during a transition. Forward jumps
// already have the right target painted, but reverse jumps (going back from
// contact) need the previous screen put in place before the reveal runs.
function paintReveal(targetIdx) {
  const target = screens[targetIdx];
  revealIndex = targetIdx;
  stage.style.setProperty("--next-bg", target.bg);
  stage.style.setProperty("--next-fg", target.fg);
  nextScreen.style.background = target.bg;
  nextScreen.style.color = target.fg;
  nextTitle.textContent = target.label;
  setLayerTheme(nextPanelLayer, target);
  paintLayerTitles(nextPanelLayer, targetIdx);
  updateGridLineColor();
}

function hasDetailScreen(index = currentIndex) {
  return Boolean(screenDetails[index]);
}

function disablesHoverReveal(index = currentIndex) {
  return index === CONTACT_INDEX;
}

function hasScreenWordmark(index = currentIndex) {
  return index > 0;
}

function applyScreenState() {
  renderDetailOverlay(currentIndex);
  updateScreenWordmark(currentIndex);
  if (hasScreenWordmark(currentIndex)) {
    prepareScreenWordmarkIntro();
  }
  stage.classList.toggle("has-detail", hasDetailScreen(currentIndex));
  stage.classList.toggle("has-screen-title", hasScreenWordmark(currentIndex));
  stage.classList.toggle("is-contact", currentIndex === CONTACT_INDEX);
  // Stamp when the screen's entrance transitions begin, so clones bound to the
  // tiles mid-entrance can pick the animation up at the exact same progress.
  contentEntranceStart = performance.now();
}

function updateScreenWordmark(index = currentIndex) {
  if (!screenWordmark) {
    return;
  }

  screenWordmark.textContent = hasScreenWordmark(index) ? screens[index].label : "";
}

function getTextRect(element) {
  const range = document.createRange();
  range.selectNodeContents(element);
  const rect = range.getBoundingClientRect();
  range.detach();

  if (rect.width > 0 && rect.height > 0) {
    return rect;
  }

  return element.getBoundingClientRect();
}

function prepareScreenWordmarkIntro() {
  const wordmark = screenWordmark;
  const title = panelLayer.querySelector(".panel-title");
  if (!wordmark || !title) {
    return;
  }

  const previousTransform = wordmark.style.transform;
  const previousTransition = wordmark.style.transition;
  wordmark.style.transition = "none";
  wordmark.style.transform = "none";

  const titleRect = getTextRect(title);
  const wordmarkRect = wordmark.getBoundingClientRect();
  const wordmarkTextRect = getTextRect(wordmark);
  wordmark.style.transform = previousTransform;

  if (
    titleRect.width <= 0 ||
    titleRect.height <= 0 ||
    wordmarkRect.width <= 0 ||
    wordmarkRect.height <= 0 ||
    wordmarkTextRect.width <= 0 ||
    wordmarkTextRect.height <= 0
  ) {
    return;
  }

  const introScale = titleRect.width / wordmarkTextRect.width;
  const textOffsetX = wordmarkTextRect.left - wordmarkRect.left;
  const textOffsetY = wordmarkTextRect.top - wordmarkRect.top;
  const introX = titleRect.left - wordmarkRect.left - textOffsetX * introScale;
  const introY = titleRect.top - wordmarkRect.top - textOffsetY * introScale;

  stage.style.setProperty("--title-intro-x", `${introX}px`);
  stage.style.setProperty("--title-intro-y", `${introY}px`);
  stage.style.setProperty("--title-intro-scale", String(introScale));
  wordmark.getBoundingClientRect();
  wordmark.style.transition = previousTransition;
  wordmark.getBoundingClientRect();
}

function createDetailText(tagName, className, text) {
  const element = document.createElement(tagName);
  element.className = className;
  element.textContent = text;
  return element;
}

function renderDetailOverlay(index = currentIndex) {
  if (!detailOverlay) {
    return;
  }

  const detail = screenDetails[index];
  detailOverlay.replaceChildren();

  if (!detail) {
    detailOverlay.setAttribute("aria-hidden", "true");
    return;
  }

  detailOverlay.setAttribute("aria-hidden", "false");

  const shell = document.createElement("section");
  shell.className = "detail-panel";
  shell.setAttribute("aria-label", `${screens[index].label} information`);

  const intro = document.createElement("div");
  intro.className = "detail-intro";
  intro.append(
    createDetailText("p", "detail-eyebrow", detail.eyebrow),
    createDetailText("h2", "detail-heading", detail.heading),
    createDetailText("p", "detail-summary", detail.summary),
  );

  const stats = document.createElement("div");
  stats.className = "detail-stats";
  detail.stats.forEach((item) => {
    const stat = document.createElement("div");
    stat.className = "detail-stat";
    stat.append(
      createDetailText("strong", "detail-stat-value", item.value),
      createDetailText("span", "detail-stat-label", item.label),
    );
    stats.append(stat);
  });
  intro.append(stats);

  const cards = document.createElement("div");
  cards.className = "detail-cards";
  detail.cards.forEach((item) => {
    const card = document.createElement("article");
    card.className = "detail-card";
    card.append(
      createDetailText("h3", "detail-card-title", item.title),
      createDetailText("p", "detail-card-body", item.body),
    );
    cards.append(card);
  });

  shell.append(intro, cards);
  detailOverlay.append(shell);
}

// The revealed background recovers its colour and contrast in step with how
// many tiles are open: the more of the next screen is exposed, the closer it
// gets back to full saturation. A short CSS transition keeps it seamless.
function updateColorRestore() {
  const ratio = getOpenRatio();
  stage.style.setProperty("--restore", String(ratio));
  updateGridLineColor(ratio);
}

function buildIndicator() {
  pageIndicator.replaceChildren();
  indicatorTrack = document.createElement("div");
  indicatorTrack.className = "indicator-track";

  indicatorItems = screens.map((screen, index) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "indicator-item";
    item.dataset.index = String(index);
    item.setAttribute("aria-label", screen.label);

    const title = document.createElement("span");
    title.className = "indicator-title";
    title.textContent = screen.label;

    const dot = document.createElement("span");
    dot.className = "indicator-dot";
    dot.setAttribute("aria-hidden", "true");

    item.append(title, dot);
    item.addEventListener("click", (event) => {
      // Don't let the indicator click fall through to the stage click handler.
      event.stopPropagation();
      navigateToScreen(index);
    });
    indicatorTrack.append(item);
    return item;
  });

  pageIndicator.append(indicatorTrack);
  updateIndicator();
}

// The track slides so the active screen's item rests at the vertical center
// (right-center), making the others appear to move relative to it. The active
// item is updated the moment a transition is committed (see startTransition).
function updateIndicator(activeIndex = currentIndex) {
  if (indicatorTrack) {
    const offset = (screens.length - 1) / 2 - activeIndex;
    indicatorTrack.style.transform = `translateY(calc(${offset} * var(--item-h)))`;
  }
  indicatorItems.forEach((item, index) => {
    const isCurrent = index === activeIndex;
    item.classList.toggle("is-current", isCurrent);
    item.setAttribute("aria-current", isCurrent ? "true" : "false");
    item.tabIndex = isCurrent ? -1 : 0;
  });
}

// Step one screen forward (+1) or back (-1), clamped to the ends — no looping.
function navigateStep(direction) {
  if (isTransitioning) {
    return false;
  }
  const target = currentIndex + direction;
  if (target < 0 || target >= screens.length) {
    return false;
  }
  startTransition("scroll", null, direction);
  return true;
}

// Jump straight to any screen (used by the position indicator).
function navigateToScreen(targetIndex) {
  if (isTransitioning || targetIndex === currentIndex) {
    return;
  }
  startTransition("scroll", null, 1, targetIndex);
}

function releaseWheelLockWhenIdle() {
  window.clearTimeout(wheelUnlockTimer);

  if (!wheelLocked || isTransitioning) {
    return;
  }

  const idleFor = performance.now() - lastWheelAt;
  const afterTransitionFor = performance.now() - transitionCompletedAt;
  const postTransitionLockMs =
    suppressedWheelEvents > 0 ? WHEEL_POST_TRANSITION_LOCK_MS : 0;
  const delay = Math.max(
    0,
    WHEEL_IDLE_RELEASE_MS - idleFor,
    postTransitionLockMs - afterTransitionFor,
  );

  wheelUnlockTimer = window.setTimeout(() => {
    if (isTransitioning) {
      return;
    }

    if (
      performance.now() - lastWheelAt >= WHEEL_IDLE_RELEASE_MS &&
      performance.now() - transitionCompletedAt >= postTransitionLockMs
    ) {
      wheelLocked = false;
      suppressedWheelEvents = 0;
      return;
    }

    releaseWheelLockWhenIdle();
  }, delay);
}

function chooseGrid() {
  const width = Math.max(window.innerWidth, 1);
  const height = Math.max(window.innerHeight, 1);
  const maxRows = Math.max(1, Math.min(80, Math.ceil(height / 24)));
  const maxCols = Math.max(1, Math.min(120, Math.ceil(width / 24)));
  let best = { cols: 1, rows: 1, score: Infinity };

  for (let rows = 1; rows <= maxRows; rows += 1) {
    for (let cols = 1; cols <= maxCols; cols += 1) {
      const tileWidth = width / cols;
      const tileHeight = height / rows;
      const squareError =
        Math.abs(tileWidth - tileHeight) / Math.max(tileWidth, tileHeight);
      const countError = Math.abs(cols * rows - TARGET_PANEL_COUNT) / TARGET_PANEL_COUNT;
      const score = squareError + countError * 0.02;

      if (score < best.score) {
        best = { cols, rows, score };
      }
    }
  }

  return { cols: best.cols, rows: best.rows };
}

function clearPanelTimers() {
  autoCloseTimers.forEach((timer) => window.clearTimeout(timer));
  closingTimers.forEach((timer) => window.clearTimeout(timer));
  autoCloseTimers.clear();
  closingTimers.clear();
}

function paintPanels() {
  panels.forEach((panel) => {
    const title = panel.querySelector(".panel-title");
    if (title) {
      title.textContent = screens[currentIndex].label;
    }
  });
}

function paintLayerTitles(layer, screenIndex) {
  layer.querySelectorAll(".panel-title").forEach((title) => {
    title.textContent = screens[screenIndex].label;
  });
}

function buildPanels() {
  const nextGrid = chooseGrid();
  gridCols = nextGrid.cols;
  gridRows = nextGrid.rows;
  const stageWidth = Math.max(window.innerWidth, 1);
  const stageHeight = Math.max(window.innerHeight, 1);
  const tileWidth = stageWidth / gridCols;
  const tileHeight = stageHeight / gridRows;

  clearPanelTimers();
  openedPanels = new Set();
  panels = buildPanelLayer(panelLayer, currentIndex, true, {
    gridCols,
    gridRows,
    stageWidth,
    stageHeight,
    tileWidth,
    tileHeight,
  });
  buildPanelLayer(nextPanelLayer, nextIndex(), false, {
    gridCols,
    gridRows,
    stageWidth,
    stageHeight,
    tileWidth,
    tileHeight,
  });
  buildGridLines({ gridCols, gridRows });
  populateDetailTiles();
  populateContactTiles();
  updateColorRestore();
}

function buildGridLines(metrics) {
  if (!gridLineLayer) {
    return;
  }

  const { gridCols, gridRows } = metrics;
  const total = gridCols * gridRows;

  gridLineLayer.replaceChildren();
  gridLineLayer.style.setProperty("--grid-cols", String(gridCols));
  gridLineLayer.style.setProperty("--grid-rows", String(gridRows));

  Array.from({ length: total }, (_, index) => {
    const row = Math.floor(index / gridCols);
    const col = index % gridCols;
    const cell = document.createElement("div");

    cell.className = "grid-line-cell";
    if (col === gridCols - 1) {
      cell.classList.add("is-last-col");
    }
    if (row === gridRows - 1) {
      cell.classList.add("is-last-row");
    }

    gridLineLayer.append(cell);
    return cell;
  });
}

function buildPanelLayer(layer, screenIndex, interactive, metrics) {
  const { gridCols, gridRows, stageWidth, stageHeight, tileWidth, tileHeight } = metrics;

  layer.replaceChildren();
  layer.style.setProperty("--grid-cols", String(gridCols));
  layer.style.setProperty("--grid-rows", String(gridRows));
  layer.style.setProperty("--stage-width", `${stageWidth}px`);
  layer.style.setProperty("--stage-height", `${stageHeight}px`);
  setLayerTheme(layer, screens[screenIndex]);

  const total = gridCols * gridRows;
  return Array.from({ length: total }, (_, index) => {
    const panel = document.createElement("div");
    const surface = document.createElement("div");
    const row = Math.floor(index / gridCols);
    const col = index % gridCols;
    const content = document.createElement("div");
    const title = document.createElement("span");

    panel.className = "panel";
    panel.dataset.index = String(index);
    panel.style.setProperty("--panel-row", String(row));
    panel.style.setProperty("--panel-col", String(col));
    panel.style.setProperty("--panel-left", `${col * tileWidth}px`);
    panel.style.setProperty("--panel-top", `${row * tileHeight}px`);
    panel.style.setProperty("--content-left", `${-(col * tileWidth + PANEL_GAP_SIZE)}px`);
    panel.style.setProperty("--content-top", `${-(row * tileHeight + PANEL_GAP_SIZE)}px`);
    panel.style.setProperty("--tile-transform", collapseDirections[0].transform);
    // Hover is driven by a stage-level pointermove (see below) so fast cursor
    // sweeps still ignite every tile along the path, not just the ones the
    // browser happens to sample a pointerenter on.
    surface.className = "panel-surface";
    content.className = "panel-content";
    title.className = "panel-title";
    title.textContent = screens[screenIndex].label;
    content.append(title);
    surface.append(content);
    panel.append(surface);
    layer.append(panel);
    return panel;
  });
}

function populateContactTiles() {
  syncContactTiles();
}

function populateDetailTiles() {
  syncDetailTiles();
}

function hasPanelBoundContent(index = currentIndex) {
  return hasScreenWordmark(index) || hasDetailScreen(index);
}

function removePanelBoundContent() {
  panels.forEach((panel) => {
    panel
      .querySelectorAll(".panel-screen-title, .panel-detail, .panel-contact")
      .forEach((node) => node.remove());
  });
}

function hasPanelMotion() {
  return panels.some(
    (panel) =>
      panel.classList.contains("is-open") || panel.classList.contains("is-closing"),
  );
}

function activatePanelBoundContent() {
  if (!hasPanelBoundContent() || stage.classList.contains("is-tile-content-active")) {
    return;
  }

  syncScreenTitleTiles(true);
  syncDetailTiles(true);
  stage.classList.add("is-tile-content-active");
  resumePanelContentEntrance();
}

function deactivatePanelBoundContentWhenIdle() {
  if (isTransitioning || hasPanelMotion()) {
    return;
  }

  stage.classList.add("is-tile-content-restoring");
  stage.classList.remove("is-tile-content-active");
  removePanelBoundContent();
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      stage.classList.remove("is-tile-content-restoring");
    });
  });
}

// Each tile-bound content clone, described by its intro (from) pose and its
// original entrance transition. `transition(elapsed)` rebuilds that transition
// with each segment's delay shifted back by how long the live entrance has been
// running, so a negative delay makes the clone resume exactly where the live
// element is rather than restarting.
const CONTENT_CONTINUATION = [
  {
    selector: ".panel-screen-title .screen-wordmark",
    // Wordmark opacity is instant (only transform animates), so leave it alone.
    fromOpacity: null,
    fromTransform:
      "translate(var(--title-intro-x), var(--title-intro-y)) scale(var(--title-intro-scale))",
    transition: (elapsed) =>
      `transform 820ms cubic-bezier(0.65, 0, 0.35, 1) ${-elapsed}ms`,
  },
  {
    selector: ".panel-detail > .detail-overlay",
    fromOpacity: "0",
    fromTransform: "translateY(22px)",
    transition: (elapsed) =>
      `opacity 520ms ease ${260 - elapsed}ms, transform 620ms cubic-bezier(0.22, 0.61, 0.21, 1) ${260 - elapsed}ms`,
  },
  {
    selector: ".panel-contact .contact-form",
    fromOpacity: "0",
    fromTransform: "translateY(28px)",
    transition: (elapsed) =>
      `opacity 700ms ease ${450 - elapsed}ms, transform 700ms cubic-bezier(0.22, 0.61, 0.21, 1) ${450 - elapsed}ms`,
  },
];

// Keep the screen's entrance animation running inside the per-tile clones from
// the exact point the live element had reached. The clones are first pinned to
// their intro pose, then transitioned to settled along the original curve but
// offset by a negative delay equal to the elapsed entrance time. That makes the
// motion continuous: no restart, no slowdown, no slight rewind when content
// binds to the tiles mid-entrance. Already-settled content snaps to settled.
function resumePanelContentEntrance() {
  window.requestAnimationFrame(() => {
    const elapsed = Math.max(0, performance.now() - contentEntranceStart);

    // Pass 1: pin every clone to its intro pose with no transition.
    panels.forEach((panel) => {
      CONTENT_CONTINUATION.forEach((cfg) => {
        const el = panel.querySelector(cfg.selector);
        if (!el) {
          return;
        }
        el.style.transition = "none";
        if (cfg.fromOpacity !== null) {
          el.style.opacity = cfg.fromOpacity;
        }
        el.style.transform = cfg.fromTransform;
      });
    });

    // One reflow so the intro pose is registered as the transition's start.
    if (panelLayer) {
      panelLayer.getBoundingClientRect();
    }

    // Pass 2: animate to settled along the original curve, offset by -elapsed.
    panels.forEach((panel) => {
      CONTENT_CONTINUATION.forEach((cfg) => {
        const el = panel.querySelector(cfg.selector);
        if (!el) {
          return;
        }
        el.style.transition = cfg.transition(elapsed);
        if (cfg.fromOpacity !== null) {
          el.style.opacity = "";
        }
        el.style.transform = "";
      });
    });
  });
}

// Clone the current detail overlay into every current-layer tile. When a
// detail screen exits, this keeps the visible detail content attached to each
// tile as the regular panel animation reveals the destination.
function syncDetailTiles(captureCurrentView = false) {
  if (!detailOverlay) {
    return;
  }

  panels.forEach((panel) => {
    const content = panel.querySelector(".panel-content");
    if (!content) {
      return;
    }

    const previous = content.querySelector(".panel-detail");
    if (previous) {
      previous.remove();
    }

    if (!detailOverlay.children.length) {
      return;
    }

    const wrap = document.createElement("div");
    wrap.className = "panel-detail";
    wrap.setAttribute("aria-hidden", "true");

    const clone = detailOverlay.cloneNode(true);
    clone.removeAttribute("id");
    clone.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
    if (captureCurrentView) {
      copyDetailViewState(detailOverlay, clone);
    }
    wrap.append(clone);
    content.append(wrap);
  });
}

function syncDetailTilesForExit() {
  if (!stage.classList.contains("is-tile-content-active")) {
    syncDetailTiles(true);
  }
}

function copyDetailViewState(source, clone) {
  const sourceStyle = window.getComputedStyle(source);

  clone.style.opacity = sourceStyle.opacity;
  clone.style.transform = sourceStyle.transform === "none" ? "none" : sourceStyle.transform;
  clone.style.transition = "none";
}

// Clone the shared top-left title into each tile so outgoing non-sample titles
// move with the current panel layer instead of floating above the transition.
function syncScreenTitleTiles(captureCurrentView = false) {
  if (!titleOverlay || !hasScreenWordmark(currentIndex)) {
    return;
  }

  panels.forEach((panel) => {
    const content = panel.querySelector(".panel-content");
    if (!content) {
      return;
    }

    const previous = content.querySelector(".panel-screen-title");
    if (previous) {
      previous.remove();
    }

    const wrap = document.createElement("div");
    wrap.className = "panel-screen-title";
    wrap.setAttribute("aria-hidden", "true");

    const clone = titleOverlay.cloneNode(true);
    clone.removeAttribute("id");
    clone.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
    if (captureCurrentView) {
      copyScreenTitleViewState(clone);
    }
    wrap.append(clone);
    content.append(wrap);
  });
}

function syncScreenTitleTilesForExit() {
  if (!stage.classList.contains("is-tile-content-active")) {
    syncScreenTitleTiles(true);
  }
}

function copyScreenTitleViewState(clone) {
  if (!screenWordmark) {
    return;
  }

  const sourceStyle = window.getComputedStyle(screenWordmark);
  const cloneWordmark = clone.querySelector(".screen-wordmark");
  if (!cloneWordmark) {
    return;
  }

  cloneWordmark.style.opacity = sourceStyle.opacity;
  cloneWordmark.style.transform = sourceStyle.transform === "none" ? "none" : sourceStyle.transform;
  cloneWordmark.style.transition = "none";
  cloneWordmark.style.willChange = "auto";
}

// Clone the contact overlay into every current-layer tile so that, when
// leaving contact, each tile carries the same visible content slice and slides
// away with the panel.
function syncContactTiles(captureCurrentView = false) {
  if (!contactOverlay) {
    return;
  }

  panels.forEach((panel) => {
    const content = panel.querySelector(".panel-content");
    if (!content) {
      return;
    }
    const previous = content.querySelector(".panel-contact");
    if (previous) {
      previous.remove();
    }

    const wrap = document.createElement("div");
    wrap.className = "panel-contact";
    wrap.setAttribute("aria-hidden", "true");

    Array.from(contactOverlay.children).forEach((child) => {
      const clone = child.cloneNode(true);
      if (captureCurrentView) {
        copyContactViewState(child, clone);
      }
      // Strip ids so the real form's getElementById lookups still resolve, and
      // keep the clones out of the tab order.
      clone.removeAttribute("id");
      clone.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
      clone
        .querySelectorAll("input, textarea, button, select, a")
        .forEach((node) => {
          node.tabIndex = -1;
        });
      wrap.append(clone);
    });

    content.append(wrap);
  });
}

function syncContactTilesForExit() {
  syncContactTiles(true);
}

function copyContactViewState(source, clone) {
  const sourceStyle = window.getComputedStyle(source);

  clone.style.opacity = sourceStyle.opacity;
  clone.style.transform = sourceStyle.transform === "none" ? "none" : sourceStyle.transform;
  clone.style.transition = "none";
  clone.style.top = sourceStyle.top;
  clone.style.left = sourceStyle.left;
  clone.style.width = sourceStyle.width;
  clone.style.maxWidth = sourceStyle.maxWidth;
  clone.style.padding = sourceStyle.padding;
  clone.style.fontSize = sourceStyle.fontSize;
  clone.style.lineHeight = sourceStyle.lineHeight;
  clone.style.letterSpacing = sourceStyle.letterSpacing;

  const sourceControls = source.querySelectorAll("input, textarea, select");
  const cloneControls = clone.querySelectorAll("input, textarea, select");
  sourceControls.forEach((sourceControl, index) => {
    const cloneControl = cloneControls[index];
    if (!cloneControl) {
      return;
    }

    cloneControl.value = sourceControl.value;
    if (sourceControl instanceof HTMLTextAreaElement) {
      cloneControl.textContent = sourceControl.value;
    } else if (sourceControl instanceof HTMLInputElement) {
      cloneControl.setAttribute("value", sourceControl.value);
      cloneControl.checked = sourceControl.checked;
    } else if (sourceControl instanceof HTMLSelectElement) {
      cloneControl.selectedIndex = sourceControl.selectedIndex;
    }

    cloneControl.className = sourceControl.className;
    cloneControl.setAttribute(
      "aria-invalid",
      sourceControl.getAttribute("aria-invalid") || "false",
    );

    const controlStyle = window.getComputedStyle(sourceControl);
    cloneControl.style.backgroundColor = controlStyle.backgroundColor;
    cloneControl.style.borderColor = controlStyle.borderColor;
    cloneControl.style.color = controlStyle.color;
  });
}

function setCollapse(panel, direction) {
  panel.style.setProperty("--tile-transform", direction.transform);
}

function setRandomCollapse(panel) {
  setCollapse(panel, collapseDirections[Math.floor(Math.random() * collapseDirections.length)]);
}

function setRadialCollapse(panel, index, originIndex) {
  const row = Math.floor(index / gridCols);
  const col = index % gridCols;
  const originRow = Math.floor(originIndex / gridCols);
  const originCol = originIndex % gridCols;
  const dx = col - originCol;
  const dy = row - originRow;

  if (Math.abs(dx) >= Math.abs(dy)) {
    setCollapse(panel, dx < 0 ? collapseDirections[0] : collapseDirections[1]);
    return;
  }

  setCollapse(panel, dy < 0 ? collapseDirections[2] : collapseDirections[3]);
}

function beginClosing(index) {
  const panel = panels[index];
  if (!panel || isTransitioning) {
    return;
  }

  panel.classList.add("is-closing");
  panel.classList.remove("is-open");
  openedPanels.delete(index);
  updateColorRestore();
  autoCloseTimers.delete(index);

  const timer = window.setTimeout(() => {
    panel.classList.remove("is-closing");
    closingTimers.delete(index);
    deactivatePanelBoundContentWhenIdle();
  }, TRANSITION_MS);
  closingTimers.set(index, timer);
}

// Per-tile cadence of a normal scroll reveal (the rate tiles flip one after
// another). Reused for the retarget close so closing looks like it runs at the
// same visual speed, regardless of how many tiles are involved.
function getScrollCadence() {
  const lastStartAt = Math.max(0, SCROLL_SEQUENCE_MS - TRANSITION_MS);
  return panels.length > 1 ? lastStartAt / (panels.length - 1) : 0;
}

function closeVisiblePanelsForRetarget() {
  const visiblePanels = panels
    .map((panel, index) => ({ panel, index }))
    .filter(({ panel }) =>
      panel.classList.contains("is-open") || panel.classList.contains("is-closing"),
    );

  if (visiblePanels.length === 0) {
    return 0;
  }

  // Stagger the close at the normal scroll cadence (not squeezed into a fixed
  // budget) so it reads at the same flip-by-flip speed as scrolling.
  const shuffledPanels = shuffleItems(visiblePanels);
  const delayStep = getScrollCadence();
  let longestDelay = 0;

  shuffledPanels.forEach(({ panel, index }, order) => {
    const delay = order * delayStep;
    longestDelay = Math.max(longestDelay, delay);

    const startTimer = window.setTimeout(() => {
      panel.classList.add("is-closing");
      panel.classList.remove("is-open");
      openedPanels.delete(index);
      updateColorRestore();

      const endTimer = window.setTimeout(() => {
        panel.classList.remove("is-closing");
        closingTimers.delete(index);
      }, TRANSITION_MS);
      closingTimers.set(index, endTimer);
    }, delay);
    closingTimers.set(index, startTimer);
  });

  const closePhaseMs = longestDelay + TRANSITION_MS;
  window.setTimeout(() => {
    visiblePanels.forEach(({ panel, index }) => {
      panel.classList.remove("is-closing");
      closingTimers.delete(index);
    });
  }, closePhaseMs);

  return closePhaseMs;
}

function getSequenceMs(mode) {
  if (mode === "click") {
    return CLICK_SEQUENCE_MS;
  }
  if (mode === "threshold") {
    return THRESHOLD_SEQUENCE_MS;
  }
  return SCROLL_SEQUENCE_MS;
}

function getRevealSpread(startDelay, sequenceMs, maxEnd) {
  const fullSpread = Math.max(0, sequenceMs - TRANSITION_MS);
  const cappedSpread = Math.max(0, maxEnd - startDelay - TRANSITION_MS);
  return Math.min(fullSpread, cappedSpread);
}

function openPanel(index, options = {}) {
  const panel = panels[index];
  if (!panel) {
    return;
  }

  const {
    autoClose = true,
    checkThreshold = true,
    originIndex = null,
    delay = 0,
  } = options;

  window.setTimeout(() => {
    if (!panels[index]) {
      return;
    }

    window.clearTimeout(autoCloseTimers.get(index));
    window.clearTimeout(closingTimers.get(index));
    autoCloseTimers.delete(index);
    closingTimers.delete(index);
    panel.classList.remove("is-closing");

    if (!panel.classList.contains("is-open")) {
      if (originIndex === null) {
        setRandomCollapse(panel);
      } else {
        setRadialCollapse(panel, index, originIndex);
      }
    }

    if (!isTransitioning) {
      activatePanelBoundContent();
    }
    panel.classList.add("is-open");
    openedPanels.add(index);
    updateColorRestore();

    if (!isTransitioning && openedPanels.size >= 2) {
      suppressTraceHint();
    }

    if (autoClose && !isTransitioning) {
      const timer = window.setTimeout(() => beginClosing(index), AUTO_CLOSE_MS);
      autoCloseTimers.set(index, timer);
    }

    if (checkThreshold && !isTransitioning && openedPanels.size > panels.length * OPEN_THRESHOLD_RATIO) {
      startTransition("threshold");
    }
  }, delay);
}

function handlePanelHover(index) {
  if (isTransitioning || disablesHoverReveal()) {
    return;
  }

  if (!openedPanels.has(index)) {
    markTraceHintPanel(index);
  }
  openPanel(index);
}

function indexFromPoint(clientX, clientY) {
  const rect = stage.getBoundingClientRect();
  return indexFromLocal(clientX - rect.left, clientY - rect.top, rect);
}

function indexFromLocal(x, y, rect) {
  const lx = Math.min(Math.max(x, 0), rect.width - 1);
  const ly = Math.min(Math.max(y, 0), rect.height - 1);
  const col = Math.min(gridCols - 1, Math.floor((lx / rect.width) * gridCols));
  const row = Math.min(gridRows - 1, Math.floor((ly / rect.height) * gridRows));
  return row * gridCols + col;
}

// Open every tile between the previous pointer sample and this one, so a quick
// flick of the cursor still ignites the whole path instead of just the tiles
// the browser sampled.
function hoverAlongPath(clientX, clientY) {
  if (isTransitioning || disablesHoverReveal()) {
    lastHoverPoint = null;
    return;
  }

  const rect = stage.getBoundingClientRect();
  const point = { x: clientX - rect.left, y: clientY - rect.top };

  if (!lastHoverPoint) {
    const index = indexFromLocal(point.x, point.y, rect);
    handlePanelHover(index);
    lastHoverIndex = index;
    lastHoverPoint = point;
    return;
  }

  const dx = point.x - lastHoverPoint.x;
  const dy = point.y - lastHoverPoint.y;
  const distance = Math.hypot(dx, dy);
  const tileWidth = rect.width / gridCols;
  const tileHeight = rect.height / gridRows;
  const stepSize = Math.max(2, Math.min(tileWidth, tileHeight) / 2);
  const steps = Math.max(1, Math.ceil(distance / stepSize));

  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    const index = indexFromLocal(lastHoverPoint.x + dx * t, lastHoverPoint.y + dy * t, rect);
    if (index !== lastHoverIndex) {
      handlePanelHover(index);
      lastHoverIndex = index;
    }
  }

  lastHoverPoint = point;
}

function revealAllPanels(mode, originIndex = null, options = {}) {
  if (mode === "threshold") {
    return revealThresholdPanels(options);
  }

  if (mode === "scroll") {
    return revealScrollPanels(options);
  }

  if (mode === "click" && originIndex !== null) {
    return revealClickChainPanels(originIndex, options);
  }

  let longestDelay = 0;
  const { startDelay = 0 } = options;

  panels.forEach((_, index) => {
    openPanel(index, {
      autoClose: false,
      checkThreshold: false,
      originIndex: null,
      delay: startDelay,
    });
  });

  return Math.max(longestDelay, startDelay);
}

function revealScrollPanels(options = {}) {
  const { startDelay = 0, sequenceMs = SCROLL_SEQUENCE_MS, maxEnd = Infinity } = options;
  const shuffledPanels = shuffleItems(panels.map((_, index) => index));
  // Keep the open at the normal scroll spread (full cadence), even when it is
  // delayed behind a retarget close — the close eats extra wall-clock time, not
  // the open's per-tile speed. Clamp only if it would run past the safety cap.
  const lastStartAt = getRevealSpread(startDelay, sequenceMs, maxEnd);
  const delayStep =
    shuffledPanels.length > 1 ? lastStartAt / (shuffledPanels.length - 1) : 0;

  shuffledPanels.forEach((index, order) => {
    openPanel(index, {
      autoClose: false,
      checkThreshold: false,
      delay: startDelay + order * delayStep,
    });
  });

  return startDelay + lastStartAt;
}

function revealClickChainPanels(originIndex, options = {}) {
  const { startDelay = 0, sequenceMs = CLICK_SEQUENCE_MS, maxEnd = Infinity } = options;
  const total = panels.length;
  const opened = new Set([originIndex]);
  const stepOf = new Array(total).fill(-1);
  const sourceOf = new Array(total).fill(null);
  stepOf[originIndex] = 0;

  // Simulate the spread in discrete steps. Each step, a closed tile ignites
  // with a probability that climbs as more of its facing tiles open
  // (12.5/25/50/100%). At least one tile must ignite per step so the wave
  // never stalls, which also guarantees every tile is reached.
  let step = 0;
  while (opened.size < total) {
    step += 1;

    const candidates = [];
    for (let index = 0; index < total; index += 1) {
      if (stepOf[index] !== -1) {
        continue;
      }
      const openNeighbors = getOrthogonalNeighbors(index).filter((nb) => opened.has(nb));
      if (openNeighbors.length > 0) {
        candidates.push({ index, openNeighbors });
      }
    }

    if (candidates.length === 0) {
      break;
    }

    let fired = candidates.filter(
      ({ openNeighbors }) =>
        Math.random() < CLICK_NEIGHBOR_PROBABILITY[openNeighbors.length],
    );

    if (fired.length === 0) {
      // Force the most-surrounded tile so the step is never empty.
      const maxOpen = Math.max(...candidates.map((c) => c.openNeighbors.length));
      const pressured = candidates.filter((c) => c.openNeighbors.length === maxOpen);
      fired = [pressured[Math.floor(Math.random() * pressured.length)]];
    }

    fired.forEach(({ index, openNeighbors }) => {
      stepOf[index] = step;
      // Collapse away from a random already-open facing tile (radial feel).
      sourceOf[index] = openNeighbors[Math.floor(Math.random() * openNeighbors.length)];
    });
    fired.forEach(({ index }) => opened.add(index));
  }

  // Spread the step ordering so the last tile starts late enough that its
  // collapse finishes at ~CLICK_SEQUENCE_MS (the whole animation ≈ 1s).
  const maxStep = Math.max(step, 1);
  const lastStartAt = getRevealSpread(startDelay, sequenceMs, maxEnd);
  let longestDelay = 0;

  for (let index = 0; index < total; index += 1) {
    const tileStep = stepOf[index] === -1 ? maxStep : stepOf[index];
    const delay = startDelay + (tileStep / maxStep) * lastStartAt;
    longestDelay = Math.max(longestDelay, delay);
    openPanel(index, {
      autoClose: false,
      checkThreshold: false,
      originIndex: sourceOf[index],
      delay,
    });
  }

  return longestDelay;
}

// Preserved previous click wave animation for quick comparison or rollback.
function revealClickWavePanels(originIndex) {
  let longestDelay = 0;

  panels.forEach((_, index) => {
    const row = Math.floor(index / gridCols);
    const col = index % gridCols;
    const originRow = Math.floor(originIndex / gridCols);
    const originCol = originIndex % gridCols;
    const delay = Math.hypot(row - originRow, col - originCol) * CLICK_WAVE_DELAY_MS;

    longestDelay = Math.max(longestDelay, delay);
    openPanel(index, {
      autoClose: false,
      checkThreshold: false,
      originIndex,
      delay,
    });
  });

  return longestDelay;
}

function getOrthogonalNeighbors(index) {
  const row = Math.floor(index / gridCols);
  const col = index % gridCols;
  const neighbors = [];

  if (row > 0) {
    neighbors.push(index - gridCols);
  }
  if (row < gridRows - 1) {
    neighbors.push(index + gridCols);
  }
  if (col > 0) {
    neighbors.push(index - 1);
  }
  if (col < gridCols - 1) {
    neighbors.push(index + 1);
  }

  return neighbors;
}

function revealThresholdPanels(options = {}) {
  const { startDelay = 0, sequenceMs = THRESHOLD_SEQUENCE_MS, maxEnd = Infinity } = options;
  const remainingPanels = panels
    .map((panel, index) => ({ panel, index }))
    .filter(({ panel }) => !panel.classList.contains("is-open"));
  const shuffledPanels = shuffleItems(remainingPanels);
  const lastStartAt = getRevealSpread(startDelay, sequenceMs, maxEnd);
  const delayStep =
    shuffledPanels.length > 1 ? lastStartAt / (shuffledPanels.length - 1) : 0;

  shuffledPanels.forEach(({ index }, order) => {
    openPanel(index, {
      autoClose: false,
      checkThreshold: false,
      delay: startDelay + order * delayStep,
    });
  });

  return startDelay + lastStartAt;
}

function shuffleItems(items) {
  const shuffledItems = [...items];

  for (let index = shuffledItems.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffledItems[index], shuffledItems[swapIndex]] = [
      shuffledItems[swapIndex],
      shuffledItems[index],
    ];
  }

  return shuffledItems;
}

function completeTransition() {
  currentIndex = pendingTarget;
  setTheme();

  panelLayer.classList.add("is-resetting");
  // The current layer has just been repainted to the destination screen, so
  // drop overlay-specific looks now. is-resetting makes this snap (no fade)
  // while the layer is covered, so the outgoing tiles kept their real-time look
  // right up to the swap and the new screen appears with its normal grid/title.
  stage.classList.remove(
    "has-detail",
    "has-screen-title",
    "is-tile-content-active",
    "is-tile-content-restoring",
    "is-contact",
  );
  // Drop exit states before resetting --restore below so hidden overlay
  // content cannot flash back in when the revealed layer is prepared again.
  stage.classList.remove("is-detail-exit", "is-title-exit", "is-contact-exit");
  // The revealed layer is fully restored and about to be covered by the
  // (full-colour) current layer. Snap the restore amount back to fully
  // desaturated — no transition — so it is gray again for the next cycle
  // without flashing color->gray on screen.
  stage.classList.add("is-restore-instant");
  clearPanelTimers();
  openedPanels = new Set();
  updateColorRestore();

  panels.forEach((panel) => {
    panel.classList.remove("is-open", "is-closing");
    panel.style.setProperty("--tile-transform", collapseDirections[0].transform);
  });
  removePanelBoundContent();
  paintPanels();
  paintLayerTitles(nextPanelLayer, nextIndex());
  setLayerTheme(nextPanelLayer, screens[nextIndex()]);

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      panelLayer.classList.remove("is-resetting");
      stage.classList.remove("is-restore-instant");
      // Toggle the contact state now that resetting transitions are back on,
      // so the grid fade and overlay reveal animate instead of snapping.
      applyScreenState();
      isTransitioning = false;
      transitionCompletedAt = performance.now();
      releaseWheelLockWhenIdle();

      const historyTarget = queuedHistoryTarget;
      queuedHistoryTarget = null;
      if (historyTarget !== null && historyTarget !== currentIndex) {
        window.requestAnimationFrame(() => {
          startTransition(
            "scroll",
            null,
            historyTarget > currentIndex ? 1 : -1,
            historyTarget,
            { updateHistory: false },
          );
        });
      }
    });
  });
}

function startTransition(
  mode,
  originIndex = null,
  direction = 1,
  targetIndex = null,
  options = {},
) {
  if (isTransitioning) {
    return;
  }

  suppressTransitionHints();
  isTransitioning = true;
  if (hasScreenWordmark(currentIndex)) {
    syncScreenTitleTilesForExit();
    stage.classList.add("is-title-exit");
  }
  // Leaving a detail page: hide the single overlay instantly and let the
  // per-panel clones slide away with the tiles.
  if (hasDetailScreen(currentIndex)) {
    syncDetailTilesForExit();
    stage.classList.add("is-detail-exit");
  }
  // Leaving contact: hide the wordmark/form instantly (no return animation) but
  // KEEP is-contact so the collapsing tiles keep contact's real-time look
  // (faded grid, hidden title). It is dropped in completeTransition once the
  // layer is repainted to the destination screen.
  if (currentIndex === CONTACT_INDEX) {
    syncContactTilesForExit();
    stage.classList.add("is-contact-exit");
    clearContactFeedback();
  }
  // Keep the screen's own entrance animation running inside the freshly-bound
  // clones instead of freezing it the instant the slide starts.
  resumePanelContentEntrance();
  pendingTarget =
    targetIndex !== null
      ? targetIndex
      : (currentIndex + direction + screens.length) % screens.length;
  if (options.updateHistory !== false) {
    writeScreenHistory(pendingTarget);
  }
  // The position indicator commits to the destination at the trigger moment
  // (this click/scroll/threshold), not when the tiles finish.
  updateIndicator(pendingTarget);
  window.clearTimeout(transitionTimer);
  clearPanelTimers();
  const sequenceMs = getSequenceMs(mode);
  const needsRevealRepaint = pendingTarget !== revealIndex;
  const revealStartDelay = needsRevealRepaint
    ? closeVisiblePanelsForRetarget()
    : 0;

  if (needsRevealRepaint) {
    if (revealStartDelay > 0) {
      window.setTimeout(() => {
        paintReveal(pendingTarget);
      }, revealStartDelay);
    } else {
      paintReveal(pendingTarget);
    }
  }

  const revealOptions = {
    startDelay: revealStartDelay,
    sequenceMs,
    // When a close runs first, let the open keep full cadence and only cap the
    // overall time so it can't drag on.
    maxEnd: revealStartDelay > 0 ? RETARGET_MAX_MS : Infinity,
  };
  const longestDelay =
    mode === "click" && originIndex !== null
      ? revealAllPanels(mode, originIndex, revealOptions)
      : revealAllPanels(mode, null, revealOptions);

  transitionTimer = window.setTimeout(
    completeTransition,
    Math.max(sequenceMs, longestDelay + TRANSITION_MS) + 80,
  );
}

stage.addEventListener("click", (event) => {
  if (suppressNextClick) {
    suppressNextClick = false;
    window.clearTimeout(suppressClickTimer);
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  if (isTransitioning || currentIndex === CONTACT_INDEX) {
    return;
  }

  startTransition("click", indexFromPoint(event.clientX, event.clientY));
});

stage.addEventListener("pointermove", (event) => {
  // Touch move is classified below: vertical movement navigates, while
  // non-vertical movement reveals panels along the finger path.
  if (event.pointerType === "touch") {
    handleTouchMove(event);
    return;
  }
  trackHintPointer(event.clientX, event.clientY);
  hoverAlongPath(event.clientX, event.clientY);
});

stage.addEventListener("pointerleave", () => {
  lastHoverPoint = null;
  lastHoverIndex = -1;
});

// Touch vertical swipes step screens; non-vertical touch drags reveal panels
// just like a mouse drag. touch-action: none on the stage keeps the browser
// from hijacking the gesture so the pointer events arrive cleanly.
const SWIPE_MIN_DISTANCE = 45;
const TOUCH_PANEL_DRAG_MIN_DISTANCE = 12;
let swipeStartX = 0;
let swipeStartY = 0;
let swipeTracking = false;
let touchGestureMode = null;
let suppressNextClick = false;
let suppressClickTimer = 0;

function suppressUpcomingClick() {
  suppressNextClick = true;
  window.clearTimeout(suppressClickTimer);
  suppressClickTimer = window.setTimeout(() => {
    suppressNextClick = false;
  }, 800);
}

function resetTouchGesture() {
  swipeTracking = false;
  touchGestureMode = null;
  lastHoverPoint = null;
  lastHoverIndex = -1;
}

function startTouchPanelDrag(clientX, clientY) {
  if (touchGestureMode !== "panel") {
    touchGestureMode = "panel";
    suppressUpcomingClick();
    lastHoverPoint = null;
    lastHoverIndex = -1;
    hoverAlongPath(swipeStartX, swipeStartY);
  }

  hoverAlongPath(clientX, clientY);
}

function handleTouchMove(event) {
  if (!swipeTracking || isTransitioning) {
    return;
  }

  const dx = event.clientX - swipeStartX;
  const dy = event.clientY - swipeStartY;
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  const distance = Math.max(absX, absY);

  if (touchGestureMode === "panel") {
    startTouchPanelDrag(event.clientX, event.clientY);
    return;
  }

  if (distance < TOUCH_PANEL_DRAG_MIN_DISTANCE) {
    return;
  }

  if (absY > absX) {
    touchGestureMode = "vertical";
    return;
  }

  startTouchPanelDrag(event.clientX, event.clientY);
}

stage.addEventListener("pointerdown", (event) => {
  if (event.pointerType !== "touch") {
    return;
  }
  swipeStartX = event.clientX;
  swipeStartY = event.clientY;
  swipeTracking = true;
  touchGestureMode = null;
  lastHoverPoint = null;
  lastHoverIndex = -1;
});

stage.addEventListener("pointerup", (event) => {
  if (event.pointerType !== "touch" || !swipeTracking) {
    return;
  }

  const dx = event.clientX - swipeStartX;
  const dy = event.clientY - swipeStartY;
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  const isVertical = absY > absX;

  if (
    touchGestureMode === "panel" ||
    (!isVertical && Math.max(absX, absY) >= TOUCH_PANEL_DRAG_MIN_DISTANCE)
  ) {
    startTouchPanelDrag(event.clientX, event.clientY);
    resetTouchGesture();
    return;
  }

  resetTouchGesture();

  if (!isVertical || absY < SWIPE_MIN_DISTANCE) {
    return;
  }

  suppressUpcomingClick();
  navigateStep(dy < 0 ? 1 : -1);
});

stage.addEventListener("pointercancel", () => {
  if (touchGestureMode === "panel") {
    suppressUpcomingClick();
  }
  resetTouchGesture();
});

stage.addEventListener(
  "wheel",
  (event) => {
    event.preventDefault();
    lastWheelAt = performance.now();

    if (isTransitioning || wheelLocked) {
      suppressedWheelEvents += 1;
      releaseWheelLockWhenIdle();
      return;
    }

    // Scroll down moves forward, scroll up goes back one screen. The ends are
    // clamped (no loop), so a forward scroll on contact simply stays put.
    const moved = navigateStep(event.deltaY > 0 ? 1 : -1);
    if (moved) {
      wheelLocked = true;
      suppressedWheelEvents = 0;
    }
  },
  { passive: false },
);

function isInputShortcutTarget(target) {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(
    target.closest(
      [
        "input",
        "textarea",
        "select",
        "button",
        "[contenteditable='true']",
        "[role='textbox']",
        "[role='combobox']",
        "[role='searchbox']",
      ].join(","),
    ),
  );
}

window.addEventListener("keydown", (event) => {
  if (event.defaultPrevented || event.isComposing || isInputShortcutTarget(event.target)) {
    return;
  }

  let direction = 0;
  if (event.key === "ArrowDown" || event.key === "ArrowRight" || event.key === " ") {
    direction = 1;
  } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
    direction = -1;
  } else {
    return;
  }

  event.preventDefault();
  navigateStep(direction);
});

window.addEventListener("popstate", syncScreenFromHistory);
window.addEventListener("hashchange", syncScreenFromHistory);

// All fields are required; email also has to look like an address. The form is
// a demo and never actually submits.
const contactFields = [
  {
    input: document.getElementById("cf-name"),
    error: document.getElementById("cf-name-error"),
    validate: (value) => (value.trim() ? "" : "お名前を入力してください。"),
  },
  {
    input: document.getElementById("cf-email"),
    error: document.getElementById("cf-email-error"),
    validate: (value) => {
      if (!value.trim()) {
        return "メールアドレスを入力してください。";
      }
      return EMAIL_PATTERN.test(value.trim()) ? "" : "有効なメールアドレスを入力してください。";
    },
  },
  {
    input: document.getElementById("cf-message"),
    error: document.getElementById("cf-message-error"),
    validate: (value) => (value.trim() ? "" : "ご相談内容を入力してください。"),
  },
];

function setFieldError(field, message) {
  field.error.textContent = message;
  field.input.classList.toggle("has-error", Boolean(message));
  field.input.setAttribute("aria-invalid", message ? "true" : "false");
}

function setContactStatus(message, kind) {
  contactStatus.textContent = message;
  contactStatus.classList.toggle("is-error", kind === "error");
  contactStatus.classList.toggle("is-success", kind === "success");
}

function clearContactFeedback() {
  contactFields.forEach((field) => setFieldError(field, ""));
  setContactStatus("", null);
}

contactFields.forEach((field) => {
  // Clear a field's error as soon as the user starts correcting it.
  field.input.addEventListener("input", () => {
    if (field.error.textContent) {
      setFieldError(field, "");
    }
  });
});

contactForm.addEventListener("submit", (event) => {
  event.preventDefault();

  let firstInvalid = null;
  contactFields.forEach((field) => {
    const message = field.validate(field.input.value);
    setFieldError(field, message);
    if (message && !firstInvalid) {
      firstInvalid = field.input;
    }
  });

  if (firstInvalid) {
    setContactStatus("入力内容を確認してください。", "error");
    firstInvalid.focus();
    return;
  }

  // Valid input, but this is a demo, so nothing is sent.
  setContactStatus("ありがとうございます。デモフォームのため送信は行われません。", "success");
  contactForm.reset();
});

let resizeTimer = 0;
window.addEventListener("resize", () => {
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => {
    if (!isTransitioning) {
      buildPanels();
      positionTraceHint();
      positionActionHint();
    }
  }, 120);
});

syncInitialScreenFromHash();
setTheme();
buildIndicator();
applyScreenState();
buildPanels();
initializeInteractionHints();
