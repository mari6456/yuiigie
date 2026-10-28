# Mac mini 適用キット（下書き・未検証）

クラウド環境で作成した下書きです。Mac mini 本体では未適用・未検証です。
`__...__` の値は、Mac mini 上でハーネスの README.md を読んで埋めてください。

| ファイル | 置き場所 |
|---|---|
| `settings.json` | ハーネスフォルダの `.claude/settings.json` |
| `run-weekly.sh` | ハーネスフォルダ（または `~/bin/`） |
| `jp.yuiigie.weekly-article.plist` | `~/Library/LaunchAgents/` |

## 権限の方針
- `bypassPermissions` は使わない。`dontAsk` で、`allow` にない操作はすべて自動拒否する
- 読み取り: YUIIGIE フォルダと Obsidian「05_記事作成の参照素材」だけ
- 書き込み: 出力フォルダ・`status.json`・`logs/` だけ（既存記事・原資料は書き換え不可）
- Gmail: 下書きの作成・更新だけ。送信・返信・転送・削除は拒否
- 削除・移動・外部送信・公開・スケジュール変更につながるコマンドは拒否

## プレースホルダ
- `__OBSIDIAN_VAULT__`: Obsidian の保管庫名
- `__OUTPUT_DIR__`: 記事・写真候補・URL の出力フォルダ（ハーネス README に従う）
- `__HARNESS_COMMAND__`: PDF・ZIP 処理などハーネスが使うスクリプト（不要なら行ごと削除）
- `__CLAUDE_BIN__`: `which claude` の結果
- `__RUN_WEEKLY_SH_PATH__`: `run-weekly.sh` の絶対パス

## 適用順（Mac mini 上で）
1. `date` と `sudo systemsetup -gettimezone` で、タイムゾーンが Asia/Tokyo か確認する
2. プレースホルダを埋めて配置する
3. 本番前の確認として、書き込みを伴わない指示で非対話実行を試す:
   `claude -p "README.md を読み、次の未作成回が何回かだけ答えてください。ファイルは変更しないでください。" --permission-mode dontAsk`
4. `zsh run-weekly.sh` を手動で1回実行する。ログ・`status.json`・出力物を確認し、送信・公開・校正チェックが起きていないことを確かめる
5. 問題がなければ、旧記事作成タスクを停止する（`launchctl list | grep -i yuiigie` で旧ラベルを確認してから `launchctl bootout`）
6. 新ジョブを登録する: `launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/jp.yuiigie.weekly-article.plist`
7. `launchctl print gui/$(id -u)/jp.yuiigie.weekly-article` で、次回の実行予定を確認する

注意: 実行時刻に Mac がスリープしていた場合、launchd は復帰後に実行します。
