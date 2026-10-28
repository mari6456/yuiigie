#!/bin/zsh
# 週次記事作成ジョブ（launchd から非対話で起動される）
set -eu

HARNESS_DIR="$HOME/Library/Mobile Documents/com~apple~CloudDocs/業務委託/YUIIGIE/13.取引先/10_資生堂学園　校友会椿庵/_運用/YUIIGIE記事ハーネス"
CLAUDE_BIN="__CLAUDE_BIN__"   # `which claude` の結果（launchd の PATH は最小限のため絶対パスで指定）

cd "$HARNESS_DIR"
mkdir -p logs
LOG="logs/weekly-$(date +%Y%m%d-%H%M%S).log"

# 二重起動防止
LOCK="/tmp/yuiigie-weekly.lock"
if ! mkdir "$LOCK" 2>/dev/null; then
  echo "$(date) 実行中のジョブがあるため終了" >> "$LOG"
  exit 0
fi
trap 'rmdir "$LOCK"' EXIT

PROMPT='README.md と「Mac miniへの引継ぎ.md」「メール下書き版への更新指示.md」に従い、次の未作成回を1回分だけ進めてください。
- 記事を新規ファイルとして作成する（既存記事・原資料・手修正済みファイルは上書き・削除しない）
- Obsidian「05_記事作成の参照素材」に従い、YouTube切り抜きの文字起こし・キャプションも参照する
- レタッチ済み写真から候補を1〜3枚選ぶ。該当がなければ「写真なし」と記録する
- 掲載用URLを準備する
- メールは下書き作成までとし、送信しない。公開もしない
- 校正完了チェックは付けない
- 結果を status.json に記録する'

rc=0
"$CLAUDE_BIN" -p "$PROMPT" --permission-mode dontAsk >> "$LOG" 2>&1 || rc=$?
echo "$(date) exit=$rc" >> "$LOG"
exit $rc
