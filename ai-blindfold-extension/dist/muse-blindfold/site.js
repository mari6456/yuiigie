// Meta AI（Muse）用の設定（content.js より先に読み込まれる）
// meta.ai はサイドバーに nav などの目印がないことが多いので、
// 「画面左端の縦長パネル」をサイドバーとして見つける方式も使う。
var AIB_SITE = {
  id: "muse",
  name: "Meta AI（Muse）",
  sidebarSelectors: ["nav", "aside", "[role='navigation']", "[role='complementary']"],
  sidebarByLayout: true,
  // 会話へのリンク（＝履歴）。どこに表示されてもぼかす
  historyLinkSelectors: [
    "a[href*='/prompt/']",
    "a[href*='/c/']",
    "a[href*='/chat/']",
    "a[href*='/t/']",
    "a[href*='/conversation']"
  ],
  // ホームのおすすめカードを「メッセージ」と誤認しないよう、article は使わない
  messageSelectors: [
    "[data-message-author-role]",
    "[data-message-id]",
    "[data-testid*='message' i]",
    "[data-testid*='chat-turn' i]",
    "[data-testid*='conversation-turn' i]"
  ],
  // 会話ページのURL：/prompt/xxx など。IDっぽい長い文字列を含むURLも会話とみなす
  conversationPath: /\/(prompt|c|chat|t|conversation|share)\/[^/]+|\/[A-Za-z0-9_-]*\d[A-Za-z0-9_-]{9,}/,
  projectPath: /\/(project|projects|folder|folders)(\/|$)/
};
