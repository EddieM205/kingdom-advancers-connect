/**
 * callSounds.js — Professional call sound effects via Web Audio API.
 *
 * All sounds are synthesized in-browser — no external files, no CDN dependency.
 * This is the same approach used by WhatsApp Web, Google Meet, and Telegram Web.
 *
 * Exports:
 *   ringIncoming1on1()       → stop fn   Melodic marimba ring (1-on-1 incoming)
 *   ringIncomingGroup()      → stop fn   Double-pulse vibrato ring (group incoming)
 *   ringOutgoing()           → stop fn   US ringback tone (1-on-1 caller)
 *   ringOutgoingGroup()      → stop fn   Triple-beep pattern (group call host waiting)
 *   playConnected()                      Ascending two-note chime (call answered)
 *   playHangup()                         Descending glide (call ended)
 *   playParticipantJoined()              Soft upward ding (group: someone joined)
 *   playParticipantLeft()                Soft downward ding (group: someone left)
 */

/* ── Shared AudioContext singleton ───────────────────────────── */
let _ctx = null;

function getCtx() {
  if (!_ctx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    try { _ctx = new Ctor(); } catch { return null; }
  }
  // Resume after browser autoplay suspension
  if (_ctx.state === 'suspended') _ctx.resume().catch(() => {});
  return _ctx;
}

/* ── Primitive: single sine tone with ADSR envelope ──────────── */
function sineTone(ctx, freq, at, duration, peakGain, attack = 0.01, release = 0.08) {
  if (!ctx || duration <= 0) return;
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.connect(env);
  env.connect(ctx.destination);
  osc.type = 'sine';
  osc.frequency.value = freq;
  const dec = Math.min(release, duration * 0.4);
  env.gain.setValueAtTime(0, at);
  env.gain.linearRampToValueAtTime(peakGain, at + attack);
  env.gain.setValueAtTime(peakGain, at + duration - dec);
  env.gain.linearRampToValueAtTime(0, at + duration);
  osc.start(at);
  osc.stop(at + duration + 0.02);
}

/* ── Marimba note: sine fundamental + two decaying partials ──── */
function marimbaNote(ctx, freq, at, gain = 0.22) {
  sineTone(ctx, freq,      at, 0.46, gain * 0.76, 0.005, 0.14);  // fundamental
  sineTone(ctx, freq * 4,  at, 0.18, gain * 0.14, 0.003, 0.05);  // 4th harmonic
  sineTone(ctx, freq * 10, at, 0.08, gain * 0.05, 0.002, 0.02);  // shimmer
}

/* ── Vibrato burst: oscillator with LFO on frequency ─────────── */
function vibratoTone(ctx, freq, at, duration, gain = 0.18, lfoRate = 6, lfoDepth = 12) {
  if (!ctx) return;
  const osc  = ctx.createOscillator();
  const env  = ctx.createGain();
  const lfo  = ctx.createOscillator();
  const lfog = ctx.createGain();
  osc.connect(env); env.connect(ctx.destination);
  lfo.connect(lfog); lfog.connect(osc.frequency);
  osc.type = 'sine'; osc.frequency.value = freq;
  lfo.type = 'sine'; lfo.frequency.value = lfoRate;
  lfog.gain.value = lfoDepth;
  const attack = 0.02; const release = 0.1;
  env.gain.setValueAtTime(0, at);
  env.gain.linearRampToValueAtTime(gain, at + attack);
  env.gain.setValueAtTime(gain, at + duration - release);
  env.gain.linearRampToValueAtTime(0, at + duration);
  lfo.start(at); lfo.stop(at + duration + 0.02);
  osc.start(at); osc.stop(at + duration + 0.02);
}

/* ── EXPORTED SOUNDS ─────────────────────────────────────────── */

/**
 * 1-on-1 INCOMING ring — iPhone-style marimba:
 * C5 → E5 → G5 ascending, played twice per ring event, then 2.2 s silence.
 */
export function ringIncoming1on1() {
  const ctx = getCtx();
  if (!ctx) return () => {};

  const NOTES = [523.25, 659.25, 783.99];   // C5, E5, G5
  const STEP  = 0.20;                        // seconds between notes
  const SEQ   = NOTES.length * STEP;         // one 3-note run duration
  const GAP   = 0.30;                        // gap between two runs
  const CYCLE = 2400;                        // ms: ring → silence cycle

  let stopped = false;
  let timer   = null;

  const ring = () => {
    if (stopped) return;
    const now = ctx.currentTime;
    for (let rep = 0; rep < 2; rep++) {
      NOTES.forEach((freq, i) => {
        marimbaNote(ctx, freq, now + rep * (SEQ + GAP) + i * STEP);
      });
    }
    timer = setTimeout(ring, CYCLE);
  };

  ring();
  return () => { stopped = true; clearTimeout(timer); };
}

/**
 * GROUP INCOMING ring — conference-style double pulse with vibrato:
 * Two 380 ms tones at 880 Hz separated by 200 ms, then 3 s silence.
 * Distinct from 1-on-1 so users immediately know the call type.
 */
export function ringIncomingGroup() {
  const ctx = getCtx();
  if (!ctx) return () => {};

  const CYCLE = 3200; // ms
  let stopped = false;
  let timer   = null;

  const ring = () => {
    if (stopped) return;
    const now = ctx.currentTime;
    vibratoTone(ctx, 880, now,        0.38, 0.19, 7, 14); // first pulse
    vibratoTone(ctx, 880, now + 0.58, 0.38, 0.19, 7, 14); // second pulse
    timer = setTimeout(ring, CYCLE);
  };

  ring();
  return () => { stopped = true; clearTimeout(timer); };
}

/**
 * OUTGOING ringback (1-on-1) — North American standard: 440 Hz + 480 Hz,
 * 2 s on / 4 s off. Softer gain — caller just needs to know it's ringing.
 */
export function ringOutgoing() {
  const ctx = getCtx();
  if (!ctx) return () => {};

  const ON  = 2000;
  const OFF = 4000;
  let stopped = false;
  let timer   = null;

  const ring = () => {
    if (stopped) return;
    const now = ctx.currentTime;
    sineTone(ctx, 440, now, 2.0, 0.07, 0.02, 0.1);
    sineTone(ctx, 480, now, 2.0, 0.07, 0.02, 0.1);
    timer = setTimeout(ring, ON + OFF);
  };

  ring();
  return () => { stopped = true; clearTimeout(timer); };
}

/**
 * OUTGOING ringback (group) — host waits for attendees:
 * Three ascending soft beeps every 3 s. Sounds like a conference room.
 */
export function ringOutgoingGroup() {
  const ctx = getCtx();
  if (!ctx) return () => {};

  const CYCLE = 3000;
  let stopped = false;
  let timer   = null;

  const ring = () => {
    if (stopped) return;
    const now = ctx.currentTime;
    sineTone(ctx, 440, now,        0.11, 0.08, 0.01, 0.04);
    sineTone(ctx, 520, now + 0.20, 0.11, 0.08, 0.01, 0.04);
    sineTone(ctx, 660, now + 0.40, 0.16, 0.09, 0.01, 0.06);
    timer = setTimeout(ring, CYCLE);
  };

  ring();
  return () => { stopped = true; clearTimeout(timer); };
}

/**
 * CONNECTED — quick two-note ascending chime (C5 → G5).
 * Plays once when call is answered.
 */
export function playConnected() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  sineTone(ctx, 523.25, now,        0.13, 0.18, 0.008, 0.06); // C5
  sineTone(ctx, 783.99, now + 0.11, 0.18, 0.20, 0.008, 0.08); // G5
}

/**
 * HANGUP — descending frequency glide 440 Hz → 220 Hz over 0.5 s.
 * Clean, universally understood "call ended" sound.
 */
export function playHangup() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.connect(env); env.connect(ctx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(440, now);
  osc.frequency.exponentialRampToValueAtTime(220, now + 0.45);
  env.gain.setValueAtTime(0.17, now);
  env.gain.linearRampToValueAtTime(0, now + 0.45);
  osc.start(now);
  osc.stop(now + 0.50);
}

/**
 * PARTICIPANT JOINED — soft upward two-note ping (E5 → A5).
 * Plays in group calls when someone enters.
 */
export function playParticipantJoined() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  sineTone(ctx, 659.25, now,        0.14, 0.13, 0.006, 0.08); // E5
  sineTone(ctx, 880,    now + 0.11, 0.20, 0.14, 0.006, 0.10); // A5
}

/**
 * PARTICIPANT LEFT — soft downward two-note ping (E5 → B4).
 * Plays in group calls when someone leaves.
 */
export function playParticipantLeft() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  sineTone(ctx, 659.25, now,        0.14, 0.11, 0.006, 0.08); // E5
  sineTone(ctx, 493.88, now + 0.11, 0.20, 0.11, 0.006, 0.10); // B4
}
