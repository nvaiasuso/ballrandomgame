/* =====================================================================  
   game.js  --  THE RULES AND THE LOOP.  
   ===================================================================== */  
  
var Game = {  
  mode: "playing",  
  levelNumber: 0,
  levelTime: 0,
  lastTime: 0,
  randomMode: false,
  gambleUsed: false
};  
  
Game.startLevel = function (levelNumber) {  
  Game.levelNumber = levelNumber;  
  Game.randomMode = false;
  Game.gambleUsed = false;
  Level.build(levelNumber);  
  Enemy.reset();  
  Player.reset();  
  Game.mode = "playing";  
  Game.levelTime = CONFIG.LEVEL_TIMES[Math.min(levelNumber, CONFIG.LEVEL_TIMES.length - 1)] * 60;
  Game.lastTime = 0;
  Game.showMessage("");  
};  

Game.startRandomLevel = function () {
  Game.randomMode = true;
  Game.gambleUsed = false;
  Level.buildRandom();
  Enemy.reset();
  Player.reset();
  Game.mode = "playing";
  Game.levelTime = CONFIG.RANDOM_LEVEL_TIME * 60;
  Game.showMessage("Random assault generated.");
};
  
Game.showMessage = function (text) {  
  document.getElementById("message").textContent = text;  
};  

Game.openGamble = function () {
  if (Game.mode !== "playing" || Game.gambleUsed) { return; }
  Game.mode = "gamble";
  var panel = document.getElementById("gamble-panel");
  panel.hidden = false;
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

Game.resolveGamble = function () {
  if (Game.mode !== "gamble") { return; }
  var effects = [
    { name: "QUICKSTEP", text: "Buff: your roll speed surges.", apply: function () { Player.speedMultiplier = 1.5; } },
    { name: "SKYBOUND", text: "Buff: your jumps reach the heavens.", apply: function () { Player.jumpMultiplier = 1.45; } },
    { name: "OVERCHARGE", text: "Buff: your weapon damage doubles.", apply: function () { Player.damageMultiplier = 2; } },
    { name: "LEAD BOOTS", text: "Debuff: gravity pulls twice as hard.", apply: function () { Player.gravityMultiplier = 2; } },
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
  Game.mode = "dead";
  Game.showMessage(reason + " Press R to try again.");
};
  
// --- ONE FRAME --------------------------------------------------------  
Game.update = function () {  
  
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
  if (Input.adminRandom) {
    Input.adminRandom = false;
    Game.startRandomLevel();
    return;
  }

  if (Input.gamble) {
    Input.gamble = false;
    Game.openGamble();
    return;
  }
  
  // If we are not playing, nothing moves. We just wait for R.  
  if (Game.mode !== "playing") { return; }  

  Game.levelTime--;
  if (Game.levelTime <= 0) {
    Game.die("You ran out of time.");
    return;
  }
  
  Player.update();  
  Enemy.update();  
  
  if (Player.isDead()) {  
    Game.die("You hit something.");
    return;  
  }  
  
  if (Player.hasWon()) {  
    if (Game.randomMode) {
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
  Game.update();  
  Draw.updateCamera();  
  Draw.everything();  
  window.requestAnimationFrame(Game.loop);  
};  
