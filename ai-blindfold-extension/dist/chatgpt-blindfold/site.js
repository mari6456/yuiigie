// ChatGPT 用の設定（content.js より先に読み込まれる）
var AIB_SITE = {
  id: "chatgpt",
  name: "ChatGPT",
  // サイドバー（履歴・プロジェクト一覧・アカウント名）
  sidebarSelectors: [
    "#stage-slideover-sidebar",
    "nav",
    "[data-testid='history-item']",
    "[role='navigation']"
  ],
  // 会話ページのURL：/c/xxx、/g/g-p-xxx（プロジェクト）/c/xxx、/share/xxx
  conversationPath: /\/(c|share)\/[^/]+/,
  // プロジェクトのページ（/g/g-p-xxx/project）。ここでは入力欄以外を全部ぼかす
  projectPath: /\/g\/g-p-[^/]+/
};
