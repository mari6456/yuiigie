#!/usr/bin/env bash
# common/ と sites/<名前>/ を合体して dist/ に Chrome 用フォルダと zip を作る
set -euo pipefail
cd "$(dirname "$0")"
rm -rf dist && mkdir -p dist
for site in chatgpt muse; do
  out="dist/${site}-blindfold"
  mkdir -p "$out"
  cp common/* "$out/"
  cp -r "sites/$site/"* "$out/"
  (cd dist && zip -qr "${site}-blindfold.zip" "${site}-blindfold")
  echo "built $out"
done
