/* =====================================================================
   player.js  --  THE ROLLING CIRCLE.
   ===================================================================== */

var Player = {
  x: 0, y: 0, vx: 0, vy: 0, onGround: false, angle: 0, aimAngle: 0,
  hasGun: false, gunLevel: 0, weaponTimer: 0, invincible: false, invincibleTimer: 0, shootCooldown: 0,
  speedMultiplier: 1, jumpMultiplier: 1, gravityMultiplier: 1, damageMultiplier: 1, gambleEffect: ""
};

Player.reset = function () {
  Player.x = Level.startX; Player.y = Level.startY; Player.vx = 0; Player.vy = 0;
  Player.onGround = false; Player.angle = 0; Player.aimAngle = 0;
  Player.hasGun = false; Player.gunLevel = 0; Player.weaponTimer = 0;
  Player.invincible = false; Player.invincibleTimer = 0; Player.shootCooldown = 0;
  Player.speedMultiplier = 1; Player.jumpMultiplier = 1; Player.gravityMultiplier = 1;
  Player.damageMultiplier = 1; Player.gambleEffect = "";
};

Player.update = function () {
  var size = CONFIG.PLAYER_SIZE;
  var centerX = Player.x + size / 2, centerY = Player.y + size / 2;
  var aimX = Input.mouseX - centerX, aimY = Input.mouseY - centerY;
  if (aimX !== 0 || aimY !== 0) { Player.aimAngle = Math.atan2(aimY, aimX); }
  Player.vx = 0;
  if (Input.left) { Player.vx = -CONFIG.MOVE_SPEED * Player.speedMultiplier; }
  if (Input.right) { Player.vx = CONFIG.MOVE_SPEED * Player.speedMultiplier; }
  if (Input.jump && Player.onGround) { Player.vy = -CONFIG.JUMP_POWER * Player.jumpMultiplier; Player.onGround = false; }
  Player.vy += CONFIG.GRAVITY * Player.gravityMultiplier;
    damage: (Player.gunLevel > 1 ? 2 : 1) * Player.damageMultiplier
  if (Player.vy > CONFIG.MAX_FALL) { Player.vy = CONFIG.MAX_FALL; }

  var stepX = Player.vx > 0 ? 1 : (Player.vx < 0 ? -1 : 0);
  for (var i = 0; i < Math.abs(Player.vx); i++) {
    if (Collide.hitsSolid(Player.x + stepX, Player.y, size, size)) { break; }
    Player.x += stepX; Player.angle += stepX / CONFIG.PLAYER_RADIUS;
  }
  var stepY = Player.vy > 0 ? 1 : (Player.vy < 0 ? -1 : 0);
  Player.onGround = false;
  for (var j = 0; j < Math.abs(Player.vy); j++) {
    if (Collide.hitsSolid(Player.x, Player.y + stepY, size, size)) {
      if (stepY > 0) { Player.onGround = true; }
      Player.vy = 0; break;
    }
    Player.y += stepY;
  }
  if (Player.x < 0) { Player.x = 0; }

  if (Player.shootCooldown > 0) { Player.shootCooldown--; }
  if (Player.weaponTimer > 0) {
    Player.weaponTimer--;
    if (Player.weaponTimer === 0 && Player.gunLevel > 1) { Player.gunLevel = 1; }
  }
  if (Player.invincibleTimer > 0) {
    Player.invincibleTimer--;
    if (Player.invincibleTimer === 0) { Player.invincible = false; }
  }
  if (Player.hasGun && (Input.shoot || Input.mouseDown) && Player.shootCooldown === 0) {
    Enemy.firePlayerBullet(); Player.shootCooldown = Player.gunLevel > 2 ? 7 : CONFIG.PLAYER_SHOOT_COOLDOWN;
  }
};

Player.isDead = function () {
  return !Player.invincible && (Collide.hitsSpike(Player.x, Player.y, CONFIG.PLAYER_SIZE, CONFIG.PLAYER_SIZE) ||
         Collide.hitsLava(Player.x, Player.y, CONFIG.PLAYER_SIZE, CONFIG.PLAYER_SIZE) ||
         Player.y > CONFIG.CANVAS_H + 200);
};
Player.hasWon = function () {
  return !Enemy.boss && Collide.hitsFinish(Player.x, Player.y, CONFIG.PLAYER_SIZE, CONFIG.PLAYER_SIZE);
};
