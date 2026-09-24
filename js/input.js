/* =====================================================================
   input.js  --  READING THE KEYBOARD.
   ===================================================================== */

var Input = {
  left: false,
  right: false,
  jump: false,
  restart: false,
  shoot: false,
  mouseX: 0,
  mouseY: 0,
  mouseDown: false,
  versionToggle: false
};

Input.updateMouse = function (event) {
  var rect = Draw.canvas.getBoundingClientRect();
  Input.mouseX = (event.clientX - rect.left) * CONFIG.CANVAS_W / rect.width + Draw.cameraX;
  Input.mouseY = (event.clientY - rect.top) * CONFIG.CANVAS_H / rect.height;
};

window.addEventListener("mousemove", function (event) { Input.updateMouse(event); });
window.addEventListener("mousedown", function (event) {
  if (event.button === 0) { Input.mouseDown = true; Input.updateMouse(event); }
});
window.addEventListener("mouseup", function (event) {
  if (event.button === 0) { Input.mouseDown = false; }
});

window.addEventListener("keydown", function (event) {
  if (event.shiftKey && (event.key === "y" || event.key === "Y")) {
    Input.versionToggle = true;
    event.preventDefault();
  }
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
}
