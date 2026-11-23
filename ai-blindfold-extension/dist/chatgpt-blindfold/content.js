// 講座用 AI目隠し（共通ロジック）
// サイトごとの違いは site.js の AIB_SITE に書く。
//
// ・サイドバー（履歴・プロジェクト・アカウント名）をぼかす
// ・新規チャット／プロジェクトを開いた時は、入力欄以外（提案・あいさつ・チャット一覧など）をぼかす
// ・プロジェクト内では上部ヘッダー（プロジェクト名）もぼかす
// ・カーソルを合わせた項目だけ見える（設定でOFF可）
// ・今動かしているチャット（メッセージ）と入力欄は絶対にぼかさない
(() => {
  const SITE = typeof AIB_SITE !== "undefined" ? AIB_SITE : {};
  const html = document.documentElement;
  html.classList.add("aib-boot");
  const bootTimer = setTimeout(() => html.classList.remove("aib-boot"), 1500);

  const host = location.hostname.replace(/^www\./, "");

  const DEFAULTS = {
    enabled: true,
    blur: 10,
    sidebar: true,
    home: true,
    peek: true, // カーソルを合わせたら見える
    custom: {} // { hostname: [selector, ...] }
  };

  const SIDEBAR_SELECTORS = (SITE.sidebarSelectors || ["nav", "aside"]).join(",");
  const CONVERSATION_PATH = SITE.conversationPath || /\/(c|prompt|chat)\/[^/]+/;
  const PROJECT_PATH = SITE.projectPath || null;

  // 「チャット中」と判断するためのメッセージ要素
  const MESSAGE_SELECTORS = (
    SITE.messageSelectors || [
      "[data-message-author-role]",
      "[data-testid^='conversation-turn']",
      "[data-testid*='message']",
      "[data-message-id]",
      "article"
    ]
  ).join(",");
  const HISTORY_LINKS = SITE.historyLinkSelectors ? SITE.historyLinkSelectors.join(",") : null;

  const COMPOSER_SELECTORS = [
    "#prompt-textarea",
    "form textarea",
    "form [contenteditable='true']",
    "textarea",
    "[contenteditable='true'][role='textbox']",
    "[contenteditable='true']"
  ];

  const ZONES = ["aib-zone-side", "aib-zone-home", "aib-zone-head", "aib-zone-custom"];

  // ---- ぼかし用スタイル（項目単位でぼかし、カーソルを合わせた項目だけ見せる）----
  // 「項目」= リンク・ボタン・見出し・リスト行・文字だけの要素など。
  // いちばん外側の項目をぼかすので、ホバーするとその1行だけが見える。
  const BASIC =
    "a,button,[role=button],[role=link],[role=option],[role=menuitem],[role=row]," +
    "h1,h2,h3,h4,h5,h6,p,li,label,img,video,canvas,input,select,span";
  const ITEMS = BASIC + ",:not(:has(*))"; // 中に要素がない（文字だけの）要素も項目扱い
  const Z = ZONES.map((c) => "." + c).join(",");
  // :has() は入れ子にできないので、ルールを分けて書く（1つが無効でも他は効くように）
  const selectors = [
    `html.aib-on :is(${Z}) :is(${ITEMS}):not(:is(${BASIC}) *)`, // ゾーン内のいちばん外側の項目
    `html.aib-on :is(${Z}):is(${BASIC})`, // ゾーン自体が項目
    `html.aib-on :is(${Z}):not(:has(${BASIC},div))` // 中身が文字だけのゾーン
  ];
  const style = document.createElement("style");
  style.id = "aib-style";
  style.textContent = selectors
    .map(
      (s) => `
    ${s} { filter: blur(var(--aib-blur, 10px)) !important; transition: filter .15s ease !important; }
    ${s.replace(/^html\.aib-on /, "html.aib-on.aib-peek ")}:hover { filter: none !important; transition-delay: .25s !important; }`
    )
    .join("\n");
  (document.head || html).appendChild(style);

  let settings = { ...DEFAULTS };
  let sentOnThisPage = false; // ホームで送信したら会話開始とみなす
  let lastPath = location.pathname;

  // ---- ユーティリティ ---------------------------------------------------
  const isVisible = (el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };

  function findComposer() {
    for (const sel of COMPOSER_SELECTORS) {
      const list = [...document.querySelectorAll(sel)].filter(
        (el) => isVisible(el) && !el.closest("#aib-toast")
      );
      if (list.length) return list[list.length - 1];
    }
    return null;
  }

  function composerRoot(composer) {
    if (!composer) return null;
    return composer.closest("form") || composer.parentElement || composer;
  }

  function hasMessages() {
    return [...document.querySelectorAll(MESSAGE_SELECTORS)].some(isVisible);
  }

  // この要素をぼかすと「今のチャット」や入力欄が見えなくなるか？
  function isProtected(el, root) {
    if (root && (el === root || el.contains(root) || root.contains(el))) return true;
    if (el.matches(MESSAGE_SELECTORS)) return true;
    if (el.querySelector(MESSAGE_SELECTORS)) return true;
    if (el.closest(MESSAGE_SELECTORS)) return true;
    return false;
  }

  function isHomeState() {
    if (sentOnThisPage) return false;
    if (CONVERSATION_PATH.test(location.pathname)) return false;
    if (hasMessages()) return false;
    return true;
  }

  // 画面左端に張り付いた縦長パネル（サイドバー）を探す
  function isLeftPanel(el) {
    const r = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    return (
      r.left <= 8 &&
      r.top <= 120 &&
      r.height >= vh * 0.6 &&
      r.width >= 48 &&
      r.width <= Math.min(440, vw * 0.45)
    );
  }

  function findLeftPanels(root) {
    const found = new Set();
    const vh = window.innerHeight;
    for (const y of [0.25, 0.5, 0.75].map((f) => vh * f)) {
      for (const x of [12, 40]) {
        let el = document.elementFromPoint(x, y);
        let best = null;
        while (el && el !== document.body && el !== html) {
          if (isLeftPanel(el)) best = el; // いちばん外側のパネルを採用
          el = el.parentElement;
        }
        if (best && !isOurs(best) && !isProtected(best, root)) found.add(best);
      }
    }
    // 入れ子になったものは外側だけ残す
    return [...found].filter((el) => ![...found].some((o) => o !== el && o.contains(el)));
  }

  function isProject() {
    return !!(PROJECT_PATH && PROJECT_PATH.test(location.pathname));
  }

  function clearClass(cls) {
    document.querySelectorAll("." + cls).forEach((el) => el.classList.remove(cls));
  }

  function setClass(cls, elements) {
    const want = new Set(elements);
    document.querySelectorAll("." + cls).forEach((el) => {
      if (!want.has(el)) el.classList.remove(cls);
    });
    want.forEach((el) => el.classList.add(cls));
  }

  const SKIP_TAGS = ["SCRIPT", "STYLE", "LINK", "META", "TEMPLATE", "NOSCRIPT"];
  const isOurs = (el) => el.id === "aib-pick-box" || el.id === "aib-toast" || el.id === "aib-style";

  // ---- メイン処理 -------------------------------------------------------
  function apply() {
    if (location.pathname !== lastPath) {
      lastPath = location.pathname;
      sentOnThisPage = false;
    }

    if (style.parentNode == null) (document.head || html).appendChild(style);
    html.style.setProperty("--aib-blur", settings.blur + "px");
    html.classList.toggle("aib-on", !!settings.enabled);
    html.classList.toggle("aib-peek", !!settings.peek);

    if (!settings.enabled) {
      ZONES.forEach(clearClass);
      return;
    }

    const root = composerRoot(findComposer());
    const project = isProject();
    const home = isHomeState();

    // 1) サイドバー
    const side = [];
    if (settings.sidebar) {
      document.querySelectorAll(SIDEBAR_SELECTORS).forEach((el) => {
        if (el.parentElement?.closest(".aib-zone-side")) return; // 親がぼかし済み
        if (!isProtected(el, root)) side.push(el);
      });
      // 目印のないサイドバー：画面左端に縦長に張り付いているパネルを探す
      if (SITE.sidebarByLayout) {
        for (const el of findLeftPanels(root)) {
          if (!side.some((s) => s.contains(el))) side.push(el);
        }
      }
      // 会話へのリンク（＝履歴）はどこにあってもぼかす
      if (HISTORY_LINKS) {
        document.querySelectorAll(HISTORY_LINKS).forEach((a) => {
          if (side.some((s) => s.contains(a))) return;
          if (!isProtected(a, root)) side.push(a);
        });
      }
    }
    setClass("aib-zone-side", side);

    // 2) 新規チャット・プロジェクトのページ：入力欄までの経路の「兄弟要素」をすべてぼかす
    const homeEls = [];
    if (settings.home && root && home) {
      const stop = root.closest("main") || document.body;
      let node = root;
      while (node && node !== stop && node.parentElement) {
        for (const sib of node.parentElement.children) {
          if (sib === node || SKIP_TAGS.includes(sib.tagName) || isOurs(sib)) continue;
          if (sib.classList.contains("aib-zone-side")) continue;
          // 通常のホームではヘッダー（モデル切替）は見せる。プロジェクトではぼかす
          if (!project && sib.matches("header, #page-header")) continue;
          if (!isProtected(sib, root)) homeEls.push(sib);
        }
        node = node.parentElement;
      }
    }
    setClass("aib-zone-home", homeEls);

    // 3) プロジェクト内のチャット：上部ヘッダー（プロジェクト名）をぼかす
    const head = [];
    if (settings.home && project) {
      document.querySelectorAll("header, #page-header").forEach((el) => {
        if (el.closest(".aib-zone-side, .aib-zone-home")) return;
        if (!isProtected(el, root)) head.push(el);
      });
    }
    setClass("aib-zone-head", head);

    // 4) 手動で追加した場所
    const customEls = [];
    for (const sel of settings.custom[host] || []) {
      try {
        document.querySelectorAll(sel).forEach((el) => {
          if (!isProtected(el, root)) customEls.push(el);
        });
      } catch (_) {
        /* 壊れたセレクタは無視 */
      }
    }
    setClass("aib-zone-custom", customEls);
  }

  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      apply();
    });
  }

  // ---- 送信の検知（ホーム → 会話 への切り替え） ------------------------
  function markSent() {
    if (!isHomeState()) return;
    sentOnThisPage = true;
    schedule();
  }

  document.addEventListener(
    "keydown",
    (e) => {
      if (picking) return;
      if (e.key !== "Enter" || e.shiftKey || e.isComposing || e.keyCode === 229) return;
      const t = e.target;
      const editable = t?.closest?.("textarea, [contenteditable='true']");
      if (!editable) return;
      const text = (editable.value ?? editable.innerText ?? "").trim();
      if (text) setTimeout(markSent, 50);
    },
    true
  );

  document.addEventListener(
    "click",
    (e) => {
      if (picking) return;
      const btn = e.target.closest?.("button,[role=button]");
      if (!btn) return;
      const label = (btn.getAttribute("aria-label") || "") + " " + (btn.getAttribute("data-testid") || "");
      if (/send|送信|submit/i.test(label) || (btn.type === "submit" && btn.closest("form"))) {
        setTimeout(markSent, 50);
      }
    },
    true
  );

  // ---- 手動選択モード ---------------------------------------------------
  let picking = false;
  let pickBox = null;
  let toast = null;
  let hovered = null;

  const cssEscape = (s) => (window.CSS && CSS.escape ? CSS.escape(s) : s.replace(/["\\]/g, "\\$&"));
  const looksStable = (id) => id && !/\d{4,}|^:|[a-f0-9]{8,}/i.test(id);

  function selectorFor(el) {
    const tid = el.getAttribute("data-testid");
    if (tid) return `[data-testid="${cssEscape(tid)}"]`;
    if (looksStable(el.id)) return "#" + cssEscape(el.id);
    const aria = el.getAttribute("aria-label");
    if (aria && aria.length < 60) return `${el.tagName.toLowerCase()}[aria-label="${cssEscape(aria)}"]`;

    const parts = [];
    let node = el;
    for (let depth = 0; node && node !== document.body && depth < 10; depth++) {
      const ptid = node !== el && node.getAttribute("data-testid");
      if (ptid) {
        parts.unshift(`[data-testid="${cssEscape(ptid)}"]`);
        break;
      }
      if (node !== el && looksStable(node.id)) {
        parts.unshift("#" + cssEscape(node.id));
        break;
      }
      const parent = node.parentElement;
      if (!parent) break;
      const tag = node.tagName.toLowerCase();
      const same = [...parent.children].filter((c) => c.tagName === node.tagName);
      parts.unshift(same.length > 1 ? `${tag}:nth-of-type(${same.indexOf(node) + 1})` : tag);
      node = parent;
    }
    return parts.join(" > ");
  }

  function showToast(text) {
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "aib-toast";
      html.appendChild(toast);
    }
    toast.textContent = text;
  }

  const customList = () => settings.custom[host] || [];

  function matchedCustom(el) {
    return customList().find((sel) => {
      try {
        return el.closest(sel);
      } catch (_) {
        return false;
      }
    });
  }

  function drawBox() {
    if (!hovered || !pickBox) return;
    const r = hovered.getBoundingClientRect();
    Object.assign(pickBox.style, {
      left: r.left + "px",
      top: r.top + "px",
      width: r.width + "px",
      height: r.height + "px"
    });
    pickBox.classList.toggle("aib-remove", !!matchedCustom(hovered));
  }

  function onPickMove(e) {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el === pickBox || el === toast || el === hovered) return;
    hovered = el;
    drawBox();
  }

  // ホイール↑で範囲を親要素へ広げる / ↓で戻す
  const childStack = [];
  function onPickWheel(e) {
    if (!hovered) return;
    if (e.deltaY < 0 && hovered.parentElement && hovered.parentElement !== document.body) {
      childStack.push(hovered);
      hovered = hovered.parentElement;
    } else if (e.deltaY > 0 && childStack.length) {
      hovered = childStack.pop();
    } else return;
    e.preventDefault();
    drawBox();
  }

  async function onPickClick(e) {
    swallow(e);
    const el = hovered;
    if (!el) return;
    childStack.length = 0;
    const existing = matchedCustom(el);
    let list = [...customList()];
    if (existing) {
      list = list.filter((s) => s !== existing);
      showToast("ぼかしを解除しました（続けてクリック / Escで終了）");
    } else {
      if (isProtected(el, composerRoot(findComposer()))) {
        showToast("ここはチャット本体・入力欄を含むためぼかせません");
        return;
      }
      list.push(selectorFor(el));
      showToast("ぼかしました（続けてクリック / ホイール↑で範囲を広げる / Escで終了）");
    }
    await chrome.storage.sync.set({ custom: { ...settings.custom, [host]: list } });
  }

  function swallow(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }

  function onPickKey(e) {
    if (e.key === "Escape") {
      swallow(e);
      stopPicking();
    }
  }

  const SWALLOW_EVENTS = ["mousedown", "mouseup", "pointerdown", "pointerup", "dblclick"];

  function startPicking() {
    if (picking) return;
    picking = true;
    pickBox = document.createElement("div");
    pickBox.id = "aib-pick-box";
    html.appendChild(pickBox);
    showToast("ぼかしたい場所をクリック（ホイール↑で範囲を広げる / もう一度クリックで解除 / Escで終了）");
    document.addEventListener("mousemove", onPickMove, true);
    document.addEventListener("wheel", onPickWheel, { capture: true, passive: false });
    document.addEventListener("click", onPickClick, true);
    SWALLOW_EVENTS.forEach((t) => document.addEventListener(t, swallow, true));
    document.addEventListener("keydown", onPickKey, true);
  }

  function stopPicking() {
    picking = false;
    document.removeEventListener("mousemove", onPickMove, true);
    document.removeEventListener("wheel", onPickWheel, { capture: true });
    document.removeEventListener("click", onPickClick, true);
    SWALLOW_EVENTS.forEach((t) => document.removeEventListener(t, swallow, true));
    document.removeEventListener("keydown", onPickKey, true);
    pickBox?.remove();
    toast?.remove();
    pickBox = toast = hovered = null;
    childStack.length = 0;
  }

  // ---- 診断情報（画面の骨組みだけ。文字・チャット名は含めない）-----------
  const maskPath = (p) => p.replace(/\/[^/]*\d[^/]*/g, "/:id").replace(/\/[A-Za-z0-9_-]{16,}/g, "/:id");

  function diagnose() {
    const composer = findComposer();
    const root = composerRoot(composer);
    let count = 0;
    const desc = (el) => {
      const r = el.getBoundingClientRect();
      const o = { t: el.tagName.toLowerCase() };
      if (looksStable(el.id)) o.id = el.id;
      for (const a of ["role", "data-testid", "type", "contenteditable"]) {
        const v = el.getAttribute(a);
        if (v) o[a] = v.slice(0, 40);
      }
      if (el.tagName === "A") o.href = maskPath(el.getAttribute("href") || "");
      const cls = [...el.classList].filter((c) => !c.startsWith("aib-")).slice(0, 3).join(" ");
      if (cls) o.c = cls.slice(0, 60);
      const z = ZONES.filter((c) => el.classList.contains(c)).join(" ");
      if (z) o.zone = z;
      o.r = [r.left, r.top, r.width, r.height].map(Math.round).join(",");
      if (el === composer) o.COMPOSER = true;
      if (el === root) o.COMPOSER_ROOT = true;
      return o;
    };
    const walk = (el, depth) => {
      if (count++ > 600 || depth > 14) return null;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0 && !el.contains(composer)) return null;
      const o = desc(el);
      const kids = [...el.children]
        .filter((c) => !SKIP_TAGS.includes(c.tagName) && c.tagName !== "svg" && c.tagName !== "path")
        .map((c) => walk(c, depth + 1))
        .filter(Boolean);
      if (kids.length) o.k = kids;
      return o;
    };
    return {
      v: chrome.runtime.getManifest().version,
      host,
      path: maskPath(location.pathname),
      vw: [window.innerWidth, window.innerHeight],
      composer: composer ? desc(composer) : null,
      home: isHomeState(),
      convPath: CONVERSATION_PATH.test(location.pathname),
      messages: document.querySelectorAll(MESSAGE_SELECTORS).length,
      zones: ZONES.map((z) => z + ":" + document.querySelectorAll("." + z).length).join(" "),
      tree: walk(document.body, 0)
    };
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === "aib-diag") sendResponse(JSON.stringify(diagnose()));
    if (msg?.type === "aib-pick") startPicking();
    if (msg?.type === "aib-status") {
      sendResponse({
        host,
        site: SITE.name || host,
        home: !!(settings.enabled && isHomeState()),
        project: isProject(),
        customCount: customList().length
      });
    }
  });

  // ---- 起動 -------------------------------------------------------------
  chrome.storage.sync.get(DEFAULTS, (s) => {
    settings = { ...DEFAULTS, ...s };
    const start = () => {
      apply();
      clearTimeout(bootTimer);
      html.classList.remove("aib-boot");
      new MutationObserver(schedule).observe(html, { childList: true, subtree: true });
      window.addEventListener("popstate", schedule);
      setInterval(schedule, 1000); // URL変更（SPA遷移）の取りこぼし対策
    };
    if (document.body) start();
    else document.addEventListener("DOMContentLoaded", start, { once: true });
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    for (const [k, v] of Object.entries(changes)) settings[k] = v.newValue ?? DEFAULTS[k];
    schedule();
  });
})();
