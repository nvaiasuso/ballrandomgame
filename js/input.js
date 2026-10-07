/* =====================================================================
   input.js  --  READING THE KEYBOARD.
   ===================================================================== */

var Input = {
  left: false,
  right: false,
  jump: false,
  restart: false,
  shoot: false,
  screenX: 0,
  mouseX: 0,
  mouseY: 0,
  mouseDown: false,
  mobileMode: false,
  versionToggle: false,
  adminSkip: false,
  adminSkipPending: false,
  adminSkipAt: 0,
  adminLevelSelect: false,
  adminRandom: false,
  gamble: false,
  dash: false,
  endless: false,
  pause: false,
  invincibility: false,
  secretInvincibility: false,
  tutorialSkip: false,
  balanceBoostActivation: false,
  balanceBoostPending: false,
  balanceBoostAt: 0,
  secretImageFlashActivation: false,
  secretImageToggle: false,
  wipeScreenSplats: false,
  secretComboProgress: 0,
  secretBuffActivation: false,
  secretCombo: ["up", "up", "down", "down", "left", "left", "right", "right"],
};

Input.registerSecretDirection = function (direction) {
  if (Input.secretCombo[Input.secretComboProgress] === direction) {
    Input.secretComboProgress++;
    if (Input.secretComboProgress === Input.secretCombo.length) {
      Input.secretComboProgress = 0;
      Input.secretBuffActivation = true;
    }
  } else {
    Input.secretComboProgress = direction === Input.secretCombo[0] ? 1 : 0;
  }
};

Input.updateMouse = function (event) {
  if (Game && Game.autoplay) { return; }
  var rect = Draw.canvas.getBoundingClientRect();
  Input.screenX = (event.clientX - rect.left) * CONFIG.CANVAS_W / rect.width;
  Input.mouseX = Input.screenX + Draw.cameraX;
  Input.mouseY = (event.clientY - rect.top) * CONFIG.CANVAS_H / rect.height;
};

Input.refreshMouseWorld = function () {
  if (Game && Game.autoplay) { return; }
  Input.mouseX = Input.screenX + Draw.cameraX;
};

Input.handleEndlessKey = function (event) {
  if (event.repeat || event.code !== "KeyE" || !event.shiftKey) { return false; }
  Input.endless = true;
  Input.dash = false;
  event.preventDefault();
  return true;
};

Input.handleSecretImageFlashKey = function (event) {
  if (event.repeat || !event.shiftKey || event.code !== "KeyL") { return false; }
  Input.secretImageFlashActivation = true;
  event.preventDefault();
  return true;
};

Input.handleVisualKey = function (event) {
  if (event.repeat) { return false; }
  if (event.shiftKey && event.code === "KeyO") {
    Input.secretImageToggle = true;
    event.preventDefault();
    return true;
  }
  if (!event.shiftKey && (event.key === "y" || event.key === "Y")) {
    Input.wipeScreenSplats = true;
    event.preventDefault();
    return true;
  }
  return false;
};

window.addEventListener("mousemove", function (event) { Input.updateMouse(event); });
window.addEventListener("mousedown", function (event) {
  AudioFX.unlock();
  if (event.button === 0) { Input.mouseDown = true; Input.updateMouse(event); }
});
window.addEventListener("mouseup", function (event) {
  if (event.button === 0) { Input.mouseDown = false; }
});

Input.setMobileMode = function (enabled) {
  Input.mobileMode = !!enabled;
  var controls = document.getElementById("touch-controls");
  var toggle = document.getElementById("mobile-toggle");
  if (controls) { controls.hidden = !Input.mobileMode; }
  if (toggle) {
    toggle.setAttribute("aria-pressed", String(Input.mobileMode));
    toggle.textContent = Input.mobileMode ? "MOBILE MODE ON" : "MOBILE MODE OFF";
  }
  document.body.classList.toggle("mobile-mode", Input.mobileMode);
  if (!Input.mobileMode) {
    Input.left = false; Input.right = false; Input.jump = false; Input.dash = false; Input.shoot = false;
  }
  try { localStorage.setItem("rollerMobileMode", Input.mobileMode ? "on" : "off"); } catch (error) {}
};

Input.restoreMobileMode = function () {
  var enabled = false;
  try { enabled = localStorage.getItem("rollerMobileMode") === "on"; } catch (error) {}
  Input.setMobileMode(enabled);
};

Input.setupMobileControls = function () {
  var touchControls = document.getElementById("touch-controls");
  if (touchControls) {
    touchControls.addEventListener("pointerdown", function (event) {
      var button = event.target.closest("[data-touch-action]");
      if (!button || !Input.mobileMode) { return; }
      event.preventDefault();
      Input[button.getAttribute("data-touch-action")] = true;
      if (button.setPointerCapture) { button.setPointerCapture(event.pointerId); }
    });
    function releaseTouchAction(event) {
      var button = event.target.closest("[data-touch-action]");
      if (button) { Input[button.getAttribute("data-touch-action")] = false; }
    }
    touchControls.addEventListener("pointerup", releaseTouchAction);
    touchControls.addEventListener("pointercancel", releaseTouchAction);
    touchControls.addEventListener("lostpointercapture", releaseTouchAction);
  }
  if (Draw.canvas) {
    Draw.canvas.addEventListener("pointerdown", function (event) {
      if (!Input.mobileMode || event.pointerType !== "touch") { return; }
      event.preventDefault();
      Input.updateMouse(event);
    });
    Draw.canvas.addEventListener("pointermove", function (event) {
      if (Input.mobileMode && event.pointerType === "touch" && event.buttons) {
        event.preventDefault();
        Input.updateMouse(event);
      }
    });
  }
};

window.addEventListener("keydown", function (event) {
  AudioFX.unlock();
  if (event.key === "Escape" && typeof Tutorial !== "undefined" && (Tutorial.active || Tutorial.menuVisible)) {
    Input.tutorialSkip = true;
    event.preventDefault();
    return;
  }
  if (Input.handleVisualKey(event)) { return; }
  if (Input.handleEndlessKey(event)) { return; }
  if (!event.repeat && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(event.key) >= 0) {
    Input.registerSecretDirection(event.key.slice(5).toLowerCase());
  }
  if (Input.handleSecretImageFlashKey(event)) { return; }
  if (event.shiftKey && (event.code === "KeyQ" || event.key === "q" || event.key === "Q")) {
    var skipTime = Date.now();
    if (!event.repeat && Input.adminSkipPending && skipTime - Input.adminSkipAt <= 400) {
      Input.adminSkipPending = false;
      Input.adminLevelSelect = true;
    } else {
      Input.adminSkipPending = true;
      Input.adminSkipAt = skipTime;
    }
    event.preventDefault();
    return;
  }
  if (!event.repeat && event.shiftKey && event.code === "Digit1") {
    var boostTime = Date.now();
    if (Input.balanceBoostPending && boostTime - Input.balanceBoostAt <= 400) {
      Input.balanceBoostPending = false;
      Input.balanceBoostActivation = true;
    } else {
      Input.balanceBoostPending = true;
      Input.balanceBoostAt = boostTime;
    }
    event.preventDefault();
    return;
  }
  if (event.shiftKey && (event.code === "KeyG" || event.key === "g" || event.key === "G")) {
    Input.adminRandom = true;
    event.preventDefault();
    return;
  }
  if (event.shiftKey && (event.key === "y" || event.key === "Y")) {
    Input.versionToggle = true;
    event.preventDefault();
  }
  if (!event.repeat && !event.shiftKey && (event.key === "p" || event.key === "P")) {
    Input.pause = true;
    event.preventDefault();
  }
  if (!event.repeat && !event.shiftKey && (event.key === "i" || event.key === "I")) {
    Input.invincibility = true;
    event.preventDefault();
  }
  if (!event.repeat && event.shiftKey && (event.code === "KeyP" || event.key === "p" || event.key === "P")) {
    Input.secretInvincibility = true;
    event.preventDefault();
  }
  if (event.key === "Shift") { Input.dash = true; event.preventDefault(); }
  setKey(event.key, true);
  if (["ArrowLeft", "ArrowRight", "ArrowUp", " "].indexOf(event.key) >= 0) {
    event.preventDefault();
  }
});

window.addEventListener("keyup", function (event) {
  setKey(event.key, false);
});

function setKey(key, isDown) {
  if (key === "ArrowLeft" || key === "a" || key === "A") { Input.left = isDown; }
  if (key === "ArrowRight" || key === "d" || key === "D") { Input.right = isDown; }
  if (key === "ArrowUp" || key === " " || key === "w" || key === "W") { Input.jump = isDown; }
  if (key === "r" || key === "R") { Input.restart = isDown; }
  if (key === "x" || key === "X" || key === "k" || key === "K") { Input.shoot = isDown; }
  if (key === "Shift") { Input.dash = isDown; }
}
