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

document.getElementById("guide-button").addEventListener("click", function () { Game.openGuide(); });
document.getElementById("guide-close").addEventListener("click", function () { Game.closeGuide(); });
document.getElementById("gamble-button").addEventListener("click", function () { Game.openGamble(); });
document.getElementById("pause-button").addEventListener("click", function () { Game.togglePause(); });
document.getElementById("fullscreen-button").addEventListener("click", function () {
  var shell = document.getElementById("game-shell");
  if (document.fullscreenElement) { document.exitFullscreen(); }
  else if (shell.requestFullscreen) { shell.requestFullscreen(); }
});
document.getElementById("mobile-toggle").addEventListener("click", function () {
  Input.setMobileMode(!Input.mobileMode);
});
document.addEventListener("fullscreenchange", function () {
  var button = document.getElementById("fullscreen-button");
  var active = document.fullscreenElement;
  button.textContent = active ? "EXIT FULLSCREEN" : "FULLSCREEN";
  button.setAttribute("aria-label", active ? "Exit fullscreen" : "Enter fullscreen");
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

Level.loadData(function () {
  Game.easyMode = false;
  Game.startLevel(CONFIG.START_LEVEL);
  Game.loop();
});
