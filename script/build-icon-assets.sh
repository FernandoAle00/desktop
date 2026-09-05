#!/usr/bin/env bash
# Generate the fork's macOS and Windows icons without a full Xcode installation.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOGO_DIR="$SCRIPT_DIR/../app/static/logos"
ICON_WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$ICON_WORK_DIR"' EXIT

mkdir "$ICON_WORK_DIR/desktop.iconset"
sips -s format png "$LOGO_DIR/desktop-plus.svg" --out "$ICON_WORK_DIR/master.png" >/dev/null

for size in 16 32 128 256 512; do
  sips -z "$size" "$size" "$ICON_WORK_DIR/master.png" \
    --out "$ICON_WORK_DIR/desktop.iconset/icon_${size}x${size}.png" >/dev/null
  retina_size=$((size * 2))
  sips -z "$retina_size" "$retina_size" "$ICON_WORK_DIR/master.png" \
    --out "$ICON_WORK_DIR/desktop.iconset/icon_${size}x${size}@2x.png" >/dev/null
done

iconutil -c icns "$ICON_WORK_DIR/desktop.iconset" -o "$ICON_WORK_DIR/desktop.icns"
sips -s format ico "$ICON_WORK_DIR/desktop.iconset/icon_256x256.png" \
  --out "$ICON_WORK_DIR/desktop.ico" >/dev/null

for channel in prod dev; do
  cp "$ICON_WORK_DIR/desktop.icns" "$LOGO_DIR/$channel/icon-logo-legacy.icns"
  cp "$ICON_WORK_DIR/desktop.ico" "$LOGO_DIR/$channel/icon-logo.ico"
done

echo "Generated macOS and Windows icons for prod and dev."
