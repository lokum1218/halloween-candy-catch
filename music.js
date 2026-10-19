// Two original, lightweight chiptune loops. Audio is created after a player gesture.
const SONGS = {
  candy: {
    bpm: 132,
    melody: ['C5',null,'Eb5','G5',null,'Bb5','G5',null,'Ab5',null,'G5','Eb5','F5',null,'G5',null,
      'C5',null,'Eb5','G5','C6',null,'Bb5','G5','Ab5',null,'F5','Eb5','D5',null,'C5',null,
      'Eb5',null,'G5','Bb5',null,'C6','Bb5',null,'Ab5','G5','F5',null,'Eb5',null,'G5',null,
      'F5',null,'Ab5','C6','Bb5',null,'G5',null,'Eb5','F5','G5',null,'C5',null,null,null],
    bass: ['C3','Ab2','F2','G2','C3','Ab2','F2','G2'],
    arpeggio: [['C4','Eb4','G4','Eb4'],['Ab3','C4','Eb4','C4'],['F3','Ab3','C4','Ab3'],['G3','B3','D4','B3']],
    lead: 'square', leadVolume: .12, bassVolume: .16, padVolume: .07
  },
  witch: {
    bpm: 96,
    melody: ['A4',null,null,'C5',null,'E5',null,null,'Eb5',null,'C5',null,'B4',null,null,null,
      'A4',null,'C5',null,'E5',null,'G5',null,'F5',null,'E5',null,'C5',null,null,null,
      'D5',null,null,'F5',null,'E5',null,null,'C5',null,'B4',null,'A4',null,null,null,
      'C5',null,'E5',null,'Eb5',null,'C5',null,'B4',null,'G#4',null,'A4',null,null,null],
    bass: ['A2','F2','D2','E2','A2','F2','D2','E2'],
    arpeggio: [['A3','C4','E4','C4'],['F3','A3','C4','A3'],['D3','F3','A3','F3'],['E3','G#3','B3','G#3']],
    lead: 'triangle', leadVolume: .19, bassVolume: .19, padVolume: .08
  }
};

function frequency(note) {
  const match = /^([A-G])([#b]?)(\d)$/.exec(note);
  if (!match) return 0;
  const semis = {C:0,D:2,E:4,F:5,G:7,A:9,B:11};
  const midi = (Number(match[3])+1)*12 + semis[match[1]] + (match[2]==='#'?1:match[2]==='b'?-1:0);
  return 440 * 2 ** ((midi-69)/12);
}

export function createMusic(kind, button) {
  const song = SONGS[kind];
  let context, master, timer, enabled = true, playing = false, nextTime = 0, step = 0;
  const beat = 60 / song.bpm / 2; // eighth notes

  function updateButton() {
    button.textContent = enabled ? '♫ 음악 끄기' : '♫ 음악 켜기';
    button.setAttribute('aria-pressed', String(enabled));
  }
  function unlock() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) { button.disabled = true; button.textContent = '음악 미지원'; return; }
    try {
      if (!context) {
        context = new AudioContext();
        master = context.createGain();
        master.gain.value = .22;
        master.connect(context.destination);
      }
      if (context.state === 'suspended') context.resume().catch(() => {});
    } catch { button.disabled = true; button.textContent = '음악 미지원'; }
  }
  function tone(note, time, length, type, volume, attack = .012) {
    if (!note || !context) return;
    const osc = context.createOscillator(), gain = context.createGain();
    osc.type = type; osc.frequency.value = frequency(note);
    gain.gain.setValueAtTime(.0001, time);
    gain.gain.exponentialRampToValueAtTime(volume, time + attack);
    gain.gain.exponentialRampToValueAtTime(.0001, time + length);
    osc.connect(gain).connect(master);
    osc.start(time); osc.stop(time + length + .01);
  }
  function schedule(index, time) {
    const melody = song.melody[index % 64];
    tone(melody, time, beat * (kind === 'witch' ? 1.8 : .85), song.lead, song.leadVolume, .018);
    if (index % 8 === 0) tone(song.bass[Math.floor(index/8) % 8], time, beat * 6.5, 'triangle', song.bassVolume, .04);
    if (index % 2 === 0) {
      const chord = song.arpeggio[Math.floor(index/16) % 4];
      tone(chord[Math.floor(index/2) % 4], time, beat * (kind === 'witch' ? 1.6 : .65),
        kind === 'witch' ? 'sine' : 'triangle', song.padVolume, .025);
    }
  }
  function pump() {
    if (!context || context.state !== 'running') return;
    // Schedule slightly ahead so the loop stays even when rendering slows down.
    while (nextTime < context.currentTime + .18) {
      schedule(step, nextTime);
      nextTime += beat;
      step = (step + 1) % 64;
    }
  }
  function start() {
    playing = true;
    if (!enabled) return;
    unlock();
    if (!context || timer) return;
    step = 0; nextTime = context.currentTime + .04;
    pump(); timer = window.setInterval(pump, 70);
  }
  function stop() {
    playing = false;
    if (timer) window.clearInterval(timer);
    timer = null;
    if (context && master) {
      master.gain.cancelScheduledValues(context.currentTime);
      master.gain.setValueAtTime(master.gain.value, context.currentTime);
      master.gain.setTargetAtTime(.0001, context.currentTime, .06);
      // Fresh gain node prevents already scheduled notes from carrying into a replay.
      const oldMaster = master;
      master = context.createGain(); master.gain.value = .22; master.connect(context.destination);
      window.setTimeout(() => oldMaster.disconnect(), 600);
    }
  }
  button.addEventListener('click', () => {
    enabled = !enabled; updateButton();
    if (!enabled) { const wasPlaying = playing; stop(); playing = wasPlaying; }
    else { unlock(); if (playing) start(); }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (timer) window.clearInterval(timer); timer = null; context?.suspend().catch(() => {}); }
    else if (playing && enabled) { unlock(); if (!timer) { nextTime = context.currentTime + .04; pump(); timer = window.setInterval(pump, 70); } }
  });
  updateButton();
  return {unlock, start, stop};
}
