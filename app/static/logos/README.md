# Desktop Plus icons

`desktop-plus.svg` is the silver and black light icon used by the legacy macOS
ICNS and Windows ICO files. Regenerate those files with
`bash script/build-icon-assets.sh`.

`desktop-plus.icon` supplies the native macOS appearance variants: the same
silver and black design in light mode, and option A (graphite with a white
GitHub symbol) in dark mode. Glass and translucency are disabled for legibility.
`desktop-plus-dark.svg` preserves the selected flat artwork.

`Assets.car` is compiled from `desktop-plus.icon` with Xcode 26 and committed so
local app builds only require Command Line Tools. To regenerate it on a Mac
with Xcode, run `bash script/compile-macos-icon.sh`. The `Compile Desktop icon`
workflow also builds it when its sources change on `feat/commit-search`;
download its `desktop-icon` artifact and replace `Assets.car` before packaging.

Keep the light colors and symbol geometry consistent between the legacy SVG
and the native icon source when editing the light design.
