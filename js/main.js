/* =====================================================================
   main.js  --  THE STARTING LINE.

   This is the smallest file in the project and it runs last. All it
   does is: set up the screen, load the data files, build the first
   level, and start the loop.

   You will almost never need to change this file.
   ===================================================================== */

Draw.setup();
Input.setupMobileControls();
Input.restoreMobileMode();

var titleMenuPanel = document.getElementById("title-menu-panel");
var titleMenuKicker = document.getElementById("title-menu-kicker");
var titleMenuTitle = document.getElementById("title-menu-title");
var titleMenuList = document.getElementById("title-menu-list");
var titleMenuClose = document.getElementById("title-menu-close");
var titlePreviewLabel = document.getElementById("title-preview-label");
var titlePreviewName = document.getElementById("title-preview-name");
var titlePreviewBadge = document.getElementById("title-preview-badge");
var titlePreviewRunning = false;

var DebugConsole = {
  entries: [],
  maxEntries: 200
};

DebugConsole.render = function () {
  var output = document.getElementById("debug-console-output");
  if (!output) { return; }
  if (!DebugConsole.entries.length) {
    output.innerHTML = '<div class="debug-console-empty">No events yet. The game will log level starts, damage, deaths, and menu actions here.</div>';
    return;
  }
  output.innerHTML = "";
  DebugConsole.entries.forEach(function (entry) {
    var line = document.createElement("div");
    line.className = "debug-console-line";
    var time = document.createElement("span");
    time.className = "debug-console-time";
    time.textContent = entry.time;
    var text = document.createElement("span");
    text.className = "debug-console-text";
    text.textContent = "[" + entry.tag + "] " + entry.message;
    line.appendChild(time);
    line.appendChild(text);
    output.appendChild(line);
  });
  output.scrollTop = output.scrollHeight;
};

DebugConsole.log = function (tag, message) {
  if (message === undefined || message === null || String(message).length === 0) { return; }
  var time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  DebugConsole.entries.push({ time: time, tag: String(tag || "SYS"), message: String(message) });
  if (DebugConsole.entries.length > DebugConsole.maxEntries) {
    DebugConsole.entries.shift();
  }
  DebugConsole.render();
};

DebugConsole.toggle = function () {
  var panel = document.getElementById("debug-console-panel");
  if (!panel) { return; }
  panel.hidden = !panel.hidden;
  if (!panel.hidden) { DebugConsole.render(); }
};

DebugConsole.open = function () {
  var panel = document.getElementById("debug-console-panel");
  if (panel) { panel.hidden = false; DebugConsole.render(); }
};

DebugConsole.close = function () {
  var panel = document.getElementById("debug-console-panel");
  if (panel) { panel.hidden = true; }
};

var LEVEL_ACCESS_KEY = "rollerLevelAccessMode";
var PLAYED_LEVELS_KEY = "rollerPlayedLevels";

function getLevelAccessMode() {
  try {
    return localStorage.getItem(LEVEL_ACCESS_KEY) === "admin" ? "admin" : "player";
  } catch (error) {
    return "player";
  }
}

function setLevelAccessMode(mode) {
  try {
    localStorage.setItem(LEVEL_ACCESS_KEY, mode === "admin" ? "admin" : "player");
  } catch (error) {}
}

function getPlayedLevels() {
  try {
    var parsed = JSON.parse(localStorage.getItem(PLAYED_LEVELS_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.map(function (value) { return Number(value); }).filter(function (value) { return Number.isInteger(value) && value >= 0; }) : [];
  } catch (error) {
    return [];
  }
}

function setPlayedLevels(levels) {
  try {
    localStorage.setItem(PLAYED_LEVELS_KEY, JSON.stringify(levels));
  } catch (error) {}
}

function recordPlayedLevel(levelNumber) {
  var number = Number(levelNumber);
  if (!Number.isInteger(number) || number < 0) { return; }
  var played = getPlayedLevels();
  var exists = played.indexOf(number) >= 0;
  if (!exists) {
    played.push(number);
    played.sort(function (a, b) { return a - b; });
    setPlayedLevels(played);
  }
}

function getAccessibleLevels() {
  var mode = getLevelAccessMode();
  if (mode === "admin") { return Level.levels.map(function (_, index) { return index; }); }
  var played = getPlayedLevels();
  if (!played.length) { return [CONFIG.START_LEVEL]; }
  return played.slice();
}

function showTitleMenu(kind) {
  if (!titleMenuPanel) { return; }
  titleMenuPanel.hidden = false;
  titleMenuPanel.classList.remove("is-visible");
  requestAnimationFrame(function () {
    titleMenuPanel.classList.add("is-visible");
  });

  if (kind === "level") {
    titleMenuKicker.textContent = "LEVEL SELECT";
    titleMenuTitle.textContent = "Choose your route";
    var levels = getAccessibleLevels();
    titleMenuList.innerHTML = "";
    levels.forEach(function (levelNumber) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "title-menu-item";
      button.textContent = "LEVEL " + (levelNumber + 1) + " · " + Level.levels[levelNumber].name;
      button.addEventListener("click", function () {
        titleMenuPanel.hidden = true;
        startSpecificLevel(levelNumber);
      });
      titleMenuList.appendChild(button);
    });
    if (!levels.length) {
      var emptyButton = document.createElement("button");
      emptyButton.type = "button";
      emptyButton.className = "title-menu-item is-muted";
      emptyButton.textContent = "No levels unlocked yet";
      emptyButton.disabled = true;
      titleMenuList.appendChild(emptyButton);
    }
  }

  if (kind === "upgrades") {
    titleMenuKicker.textContent = "UPGRADES";
    titleMenuTitle.textContent = "Field kit";
    titleMenuList.innerHTML = "";
    [
      { key: "speed", label: "Tuned Wheels - 3 shards", desc: "Faster movement" },
      { key: "jump", label: "Spring Coil - 3 shards", desc: "Higher jumps" },
      { key: "health", label: "Repair Kit - 4 shards", desc: "More max health" }
    ].forEach(function (option) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "title-menu-item";
      button.textContent = option.label + " · " + option.desc;
      button.addEventListener("click", function () {
        Game.buyShopUpgrade(option.key);
      });
      titleMenuList.appendChild(button);
    });
  }

  if (kind === "instructions") {
    titleMenuKicker.textContent = "HOW TO PLAY";
    titleMenuTitle.textContent = "The run";
    titleMenuList.innerHTML = "";
    [
      { label: "MOVE", desc: "A / D or arrows to roll. Space or W jumps. Shift dashes." },
      { label: "FIGHT", desc: "Aim with the mouse, click or X to shoot, stomp enemies, and use cover." },
      { label: "OBJECTIVE", desc: "Defeat every enemy, grab shards, then reach the flag." }
    ].forEach(function (option) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "title-menu-item";
      button.textContent = option.label + " · " + option.desc;
      button.addEventListener("click", function () {
        Game.showMessage(option.label + ": " + option.desc);
      });
      titleMenuList.appendChild(button);
    });
  }

  if (kind === "settings") {
    titleMenuKicker.textContent = "SETTINGS";
    titleMenuTitle.textContent = "Access mode";
    titleMenuList.innerHTML = "";
    var toggleButton = document.createElement("button");
    toggleButton.type = "button";
    toggleButton.className = "title-menu-item action-toggle";
    toggleButton.textContent = getLevelAccessMode() === "admin" ? "Current mode: ADMIN" : "Current mode: PLAYER";
    toggleButton.addEventListener("click", function () {
      var nextMode = getLevelAccessMode() === "admin" ? "player" : "admin";
      setLevelAccessMode(nextMode);
      toggleButton.textContent = nextMode === "admin" ? "Current mode: ADMIN" : "Current mode: PLAYER";
      Game.showMessage(nextMode === "admin" ? "ADMIN mode: all levels unlocked." : "PLAYER mode: only played levels are visible.");
    });
    titleMenuList.appendChild(toggleButton);

    var resetButton = document.createElement("button");
    resetButton.type = "button";
    resetButton.className = "title-menu-item reset-progress";
    resetButton.textContent = "Reset played levels";
    resetButton.addEventListener("click", function () {
      setPlayedLevels([CONFIG.START_LEVEL]);
      Game.showMessage("Progress reset. Player mode now starts from the beginning.");
    });
    titleMenuList.appendChild(resetButton);
  }
}

function closeTitleMenu() {
  if (!titleMenuPanel) { return; }
  titleMenuPanel.classList.remove("is-visible");
  window.setTimeout(function () {
    titleMenuPanel.hidden = true;
  }, 220);
}

function startSpecificLevel(levelNumber) {
  var shell = document.getElementById("game-shell");
  var titleScreen = document.getElementById("title-screen");
  Game.autoplay = false;
  clearAutoplayInput();
  if (shell) { shell.hidden = false; }
  if (titleScreen) { titleScreen.hidden = true; }
  document.body.classList.add("game-running");
  recordPlayedLevel(levelNumber);
  Level.loadData(function () {
    Game.easyMode = false;
    Game.startLevel(levelNumber);
    Draw.everything();
    Game.mode = "playing";
    var selfTestRequest = new URLSearchParams(window.location.search).get("gameSelfTest");
    if (selfTestRequest) {
      SelfTest.runInFrame(selfTestRequest);
      return;
    }
    Game.mode = "briefing";
    document.getElementById("start-briefing").hidden = false;
    Game.loop();
  });
}

var hasStartedGame = false;

function getPreviewLevelNumber() {
  if (!Level.levels || !Level.levels.length) { return CONFIG.START_LEVEL; }
  var bossIndex = -1;
  for (var i = 0; i < Level.levels.length; i++) {
    var level = Level.levels[i];
    if (level && Array.isArray(level.pieces) && level.pieces.indexOf("boss_arena") >= 0) {
      bossIndex = i;
      break;
    }
  }
  if (bossIndex >= 0) { return bossIndex; }
  return (Game.levelNumber + 1) % Level.levels.length;
}

function updateTitlePreviewCard(levelNumber) {
  if (!Level.levels || !Level.levels[levelNumber]) { return; }
  var level = Level.levels[levelNumber];
  var isBoss = Array.isArray(level.pieces) && level.pieces.indexOf("boss_arena") >= 0;
  if (titlePreviewLabel) { titlePreviewLabel.textContent = isBoss ? "Boss Preview" : "Level Preview"; }
  if (titlePreviewName) { titlePreviewName.textContent = (level.name || "ARENA").toUpperCase(); }
  if (titlePreviewBadge) { titlePreviewBadge.textContent = isBoss ? "THREAT LEVEL: BOSS" : "THREAT LEVEL: HIGH"; }
}

function clearAutoplayInput() {
  Input.left = false;
  Input.right = false;
  Input.jump = false;
  Input.dash = false;
  Input.shoot = false;
  Input.pause = false;
  Input.restart = false;
  Input.gamble = false;
  Input.invincibility = false;
}

function startTitlePreview() {
  if (titlePreviewRunning) { return; }
  titlePreviewRunning = true;
  Game.autoplay = true;
  clearAutoplayInput();

  function tick() {
    var titleScreen = document.getElementById("title-screen");
    if (!titleScreen || titleScreen.hidden || !titlePreviewRunning) { return; }

    if (!Level.levels) {
      requestAnimationFrame(tick);
      return;
    }

    if (Game.autoplay && (Game.mode === "dead" || Game.mode === "won" || Game.mode === "paused")) {
      var restartStamp = window.__rollerPreviewRestartStamp || 0;
      if (Date.now() - restartStamp > 1800) {
        window.__rollerPreviewRestartStamp = Date.now();
        var nextLevel = Math.floor(Math.random() * Level.levels.length);
        if (Level.levels.length > 1 && nextLevel === Game.levelNumber) {
          nextLevel = (nextLevel + 1) % Level.levels.length;
        }
        Game.startLevel(nextLevel);
        updateTitlePreviewCard(nextLevel);
        Game.showMessage("Preview - " + Level.name + " · level " + (nextLevel + 1));
      }
    }

    if (Date.now() - (window.__rollerPreviewLevelStamp || 0) > 12000) {
      window.__rollerPreviewLevelStamp = Date.now();
      var nextLevel = Math.floor(Math.random() * Level.levels.length);
      if (Level.levels.length > 1 && nextLevel === Game.levelNumber) {
        nextLevel = (nextLevel + 1) % Level.levels.length;
      }
      Game.startLevel(nextLevel);
      updateTitlePreviewCard(nextLevel);
      Game.showMessage("Preview - " + Level.name + " · level " + (nextLevel + 1));
    }

    Game.update();
    Draw.updateCamera();
    Input.refreshMouseWorld();
    Draw.everything();
    requestAnimationFrame(tick);
  }

  if (!Level.levels) {
    Level.loadData(function () {
      Game.startLevel(CONFIG.START_LEVEL);
      updateTitlePreviewCard(CONFIG.START_LEVEL);
      requestAnimationFrame(tick);
    });
    return;
  }

  Game.startLevel(CONFIG.START_LEVEL);
  updateTitlePreviewCard(CONFIG.START_LEVEL);
  requestAnimationFrame(tick);
}

function startGame() {
  if (hasStartedGame) { return; }
  hasStartedGame = true;
  titlePreviewRunning = false;
  Game.autoplay = false;
  clearAutoplayInput();

  var shell = document.getElementById("game-shell");
  var titleScreen = document.getElementById("title-screen");
  if (shell) { shell.hidden = false; }
  if (titleScreen) { titleScreen.hidden = true; }
  document.body.classList.add("game-running");

  Level.loadData(function () {
    Game.easyMode = false;
    Game.startLevel(CONFIG.START_LEVEL);
    recordPlayedLevel(CONFIG.START_LEVEL);
    var selfTestRequest = new URLSearchParams(window.location.search).get("gameSelfTest");
    if (selfTestRequest) {
      SelfTest.runInFrame(selfTestRequest);
      return;
    }
    Game.mode = "briefing";
    document.getElementById("start-briefing").hidden = false;
    Game.loop();
  });
}

window.startGame = startGame;

var startRunButton = document.getElementById("start-run-button");
if (startRunButton) {
  startRunButton.addEventListener("click", startGame);
}

var menuButtons = {
  level: document.getElementById("level-select-button"),
  upgrades: document.getElementById("upgrade-button"),
  instructions: document.getElementById("instructions-button"),
  settings: document.getElementById("settings-button"),
  console: document.getElementById("console-button")
};

if (menuButtons.level) {
  menuButtons.level.addEventListener("click", function () { showTitleMenu("level"); });
}
if (menuButtons.upgrades) {
  menuButtons.upgrades.addEventListener("click", function () { showTitleMenu("upgrades"); });
}
if (menuButtons.instructions) {
  menuButtons.instructions.addEventListener("click", function () {
    showTitleMenu("instructions");
  });
}
if (menuButtons.settings) {
  menuButtons.settings.addEventListener("click", function () { showTitleMenu("settings"); });
}
if (menuButtons.console) {
  menuButtons.console.addEventListener("click", function () {
    DebugConsole.toggle();
  });
}
if (titleMenuClose) {
  titleMenuClose.addEventListener("click", closeTitleMenu);
}

var titleButtons = Array.from(document.querySelectorAll(".menu-btn")).filter(function (button) {
  return button && !button.disabled;
});
var titleIndex = 0;
function focusTitleButton(index) {
  if (!titleButtons.length) { return; }
  titleIndex = (index + titleButtons.length) % titleButtons.length;
  titleButtons[titleIndex].focus();
}

document.addEventListener("keydown", function (event) {
  if (document.getElementById("title-screen") && document.getElementById("title-screen").hidden) {
    return;
  }
  if (event.key === "ArrowDown") { focusTitleButton(titleIndex + 1); }
  if (event.key === "ArrowUp") { focusTitleButton(titleIndex - 1); }
  if (event.key === "Enter" && titleButtons[titleIndex]) { titleButtons[titleIndex].click(); }
});

var opening = document.querySelector("#title-screen .opening");
if (opening) {
  function closeOpening() {
    opening.classList.add("skip");
  }
  window.addEventListener("keydown", closeOpening, { once: true });
  window.addEventListener("click", closeOpening, { once: true });
  opening.addEventListener("animationend", function (event) {
    if (event.animationName === "title-iris-wipe") {
      opening.style.display = "none";
    }
  });
}

var originalGameShowMessage = Game.showMessage;
Game.showMessage = function (text) {
  DebugConsole.log("UI", text);
  return originalGameShowMessage.call(this, text);
};

var originalStartLevel = Game.startLevel;
Game.startLevel = function (levelNumber, preserveCheckpoint) {
  DebugConsole.log("LEVEL", "startLevel(" + levelNumber + ") preserveCheckpoint=" + !!preserveCheckpoint);
  return originalStartLevel.apply(this, arguments);
};

var originalOpenGuide = Game.openGuide;
Game.openGuide = function () {
  DebugConsole.log("GUIDE", "opened guide panel");
  return originalOpenGuide.apply(this, arguments);
};

var originalCloseGuide = Game.closeGuide;
Game.closeGuide = function () {
  DebugConsole.log("GUIDE", "closed guide panel");
  return originalCloseGuide.apply(this, arguments);
};

var originalBuyShopUpgrade = Game.buyShopUpgrade;
Game.buyShopUpgrade = function (upgrade) {
  DebugConsole.log("SHOP", "buy upgrade: " + upgrade);
  return originalBuyShopUpgrade.apply(this, arguments);
};

var originalGameDie = Game.die;
Game.die = function (reason) {
  DebugConsole.log("DEATH", reason || "unknown death reason");
  return originalGameDie.apply(this, arguments);
};

var originalTakeDamage = Player.takeDamage;
Player.takeDamage = function (reason) {
  DebugConsole.log("DAMAGE", (reason || "unknown") + " :: health " + Player.health + "/" + Player.maxHealth);
  return originalTakeDamage.apply(this, arguments);
};

function setupInitialPreview() {
  var shell = document.getElementById("game-shell");
  if (shell) { shell.hidden = false; }
  Game.autoplay = true;
  if (!Level.levels) {
    Level.loadData(function () {
      Game.easyMode = false;
      Game.startLevel(CONFIG.START_LEVEL);
      Draw.everything();
      startTitlePreview();
    });
    return;
  }
  Game.startLevel(CONFIG.START_LEVEL);
  Draw.everything();
  startTitlePreview();
}

DebugConsole.open();
DebugConsole.log("SYS", "Title screen booted. Waiting for input.");
DebugConsole.log("SYS", "Preview loop armed. Menu is live.");
setupInitialPreview();

document.getElementById("guide-button").addEventListener("click", function () { Game.openGuide(); });
document.getElementById("guide-close").addEventListener("click", function () { Game.closeGuide(); });
document.getElementById("debug-console-close").addEventListener("click", function () { DebugConsole.close(); });
document.getElementById("tutorial-start").addEventListener("click", function () { Tutorial.start(); });
document.getElementById("tutorial-self-test").addEventListener("click", function () { SelfTest.run(); });
document.getElementById("tutorial-skip-button").addEventListener("click", function () { Tutorial.skip(); });
document.getElementById("tutorial-menu-skip").addEventListener("click", function () { Tutorial.skip(); });
document.getElementById("start-briefing-continue").addEventListener("click", function () {
  document.getElementById("start-briefing").hidden = true;
  Tutorial.clearInput();
  if (!Tutorial.hasCompleted()) { Tutorial.initialize(); }
  else { Game.mode = "playing"; Game.showMessage("Good luck. Watch the enemy tells."); }
});
document.getElementById("gamble-button").addEventListener("click", function () { Game.openGamble(); });
document.getElementById("pause-button").addEventListener("click", function () { Game.togglePause(); });
document.getElementById("fullscreen-button").addEventListener("click", function () {
  var shell = document.getElementById("game-shell");
  if (document.fullscreenElement) { document.exitFullscreen(); }
  else if (shell.requestFullscreen) { shell.requestFullscreen(); }
});
document.getElementById("self-test-button").addEventListener("click", function () { SelfTest.run(); });
document.getElementById("self-test-rerun").addEventListener("click", function () { SelfTest.run(); });
document.getElementById("self-test-close").addEventListener("click", function () {
  document.getElementById("self-test-panel").hidden = true;
});
document.getElementById("mobile-toggle").addEventListener("click", function () {
  Input.setMobileMode(!Input.mobileMode);
});
document.addEventListener("fullscreenchange", function () {
  var button = document.getElementById("fullscreen-button");
  var active = document.fullscreenElement;
  button.textContent = active ? "EXIT FULLSCREEN" : "FULLSCREEN";
  button.setAttribute("aria-label", active ? "Exit fullscreen" : "Enter fullscreen");
  Tutorial.noteFullscreen(!!active);
});
document.getElementById("gamble-confirm").addEventListener("click", function (event) { event.stopPropagation(); Game.resolveGamble(); });
document.getElementById("gamble-cancel").addEventListener("click", function (event) { event.stopPropagation(); Game.closeGamble(); });
document.getElementById("shop-speed").addEventListener("click", function () { Game.buyShopUpgrade("speed"); });
document.getElementById("shop-jump").addEventListener("click", function () { Game.buyShopUpgrade("jump"); });
document.getElementById("shop-health").addEventListener("click", function () { Game.buyShopUpgrade("health"); });
document.getElementById("shop-close").addEventListener("click", function () { Game.closeShop(); });
document.getElementById("prejoin-speed").addEventListener("click", function () { Game.buyShopUpgrade("speed"); });
document.getElementById("prejoin-jump").addEventListener("click", function () { Game.buyShopUpgrade("jump"); });
document.getElementById("prejoin-health").addEventListener("click", function () { Game.buyShopUpgrade("health"); });
document.getElementById("enter-level").addEventListener("click", function () { Game.enterSelectedLevel(); });
document.getElementById("cancel-level").addEventListener("click", function () { Game.closeLevelPicker(); });
