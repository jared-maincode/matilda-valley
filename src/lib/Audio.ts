import { playerTelemetry } from "./playerState";
import { envState } from "./environmentState";

let ctx: AudioContext | null = null;
let windSource: { stop: () => void } | null = null;
let paused = false;
let ambientCancelled = false;
let ambientStarted = false;
const pendingTones = new Set<ReturnType<typeof setTimeout>>();

function getCtx(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
  }
  if (ctx.state === "suspended" && !paused) {
    void ctx.resume();
  }
  return ctx;
}

type Wave = OscillatorType;

function playTone(
  freq: number,
  duration: number,
  type: Wave = "sine",
  gain = 0.15,
  attack = 0.01,
  release = 0.1,
) {
  const ac = getCtx();
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.connect(g);
  g.connect(ac.destination);
  const now = ac.currentTime;
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(gain, now + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.start(now);
  osc.stop(now + duration + release);
}

// Pentatonic C scale: C D E G A C
const PENTATONIC = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25];

export const Audio = {
  init() {
    getCtx();
    Audio.startWind();
    Audio.startAmbient();
  },

  suspend() {
    paused = true;
    pendingTones.forEach((t) => {
      clearTimeout(t);
      pendingTones.delete(t);
    });
    if (ctx?.state === "running") void ctx.suspend();
  },

  resume() {
    paused = false;
    if (ctx?.state === "suspended") void ctx.resume();
  },

  startAmbient() {
    if (ambientStarted) return;
    ambientStarted = true;
    ambientCancelled = false;

    const chirp = () => {
      if (ambientCancelled) return;
      if (!paused) {
        const dayVol = 0.03 * Math.max(envState.dayness, 0.1);
        const ac = getCtx();
        const osc = ac.createOscillator();
        const g = ac.createGain();
        osc.type = "sine";
        const startFreq = 2000 + Math.random() * 2000;
        const endFreq = startFreq + (Math.random() - 0.3) * 800;
        osc.frequency.setValueAtTime(startFreq, ac.currentTime);
        osc.frequency.exponentialRampToValueAtTime(endFreq, ac.currentTime + 0.08);
        g.gain.setValueAtTime(0, ac.currentTime);
        g.gain.linearRampToValueAtTime(dayVol, ac.currentTime + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.12);
        osc.connect(g);
        g.connect(ac.destination);
        osc.start();
        osc.stop(ac.currentTime + 0.15);
      }
      const interval = envState.dayness > 0.5 ? 3000 + Math.random() * 5000 : 8000 + Math.random() * 12000;
      setTimeout(chirp, interval);
    };
    setTimeout(chirp, 2000 + Math.random() * 3000);

    const waterLap = () => {
      if (ambientCancelled) return;
      if (!paused && !playerTelemetry.isInWater) {
        const ac = getCtx();
        const bufferSize = Math.floor(ac.sampleRate * 0.3);
        const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize) * 0.5;
        }
        const source = ac.createBufferSource();
        source.buffer = buffer;
        const filter = ac.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 300;
        const g = ac.createGain();
        g.gain.value = 0.02;
        source.connect(filter);
        filter.connect(g);
        g.connect(ac.destination);
        source.start();
      }
      setTimeout(waterLap, 4000 + Math.random() * 6000);
    };
    setTimeout(waterLap, 5000);

    const cricket = () => {
      if (ambientCancelled) return;
      if (!paused) {
        const nightVol = 0.015 * (1 - envState.dayness);
        if (nightVol > 0.001) {
          const ac = getCtx();
          const osc = ac.createOscillator();
          const g = ac.createGain();
          osc.type = "square";
          const baseFreq = 4000 + Math.random() * 500;
          osc.frequency.setValueAtTime(baseFreq, ac.currentTime);
          osc.frequency.setValueAtTime(baseFreq + 200, ac.currentTime + 0.03);
          osc.frequency.setValueAtTime(baseFreq, ac.currentTime + 0.06);
          g.gain.setValueAtTime(0, ac.currentTime);
          g.gain.linearRampToValueAtTime(nightVol, ac.currentTime + 0.005);
          g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.08);
          osc.connect(g);
          g.connect(ac.destination);
          osc.start();
          osc.stop(ac.currentTime + 0.1);
        }
      }
      setTimeout(cricket, 400 + Math.random() * 1500);
    };
    setTimeout(cricket, 3000);
  },

  stopAmbient() {
    ambientCancelled = true;
    ambientStarted = false;
  },

  startWind() {
    if (windSource) return;
    const ac = getCtx();
    const bufferSize = ac.sampleRate * 2;
    const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }
    const source = ac.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = ac.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 400;
    filter.Q.value = 0.5;
    const gain = ac.createGain();
    gain.gain.value = 0.015;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ac.destination);
    source.start();
    windSource = {
      stop: () => {
        source.stop();
        windSource = null;
      },
    };
  },

  interact() {
    playTone(880, 0.08, "sine", 0.08, 0.005, 0.05);
  },

  hover() {
    playTone(660, 0.04, "sine", 0.04, 0.002, 0.03);
  },

  correct() {
    playTone(523.25, 0.15, "sine", 0.12);
    const id = setTimeout(() => {
      pendingTones.delete(id);
      playTone(659.25, 0.2, "sine", 0.12);
    }, 80);
    pendingTones.add(id);
  },

  wrong() {
    playTone(180, 0.25, "sawtooth", 0.1, 0.01, 0.15);
  },

  shardRestored() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      const id = setTimeout(() => {
        pendingTones.delete(id);
        playTone(f, 0.4, "sine", 0.14, 0.01, 0.2);
      }, i * 100);
      pendingTones.add(id);
    });
  },

  forkTone(index: number) {
    const freq = PENTATONIC[index % PENTATONIC.length];
    playTone(freq, 0.5, "sine", 0.18, 0.02, 0.3);
  },

  beam() {
    playTone(440, 0.03, "square", 0.04, 0.001, 0.02);
  },

  glyphTone(index: number) {
    const freq = PENTATONIC[index % PENTATONIC.length] * 1.5;
    playTone(freq, 0.3, "triangle", 0.14, 0.01, 0.2);
  },

  win() {
    [261.63, 329.63, 392.0, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      const id = setTimeout(() => {
        pendingTones.delete(id);
        playTone(f, 0.6, "sine", 0.16, 0.02, 0.3);
      }, i * 120);
      pendingTones.add(id);
    });
  },

  step(surface: "grass" | "sand" | "rock" | "water" = "grass") {
    if (surface === "water") {
      Audio.wade();
      return;
    }
    if (surface === "sand") {
      playTone(120, 0.05, "sine", 0.04, 0.001, 0.04);
      return;
    }
    if (surface === "rock") {
      playTone(60, 0.03, "square", 0.04, 0.001, 0.02);
      return;
    }
    playTone(80, 0.04, "square", 0.03, 0.001, 0.03);
  },

  wade() {
    const ac = getCtx();
    const bufferSize = Math.floor(ac.sampleRate * 0.15);
    const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const source = ac.createBufferSource();
    source.buffer = buffer;
    const filter = ac.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 150;
    const gain = ac.createGain();
    gain.gain.value = 0.06;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ac.destination);
    source.start();
  },
};
