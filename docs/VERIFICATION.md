# Verification

Observed on 2026-10-02. Public source is based on the working `2026-10-02-native-r10` implementation.

## Real native device observations

Apple Silicon / macOS 26.7, native AppKit and WKWebView:

- Finder double-click of the installed developer app, native full screen on a small display, live weekly quota read: passed.
- Eight synthetic day/night states in the actual native WKWebView: 8/8 passed. Three fixed-time snapshots per state; changes occurred on the ghost and heart while the fixed number regions stayed unchanged.
- Pink heart pixel changes: 8/8. Sun-ray pixel changes in daytime: 4/4. Moon pixels remained unchanged at night: 4/4.
- Apple and alternating kiss expression in both low-quota states: observed. No cup or steam in any state.
- An earlier build verified minimizing/reopening, repeated launch as one process, normal quit and lock release. These lifecycle paths were not rerun as new device acceptance for this visual-only r10 change.

The public `index.html`, native Swift sources and icon are copied from the checked working implementation. The public build is separately compiled and signature-checked. Public-source synthetic checks run without account access; native screenshots and local account logs are not published.

## Automated scope

- `npm test`: runs the actual embedded renderer/frame callback. Covers quota thresholds, day/night boundaries, eight combinations, apple/kiss and removed accessories, four-ray geometry, heart pulse, reduced motion, and atomic rejection of invalid state inputs.
- `bash tests/quota.sh`: real Swift parser using synthetic weekly windows; tests floor rounding, zero/full quota, multiple buckets, wrong window/bucket, expired resets, invalid values and booleans.
- Build: native compilation, plist and ad-hoc signature validation.
- Asset tooling: fresh locked npm installation, offline `npm ci`, and the portable preview command passed. The synthetic GIF contains 19 optimized frames over 5.6 seconds; ghost/heart/sun pixels change while the fixed example numbers stay stable.
- GitHub Actions: reruns the synthetic source checks and native build. A CI build is not a Finder/device test or a notarized release.

## Not yet verified

Long sleep/lock cycles, display hot-plug re-positioning, native reduced-motion preference toggling, hidden-window reopening, sustained offline fault injection, Intel runtime, other macOS versions, and public notarized distribution.

The official Codex CLI/app-server interface can change. The application reports unknown quota on an unavailable/invalid response rather than estimating usage.
