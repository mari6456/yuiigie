// ショートカット（Alt+Shift+B）で ON/OFF を切り替え、アイコンにバッジを表示する
const DEFAULTS = { enabled: true };

async function updateBadge() {
  const { enabled } = await chrome.storage.sync.get(DEFAULTS);
  await chrome.action.setBadgeText({ text: enabled ? "ON" : "" });
  await chrome.action.setBadgeBackgroundColor({ color: "#3DA9C7" });
}

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "toggle-blindfold") return;
  const { enabled } = await chrome.storage.sync.get(DEFAULTS);
  await chrome.storage.sync.set({ enabled: !enabled });
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && "enabled" in changes) updateBadge();
});

chrome.runtime.onInstalled.addListener(updateBadge);
chrome.runtime.onStartup.addListener(updateBadge);
