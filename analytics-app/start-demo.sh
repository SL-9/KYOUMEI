#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
NODE_BIN="$SCRIPT_DIR/../.tools/node-v24.18.0-darwin-arm64/bin"

if [ ! -x "$NODE_BIN/node" ]; then
  echo "プロジェクト用Node.jsが見つかりません: $NODE_BIN" >&2
  exit 1
fi

cd "$SCRIPT_DIR"
PATH="$NODE_BIN:$PATH" exec npm run dev:demo
