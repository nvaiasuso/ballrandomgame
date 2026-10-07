/* =====================================================================
   self-test.js -- isolated gameplay checks with a readable report.
   ===================================================================== */

var SelfTest = { frame: null, timeout: null, requestId: 0, messageHandler: null };

SelfTest.run = function () {
  if (SelfTest.frame) { SelfTest.finishRun("A previous test run was replaced."); }
  var panel = document.getElementById("self-test-panel");
  var status = document.getElementById("self-test-status");
  var list = document.getElementById("self-test-results");
  var button = document.getElementById("self-test-button");
  if (!panel || !status || !list || !button) { return; }
  SelfTest.requestId++;
  var requestId = String(SelfTest.requestId);
  list.innerHTML = "";
  status.textContent = "Running tests in an isolated copy of the game...";
  panel.hidden = false;
  button.disabled = true;

  var frame = document.createElement("iframe");
  var url = new URL(window.location.href);
  url.searchParams.set("gameSelfTest", String(requestId));
  frame.title = "Isolated game self-test";
  frame.setAttribute("aria-hidden", "true");
  frame.style.display = "none";
  SelfTest.frame = frame;
  SelfTest.messageHandler = function (event) {
    if (event.source !== frame.contentWindow || !event.data || event.data.type !== "roller-self-test-results" || String(event.data.requestId) !== requestId) { return; }
    SelfTest.render(event.data.results || []);
    SelfTest.finishRun();
  };
  window.addEventListener("message", SelfTest.messageHandler);
  SelfTest.timeout = window.setTimeout(function () {
    SelfTest.render([{ name: "Test runner", passed: false, detail: "The isolated game did not finish loading. Check that the level data files are available." }]);
    SelfTest.finishRun();
  }, 20000);
  document.body.appendChild(frame);
  frame.src = url.toString();
};

SelfTest.render = function (results) {
  var status = document.getElementById("self-test-status");
  var list = document.getElementById("self-test-results");
  var passed = 0;
  for (var i = 0; i < results.length; i++) {
    var result = results[i];
    var item = document.createElement("li");
    item.className = result.passed ? "self-test-pass" : "self-test-fail";
    item.textContent = (result.passed ? "PASS" : "FAIL") + " · " + result.name + (result.detail ? " — " + result.detail : "");
    list.appendChild(item);
    if (result.passed) { passed++; }
  }
  var failed = results.length - passed;
  status.textContent = passed + "/" + results.length + " checks passed" + (failed ? " · " + failed + " need attention" : " · all clear");
};

SelfTest.finishRun = function (message) {
  if (SelfTest.timeout) { window.clearTimeout(SelfTest.timeout); SelfTest.timeout = null; }
  if (SelfTest.messageHandler) {
    window.removeEventListener("message", SelfTest.messageHandler);
    SelfTest.messageHandler = null;
  }
  if (SelfTest.frame) { SelfTest.frame.remove(); SelfTest.frame = null; }
  var status = document.getElementById("self-test-status");
  var button = document.getElementById("self-test-button");
  if (button) { button.disabled = false; }
  if (message && status) { status.textContent = message; }
};

SelfTest.runInFrame = function (requestId) {
  var results = [];
  var nativeRandom = Math.random;

  function assert(condition, message) {
    if (!condition) { throw new Error(message || "Expected behavior did not occur."); }
  }

  function test(name, run) {
    try {
      run();
      results.push({ name: name, passed: true, detail: "" });
    } catch (error) {
      results.push({ name: name, passed: false, detail: error.message || String(error) });
    }
  }

  function resetGame() {
    Tutorial.active = false;
    Tutorial.menuVisible = false;
    Tutorial.checkpoint = null;
    Game.balanceBoostActive = false;
    Game.secretBuffCinematic = null;
    Game.secretBuffImageFlashTimer = 0;
    Game.secretBuffImageFlashX = 0;
    Game.secretBuffImageFlashY = 0;
    Game.secretBuffImageFlashSize = 0;
    Game.secretBuffImageFlashStreaks = [];
    Draw.showSecretImage = false;
    Game.score = 0;
    Game.keepPerks = false;
    Player.perks = [];
    Player.secretInvincibility = false;
    Player.secretBuff = false;
    Player.secretSprayTimer = 0;
    Input.secretImageFlashActivation = false;
    Tutorial.clearInput();
    Game.startLevel(CONFIG.START_LEVEL);
    Game.introTimer = 0;
    Game.levelTime = 10000;
    Game.mode = "playing";
  }

  function makeEnemy(x, y, health) {
    return {
      id: Enemy.nextId++, x: x, y: y, vy: 0, state: "run", timer: 0, dir: 1,
      onGround: true, alerted: true, shootTimer: 10000, health: health,
      maxHealth: health, speed: 0, shootFrames: 10000, bulletSpeed: 0,
      type: "e", color: "#ffffff", weaponType: null, weaponPower: 0,
      targetPickup: null, original: true
    };
  }

  try {
    test("Level data and player spawn", function () {
      resetGame();
      assert(Level.grid.length === CONFIG.ROWS, "Level grid has the wrong number of rows.");
      assert(Level.startX >= 0 && Level.startY >= 0, "Player start was not found.");
      assert(Level.finishTiles.length > 0, "No finish flag was loaded.");
      assert(Level.levels.length === 49, "The full expanded campaign was not loaded.");
      var parkourLevels = Level.levels.filter(function (level) { return level.name.indexOf("Parkour") === 0; });
      assert(parkourLevels.length === 6 && parkourLevels.every(function (level) {
        return level.pieces.every(function (piece) { return !!Level.pieces[piece]; });
      }), "The new parkour stages or their terrain pieces are missing.");
      assert(Level.levels.length === 49, "The full expanded campaign was not loaded.");
      var parkourLevels = Level.levels.filter(function (level) { return level.name.indexOf("Parkour") === 0; });
      assert(parkourLevels.length === 6 && parkourLevels.every(function (level) {
        return level.pieces.every(function (piece) { return !!Level.pieces[piece]; });
      }), "The new parkour stages or their terrain pieces are missing.");
    });

    test("Crossfire timer is generous enough", function () {
      resetGame();
      assert(CONFIG.LEVEL_TIMES[7] >= 28, "Crossfire should have more than the default 20-second timer.");
    });

    test("Solid tile collision", function () {
      resetGame();
      var original = Level.charAt(0, 0);
      Level.setCharAt(0, 0, "#");
      assert(Collide.hitsSolid(0, 0, 8, 8), "Solid tile was not detected.");
      Level.setCharAt(0, 0, original);
    });

    test("Spike and lava collision", function () {
      resetGame();
      var original = Level.charAt(0, 0);
      Level.setCharAt(0, 0, "^");
      assert(Collide.hitsSpike(0, 0, 8, 8), "Spike tile was not detected.");
      Level.setCharAt(0, 0, "~");
      assert(Collide.hitsLava(0, 0, 8, 8), "Lava tile was not detected.");
      Level.setCharAt(0, 0, original);
    });

    test("Player movement", function () {
      resetGame();
      var startingX = Player.x;
      Input.right = true;
      Player.update();
      assert(Player.x > startingX, "Holding right did not move the player.");
    });

    test("Jump input", function () {
      resetGame();
      Player.onGround = true;
      Input.jump = true;
      Player.update();
      assert(Player.vy < 0, "Jump did not give the player upward velocity.");
    });

    test("Dash and cooldown", function () {
      resetGame();
      Input.dash = true;
      Player.update();
      assert(Player.dashing && Player.dashCooldown === CONFIG.DASH_COOLDOWN, "Dash did not start with its configured cooldown.");
    });

    test("Only Shift+E starts Endless", function () {
      resetGame();
      var prevented = false;
      Input.handleEndlessKey({ code: "KeyE", repeat: false, shiftKey: false, preventDefault: function () { prevented = true; } });
      assert(!Input.endless && !prevented, "Plain E should not trigger an action.");
      Tutorial.clearInput();
      Input.handleEndlessKey({ code: "KeyE", repeat: false, shiftKey: true, preventDefault: function () { prevented = true; } });
      assert(Input.endless && prevented, "Shift+E did not trigger Endless mode.");
    });

    test("Shift+L requests the secret image flash", function () {
      var originalActivation = Input.secretImageFlashActivation;
      var prevented = false;
      Input.secretImageFlashActivation = false;
      try {
        assert(Input.handleSecretImageFlashKey({
          code: "KeyL", repeat: false, shiftKey: false, preventDefault: function () { prevented = true; }
        }, 100) === false, "Plain L triggered the image flash.");
        Input.handleSecretImageFlashKey({
          code: "KeyL", repeat: false, shiftKey: true, preventDefault: function () { prevented = true; }
        });
        assert(Input.secretImageFlashActivation && prevented, "Shift+L did not trigger the image flash.");
      } finally {
        Input.secretImageFlashActivation = originalActivation;
      }
    });

    test("Shift+E starts an Endless wave", function () {
      resetGame();
      Input.handleEndlessKey({ code: "KeyE", repeat: false, shiftKey: true, preventDefault: function () {} });
      Game.update();
      assert(Game.endless && Level.name === "ENDLESS WAVE 1", "Shift+E did not start the first Endless wave.");
    });

    test("Parry action and animation are removed", function () {
      resetGame();
      assert(typeof Player.startParry === "undefined" && typeof Draw.parryRing === "undefined" &&
        typeof Player.parryTimer === "undefined" && typeof Input.parry === "undefined" &&
        typeof Enemy.reflectBullets === "undefined", "Parry state, visuals, or reflection helper are still present.");
    });

    test("Stomping no longer reflects enemy shots", function () {
      resetGame();
      var originalHitsSolid = Collide.hitsSolid;
      var target = makeEnemy(Player.x, Player.y + 20, 1);
      var bullet = { x: Player.x + 8, y: Player.y + 8, vx: -4, vy: 0, owner: null };
      Enemy.list = [target];
      Enemy.bullets = [bullet];
      Player.vy = 1;
      Collide.hitsSolid = function () { return false; };
      try {
        Enemy.checkPlayerContact();
      } finally {
        Collide.hitsSolid = originalHitsSolid;
      }
      assert(!bullet.reflected && bullet.vx === -4, "Stomping reflected a nearby enemy shot.");
    });

    test("Player shots no longer parry enemy bullets", function () {
      resetGame();
      var originalHitsSolid = Collide.hitsSolid;
      var enemyShot = { x: 104, y: 100, vx: -3, vy: 0, owner: null };
      var playerShot = { x: 100, y: 100, vx: 5, vy: 0, damage: 1, hitTargets: [], bounces: 0 };
      Enemy.bullets = [enemyShot];
      Enemy.playerBullets = [playerShot];
      Collide.hitsSolid = function () { return false; };
      try {
        Enemy.updatePlayerBullets();
      } finally {
        Collide.hitsSolid = originalHitsSolid;
      }
      assert(enemyShot.vx === -3 && Enemy.bullets.length === 1, "Player fire parried an enemy bullet.");
    });

    test("Weapon pickup", function () {
      resetGame();
      Enemy.pickups.push({ x: Player.x + 4, y: Player.y + 4, size: 20, level: 1, weaponType: "shotgun" });
      Enemy.collectPickups();
      assert(Player.hasGun && Player.weaponType === "shotgun" && Player.ammo > 0, "Weapon pickup did not equip and load the weapon.");
    });

    test("Player firing", function () {
      resetGame();
      Player.hasGun = true;
      Player.ammo = 1;
      Enemy.firePlayerBullet();
      assert(Enemy.playerBullets.length === 1 && Enemy.playerBullets[0].damage > 0, "Firing did not create a damaging player bullet.");
    });

    test("Scattergun fires a wide nine-pellet spread", function () {
      resetGame();
      Player.weaponType = "scattergun";
      Player.hasGun = true;
      Player.ammo = 5;
      Player.aimAngle = 0;
      Enemy.firePlayerBullet();
      assert(Enemy.playerBullets.length === 9 && Enemy.playerBullets[0].vy < 0 &&
        Enemy.playerBullets[8].vy > 0, "Scattergun did not create its wide nine-shot fan.");
    });

    test("Minigun fires fast single rounds", function () {
      resetGame();
      Player.weaponType = "minigun";
      Player.hasGun = true;
      Player.ammo = 5;
      Player.aimAngle = 0;
      Player.gravityMultiplier = 0;
      Input.mouseX = Player.x + 100;
      Input.mouseY = Player.y + CONFIG.PLAYER_SIZE / 2;
      Input.shoot = true;
      Player.update();
      assert(Enemy.playerBullets.length === 1 && Enemy.playerBullets[0].vx === 10 &&
        Player.shootCooldown === 5, "Minigun did not fire a fast single round.");
    });

    test("Shift+O toggles the custom ring image", function () {
      resetGame();
      Input.handleVisualKey({ code: "KeyO", repeat: false, shiftKey: true, preventDefault: function () {} });
      Game.update();
      assert(Draw.showSecretImage, "Shift+O did not enable the custom ring image.");
      Input.handleVisualKey({ code: "KeyO", repeat: false, shiftKey: true, preventDefault: function () {} });
      Game.update();
      assert(!Draw.showSecretImage, "Shift+O did not restore E tokens.");
    });

    test("Secret ring defaults to E instead of the photo", function () {
      resetGame();
      var originalContext = Draw.ctx;
      var originalDrawSecretImage = Draw.drawSecretImage;
      var originalImageReady = Draw.secretImageReady;
      var originalShowImage = Draw.showSecretImage;
      var labels = [];
      var imageCalls = 0;
      Draw.ctx = {
        save: function () {}, restore: function () {}, translate: function () {}, rotate: function () {},
        scale: function () {}, beginPath: function () {}, arc: function () {}, fill: function () {}, stroke: function () {},
        fillText: function (text) { labels.push(text); }
      };
      Draw.secretImageReady = true;
      Draw.showSecretImage = false;
      Draw.drawSecretImage = function () { imageCalls++; };
      try {
        Draw.drawSecretSprite(0, 0, 24);
        assert(labels.indexOf("E") >= 0 && imageCalls === 0, "The default secret token was not E.");
        Draw.showSecretImage = true;
        Draw.drawSecretSprite(0, 0, 24);
        assert(imageCalls === 1, "Custom image did not show after enabling it.");
      } finally {
        Draw.ctx = originalContext;
        Draw.drawSecretImage = originalDrawSecretImage;
        Draw.secretImageReady = originalImageReady;
        Draw.showSecretImage = originalShowImage;
      }
    });

    test("Secret buff image flash is small, fast, and sends white streaks downward", function () {
      resetGame();
      var originalImageReady = Draw.secretImageReady;
      var originalRandom = Math.random;
      var originalTimer = Game.secretBuffImageFlashTimer;
      var originalStreaks = Game.secretBuffImageFlashStreaks;
      var originalX = Game.secretBuffImageFlashX;
      var originalY = Game.secretBuffImageFlashY;
      var originalSize = Game.secretBuffImageFlashSize;
      var originalSecretBuff = Player.secretBuff;
      var originalMode = Game.mode;
      Draw.secretImageReady = true;
      Player.secretBuff = true;
      Game.secretBuffImageFlashTimer = 0;
      Math.random = function () { return 0; };
      try {
        Input.secretImageFlashActivation = true;
        Game.updateSecretBuffImageFlash();
        assert(Game.secretBuffImageFlashTimer === 24 && Game.secretBuffImageFlashSize === 48 &&
          Game.secretBuffImageFlashStreaks.length === 14,
          "The image was not set to flash briefly with falling white streaks.");
        assert(Game.secretBuffImageFlashX >= 0 && Game.secretBuffImageFlashY >= 0 &&
          Game.secretBuffImageFlashX + Game.secretBuffImageFlashSize <= CONFIG.CANVAS_W &&
          Game.secretBuffImageFlashY + Game.secretBuffImageFlashSize <= CONFIG.CANVAS_H,
          "The photo flash position was outside the screen.");
        assert(Game.secretBuffImageFlashStreaks.every(function (streak) { return streak.speed >= 5 && streak.speed < 12; }),
          "The white streaks were not moving down quickly.");
        Game.updateSecretBuffImageFlash();
        assert(Game.secretBuffImageFlashTimer === 23, "The image flash did not last a split second.");
        Game.mode = "paused";
        Game.updateSecretBuffImageFlash();
        assert(Game.secretBuffImageFlashTimer === 0 && Game.secretBuffImageFlashStreaks.length === 0,
          "The photo flash persisted through a pause.");
        Game.mode = "playing";
        Player.secretBuff = false;
        Game.updateSecretBuffImageFlash();
        assert(Game.secretBuffImageFlashTimer === 0,
          "The flash timers were not cleared after the secret buff ended.");
      } finally {
        Draw.secretImageReady = originalImageReady;
        Math.random = originalRandom;
        Game.secretBuffImageFlashTimer = originalTimer;
        Game.secretBuffImageFlashStreaks = originalStreaks;
        Game.secretBuffImageFlashX = originalX;
        Game.secretBuffImageFlashY = originalY;
        Game.secretBuffImageFlashSize = originalSize;
        Player.secretBuff = originalSecretBuff;
        Game.mode = originalMode;
      }
    });

    test("Secret buff photo flash is visible only during active play", function () {
      resetGame();
      var originalContext = Draw.ctx;
      var originalImage = Draw.secretImage;
      var originalImageReady = Draw.secretImageReady;
      var originalTimer = Game.secretBuffImageFlashTimer;
      var originalStreaks = Game.secretBuffImageFlashStreaks;
      var originalX = Game.secretBuffImageFlashX;
      var originalY = Game.secretBuffImageFlashY;
      var originalSize = Game.secretBuffImageFlashSize;
      var originalSecretBuff = Player.secretBuff;
      var originalMode = Game.mode;
      var originalStrokeCalls = 0;
      var drawnImages = [];
      var streakY = [];
      Draw.ctx = {
        save: function () {}, restore: function () {},
        stroke: function () { originalStrokeCalls++; },
        beginPath: function () {}, moveTo: function (x, y) { streakY.push(y); },
        lineTo: function () {}, arc: function () {}, fill: function () {},
        drawImage: function (image, x, y, width, height) {
          drawnImages.push({ image: image, x: x, y: y, width: width, height: height, alpha: this.globalAlpha });
        }
      };
      Draw.secretImage = { naturalWidth: 800, naturalHeight: 400 };
      Draw.secretImageReady = true;
      Game.secretBuffImageFlashTimer = 24;
      Game.secretBuffImageFlashSize = 56;
      Game.secretBuffImageFlashX = 110;
      Game.secretBuffImageFlashY = 70;
      Game.secretBuffImageFlashStreaks = [{ x: 15, y: 20, speed: 6, size: 2 }];
      try {
        Player.secretBuff = false;
        Draw.secretBuffImageFlash();
        Player.secretBuff = true;
        Game.secretBuffImageFlashTimer = 24;
        Draw.secretBuffImageFlash();
        Game.secretBuffImageFlashTimer = 23;
        Draw.secretBuffImageFlash();
        Game.secretBuffImageFlashTimer = 22;
        Draw.secretBuffImageFlash();
        assert(drawnImages.length === 2 && originalStrokeCalls === 3 &&
          streakY[1] > streakY[0] && streakY[2] > streakY[1],
          "The image did not flicker rapidly or the white streaks did not fall.");
        assert(drawnImages[1].image === Draw.secretImage && drawnImages[1].x === 110 &&
          Math.abs(drawnImages[1].y - 79.33333333333333) < 0.001 &&
          drawnImages[1].width === 56 && drawnImages[1].height === 37.333333333333336 && drawnImages[1].alpha === 0.5,
          "The photo was not drawn at its random position, visible size, and original aspect ratio.");
        Game.mode = "paused";
        Draw.secretBuffImageFlash();
        assert(drawnImages.length === 2 && originalStrokeCalls === 3,
          "The photo flash appeared while the game was paused.");
      } finally {
        Draw.ctx = originalContext;
        Draw.secretImage = originalImage;
        Draw.secretImageReady = originalImageReady;
        Game.secretBuffImageFlashTimer = originalTimer;
        Game.secretBuffImageFlashStreaks = originalStreaks;
        Game.secretBuffImageFlashX = originalX;
        Game.secretBuffImageFlashY = originalY;
        Game.secretBuffImageFlashSize = originalSize;
        Player.secretBuff = originalSecretBuff;
        Game.mode = originalMode;
      }
    });

    test("Only the secret spray leaves white screen splats", function () {
      resetGame();
      for (var shot = 0; shot < 60; shot++) { Game.recordPlayerShot(); }
      assert(Game.screenSplats.length === 0 && Game.splatShotCount === 0, "Ordinary weapon fire left screen splats.");
      Player.secretBuff = true;
      Player.secretSprayTimer = 5;
      for (var sprayShot = 0; sprayShot < 60; sprayShot++) { Game.recordPlayerShot(); }
      assert(Game.screenSplats.length === 14 && Game.splatShotCount === 60, "Secret spray splats did not accumulate or respect their screen cap.");
      Input.handleVisualKey({ key: "y", repeat: false, shiftKey: false, preventDefault: function () {} });
      Game.update();
      assert(Game.screenSplats.length === 0 && Game.splatShotCount === 0, "Y did not wipe screen splats and reset their buildup.");
    });

    test("Weapon trial levels contain new weapons and enemy types", function () {
      var weaponLevels = Level.levels.filter(function (level) { return level.name.indexOf("Weapon Trial -") === 0; });
      assert(weaponLevels.length === 3, "The new weapon trial stages are missing.");
      var foundWeapons = {};
      var foundEnemies = {};
      for (var trialIndex = 0; trialIndex < weaponLevels.length; trialIndex++) {
        Level.build(Level.levels.indexOf(weaponLevels[trialIndex]));
        Enemy.reset();
        for (var pickupIndex = 0; pickupIndex < Enemy.pickups.length; pickupIndex++) {
          foundWeapons[Enemy.pickups[pickupIndex].weaponType] = true;
        }
        for (var enemyIndex = 0; enemyIndex < Enemy.list.length; enemyIndex++) {
          foundEnemies[Enemy.list[enemyIndex].type] = true;
        }
      }
      assert(foundWeapons.scattergun && foundWeapons.minigun && foundWeapons.homing &&
        foundWeapons.burst && foundWeapons.boomerang && foundWeapons.piercer && foundWeapons.ricochet,
        "A weapon trial pickup did not load its weapon.");
      assert(foundEnemies.x && foundEnemies.q && foundEnemies.u && foundEnemies.l && foundEnemies.a && foundEnemies.p,
        "The weapon trials are missing their added enemy roster.");
      resetGame();
    });

    test("Piercer weapon penetrates enemies", function () {
      resetGame();
      Player.weaponType = "piercer";
      Player.hasGun = true;
      Player.ammo = 5;
      Enemy.firePlayerBullet();
      assert(Enemy.playerBullets[0].piercing && Enemy.playerBullets[0].damage === 2, "Piercer did not create a two-damage piercing shot.");
    });

    test("Ricochet weapon bounces off walls", function () {
      resetGame();
      Player.weaponType = "ricochet";
      Player.hasGun = true;
      Player.ammo = 5;
      Enemy.firePlayerBullet();
      Enemy.firePlayerBullet();
      assert(Enemy.playerBullets.length === 2 && Enemy.playerBullets.every(function (bullet) {
        return bullet.bounces === CONFIG.PLAYER_RICOCHET_BOUNCES;
      }), "Ricochet gun did not keep firing repeated wall-bouncing shots.");
      var bullet = Enemy.playerBullets[0];
      var originalTile = Level.charAt(0, 0);
      var bounced = false;
      Level.setCharAt(0, 0, "#");
      try {
        bullet.x = 0; bullet.y = 0; bullet.vx = 5; bullet.vy = 0;
        Enemy.playerBullets = [bullet];
        Enemy.updatePlayerBullets();
        bounced = bullet.vx < 0 && bullet.bounces === CONFIG.PLAYER_RICOCHET_BOUNCES - 1;
      } finally {
        Level.setCharAt(0, 0, originalTile);
      }
      assert(bounced, "Ricochet shot did not reverse when it hit a wall.");
    });

    test("Player bullets damage enemies", function () {
      resetGame();
      var target = makeEnemy(Player.x + 60, Player.y, 2);
      Enemy.list = [target];
      Enemy.playerBullets.push({ x: target.x + 2, y: target.y + 2, vx: 0, vy: 0, damage: 1, hitTargets: [] });
      Enemy.updatePlayerBullets();
      assert(target.health === 1, "Player bullet did not reduce enemy health.");
    });

    test("Enemy bullets damage the player", function () {
      resetGame();
      var health = Player.health;
      Enemy.bullets.push({ x: Player.x, y: Player.y, vx: 0, vy: 0, owner: null });
      Enemy.update();
      assert(Player.health === health - 1, "Enemy bullet did not damage the player.");
    });

    test("Invincibility blocks a live enemy bullet", function () {
      resetGame();
      var health = Player.health;
      Player.invincible = true;
      Enemy.bullets.push({ x: Player.x, y: Player.y, vx: 0, vy: 0, owner: null });
      Enemy.update();
      assert(Player.health === health, "Player lost health while invincible.");
    });

    test("Hit cooldown prevents repeat damage", function () {
      resetGame();
      Player.takeDamage("self-test");
      var healthAfterFirstHit = Player.health;
      Player.takeDamage("self-test");
      assert(Player.health === healthAfterFirstHit && Player.hitTimer === CONFIG.HIT_COOLDOWN, "Hit cooldown did not block a second immediate hit.");
    });

    test("Death screen selects a fresh taunt", function () {
      resetGame();
      var previousTaunt = Game.lastDeathTaunt;
      Math.random = function () { return 0; };
      Game.die("self-test");
      assert(Game.deathTaunts.indexOf(Game.deathTaunt) >= 0, "Death did not select a configured taunt.");
      assert(Game.deathTaunt !== previousTaunt, "Death repeated the previous taunt.");
      assert(document.getElementById("message").textContent.indexOf("Press R to try again.") >= 0, "Death message lost the restart prompt.");
    });

    test("Invincibility pickup", function () {
      resetGame();
      Enemy.pickups.push({ x: Player.x + 4, y: Player.y + 4, size: 20, type: "invincibility" });
      Enemy.collectPickups();
      assert(Player.invincible && Player.invincibleTimer === CONFIG.INVINCIBILITY_TIME, "Shield pickup did not grant its timed effect.");
    });

    test("Enemy shield pickup lasts two seconds", function () {
      resetGame();
      var enemy = makeEnemy(Player.x + 100, Player.y, 2);
      var shield = { x: enemy.x + 4, y: enemy.y + 4, size: 20, type: "invincibility" };
      Enemy.pickups = [shield];
      enemy.targetPickup = shield;
      assert(Enemy.collectPickup(enemy), "Enemy could not collect a shield pickup.");
      assert(enemy.powerupShieldTimer === 120 && CONFIG.ENEMY_INVINCIBILITY_TIME === 120, "Enemy shield duration is not two seconds.");
      assert(CONFIG.INVINCIBILITY_TIME === 360, "Player shield duration was changed with the enemy shield.");
    });

    test("Shard pickup", function () {
      resetGame();
      Enemy.shards.push({ x: Player.x + 4, y: Player.y + 4, size: 12 });
      Enemy.collectShards();
      assert(Player.shards === 1 && Game.score === 25, "Shard was not collected and scored.");
    });

    test("Enemy defeat and combo", function () {
      resetGame();
      Enemy.list = [makeEnemy(Player.x + 100, Player.y, 1)];
      Enemy.kill(0, true);
      assert(Enemy.list.length === 0 && Game.combo === 1 && Enemy.pickups.length > 0, "Enemy defeat did not clear the enemy, increment combo, and drop a weapon.");
    });

    test("Shop upgrade purchase", function () {
      resetGame();
      Player.shards = 3;
      Game.buyShopUpgrade("speed");
      assert(Player.speedMultiplier > 1 && Player.shards === 0, "Shop purchase did not apply its upgrade and cost.");
    });

    test("Fate Wheel opens and resolves", function () {
      resetGame();
      Game.openGamble();
      assert(Game.mode === "gamble", "Fate Wheel did not open.");
      Math.random = function () { return 0; };
      Game.resolveGamble();
      assert(Game.mode === "playing" && Game.gambleUsed && Player.gambleEffect, "Fate Wheel did not apply an effect and return to play.");
    });

    test("Finish objective detects the flag", function () {
      resetGame();
      Enemy.list = [];
      Enemy.boss = null;
      var finish = Level.finishTiles[0];
      Player.x = finish.x + 10;
      Player.y = finish.y + 8;
      Player.onGround = true;
      assert(Player.hasWon(), "Standing at the finish with no enemies did not win.");
    });

    test("Boost grants health and marks nearest enemy", function () {
      resetGame();
      var startingHealth = Player.health;
      var startingDamage = Player.damageMultiplier;
      var startingEnemySpeed = Game.enemySpeedScale;
      var near = makeEnemy(Player.x + 50, Player.y, 1);
      var far = makeEnemy(Player.x + 500, Player.y, 1);
      Enemy.list = [near, far];
      Game.activateBalanceBoost();
      assert(Player.health === startingHealth + 1 && Game.balanceBoostActive, "Boost did not grant one health and activate.");
      assert(Player.damageMultiplier === startingDamage && Game.enemySpeedFactor() === startingEnemySpeed, "Boost changed weapon damage or enemy speed.");
      assert(near.balanceMarked && !far.balanceMarked, "Boost did not mark only the nearest enemy.");
    });

    test("Boost shortens dash cooldown", function () {
      resetGame();
      Game.activateBalanceBoost();
      Input.dash = true;
      Player.update();
      assert(Player.dashCooldown > 0 && Player.dashCooldown < CONFIG.DASH_COOLDOWN, "Boost did not shorten dash recovery.");
    });

    test("Boost gun whitelist", function () {
      resetGame();
      Player.hasGun = true;
      Player.weaponType = "homing";
      Enemy.pickups = [{ weaponType: "homing" }, { weaponType: "shotgun" }, { weaponType: "burst" }, { weaponType: "boomerang" }, { weaponType: "piercer" }, { weaponType: "ricochet" }];
      Game.activateBalanceBoost();
      assert(Player.hasGun && Game.balanceBoostWeapons.indexOf(Player.weaponType) >= 0, "Boost removed a supported gun the player already owned.");
      assert(Enemy.pickups.length === 6 && Enemy.pickups.every(function (pickup) { return Game.balanceBoostWeapons.indexOf(pickup.weaponType) >= 0; }), "Boost filtered out an implemented gun.");
    });

    test("Boost can drop every supported gun", function () {
      for (var weaponIndex = 0; weaponIndex < Game.balanceBoostWeapons.length; weaponIndex++) {
        resetGame();
        Game.balanceBoostActive = true;
        var selectedIndex = weaponIndex;
        var randomCalls = 0;
        Math.random = function () {
          if (randomCalls++ === 0) { return (selectedIndex + 0.1) / Game.balanceBoostWeapons.length; }
          return 0.99;
        };
        Enemy.list = [makeEnemy(Player.x + 100, Player.y, 1)];
        Enemy.kill(0, false);
        assert(Enemy.pickups.some(function (pickup) { return pickup.weaponType === Game.balanceBoostWeapons[selectedIndex]; }),
          "Boost could not drop " + Game.balanceBoostWeapons[selectedIndex] + ".");
      }
    });

    test("Secret buff has no player halo", function () {
      assert(typeof Draw.secretRing === "undefined", "The secret-buff halo is still drawn around the player.");
    });

    test("Secret image ring follows the player", function () {
      resetGame();
      Player.secretBuff = true;
      var originalContext = Draw.ctx;
      var originalDrawSecretSprite = Draw.drawSecretSprite;
      var translateX = 0;
      var translateY = 0;
      var savedTransforms = [];
      var spriteTransforms = [];
      Draw.ctx = {
        save: function () { savedTransforms.push([translateX, translateY]); },
        restore: function () { var saved = savedTransforms.pop(); translateX = saved[0]; translateY = saved[1]; },
        translate: function (x, y) { translateX += x; translateY += y; },
        scale: function () {}, beginPath: function () {}, arc: function () {},
        fill: function () {}, stroke: function () {}, fillRect: function () {}, rotate: function () {}
      };
      Draw.drawSecretSprite = function (x, y) { spriteTransforms.push({ x: x, y: y, originX: translateX, originY: translateY }); };
      try {
        Draw.player();
      } finally {
        Draw.ctx = originalContext;
        Draw.drawSecretSprite = originalDrawSecretSprite;
      }
      var centerX = Player.x + CONFIG.PLAYER_SIZE / 2;
      var centerY = Player.y + CONFIG.PLAYER_SIZE / 2;
      assert(spriteTransforms.length === 4 && spriteTransforms.every(function (sprite) {
        return sprite.originX === centerX && sprite.originY === centerY;
      }), "Secret-buff images were not transformed around the player.");
    });

    test("Secret cinematic images orbit the player", function () {
      resetGame();
      var originalContext = Draw.ctx;
      var originalDrawSecretSprite = Draw.drawSecretSprite;
      var sprites = [];
      Game.secretBuffCinematic = { frame: 90 };
      Draw.ctx = {
        save: function () {}, restore: function () {}, beginPath: function () {}, moveTo: function () {},
        lineTo: function () {}, stroke: function () {}, arc: function () {}, fill: function () {},
        fillRect: function () {}, fillText: function () {}
      };
      Draw.drawSecretSprite = function (x, y) { sprites.push({ x: x, y: y }); };
      try {
        Draw.secretCinematic();
      } finally {
        Draw.ctx = originalContext;
        Draw.drawSecretSprite = originalDrawSecretSprite;
        Game.secretBuffCinematic = null;
      }
      var centerX = Player.x + CONFIG.PLAYER_SIZE / 2 - Draw.cameraX;
      var centerY = Player.y + CONFIG.PLAYER_SIZE / 2 - 80;
      assert(sprites.length === 4 && sprites.every(function (sprite) {
        return Math.abs(Math.hypot(sprite.x - centerX, sprite.y - centerY) - 72) < 0.01;
      }), "Secret-cinematic images were not arranged around the player.");
    });

    test("Boost bullet evade chance", function () {
      resetGame();
      Game.balanceBoostActive = true;
      Player.hitTimer = 0;
      var health = Player.health;
      Enemy.bullets.push({ x: Player.x, y: Player.y, vx: 0, vy: 0, owner: null });
      Math.random = function () { return 0.2; };
      Enemy.update();
      assert(Player.health === health, "A bullet in the 30% evade band dealt damage.");
      Enemy.bullets.push({ x: Player.x, y: Player.y, vx: 0, vy: 0, owner: null });
      Math.random = function () { return 0.3; };
      Enemy.update();
      assert(Player.health === health - 1, "A bullet outside the 30% evade band did not deal damage.");
    });

    test("Boost Fate Wheel favors buffs", function () {
      resetGame();
      Game.balanceBoostActive = true;
      Math.random = function () { return 0; };
      Game.openGamble();
      Game.resolveGamble();
      assert(["LEAD BOOTS", "JAMMED TRIGGER", "FRAIL FORTUNE"].indexOf(Player.gambleEffect) < 0, "Boost selected a debuff on the guaranteed buff branch.");
      Game.gambleUsed = false;
      Player.gambleEffect = "";
      Math.random = function () { return 0.7; };
      Game.openGamble();
      Game.resolveGamble();
      assert(["LEAD BOOTS", "JAMMED TRIGGER", "FRAIL FORTUNE"].indexOf(Player.gambleEffect) >= 0, "Boost did not select a debuff on the 30% branch.");
    });

    test("Boost adds shield buff drops", function () {
      resetGame();
      Game.balanceBoostActive = true;
      Enemy.list = [makeEnemy(Player.x + 100, Player.y, 1)];
      Math.random = function () { return 0; };
      Enemy.kill(0, false);
      assert(Enemy.pickups.some(function (pickup) { return pickup.type === "invincibility"; }), "Boost did not produce its extra shield buff drop.");
    });

    test("Tutorial checkpoint respawn", function () {
      resetGame();
      Tutorial.active = true;
      Tutorial.buildPracticeLevel();
      Tutorial.enterStep(6);
      var checkpoint = Tutorial.checkpoint;
      Player.x += 120;
      Game.die("self-test");
      assert(Tutorial.active && Tutorial.stepIndex === 6 && Player.x === checkpoint.x, "Tutorial death did not return to its current checkpoint.");
      Tutorial.active = false;
    });
  } catch (error) {
    results.push({ name: "Test runner", passed: false, detail: error.message || String(error) });
  } finally {
    Math.random = nativeRandom;
  }

  window.parent.postMessage({ type: "roller-self-test-results", requestId: requestId, results: results }, window.location.origin);
};