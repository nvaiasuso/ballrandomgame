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
    Game.score = 0;
    Game.keepPerks = false;
    Player.perks = [];
    Player.secretInvincibility = false;
    Player.secretBuff = false;
    Player.secretSprayTimer = 0;
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

    test("Invincibility pickup", function () {
      resetGame();
      Enemy.pickups.push({ x: Player.x + 4, y: Player.y + 4, size: 20, type: "invincibility" });
      Enemy.collectPickups();
      assert(Player.invincible && Player.invincibleTimer === CONFIG.INVINCIBILITY_TIME, "Shield pickup did not grant its timed effect.");
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
      Enemy.pickups = [{ weaponType: "homing" }, { weaponType: "shotgun" }, { weaponType: "burst" }, { weaponType: "boomerang" }];
      Game.activateBalanceBoost();
      assert(Player.hasGun && Game.balanceBoostWeapons.indexOf(Player.weaponType) >= 0, "Boost removed a supported gun the player already owned.");
      assert(Enemy.pickups.length === 4 && Enemy.pickups.every(function (pickup) { return Game.balanceBoostWeapons.indexOf(pickup.weaponType) >= 0; }), "Boost filtered out an implemented gun.");
    });

    test("Boost can drop all six guns", function () {
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