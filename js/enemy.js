/* =====================================================================
   enemy.js -- enemies, enemy bullets, player bullets, and gun drops
   ===================================================================== */

var Enemy = {
  list: [],
  nextId: 1,
  fallingSpawnCount: 0,
  bullets: [],
  playerBullets: [],
  pickups: [],
  shards: [],
  hazards: [],
  boss: null,
  deadBodies: [],
  effects: [],
  cinematic: { flash: 0, shake: 0, banner: 0 },
  lavaWallX: -240,
  ambushes: [],
  cornerAmbushUsed: false
  ,shop: null
};

Enemy.reset = function () {
  Enemy.list = [];
  Enemy.nextId = 1;
  Enemy.fallingSpawnCount = 0;
  Enemy.bullets = [];
  Enemy.playerBullets = [];
  Enemy.pickups = [];
  Enemy.shards = [];
  Enemy.hazards = [];
  Enemy.boss = null;
  Enemy.deadBodies = [];
  Enemy.effects = [];
  Enemy.cinematic = { flash: 0, shake: 0, banner: 0 };
  Enemy.lavaWallX = -240;
  Enemy.ambushes = [];
  Enemy.cornerAmbushUsed = false;
  var finish = Level.finishTiles.length > 0 ? Level.finishTiles[Level.finishTiles.length - 1] : { x: Level.pixelWidth() - CONFIG.TILE * 2, y: 7 * CONFIG.TILE };
  Enemy.shop = { x: Math.max(CONFIG.TILE, finish.x - 64), y: finish.y - 28, opened: false };
  for (var triggerX = CONFIG.AMBUSH_DISTANCE; triggerX < Level.pixelWidth() - CONFIG.TILE * 3; triggerX += CONFIG.AMBUSH_DISTANCE) {
    Enemy.ambushes.push({ x: triggerX, triggered: false });
  }
  for (var row = 0; row < CONFIG.ROWS; row++) {
    for (var col = 0; col < Level.cols; col++) {
      var enemyType = CONFIG.ENEMY_TYPES[Level.charAt(col, row)];
      if (enemyType) {
        Enemy.list.push({
          id: Enemy.nextId++, x: col * CONFIG.TILE, y: row * CONFIG.TILE, vy: 0,
          state: "patrol", timer: 0, dir: 1, onGround: false,
          alerted: false, shootTimer: enemyType.shootFrames, health: enemyType.health,
          maxHealth: enemyType.health, speed: enemyType.speed, shootFrames: enemyType.shootFrames,
          bulletSpeed: enemyType.bulletSpeed, type: Level.charAt(col, row), color: enemyType.color,
          flying: !!enemyType.flying, turret: !!enemyType.turret, charger: !!enemyType.charger,
          splitter: !!enemyType.splitter, teleport: !!enemyType.teleport, burrow: !!enemyType.burrow,
          mineLayer: !!enemyType.mineLayer, burst: !!enemyType.burst, laser: !!enemyType.laser,
          shield: !!enemyType.shield, armor: enemyType.armor || 0, chargeTimer: 0,
          burrowTimer: 0, burrowCooldown: 0, stunned: false, stunTimer: 0,
          support: !!enemyType.support, suicide: !!enemyType.suicide, glide: !!enemyType.glide,
          regenTimer: 0, healTimer: 90, slamCooldown: 0, shieldTurnTimer: 0,
          pathDirection: 0, pathTimer: 0, original: true
        });
        Enemy.setTile(col, row, ".");
      }
      if (Level.charAt(col, row) === "B") {
        Enemy.boss = {
          x: col * CONFIG.TILE, y: row * CONFIG.TILE, homeX: col * CONFIG.TILE, homeY: row * CONFIG.TILE, vy: 0,
          arenaMinX: col * CONFIG.TILE - CONFIG.TILE * 3,
          arenaMaxX: (col + 5) * CONFIG.TILE - CONFIG.BOSS_SIZE,
          dir: -1, onGround: false, health: CONFIG.BOSS_HEALTH,
           attackTimer: CONFIG.BOSS_ATTACK_FRAMES, spawnTimer: CONFIG.BOSS_SPAWN_FRAMES, attackPhase: 0, floorTimer: 90, phase: 0, teleportCooldown: 0
        };
        Enemy.setTile(col, row, ".");
      }
      if (Level.charAt(col, row) === "G") {
        Enemy.pickups.push({ x: col * CONFIG.TILE + 10, y: row * CONFIG.TILE + 8, size: 20, level: 3, weaponType: "laser" });
        Enemy.setTile(col, row, ".");
      }
      if (Level.charAt(col, row) === "W") {
        Enemy.pickups.push({ x: col * CONFIG.TILE + 10, y: row * CONFIG.TILE + 8, size: 20, level: 4, weaponType: "shotgun" });
        Enemy.setTile(col, row, ".");
      }
      if (Level.charAt(col, row) === "R") {
        Enemy.pickups.push({ x: col * CONFIG.TILE + 10, y: row * CONFIG.TILE + 8, size: 20, level: 4, type: "riskWeapon", weaponType: "grenade" });
        Enemy.setTile(col, row, ".");
      }
      if (Level.charAt(col, row) === "I") {
        Enemy.pickups.push({ x: col * CONFIG.TILE + 10, y: row * CONFIG.TILE + 8, size: 20, type: "invincibility" });
        Enemy.setTile(col, row, ".");
      }
    }
  }
  for (var shardCol = 3; shardCol < Level.cols - 2; shardCol += 6) {
    if (Level.charAt(shardCol, 7) === "." && Level.isSolid(shardCol, 8)) {
      Enemy.shards.push({ x: shardCol * CONFIG.TILE + 14, y: 7 * CONFIG.TILE + 14, size: 12, collected: false });
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
  if (e.glide && e.vy > 2) { e.vy = 2; }
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

Enemy.routeDirection = function (e, preferred) {
  var choices = [preferred, -preferred];
  for (var i = 0; i < choices.length; i++) {
    var direction = choices[i];
    var probeX = e.x + direction * Math.max(e.speed * 3, 12);
    var blocked = Collide.hitsSolid(probeX, e.y, CONFIG.ENEMY_SIZE, CONFIG.ENEMY_SIZE);
    var spikeAhead = Collide.hitsSpike(probeX, e.y + CONFIG.ENEMY_SIZE - 10, CONFIG.ENEMY_SIZE, 10);
    var voidAhead = !Collide.hitsSolid(probeX, e.y + CONFIG.ENEMY_SIZE + 4, CONFIG.ENEMY_SIZE, 4);
    if (!blocked && !spikeAhead && (!voidAhead || e.onGround)) { return direction; }
  }
  return preferred;
};

Enemy.findPathDirection = function (e) {
  var startCol = Math.floor((e.x + CONFIG.ENEMY_SIZE / 2) / CONFIG.TILE);
  var startRow = Math.floor((e.y + CONFIG.ENEMY_SIZE / 2) / CONFIG.TILE);
  var targetCol = Math.floor((Player.x + CONFIG.PLAYER_SIZE / 2) / CONFIG.TILE);
  var targetRow = Math.floor((Player.y + CONFIG.PLAYER_SIZE / 2) / CONFIG.TILE);
  if (startCol === targetCol && startRow === targetRow) { return 0; }
  var queue = [{ col: startCol, row: startRow, first: 0 }];
  var visited = {};
  visited[startCol + ":" + startRow] = true;
  var head = 0;
  var directions = [{ col: 1, row: 0 }, { col: -1, row: 0 }, { col: 0, row: -1 }, { col: 0, row: 1 }];
  while (head < queue.length && queue.length < 180) {
    var current = queue[head++];
    for (var i = 0; i < directions.length; i++) {
      var nextCol = current.col + directions[i].col;
      var nextRow = current.row + directions[i].row;
      var key = nextCol + ":" + nextRow;
      if (visited[key] || nextCol < 0 || nextCol >= Level.cols || nextRow < 0 || nextRow >= CONFIG.ROWS) { continue; }
      if (Level.isSolid(nextCol, nextRow) || Level.isSpike(nextCol, nextRow) || Level.isLava(nextCol, nextRow)) { continue; }
      visited[key] = true;
      var first = current.first || (directions[i].row < 0 ? 2 : (directions[i].row > 0 ? -2 : directions[i].col));
      if (nextCol === targetCol && nextRow === targetRow) { return first; }
      queue.push({ col: nextCol, row: nextRow, first: first });
    }
  }
  return 0;
};

Enemy.chase = function (e) {
  if (e.turret) { return; }
  var targetX = Player.x + CONFIG.PLAYER_SIZE / 2;
  if (e.flanker) { targetX += e.flankSide * 105; }
  var enemyCenterX = e.x + CONFIG.ENEMY_SIZE / 2;
  var targetDirection = targetX < enemyCenterX ? -1 : 1;
  if (!e.flying) {
    if ((e.pathTimer || 0) <= 0) { e.pathDirection = Enemy.findPathDirection(e); e.pathTimer = 18; }
    else { e.pathTimer--; }
    if (e.pathDirection === 2 && e.onGround) { e.vy = -CONFIG.JUMP_POWER * 0.82; }
    if (e.pathDirection && Math.abs(e.pathDirection) === 1) { targetDirection = e.pathDirection; }
  }
  if (!e.flying && !e.ambush) { targetDirection = Enemy.routeDirection(e, targetDirection); }
  e.shieldTurnTimer = 0;
  e.dir = targetDirection;
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
  var chaseSpeed = e.charger && e.chargeTimer > 0 ? e.speed * 3.5 : e.speed;
  if (e.enragedTimer > 0) { chaseSpeed *= 1.25; }
  chaseSpeed *= Game.enemySpeedScale;
  var nextX = e.x + e.dir * chaseSpeed;
  var blocked = Collide.hitsSolid(nextX, e.y, CONFIG.ENEMY_SIZE, CONFIG.ENEMY_SIZE);
  var edge = !Collide.hitsSolid(nextX, e.y + CONFIG.ENEMY_SIZE + 2, CONFIG.ENEMY_SIZE, 2);
  var spike = Collide.hitsSpike(nextX, e.y + CONFIG.ENEMY_SIZE - 10, CONFIG.ENEMY_SIZE, 10);
  if (blocked || spike) {
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
  for (var i = Enemy.list.length - 1; i >= 0; i--) {
    var e = Enemy.list[i];
    if (e.stunned || e.alertDelay > 0) { continue; }
    var overlaps = Player.x + CONFIG.PLAYER_SIZE > e.x && Player.x < e.x + CONFIG.ENEMY_SIZE &&
      Player.y + CONFIG.PLAYER_SIZE > e.y && Player.y < e.y + CONFIG.ENEMY_SIZE;
    var landingY = e.y - CONFIG.PLAYER_SIZE;
    var landingBlocked = Collide.hitsSolid(Player.x, landingY, CONFIG.PLAYER_SIZE, CONFIG.PLAYER_SIZE);
    if (overlaps && !e.invulnerable && !Player.dashing && Player.vy >= 0 && Player.y + CONFIG.PLAYER_SIZE - e.y < CONFIG.TILE / 2 && !landingBlocked) {
      Enemy.reflectBullets(Player.x + CONFIG.PLAYER_SIZE / 2, Player.y + CONFIG.PLAYER_SIZE / 2, 58);
      Player.y = e.y - CONFIG.PLAYER_SIZE;
      Player.vy = -CONFIG.JUMP_POWER * 0.55;
      Enemy.kill(i, true);
    } else if (overlaps && !Player.invincible) {
      Player.takeDamage("An enemy caught you.");
      return;
    }
  }
};

Enemy.kill = function (index, stomped) {
  var e = Enemy.list[index];
  if (!e || e.dead) { return; }
  e.dead = true;
  var upgradeTypes = ["b", "m", "w", "q", "f"];
  var level = upgradeTypes.indexOf(e.type) >= 0 ? 2 : 1;
  var dropWeapons = ["shotgun", "laser", "grenade", "homing", "burst", "boomerang"];
  var weaponType = dropWeapons[Math.floor(Math.random() * dropWeapons.length)];
  if (e.type === "v" || e.type === "r") { level = 2; }
  if (e.splitter) { level = 2; }
  Enemy.pickups.push({ x: e.x + CONFIG.ENEMY_SIZE / 2 - 10, y: e.y + 4, size: 20, level: 1, weaponType: weaponType, life: 600 });
  if (Game.combo > 0 && Game.combo % 3 === 0) {
    Enemy.pickups.push({ x: e.x + CONFIG.ENEMY_SIZE / 2 + 16, y: e.y + 4, size: 16, type: "weaponShard", life: 600 });
  }
  Enemy.deadBodies.push({ x: e.x - 4, y: e.y + CONFIG.ENEMY_SIZE - 11, width: CONFIG.ENEMY_SIZE + 8, color: e.color || "#ffffff", dir: e.dir });
  if (Enemy.deadBodies.length > 40) { Enemy.deadBodies.shift(); }
  for (var burst = 0; burst < 28; burst++) {
    Enemy.effects.push({ x: e.x + CONFIG.ENEMY_SIZE / 2, y: e.y + CONFIG.ENEMY_SIZE / 2, vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.8) * 10, life: 34, color: "#d94b32", size: 6 });
  }
  Enemy.cinematic.flash = 8;
  Enemy.cinematic.shake = 7;
  Enemy.cinematic.banner = 45;
  for (var bulletIndex = Enemy.bullets.length - 1; bulletIndex >= 0; bulletIndex--) {
    if (Enemy.bullets[bulletIndex].owner === e) { Enemy.bullets.splice(bulletIndex, 1); }
  }
  for (var retreatIndex = 0; retreatIndex < Enemy.list.length; retreatIndex++) {
    var survivor = Enemy.list[retreatIndex];
    if (survivor !== e && !survivor.dead) {
      survivor.retreatTimer = 0;
      survivor.enragedTimer = 180;
      survivor.state = "run";
      survivor.alerted = true;
      survivor.shootTimer = Math.min(survivor.shootTimer, 12);
    }
  }
  Enemy.list.splice(index, 1);
  if (e.splitter && stomped) {
    Enemy.spawnSplitterMinion(e.x - 14, e.y);
    Enemy.spawnSplitterMinion(e.x + 14, e.y);
  }
  if (stomped) { AudioFX.stomp(); }
  AudioFX.defeat();
  Game.registerKill(false);
  Enemy.cinematic.shake = Math.min(18, 8 + Game.combo * 2);
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
  if (!e || e.dead || e.stunned || e.invulnerable || e.alertDelay > 0) { return; }
  Game.impact(3, 0);
  Enemy.cinematic.shake = Math.max(Enemy.cinematic.shake, 4);
  e.health -= arguments[1] || 1;
  e.regenTimer = 180;
  e.alerted = true;
  e.state = "run";
  e.timer = 0;
  Enemy.alertOthers(e);
  if (e.teleport) {
    var teleportDirection = e.x < Player.x ? -1 : 1;
    var teleportX = e.x + teleportDirection * 110;
    if (!Collide.hitsSolid(teleportX, e.y, CONFIG.ENEMY_SIZE, CONFIG.ENEMY_SIZE)) { e.x = teleportX; }
  }
  if (e.health <= 0) { Enemy.kill(index); }
};

Enemy.collectPickups = function () {
  for (var i = Enemy.pickups.length - 1; i >= 0; i--) {
    var p = Enemy.pickups[i];
    if (Player.x + CONFIG.PLAYER_SIZE > p.x && Player.x < p.x + p.size &&
        Player.y + CONFIG.PLAYER_SIZE > p.y && Player.y < p.y + p.size) {
      if (p.type === "invincibility") {
        Player.invincibleTimer = Math.floor(CONFIG.INVINCIBILITY_TIME * Player.shieldMultiplier);
        Player.invincible = true;
        Game.showMessage("INVINCIBILITY acquired! You have 6 seconds.");
      } else if (p.type === "weaponShard") {
        Player.hasGun = true;
        Player.weaponType = Player.weaponType === "sidearm" ? "burst" : Player.weaponType;
        Player.gunLevel = Math.max(2, Player.gunLevel);
        Player.ammo = Math.max(Player.ammo, 24);
        Player.weaponTimer = CONFIG.GUN_UPGRADE_TIME;
        Game.showMessage("WEAPON SHARD: GUN LEVEL 2");
      } else {
        Player.hasGun = true;
        Player.weaponType = p.weaponType || (p.level > 2 ? "laser" : "sidearm");
        if (p.level > Player.gunLevel) { Player.gunLevel = p.level; }
        Player.ammo = p.level > 3 ? 42 : (p.level > 2 ? 32 : 20);
        Player.weaponTimer = p.level > 3 ? CONFIG.GUN_ULTIMATE_TIME : (p.level > 2 ? CONFIG.GUN_ULTRA_TIME : CONFIG.GUN_UPGRADE_TIME);
        if (p.type === "riskWeapon") {
          Game.levelTime = Math.max(60, Game.levelTime - 300);
          Game.showMessage("CURSED ARSENAL: ultimate weapon, but time burns away!");
        } else {
          Game.showMessage(p.weaponType === "burst" ? "Burst rifle acquired!" : (p.weaponType === "boomerang" ? "Boomerang gun acquired!" : (p.level > 3 ? "Ultimate spread gun acquired!" : (p.level > 2 ? "Ultra gun acquired!" : "Heavy gun acquired!"))));
        }
      }
      AudioFX.pickup();
      for (var pickupSpark = 0; pickupSpark < 14; pickupSpark++) {
        Enemy.effects.push({ x: p.x + p.size / 2, y: p.y + p.size / 2, vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5, life: 24, color: "#ffcf56", size: 5 });
      }
      Enemy.pickups.splice(i, 1);
    }
  }
};

Enemy.updatePickups = function () {
  for (var i = Enemy.pickups.length - 1; i >= 0; i--) {
    if (Enemy.pickups[i].life === undefined) { continue; }
    Enemy.pickups[i].life--;
    if (Enemy.pickups[i].life <= 0) { Enemy.pickups.splice(i, 1); }
  }
};

Enemy.collectShards = function () {
  for (var i = Enemy.shards.length - 1; i >= 0; i--) {
    var shard = Enemy.shards[i];
    if (Player.x + CONFIG.PLAYER_SIZE > shard.x && Player.x < shard.x + shard.size &&
        Player.y + CONFIG.PLAYER_SIZE > shard.y && Player.y < shard.y + shard.size) {
      Game.score += 25;
      Player.shards++;
      Game.combo++;
      Game.comboTimer = CONFIG.COMBO_TIMEOUT;
      Game.showMessage("ENERGY SHARD +25");
      for (var spark = 0; spark < 8; spark++) {
        Enemy.effects.push({ x: shard.x + shard.size / 2, y: shard.y + shard.size / 2, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, life: 20, color: "#5ce1e6", size: 4 });
      }
      Enemy.shards.splice(i, 1);
    }
  }
};

Enemy.firePlayerBullet = function () {
  var angle = Player.aimAngle;
  var centerX = Player.x + CONFIG.PLAYER_SIZE / 2;
  var centerY = Player.y + CONFIG.PLAYER_SIZE / 2;
  var angles = Player.weaponType === "shotgun" ? [angle - 0.28, angle - 0.14, angle, angle + 0.14, angle + 0.28] : (Player.weaponType === "burst" ? [angle - 0.1, angle, angle + 0.1] : [angle]);
  for (var shot = 0; shot < angles.length; shot++) {
    var shotAngle = angles[shot];
    Enemy.playerBullets.push({
      x: centerX + Math.cos(shotAngle) * CONFIG.PLAYER_RADIUS - 4,
      y: centerY + Math.sin(shotAngle) * CONFIG.PLAYER_RADIUS - 4,
      vx: Math.cos(shotAngle) * (Player.weaponType === "laser" ? 12 : CONFIG.PLAYER_BULLET_SPEED),
      vy: Math.sin(shotAngle) * (Player.weaponType === "laser" ? 12 : CONFIG.PLAYER_BULLET_SPEED),
      damage: (Player.weaponType === "shotgun" ? 1 : (Player.weaponType === "grenade" ? 3 : (Player.gunLevel > 1 ? 2 : 1))) * Player.damageMultiplier,
      piercing: Player.weaponType === "laser" || Player.piercing,
      grenade: Player.weaponType === "grenade",
      homing: Player.weaponType === "homing",
      boomerang: Player.weaponType === "boomerang",
      bounces: Player.ricochet ? CONFIG.PLAYER_RICOCHET_BOUNCES : 0,
      life: 0,
      hitTargets: []
    });
  }
};

Enemy.bulletOffscreen = function (bullet) {
  return bullet.x < Draw.cameraX - 32 || bullet.x > Draw.cameraX + CONFIG.CANVAS_W + 32 ||
    bullet.y < -32 || bullet.y > CONFIG.CANVAS_H + 32;
};

Enemy.updatePlayerBullets = function () {
  for (var b = Enemy.playerBullets.length - 1; b >= 0; b--) {
    var bullet = Enemy.playerBullets[b];
    bullet.life++;
    if (bullet.boomerang && bullet.life > 28) {
      var returnAngle = Math.atan2(Player.y + CONFIG.PLAYER_SIZE / 2 - bullet.y, Player.x + CONFIG.PLAYER_SIZE / 2 - bullet.x);
      var returnSpeed = Math.sqrt(bullet.vx * bullet.vx + bullet.vy * bullet.vy) || CONFIG.PLAYER_BULLET_SPEED;
      bullet.vx += (Math.cos(returnAngle) * returnSpeed - bullet.vx) * 0.12;
      bullet.vy += (Math.sin(returnAngle) * returnSpeed - bullet.vy) * 0.12;
      if (bullet.life > 100) { Enemy.playerBullets.splice(b, 1); continue; }
    }
    if (bullet.homing) {
      var nearest = null, nearestDistance = Infinity;
      for (var targetIndex = 0; targetIndex < Enemy.list.length; targetIndex++) {
        var target = Enemy.list[targetIndex];
        var targetDx = target.x - bullet.x, targetDy = target.y - bullet.y;
        var targetDistance = targetDx * targetDx + targetDy * targetDy;
        if (targetDistance < nearestDistance) { nearest = target; nearestDistance = targetDistance; }
      }
      if (nearest) {
        var homeAngle = Math.atan2(nearest.y - bullet.y, nearest.x - bullet.x);
        var homeSpeed = Math.sqrt(bullet.vx * bullet.vx + bullet.vy * bullet.vy);
        bullet.vx += (Math.cos(homeAngle) * homeSpeed - bullet.vx) * 0.08;
        bullet.vy += (Math.sin(homeAngle) * homeSpeed - bullet.vy) * 0.08;
      }
    }
    bullet.x += bullet.vx;
    bullet.y += bullet.vy;
    var hit = false;
    for (var reflectedIndex = Enemy.bullets.length - 1; reflectedIndex >= 0; reflectedIndex--) {
      var enemyBullet = Enemy.bullets[reflectedIndex];
      if (bullet.x + 8 > enemyBullet.x && bullet.x < enemyBullet.x + 8 && bullet.y + 8 > enemyBullet.y && bullet.y < enemyBullet.y + 8) {
        enemyBullet.reflected = true;
        enemyBullet.vx = -enemyBullet.vx * 1.15;
        enemyBullet.vy = -enemyBullet.vy * 1.15;
        Enemy.playerBullets.splice(b, 1);
        Game.impact(3, 0);
        hit = true;
        break;
      }
    }
    if (hit) { continue; }
    if (Enemy.boss && bullet.x + 8 > Enemy.boss.x && bullet.x < Enemy.boss.x + CONFIG.BOSS_SIZE &&
        bullet.y + 8 > Enemy.boss.y && bullet.y < Enemy.boss.y + CONFIG.BOSS_SIZE) {
      Enemy.damageBoss(bullet.damage);
      Enemy.playerBullets.splice(b, 1);
      continue;
    }
    for (var i = Enemy.list.length - 1; i >= 0; i--) {
      var e = Enemy.list[i];
      if (e.dead) { continue; }
      if (Enemy.isOnScreen(e) && bullet.x + 8 > e.x && bullet.x < e.x + CONFIG.ENEMY_SIZE &&
          bullet.y + 8 > e.y && bullet.y < e.y + CONFIG.ENEMY_SIZE) {
        bullet.hitTargets = bullet.hitTargets || [];
        if (bullet.hitTargets.indexOf(e) < 0) {
          bullet.hitTargets.push(e);
          if (e.ambush && e.alertDelay > 0) {
            e.alertDelay = 0;
            e.alerted = true;
            e.state = "run";
            e.dir = e.x < Player.x ? 1 : -1;
            e.invulnerable = false;
            e.ambushActive = true;
          }
          Enemy.damage(i, bullet.damage, bullet);
        }
        hit = !bullet.piercing;
        break;
      }
    }
    if (hit || (Collide.hitsSolid(bullet.x, bullet.y, 8, 8) && !bullet.grenade && bullet.bounces <= 0) ||
      Enemy.bulletOffscreen(bullet)) {
      Enemy.playerBullets.splice(b, 1);
    } else if (Collide.hitsSolid(bullet.x, bullet.y, 8, 8) && bullet.bounces > 0) {
      bullet.vx = -bullet.vx; bullet.vy = -bullet.vy; bullet.bounces--;
      bullet.x -= bullet.vx; bullet.y -= bullet.vy;
    } else if (bullet.grenade && Collide.hitsSolid(bullet.x, bullet.y, 8, 8)) {
      bullet.vy = -Math.abs(bullet.vy) * 0.85;
      bullet.vx *= 0.85;
      bullet.bounces--;
      if (bullet.bounces <= 0) { Enemy.playerBullets.splice(b, 1); }
    }
  }
};

Enemy.update = function () {
  Enemy.updateEffects();
  Enemy.checkShop();
  Enemy.updatePressure();
  Enemy.checkPlayerContact();
  for (var i = 0; i < Enemy.list.length; i++) {
    var e = Enemy.list[i];
    if (e.dead) { continue; }
    if (e.y > CONFIG.CANVAS_H + 80) {
      Enemy.list.splice(i, 1);
      i--;
      continue;
    }
    if (e.fallingGuy && e.attackDelay > 0) {
      e.attackDelay--;
      Enemy.physics(e);
      if (e.attackDelay === 0 || !Enemy.hasOriginalEnemies()) {
        e.fallingGuy = false;
        e.invulnerable = false;
      }
      continue;
    }
    if (e.alertDelay > 0) {
      e.alertDelay--;
      Enemy.physics(e);
      if (e.alertDelay === 30) {
        Enemy.cinematic.shake = Math.max(Enemy.cinematic.shake, 12);
        Game.showMessage("AMBUSH ATTACK INCOMING!");
      }
      if (e.alertDelay === 0) {
        e.alerted = true;
        e.state = "run";
        e.shootTimer = 0;
        e.ambushActive = true;
      }
      continue;
    }
    if (e.burrowCooldown > 0) { e.burrowCooldown--; }
    if (e.slamCooldown > 0) { e.slamCooldown--; }
    if (e.enragedTimer > 0) { e.enragedTimer--; }
    if (e.regenTimer > 0) { e.regenTimer--; }
    if (e.regenTimer === 0 && e.health < e.maxHealth && Game.frame % 45 === 0) { e.health++; }
    if (e.support && e.healTimer > 0) { e.healTimer--; }
    if (e.burrowTimer > 0) {
      e.burrowTimer--;
      if (e.burrowTimer === 0) {
        e.x = Player.x + (Player.x < e.x ? 100 : -100);
        e.y = Math.max(0, Player.y - CONFIG.TILE * 2);
        e.stunned = true; e.stunTimer = 18;
      }
      continue;
    }
    if (e.stunned) {
      Enemy.physics(e);
      e.stunTimer--;
      if (e.onGround || e.stunTimer <= 0) { e.stunned = false; e.stunTimer = 0; }
      continue;
    }
    var canSee = e.ambushActive || Enemy.playerVisible(e);
    var distanceToPlayer = Math.sqrt(Math.pow(Player.x - e.x, 2) + Math.pow(Player.y - e.y, 2));
    if (e.burrow && e.burrowCooldown === 0 && distanceToPlayer < 170) { e.burrowTimer = 30; e.y = CONFIG.CANVAS_H + 80; continue; }
    var dodging = Enemy.dodgeBullets(e);
    var offscreenCharge = e.charger && Math.abs(Player.x - e.x) < CONFIG.AMBUSH_DISTANCE && Math.abs(Player.y - e.y) < CONFIG.TILE * 3;
    if (offscreenCharge) { e.state = "run"; e.alerted = true; e.chargeTimer = Math.max(e.chargeTimer, 24); }
    if (dodging) {
      Enemy.physics(e);
      continue;
    }
    if (e.state === "patrol") {
      var nextX = e.x + e.dir * e.speed * Game.enemySpeedScale;
      var willFall = !Collide.hitsSolid(nextX, e.y + CONFIG.ENEMY_SIZE + 2, CONFIG.ENEMY_SIZE, 2);
      if (Collide.hitsSolid(nextX, e.y, CONFIG.ENEMY_SIZE, CONFIG.ENEMY_SIZE) || willFall) { e.dir = -e.dir; }
      else { e.x = nextX; }
      Enemy.physics(e);
      if (canSee || Enemy.playerNear(e)) {
        e.state = "run";
        e.alerted = true;
        if (e.charger) { e.chargeTimer = 24; }
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
      if (e.charger && canSee && e.chargeTimer === 0) { e.chargeTimer = 24; }
      if (e.retreatTimer > 0) {
        var retreatDirection = e.x < e.retreatX ? -1 : 1;
        var retreatX = e.x + retreatDirection * e.speed;
        if (!Collide.hitsSolid(retreatX, e.y, CONFIG.ENEMY_SIZE, CONFIG.ENEMY_SIZE)) { e.x = retreatX; }
        e.retreatTimer--;
      } else {
        Enemy.chase(e);
      }
      Enemy.physics(e);
      if (e.mineLayer) {
        e.mineTimer = (e.mineTimer || 0) - 1;
        if (e.mineTimer <= 0) {
          Enemy.hazards.push({ type: "mine", x: e.x + 4, y: e.y + CONFIG.ENEMY_SIZE - 8, warning: 0, life: 360 });
          e.mineTimer = 100;
        }
      }
      if (e.chargeTimer > 0) { e.chargeTimer--; }
      e.shootTimer--;
      var dx = Player.x - e.x;
      var dy = Player.y - e.y;
      var distance = Math.sqrt(dx * dx + dy * dy);
      if (!e.turret && canSee && distance < 86) {
        e.dir = dx < 0 ? 1 : -1;
        var retreatX = e.x + e.dir * e.speed * 2;
        if (!Collide.hitsSolid(retreatX, e.y, CONFIG.ENEMY_SIZE, CONFIG.ENEMY_SIZE)) { e.x = retreatX; }
      }
      if (e.charger && e.chargeTimer === 0 && e.onGround && e.slamCooldown === 0 && distance < 90) {
        Enemy.enemySlam(e);
        e.slamCooldown = 120;
      }
      if (e.support && e.healTimer === 0) { Enemy.healNearby(e); e.healTimer = 120; }
      if (e.suicide && distance < 125) { Enemy.enemyExplosion(e); continue; }
      if (distance < 48) { Player.takeDamage("A melee swipe caught you."); }
      if (canSee && distance <= CONFIG.ENEMY_SHOOT_DISTANCE && e.shootTimer <= 0) {
        Enemy.shoot(e); e.shootTimer = Math.max(6, Math.floor(e.shootFrames / Game.enemySpeedScale * 0.75));
      }
    }
  }

  Enemy.updateBoss();
  Enemy.updatePlayerBullets();
  Enemy.updatePickups();
  Enemy.collectPickups();
  Enemy.collectShards();
  Enemy.updateHazards();
  for (var b = Enemy.bullets.length - 1; b >= 0; b--) {
    var bullet = Enemy.bullets[b];
    if (!bullet) { continue; }
    if (bullet.homing) {
      var aimAngle = Math.atan2(Player.y - bullet.y, Player.x - bullet.x);
      var speed = Math.sqrt(bullet.vx * bullet.vx + bullet.vy * bullet.vy);
      bullet.vx += (Math.cos(aimAngle) * speed - bullet.vx) * 0.035;
      bullet.vy += (Math.sin(aimAngle) * speed - bullet.vy) * 0.035;
    }
    bullet.x += bullet.vx; bullet.y += bullet.vy;
    if (bullet.reflected && bullet.owner && !bullet.owner.dead && bullet.x + 8 > bullet.owner.x && bullet.x < bullet.owner.x + (bullet.owner === Enemy.boss ? CONFIG.BOSS_SIZE : CONFIG.ENEMY_SIZE) &&
        bullet.y + 8 > bullet.owner.y && bullet.y < bullet.owner.y + (bullet.owner === Enemy.boss ? CONFIG.BOSS_SIZE : CONFIG.ENEMY_SIZE)) {
      if (bullet.owner === Enemy.boss) { Enemy.damageBoss(2); }
      else { Enemy.damage(Enemy.list.indexOf(bullet.owner), 2); }
      for (var spark = 0; spark < 6; spark++) {
        Enemy.effects.push({ x: bullet.x, y: bullet.y, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, life: 16, color: "#ffcf56", size: 4 });
      }
      Enemy.bullets.splice(b, 1);
    } else if (Collide.hitsSolid(bullet.x, bullet.y, 8, 8)) {
      if (bullet.bouncing && bullet.bounceCount > 0) {
        bullet.vx = -bullet.vx; bullet.vy = -bullet.vy; bullet.bounceCount--;
        bullet.x -= bullet.vx; bullet.y -= bullet.vy;
      } else { Enemy.bullets.splice(b, 1); }
    } else if (Enemy.bulletOffscreen(bullet)) {
      Enemy.bullets.splice(b, 1);
    } else if (!bullet.reflected && !Player.invincible && !Player.dashing && bullet.x + 8 > Player.x && bullet.x < Player.x + CONFIG.PLAYER_SIZE &&
               bullet.y + 8 > Player.y && bullet.y < Player.y + CONFIG.PLAYER_SIZE) {
      Enemy.bullets.splice(b, 1);
      Player.takeDamage("You were shot.");
    }
  }
};

Enemy.hasOriginalEnemies = function () {
  for (var i = 0; i < Enemy.list.length; i++) {
    if (Enemy.list[i].original && !Enemy.list[i].dead) { return true; }
  }
  return false;
};

Enemy.checkShop = function () {
  if (!Enemy.shop || Game.mode !== "playing" || Game.shopOpened || Enemy.list.length > 0 || Enemy.boss) { return; }
  var nearShop = Player.x + CONFIG.PLAYER_SIZE > Enemy.shop.x - 34 && Player.x < Enemy.shop.x + 34 &&
    Math.abs(Player.y - Enemy.shop.y) < CONFIG.TILE;
  if (nearShop) { Game.openShop(); }
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
  if (boss.teleportCooldown > 0) { boss.teleportCooldown--; }
  var phase = boss.health <= CONFIG.BOSS_HEALTH / 3 ? 2 : (boss.health <= CONFIG.BOSS_HEALTH * 2 / 3 ? 1 : 0);
  if (phase > boss.phase) {
    boss.phase = phase;
    boss.attackPhase = 0;
    boss.attackTimer = 25;
    Game.bossFlicker = 28;
    Enemy.cinematic.flash = 14;
    AudioFX.bossPhase();
    Game.showMessage(phase === 1 ? "BOSS PHASE 2: THE ARENA SHIFTS!" : "BOSS PHASE 3: NO ESCAPE!");
  }
  var enraged = boss.phase > 0;
  if (boss.phase === 2 && boss.teleportCooldown === 0 && Math.abs(Player.x - boss.x) < 180) {
    var teleportX = Player.x < boss.x ? boss.arenaMaxX : boss.arenaMinX;
    if (!Collide.hitsSolid(teleportX, boss.y, CONFIG.BOSS_SIZE, CONFIG.BOSS_SIZE)) {
      boss.x = teleportX;
      boss.teleportCooldown = 150;
      Enemy.cinematic.flash = 8;
      AudioFX.bossPhase();
    }
  }
  if (boss.attackTimer <= 0 && boss.onGround) {
    if (boss.phase === 0) {
      if (boss.attackPhase === 0) { Enemy.bossSlam(); } else { Enemy.bossSpikes(); }
      boss.attackPhase = (boss.attackPhase + 1) % 2;
    } else if (boss.phase === 1) {
      if (boss.attackPhase === 0) { Enemy.bossBurst(); } else { Enemy.bossLaser(); }
      boss.attackPhase = (boss.attackPhase + 1) % 2;
    } else {
      if (boss.attackPhase === 0) { Enemy.bossBulletHell(); } else { Enemy.bossSlam(); }
      boss.attackPhase = (boss.attackPhase + 1) % 2;
    }
    boss.attackTimer = boss.phase > 0 ? Math.floor(CONFIG.BOSS_ATTACK_FRAMES * 0.55) : CONFIG.BOSS_ATTACK_FRAMES;
  }
  if (boss.spawnTimer <= 0) {
    Enemy.spawnMinion(boss.x - boss.dir * 100);
    boss.spawnTimer = boss.phase > 0 ? Math.floor(CONFIG.BOSS_SPAWN_FRAMES * 0.6) : CONFIG.BOSS_SPAWN_FRAMES;
  }
  boss.floorTimer--;
  if (boss.floorTimer <= 0) {
    var floorX = boss.arenaMinX + Math.random() * (boss.arenaMaxX - boss.arenaMinX);
    Enemy.hazards.push({ type: "floorSpike", x: floorX, y: CONFIG.CANVAS_H - 120, warning: 35, life: 105 });
    boss.floorTimer = boss.phase > 0 ? 70 : 120;
  }
  var overlaps = Player.x + CONFIG.PLAYER_SIZE > boss.x && Player.x < boss.x + CONFIG.BOSS_SIZE &&
    Player.y + CONFIG.PLAYER_SIZE > boss.y && Player.y < boss.y + CONFIG.BOSS_SIZE;
  if (overlaps && !Player.invincible && !Player.dashing) { Player.takeDamage("The boss caught you."); }
};

Enemy.damageBoss = function (amount) {
  if (!Enemy.boss) { return; }
  Game.impact(3, 0);
  Enemy.boss.health -= amount || 1;
  if (Enemy.boss.health <= 0) {
    Game.registerKill(true);
    for (var bulletIndex = Enemy.bullets.length - 1; bulletIndex >= 0; bulletIndex--) {
      if (Enemy.bullets[bulletIndex].owner === Enemy.boss) { Enemy.bullets.splice(bulletIndex, 1); }
    }
    Enemy.boss = null;
    Game.showMessage("Boss defeated! Reach the finish.");
  }
};

Enemy.spawnMinion = function (x) {
  if (Enemy.fallingSpawnCount >= 3) { return; }
  if (x < 0 || x > Level.pixelWidth() - CONFIG.ENEMY_SIZE) { return; }
  if (Collide.hitsSolid(x, 0, CONFIG.ENEMY_SIZE, CONFIG.ENEMY_SIZE)) { return; }
  var type = CONFIG.ENEMY_TYPES.s;
  Enemy.list.push({
    id: Enemy.nextId++, x: x, y: 0, vy: 0, state: "run", timer: 0, dir: 1, fallingGuy: true, invulnerable: true, attackDelay: 360,
    onGround: false, alerted: true, shootTimer: type.shootFrames, health: type.health,
    maxHealth: type.health, speed: type.speed, shootFrames: type.shootFrames,
    bulletSpeed: type.bulletSpeed, type: "s", color: type.color, flying: false, stunned: false, stunTimer: 0,
    charger: false, support: false, suicide: false, glide: false, slamCooldown: 0, healTimer: 90, regenTimer: 0,
    pathDirection: 0, pathTimer: 0
  });
  Enemy.fallingSpawnCount++;
};

Enemy.spawnAmbush = function (x) {
  var types = ["c", "p", "s"];
  for (var i = 0; i < 3; i++) {
    var typeKey = types[Math.floor(Math.random() * types.length)];
    var type = CONFIG.ENEMY_TYPES[typeKey];
    var enemyX = x + (i - 1) * 28;
    if (Collide.hitsSolid(enemyX, 0, CONFIG.ENEMY_SIZE, CONFIG.ENEMY_SIZE)) { continue; }
    Enemy.list.push({ id: Enemy.nextId++, x: enemyX, y: 0, vy: 0, state: "run", timer: 0, ambush: true, ambushActive: true, alertDelay: 0, dir: enemyX < Player.x ? 1 : -1,
      onGround: false, alerted: true, shootTimer: type.shootFrames, health: type.health,
      maxHealth: type.health, speed: type.speed, shootFrames: type.shootFrames,
      bulletSpeed: type.bulletSpeed, type: typeKey, color: type.color, flying: !!type.flying,
      turret: !!type.turret, charger: !!type.charger, splitter: !!type.splitter, support: !!type.support,
      suicide: !!type.suicide, glide: !!type.glide, chargeTimer: 20, slamCooldown: 0, healTimer: 90, regenTimer: 0,
      pathDirection: 0, pathTimer: 0, stunned: false, stunTimer: 0 });
  }
  Enemy.cinematic.flash = 5;
  Game.showMessage("AMBUSH!");
};

Enemy.updatePressure = function () {
  Enemy.lavaWallX += CONFIG.LAVA_WALL_SPEED * Game.enemySpeedScale;
  if (Enemy.lavaWallX + 20 > Player.x && Enemy.lavaWallX < Player.x + CONFIG.PLAYER_SIZE) {
    Player.takeDamage("The lava wall caught you.");
  }
  for (var i = 0; i < Enemy.ambushes.length; i++) {
    var ambush = Enemy.ambushes[i];
    if (!ambush.triggered && Player.x > ambush.x) {
      ambush.triggered = true;
      Enemy.spawnAmbush(ambush.x);
    }
  }
  var nearCorner = Player.x < CONFIG.TILE * 2 || Player.x > Level.pixelWidth() - CONFIG.TILE * 2;
  if (!Enemy.cornerAmbushUsed && Game.habits.corners > 120 && nearCorner) {
    Enemy.cornerAmbushUsed = true;
    Enemy.spawnAmbush(Player.x < Level.pixelWidth() / 2 ? Player.x + 120 : Player.x - 120);
    Game.showMessage("THEY LEARNED YOUR HIDING SPOT!");
  }
};

Enemy.bossSlam = function () {
  var boss = Enemy.boss;
  var y = boss.y + CONFIG.BOSS_SIZE - 12;
  Enemy.hazards.push({ type: "wave", x: boss.x + CONFIG.BOSS_SIZE / 2, y: y, vx: -5, life: 100 });
  Enemy.hazards.push({ type: "wave", x: boss.x + CONFIG.BOSS_SIZE / 2, y: y, vx: 5, life: 100 });
  Enemy.cinematic.shake = 22;
  for (var dust = 0; dust < 20; dust++) {
    Enemy.effects.push({ x: boss.x + CONFIG.BOSS_SIZE / 2, y: y, vx: (Math.random() - 0.5) * 12, vy: -Math.random() * 6, life: 28, color: "#8c8c8c", size: 7 });
  }
};

Enemy.bossSpikes = function () {
  var x = Player.x + CONFIG.PLAYER_SIZE / 2 - 16;
  Enemy.hazards.push({ type: "spike", x: x, y: Player.y + CONFIG.PLAYER_SIZE - 8, warning: 30, life: 80 });
};

Enemy.bossBulletHell = function () {
  if (!Enemy.boss) { return; }
  AudioFX.boss();
  var centerX = Enemy.boss.x + CONFIG.BOSS_SIZE / 2;
  var centerY = Enemy.boss.y + CONFIG.BOSS_SIZE / 2;
  for (var i = 0; i < 12; i++) {
    var angle = Math.PI * 2 * i / 12;
    Enemy.bullets.push({ x: centerX - 4, y: centerY - 4, vx: Math.cos(angle) * CONFIG.BOSS_BULLET_SPEED, vy: Math.sin(angle) * CONFIG.BOSS_BULLET_SPEED, owner: Enemy.boss });
  }
};

Enemy.bossBurst = function () {
  if (!Enemy.boss) { return; }
  var boss = Enemy.boss;
  var centerX = boss.x + CONFIG.BOSS_SIZE / 2, centerY = boss.y + CONFIG.BOSS_SIZE / 2;
  var movementBias = Math.sign(Game.habits.right - Game.habits.left) * Math.min(45, Math.floor((Game.habits.right + Game.habits.left) / 120));
  var targetY = Player.y + (Game.habits.jumps > Game.habits.shots / 2 ? 24 : 0);
  var angle = Math.atan2(targetY - centerY, Player.x + movementBias - centerX);
  for (var i = -2; i <= 2; i++) {
    var shotAngle = angle + i * 0.16;
    Enemy.bullets.push({ x: centerX - 4, y: centerY - 4, vx: Math.cos(shotAngle) * CONFIG.BOSS_BULLET_SPEED * 1.2, vy: Math.sin(shotAngle) * CONFIG.BOSS_BULLET_SPEED * 1.2, owner: boss });
  }
};

Enemy.bossLaser = function () {
  if (!Enemy.boss) { return; }
  var boss = Enemy.boss;
  var laserBias = Math.sign(Game.habits.right - Game.habits.left) * Math.min(45, Math.floor((Game.habits.right + Game.habits.left) / 120));
  Enemy.hazards.push({ type: "laser", x: boss.x + CONFIG.BOSS_SIZE / 2, y: boss.y + CONFIG.BOSS_SIZE / 2,
    targetX: Player.x + CONFIG.PLAYER_SIZE / 2 + laserBias, targetY: Player.y + CONFIG.PLAYER_SIZE / 2 + (Game.habits.recentJump > 0 ? 18 : 0), warning: 35, life: 55, owner: boss });
};

Enemy.reflectBullets = function (x, y, radius) {
  for (var i = 0; i < Enemy.bullets.length; i++) {
    var bullet = Enemy.bullets[i];
    var dx = bullet.x + 4 - x, dy = bullet.y + 4 - y;
    if (dx * dx + dy * dy <= radius * radius) {
      bullet.reflected = true;
      bullet.vx = -bullet.vx * 1.15;
      bullet.vy = -bullet.vy * 1.15;
    }
  }
};

Enemy.spawnSplitterMinion = function (x, y) {
  var type = CONFIG.ENEMY_TYPES.s;
  if (x < 0 || x > Level.pixelWidth() - CONFIG.ENEMY_SIZE || Collide.hitsSolid(x, y, CONFIG.ENEMY_SIZE, CONFIG.ENEMY_SIZE)) { return; }
  Enemy.list.push({ id: Enemy.nextId++, x: x, y: y, vy: -6, state: "run", timer: 0, dir: x < Player.x ? 1 : -1,
    onGround: false, alerted: true, shootTimer: type.shootFrames, health: type.health,
    maxHealth: type.health, speed: type.speed, shootFrames: type.shootFrames,
    bulletSpeed: type.bulletSpeed, type: "s", color: type.color, flying: false,
    turret: false, charger: false, splitter: false, support: false, suicide: false, glide: false,
    chargeTimer: 0, slamCooldown: 0, healTimer: 90, regenTimer: 0, pathDirection: 0, pathTimer: 0 });
};

Enemy.updateHazards = function () {
  for (var i = Enemy.hazards.length - 1; i >= 0; i--) {
    var hazard = Enemy.hazards[i];
    if (hazard.type === "wave") { hazard.x += hazard.vx; }
    if (hazard.warning > 0) { hazard.warning--; }
    hazard.life--;
    var active = hazard.type === "wave" || hazard.warning <= 0;
    if (hazard.type === "laser" && active) {
      var laserDx = hazard.targetX - hazard.x, laserDy = hazard.targetY - hazard.y;
      var laserLength = Math.sqrt(laserDx * laserDx + laserDy * laserDy) || 1;
      var laserProjection = ((Player.x + CONFIG.PLAYER_SIZE / 2 - hazard.x) * laserDx + (Player.y + CONFIG.PLAYER_SIZE / 2 - hazard.y) * laserDy) / laserLength;
      var laserCross = Math.abs((Player.x + CONFIG.PLAYER_SIZE / 2 - hazard.x) * laserDy - (Player.y + CONFIG.PLAYER_SIZE / 2 - hazard.y) * laserDx) / laserLength;
      if (laserProjection >= 0 && laserProjection <= laserLength && laserCross < CONFIG.PLAYER_SIZE / 2 + 4 && !Player.invincible && !Player.dashing) { Player.takeDamage("The laser burned you."); }
      if (hazard.life <= 0) { Enemy.hazards.splice(i, 1); }
      continue;
    }
    var width = hazard.type === "wave" ? 18 : 32;
    var height = hazard.type === "wave" ? 12 : 40;
    if (active && hazard.x + width > Player.x && hazard.x < Player.x + CONFIG.PLAYER_SIZE &&
        hazard.y + height > Player.y && hazard.y < Player.y + CONFIG.PLAYER_SIZE) {
      if (!Player.invincible && !Player.dashing) { Player.takeDamage(hazard.type === "wave" ? "The boss shockwave hit you." : "Spikes caught you."); }
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

Enemy.isOnScreen = function (e) {
  return e.x + CONFIG.ENEMY_SIZE > Draw.cameraX && e.x < Draw.cameraX + CONFIG.CANVAS_W &&
    e.y + CONFIG.ENEMY_SIZE > 0 && e.y < CONFIG.CANVAS_H;
};

Enemy.playerNear = function (e) {
  var dx = Player.x - e.x, dy = Player.y - e.y;
  return dx * dx + dy * dy < CONFIG.HEAR_DISTANCE * CONFIG.HEAR_DISTANCE;
};

Enemy.dodgeBullets = function (e) {
  if (e.turret || e.flying) { return false; }
  for (var i = 0; i < Enemy.playerBullets.length; i++) {
    var bullet = Enemy.playerBullets[i];
    var dx = e.x + CONFIG.ENEMY_SIZE / 2 - (bullet.x + 4);
    var dy = e.y + CONFIG.ENEMY_SIZE / 2 - (bullet.y + 4);
    var bulletComing = (bullet.vx > 0 && dx > 0) || (bullet.vx < 0 && dx < 0) || (bullet.vy > 0 && dy > 0) || (bullet.vy < 0 && dy < 0);
    var lateralThreat = Math.abs(dy) < 42 && Math.abs(dx) < 180;
    var verticalThreat = Math.abs(dx) < 42 && Math.abs(dy) < 180;
    if (bulletComing && (lateralThreat || verticalThreat)) {
      if (e.onGround) {
        e.vy = -CONFIG.JUMP_POWER * 0.72;
        e.onGround = false;
      } else {
        var dodgeDirection = Math.abs(bullet.vx) > Math.abs(bullet.vy) ? (bullet.vx > 0 ? -1 : 1) : (Player.x < e.x ? 1 : -1);
        var dodgeX = e.x + dodgeDirection * e.speed * 2.5;
        if (!Collide.hitsSolid(dodgeX, e.y, CONFIG.ENEMY_SIZE, CONFIG.ENEMY_SIZE)) { e.x = dodgeX; }
      }
      e.alerted = true;
      e.state = "run";
      return true;
    }
  }
  return false;
};

Enemy.alertOthers = function (spotter) {
  var flankIndex = 0;
  for (var i = 0; i < Enemy.list.length; i++) {
    var e = Enemy.list[i];
    if (e !== spotter && !e.fallingGuy) {
      e.state = "run"; e.timer = 0; e.alerted = true;
      if (flankIndex % 2 === 0) { e.flanker = true; e.flankSide = flankIndex % 4 === 0 ? -1 : 1; }
      flankIndex++;
    }
  }
  if (!spotter.backupCalled && Enemy.list.length < 12) {
    spotter.backupCalled = true;
    Enemy.spawnMinion(spotter.x + (spotter.x < Player.x ? -80 : 80));
    Game.showMessage("BACKUP DROPPED IN!");
  }
};

Enemy.enemySlam = function (e) {
  var y = e.y + CONFIG.ENEMY_SIZE - 8;
  Enemy.hazards.push({ type: "wave", x: e.x + CONFIG.ENEMY_SIZE / 2, y: y, vx: -3.5, life: 65 });
  Enemy.hazards.push({ type: "wave", x: e.x + CONFIG.ENEMY_SIZE / 2, y: y, vx: 3.5, life: 65 });
  Enemy.cinematic.shake = Math.max(Enemy.cinematic.shake, 10);
};

Enemy.healNearby = function (e) {
  for (var i = 0; i < Enemy.list.length; i++) {
    var ally = Enemy.list[i];
    var dx = ally.x - e.x, dy = ally.y - e.y;
    if (ally !== e && !ally.dead && dx * dx + dy * dy < 150 * 150) { ally.health = Math.min(ally.maxHealth, ally.health + 1); }
  }
};

Enemy.enemyExplosion = function (e) {
  var index = Enemy.list.indexOf(e);
  if (index < 0) { return; }
  if (Math.abs(Player.x - e.x) < 90 && Math.abs(Player.y - e.y) < 70) { Player.takeDamage("The bomber exploded."); }
  Enemy.kill(index, false);
};
Enemy.shoot = function (e) {
  if (!e || e.dead || e.stunned) { return; }
  var ex = e.x + CONFIG.ENEMY_SIZE / 2, ey = e.y + CONFIG.ENEMY_SIZE / 2;
  var movementBias = Math.sign(Game.habits.right - Game.habits.left) * Math.min(45, Math.floor((Game.habits.right + Game.habits.left) / 120));
  var learnedJumpBias = Game.habits.jumps > Game.habits.shots / 2 ? 24 : 0;
  var px = Player.x + CONFIG.PLAYER_SIZE / 2 + Player.vx * CONFIG.LEAD_FRAMES + movementBias;
  var py = Player.y + CONFIG.PLAYER_SIZE / 2 + learnedJumpBias + (Game.habits.recentJump > 0 ? 18 : 0);
  var dx = px - ex, dy = py - ey, dist = Math.sqrt(dx * dx + dy * dy);
  if (dist === 0) { return; }
  if (e.laser) {
    Enemy.hazards.push({ type: "laser", x: ex, y: ey, targetX: px, targetY: py, warning: 28, life: 48, owner: e });
    return;
  }
  var angles = e.burst ? [-0.12, 0, 0.12] : (e.type === "w" ? [0, Math.PI / 2, Math.PI, Math.PI * 1.5] : [0]);
  if (e.type === "r") { angles = [-0.24, -0.12, 0, 0.12, 0.24]; }
  for (var shot = 0; shot < angles.length; shot++) {
    var angle = Math.atan2(dy, dx) + angles[shot];
    Enemy.bullets.push({ x: ex - 4, y: ey - 4, vx: Math.cos(angle) * e.bulletSpeed, vy: Math.sin(angle) * e.bulletSpeed, owner: e, homing: e.type === "q", bouncing: e.type === "k", bounceCount: 2 });
  }
};

Enemy.draw = function () {
  var ctx = Draw.ctx;
  ctx.fillStyle = "rgba(190, 24, 36, 0.72)";
  ctx.fillRect(Enemy.lavaWallX, 0, 22, CONFIG.CANVAS_H);
  ctx.fillStyle = "#ffcf56";
  for (var lavaMark = 0; lavaMark < CONFIG.CANVAS_H; lavaMark += 28) {
    ctx.fillRect(Enemy.lavaWallX + 4, lavaMark, 14, 5);
  }
  for (var h = 0; h < Enemy.hazards.length; h++) {
    var hazard = Enemy.hazards[h];
    if (hazard.type === "laser") {
      ctx.strokeStyle = hazard.warning > 0 ? "rgba(239, 108, 240, 0.45)" : "#ef6cf0";
      ctx.lineWidth = hazard.warning > 0 ? 2 : 5;
      ctx.beginPath(); ctx.moveTo(hazard.x, hazard.y); ctx.lineTo(hazard.targetX, hazard.targetY); ctx.stroke();
    } else if (hazard.type === "wave") {
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
  for (var shardIndex = 0; shardIndex < Enemy.shards.length; shardIndex++) {
    var shard = Enemy.shards[shardIndex];
    var shardPulse = 1 + Math.sin(Game.frame / 8 + shard.x) * 0.18;
    ctx.save();
    ctx.translate(shard.x + shard.size / 2, shard.y + shard.size / 2);
    ctx.rotate(Math.PI / 4);
    ctx.scale(shardPulse, shardPulse);
    ctx.fillStyle = "#5ce1e6";
    ctx.fillRect(-shard.size / 2, -shard.size / 2, shard.size, shard.size);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.strokeRect(-shard.size / 2, -shard.size / 2, shard.size, shard.size);
    ctx.restore();
  }
  if (Enemy.shop) {
    ctx.fillStyle = "#20252b";
    ctx.fillRect(Enemy.shop.x, Enemy.shop.y, 24, 28);
    ctx.fillStyle = "#ffcf56";
    ctx.beginPath(); ctx.arc(Enemy.shop.x + 12, Enemy.shop.y - 5, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#5ce1e6";
    ctx.fillRect(Enemy.shop.x - 7, Enemy.shop.y - 21, 38, 4);
  }
  for (var fx = 0; fx < Enemy.effects.length; fx++) {
    var particle = Enemy.effects[fx];
    ctx.fillStyle = particle.color || "#d94b32";
    ctx.globalAlpha = particle.life / 28;
    var particleSize = particle.size || 6;
    ctx.fillRect(particle.x - particleSize / 2, particle.y - particleSize / 2, particleSize, particleSize);
  }
  ctx.globalAlpha = 1;
  if (Enemy.boss) {
    var boss = Enemy.boss;
    var enraged = boss.phase > 0;
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
    if (e.shield) {
      ctx.strokeStyle = "#6b89d8";
      ctx.lineWidth = 5;
      ctx.beginPath();
      var shieldAngle = e.dir > 0 ? 0 : Math.PI;
      ctx.arc(e.x + CONFIG.ENEMY_SIZE / 2, e.y + CONFIG.ENEMY_SIZE / 2, CONFIG.ENEMY_SIZE / 2 + 6, shieldAngle - 1.05, shieldAngle + 1.05);
      ctx.stroke();
    }
    if (e.health < e.maxHealth) {
      ctx.fillStyle = "#777777"; ctx.fillRect(e.x + 7, e.y + 7, 18, 4);
    }
    if (e.stunned) {
      ctx.strokeStyle = "#ffcf56"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(e.x + CONFIG.ENEMY_SIZE / 2, e.y + CONFIG.ENEMY_SIZE / 2, CONFIG.ENEMY_SIZE / 2 + 7, 0, Math.PI * 2); ctx.stroke();
    }
    if (e.state === "question" || e.state === "run") {
      ctx.fillStyle = "#000000"; ctx.beginPath(); ctx.arc(e.x + CONFIG.ENEMY_SIZE / 2 + e.dir * 6, e.y + CONFIG.ENEMY_SIZE / 2, 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = "#ffcf56";
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "center";
    ctx.fillText("#" + e.id + " " + e.type, e.x + CONFIG.ENEMY_SIZE / 2, e.y - 6);
    ctx.textAlign = "left";
  }
  ctx.fillStyle = "#000000";
  for (var p = 0; p < Enemy.pickups.length; p++) {
    var pickup = Enemy.pickups[p];
    ctx.fillRect(pickup.x, pickup.y, pickup.size, pickup.size);
    ctx.fillStyle = "#ffffff"; ctx.fillRect(pickup.x + 4, pickup.y + 7, 12, 6); ctx.fillStyle = "#000000";
  }
  for (var b = 0; b < Enemy.bullets.length; b++) {
    var enemyBullet = Enemy.bullets[b];
    ctx.strokeStyle = "rgba(217, 75, 50, 0.45)"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(enemyBullet.x + 4, enemyBullet.y + 4); ctx.lineTo(enemyBullet.x - enemyBullet.vx * 2, enemyBullet.y - enemyBullet.vy * 2); ctx.stroke();
    ctx.fillStyle = "#000000"; ctx.fillRect(enemyBullet.x, enemyBullet.y, 8, 8);
  }
  for (var pb = 0; pb < Enemy.playerBullets.length; pb++) {
    var playerBullet = Enemy.playerBullets[pb];
    ctx.strokeStyle = "rgba(255, 207, 86, 0.7)"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(playerBullet.x + 4, playerBullet.y + 4); ctx.lineTo(playerBullet.x - playerBullet.vx * 2, playerBullet.y - playerBullet.vy * 2); ctx.stroke();
    ctx.fillStyle = "#ffcf56"; ctx.fillRect(playerBullet.x, playerBullet.y, 8, 8);
  }
};
