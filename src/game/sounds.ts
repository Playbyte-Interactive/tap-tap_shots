type AudioWindow = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};

let audioCtx: AudioContext | null = null;
let isMuted = false;
let musicGain: GainNode | null = null;
let musicOscillators: OscillatorNode[] = [];
let musicTimers: number[] = [];
let beatIndex = 0;

function initAudio() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
    if (!AudioContextClass) return;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === "suspended") {
    void audioCtx.resume();
  }
}

function playTone(
  frequency: number,
  duration: number,
  options: {
    delay?: number;
    gain?: number;
    type?: OscillatorType;
    endFrequency?: number;
    destination?: AudioNode;
  } = {}
) {
  initAudio();
  if (!audioCtx || isMuted) return;

  const t = audioCtx.currentTime + (options.delay ?? 0);
  const oscillator = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  oscillator.type = options.type ?? "sine";
  oscillator.frequency.setValueAtTime(frequency, t);
  if (options.endFrequency) {
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, options.endFrequency), t + duration);
  }

  gain.gain.setValueAtTime(options.gain ?? 0.12, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

  oscillator.connect(gain);
  gain.connect(options.destination ?? audioCtx.destination);
  oscillator.start(t);
  oscillator.stop(t + duration + 0.03);
}

function playNoise(duration: number, gainValue: number, frequency: number) {
  initAudio();
  if (!audioCtx || isMuted) return;

  const ctx = audioCtx;
  const t = ctx.currentTime;
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }

  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  source.buffer = buffer;
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(frequency, t);
  filter.frequency.exponentialRampToValueAtTime(Math.max(100, frequency * 0.42), t + duration);
  gain.gain.setValueAtTime(gainValue, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start(t);
}

export function toggleTapMute() {
  isMuted = !isMuted;
  if (musicGain) {
    musicGain.gain.value = isMuted ? 0 : 0.052;
  }
  return isMuted;
}

export function startTapMusic() {
  initAudio();
  if (!audioCtx || musicGain) return;

  const ctx = audioCtx;
  musicGain = ctx.createGain();
  musicGain.gain.value = isMuted ? 0 : 0.052;
  musicGain.connect(ctx.destination);

  const padFilter = ctx.createBiquadFilter();
  padFilter.type = "lowpass";
  padFilter.frequency.value = 620;

  const pad = ctx.createOscillator();
  pad.type = "sawtooth";
  pad.frequency.value = 55;
  const padGain = ctx.createGain();
  padGain.gain.value = 0.22;
  pad.connect(padFilter);
  padFilter.connect(padGain);
  padGain.connect(musicGain);
  pad.start();
  musicOscillators.push(pad);

  const notes = [220, 277.18, 329.63, 277.18, 246.94, 329.63, 392, 329.63];
  const playBeat = () => {
    if (!audioCtx || !musicGain || isMuted) {
      beatIndex += 1;
      return;
    }
    const note = notes[beatIndex % notes.length];
    playTone(note, 0.13, {
      gain: 0.026,
      type: "triangle",
      endFrequency: note * 1.01,
      destination: musicGain,
    });
    if (beatIndex % 4 === 0) {
      playTone(82.41, 0.18, {
        gain: 0.038,
        type: "sine",
        endFrequency: 55,
        destination: musicGain,
      });
    }
    beatIndex += 1;
  };

  playBeat();
  musicTimers.push(window.setInterval(playBeat, 255));
}

export function stopTapMusic() {
  musicTimers.forEach((timer) => window.clearInterval(timer));
  musicTimers = [];
  musicOscillators.forEach((oscillator) => {
    try {
      oscillator.stop();
    } catch {
      // Already stopped.
    }
    oscillator.disconnect();
  });
  musicOscillators = [];
  musicGain?.disconnect();
  musicGain = null;
}

export function playButtonSound() {
  playTone(620, 0.06, { gain: 0.045, type: "triangle", endFrequency: 860 });
}

export function playTapSound() {
  playTone(360, 0.075, { gain: 0.11, type: "sine", endFrequency: 760 });
  playNoise(0.045, 0.045, 1800);
}

export function playRimBounceSound() {
  playTone(170, 0.095, { gain: 0.18, type: "triangle", endFrequency: 82 });
  playNoise(0.06, 0.055, 700);
}

export function playNetSwishSound() {
  playNoise(0.18, 0.2, 3400);
}

export function playScoreSound(swishStreak: number, points: number) {
  const comboLift = Math.min(swishStreak, 6) * 42 + (points > 1 ? 58 : 0);
  playTone(540 + comboLift, 0.16, { gain: 0.14, type: "triangle", endFrequency: 760 + comboLift });
  playTone(810 + comboLift, 0.2, { delay: 0.055, gain: 0.09, type: "sine", endFrequency: 1120 + comboLift });
  if (swishStreak >= 2) {
    playTone(1280 + comboLift, 0.14, { delay: 0.11, gain: 0.075, type: "triangle", endFrequency: 1660 + comboLift });
  }
}

export function playBuzzerSound() {
  playTone(140, 0.52, { gain: 0.28, type: "sawtooth", endFrequency: 58 });
  playNoise(0.32, 0.12, 260);
}
