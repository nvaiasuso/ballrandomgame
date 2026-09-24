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
  versionToggle: false,
  adminSkip: false,
  adminRandom: false,
  gamble: false,
  dash: false,
  endless: false
};

Input.updateMouse = function (event) {
  var rect = Draw.canvas.getBoundingClientRect();
  Input.screenX = (event.clientX - rect.left) * CONFIG.CANVAS_W / rect.width;
  Input.mouseX = Input.screenX + Draw.cameraX;
  Input.mouseY = (event.clientY - rect.top) * CONFIG.CANVAS_H / rect.height;
};

Input.refreshMouseWorld = function () {
  Input.mouseX = Input.screenX + Draw.cameraX;
};

window.addEventListener("mousemove", function (event) { Input.updateMouse(event); });
window.addEventListener("mousedown", function (event) {
  AudioFX.unlock();
  if (event.button === 0) { Input.mouseDown = true; Input.updateMouse(event); }
});
window.addEventListener("mouseup", function (event) {
  if (event.button === 0) { Input.mouseDown = false; }
});

window.addEventListener("keydown", function (event) {
  AudioFX.unlock();
  if (event.shiftKey && (event.code === "KeyQ" || event.key === "q" || event.key === "Q")) {
    Input.adminSkip = true;
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
  if (!event.repeat && !event.shiftKey && (event.key === "g" || event.key === "G")) {
    Input.gamble = true;
    event.preventDefault();
  }
  if (!event.repeat && !event.shiftKey && (event.key === "e" || event.key === "E")) {
    Input.endless = true;
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
