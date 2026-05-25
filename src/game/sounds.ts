type AudioWindow = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};

let audioCtx: AudioContext | null = null;
let isMuted = false;
let lastBounceSoundAt = -Infinity;
let activeToneCount = 0;
let idleSuspendTimer: number | null = null;
type SoundGroup = "tap" | "bounce" | "score" | "swish" | "buzzer";
type ActiveTone = {
  oscillator: OscillatorNode;
  gain: GainNode;
  group?: SoundGroup;
  released: boolean;
};

const activeGroups = new Map<SoundGroup, Set<ActiveTone>>();

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

function releaseTone(tone: ActiveTone, fade = 0.018) {
  if (!audioCtx || tone.released) return;
  tone.released = true;
  const now = audioCtx.currentTime;
  tone.gain.gain.cancelScheduledValues(now);
  tone.gain.gain.setTargetAtTime(0.0001, now, Math.max(0.001, fade / 3));
  try {
    tone.oscillator.stop(now + fade + 0.01);
  } catch {
    // The oscillator may already have a natural stop scheduled.
  }
}

function stopSoundGroup(group: SoundGroup, fade = 0.018) {
  const tones = activeGroups.get(group);
  if (!tones) return;
  tones.forEach((tone) => releaseTone(tone, fade));
}

function stopGameplaySounds() {
  stopSoundGroup("tap", 0.012);
  stopSoundGroup("bounce", 0.012);
  stopSoundGroup("score", 0.018);
  stopSoundGroup("swish", 0.018);
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
    attack?: number;
    release?: number;
    group?: SoundGroup;
    replaceGroup?: boolean;
    type?: OscillatorType;
    endFrequency?: number;
    destination?: AudioNode;
  } = {}
) {
  initAudio();
  if (!audioCtx || isMuted) return;

  if (options.group && options.replaceGroup) {
    stopSoundGroup(options.group);
  }

  const t = audioCtx.currentTime + (options.delay ?? 0);
  const oscillator = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  oscillator.type = options.type ?? "sine";
  oscillator.frequency.setValueAtTime(frequency, t);
  if (options.endFrequency) {
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, options.endFrequency), t + duration);
  }

  const peakGain = options.gain ?? 0.12;
  const attack = Math.min(options.attack ?? 0.006, duration * 0.45);
  const releaseStart = Math.max(t + attack, t + duration - (options.release ?? 0.035));
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.linearRampToValueAtTime(peakGain, t + attack);
  gain.gain.setValueAtTime(peakGain, releaseStart);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

  oscillator.connect(gain);
  gain.connect(options.destination ?? audioCtx.destination);
  const activeTone: ActiveTone = { oscillator, gain, group: options.group, released: false };
  if (options.group) {
    let group = activeGroups.get(options.group);
    if (!group) {
      group = new Set();
      activeGroups.set(options.group, group);
    }
    group.add(activeTone);
  }
  activeToneCount += 1;
  oscillator.onended = () => {
    activeToneCount = Math.max(0, activeToneCount - 1);
    if (activeTone.group) {
      const group = activeGroups.get(activeTone.group);
      group?.delete(activeTone);
      if (group?.size === 0) {
        activeGroups.delete(activeTone.group);
      }
    }
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
    stopGameplaySounds();
    stopSoundGroup("buzzer", 0.012);
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
  playTone(360, 0.075, { gain: 0.095, group: "tap", replaceGroup: true, type: "sine", endFrequency: 760 });
}

export function playRimBounceSound() {
  initAudio();
  if (!audioCtx || isMuted) return;
  if (audioCtx.currentTime - lastBounceSoundAt < 0.18) return;
  lastBounceSoundAt = audioCtx.currentTime;
  playTone(220, 0.07, { gain: 0.06, group: "bounce", replaceGroup: true, type: "triangle", endFrequency: 128 });
}

export function playNetSwishSound() {
  stopSoundGroup("score", 0.016);
  playTone(900, 0.18, { gain: 0.045, attack: 0.018, release: 0.085, group: "swish", replaceGroup: true, type: "sine", endFrequency: 1320 });
  playTone(1320, 0.22, { delay: 0.03, gain: 0.026, attack: 0.02, release: 0.11, group: "swish", type: "sine", endFrequency: 1820 });
}

export function playScoreSound(swishStreak: number, points: number) {
  const comboLift = Math.min(swishStreak, 6) * 42 + (points > 1 ? 58 : 0);
  stopSoundGroup("swish", 0.014);
  playTone(540 + comboLift, 0.16, { gain: 0.11, group: "score", replaceGroup: true, type: "triangle", endFrequency: 760 + comboLift });
  playTone(810 + comboLift, 0.2, { delay: 0.055, gain: 0.075, group: "score", type: "sine", endFrequency: 1120 + comboLift });
  if (swishStreak >= 2) {
    playTone(1280 + comboLift, 0.14, { delay: 0.11, gain: 0.055, group: "score", type: "triangle", endFrequency: 1660 + comboLift });
  }
}

export function playBuzzerSound() {
  stopGameplaySounds();
  playTone(150, 0.34, { gain: 0.13, group: "buzzer", replaceGroup: true, type: "triangle", endFrequency: 82 });
  playTone(92, 0.28, { delay: 0.08, gain: 0.075, group: "buzzer", type: "sine", endFrequency: 58 });
}
