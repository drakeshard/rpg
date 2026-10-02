export type Sound =
  | "swing"
  | "hit"
  | "hurt"
  | "dash"
  | "footstep"
  | "enemyWindup"
  | "enemyStrike"
  | "enemyHurt"
  | "enemyDeath"
  | "loot"
  | "equipment"
  | "potion"
  | "chest"
  | "interact"
  | "objective"
  | "uiOpen"
  | "uiClose"
  | "uiSelect"
  | "skillArc"
  | "skillAegis"
  | "skillWind"
  | "skillUnlock"
  | "rankUp"
  | "questComplete";

export function createAudio() {
  let context: AudioContext | null = null;
  let masterNode: GainNode | null = null;
  let sfxNode: GainNode | null = null;
  let dryNode: GainNode | null = null;
  let ambienceNode: GainNode | null = null;
  let reverbNode: ConvolverNode | null = null;
  let reverbGain: GainNode | null = null;
  let noiseBuffer: AudioBuffer | null = null;
  let master = 0.42;
  let sfx = 0.62;
  let muted = false;

  function applyVolume() {
    if (!context || !masterNode || !sfxNode || !ambienceNode) return;
    masterNode.gain.setTargetAtTime(muted ? 0 : master, context.currentTime, 0.015);
    sfxNode.gain.setTargetAtTime(sfx, context.currentTime, 0.015);
    ambienceNode.gain.setTargetAtTime(sfx * 0.32, context.currentTime, 0.02);
  }

  function makeNoiseBuffer(ctx: AudioContext, seconds: number) {
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let seed = 0x71513;
    for (let i = 0; i < length; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      data[i] = (seed / 0xffffffff) * 2 - 1;
    }
    return buffer;
  }

  function makeImpulse(ctx: AudioContext, seconds: number) {
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      let seed = 0x91a7 + channel * 97;
      for (let i = 0; i < length; i++) {
        seed = (seed * 1103515245 + 12345) >>> 0;
        const noise = (seed / 0xffffffff) * 2 - 1;
        data[i] = noise * Math.pow(1 - i / length, 3.4);
      }
    }
    return buffer;
  }

  function unlock() {
    if (!context) {
      context = new AudioContext();
      masterNode = context.createGain();
      sfxNode = context.createGain();
      dryNode = context.createGain();
      ambienceNode = context.createGain();
      reverbNode = context.createConvolver();
      reverbGain = context.createGain();
      noiseBuffer = makeNoiseBuffer(context, 0.55);
      reverbNode.buffer = makeImpulse(context, 0.7);
      reverbGain.gain.value = 0.18;

      sfxNode.connect(dryNode).connect(masterNode);
      sfxNode.connect(reverbNode).connect(reverbGain).connect(masterNode);
      ambienceNode.connect(masterNode);
      masterNode.connect(context.destination);
      applyVolume();
    }
    if (context.state === "suspended") void context.resume();
  }

  function tone(
    start: number,
    end: number,
    duration: number,
    volume: number,
    type: OscillatorType = "sine",
    delay = 0,
    detune = 0,
  ) {
    if (!context || !sfxNode || context.state !== "running") return;
    const at = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = type;
    oscillator.detune.value = detune;
    oscillator.frequency.setValueAtTime(Math.max(30, start), at);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, end), at + duration);
    envelope.gain.setValueAtTime(0.0001, at);
    envelope.gain.exponentialRampToValueAtTime(volume, at + Math.min(0.018, duration * 0.22));
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    oscillator.connect(envelope).connect(sfxNode);
    oscillator.start(at);
    oscillator.stop(at + duration + 0.02);
    oscillator.onended = () => {
      oscillator.disconnect();
      envelope.disconnect();
    };
  }

  function noise(
    duration: number,
    volume: number,
    cutoff: number,
    delay = 0,
    type: BiquadFilterType = "lowpass",
    q = 0.7,
  ) {
    if (!context || !sfxNode || !noiseBuffer || context.state !== "running") return;
    const at = context.currentTime + delay;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const envelope = context.createGain();
    source.buffer = noiseBuffer;
    filter.type = type;
    filter.frequency.value = cutoff;
    filter.Q.value = q;
    envelope.gain.setValueAtTime(Math.max(0.0001, volume), at);
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    source.connect(filter).connect(envelope).connect(sfxNode);
    source.start(at);
    source.stop(at + duration);
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      envelope.disconnect();
    };
  }

  function chord(notes: readonly number[], duration: number, volume: number, delay = 0) {
    notes.forEach((frequency, index) =>
      tone(frequency, frequency * 1.015, duration, volume, "sine", delay + index * 0.015, index * 2),
    );
  }

  function play(sound: Sound) {
    switch (sound) {
      case "swing":
        noise(0.09, 0.12, 4200, 0, "highpass", 0.8);
        tone(520, 155, 0.14, 0.055, "triangle");
        tone(300, 105, 0.11, 0.025, "sine", 0.012);
        break;
      case "hit":
        noise(0.075, 0.21, 5200, 0, "bandpass", 1.4);
        tone(145, 48, 0.13, 0.14, "triangle");
        tone(78, 42, 0.16, 0.07, "sine", 0.006);
        break;
      case "hurt":
        tone(235, 82, 0.19, 0.13, "sawtooth");
        noise(0.12, 0.085, 1100, 0, "lowpass");
        break;
      case "dash":
        noise(0.18, 0.13, 3200, 0, "bandpass", 0.9);
        tone(155, 620, 0.18, 0.055, "sine");
        tone(320, 860, 0.12, 0.025, "triangle", 0.03);
        break;
      case "footstep":
        noise(0.05, 0.036, 520, 0, "lowpass");
        tone(68, 45, 0.045, 0.018, "sine");
        break;
      case "enemyWindup":
        tone(165, 265, 0.2, 0.055, "triangle");
        noise(0.1, 0.025, 1500, 0.06, "bandpass", 1.2);
        break;
      case "enemyStrike":
        noise(0.09, 0.1, 2200, 0, "bandpass");
        tone(185, 72, 0.1, 0.075, "triangle");
        break;
      case "enemyHurt":
        tone(320, 125, 0.1, 0.065, "triangle");
        break;
      case "enemyDeath":
        tone(190, 45, 0.36, 0.12, "sawtooth");
        noise(0.25, 0.09, 950, 0, "lowpass");
        tone(92, 42, 0.31, 0.045, "sine", 0.04);
        break;
      case "loot":
        tone(650, 890, 0.13, 0.065);
        tone(900, 1260, 0.18, 0.05, "sine", 0.07);
        break;
      case "equipment":
        noise(0.06, 0.05, 5000, 0, "highpass");
        chord([392, 523.25, 659.25], 0.34, 0.035, 0.025);
        tone(784, 880, 0.22, 0.04, "triangle", 0.13);
        break;
      case "potion":
        tone(410, 760, 0.2, 0.08);
        tone(690, 1040, 0.23, 0.05, "sine", 0.09);
        noise(0.12, 0.025, 2500, 0.02, "highpass");
        break;
      case "chest":
        noise(0.1, 0.085, 2100, 0, "bandpass");
        tone(290, 410, 0.14, 0.04, "triangle");
        chord([523.25, 659.25, 783.99], 0.35, 0.035, 0.11);
        break;
      case "interact":
        tone(480, 635, 0.09, 0.04);
        break;
      case "objective":
        chord([392, 493.88, 587.33], 0.55, 0.05);
        tone(784, 988, 0.52, 0.04, "sine", 0.23);
        break;
      case "uiOpen":
        tone(310, 470, 0.08, 0.025, "sine");
        noise(0.04, 0.018, 3300, 0, "highpass");
        break;
      case "uiClose":
        tone(420, 280, 0.07, 0.022, "sine");
        break;
      case "uiSelect":
        tone(570, 720, 0.055, 0.018, "triangle");
        break;
      case "skillArc":
        noise(0.2, 0.15, 4700, 0, "bandpass", 1);
        tone(610, 155, 0.28, 0.07, "triangle");
        tone(990, 320, 0.18, 0.035, "sine", 0.02);
        break;
      case "skillAegis":
        tone(105, 72, 0.34, 0.11, "sine");
        chord([293.66, 440, 587.33], 0.42, 0.04, 0.02);
        noise(0.18, 0.055, 2800, 0.04, "bandpass", 1.4);
        break;
      case "skillWind":
        noise(0.28, 0.14, 5600, 0, "highpass", 0.8);
        tone(260, 1040, 0.24, 0.055, "sine");
        tone(520, 1480, 0.16, 0.028, "triangle", 0.04);
        break;
      case "skillUnlock":
        chord([523.25, 659.25, 783.99], 0.44, 0.045);
        tone(1046.5, 1318.5, 0.26, 0.035, "sine", 0.2);
        break;
      case "rankUp":
        chord([261.63, 329.63, 392], 0.52, 0.045);
        chord([392, 493.88, 659.25], 0.58, 0.04, 0.18);
        tone(1046.5, 1318.5, 0.4, 0.035, "sine", 0.42);
        break;
      case "questComplete":
        chord([349.23, 440, 523.25], 0.48, 0.04);
        chord([523.25, 659.25, 783.99], 0.52, 0.035, 0.22);
        break;
    }
  }

  return {
    unlock,
    play,
    setMaster(value: number) {
      master = value;
      applyVolume();
    },
    setSfx(value: number) {
      sfx = value;
      applyVolume();
    },
    setMuted(value: boolean) {
      muted = value;
      applyVolume();
    },
    get muted() {
      return muted;
    },
  };
}
