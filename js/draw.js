/* =====================================================================
   draw.js  --  EVERYTHING YOU CAN SEE.
   ===================================================================== */

var Draw = { canvas: null, ctx: null, cameraX: 0, zoom: 1, cameraLookAhead: 0, cameraSnap: true };
Draw.setup = function () { Draw.canvas = document.getElementById("game"); Draw.ctx = Draw.canvas.getContext("2d"); };
Draw.updateCamera = function () {
  var lookTarget = Math.abs(Player.vx) > 0.1 ? (Player.vx > 0 ? CONFIG.CAMERA_LOOKAHEAD : -CONFIG.CAMERA_LOOKAHEAD) : 0;
  Draw.cameraLookAhead += (lookTarget - Draw.cameraLookAhead) * CONFIG.CAMERA_LAG;
  var target = Player.x + Draw.cameraLookAhead - CONFIG.CANVAS_W / 2;
  var furthest = Level.pixelWidth() - CONFIG.CANVAS_W;
  if (furthest < 0) { furthest = 0; }
  if (target < 0) { target = 0; }
  if (target > furthest) { target = furthest; }
  if (Draw.cameraSnap) {
    Draw.cameraX = target;
    Draw.cameraLookAhead = lookTarget;
    Draw.cameraSnap = false;
  } else {
    Draw.cameraX += (target - Draw.cameraX) * CONFIG.CAMERA_LAG;
  }
  Draw.zoom = 1;
};
Draw.everything = function () {
  var ctx = Draw.ctx; ctx.fillStyle = Enemy.boss ? "#3b1018" : "#ffffff"; ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);
  if (Game.mode === "dead") { Player.updateDeathAnimation(); }
  var shakeX = Enemy.cinematic.shake > 0 ? (Math.random() - 0.5) * Enemy.cinematic.shake : 0;
  var shakeY = Enemy.cinematic.shake > 0 ? (Math.random() - 0.5) * Enemy.cinematic.shake : 0;
  ctx.save();
  ctx.translate(-Draw.cameraX + shakeX, shakeY);
  Draw.world(); Enemy.draw(); Draw.player(); Network.draw(); ctx.restore();
  if (Level.dark) {
    ctx.save();
    ctx.fillStyle = "rgba(5, 7, 13, 0.9)";
    ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(Player.x - Draw.cameraX + CONFIG.PLAYER_SIZE / 2, Player.y + CONFIG.PLAYER_SIZE / 2, Player.muzzleFlash > 0 ? 280 : 220, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.translate(-Draw.cameraX, 0);
    Draw.player();
    ctx.restore();
    if (Player.muzzleFlash > 0) {
      ctx.fillStyle = "rgba(255, 207, 86, 0.16)";
      ctx.beginPath(); ctx.arc(Player.x - Draw.cameraX + CONFIG.PLAYER_SIZE / 2, Player.y + CONFIG.PLAYER_SIZE / 2, 145, 0, Math.PI * 2); ctx.fill();
    }
  }
  if (Enemy.cinematic.flash > 0) {
    ctx.fillStyle = "rgba(190, 24, 36, " + (Enemy.cinematic.flash / 24) + ")";
    ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);
  }
  if (Game.hitTint > 0) {
    ctx.fillStyle = "rgba(210, 20, 45, 0.22)"; ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);
    ctx.fillStyle = "rgba(30, 160, 255, 0.13)"; ctx.fillRect(Game.hitTint % 3, 0, 3, CONFIG.CANVAS_H);
  }
  if (Game.bossFlicker > 0) {
    ctx.fillStyle = "rgba(255, 255, 255, " + (Game.bossFlicker / 80) + ")"; ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);
  }
  if (Game.levelTime < 300 && Game.mode === "playing") {
    var vignette = ctx.createRadialGradient(CONFIG.CANVAS_W / 2, CONFIG.CANVAS_H / 2, 90, CONFIG.CANVAS_W / 2, CONFIG.CANVAS_H / 2, 500);
    vignette.addColorStop(0, "rgba(190, 24, 36, 0)"); vignette.addColorStop(1, "rgba(190, 24, 36, 0.42)");
    ctx.fillStyle = vignette; ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);
  }
  var edgeVignette = ctx.createRadialGradient(CONFIG.CANVAS_W / 2, CONFIG.CANVAS_H / 2, 130, CONFIG.CANVAS_W / 2, CONFIG.CANVAS_H / 2, 520);
  edgeVignette.addColorStop(0, "rgba(0, 0, 0, 0)"); edgeVignette.addColorStop(1, "rgba(0, 0, 0, 0.18)");
  ctx.fillStyle = edgeVignette; ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);
  if (Game.introTimer > 0) {
    var introProgress = 1 - Game.introTimer / 95;
    var introX = -260 + Math.min(1, introProgress * 1.7) * (CONFIG.CANVAS_W / 2 + 260);
    ctx.fillStyle = "rgba(24, 33, 43, 0.88)"; ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);
    ctx.fillStyle = "#ffcf56"; ctx.textAlign = "center"; ctx.font = "bold 26px monospace";
    ctx.fillText(Level.name, introX, CONFIG.CANVAS_H / 2);
    ctx.font = "12px monospace"; ctx.fillStyle = "#fffdf8"; ctx.fillText(Game.endless ? "ENDLESS WAVE" : "READY", introX, CONFIG.CANVAS_H / 2 + 28);
    ctx.textAlign = "left";
  }
  Draw.hud();
};
Draw.hud = function () {
  var ctx = Draw.ctx;
  var levelHud = document.getElementById("level-hud");
  var timerHud = document.getElementById("timer-hud");
  var weaponHud = document.getElementById("weapon-hud");
  var comboHud = document.getElementById("combo-hud");
  var scoreHud = document.getElementById("score-hud");
  var healthHud = document.getElementById("health-hud");
  var dashHud = document.getElementById("dash-hud");
  var enemyHud = document.getElementById("enemy-hud");
  var pauseButton = document.getElementById("pause-button");
  if (levelHud) { levelHud.textContent = "LEVEL " + (Game.levelNumber + 1) + " · " + Level.name; }
  if (timerHud) { timerHud.textContent = "TIME " + Math.max(0, Math.ceil(Game.levelTime / 60)); }
  if (weaponHud) {
    var weaponText = "WEAPON: NONE";
    if (Player.weaponType === "shotgun") { weaponText = "WEAPON: SHOTGUN " + Player.ammo; }
    else if (Player.weaponType === "laser") { weaponText = "WEAPON: LASER " + Player.ammo; }
    else if (Player.weaponType === "grenade") { weaponText = "WEAPON: GRENADE " + Player.ammo; }
    else if (Player.weaponType === "homing") { weaponText = "WEAPON: HOMING " + Player.ammo; }
    else if (Player.weaponType === "burst") { weaponText = "WEAPON: BURST " + Player.ammo; }
    else if (Player.weaponType === "boomerang") { weaponText = "WEAPON: BOOMERANG " + Player.ammo; }
    else if (Player.gunLevel > 2) { weaponText = "WEAPON: ULTRA " + Math.ceil(Player.weaponTimer / 60) + "s"; }
    else if (Player.gunLevel > 1) { weaponText = "WEAPON: HEAVY " + Math.ceil(Player.weaponTimer / 60) + "s"; }
    else if (Player.hasGun) { weaponText = "WEAPON: SIDEARM " + Player.ammo; }
    weaponHud.textContent = weaponText;
    if (Player.invincible && !Player.secretInvincibility) { weaponHud.textContent += " · SHIELD " + Math.ceil(Player.invincibleTimer / 60) + "s"; }
  }
  if (healthHud) { healthHud.textContent = "HEALTH " + Player.health + "/" + Player.maxHealth; }
  if (dashHud) { dashHud.textContent = Player.dashing ? "DASHING" : (Player.dashCooldown > 0 ? "DASH " + Math.ceil(Player.dashCooldown / 60) + "s" : "DASH READY"); }
  if (comboHud) { comboHud.textContent = Game.combo > 1 ? "COMBO x" + Game.combo : "COMBO 0"; }
  if (scoreHud) { scoreHud.textContent = "SCORE " + (Game.score || 0) + " · BEST " + (Game.highScore || 0); }
  if (enemyHud) { enemyHud.textContent = Enemy.boss ? "BOSS " + Enemy.boss.health + "/" + CONFIG.BOSS_HEALTH : "ENEMIES " + Enemy.list.length; }
  if (pauseButton) { pauseButton.textContent = Game.mode === "paused" ? "RESUME [P]" : "PAUSE [P]"; }
  var gambleButton = document.getElementById("gamble-button");
  if (gambleButton) { gambleButton.disabled = Game.gambleUsed || Game.mode !== "playing"; }
  if (Player.gambleEffect && weaponHud) { weaponHud.textContent += " · " + Player.gambleEffect; }
  if (Game.mode === "dead" || Game.mode === "won") {
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
  if (Game.mode === "paused") {
    ctx.fillStyle = "rgba(24, 33, 43, 0.72)";
    ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);
    ctx.fillStyle = "#ffcf56";
    ctx.textAlign = "center";
    ctx.font = "bold 34px monospace";
    ctx.fillText("PAUSED", CONFIG.CANVAS_W / 2, 175);
    ctx.font = "14px monospace";
    ctx.fillStyle = "#fffdf8";
    ctx.fillText("Press P or Resume to continue", CONFIG.CANVAS_W / 2, 205);
    ctx.textAlign = "left";
  }
  if (Enemy.cinematic.banner > 0) {
    ctx.fillStyle = "rgba(190, 24, 36, " + Math.min(0.8, Enemy.cinematic.banner / 35) + ")";
    ctx.textAlign = "center";
    ctx.font = "bold 18px monospace";
    ctx.fillText("ENEMY DOWN", CONFIG.CANVAS_W / 2, 42);
    ctx.textAlign = "left";
  }
  if (Game.chaosType) {
    ctx.fillStyle = "#ffcf56";
    ctx.textAlign = "center";
    ctx.font = "bold 13px monospace";
    ctx.fillText("CHAOS: " + Game.chaosType, CONFIG.CANVAS_W / 2, CONFIG.CANVAS_H - 14);
    ctx.textAlign = "left";
  }
  if (Game.combo > 1) {
    ctx.fillStyle = "rgba(217, 75, 50, " + Math.min(0.18, Game.combo * 0.025) + ")";
    ctx.fillRect(0, 0, CONFIG.CANVAS_W, 8);
    ctx.fillRect(0, CONFIG.CANVAS_H - 8, CONFIG.CANVAS_W, 8);
  }
};
Draw.world = function () {
  var size = CONFIG.TILE, firstCol = Math.floor(Draw.cameraX / size) - 1, lastCol = firstCol + Math.ceil(CONFIG.CANVAS_W / size) + 2;
  for (var row = 0; row < CONFIG.ROWS; row++) {
    for (var col = firstCol; col <= lastCol; col++) {
      var here = Level.charAt(col, row), x = col * size, y = row * size;
      if (here === "#") { Draw.block(x, y, size); }
      if (here === "C" && Level.isSolid(col, row)) { Draw.block(x, y, size); }
      if (here === "M") { Draw.movingPlatform(x, y, size * 3); }
      if (here === "^") { Draw.spike(x, y, size); }
      if (here === "~") { Draw.lava(x, y, size); }
      if (here === "F") { Draw.finish(x, y, size); }
    }
  }
};
Draw.block = function (x, y, size) { var ctx = Draw.ctx; ctx.fillStyle = "#ffffff"; ctx.fillRect(x, y, size, size); ctx.strokeStyle = "#000000"; ctx.lineWidth = CONFIG.LINE_WIDTH; ctx.strokeRect(x + CONFIG.LINE_WIDTH / 2, y + CONFIG.LINE_WIDTH / 2, size - CONFIG.LINE_WIDTH, size - CONFIG.LINE_WIDTH); };
Draw.movingPlatform = function (x, y, width) { var ctx = Draw.ctx; var platform = null; for (var i = 0; i < Level.movingPlatforms.length; i++) { if (Level.movingPlatforms[i].baseX === x) { platform = Level.movingPlatforms[i]; break; } } if (!platform) { return; } ctx.fillStyle = "#59636b"; ctx.fillRect(platform.x, platform.y, width, 12); ctx.strokeStyle = "#000000"; ctx.lineWidth = CONFIG.LINE_WIDTH; ctx.strokeRect(platform.x, platform.y, width, 12); };
Draw.spike = function (x, y, size) { var ctx = Draw.ctx; var gleam = (Math.sin(Game.frame / 8 + x / 20) + 1) * 0.5; ctx.fillStyle = "#000000"; ctx.beginPath(); ctx.moveTo(x, y + size); ctx.lineTo(x + size / 2, y); ctx.lineTo(x + size, y + size); ctx.closePath(); ctx.fill(); ctx.strokeStyle = "rgba(255, 255, 255, " + (gleam * 0.7) + ")"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + size / 2, y + 4); ctx.lineTo(x + size * 0.72, y + size - 6); ctx.stroke(); };
Draw.lava = function (x, y, size) { var ctx = Draw.ctx; var wave = Math.sin(Game.frame / 7 + x / 16) * 3; ctx.fillStyle = "#d94b32"; ctx.fillRect(x, y, size, size); ctx.fillStyle = "#ffcf56"; ctx.fillRect(x + 4, y + 8 + wave, size - 8, 5); ctx.beginPath(); ctx.arc(x + 10 + Math.sin(Game.frame / 12 + x) * 3, y + 10 + wave, 3, 0, Math.PI * 2); ctx.arc(x + 28 + Math.sin(Game.frame / 10 + x) * 2, y + 20 - wave, 2, 0, Math.PI * 2); ctx.fill(); };
Draw.finish = function (x, y, size) { var ctx = Draw.ctx; var wave = Math.sin(Game.frame / 10 + x / 20) * 4; ctx.fillStyle = "#000000"; ctx.fillRect(x + size / 2 - 2, y, 4, size); ctx.beginPath(); ctx.moveTo(x + size / 2 + 2, y + 4); ctx.lineTo(x + size - 4 + wave, y + 12); ctx.lineTo(x + size / 2 + 2, y + 20); ctx.closePath(); ctx.fill(); };
Draw.player = function () {
  var ctx = Draw.ctx, r = CONFIG.PLAYER_RADIUS, centerX = Player.x + CONFIG.PLAYER_SIZE / 2, centerY = Player.y + CONFIG.PLAYER_SIZE / 2;
  ctx.save(); ctx.translate(centerX, centerY); ctx.scale(Player.scaleX, Player.scaleY);
  ctx.fillStyle = "#ffffff"; ctx.strokeStyle = "#000000"; ctx.lineWidth = CONFIG.LINE_WIDTH; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  var dotX = centerX + Math.cos(Player.aimAngle) * r * CONFIG.DOT_DISTANCE, dotY = centerY + Math.sin(Player.aimAngle) * r * CONFIG.DOT_DISTANCE;
  ctx.fillStyle = "#000000"; ctx.beginPath(); ctx.arc(Math.cos(Player.aimAngle) * r * CONFIG.DOT_DISTANCE, Math.sin(Player.aimAngle) * r * CONFIG.DOT_DISTANCE, 4, 0, Math.PI * 2); ctx.fill();
  if (Player.hasGun) {
    ctx.rotate(Player.aimAngle);
    ctx.fillRect(8, -3, 14, 6);
    if (Player.gunLevel > 1) { ctx.fillRect(8, 5, 14, 4); }
    if (Player.gunLevel > 2) { ctx.fillRect(18, -8, 8, 16); }
  }
  ctx.restore();
  if (Player.invincible && !Player.secretInvincibility) {
    ctx.strokeStyle = "#ffcf56";
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(centerX, centerY, r + 7, 0, Math.PI * 2); ctx.stroke();
  }
  if (Player.dashing) {
    ctx.strokeStyle = "#d94b32";
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(centerX, centerY, r + 10, 0, Math.PI * 2); ctx.stroke();
  }
};
