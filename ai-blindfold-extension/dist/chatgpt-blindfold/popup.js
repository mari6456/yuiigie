const DEFAULTS = { enabled: true, blur: 10, sidebar: true, home: true, peek: true, custom: {} };
const $ = (id) => document.getElementById(id);

let tab = null;
let host = null;

async function init() {
  const s = await chrome.storage.sync.get(DEFAULTS);
  for (const k of ["enabled", "sidebar", "home", "peek"]) {
    $(k).checked = !!s[k];
    $(k).addEventListener("change", () => chrome.storage.sync.set({ [k]: $(k).checked }));
  }
  $("blur").value = s.blur;
  $("blur").addEventListener("input", () => chrome.storage.sync.set({ blur: Number($("blur").value) }));

  [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  let status = null;
  try {
    status = await chrome.tabs.sendMessage(tab.id, { type: "aib-status" });
  } catch (_) {}

  if (status) {
    host = status.host;
    const where = status.project ? "プロジェクト" : status.home ? "ホーム画面（提案をぼかし中）" : "チャット中";
    $("site").textContent = `${status.site} ・ ${where}`;
    $("count").textContent = (s.custom[host] || []).length;
  } else {
    const name = chrome.runtime.getManifest().short_name;
    $("site").textContent = `このページは対象外です（${name}の対象サイトで開いてください）`;
    $("pick").disabled = true;
    $("clear").disabled = true;
    $("diag").disabled = true;
  }
  $("title").textContent = "🙈 " + chrome.runtime.getManifest().short_name;
}

$("pick").addEventListener("click", async () => {
  await chrome.tabs.sendMessage(tab.id, { type: "aib-pick" });
  window.close();
});

$("diag").addEventListener("click", async () => {
  const btn = $("diag");
  try {
    const json = await chrome.tabs.sendMessage(tab.id, { type: "aib-diag" });
    await navigator.clipboard.writeText(json);
    btn.textContent = "コピーしました！チャットに貼り付けてください";
  } catch (e) {
    btn.textContent = "コピーできませんでした：" + (e?.message || e);
  }
});

$("clear").addEventListener("click", async () => {
  const { custom } = await chrome.storage.sync.get(DEFAULTS);
  delete custom[host];
  await chrome.storage.sync.set({ custom });
  $("count").textContent = "0";
});

init();
