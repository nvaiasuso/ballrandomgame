/* =====================================================================
   enemy.js -- enemies, enemy bullets, player bullets, and gun drops
   ===================================================================== */

var Enemy = {
  list: [],
  bullets: [],
  playerBullets: [],
  pickups: []
};

Enemy.reset = function () {
  Enemy.list = [];
  Enemy.bullets = [];
  Enemy.playerBullets = [];
  Enemy.pickups = [];
  for (var row = 0; row < CONFIG.ROWS; row++) {
    for (var col = 0; col < Level.cols; col++) {
      if (Level.charAt(col, row) === "e") {
        Enemy.list.push({
          x: col * CONFIG.TILE, y: row * CONFIG.TILE, vy: 0,
          state: "patrol", timer: 0, dir: 1, alerted: false, shootTimer: 0
        });
        Enemy.setTile(col, row, ".");
      }
    }
  }
};

Enemy.setTile = function (col, row, character) {
  var line = Level.grid[row];
  Level.grid[row] = line.substring(0, col) + character + line.substring(col + 1);
};

Enemy.physics = function (e) {
  var size = CONFIG.ENEMY_SIZE;
  var aheadX = e.x + e.dir * CONFIG.ENEMY_SPEED;
  if (Collide.hitsSolid(aheadX, e.y, size, size) &&
      !Collide.hitsSolid(aheadX, e.y - CONFIG.TILE, size, size)) {
    e.y -= CONFIG.TILE;
  }
  e.vy += CONFIG.GRAVITY;
  if (e.vy > CONFIG.MAX_FALL) { e.vy = CONFIG.MAX_FALL; }
  for (var step = 1; step <= Math.abs(e.vy); step++) {
    if (Collide.hitsSolid(e.x, e.y + step, size, size)) {
      e.vy = 0;
      break;
    }
    e.y += 1;
  }
};

// A falling player can defeat an enemy by landing on it.
Enemy.checkPlayerContact = function () {
  for (var i = Enemy.list.length - 1; i >= 0; i--) {
    var e = Enemy.list[i];
    if (Player.vy >= 0 && Player.x + CONFIG.PLAYER_SIZE > e.x &&
        Player.x < e.x + CONFIG.ENEMY_SIZE &&
        Player.y + CONFIG.PLAYER_SIZE > e.y && Player.y < e.y + CONFIG.ENEMY_SIZE) {
      Player.y = e.y - CONFIG.PLAYER_SIZE;
      Player.vy = -CONFIG.JUMP_POWER * 0.55;
      Enemy.kill(i);
    }
  }
};

Enemy.kill = function (index) {
  var e = Enemy.list[index];
  Enemy.pickups.push({ x: e.x + CONFIG.ENEMY_SIZE / 2 - 10, y: e.y + 4, size: 20 });
  Enemy.list.splice(index, 1);
};

Enemy.collectPickups = function () {
  for (var i = Enemy.pickups.length - 1; i >= 0; i--) {
    var p = Enemy.pickups[i];
    if (Player.x + CONFIG.PLAYER_SIZE > p.x && Player.x < p.x + p.size &&
        Player.y + CONFIG.PLAYER_SIZE > p.y && Player.y < p.y + p.size) {
      Player.hasGun = true;
      Enemy.pickups.splice(i, 1);
      Game.showMessage("Gun collected! Press X or K to fire.");
    }
  }
};

Enemy.firePlayerBullet = function () {
  var direction = Player.vx < 0 ? -1 : 1;
  Enemy.playerBullets.push({
    x: Player.x + (direction > 0 ? CONFIG.PLAYER_SIZE : -8),
    y: Player.y + CONFIG.PLAYER_SIZE / 2 - 4,
    vx: direction * CONFIG.PLAYER_BULLET_SPEED,
    vy: 0
  });
};

Enemy.updatePlayerBullets = function () {
  for (var b = Enemy.playerBullets.length - 1; b >= 0; b--) {
    var bullet = Enemy.playerBullets[b];
    bullet.x += bullet.vx;
    bullet.y += bullet.vy;
    var hit = false;
    for (var i = Enemy.list.length - 1; i >= 0; i--) {
      var e = Enemy.list[i];
      if (bullet.x + 8 > e.x && bullet.x < e.x + CONFIG.ENEMY_SIZE &&
          bullet.y + 8 > e.y && bullet.y < e.y + CONFIG.ENEMY_SIZE) {
        Enemy.kill(i);
        hit = true;
        break;
      }
    }
    if (hit || Collide.hitsSolid(bullet.x, bullet.y, 8, 8) ||
        bullet.x < 0 || bullet.x > Level.pixelWidth()) {
      Enemy.playerBullets.splice(b, 1);
    }
  }
};

Enemy.update = function () {
  Enemy.checkPlayerContact();
  for (var i = 0; i < Enemy.list.length; i++) {
    var e = Enemy.list[i];
    var canSee = Enemy.playerVisible(e);
    if (e.state === "patrol") {
      var nextX = e.x + e.dir * CONFIG.ENEMY_SPEED;
      var willFall = !Collide.hitsSolid(nextX, e.y + CONFIG.ENEMY_SIZE + 2, CONFIG.ENEMY_SIZE, 2);
      if (Collide.hitsSolid(nextX, e.y, CONFIG.ENEMY_SIZE, CONFIG.ENEMY_SIZE) || willFall) { e.dir = -e.dir; }
      else { e.x = nextX; }
      Enemy.physics(e);
      if (canSee || Enemy.playerNear(e)) { e.state = "question"; e.timer = 0; }
    } else if (e.state === "question") {
      e.timer = canSee ? e.timer + 1 : 0;
      if (e.timer >= CONFIG.SPOT_FRAMES) { e.state = "run"; if (!e.alerted) { e.alerted = true; Enemy.alertOthers(e); } }
      if (!canSee && !Enemy.playerNear(e)) { e.state = "patrol"; }
    } else if (e.state === "run") {
      if (Player.x < e.x) { e.x -= CONFIG.ENEMY_SPEED; }
      if (Player.x > e.x + CONFIG.ENEMY_SIZE) { e.x += CONFIG.ENEMY_SPEED; }
      Enemy.physics(e);
      e.shootTimer--;
      if (canSee && e.shootTimer <= 0) { Enemy.shoot(e); e.shootTimer = CONFIG.ENEMY_SHOOT_FRAMES; }
      if (!canSee && !Enemy.playerNear(e)) { e.state = "patrol"; }
    }
  }

  Enemy.updatePlayerBullets();
  Enemy.collectPickups();
  for (var b = Enemy.bullets.length - 1; b >= 0; b--) {
    var bullet = Enemy.bullets[b];
    bullet.x += bullet.vx; bullet.y += bullet.vy;
    if (Collide.hitsSolid(bullet.x, bullet.y, 8, 8) || bullet.x < 0 || bullet.x > Level.pixelWidth()) {
      Enemy.bullets.splice(b, 1);
    } else if (bullet.x + 8 > Player.x && bullet.x < Player.x + CONFIG.PLAYER_SIZE &&
               bullet.y + 8 > Player.y && bullet.y < Player.y + CONFIG.PLAYER_SIZE) {
      Enemy.bullets.splice(b, 1);
      Game.startLevel(Game.levelNumber);
    }
  }
};

Enemy.playerVisible = function (e) {
  if (Math.abs((e.y + CONFIG.ENEMY_SIZE / 2) - (Player.y + CONFIG.PLAYER_SIZE / 2)) > CONFIG.TILE * 2) { return false; }
  return Math.abs(Player.x - e.x) < CONFIG.SPOT_DISTANCE;
};
Enemy.playerNear = function (e) {
  var dx = Player.x - e.x, dy = Player.y - e.y;
  return dx * dx + dy * dy < CONFIG.HEAR_DISTANCE * CONFIG.HEAR_DISTANCE;
};
Enemy.alertOthers = function (spotter) {
  for (var i = 0; i < Enemy.list.length; i++) {
    var e = Enemy.list[i];
    if (e !== spotter && e.state === "patrol") { e.state = "question"; e.timer = CONFIG.SPOT_FRAMES - 1; e.alerted = true; }
  }
};
Enemy.shoot = function (e) {
  var ex = e.x + CONFIG.ENEMY_SIZE / 2, ey = e.y + CONFIG.ENEMY_SIZE / 2;
  var px = Player.x + CONFIG.PLAYER_SIZE / 2 + Player.vx * CONFIG.LEAD_FRAMES, py = Player.y + CONFIG.PLAYER_SIZE / 2;
  var dx = px - ex, dy = py - ey, dist = Math.sqrt(dx * dx + dy * dy);
  if (dist === 0) { return; }
  Enemy.bullets.push({ x: ex - 4, y: ey - 4, vx: dx / dist * CONFIG.BULLET_SPEED, vy: dy / dist * CONFIG.BULLET_SPEED });
};

Enemy.draw = function () {
  var ctx = Draw.ctx;
  for (var i = 0; i < Enemy.list.length; i++) {
    var e = Enemy.list[i];
    ctx.beginPath(); ctx.arc(e.x + CONFIG.ENEMY_SIZE / 2, e.y + CONFIG.ENEMY_SIZE / 2, CONFIG.ENEMY_SIZE / 2, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff"; ctx.fill(); ctx.lineWidth = CONFIG.LINE_WIDTH; ctx.strokeStyle = "#000000"; ctx.stroke();
    if (e.state === "question" || e.state === "run") {
      ctx.fillStyle = "#000000"; ctx.beginPath(); ctx.arc(e.x + CONFIG.ENEMY_SIZE / 2 + e.dir * 6, e.y + CONFIG.ENEMY_SIZE / 2, 4, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.fillStyle = "#000000";
  for (var p = 0; p < Enemy.pickups.length; p++) {
    var pickup = Enemy.pickups[p];
    ctx.fillRect(pickup.x, pickup.y, pickup.size, pickup.size);
    ctx.fillStyle = "#ffffff"; ctx.fillRect(pickup.x + 4, pickup.y + 7, 12, 6); ctx.fillStyle = "#000000";
  }
  for (var b = 0; b < Enemy.bullets.length; b++) { ctx.fillRect(Enemy.bullets[b].x, Enemy.bullets[b].y, 8, 8); }
  for (var pb = 0; pb < Enemy.playerBullets.length; pb++) { ctx.fillRect(Enemy.playerBullets[pb].x, Enemy.playerBullets[pb].y, 8, 8); }
};
