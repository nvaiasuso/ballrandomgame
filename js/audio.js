/* =====================================================================
   audio.js -- small synthesized music and sound effects
   ===================================================================== */

var AudioFX = {
  context: null,
  master: null,
  musicTimer: null,
  musicStep: 0,
  track: null,
  unlock: function () {
    if (AudioFX.context) {
      if (AudioFX.context.state === "suspended") { AudioFX.context.resume(); }
      return;
    }
    var AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) { return; }
    AudioFX.context = new AudioContext();
    AudioFX.master = AudioFX.context.createGain();
    AudioFX.master.gain.value = 0.08;
    AudioFX.master.connect(AudioFX.context.destination);
    AudioFX.track = new Audio("backround.mp4");
    AudioFX.track.loop = true;
    AudioFX.track.volume = 0.28;
    AudioFX.track.addEventListener("canplay", function () {
      if (AudioFX.musicTimer) { window.clearInterval(AudioFX.musicTimer); AudioFX.musicTimer = null; }
      AudioFX.track.play().catch(function () {});
    });
    AudioFX.track.load();
    AudioFX.musicTimer = window.setInterval(AudioFX.music, 520);
  },
  tone: function (frequency, duration, type, volume) {
    if (!AudioFX.context) { return; }
    var oscillator = AudioFX.context.createOscillator();
    var gain = AudioFX.context.createGain();
    oscillator.type = type || "square";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(volume || 0.12, AudioFX.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, AudioFX.context.currentTime + duration);
    oscillator.connect(gain); gain.connect(AudioFX.master);
    oscillator.start(); oscillator.stop(AudioFX.context.currentTime + duration);
  },
  music: function () {
    var notes = [110, 110, 146.83, 123.47, 164.81, 146.83, 98, 123.47];
    AudioFX.tone(notes[AudioFX.musicStep % notes.length], 0.24, "triangle", 0.04);
    AudioFX.musicStep++;
  },
  jump: function () { AudioFX.tone(420, 0.08, "square", 0.08); },
  dash: function () { AudioFX.tone(180, 0.16, "sawtooth", 0.12); },
  shoot: function () { AudioFX.tone(260, 0.04, "square", 0.06); },
  hit: function () { AudioFX.tone(90, 0.16, "sawtooth", 0.14); },
  death: function () { AudioFX.tone(55, 0.42, "sawtooth", 0.18); AudioFX.tone(38, 0.55, "triangle", 0.1); },
  stomp: function () { AudioFX.tone(120, 0.12, "square", 0.12); AudioFX.tone(70, 0.18, "sawtooth", 0.1); },
  shield: function () { AudioFX.tone(720, 0.06, "square", 0.08); },
  bossPhase: function () { AudioFX.tone(90, 0.18, "sawtooth", 0.16); AudioFX.tone(180, 0.32, "triangle", 0.12); },
  defeat: function () { AudioFX.tone(70, 0.22, "sawtooth", 0.15); },
  pickup: function () { AudioFX.tone(660, 0.16, "triangle", 0.1); },
  boss: function () { AudioFX.tone(48, 0.5, "sawtooth", 0.16); }
};
