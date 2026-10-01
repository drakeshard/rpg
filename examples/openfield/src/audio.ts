export type Sound = 'swing' | 'hit' | 'hurt' | 'dash' | 'footstep' | 'enemyWindup' |
  'enemyStrike' | 'enemyHurt' | 'enemyDeath' | 'loot' | 'potion' | 'chest' | 'interact' | 'objective';

export function createAudio() {
  let context: AudioContext | null = null;
  let masterNode: GainNode | null = null;
  let sfxNode: GainNode | null = null;
  let noiseBuffer: AudioBuffer | null = null;
  let master = .42, sfx = .62, muted = false;

  function applyVolume() {
    if (!context || !masterNode || !sfxNode) return;
    masterNode.gain.setTargetAtTime(muted ? 0 : master, context.currentTime, .015);
    sfxNode.gain.setTargetAtTime(sfx, context.currentTime, .015);
  }

  function unlock() {
    if (!context) {
      context = new AudioContext();
      masterNode = context.createGain();
      sfxNode = context.createGain();
      sfxNode.connect(masterNode).connect(context.destination);
      const sampleCount = Math.floor(context.sampleRate * .4);
      noiseBuffer = context.createBuffer(1, sampleCount, context.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < sampleCount; i++) data[i] = Math.random() * 2 - 1;
      applyVolume();
    }
    if (context.state === 'suspended') void context.resume();
  }

  function tone(start: number, end: number, duration: number, volume: number, type: OscillatorType = 'sine', delay = 0) {
    if (!context || !sfxNode || context.state !== 'running') return;
    const at = context.currentTime + delay;
    const oscillator = context.createOscillator(), envelope = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(start, at);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, end), at + duration);
    envelope.gain.setValueAtTime(.0001, at);
    envelope.gain.exponentialRampToValueAtTime(volume, at + Math.min(.018, duration * .25));
    envelope.gain.exponentialRampToValueAtTime(.0001, at + duration);
    oscillator.connect(envelope).connect(sfxNode);
    oscillator.start(at); oscillator.stop(at + duration + .01);
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
  }

  function noise(duration: number, volume: number, cutoff: number, delay = 0) {
    if (!context || !sfxNode || !noiseBuffer || context.state !== 'running') return;
    const at = context.currentTime + delay;
    const source = context.createBufferSource(), filter = context.createBiquadFilter(), envelope = context.createGain();
    source.buffer = noiseBuffer;
    filter.type = 'lowpass'; filter.frequency.value = cutoff;
    envelope.gain.setValueAtTime(Math.max(.0001, volume), at);
    envelope.gain.exponentialRampToValueAtTime(.0001, at + duration);
    source.connect(filter).connect(envelope).connect(sfxNode);
    source.start(at); source.stop(at + duration);
    source.onended = () => { source.disconnect(); filter.disconnect(); envelope.disconnect(); };
  }

  function play(sound: Sound) {
    switch (sound) {
      case 'swing': noise(.12, .12, 2600); tone(380, 175, .13, .07, 'triangle'); break;
      case 'hit': noise(.11, .19, 3400); tone(170, 65, .13, .13, 'triangle'); break;
      case 'hurt': tone(240, 95, .19, .15, 'sawtooth'); noise(.09, .08, 900); break;
      case 'dash': noise(.19, .15, 2100); tone(170, 410, .17, .06, 'sine'); break;
      case 'footstep': noise(.055, .044, 430 + Math.random() * 130); break;
      case 'enemyWindup': tone(180, 245, .18, .055, 'triangle'); break;
      case 'enemyStrike': noise(.09, .09, 1700); tone(200, 100, .09, .07, 'triangle'); break;
      case 'enemyHurt': tone(310, 130, .1, .07, 'triangle'); break;
      case 'enemyDeath': tone(200, 55, .32, .13, 'sawtooth'); noise(.2, .08, 850); break;
      case 'loot': tone(620, 880, .15, .075); tone(880, 1175, .18, .055, 'sine', .08); break;
      case 'potion': tone(420, 720, .21, .085); tone(700, 980, .22, .055, 'sine', .1); break;
      case 'chest': noise(.08, .09, 2800); tone(440, 660, .19, .08, 'triangle', .04); tone(660, 990, .25, .07, 'sine', .13); break;
      case 'interact': tone(480, 620, .1, .045); break;
      case 'objective': tone(392, 392, .3, .08, 'triangle'); tone(494, 494, .3, .08, 'triangle', .13); tone(588, 588, .4, .1, 'triangle', .26); break;
    }
  }

  return {
    unlock, play,
    setMaster(value: number) { master = value; applyVolume(); },
    setSfx(value: number) { sfx = value; applyVolume(); },
    setMuted(value: boolean) { muted = value; applyVolume(); },
    get muted() { return muted; }
  };
}
