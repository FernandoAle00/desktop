#!/usr/bin/env bash
# Requires Xcode 26; normal app builds use the committed Assets.car.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOGO_DIR="$SCRIPT_DIR/../app/static/logos"
ICON_WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$ICON_WORK_DIR"' EXIT

xcrun actool "$LOGO_DIR/desktop-plus.icon" \
  --compile "$ICON_WORK_DIR" \
  --app-icon desktop-plus \
  --output-partial-info-plist "$ICON_WORK_DIR/partial.plist" \
  --minimum-deployment-target 12.0 \
  --platform macosx --target-device mac --errors --warnings --notices

cp "$ICON_WORK_DIR/Assets.car" "$LOGO_DIR/Assets.car"
