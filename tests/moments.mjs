import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

// Exercise the shipped, self-contained page through its real frame callback.
// All state, time and motion-preference inputs are synthetic.
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
assert.doesNotMatch(html, /<script[^>]*\bsrc=|<script[^>]*\btype=["']module["']/i);
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script, 'the installed page must contain its renderer');
const copy = value => JSON.parse(JSON.stringify(value));
const stateFor = (progress, time = '13:41') => ({progress, date:'2026-10-2', time});
const digits = svg => [...svg.matchAll(/<g data-component="digits">(.*?)<\/g>/g)].map(match => match[1]);
const action = svg => svg.match(/data-moment="([^"]+)"/)?.[1] ?? null;
const stage = svg => svg.match(/data-moment-stage="([^"]+)"/)?.[1] ?? 'idle';
const redPixels = svg => (svg.match(/fill="#ef4545"/g) ?? []).length;

function harness({reduced = false, changeEvents = true} = {}) {
  let milliseconds = 0, callback;
  const epoch = new Date(2026, 9, 2, 13, 41).getTime();
  class ClockDate extends Date {
    constructor(...args) { super(...(args.length ? args : [epoch + milliseconds])); }
    static now() { return epoch + milliseconds; }
  }
  const element = {innerHTML:''}, listeners = new Set();
  const preference = {matches:reduced};
  if (changeEvents) preference.addEventListener = (name, listener) => {
    assert.equal(name, 'change'); listeners.add(listener);
  };
  const context = {
    Date:ClockDate, window:{}, performance:{now:() => milliseconds},
    document:{getElementById:id => {assert.equal(id, 'terminal'); return element;}},
    matchMedia:query => {assert.equal(query, '(prefers-reduced-motion: reduce)'); return preference;},
    requestAnimationFrame:fn => {callback = fn;}
  };
  vm.createContext(context); vm.runInContext(script, context);
  const api = context.window.pixelTerminal;
  for (const name of ['render', 'renderMoment', 'setState', 'getState', 'startMomentPreview', 'stopMomentPreview', 'getMomentStatus']) {
    assert.equal(typeof api[name], 'function', `missing production API ${name}`);
  }
  return {
    api, get milliseconds() {return milliseconds;}, get reduced() {return preference.matches;},
    get svg() {return element.innerHTML;}, now:() => new ClockDate(),
    status:() => copy(api.getMomentStatus()),
    step(next) {
      assert.ok(next >= milliseconds, 'each fixture clock moves forward');
      milliseconds = next; assert.equal(typeof callback, 'function'); callback(next);
      return element.innerHTML;
    },
    setReduced(next) {
      assert.ok(changeEvents, 'this fixture supports preference changes');
      assert.ok(listeners.size, 'the real page must subscribe to preference changes');
      preference.matches = next; for (const listener of listeners) listener({matches:next});
    }
  };
}

function assertReadback(h, source) {
  const status = h.status();
  assert.equal(status.kind, action(h.svg), 'status kind describes the actual callback SVG');
  assert.equal(status.stage, stage(h.svg), 'status stage describes the actual callback SVG');
  assert.equal(status.source, source);
  const changed = h.api.getMomentStatus(); changed.kind = 'external mutation';
  assert.deepEqual(h.status(), status, 'status readback must be a copy');
}
function assertOrdinary(h, label) {
  assert.equal(action(h.svg), null, label);
  assert.equal(h.svg, h.api.render(h.api.getState(), h.milliseconds / 1000, h.reduced, h.now()),
    `${label}: restore the ordinary character and animation phase`);
  assertReadback(h, 'ordinary');
}
function assertActive(h, expected, source, expectedDigits) {
  assert.equal(action(h.svg), expected);
  assertReadback(h, source);
  assert.deepEqual(digits(h.svg), expectedDigits, 'actions do not change date, quota or time digits');
  assert.equal((h.svg.match(/data-accessory="heart"/g) ?? []).length, 1);
  assert.equal((h.svg.match(/data-accessory="apple"/g) ?? []).length, h.api.getState().progress < 50 ? 1 : 0);
  assert.doesNotMatch(h.svg, /data-accessory="(?:cup|steam)"|#71c97a/);
  assert.equal((h.svg.match(/<g(?: |>|$)/g) ?? []).length, (h.svg.match(/<\/g>/g) ?? []).length);
}
function assertActionPixels(h, kind) {
  if (kind === 'apple-bite') {
    assert.ok(redPixels(h.svg) < redPixels(h.api.render(h.api.getState(), 0)), 'bite removes actual apple pixels');
    assert.match(h.svg, /data-moment-bite="true"/);
  } else if (kind === 'shy-kiss') {
    assert.match(h.svg, /data-moment-face="kiss"/);
    assert.match(h.svg, /data-moment-heart-lift="[1-9]\d*"/);
    assert.match(h.svg, /width="14" height="14" fill="#ff789c"/);
  } else if (kind === 'sleepy-yawn') {
    assert.match(h.svg, /data-moment-face="yawn"/);
    assert.match(h.svg, /data-accessory="sleep-cap"/);
    assert.match(h.svg, /x="15" y="15" width="2" height="1" fill="#ff789c"/);
  } else if (kind === 'little-wave') {
    assert.match(h.svg, /data-moment-arm="[12]" transform="translate\(0 -[12]\)"/);
  } else {
    assert.equal(stage(h.svg), 'squeeze');
    const face = h.svg.match(/<g data-moment-face="squeeze">([\s\S]*?)<\/g>/)?.[1];
    assert.ok(face);
    const eyePixels = [...face.matchAll(/<rect x="(\d+)" y="(\d+)" width="1" height="1" fill="#000000"\/>/g)]
      .map(match => match.slice(1).map(Number))
      .filter(([x, y]) => y >= 8 && y <= 12 && ((x >= 9 && x <= 11) || (x >= 19 && x <= 21)))
      .map(point => point.join(',')).sort();
    assert.deepEqual(eyePixels, ['9,8','10,9','11,10','10,11','9,12','21,8','20,9','19,10','20,11','21,12'].sort(),
      'both squeezed eyes must simultaneously point inward: > <');
  }
}

// Automatic windows follow the real page clock, with quiet periods in between.
const seen = new Set();
for (const [progress, time, expected] of [
  [30, '13:41', ['apple-bite','shy-kiss']],
  [65, '13:41', ['little-wave','playful-wink']],
  [65, '23:41', ['sleepy-yawn','little-wave','playful-wink']]
]) {
  const h = harness(), state = stateFor(progress, time); h.api.setState(state);
  const fixedDigits = digits(h.api.render(state));
  h.step(0); assertOrdinary(h, 'initial quiet state');
  for (let cycle = 0; cycle < expected.length; cycle++) {
    const start = 20_000 + cycle * 240_000;
    for (const ms of [start - 100, start, start + 900]) {h.step(ms); assertOrdinary(h, 'before the active part of a window');}
    h.step(start + 2_500); assertActive(h, expected[cycle], 'automatic', fixedDigits);
    assertActionPixels(h, expected[cycle]); seen.add(action(h.svg));
    const status = h.status();
    assert.equal(action(h.api.render(state, (start + 2_500) / 1000)), null, 'ordinary render does not dispatch actions');
    h.api.renderMoment(state, expected[cycle], 2.5); assert.deepEqual(h.status(), status, 'explicit renders do not change callback readback');
    h.api.setState(state); h.step(start + 2_600);
    assertActive(h, expected[cycle], 'automatic', fixedDigits); assert.equal(stage(h.svg), status.stage, 'same-state refresh does not restart the action');
    h.step(start + 5_900); assertActive(h, expected[cycle], 'automatic', fixedDigits);
    for (const ms of [start + 6_000, start + 6_500, start + 8_000, start + 120_000]) {h.step(ms); assertOrdinary(h, 'action ends and stays quiet');}
  }
  assert.deepEqual(copy(h.api.getState()), state, 'animation does not mutate supplied state');
}
assert.deepEqual([...seen].sort(), ['apple-bite','shy-kiss','sleepy-yawn','little-wave','playful-wink'].sort());

// Unknown, flag and celebration postures refuse new automatic/manual actions.
for (const progress of [null, 80, 99, 100]) {
  const h = harness(); h.api.setState(stateFor(progress)); h.step(22_500); assertOrdinary(h, 'ineligible posture');
  const status = h.status(), state = copy(h.api.getState());
  for (const kind of seen) {
    assert.throws(() => h.api.startMomentPreview(kind));
    assert.equal(action(h.api.renderMoment(state, kind, 2.5)), null);
    assert.deepEqual(h.status(), status); assert.deepEqual(copy(h.api.getState()), state);
  }
}
for (const [progress, time, kind] of [[30,'13:41','little-wave'],[65,'13:41','apple-bite'],[65,'13:41','shy-kiss'],[65,'13:41','sleepy-yawn']]) {
  const h = harness(); h.api.setState(stateFor(progress, time)); h.step(0);
  assert.throws(() => h.api.startMomentPreview(kind)); assertOrdinary(h, 'cross-posture/daytime refusal');
  assert.equal(action(h.api.renderMoment(h.api.getState(), kind, 2.5)), null);
}
for (const [time, allowed] of [['06:59',true],['07:00',false],['19:59',false],['20:00',true]]) {
  const h = harness(); h.api.setState(stateFor(65, time));
  assert.equal(action(h.api.renderMoment(h.api.getState(), 'sleepy-yawn', 2.5)), allowed ? 'sleepy-yawn' : null);
  if (allowed) {h.api.startMomentPreview('sleepy-yawn'); h.step(2_500); assert.equal(action(h.svg), 'sleepy-yawn');}
  else assert.throws(() => h.api.startMomentPreview('sleepy-yawn'));
}

// Preview time begins at performance.now, runs once, then releases the page.
for (const [kind, progress, time] of [['apple-bite',30,'13:41'],['shy-kiss',30,'13:41'],['sleepy-yawn',65,'23:41'],['little-wave',65,'13:41'],['playful-wink',65,'13:41']]) {
  const h = harness(); h.api.setState(stateFor(progress, time)); h.step(1_000);
  const status = h.status(), fixedDigits = digits(h.svg); h.api.startMomentPreview(kind);
  assert.deepEqual(h.status(), status, 'starting a preview does not invent a callback result');
  h.step(1_100); assertOrdinary(h, 'preview leading quiet interval');
  h.step(3_500); assertActive(h, kind, 'preview', fixedDigits); assertActionPixels(h, kind);
  const activeStatus = h.status(); h.api.setState(h.api.getState()); h.step(3_600);
  assertActive(h, kind, 'preview', fixedDigits); assert.equal(stage(h.svg), activeStatus.stage, 'same-state refresh preserves preview elapsed time');
  for (const ms of [7_000, 7_500, 9_000, 11_500]) {h.step(ms); assertOrdinary(h, 'preview returns and never loops');}
}
{
  const h = harness(); h.api.setState(stateFor(30)); h.step(1_000); h.api.startMomentPreview('apple-bite'); h.step(3_500);
  const status = h.status(), state = copy(h.api.getState());
  for (const bad of ['unknown','little-wave']) {
    assert.throws(() => h.api.startMomentPreview(bad)); assert.deepEqual(h.status(), status); assert.deepEqual(copy(h.api.getState()), state);
  }
  h.step(3_600); assert.equal(action(h.svg), 'apple-bite'); assert.equal(stage(h.svg), 'chew', 'failed requests must not restart or replace the active preview');
  const beforeStop = h.status(); h.api.stopMomentPreview(); assert.deepEqual(h.status(), beforeStop);
  h.step(3_700); assertOrdinary(h, 'explicit stop');
}
for (const next of [stateFor(null), stateFor(65)]) {
  const h = harness(); h.api.setState(stateFor(30)); h.step(1_000); h.api.startMomentPreview('apple-bite'); h.step(3_500);
  h.api.setState(next); h.step(3_600); assertOrdinary(h, 'posture change cancels incompatible preview');
  h.api.setState(stateFor(30)); h.step(3_700); assertOrdinary(h, 'cancelled preview cannot revive');
}
{
  const h = harness(); h.api.setState(stateFor(65,'23:41')); h.step(1_000); h.api.startMomentPreview('sleepy-yawn'); h.step(3_500);
  h.api.setState({time:'07:00'}); h.step(3_600); assertOrdinary(h, 'sunrise cancels a yawn');
  h.api.setState({time:'23:41'}); h.step(3_700); assertOrdinary(h, 'cancelled night preview cannot revive');
}

// Initial reduction and live preference changes freeze all motion and cancel previews.
for (const changeEvents of [true, false]) {
  const h = harness({reduced:true, changeEvents}); h.api.setState(stateFor(30)); h.step(0);
  const frozen = h.svg; h.api.startMomentPreview('apple-bite');
  for (const ms of [2_500,22_500,262_500]) {h.step(ms); assertOrdinary(h, 'reduced motion'); assert.equal(h.svg, frozen);}
  for (const kind of seen) assert.equal(action(h.api.renderMoment(stateFor(kind === 'apple-bite' || kind === 'shy-kiss' ? 30 : 65,'23:41'),kind,2.5,true)), null);
}
{
  const h = harness(); h.api.setState(stateFor(30)); h.step(1_000); h.api.startMomentPreview('apple-bite'); h.step(3_500);
  h.setReduced(true); h.step(3_600); assertOrdinary(h, 'runtime reduction cancels preview');
  const frozen = h.svg; h.step(4_600); assert.equal(h.svg, frozen);
  h.setReduced(false); h.step(4_700); assertOrdinary(h, 'reenabling motion does not revive preview');
  h.step(22_500); assert.equal(action(h.svg), 'apple-bite'); assertReadback(h, 'automatic');
  h.setReduced(true); h.step(22_600); assertOrdinary(h, 'runtime reduction bypasses automatic moments');
}
{
  const h = harness(); h.api.setState(stateFor(30)); h.step(0); const before = h.status();
  assert.throws(() => h.api.startMomentPreview('unknown'));
  for (const elapsed of [-1, NaN, Infinity]) assert.throws(() => h.api.renderMoment(h.api.getState(),'apple-bite',elapsed));
  assert.throws(() => h.api.renderMoment(h.api.getState(),'unknown',2.5));
  assert.deepEqual(h.status(), before);
}

console.log('PASS: embedded real rAF dispatch, all five automatic and manual actions, 20s/240s quiet cadence, action pixels, inward > < eyes, stable digits, ordinary phase return, state refresh, atomic refusal, day/night guards, bounded previews, initial/runtime reduced motion and callback status');
