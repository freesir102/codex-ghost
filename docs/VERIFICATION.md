# Verification

## PR review follow-up — preview handoff, 2026-10-02

The first connected Codex Cloud review of `9dda8b0` completed and reported a
[P2 preview/automatic-window overlap](https://github.com/freesir102/codex-ghost/pull/1#discussion_r4166595460).
The reported case was reproduced through the actual shipped frame callback:
a preview beginning at page time 14 seconds incorrectly handed off to an
automatic apple bite at 22 seconds. The new regression failed at that checkpoint
before the implementation changed; it passes after the fix.

Preview expiry, explicit stop, incompatible posture and reduced-motion
cancellation now leave the overlapping automatic window quiet. The next cycle
retains its original phase and selection. Regression checks cover expiry at the
start, middle and late part of both the first and following automatic windows,
plus cancellation and subsequent automatic resumption. `npm test` passes on
local Node 26.7.0, including the unchanged eight-state rendering suite.

The renderer identifies these working bytes as
`2026-10-02-moments-r12-review1`. The installed native r12 below has not been
replaced or revalidated for this follow-up. New-head GitHub checks and connected
review results belong to [PR #1](https://github.com/freesir102/codex-ghost/pull/1).
CI now uses the Node24-compatible checkout/setup-node v7 actions, preserves
project Node22 and the existing test/build commands, and explicitly disables
automatic package-manager caching. No account/quota code changed.

## Current r12 — five little moments, 2026-10-02

Build `2026-10-02-native-r12` integrates the approved apple bite, shy kiss,
sleepy yawn, little wave and simultaneous inward eye squeeze (`> <`) into the
self-contained bundled HTML. No additional renderer runtime or network resource.

- The actual frame callback dispatches short compatible moments after 20 seconds,
  then every 240 seconds, with quiet periods and exact ordinary phase restoration.
- New synthetic tests pass through that callback for all five automatic and
  explicit preview paths, fixed digits/accessories, state refresh, atomic rejection,
  unknown/incompatible posture, daytime yawn refusal and live reduced-motion changes.
- Generated GIF action pixels, eight-second playback durations and the standalone
  review page callback pass. Static renders were visually inspected.
- Native arm64 compilation, bundle resource/source matching, plist, strict ad-hoc
  signature and system-only dynamic library checks pass.
- The installed r12 was launched by a real Finder double-click at
  2026-10-02T13:27:41Z, on Wokyis in native full screen. Loaded HTML and executable
  hashes matched the actual working source/build. One instance held its lock.
- Real WKWebView five-moment checks completed at 2026-10-02T13:28:36Z. Native
  snapshots verified the apple bite and restoration, enlarged kiss heart, wider
  yawn mouth, moving existing arm and both inward eye chevrons. All five returned
  to the ordinary pose, with fixed date and number pixels unchanged.
- All eight existing day/night states completed at 2026-10-02T13:30:53Z. Actual
  ghost and both frame regions changed while the digit interiors stayed fixed.
  The app returned to live quota, with repeated fresh automatic reads observed.
- The prior r11 was normally quit before installation. An extracted r11 rollback
  passed file hashes, restored permissions and strict signature verification.
  Duplicate expanded old bundles were retired after those checks. No account
  data, runtime logs or native personal screenshots are included in public source.
- Occasional scheduling and preference-change guards were verified through the
  actual synthetic frame callback; real native action observations used the
  explicit menu preview. This does not claim a long-duration native cadence or
  native system-preference-toggle test. Quota parsing remains unchanged.

The r11 observations below retain their original time and implementation identity.

## Historical r11 — flowing frame, 2026-10-02

Build `2026-10-02-native-r11` uses cyan dash-dot frames moving clockwise on
an explicit 2px grid. The native build was installed and launched by a real
Finder double-click on Apple Silicon / macOS 26.7. The bundled interface and
executable match this source build; native full screen on Wokyis, one process,
the held instance lock and return to live quota were observed.

- Actual renderer/frame callback tests pass: both frame components receive the
  animation time, the closed-loop cycle repeats, cells stay inside each box and
  outside the number area, and fixed date/time/quota pixels do not move.
- All eight ghost states and existing positive/negative input checks still pass.
- Reduced motion freezes the complete renderer, including both frames.
- The generated synthetic GIF has 56 frames over 5.6 seconds. Actual cyan pixel
  changes were checked independently in both boxes; both digit interiors stayed
  identical across all frames. A static render was visually inspected.
- Native WKWebView observation completed at 2026-10-02T10:11:20Z. Three actual
  native snapshots per day/night state: both cyan frames moved in 8/8 states;
  both digit interiors stayed unchanged in 8/8. Ghost and heart changed in 8/8,
  daytime sun changed in 4/4 and nighttime moon stayed unchanged in 4/4.
- All eight state readbacks matched. The installed app returned to live quota
  after the synthetic check. No local account logs or observations are uploaded.
- The prior build was normally quit and its lock release checked before
  installation. Obsolete expanded r10 app copies were removed after a scoped
  recovery archive was extracted, permissions restored and signature verified.
  This r11 change leaves the quota reader and account settings unchanged.

The observations below belong to the prior r10 implementation. They are retained
as history and do not substitute for new r11 device tests.

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
