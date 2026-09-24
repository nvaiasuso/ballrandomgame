/* =====================================================================
   player.js  --  THE ROLLING CIRCLE.
   ===================================================================== */

var Player = {
  x: 0, y: 0, vx: 0, vy: 0, onGround: false, angle: 0, aimAngle: 0,
  hasGun: false, shootCooldown: 0
};

Player.reset = function () {
  Player.x = Level.startX; Player.y = Level.startY; Player.vx = 0; Player.vy = 0;
  Player.onGround = false; Player.angle = 0; Player.aimAngle = 0;
  Player.hasGun = false; Player.shootCooldown = 0;
};

Player.update = function () {
  var size = CONFIG.PLAYER_SIZE;
  var centerX = Player.x + size / 2, centerY = Player.y + size / 2;
  var aimX = Input.mouseX - centerX, aimY = Input.mouseY - centerY;
  if (aimX !== 0 || aimY !== 0) { Player.aimAngle = Math.atan2(aimY, aimX); }
  Player.vx = 0;
  if (Input.left) { Player.vx = -CONFIG.MOVE_SPEED; }
  if (Input.right) { Player.vx = CONFIG.MOVE_SPEED; }
  if (Input.jump && Player.onGround) { Player.vy = -CONFIG.JUMP_POWER; Player.onGround = false; }
  Player.vy += CONFIG.GRAVITY;
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
  if (Player.hasGun && (Input.shoot || Input.mouseDown) && Player.shootCooldown === 0) {
    Enemy.firePlayerBullet(); Player.shootCooldown = CONFIG.PLAYER_SHOOT_COOLDOWN;
  }
};

Player.isDead = function () {
  return Collide.hitsSpike(Player.x, Player.y, CONFIG.PLAYER_SIZE, CONFIG.PLAYER_SIZE) ||
         Player.y > CONFIG.CANVAS_H + 200;
};
Player.hasWon = function () {
  return Collide.hitsFinish(Player.x, Player.y, CONFIG.PLAYER_SIZE, CONFIG.PLAYER_SIZE);
};
