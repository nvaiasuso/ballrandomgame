/* =====================================================================
   tutorial.js -- guided practice built on the regular game systems.
   ===================================================================== */

var Tutorial = {
  storageKey: "rollerTutorialComplete",
  active: false,
  menuVisible: false,
  completed: false,
  stepIndex: 0,
  idleFrames: 0,
  checkpoint: null,
  entry: null,
  stompCount: 0,
  targetId: null,
  tutorialBullet: null,
  bulletDangerReached: false,
  pausedOnce: false,
  restartRequested: false,
  fullscreenSeen: false,
  shopShardCount: 0,
  savedState: null,
  chunkWidth: CONFIG.TILE * CONFIG.PIECE_COLS,
  steps: [
    { title: "Movement", task: "Move right to the lit marker.", hint: "Use LEFT / RIGHT or A / D.", kind: "move" },
    { title: "Jumping", task: "Jump once.", hint: "Press SPACE, UP, or W while standing on the ground.", kind: "jump" },
    { title: "Dashing", task: "Dash once.", hint: "Tap SHIFT to dash in your facing direction.", kind: "dash" },
    { title: "Hazards", task: "Cross the spikes, lava, and crumble tiles.", hint: "Jump over spikes and lava. Keep moving when a crumble tile starts to crack.", kind: "hazards" },
    { title: "Weapons", task: "Pick up the weapon ahead.", hint: "Walk through the floating weapon to collect it.", kind: "weapon" },
    { title: "Aim and shoot", task: "Aim at the target and shoot it down.", hint: "Point with the mouse, then click or press X.", kind: "shoot" },
    { title: "Stomping", task: "Jump onto the enemy from above.", hint: "Land on its head; a side collision will hurt you.", kind: "stomp" },
    { title: "Weapon shards", task: "Collect the cyan shard.", hint: "Shards add to your carried currency and can upgrade weapons.", kind: "shard" },
    { title: "Combos", task: "Defeat both targets in quick succession.", hint: "Each takedown refreshes the combo timer.", kind: "combo" },
    { title: "Enemy types", task: "Pass the three enemy examples.", hint: "The Sprinter is quick, the Brute is tough, and the Turret fires from a fixed spot.", kind: "types" },
    { title: "Dodging bullets", task: "Avoid the incoming shot with a jump or dash.", hint: "Watch the bullet's path, then leave its line before it reaches you.", kind: "dodge" },
    { title: "Shop upgrades", task: "Buy one upgrade, then return to battle.", hint: "The practice shop has enough shards for a purchase.", kind: "shop" },
    { title: "Fate wheel", task: "Spin the Fate Wheel.", hint: "Press SPIN THE WHEEL to take a random buff or debuff.", kind: "gamble" },
    { title: "Invincibility", task: "Collect the gold shield pickup.", hint: "The shield protects you temporarily; it is not permanent.", kind: "shield" },
    { title: "Pause", task: "Pause, then resume the practice.", hint: "Press P or use the PAUSE button twice.", kind: "pause" },
    { title: "Restart", task: "Press R to reset to this checkpoint.", hint: "Tutorial restart returns to this station instead of restarting the whole course.", kind: "restart" },
    { title: "Fullscreen", task: "Try the FULLSCREEN button.", hint: "Use the same button again to leave fullscreen.", kind: "fullscreen" },
    { title: "The objective", task: "Defeat the last enemy, then reach the flag.", hint: "Clear the level's enemies and touch the finish flag to win.", kind: "objective" }
  ]
};

Tutorial.hasCompleted = function () {
  if (Tutorial.completed) { return true; }
  try { return localStorage.getItem(Tutorial.storageKey) === "yes"; } catch (error) { return false; }
};

Tutorial.clearInput = function () {
  Input.left = false;
  Input.right = false;
  Input.jump = false;
  Input.mouseDown = false;
  Input.restart = false;
  Input.shoot = false;
  Input.dash = false;
  Input.gamble = false;
  Input.endless = false;
  Input.pause = false;
  Input.invincibility = false;
  Input.secretInvincibility = false;
  Input.secretBuffActivation = false;
  Input.balanceBoostActivation = false;
  Input.balanceBoostPending = false;
  Input.balanceBoostAt = 0;
  Input.secretImageToggle = false;
  Input.wipeScreenSplats = false;
  Input.secretComboProgress = 0;
  Input.tutorialSkip = false;
  Input.versionToggle = false;
  Input.adminSkip = false;
  Input.adminSkipAt = 0;
  Input.adminSkipPending = false;
  Input.adminLevelSelect = false;
  Input.adminRandom = false;
};

Tutorial.initialize = function () {
  if (Tutorial.hasCompleted()) { return; }
  Tutorial.clearInput();
  Game.setTutorial("");
  Tutorial.menuVisible = true;
  Game.mode = "tutorial-menu";
  Tutorial.showMenu(true);
};

Tutorial.showMenu = function (show) {
  var menu = document.getElementById("tutorial-menu");
  if (menu) { menu.hidden = !show; }
  Tutorial.menuVisible = !!show;
};

Tutorial.buildPracticeLevel = function () {
  var originalPieces = Level.pieces;
  Level.pieces = Object.assign({}, originalPieces);
  var pieceNames = [];
  var pieceCount = Tutorial.steps.length + 2;
  for (var pieceIndex = 0; pieceIndex < pieceCount; pieceIndex++) {
    var rows = [];
    for (var row = 0; row < CONFIG.ROWS; row++) {
      rows.push(row === CONFIG.ROWS - 2 ? "########" : "........");
    }
    if (pieceIndex === 0) {
      rows[CONFIG.ROWS - 3] = ".S......";
    }
    if (pieceIndex === 4) {
      rows[CONFIG.ROWS - 3] = "..^.~...";
      rows[CONFIG.ROWS - 2] = "######C#";
    }
    if (pieceIndex === pieceCount - 1) {
      rows[CONFIG.ROWS - 3] = "......F.";
    }
    var pieceName = "tutorial_practice_" + pieceIndex;
    Level.pieces[pieceName] = rows;
    pieceNames.push(pieceName);
  }
  Level.buildPieces("PRACTICE RANGE", pieceNames);
  Level.pieces = originalPieces;
};

Tutorial.clearActors = function () {
  Enemy.list = [];
  Enemy.bullets = [];
  Enemy.playerBullets = [];
  Enemy.pickups = [];
  Enemy.shards = [];
  Enemy.hazards = [];
  Enemy.boss = null;
  Enemy.deadBodies = [];
  Enemy.effects = [];
  Enemy.companion = null;
  Enemy.shop = null;
};

Tutorial.start = function () {
  Tutorial.showMenu(false);
  Tutorial.clearInput();
  Game.setTutorial("");
  Tutorial.savedState = {
    score: Game.score,
    balanceBoostActive: Game.balanceBoostActive,
    secretInvincibility: Player.secretInvincibility,
    secretBuff: Player.secretBuff
  };
  Game.closePanels();
  Tutorial.active = true;
  Tutorial.stepIndex = 0;
  Tutorial.stompCount = 0;
  Tutorial.completed = false;
  Game.balanceBoostActive = false;
  Game.levelNumber = CONFIG.START_LEVEL;
  Game.randomMode = false;
  Game.endless = false;
  Game.gambleUsed = false;
  Game.shopOpened = false;
  Game.tutorial = { active: false, step: 0, wrongTimer: 0 };
  Game.resetIntensity();
  Game.habits = { jumps: 0, dashes: 0, shots: 0, left: 0, right: 0, corners: 0, recentJump: 0 };
  Tutorial.buildPracticeLevel();
  Game.secretBuffCinematic = null;
  Player.secretInvincibility = false;
  Player.secretBuff = false;
  Player.secretSprayTimer = 0;
  Enemy.reset();
  Tutorial.clearActors();
  Player.reset();
  Player.shards = 0;
  Game.mode = "playing";
  Game.levelTime = 999999;
  Game.introTimer = 0;
  Game.transitioning = false;
  Game.lastTime = 0;
  Tutorial.enterStep(0);
};

Tutorial.spawnEnemies = function (definitions) {
  var placed = [];
  for (var i = 0; i < definitions.length; i++) {
    var definition = definitions[i];
    var col = Math.floor(definition.x / CONFIG.TILE);
    var row = Math.floor(definition.y / CONFIG.TILE);
    Level.setCharAt(col, row, definition.type);
    placed.push({ col: col, row: row, definition: definition });
  }
  Enemy.reset();
  Enemy.shards = [];
  Enemy.shop = null;
  Enemy.ambushes = [];
  for (var placedIndex = 0; placedIndex < placed.length; placedIndex++) {
    var spawn = placed[placedIndex];
    var enemy = null;
    for (var enemyIndex = 0; enemyIndex < Enemy.list.length; enemyIndex++) {
      if (Enemy.list[enemyIndex].x === spawn.col * CONFIG.TILE && Enemy.list[enemyIndex].y === spawn.row * CONFIG.TILE) {
        enemy = Enemy.list[enemyIndex];
        break;
      }
    }
    Level.setCharAt(spawn.col, spawn.row, ".");
    if (!enemy) { continue; }
    var settings = spawn.definition;
    if (settings.health !== undefined) { enemy.health = settings.health; enemy.maxHealth = settings.health; }
    if (settings.speed !== undefined) { enemy.speed = settings.speed; }
    if (settings.turret) { enemy.turret = true; }
    if (settings.safe) {
      enemy.alertDelay = 100000;
      enemy.shootTimer = 100000;
      enemy.invulnerable = true;
    }
    if (settings.target) {
      enemy.turret = true;
      enemy.shootTimer = 100000;
      Tutorial.targetId = enemy.id;
    }
  }
};

Tutorial.playerPosition = function (x, y) {
  Player.x = x;
  Player.y = y;
  Player.vx = 0;
  Player.vy = 0;
  Player.onGround = false;
  Player.dashTimer = 0;
  Player.dashing = false;
  Player.hitTimer = 0;
  Player.health = Player.maxHealth;
  Player.invincible = false;
  Player.invincibleTimer = 0;
  Player.dashCooldown = 0;
  Player.deathAnimating = false;
  Player.deathTimer = 0;
  Draw.cameraSnap = true;
};

Tutorial.enterStep = function (index) {
  Tutorial.stepIndex = index;
  Tutorial.idleFrames = 0;
  Tutorial.stompCount = 0;
  Tutorial.targetId = null;
  Tutorial.tutorialBullet = null;
  Tutorial.bulletDangerReached = false;
  Tutorial.pausedOnce = false;
  Tutorial.restartRequested = false;
  Tutorial.fullscreenSeen = false;
  Tutorial.clearActors();
  var station = index + 1;
  Tutorial.checkpoint = { x: station * Tutorial.chunkWidth + CONFIG.TILE, y: Level.startY };
  Tutorial.playerPosition(Tutorial.checkpoint.x, Tutorial.checkpoint.y);
  Tutorial.entry = {
    x: Player.x,
    jumps: Game.habits.jumps,
    dashes: Game.habits.dashes,
    shots: Game.habits.shots,
    shards: Player.shards
  };
  Game.combo = 0;
  Game.comboTimer = 0;
  Game.gambleUsed = false;
  Game.shopOpened = false;
  Player.speedMultiplier = 1;
  Player.jumpMultiplier = 1;
  Player.gravityMultiplier = 1;
  Player.damageMultiplier = 1;
  Player.gambleEffect = "";
  Tutorial.shopShardCount = Player.shards;
  var kind = Tutorial.steps[index].kind;
  var enemyX = Tutorial.checkpoint.x + 200;
  var enemyY = Level.startY;
  if (kind === "weapon") {
    Enemy.pickups.push({ x: Tutorial.checkpoint.x + 120, y: Level.startY + 8, size: 20, level: 1, weaponType: "sidearm" });
  } else if (kind === "shoot") {
    Tutorial.spawnEnemies([{ type: "t", x: enemyX, y: enemyY, health: 1, target: true }]);
  } else if (kind === "stomp") {
    Player.hasGun = false;
    Player.ammo = 0;
    Tutorial.spawnEnemies([{ type: "e", x: enemyX, y: enemyY, health: 1, speed: 0.6 }]);
  } else if (kind === "shard") {
    Enemy.shards.push({ x: Tutorial.checkpoint.x + 140, y: Level.startY + 14, size: 12 });
  } else if (kind === "combo") {
    Tutorial.spawnEnemies([
      { type: "s", x: Tutorial.checkpoint.x + 140, y: enemyY, health: 1, speed: 0, turret: true },
      { type: "s", x: Tutorial.checkpoint.x + 240, y: enemyY, health: 1, speed: 0, turret: true }
    ]);
  } else if (kind === "types") {
    Tutorial.spawnEnemies([
      { type: "s", x: Tutorial.checkpoint.x + 130, y: enemyY, speed: 0, safe: true },
      { type: "b", x: Tutorial.checkpoint.x + 210, y: enemyY, speed: 0, safe: true },
      { type: "t", x: Tutorial.checkpoint.x + 290, y: enemyY, speed: 0, safe: true }
    ]);
  } else if (kind === "dodge") {
    Tutorial.tutorialBullet = { x: Tutorial.checkpoint.x + 250, y: Level.startY + 14, vx: -4, vy: 0, owner: null };
    Enemy.bullets.push(Tutorial.tutorialBullet);
  } else if (kind === "shop") {
    Player.shards = Math.max(Player.shards, 6);
    Tutorial.shopShardCount = Player.shards;
    Game.openShop();
  } else if (kind === "gamble") {
    Game.openGamble();
  } else if (kind === "shield") {
    Enemy.pickups.push({ x: Tutorial.checkpoint.x + 120, y: Level.startY + 8, size: 20, type: "invincibility" });
  } else if (kind === "objective") {
    Tutorial.spawnEnemies([{ type: "e", x: enemyX, y: enemyY, health: 1, speed: 0.5 }]);
  }
  Tutorial.renderPanel();
  Game.showMessage("Practice checkpoint " + (index + 1) + " of " + Tutorial.steps.length + ".");
};

Tutorial.renderPanel = function () {
  var panel = document.getElementById("tutorial-panel");
  var stepNumber = document.getElementById("tutorial-step-number");
  var task = document.getElementById("tutorial-task");
  var hint = document.getElementById("tutorial-hint");
  if (!Tutorial.active || !panel) { return; }
  var step = Tutorial.steps[Tutorial.stepIndex];
  panel.hidden = false;
  if (stepNumber) { stepNumber.textContent = "STEP " + (Tutorial.stepIndex + 1) + "/" + Tutorial.steps.length + " · " + step.title.toUpperCase(); }
  if (task) { task.textContent = step.task; }
  if (hint) {
    hint.textContent = Tutorial.idleFrames >= 180 ? "HINT: " + step.hint : "";
    hint.hidden = Tutorial.idleFrames < 180;
  }
};

Tutorial.advance = function () {
  if (!Tutorial.active) { return; }
  if (Tutorial.stepIndex >= Tutorial.steps.length - 1) {
    Tutorial.finish(false);
    return;
  }
  if (Game.mode === "shop") { Game.closeShop(); }
  if (Game.mode === "gamble") { Game.closeGamble(); }
  Tutorial.enterStep(Tutorial.stepIndex + 1);
};

Tutorial.completeStep = function () {
  Game.showMessage(Tutorial.steps[Tutorial.stepIndex].title + " complete.");
  Tutorial.advance();
};

Tutorial.update = function () {
  if (!Tutorial.active) { return; }
  var step = Tutorial.steps[Tutorial.stepIndex];
  var moved = Input.left || Input.right || Input.jump || Input.dash || Input.shoot || Input.mouseDown;
  Tutorial.idleFrames = moved ? 0 : Tutorial.idleFrames + 1;
  Tutorial.renderPanel();
  if (step.kind === "shop") {
    if (Player.shards < Tutorial.shopShardCount) {
      if (Game.mode === "shop") { Game.closeShop(); }
      Tutorial.completeStep();
      return;
    }
    if (Game.mode === "playing" && !Game.shopOpened) { Game.openShop(); }
    return;
  }
  if (step.kind === "gamble") {
    if (Game.gambleUsed && Game.mode !== "gamble") { Tutorial.completeStep(); }
    else if (Game.mode === "playing" && !Game.gambleUsed) { Game.openGamble(); }
    return;
  }
  if (step.kind === "pause") {
    if (Tutorial.pausedOnce && Game.mode === "playing") { Tutorial.completeStep(); }
    return;
  }
  if (step.kind === "fullscreen") {
    if (Tutorial.fullscreenSeen) { Tutorial.completeStep(); }
    return;
  }
  if (step.kind === "dodge") {
    if (Tutorial.tutorialBullet && Tutorial.tutorialBullet.x < Player.x + 120) { Tutorial.bulletDangerReached = true; }
    var dodged = Game.habits.jumps > Tutorial.entry.jumps || Game.habits.dashes > Tutorial.entry.dashes;
    var leftLine = Tutorial.tutorialBullet && Math.abs(Player.y - Tutorial.tutorialBullet.y) > 24;
    var bulletPassed = Tutorial.tutorialBullet && Tutorial.tutorialBullet.x < Player.x - 20;
    if (Tutorial.bulletDangerReached && dodged && (leftLine || bulletPassed)) { Tutorial.completeStep(); }
    return;
  }
  var done = false;
  if (step.kind === "move") { done = Player.x >= Tutorial.entry.x + 110; }
  if (step.kind === "jump") { done = Game.habits.jumps > Tutorial.entry.jumps; }
  if (step.kind === "dash") { done = Game.habits.dashes > Tutorial.entry.dashes; }
  if (step.kind === "hazards") { done = Player.x >= Tutorial.entry.x + 260; }
  if (step.kind === "weapon") { done = Player.hasGun; }
  if (step.kind === "shoot") {
    var targetAlive = false;
    for (var targetIndex = 0; targetIndex < Enemy.list.length; targetIndex++) {
      if (Enemy.list[targetIndex].id === Tutorial.targetId) { targetAlive = true; break; }
    }
    done = Game.habits.shots > Tutorial.entry.shots && !targetAlive;
  }
  if (step.kind === "stomp") { done = Tutorial.stompCount > 0; }
  if (step.kind === "shard") { done = Player.shards > Tutorial.entry.shards; }
  if (step.kind === "combo") { done = Game.combo >= 2; }
  if (step.kind === "types") { done = Player.x >= Tutorial.entry.x + 250; }
  if (step.kind === "shield") { done = Player.invincible && Player.invincibleTimer > 0; }
  if (step.kind === "restart") { done = Tutorial.restartRequested; }
  if (step.kind === "objective") { done = Enemy.list.length === 0 && Player.hasWon(); }
  if (done) { Tutorial.completeStep(); }
};

Tutorial.respawn = function () {
  if (!Tutorial.active || !Tutorial.checkpoint) { return; }
  Game.closePanels();
  Tutorial.clearActors();
  Game.mode = "playing";
  Game.hitstop = 0;
  Game.timeScale = 1;
  Game.simAccumulator = 0;
  Game.combo = 0;
  Game.comboTimer = 0;
  Tutorial.playerPosition(Tutorial.checkpoint.x, Tutorial.checkpoint.y);
  Tutorial.enterStep(Tutorial.stepIndex);
  Game.showMessage("Back at this practice checkpoint.");
};

Tutorial.restartCurrentStep = function () {
  Input.restart = false;
  if (Tutorial.steps[Tutorial.stepIndex].kind !== "restart") {
    Tutorial.respawn();
    return;
  }
  Tutorial.restartRequested = true;
  Tutorial.playerPosition(Tutorial.checkpoint.x, Tutorial.checkpoint.y);
  Tutorial.completeStep();
};

Tutorial.noteStomp = function () {
  if (Tutorial.active) { Tutorial.stompCount++; }
};

Tutorial.notePause = function (paused) {
  if (Tutorial.active && Tutorial.steps[Tutorial.stepIndex].kind === "pause" && paused) { Tutorial.pausedOnce = true; }
};

Tutorial.noteFullscreen = function (active) {
  if (Tutorial.active && Tutorial.steps[Tutorial.stepIndex].kind === "fullscreen" && active) { Tutorial.fullscreenSeen = true; }
};

Tutorial.draw = function () {
  if (!Tutorial.active || !Tutorial.entry || Tutorial.steps[Tutorial.stepIndex].kind !== "move") { return; }
  var ctx = Draw.ctx;
  var markerX = Tutorial.entry.x + 110;
  var markerY = Level.startY + CONFIG.PLAYER_SIZE;
  ctx.save();
  ctx.strokeStyle = "#35bd68";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(markerX, markerY);
  ctx.lineTo(markerX, markerY - 76);
  ctx.stroke();
  ctx.fillStyle = "#35bd68";
  ctx.fillRect(markerX - 8, markerY - 82, 16, 8);
  ctx.restore();
};

Tutorial.skip = function () {
  Tutorial.finish(true);
};

Tutorial.finish = function (skipped) {
  Tutorial.active = false;
  Tutorial.menuVisible = false;
  Tutorial.completed = true;
  Tutorial.showMenu(false);
  var panel = document.getElementById("tutorial-panel");
  if (panel) { panel.hidden = true; }
  try { localStorage.setItem(Tutorial.storageKey, "yes"); } catch (error) {}
  Tutorial.clearActors();
  Game.closePanels();
  Tutorial.clearInput();
  Game.secretBuffCinematic = null;
  if (Tutorial.savedState) {
    Game.score = Tutorial.savedState.score;
    Game.balanceBoostActive = Tutorial.savedState.balanceBoostActive;
    Player.secretInvincibility = Tutorial.savedState.secretInvincibility;
    Player.secretBuff = Tutorial.savedState.secretBuff;
  }
  Game.tutorial = { active: false, step: 0, wrongTimer: 0 };
  Input.tutorialSkip = false;
  Input.restart = false;
  Input.jump = false;
  Input.left = false;
  Input.right = false;
  Input.dash = false;
  Input.shoot = false;
  Game.startLevel(CONFIG.START_LEVEL);
  Game.showMessage(skipped ? "Tutorial skipped. Begin your run." : "Practice complete. Begin your run.");
  Tutorial.checkpoint = null;
  Tutorial.entry = null;
  Tutorial.targetId = null;
  Tutorial.tutorialBullet = null;
  Tutorial.stepIndex = 0;
  Tutorial.stompCount = 0;
  Tutorial.pausedOnce = false;
  Tutorial.restartRequested = false;
  Tutorial.fullscreenSeen = false;
  Tutorial.idleFrames = 0;
  Tutorial.bulletDangerReached = false;
  Tutorial.shopShardCount = 0;
  Tutorial.savedState = null;
};
