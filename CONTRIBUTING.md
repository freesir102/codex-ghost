# Contributing

Keep the terminal quiet and pixel based. Prefer a small, focused change over adding dashboard controls.

Please describe the behavior, your Mac architecture/macOS version, and how you tested it. Run `npm test`, and run `bash tests/quota.sh` when changing quota handling. Native window/build changes also need `bash build-app.sh` and a real local launch check.

Use synthetic screenshots and quota fixtures in issues/tests. Do not post account tokens, conversation content, full app-server replies, personal paths, or complete system logs. Treat account-read failures as unknown values.

UI assets are repo-native SVG/code. Preserve reduced motion and avoid remote rendering dependencies.
