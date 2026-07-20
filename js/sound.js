// Synthesized audio via WebAudio — no external files.
// Sound is ALWAYS on: it unlocks automatically on the first user gesture
// (browsers block audio before any interaction — this is a hard platform rule),
// then a looping ride ambience plays whose intensity follows the bike speed.

let ctx = null, master = null, started = false;
let drivingBuffer = null;
let drivingSource = null;
let drivingGainNode = null;
let isLoadingSound = false;

async function loadDrivingSound() {
  if (drivingBuffer || isLoadingSound) return;
  isLoadingSound = true;
  try {
    // mp3 is ~10x smaller than the wav; keep the wav as a fallback
    for (const url of ["/bycycle_driving_sound.mp3", "/bycycle_driving_sound.wav"]) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const arrayBuffer = await res.arrayBuffer();
        drivingBuffer = await ctx.decodeAudioData(arrayBuffer);
        break;
      } catch (e) { /* try the next format */ }
    }
    if (!drivingBuffer) console.error("Failed to load driving sound");
  } finally {
    isLoadingSound = false;
  }
}

function build() {
  if (ctx) return;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain();
  master.gain.value = 0.6;
  master.connect(ctx.destination);
  loadDrivingSound();
}

// call from a user gesture to satisfy autoplay policy
export function unlock() {
  build();
  if (ctx.state === "suspended") ctx.resume();
  started = true;
}
export function isStarted() { return started; }

// Modulate driving sound loop based on bicycle speed
export function setSpeed(v) {
  if (!ctx || !drivingBuffer) return;

  const threshold = 0.015;
  if (v > threshold) {
    // Start loop if not active
    if (!drivingSource) {
      drivingSource = ctx.createBufferSource();
      drivingSource.buffer = drivingBuffer;
      drivingSource.loop = true;

      drivingGainNode = ctx.createGain();
      drivingGainNode.gain.value = 0.001; // start tiny to fade in smoothly

      drivingSource.connect(drivingGainNode).connect(master);
      drivingSource.start(0);
    }

    // Modulate volume and playback rate (pitch) with bicycle speed
    const targetGain = Math.min(0.9, v * 1.6);
    const targetPlayback = 0.6 + v * 0.8;

    drivingGainNode.gain.setTargetAtTime(targetGain, ctx.currentTime, 0.1);
    drivingSource.playbackRate.setTargetAtTime(targetPlayback, ctx.currentTime, 0.1);
  } else {
    // Fade out and stop the sound
    if (drivingSource) {
      const src = drivingSource;
      const gainNode = drivingGainNode;

      drivingSource = null;
      drivingGainNode = null;

      if (gainNode) {
        gainNode.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
        setTimeout(() => {
          try { src.stop(); } catch(e){}
        }, 300);
      } else {
        try { src.stop(); } catch(e){}
      }
    }
  }
}

export function stopDrivingSound() {
  if (drivingSource) {
    try { drivingSource.stop(); } catch(e){}
    drivingSource = null;
    drivingGainNode = null;
  }
}

// short blip helper
function blip({ f0 = 440, f1 = 220, dur = 0.09, type = "triangle", gain = 0.4 } = {}) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator(), g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f0, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(master);
  osc.start(t); osc.stop(t + dur + 0.02);
}

export function click()  { blip({ f0: 660, f1: 330, dur: 0.07, type: "square",  gain: 0.26 });
                           blip({ f0: 1200, f1: 600, dur: 0.05, type: "triangle", gain: 0.12 }); }
export function hover()  { blip({ f0: 880, f1: 760, dur: 0.045, type: "sine",    gain: 0.10 }); }
export function select() { blip({ f0: 300, f1: 620, dur: 0.16, type: "sawtooth", gain: 0.18 });
                           blip({ f0: 900, f1: 1300, dur: 0.12, type: "sine",    gain: 0.09 }); }
export function ping()   { blip({ f0: 1400, f1: 2100, dur: 0.14, type: "sine",   gain: 0.14 }); }
// bicycle bell
export function bell()   { blip({ f0: 2100, f1: 2100, dur: 0.5, type: "sine", gain: 0.18 });
                           blip({ f0: 2650, f1: 2600, dur: 0.5, type: "sine", gain: 0.10 }); }

export function play(name) {
  if (name === "hover") return hover();
  if (name === "select") return select();
  if (name === "ping") return ping();
  if (name === "bell") return bell();
  return click();
}
