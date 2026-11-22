// Meta AI（Muse）用の設定（content.js より先に読み込まれる）
var AIB_SITE = {
  id: "muse",
  name: "Meta AI（Muse）",
  sidebarSelectors: [
    "nav",
    "aside",
    "[role='navigation']",
    "[role='complementary']"
  ],
  // 会話ページのURL（meta.ai は /prompt/xxx など）
  conversationPath: /\/(prompt|c|chat|t|conversation|share)\/[^/]+/,
  projectPath: /\/(project|projects|folder|folders)(\/|$)/
};
