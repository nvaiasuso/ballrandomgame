/* =====================================================================  
   game.js  --  THE RULES AND THE LOOP.  
   ===================================================================== */  
  
var Game = {  
  mode: "playing",  
  levelNumber: 0,
  levelTime: 0,
  lastTime: 0,
  randomMode: false,
  gambleUsed: false,
  hitstop: 0,
  timeScale: 1,
  slowMoTimer: 0,
  simAccumulator: 0,
  combo: 0,
  comboTimer: 0,
  chaosTimer: CONFIG.CHAOS_INTERVAL,
  chaosRemaining: 0,
  chaosType: "",
  gravityScale: 1,
  enemySpeedScale: 1
  ,hitTint: 0,
  bossFlicker: 0,
  endless: false,
  endlessWave: 0,
  endlessSeed: 0,
  score: 0,
  highScore: 0,
  introTimer: 0,
  frame: 0,
  keepPerks: false,
  pendingLevel: 0,
  upgradeChoices: [],
  transitioning: false,
  shopOpened: false,
  roundNumber: 0,
  tutorial: { active: false, step: 0, wrongTimer: 0 },
  habits: { jumps: 0, dashes: 0, shots: 0, left: 0, right: 0, corners: 0, recentJump: 0 }
};  
  
Game.startLevel = function (levelNumber) {  
  Game.transitioning = false;
  Game.shopOpened = false;
  Game.closePanels();
  Game.roundNumber++;
  if (levelNumber === CONFIG.START_LEVEL) {
    Game.habits = { jumps: 0, dashes: 0, shots: 0, left: 0, right: 0, corners: 0, recentJump: 0 };
    Player.shards = 0;
  }
  Game.levelNumber = levelNumber;  
  Game.tutorial = { active: levelNumber === CONFIG.START_LEVEL, step: 0, wrongTimer: 0 };
  Game.randomMode = false;
  Game.endless = false;
  Game.gambleUsed = false;
  if (levelNumber === CONFIG.START_LEVEL && !Game.keepPerks) { Player.perks = []; }
  Game.resetIntensity();
  Game.introTimer = 95;
  Draw.cameraSnap = true;
  Level.build(levelNumber);  
  Enemy.reset();  
  Player.reset();  
  Game.keepPerks = false;
  Game.mode = "playing";  
  Game.levelTime = CONFIG.LEVEL_TIMES[Math.min(levelNumber, CONFIG.LEVEL_TIMES.length - 1)] * 60;
  Game.lastTime = 0;
  Game.showMessage("Find a weapon and survive.");
  Game.updateTutorial();
};  

Game.startRandomLevel = function () {
  Game.transitioning = false;
  Game.shopOpened = false;
  Game.closePanels();
  Player.shards = 0;
  Game.roundNumber++;
  Game.randomMode = true;
  Game.endless = false;
  Game.gambleUsed = false;
  Game.resetIntensity();
  Game.introTimer = 95;
  Draw.cameraSnap = true;
  Level.buildRandom();
  Enemy.reset();
  Player.reset();
  Game.mode = "playing";
  Game.levelTime = CONFIG.RANDOM_LEVEL_TIME * 60;
  Game.showMessage("Random assault generated.");
};

Game.dailySeed = function () {
  var stamp = new Date().toISOString().slice(0, 10);
  var hash = 2166136261;
  for (var i = 0; i < stamp.length; i++) { hash ^= stamp.charCodeAt(i); hash = Math.imul(hash, 16777619); }
  return hash >>> 0;
};

Game.startEndless = function (seed) {
  Game.endless = true;
  Game.randomMode = false;
  Player.perks = [];
  Game.endlessSeed = seed >>> 0;
  Game.endlessWave = 0;
  Game.score = 0;
  Player.shards = 0;
  Game.highScore = Number(localStorage.getItem("rollerHighScore") || 0);
  Game.startEndlessWave();
};

Game.startEndlessWave = function () {
  Game.transitioning = false;
  Game.shopOpened = false;
  Game.closePanels();
  Game.roundNumber++;
  Level.buildRandom((Game.endlessSeed + Game.endlessWave * 7919) >>> 0);
  Level.name = "ENDLESS WAVE " + (Game.endlessWave + 1);
  Enemy.reset();
  Player.reset();
  Game.mode = "playing";
  Game.levelTime = (CONFIG.RANDOM_LEVEL_TIME + Math.min(18, Game.endlessWave * 2)) * 60;
  Game.resetIntensity();
  Game.enemySpeedScale = 1 + Math.min(1, Game.endlessWave * 0.08);
  Game.introTimer = 95;
  Draw.cameraSnap = true;
  Game.showMessage("Wave " + (Game.endlessWave + 1) + " - survive for score.");
};

Game.finishEndlessWave = function () {
  Game.score += Math.max(100, Math.ceil(Game.levelTime / 6)) + Enemy.deadBodies.length * 50 + Game.endlessWave * 100;
  if (Game.score > Game.highScore) {
    Game.highScore = Game.score;
    localStorage.setItem("rollerHighScore", String(Game.highScore));
  }
  Game.endlessWave++;
  Game.startEndlessWave();
};
  
Game.showMessage = function (text) {  
  document.getElementById("message").textContent = text;  
};  

Game.closePanels = function () {
  var gamblePanel = document.getElementById("gamble-panel");
  var shopPanel = document.getElementById("shop-panel");
  var guidePanel = document.getElementById("guide-panel");
  if (gamblePanel) { gamblePanel.hidden = true; gamblePanel.style.display = "none"; }
  if (shopPanel) { shopPanel.hidden = true; shopPanel.style.display = "none"; }
  if (guidePanel) { guidePanel.hidden = true; guidePanel.style.display = "none"; }
};

Game.openGuide = function () {
  var panel = document.getElementById("guide-panel");
  if (!panel) { return; }
  panel.hidden = false;
  panel.style.display = "grid";
  Game.mode = "guide";
};

Game.closeGuide = function () {
  var panel = document.getElementById("guide-panel");
  if (panel) { panel.hidden = true; panel.style.display = "none"; }
  Game.mode = "playing";
  Game.showMessage("Back to the fight.");
};

Game.setTutorial = function (text) {
  var element = document.getElementById("tutorial-message");
  if (element) { element.textContent = text; }
};

Game.updateTutorial = function () {
  if (!Game.tutorial.active) { Game.setTutorial(""); return; }
  if (Game.tutorial.wrongTimer > 0) { return; }
  var text = "MOVE with LEFT / RIGHT. Reach the enemy.";
  if (Game.tutorial.step === 1) { text = "JUMP onto the enemy to STOMP it. Do not shoot: you do not have a gun yet."; }
  if (Game.tutorial.step === 2) { text = "Collect the dropped gun, aim with the mouse, then click or press X to shoot."; }
  if (Game.tutorial.step === 3) { text = "A shop is nearby. Choose an upgrade, then press RETURN TO BATTLE to close it."; }
  if (Game.tutorial.step >= 4) { text = "Reach the flag. Jump gaps and spikes; the instruction stays here."; }
  Game.setTutorial(text);
};

Game.tutorialMistake = function (text) {
  if (!Game.tutorial.active) { return; }
  Game.tutorial.wrongTimer = 150;
  Game.setTutorial("TRY AGAIN: " + text);
};

Game.updateTutorialState = function () {
  if (!Game.tutorial.active) { return; }
  if (Game.tutorial.wrongTimer > 0) { Game.tutorial.wrongTimer--; }
  if (Game.tutorial.step === 0 && (Input.left || Input.right)) { Game.tutorial.step = 1; }
  if (Game.tutorial.step === 1 && Enemy.deadBodies.length > 0) { Game.tutorial.step = 2; }
  if (Game.tutorial.step === 2 && Player.hasGun) { Game.tutorial.step = 3; }
  if (Game.tutorial.step === 3 && Game.shopOpened) { Game.tutorial.step = 4; }
  Game.updateTutorial();
};

Game.togglePause = function () {
  if (Game.mode === "playing") {
    Game.mode = "paused";
    Game.showMessage("PAUSED - press P or Resume to continue.");
  } else if (Game.mode === "paused") {
    Game.mode = "playing";
    Game.showMessage("Back in action.");
  }
};

Game.resetIntensity = function () {
  Game.hitstop = 0; Game.timeScale = 1; Game.slowMoTimer = 0; Game.simAccumulator = 0;
  Game.combo = 0; Game.comboTimer = 0; Game.chaosTimer = CONFIG.CHAOS_INTERVAL;
  Game.chaosRemaining = 0; Game.chaosType = ""; Game.gravityScale = 1;
  Game.enemySpeedScale = 1; Game.hitTint = 0; Game.bossFlicker = 0;
};

Game.impact = function (hitstop, slowMo) {
  Game.hitstop = Math.max(Game.hitstop, hitstop || CONFIG.HITSTOP_FRAMES);
  if (slowMo) { Game.slowMoTimer = Math.max(Game.slowMoTimer, slowMo); Game.timeScale = 0.3; }
};

Game.registerKill = function (isBoss) {
  Game.combo++; Game.comboTimer = CONFIG.COMBO_TIMEOUT;
  var slowMo = Game.slowMoTimer === 0 ? (isBoss ? CONFIG.BOSS_SLOWMO_FRAMES : CONFIG.KILL_SLOWMO_FRAMES) : 0;
  Game.impact(CONFIG.HITSTOP_FRAMES, slowMo);
};

Game.startChaos = function () {
  var events = ["LOW GRAVITY", "ENEMY FRENZY", "FATE STORM"];
  Game.chaosType = events[Math.floor(Math.random() * events.length)];
  Game.chaosRemaining = CONFIG.CHAOS_DURATION;
  Game.gravityScale = Game.chaosType === "LOW GRAVITY" ? 0.35 : 1;
  Game.enemySpeedScale = Game.chaosType === "ENEMY FRENZY" ? 1.8 : 1;
  Game.showMessage("CHAOS EVENT: " + Game.chaosType);
  if (Game.chaosType === "FATE STORM" && !Game.gambleUsed) { Game.openGamble(); }
};

Game.openGamble = function () {
  if (Game.mode !== "playing" || Game.gambleUsed) { return; }
  Game.mode = "gamble";
  var panel = document.getElementById("gamble-panel");
  panel.hidden = false;
  panel.style.display = "grid";
  panel.style.display = "";
  Game.showMessage("The Fate Wheel is waiting.");
};

Game.closeGamble = function () {
  if (Game.mode !== "gamble") { return; }
  Game.mode = "playing";
  var panel = document.getElementById("gamble-panel");
  panel.hidden = true;
  panel.style.display = "none";
  Game.showMessage("");
};

Game.openShop = function () {
  if (Game.mode !== "playing" || Game.shopOpened) { return; }
  Game.shopOpened = true;
  Game.mode = "shop";
  document.getElementById("shop-panel").hidden = false;
  document.getElementById("shop-panel").style.display = "grid";
  Game.updateShopText();
  Game.showMessage("A field mechanic offers upgrades.");
  Game.updateTutorial();
};

Game.closeShop = function () {
  if (Game.mode !== "shop") { return; }
  Game.mode = "playing";
  document.getElementById("shop-panel").hidden = true;
  Game.showMessage("Back to the fight.");
  if (Game.tutorial.active && Game.tutorial.step === 3) { Game.tutorial.step = 4; Game.updateTutorial(); }
};

Game.updateShopText = function () {
  document.getElementById("shop-shards").textContent = "SHARDS: " + Player.shards;
};

Game.buyShopUpgrade = function (upgrade) {
  var costs = { speed: 3, jump: 3, health: 4 };
  var cost = costs[upgrade];
  if (!cost || Player.shards < cost) { Game.showMessage("Not enough weapon shards."); return; }
  Player.shards -= cost;
  if (upgrade === "speed") { Player.speedMultiplier += 0.12; Game.showMessage("TUNED WHEELS: speed +12%."); }
  if (upgrade === "jump") { Player.jumpMultiplier += 0.1; Game.showMessage("SPRING COIL: jump +10%."); }
  if (upgrade === "health") { Player.maxHealth++; Player.health = Player.maxHealth; Game.showMessage("REPAIR KIT: maximum health +1."); }
  Game.updateShopText();
};

Game.resolveGamble = function () {
  if (Game.mode !== "gamble") { return; }
  var effects = [
    { name: "QUICKSTEP", text: "Buff: your roll speed surges.", apply: function () { Player.speedMultiplier = 1.5; } },
    { name: "SKYBOUND", text: "Buff: your jumps reach the heavens.", apply: function () { Player.jumpMultiplier = 1.45; } },
    { name: "OVERCHARGE", text: "Buff: your weapon damage doubles.", apply: function () { Player.damageMultiplier = 2; } },
    { name: "RICOCHET", text: "Buff: your bullets bounce off walls.", apply: function () { Player.ricochet = true; } },
    { name: "TIME BURST", text: "Buff: the world slows while you stay fast.", apply: function () { Player.speedMultiplier = 1.25; Game.timeScale = 0.7; } },
    { name: "ADAPTIVE AIM", text: "Your shots lead moving targets more aggressively.", apply: function () { Player.damageMultiplier = 1.25; Player.adaptiveAim = true; } },
    { name: "SECOND WIND", text: "Buff: your health expands and refills.", apply: function () { Player.maxHealth += 2; Player.health = Player.maxHealth; } },
    { name: "PHASE SHIFT", text: "Buff: your body becomes untouchable.", apply: function () { Player.invincible = true; Player.invincibleTimer = CONFIG.INVINCIBILITY_TIME; } },
    { name: "HOT BARREL", text: "Buff: your weapon fires faster.", apply: function () { Player.shootCooldown = Math.max(0, Player.shootCooldown - 8); } },
    { name: "IRON CORE", text: "Buff: your next hit is softened.", apply: function () { Player.maxHealth++; Player.health = Math.min(Player.maxHealth, Player.health + 1); } },
    { name: "LEAD BOOTS", text: "Debuff: gravity pulls twice as hard.", apply: function () { Player.gravityMultiplier = 2; } },
    { name: "JAMMED TRIGGER", text: "Debuff: your weapon fires slower.", apply: function () { Player.shootCooldown += 15; } },
    { name: "FRAIL FORTUNE", text: "Debuff: your shield is stripped away.", apply: function () { Player.invincible = false; Player.invincibleTimer = 0; } }
  ];
  var effect = effects[Math.floor(Math.random() * effects.length)];
  effect.apply();
  Player.gambleEffect = effect.name;
  Game.gambleUsed = true;
  Game.mode = "playing";
  var panel = document.getElementById("gamble-panel");
  panel.hidden = true;
  panel.style.display = "none";
  Game.showMessage(effect.name + " - " + effect.text);
};

Game.die = function (reason) {
  if (Player.invincible) { return; }
  Game.mode = "dead";
  Player.startDeathAnimation();
  AudioFX.hit();
  AudioFX.death();
  Game.showMessage(reason + " Press R to try again.");
};
  
// --- ONE FRAME --------------------------------------------------------  
Game.update = function () {  
    Game.frame++;

  if (Game.mode === "guide") {
    if (Input.shoot) { Input.shoot = false; Game.closeGuide(); }
    return;
  }
  
  if (Input.adminSkip) {
    Input.adminSkip = false;
    Game.startLevel((Game.levelNumber + 1) % Level.levels.length);
    Game.showMessage("ADMIN: skipped to Level " + (Game.levelNumber + 1));
    return;
  }

  // R always restarts, no matter what mode we are in.
  if (Input.restart) {
    if (Game.randomMode) { Game.startRandomLevel(); }
    else { Game.startLevel(Game.levelNumber); }
    return;
  }
  if (Input.pause) {
    Input.pause = false;
    Game.togglePause();
    return;
  }
  if (Input.invincibility) {
    Input.invincibility = false;
    Player.invincible = !Player.invincible;
    Player.invincibleTimer = Player.invincible ? 999999 : 0;
    Game.showMessage(Player.invincible ? "INVINCIBILITY ON - press I to disable." : "INVINCIBILITY OFF.");
  }
  if (Input.adminRandom) {
    Input.adminRandom = false;
    Game.startRandomLevel();
    return;
  }

  if (Input.endless) {
    Input.endless = false;
    Game.startEndless(Date.now());
    return;
  }

  if (Input.gamble) {
    Input.gamble = false;
    Game.openGamble();
    return;
  }

  if (Game.introTimer > 0) {
    Game.introTimer--;
    return;
  }

  if (Game.hitstop > 0) {
    Game.hitstop--;
    return;
  }
  if (Game.hitTint > 0) { Game.hitTint--; }
  if (Game.bossFlicker > 0) { Game.bossFlicker--; }
  if (Game.slowMoTimer > 0) {
    Game.slowMoTimer--;
    if (Game.slowMoTimer === 0) { Game.timeScale = 1; }
  }
  Game.simAccumulator += Game.timeScale;
  if (Game.simAccumulator < 1) { return; }
  Game.simAccumulator -= 1;
  
  // If we are not playing, nothing moves. We just wait for R.  
  if (Game.mode !== "playing") { return; }  

  Game.levelTime--;
  Level.updateDynamic();
  if (Game.levelTime <= 0) {
    if (!Player.invincible) {
      Game.die("You ran out of time.");
      return;
    }
    Game.levelTime = 1;
  }
  if (Game.comboTimer > 0) { Game.comboTimer--; }
  if (Game.comboTimer === 0) { Game.combo = 0; }
  if (Game.chaosRemaining > 0) {
    Game.chaosRemaining--;
    if (Game.chaosRemaining === 0) {
      Game.gravityScale = 1; Game.enemySpeedScale = 1; Game.chaosType = "";
      Game.showMessage("Chaos fades. Keep moving.");
    }
  } else {
    Game.chaosTimer--;
    if (Game.chaosTimer <= 0) { Game.chaosTimer = CONFIG.CHAOS_INTERVAL; Game.startChaos(); }
  }
  
  Player.update();  
  Enemy.update();  
  Game.updateTutorialState();
  
  if (Player.isDead()) {  
    Game.die("You hit something.");
    return;  
  }  
  
  if (!Game.transitioning && Player.hasWon()) {
    Game.transitioning = true;
    if (Game.endless) {
      Game.finishEndlessWave();
    } else if (Game.randomMode) {
      Game.startRandomLevel();
    } else if (Game.levelNumber < Level.levels.length - 1) {
      Game.startLevel(Game.levelNumber + 1);
      Game.showMessage("Level " + (Game.levelNumber + 1) + " - " + Level.name);
    } else {
      Game.mode = "won";
      Game.showMessage("You cleared every level. Press R to play again.");
    }
    return;  
  }  
};  
  
// --- THE LOOP ITSELF --------------------------------------------------  
Game.loop = function () {  
  try {
    Game.update();
    Draw.updateCamera();
    Input.refreshMouseWorld();
    Draw.everything();
  } catch (error) {
    console.error("Game frame recovered from an error:", error);
    if (Game.showMessage) { Game.showMessage("A frame recovered: " + error.message + " Press R if needed."); }
  } finally {
    window.requestAnimationFrame(Game.loop);
  }
};  
