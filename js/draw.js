/* =====================================================================
   draw.js  --  EVERYTHING YOU CAN SEE.
   ===================================================================== */

var Draw = { canvas: null, ctx: null, cameraX: 0 };
Draw.setup = function () { Draw.canvas = document.getElementById("game"); Draw.ctx = Draw.canvas.getContext("2d"); };
Draw.updateCamera = function () {
  Draw.cameraX = Player.x - CONFIG.CANVAS_W / 2;
  if (Draw.cameraX < 0) { Draw.cameraX = 0; }
  var furthest = Level.pixelWidth() - CONFIG.CANVAS_W;
  if (furthest < 0) { furthest = 0; }
  if (Draw.cameraX > furthest) { Draw.cameraX = furthest; }
};
Draw.everything = function () {
  var ctx = Draw.ctx; ctx.fillStyle = Enemy.boss ? "#3b1018" : "#ffffff"; ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);
  var shakeX = Enemy.cinematic.shake > 0 ? (Math.random() - 0.5) * Enemy.cinematic.shake : 0;
  var shakeY = Enemy.cinematic.shake > 0 ? (Math.random() - 0.5) * Enemy.cinematic.shake : 0;
  ctx.save(); ctx.translate(-Draw.cameraX + shakeX, shakeY); Draw.world(); Enemy.draw(); Draw.player(); ctx.restore();
  if (Enemy.cinematic.flash > 0) {
    ctx.fillStyle = "rgba(190, 24, 36, " + (Enemy.cinematic.flash / 24) + ")";
    ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);
  }
  Draw.hud();
};
Draw.hud = function () {
  var levelHud = document.getElementById("level-hud");
  var timerHud = document.getElementById("timer-hud");
  var weaponHud = document.getElementById("weapon-hud");
  var enemyHud = document.getElementById("enemy-hud");
  if (levelHud) { levelHud.textContent = "LEVEL " + (Game.levelNumber + 1) + " · " + Level.name; }
  if (timerHud) { timerHud.textContent = "TIME " + Math.max(0, Math.ceil(Game.levelTime / 60)); }
  if (weaponHud) {
    weaponHud.textContent = Player.gunLevel > 2 ? "WEAPON: ULTRA " + Math.ceil(Player.weaponTimer / 60) + "s" :
      (Player.gunLevel > 1 ? "WEAPON: HEAVY " + Math.ceil(Player.weaponTimer / 60) + "s" :
      (Player.hasGun ? "WEAPON: BASIC" : "WEAPON: NONE"));
    if (Player.invincible) { weaponHud.textContent += " · SHIELD " + Math.ceil(Player.invincibleTimer / 60) + "s"; }
  }
  if (enemyHud) { enemyHud.textContent = Enemy.boss ? "BOSS " + Enemy.boss.health + "/" + CONFIG.BOSS_HEALTH : "ENEMIES " + Enemy.list.length; }
  var gambleButton = document.getElementById("gamble-button");
  if (gambleButton) { gambleButton.disabled = Game.gambleUsed || Game.mode !== "playing"; }
  if (Player.gambleEffect && weaponHud) { weaponHud.textContent += " · " + Player.gambleEffect; }
  if (Game.mode === "dead" || Game.mode === "won") {
    var ctx = Draw.ctx;
    ctx.fillStyle = "rgba(24, 33, 43, 0.86)";
    ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);
    ctx.fillStyle = "#fffdf8";
    ctx.textAlign = "center";
    ctx.font = "bold 42px monospace";
    ctx.fillText(Game.mode === "dead" ? "YOU DIED" : "YOU WIN", CONFIG.CANVAS_W / 2, 170);
    ctx.font = "18px monospace";
    ctx.fillText("Press R to restart", CONFIG.CANVAS_W / 2, 215);
    ctx.textAlign = "left";
  }
  if (Enemy.cinematic.banner > 0) {
    ctx.fillStyle = "rgba(190, 24, 36, " + Math.min(0.8, Enemy.cinematic.banner / 35) + ")";
    ctx.textAlign = "center";
    ctx.font = "bold 18px monospace";
    ctx.fillText("ENEMY DOWN", CONFIG.CANVAS_W / 2, 42);
    ctx.textAlign = "left";
  }
};
Draw.world = function () {
  var size = CONFIG.TILE, firstCol = Math.floor(Draw.cameraX / size) - 1, lastCol = firstCol + Math.ceil(CONFIG.CANVAS_W / size) + 2;
  for (var row = 0; row < CONFIG.ROWS; row++) {
    for (var col = firstCol; col <= lastCol; col++) {
      var here = Level.charAt(col, row), x = col * size, y = row * size;
      if (here === "#") { Draw.block(x, y, size); }
      if (here === "^") { Draw.spike(x, y, size); }
      if (here === "~") { Draw.lava(x, y, size); }
      if (here === "F") { Draw.finish(x, y, size); }
    }
  }
};
Draw.block = function (x, y, size) { var ctx = Draw.ctx; ctx.fillStyle = "#ffffff"; ctx.fillRect(x, y, size, size); ctx.strokeStyle = "#000000"; ctx.lineWidth = CONFIG.LINE_WIDTH; ctx.strokeRect(x + CONFIG.LINE_WIDTH / 2, y + CONFIG.LINE_WIDTH / 2, size - CONFIG.LINE_WIDTH, size - CONFIG.LINE_WIDTH); };
Draw.spike = function (x, y, size) { var ctx = Draw.ctx; ctx.fillStyle = "#000000"; ctx.beginPath(); ctx.moveTo(x, y + size); ctx.lineTo(x + size / 2, y); ctx.lineTo(x + size, y + size); ctx.closePath(); ctx.fill(); };
Draw.lava = function (x, y, size) { var ctx = Draw.ctx; ctx.fillStyle = "#d94b32"; ctx.fillRect(x, y, size, size); ctx.fillStyle = "#ffcf56"; ctx.fillRect(x + 4, y + 8, size - 8, 5); };
Draw.finish = function (x, y, size) { var ctx = Draw.ctx; ctx.fillStyle = "#000000"; ctx.fillRect(x + size / 2 - 2, y, 4, size); ctx.beginPath(); ctx.moveTo(x + size / 2 + 2, y + 4); ctx.lineTo(x + size - 4, y + 12); ctx.lineTo(x + size / 2 + 2, y + 20); ctx.closePath(); ctx.fill(); };
Draw.player = function () {
  var ctx = Draw.ctx, r = CONFIG.PLAYER_RADIUS, centerX = Player.x + CONFIG.PLAYER_SIZE / 2, centerY = Player.y + CONFIG.PLAYER_SIZE / 2;
  ctx.fillStyle = "#ffffff"; ctx.strokeStyle = "#000000"; ctx.lineWidth = CONFIG.LINE_WIDTH; ctx.beginPath(); ctx.arc(centerX, centerY, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  var dotX = centerX + Math.cos(Player.aimAngle) * r * CONFIG.DOT_DISTANCE, dotY = centerY + Math.sin(Player.aimAngle) * r * CONFIG.DOT_DISTANCE;
  ctx.fillStyle = "#000000"; ctx.beginPath(); ctx.arc(dotX, dotY, 4, 0, Math.PI * 2); ctx.fill();
  if (Player.hasGun) {
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(Player.aimAngle);
    ctx.fillRect(8, -3, 14, 6);
    if (Player.gunLevel > 1) { ctx.fillRect(8, 5, 14, 4); }
    if (Player.gunLevel > 2) { ctx.fillRect(18, -8, 8, 16); }
    ctx.restore();
  }
  if (Player.invincible) {
    ctx.strokeStyle = "#ffcf56";
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(centerX, centerY, r + 7, 0, Math.PI * 2); ctx.stroke();
  }
};
