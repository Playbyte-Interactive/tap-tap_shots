type AudioWindow = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};

let audioCtx: AudioContext | null = null;
let isMuted = false;
let lastBounceSoundAt = -Infinity;
let activeToneCount = 0;
let idleSuspendTimer: number | null = null;

function clearIdleSuspendTimer() {
  if (idleSuspendTimer === null) return;
  window.clearTimeout(idleSuspendTimer);
  idleSuspendTimer = null;
}

function scheduleIdleSuspend() {
  if (!audioCtx || activeToneCount > 0) return;
  clearIdleSuspendTimer();
  idleSuspendTimer = window.setTimeout(() => {
    idleSuspendTimer = null;
    if (audioCtx && audioCtx.state === "running" && activeToneCount === 0) {
      void audioCtx.suspend();
    }
  }, 450);
}

function initAudio() {
  clearIdleSuspendTimer();
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
  activeToneCount += 1;
  oscillator.onended = () => {
    activeToneCount = Math.max(0, activeToneCount - 1);
    oscillator.disconnect();
    gain.disconnect();
    scheduleIdleSuspend();
  };
  oscillator.start(t);
  oscillator.stop(t + duration + 0.03);
}

export function toggleTapMute() {
  isMuted = !isMuted;
  if (isMuted) {
    scheduleIdleSuspend();
  }
  return isMuted;
}

export function startTapMusic() {
  // No background audio: sound effects initialize the audio context on demand.
}

export function stopTapMusic() {
  scheduleIdleSuspend();
}

export function playButtonSound() {
  playTone(620, 0.06, { gain: 0.045, type: "triangle", endFrequency: 860 });
}

export function playTapSound() {
  playTone(360, 0.075, { gain: 0.11, type: "sine", endFrequency: 760 });
}

export function playRimBounceSound() {
  initAudio();
  if (!audioCtx || isMuted) return;
  if (audioCtx.currentTime - lastBounceSoundAt < 0.14) return;
  lastBounceSoundAt = audioCtx.currentTime;
  playTone(220, 0.075, { gain: 0.075, type: "triangle", endFrequency: 128 });
}

export function playNetSwishSound() {
  playTone(980, 0.12, { gain: 0.07, type: "sine", endFrequency: 1420 });
  playTone(1480, 0.16, { delay: 0.035, gain: 0.045, type: "triangle", endFrequency: 1980 });
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
  playTone(150, 0.34, { gain: 0.16, type: "triangle", endFrequency: 82 });
  playTone(92, 0.28, { delay: 0.08, gain: 0.1, type: "sine", endFrequency: 58 });
}
