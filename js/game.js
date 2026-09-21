/* =====================================================================  
   game.js  --  THE RULES AND THE LOOP.  
   ===================================================================== */  
  
var Game = {  
  mode: "playing",  
  levelNumber: 0  
};  
  
Game.startLevel = function (levelNumber) {  
  Game.levelNumber = levelNumber;  
  Level.build(levelNumber);  
  Enemy.reset();  
  Player.reset();  
  Game.mode = "playing";  
  Game.showMessage("");  
};  
  
Game.showMessage = function (text) {  
  document.getElementById("message").textContent = text;  
};  
  
// --- ONE FRAME --------------------------------------------------------  
Game.update = function () {  
  
  // R always restarts, no matter what mode we are in.  
  if (Input.restart) {  
    Game.startLevel(Game.levelNumber);  
    return;  
  }  
  
  // If we are not playing, nothing moves. We just wait for R.  
  if (Game.mode !== "playing") { return; }  
  
  Player.update();  
  Enemy.update();  
  
  if (Player.isDead()) {  
    Game.mode = "dead";  
    Game.showMessage("You hit something. Press R to try again.");  
    return;  
  }  
  
  if (Player.hasWon()) {  
    Game.mode = "won";  
    Game.showMessage("You made it. Press R to play again.");  
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
