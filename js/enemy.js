/* =====================================================================
   enemy.js -- enemies, enemy bullets, player bullets, and gun drops
   ===================================================================== */

var Enemy = {
  list: [],
  bullets: [],
  playerBullets: [],
  pickups: [],
  hazards: [],
  boss: null,
  deadBodies: [],
  effects: [],
  cinematic: { flash: 0, shake: 0, banner: 0 }
};

Enemy.reset = function () {
  Enemy.list = [];
  Enemy.bullets = [];
  Enemy.playerBullets = [];
  Enemy.pickups = [];
  Enemy.hazards = [];
  Enemy.boss = null;
  Enemy.deadBodies = [];
  Enemy.effects = [];
  Enemy.cinematic = { flash: 0, shake: 0, banner: 0 };
  for (var row = 0; row < CONFIG.ROWS; row++) {
    for (var col = 0; col < Level.cols; col++) {
      var enemyType = CONFIG.ENEMY_TYPES[Level.charAt(col, row)];
      if (enemyType) {
        Enemy.list.push({
          x: col * CONFIG.TILE, y: row * CONFIG.TILE, vy: 0,
          state: "patrol", timer: 0, dir: 1, onGround: false,
          alerted: false, shootTimer: enemyType.shootFrames, health: enemyType.health,
          maxHealth: enemyType.health, speed: enemyType.speed, shootFrames: enemyType.shootFrames,
          bulletSpeed: enemyType.bulletSpeed, type: Level.charAt(col, row), color: enemyType.color,
          flying: !!enemyType.flying
        });
        Enemy.setTile(col, row, ".");
      }
      if (Level.charAt(col, row) === "B") {
        Enemy.boss = {
          x: col * CONFIG.TILE, y: row * CONFIG.TILE, homeX: col * CONFIG.TILE, homeY: row * CONFIG.TILE, vy: 0,
          arenaMinX: col * CONFIG.TILE - CONFIG.TILE * 3,
          arenaMaxX: (col + 5) * CONFIG.TILE - CONFIG.BOSS_SIZE,
          dir: -1, onGround: false, health: CONFIG.BOSS_HEALTH,
           attackTimer: CONFIG.BOSS_ATTACK_FRAMES, spawnTimer: CONFIG.BOSS_SPAWN_FRAMES, attackPhase: 0
        };
        Enemy.setTile(col, row, ".");
      }
      if (Level.charAt(col, row) === "G") {
        Enemy.pickups.push({ x: col * CONFIG.TILE + 10, y: row * CONFIG.TILE + 8, size: 20, level: 3 });
        Enemy.setTile(col, row, ".");
      }
      if (Level.charAt(col, row) === "I") {
        Enemy.pickups.push({ x: col * CONFIG.TILE + 10, y: row * CONFIG.TILE + 8, size: 20, type: "invincibility" });
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
  if (e.flying) { return; }
  var size = CONFIG.ENEMY_SIZE;
  var aheadX = e.x + e.dir * e.speed;
  if (Collide.hitsSolid(aheadX, e.y, size, size) &&
      !Collide.hitsSolid(aheadX, e.y - CONFIG.TILE, size, size)) {
    e.y -= CONFIG.TILE;
  }
  e.vy += CONFIG.GRAVITY;
  if (e.vy > CONFIG.MAX_FALL) { e.vy = CONFIG.MAX_FALL; }
  e.onGround = false;
  var stepY = e.vy > 0 ? 1 : (e.vy < 0 ? -1 : 0);
  for (var step = 0; step < Math.abs(e.vy); step++) {
    if (Collide.hitsSolid(e.x, e.y + stepY, size, size)) {
      if (e.vy > 0) { e.onGround = true; }
      e.vy = 0;
      break;
    }
    e.y += stepY;
  }
};

Enemy.chase = function (e) {
  var targetX = Player.x + CONFIG.PLAYER_SIZE / 2;
  var enemyCenterX = e.x + CONFIG.ENEMY_SIZE / 2;
  e.dir = targetX < enemyCenterX ? -1 : 1;
  if (e.flying) {
    var targetY = Player.y + CONFIG.PLAYER_SIZE / 2;
    var dx = targetX - enemyCenterX;
    var dy = targetY - (e.y + CONFIG.ENEMY_SIZE / 2);
    var distance = Math.sqrt(dx * dx + dy * dy) || 1;
    var flyingX = e.x + dx / distance * e.speed;
    var flyingY = e.y + dy / distance * e.speed;
    if (!Collide.hitsSolid(flyingX, flyingY, CONFIG.ENEMY_SIZE, CONFIG.ENEMY_SIZE)) {
      e.x = flyingX;
      e.y = flyingY;
    }
    return;
  }
  var nextX = e.x + e.dir * e.speed;
  var blocked = Collide.hitsSolid(nextX, e.y, CONFIG.ENEMY_SIZE, CONFIG.ENEMY_SIZE);
  var edge = !Collide.hitsSolid(nextX, e.y + CONFIG.ENEMY_SIZE + 2, CONFIG.ENEMY_SIZE, 2);
  if (blocked) {
    if (e.onGround && !Collide.hitsSolid(e.x, e.y - CONFIG.TILE, CONFIG.ENEMY_SIZE, CONFIG.ENEMY_SIZE)) {
      e.vy = -CONFIG.JUMP_POWER * 0.8;
    }
    return;
  }
  if (edge && e.onGround) {
    e.vy = -CONFIG.JUMP_POWER * (e.type === "h" ? 1.2 : 0.9);
    return;
  }
  e.x = nextX;
};

// A falling player can defeat an enemy by landing on it.
Enemy.checkPlayerContact = function () {
  if (Player.invincible) { return; }
  for (var i = Enemy.list.length - 1; i >= 0; i--) {
    var e = Enemy.list[i];
    var overlaps = Player.x + CONFIG.PLAYER_SIZE > e.x && Player.x < e.x + CONFIG.ENEMY_SIZE &&
      Player.y + CONFIG.PLAYER_SIZE > e.y && Player.y < e.y + CONFIG.ENEMY_SIZE;
    if (overlaps && Player.vy >= 0 && Player.y + CONFIG.PLAYER_SIZE - e.y < CONFIG.TILE / 2) {
      Player.y = e.y - CONFIG.PLAYER_SIZE;
      Player.vy = -CONFIG.JUMP_POWER * 0.55;
      Enemy.kill(i);
    } else if (overlaps) {
      Game.die("An enemy caught you.");
      return;
    }
  }
};

Enemy.kill = function (index) {
  var e = Enemy.list[index];
  if (!e || e.dead) { return; }
  e.dead = true;
  var upgradeTypes = ["b", "m", "w", "q", "f"];
  var level = upgradeTypes.indexOf(e.type) >= 0 ? 2 : 1;
  if (e.type === "v" || e.type === "r") { level = 2; }
  Enemy.pickups.push({ x: e.x + CONFIG.ENEMY_SIZE / 2 - 10, y: e.y + 4, size: 20, level: level });
  Enemy.deadBodies.push({ x: e.x - 4, y: e.y + CONFIG.ENEMY_SIZE - 11, width: CONFIG.ENEMY_SIZE + 8, color: e.color || "#ffffff", dir: e.dir });
  for (var burst = 0; burst < 12; burst++) {
    Enemy.effects.push({ x: e.x + CONFIG.ENEMY_SIZE / 2, y: e.y + CONFIG.ENEMY_SIZE / 2, vx: (Math.random() - 0.5) * 7, vy: (Math.random() - 0.8) * 7, life: 28 });
  }
  Enemy.cinematic.flash = 8;
  Enemy.cinematic.shake = 7;
  Enemy.cinematic.banner = 45;
  for (var retreatIndex = 0; retreatIndex < Enemy.list.length; retreatIndex++) {
    var survivor = Enemy.list[retreatIndex];
    if (survivor !== e && !survivor.dead) {
      survivor.retreatTimer = 42;
      survivor.retreatX = e.x;
      survivor.state = "run";
      survivor.alerted = true;
    }
  }
  Enemy.list.splice(index, 1);
};

Enemy.updateEffects = function () {
  for (var i = Enemy.effects.length - 1; i >= 0; i--) {
    var effect = Enemy.effects[i];
    effect.x += effect.vx; effect.y += effect.vy; effect.vy += 0.25; effect.life--;
    if (effect.life <= 0) { Enemy.effects.splice(i, 1); }
  }
  if (Enemy.cinematic.flash > 0) { Enemy.cinematic.flash--; }
  if (Enemy.cinematic.shake > 0) { Enemy.cinematic.shake--; }
  if (Enemy.cinematic.banner > 0) { Enemy.cinematic.banner--; }
};

Enemy.damage = function (index) {
  var e = Enemy.list[index];
  if (!e || e.dead) { return; }
  e.health -= arguments[1] || 1;
  e.alerted = true;
  e.state = "run";
  e.timer = 0;
  if (e.health <= 0) { Enemy.kill(index); }
};

Enemy.collectPickups = function () {
  for (var i = Enemy.pickups.length - 1; i >= 0; i--) {
    var p = Enemy.pickups[i];
    if (Player.x + CONFIG.PLAYER_SIZE > p.x && Player.x < p.x + p.size &&
        Player.y + CONFIG.PLAYER_SIZE > p.y && Player.y < p.y + p.size) {
      if (p.type === "invincibility") {
        Player.invincibleTimer = CONFIG.INVINCIBILITY_TIME;
        Player.invincible = true;
        Game.showMessage("INVINCIBILITY acquired! You have 6 seconds.");
      } else {
        Player.hasGun = true;
        if (p.level > Player.gunLevel) { Player.gunLevel = p.level; }
        Player.weaponTimer = p.level > 2 ? CONFIG.GUN_ULTRA_TIME : CONFIG.GUN_UPGRADE_TIME;
        Game.showMessage(p.level > 2 ? "Ultra gun acquired!" : "Heavy gun acquired!");
      }
      Enemy.pickups.splice(i, 1);
    }
  }
};

Enemy.firePlayerBullet = function () {
  var angle = Player.aimAngle;
  var directionX = Math.cos(angle), directionY = Math.sin(angle);
  var centerX = Player.x + CONFIG.PLAYER_SIZE / 2;
  var centerY = Player.y + CONFIG.PLAYER_SIZE / 2;
  Enemy.playerBullets.push({
    x: centerX + directionX * CONFIG.PLAYER_RADIUS - 4,
    y: centerY + directionY * CONFIG.PLAYER_RADIUS - 4,
    vx: directionX * CONFIG.PLAYER_BULLET_SPEED,
    vy: directionY * CONFIG.PLAYER_BULLET_SPEED,
    damage: Player.gunLevel > 1 ? 2 : 1
  });
};

Enemy.updatePlayerBullets = function () {
  for (var b = Enemy.playerBullets.length - 1; b >= 0; b--) {
    var bullet = Enemy.playerBullets[b];
    bullet.x += bullet.vx;
    bullet.y += bullet.vy;
    var hit = false;
    if (Enemy.boss && bullet.x + 8 > Enemy.boss.x && bullet.x < Enemy.boss.x + CONFIG.BOSS_SIZE &&
        bullet.y + 8 > Enemy.boss.y && bullet.y < Enemy.boss.y + CONFIG.BOSS_SIZE) {
      Enemy.damageBoss(bullet.damage);
      Enemy.playerBullets.splice(b, 1);
      continue;
    }
    for (var i = Enemy.list.length - 1; i >= 0; i--) {
      var e = Enemy.list[i];
      if (e.dead) { continue; }
      if (bullet.x + 8 > e.x && bullet.x < e.x + CONFIG.ENEMY_SIZE &&
          bullet.y + 8 > e.y && bullet.y < e.y + CONFIG.ENEMY_SIZE) {
        Enemy.damage(i, bullet.damage);
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
  Enemy.updateEffects();
  Enemy.checkPlayerContact();
  for (var i = 0; i < Enemy.list.length; i++) {
    var e = Enemy.list[i];
    if (e.dead) { continue; }
    var canSee = Enemy.playerVisible(e);
    if (e.state === "patrol") {
      var nextX = e.x + e.dir * e.speed;
      var willFall = !Collide.hitsSolid(nextX, e.y + CONFIG.ENEMY_SIZE + 2, CONFIG.ENEMY_SIZE, 2);
      if (Collide.hitsSolid(nextX, e.y, CONFIG.ENEMY_SIZE, CONFIG.ENEMY_SIZE) || willFall) { e.dir = -e.dir; }
      else { e.x = nextX; }
      Enemy.physics(e);
      if (canSee || Enemy.playerNear(e)) {
        e.state = "run";
        e.alerted = true;
        Enemy.alertOthers(e);
      }
    } else if (e.state === "question") {
      e.dir = Player.x < e.x ? -1 : 1;
      Enemy.physics(e);
      if (e.alerted) {
        e.state = "run";
      } else {
        e.timer = canSee ? e.timer + 1 : 0;
        if (e.timer >= CONFIG.SPOT_FRAMES) {
          e.state = "run";
          e.alerted = true;
          Enemy.alertOthers(e);
        }
        if (!canSee && !Enemy.playerNear(e)) { e.state = "patrol"; }
      }
    } else if (e.state === "run") {
      if (e.retreatTimer > 0) {
        var retreatDirection = e.x < e.retreatX ? -1 : 1;
        var retreatX = e.x + retreatDirection * e.speed;
        if (!Collide.hitsSolid(retreatX, e.y, CONFIG.ENEMY_SIZE, CONFIG.ENEMY_SIZE)) { e.x = retreatX; }
        e.retreatTimer--;
      } else {
        Enemy.chase(e);
      }
      Enemy.physics(e);
      e.shootTimer--;
      var dx = Player.x - e.x;
      var dy = Player.y - e.y;
      var distance = Math.sqrt(dx * dx + dy * dy);
      if (canSee && distance <= CONFIG.ENEMY_SHOOT_DISTANCE && e.shootTimer <= 0) {
        Enemy.shoot(e); e.shootTimer = e.shootFrames;
      }
    }
  }

  Enemy.updateBoss();
  Enemy.updatePlayerBullets();
  Enemy.collectPickups();
  Enemy.updateHazards();
  for (var b = Enemy.bullets.length - 1; b >= 0; b--) {
    var bullet = Enemy.bullets[b];
    bullet.x += bullet.vx; bullet.y += bullet.vy;
    if (Collide.hitsSolid(bullet.x, bullet.y, 8, 8) || bullet.x < 0 || bullet.x > Level.pixelWidth()) {
      Enemy.bullets.splice(b, 1);
    } else if (!Player.invincible && bullet.x + 8 > Player.x && bullet.x < Player.x + CONFIG.PLAYER_SIZE &&
               bullet.y + 8 > Player.y && bullet.y < Player.y + CONFIG.PLAYER_SIZE) {
      Enemy.bullets.splice(b, 1);
      Game.die("You were shot.");
    }
  }
};

Enemy.bossPhysics = function () {
  if (!Enemy.boss) { return; }
  var boss = Enemy.boss;
  boss.vy += CONFIG.GRAVITY;
  if (boss.vy > CONFIG.MAX_FALL) { boss.vy = CONFIG.MAX_FALL; }
  boss.onGround = false;
  var stepY = boss.vy > 0 ? 1 : -1;
  for (var step = 0; step < Math.abs(boss.vy); step++) {
    if (Collide.hitsSolid(boss.x, boss.y + stepY, CONFIG.BOSS_SIZE, CONFIG.BOSS_SIZE)) {
      if (boss.vy > 0) { boss.onGround = true; }
      boss.vy = 0;
      break;
    }
    boss.y += stepY;
  }
};

Enemy.updateBoss = function () {
  if (!Enemy.boss) { return; }
  var boss = Enemy.boss;
  var targetX = Player.x + CONFIG.PLAYER_SIZE / 2;
  boss.dir = targetX < boss.x + CONFIG.BOSS_SIZE / 2 ? -1 : 1;
  var nextX = boss.x + boss.dir * CONFIG.BOSS_SPEED;
  if (!Collide.hitsSolid(nextX, boss.y, CONFIG.BOSS_SIZE, CONFIG.BOSS_SIZE)) {
    boss.x = Math.max(boss.arenaMinX, Math.min(boss.arenaMaxX, nextX));
  }
  Enemy.bossPhysics();
  if (boss.y > CONFIG.CANVAS_H + 100) {
    boss.x = boss.homeX;
    boss.y = boss.homeY;
    boss.vy = 0;
  }
  boss.attackTimer--;
  boss.spawnTimer--;
  var enraged = boss.health <= CONFIG.BOSS_HEALTH / 2;
  if (enraged) {
    boss.attackTimer--;
    boss.spawnTimer--;
  }
  if (boss.attackTimer <= 0 && boss.onGround) {
    if (boss.attackPhase === 0) { Enemy.bossSlam(); }
    else { Enemy.bossSpikes(); }
    boss.attackTimer = enraged ? Math.floor(CONFIG.BOSS_ATTACK_FRAMES * 0.55) : CONFIG.BOSS_ATTACK_FRAMES;
    boss.attackPhase = (boss.attackPhase + 1) % 2;
  }
  if (boss.spawnTimer <= 0) {
    Enemy.spawnMinion(boss.x - boss.dir * 100);
    boss.spawnTimer = enraged ? Math.floor(CONFIG.BOSS_SPAWN_FRAMES * 0.6) : CONFIG.BOSS_SPAWN_FRAMES;
  }
  var overlaps = Player.x + CONFIG.PLAYER_SIZE > boss.x && Player.x < boss.x + CONFIG.BOSS_SIZE &&
    Player.y + CONFIG.PLAYER_SIZE > boss.y && Player.y < boss.y + CONFIG.BOSS_SIZE;
  if (overlaps && !Player.invincible) { Game.die("The boss caught you."); }
};

Enemy.damageBoss = function (amount) {
  if (!Enemy.boss) { return; }
  Enemy.boss.health -= amount || 1;
  if (Enemy.boss.health <= 0) {
    Enemy.boss = null;
    Game.showMessage("Boss defeated! Reach the finish.");
  }
};

Enemy.spawnMinion = function (x) {
  if (x < 0 || x > Level.pixelWidth() - CONFIG.ENEMY_SIZE) { return; }
  if (Collide.hitsSolid(x, 0, CONFIG.ENEMY_SIZE, CONFIG.ENEMY_SIZE)) { return; }
  var type = CONFIG.ENEMY_TYPES.s;
  Enemy.list.push({
    x: x, y: 0, vy: 0, state: "run", timer: 0, dir: 1,
    onGround: false, alerted: true, shootTimer: type.shootFrames, health: type.health,
    maxHealth: type.health, speed: type.speed, shootFrames: type.shootFrames,
    bulletSpeed: type.bulletSpeed, type: "s", color: type.color, flying: false
  });
};

Enemy.bossSlam = function () {
  var boss = Enemy.boss;
  var y = boss.y + CONFIG.BOSS_SIZE - 12;
  Enemy.hazards.push({ type: "wave", x: boss.x + CONFIG.BOSS_SIZE / 2, y: y, vx: -5, life: 100 });
  Enemy.hazards.push({ type: "wave", x: boss.x + CONFIG.BOSS_SIZE / 2, y: y, vx: 5, life: 100 });
};

Enemy.bossSpikes = function () {
  var x = Player.x + CONFIG.PLAYER_SIZE / 2 - 16;
  Enemy.hazards.push({ type: "spike", x: x, y: Player.y + CONFIG.PLAYER_SIZE - 8, warning: 30, life: 80 });
};

Enemy.updateHazards = function () {
  for (var i = Enemy.hazards.length - 1; i >= 0; i--) {
    var hazard = Enemy.hazards[i];
    if (hazard.type === "wave") { hazard.x += hazard.vx; }
    if (hazard.warning > 0) { hazard.warning--; }
    hazard.life--;
    var active = hazard.type === "wave" || hazard.warning <= 0;
    var width = hazard.type === "wave" ? 18 : 32;
    var height = hazard.type === "wave" ? 12 : 40;
    if (active && hazard.x + width > Player.x && hazard.x < Player.x + CONFIG.PLAYER_SIZE &&
        hazard.y + height > Player.y && hazard.y < Player.y + CONFIG.PLAYER_SIZE) {
      if (!Player.invincible) { Game.die(hazard.type === "wave" ? "The boss shockwave hit you." : "Spikes caught you."); }
    }
    if (hazard.life <= 0) { Enemy.hazards.splice(i, 1); }
  }
};

Enemy.playerVisible = function (e) {
  var enemyCenterX = e.x + CONFIG.ENEMY_SIZE / 2;
  var enemyCenterY = e.y + CONFIG.ENEMY_SIZE / 2;
  var playerCenterX = Player.x + CONFIG.PLAYER_SIZE / 2;
  var playerCenterY = Player.y + CONFIG.PLAYER_SIZE / 2;
  if (Math.abs(enemyCenterY - playerCenterY) > CONFIG.TILE) { return false; }
  if (Math.abs(playerCenterX - enemyCenterX) >= CONFIG.SPOT_DISTANCE) { return false; }
  return !Collide.lineHitsSolid(enemyCenterX, enemyCenterY, playerCenterX, playerCenterY);
};
Enemy.playerNear = function (e) {
  var dx = Player.x - e.x, dy = Player.y - e.y;
  return dx * dx + dy * dy < CONFIG.HEAR_DISTANCE * CONFIG.HEAR_DISTANCE;
};
Enemy.alertOthers = function (spotter) {
  for (var i = 0; i < Enemy.list.length; i++) {
    var e = Enemy.list[i];
    if (e !== spotter && e.state !== "run") { e.state = "run"; e.timer = 0; e.alerted = true; }
  }
};
Enemy.shoot = function (e) {
  if (!e || e.dead) { return; }
  var ex = e.x + CONFIG.ENEMY_SIZE / 2, ey = e.y + CONFIG.ENEMY_SIZE / 2;
  var px = Player.x + CONFIG.PLAYER_SIZE / 2 + Player.vx * CONFIG.LEAD_FRAMES, py = Player.y + CONFIG.PLAYER_SIZE / 2;
  var dx = px - ex, dy = py - ey, dist = Math.sqrt(dx * dx + dy * dy);
  if (dist === 0) { return; }
  Enemy.bullets.push({ x: ex - 4, y: ey - 4, vx: dx / dist * e.bulletSpeed, vy: dy / dist * e.bulletSpeed });
};

Enemy.draw = function () {
  var ctx = Draw.ctx;
  for (var h = 0; h < Enemy.hazards.length; h++) {
    var hazard = Enemy.hazards[h];
    if (hazard.type === "wave") {
      ctx.fillStyle = "#000000";
      ctx.fillRect(hazard.x, hazard.y, 18, 12);
    } else {
      ctx.fillStyle = hazard.warning > 0 ? "#777777" : "#000000";
      ctx.beginPath();
      ctx.moveTo(hazard.x, hazard.y + 40);
      ctx.lineTo(hazard.x + 16, hazard.y);
      ctx.lineTo(hazard.x + 32, hazard.y + 40);
      ctx.closePath();
      ctx.fill();
    }
  }
  for (var d = 0; d < Enemy.deadBodies.length; d++) {
    var body = Enemy.deadBodies[d];
    ctx.fillStyle = "#8e2630";
    ctx.fillRect(body.x - 3, body.y + 6, body.width + 6, 5);
    ctx.fillStyle = body.color;
    ctx.beginPath(); ctx.arc(body.x + body.width / 2, body.y, body.width / 2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#000000"; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = "#d94b32";
    ctx.fillRect(body.x + 8, body.y - 2, 5, 3);
    ctx.fillRect(body.x + body.width - 14, body.y + 2, 4, 3);
  }
  for (var fx = 0; fx < Enemy.effects.length; fx++) {
    var particle = Enemy.effects[fx];
    ctx.fillStyle = "#d94b32";
    ctx.globalAlpha = particle.life / 28;
    ctx.fillRect(particle.x - 3, particle.y - 3, 6, 6);
  }
  ctx.globalAlpha = 1;
  if (Enemy.boss) {
    var boss = Enemy.boss;
    var enraged = boss.health <= CONFIG.BOSS_HEALTH / 2;
    ctx.save();
    ctx.globalAlpha = 0.18 + (Math.sin(Date.now() / 120) + 1) * 0.08;
    ctx.fillStyle = enraged ? "#d94b32" : "#ffcf56";
    ctx.beginPath(); ctx.arc(boss.x + CONFIG.BOSS_SIZE / 2, boss.y + CONFIG.BOSS_SIZE / 2, CONFIG.BOSS_SIZE * 0.9, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = enraged ? "#541f25" : "#20252b";
    ctx.fillRect(boss.x, boss.y, CONFIG.BOSS_SIZE, CONFIG.BOSS_SIZE);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = CONFIG.LINE_WIDTH;
    ctx.strokeRect(boss.x, boss.y, CONFIG.BOSS_SIZE, CONFIG.BOSS_SIZE);
    ctx.fillStyle = enraged ? "#ffcf56" : "#ffffff";
    ctx.fillRect(boss.x + (boss.dir < 0 ? 14 : 38), boss.y + 16, 8, 8);
    ctx.fillStyle = "#ffcf56";
    ctx.beginPath();
    ctx.moveTo(boss.x + 12, boss.y); ctx.lineTo(boss.x + 20, boss.y - 18); ctx.lineTo(boss.x + 30, boss.y);
    ctx.lineTo(boss.x + 40, boss.y - 18); ctx.lineTo(boss.x + 52, boss.y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#000000";
    ctx.fillRect(boss.x, boss.y - 12, CONFIG.BOSS_SIZE, 6);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(boss.x, boss.y - 12, CONFIG.BOSS_SIZE * boss.health / CONFIG.BOSS_HEALTH, 6);
    ctx.fillStyle = enraged ? "#d94b32" : "#ffcf56";
    ctx.font = "bold 12px monospace";
    ctx.fillText(enraged ? "ENRAGED" : "WRAITH", boss.x, boss.y - 18);
  }
  for (var i = 0; i < Enemy.list.length; i++) {
    var e = Enemy.list[i];
    ctx.beginPath(); ctx.arc(e.x + CONFIG.ENEMY_SIZE / 2, e.y + CONFIG.ENEMY_SIZE / 2, CONFIG.ENEMY_SIZE / 2, 0, Math.PI * 2);
    ctx.fillStyle = e.color || "#ffffff"; ctx.fill(); ctx.lineWidth = CONFIG.LINE_WIDTH; ctx.strokeStyle = "#000000"; ctx.stroke();
    if (e.flying) {
      ctx.strokeStyle = "#000000";
      ctx.beginPath();
      ctx.moveTo(e.x + 4, e.y + 10); ctx.lineTo(e.x - 7, e.y + 4);
      ctx.moveTo(e.x + CONFIG.ENEMY_SIZE - 4, e.y + 10); ctx.lineTo(e.x + CONFIG.ENEMY_SIZE + 7, e.y + 4);
      ctx.stroke();
    }
    if (e.health < e.maxHealth) {
      ctx.fillStyle = "#777777"; ctx.fillRect(e.x + 7, e.y + 7, 18, 4);
    }
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
