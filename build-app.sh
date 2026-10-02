#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
app="build/Codex 小幽灵.app"
if [ -f "$app/Contents/MacOS/PixelCompanion" ]; then
  echo 'Build already exists. Preserve or move it explicitly before building again.' >&2
  exit 1
fi
mkdir -p "$app/Contents/MacOS" "$app/Contents/Resources"
mkdir -p build/swift-module-cache
xcrun swiftc -O -swift-version 5 -module-cache-path build/swift-module-cache -target arm64-apple-macos14.0 native/Quota.swift native/PixelTerminal.swift -framework AppKit -framework WebKit -o "$app/Contents/MacOS/PixelCompanion"
cp index.html "$app/Contents/Resources/index.html"
cp native/AppIcon.icns "$app/Contents/Resources/AppIcon.icns"
cat > "$app/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleExecutable</key><string>PixelCompanion</string>
<key>CFBundleIdentifier</key><string>local.jingyan.codex-pixel-companion</string>
<key>CFBundleName</key><string>Codex 小幽灵</string>
<key>CFBundleDisplayName</key><string>Codex 小幽灵</string>
<key>CFBundleIconFile</key><string>AppIcon</string>
<key>CFBundlePackageType</key><string>APPL</string>
<key>CFBundleShortVersionString</key><string>1.0.0</string>
<key>CFBundleVersion</key><string>12</string>
<key>LSMinimumSystemVersion</key><string>14.0</string>
<key>NSHighResolutionCapable</key><true/>
<key>NSSupportsAutomaticGraphicsSwitching</key><true/>
</dict></plist>
PLIST
codesign --force --sign - "$app"
codesign --verify --strict "$app"
echo "$PWD/$app"
