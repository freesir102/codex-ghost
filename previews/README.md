# Five little moments — synthetic design review

Apple bite, shy kiss, sleepy yawn, little wave and playful eye squeeze
(both eyes squeeze inward). These eight-second loops use the actual embedded
production `pixelTerminal.renderMoment` renderer; no second character copy.

`node previews/render-moments.cjs` generates GIFs and side-by-side HTML under
`build/moments-preview/`. The GIF checks sample playback time after identical
frames are coalesced and verify actual action pixels, stable digits, return to
the ordinary renderer and reduced motion. All inputs are synthetic.

The App schedules a short compatible moment at 20 seconds after page startup,
then every four minutes. Apple/kiss use the low-quota posture; wave/eye squeeze
use the floating posture; nighttime floating also adds yawn. Unknown quota,
flag/celebration states and reduced motion do not start these moments. The App
menu can review all five explicitly and then returns to live quota.

This review tooling has no network, account read, native app hook or installer.
