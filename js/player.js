/* =====================================================================
   player.js  --  THE ROLLING CIRCLE.
   ===================================================================== */

var Player = {
  x: 0, y: 0, vx: 0, vy: 0, onGround: false, angle: 0, aimAngle: 0,
  hasGun: false, gunLevel: 0, weaponType: "sidearm", ammo: CONFIG.PLAYER_START_AMMO, weaponTimer: 0, invincible: false, invincibleTimer: 0, shootCooldown: 0,
  speedMultiplier: 1, jumpMultiplier: 1, gravityMultiplier: 1, damageMultiplier: 1, gambleEffect: "",
  health: CONFIG.PLAYER_HEALTH, maxHealth: CONFIG.PLAYER_HEALTH, hitTimer: 0,
  dashTimer: 0, dashCooldown: 0, dashDirection: 1, dashing: false,
  scaleX: 1, scaleY: 1, muzzleFlash: 0, perks: [], shieldMultiplier: 1, piercing: false, ricochet: false, adaptiveAim: false,
  shards: 0, deathTimer: 0, deathVy: 0, deathAnimating: false
};

Player.reset = function () {
  Player.x = Level.startX; Player.y = Level.startY; Player.vx = 0; Player.vy = 0;
  Player.onGround = false; Player.angle = 0; Player.aimAngle = 0;
  Player.hasGun = false; Player.gunLevel = 0; Player.weaponType = "sidearm"; Player.ammo = CONFIG.PLAYER_START_AMMO; Player.weaponTimer = 0;
  Player.invincible = false; Player.invincibleTimer = 0; Player.shootCooldown = 0;
  Player.speedMultiplier = 1; Player.jumpMultiplier = 1; Player.gravityMultiplier = 1;
  Player.damageMultiplier = 1; Player.gambleEffect = "";
  Player.shieldMultiplier = 1; Player.piercing = false; Player.ricochet = false; Player.adaptiveAim = false;
  Player.deathTimer = 0; Player.deathVy = 0; Player.deathAnimating = false;
  for (var perkIndex = 0; perkIndex < Player.perks.length; perkIndex++) {
    if (Player.perks[perkIndex] === "speed") { Player.speedMultiplier *= 1.12; }
    if (Player.perks[perkIndex] === "jump") { Player.jumpMultiplier *= 1.15; }
    if (Player.perks[perkIndex] === "shield") { Player.shieldMultiplier *= 1.35; }
    if (Player.perks[perkIndex] === "pierce") { Player.piercing = true; }
  }
  Player.health = CONFIG.PLAYER_HEALTH; Player.maxHealth = CONFIG.PLAYER_HEALTH; Player.hitTimer = 0;
  Player.dashTimer = 0; Player.dashCooldown = 0; Player.dashDirection = 1; Player.dashing = false;
  Player.scaleX = 1; Player.scaleY = 1; Player.muzzleFlash = 0;
};

Player.takeDamage = function (reason) {
  if (Player.invincible || Player.dashing || Player.hitTimer > 0 || Game.mode !== "playing") { return; }
  Player.health--;
  Player.hitTimer = CONFIG.HIT_COOLDOWN;
  Game.hitTint = 12;
  AudioFX.hit();
  Game.showMessage(reason + " Health " + Player.health + "/" + Player.maxHealth);
  if (Player.health <= 0) { Game.die(reason); }
};

Player.unstick = function () {
  var size = CONFIG.PLAYER_SIZE;
  if (!Collide.hitsSolid(Player.x, Player.y, size, size)) { return; }
  for (var up = 0; up < CONFIG.TILE * 2; up++) {
    Player.y--;
    if (!Collide.hitsSolid(Player.x, Player.y, size, size)) { Player.vy = 0; return; }
  }
  for (var side = 1; side <= CONFIG.TILE * 2; side++) {
    var direction = side % 2 === 0 ? 1 : -1;
    var escapeX = Player.x + direction * side;
    if (!Collide.hitsSolid(escapeX, Player.y, size, size)) { Player.x = escapeX; Player.vx = 0; Player.vy = 0; return; }
  }
};

Player.update = function () {
  var size = CONFIG.PLAYER_SIZE;
  Player.unstick();
  var wasOnGround = Player.onGround;
  var centerX = Player.x + size / 2, centerY = Player.y + size / 2;
  var aimX = Input.mouseX - centerX, aimY = Input.mouseY - centerY;
  if (aimX !== 0 || aimY !== 0) { Player.aimAngle = Math.atan2(aimY, aimX); }
  Player.vx = 0;
  if (Input.left) { Player.vx = -CONFIG.MOVE_SPEED * Player.speedMultiplier; }
  if (Input.right) { Player.vx = CONFIG.MOVE_SPEED * Player.speedMultiplier; }
  if (Input.left) { Game.habits.left++; }
  if (Input.right) { Game.habits.right++; }
  if (Input.jump && Player.onGround) { Game.habits.jumps++; Game.habits.recentJump = 35; }
  if (Game.habits.recentJump > 0) { Game.habits.recentJump--; }
  if (Input.jump && Player.onGround) { Player.vy = -CONFIG.JUMP_POWER * Player.jumpMultiplier; Player.onGround = false; Player.scaleX = 1.2; Player.scaleY = 0.78; AudioFX.jump(); }
  if (Player.dashCooldown > 0) { Player.dashCooldown--; }
  if (Player.hitTimer > 0) { Player.hitTimer--; }
  if (Input.dash && Player.dashCooldown === 0) {
    Player.dashDirection = Input.left ? -1 : (Input.right ? 1 : (Math.cos(Player.aimAngle) < 0 ? -1 : 1));
    Player.dashTimer = CONFIG.DASH_FRAMES;
    Player.dashCooldown = CONFIG.DASH_COOLDOWN;
    Game.habits.dashes++;
    Input.dash = false;
    AudioFX.dash();
  }
  Player.dashing = Player.dashTimer > 0;
  if (Player.dashing) {
    Player.vx = Player.dashDirection * CONFIG.DASH_SPEED;
    Player.vy = 0;
    Player.dashTimer--;
  } else {
    Player.vy += CONFIG.GRAVITY * Player.gravityMultiplier * Game.gravityScale * (Game.gravityFlipped ? -1 : 1);
  }
  if (!Game.gravityFlipped && Player.vy > CONFIG.MAX_FALL) { Player.vy = CONFIG.MAX_FALL; }
  if (Game.gravityFlipped && Player.vy < -CONFIG.MAX_FALL) { Player.vy = -CONFIG.MAX_FALL; }

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
  if (!wasOnGround && Player.onGround) {
    Player.scaleX = 1.3; Player.scaleY = 0.7;
    for (var dust = 0; dust < 8; dust++) {
      Enemy.effects.push({ x: centerX, y: Player.y + size, vx: (Math.random() - 0.5) * 4, vy: -Math.random() * 2, life: 20, color: "#8c8c8c", size: 4 });
    }
  }
  Player.scaleX += (1 - Player.scaleX) * 0.18;
  Player.scaleY += (1 - Player.scaleY) * 0.18;
  if (Player.x < 0) { Player.x = 0; }
  if ((Player.x < CONFIG.TILE * 2 || Player.x > Level.pixelWidth() - CONFIG.TILE * 2) && Math.abs(Player.vx) < 0.2) { Game.habits.corners++; }

  if (Player.shootCooldown > 0) { Player.shootCooldown--; }
  if (Player.muzzleFlash > 0) { Player.muzzleFlash--; }
  if (Player.weaponTimer > 0) {
    Player.weaponTimer--;
    if (Player.weaponTimer === 0 && Player.gunLevel > 1) { Player.gunLevel = 1; }
  }
  if (Player.invincibleTimer > 0) {
    Player.invincibleTimer--;
    if (Player.invincibleTimer === 0) { Player.invincible = false; }
  }
  if (Player.hasGun && Player.ammo > 0 && (Input.shoot || Input.mouseDown) && Player.shootCooldown === 0) {
    Enemy.firePlayerBullet(); AudioFX.shoot(); Enemy.cinematic.shake = Math.max(Enemy.cinematic.shake, 3); Player.muzzleFlash = 5; Player.ammo--; Game.habits.shots++; Player.shootCooldown = Player.weaponType === "shotgun" ? 22 : (Player.weaponType === "burst" ? 30 : (Player.weaponType === "laser" ? 5 : (Player.weaponType === "grenade" ? 28 : CONFIG.PLAYER_SHOOT_COOLDOWN)));
    if (Player.ammo === 0) { Player.hasGun = false; Player.gunLevel = 0; Game.showMessage("CLICK. Empty weapon."); }
  }
};

Player.isDead = function () {
  if (Player.y > CONFIG.CANVAS_H + 200) {
    if (Player.invincible) {
      Player.x = Math.max(0, Level.startX);
      Player.y = Level.startY;
      Player.vx = 0;
      Player.vy = 0;
      return false;
    }
    return true;
  }
  if (!Player.invincible && !Player.dashing &&
      (Collide.hitsSpike(Player.x, Player.y, CONFIG.PLAYER_SIZE, CONFIG.PLAYER_SIZE) ||
       Collide.hitsLava(Player.x, Player.y, CONFIG.PLAYER_SIZE, CONFIG.PLAYER_SIZE))) {
    Player.takeDamage("The hazard hit you.");
  }
  return Game.mode === "dead";
};

Player.startDeathAnimation = function () {
  Player.deathAnimating = true;
  Player.deathTimer = 45;
  Player.deathVy = Player.vy < 1 ? 2 : Player.vy;
};

Player.updateDeathAnimation = function () {
  if (!Player.deathAnimating || Player.deathTimer <= 0) { return; }
  Player.deathTimer--;
  Player.deathVy += CONFIG.GRAVITY;
  Player.y += Player.deathVy;
  Player.angle += 0.16;
};
Player.hasWon = function () {
  if (Enemy.boss || Enemy.list.length > 0) { return false; }
  for (var i = 0; i < Level.finishTiles.length; i++) {
    var finish = Level.finishTiles[i];
    var flagFootprintY = finish.y + CONFIG.TILE;
    if (Player.onGround && Player.x + CONFIG.PLAYER_SIZE > finish.x + 8 && Player.x < finish.x + CONFIG.TILE - 8 &&
      Player.y + CONFIG.PLAYER_SIZE >= flagFootprintY - 2 && Player.y + CONFIG.PLAYER_SIZE <= flagFootprintY + 8) { return true; }
  }
  return false;
};
