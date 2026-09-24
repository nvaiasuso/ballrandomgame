/* =====================================================================
   main.js  --  THE STARTING LINE.

   This is the smallest file in the project and it runs last. All it
   does is: set up the screen, load the data files, build the first
   level, and start the loop.

   You will almost never need to change this file.
   ===================================================================== */

Draw.setup();

document.getElementById("gamble-button").addEventListener("click", function () { Game.openGamble(); });
document.getElementById("pause-button").addEventListener("click", function () { Game.togglePause(); });
document.getElementById("fullscreen-button").addEventListener("click", function () {
  var shell = document.getElementById("game-shell");
  if (document.fullscreenElement) { document.exitFullscreen(); }
  else if (shell.requestFullscreen) { shell.requestFullscreen(); }
});
document.addEventListener("fullscreenchange", function () {
  var button = document.getElementById("fullscreen-button");
  var active = document.fullscreenElement;
  button.textContent = active ? "EXIT FULLSCREEN" : "FULLSCREEN";
  button.setAttribute("aria-label", active ? "Exit fullscreen" : "Enter fullscreen");
});
document.getElementById("gamble-confirm").addEventListener("click", function (event) { event.stopPropagation(); Game.resolveGamble(); });
document.getElementById("gamble-cancel").addEventListener("click", function (event) { event.stopPropagation(); Game.closeGamble(); });

Level.loadData(function () {
  Game.startLevel(CONFIG.START_LEVEL);
  Game.loop();
});
