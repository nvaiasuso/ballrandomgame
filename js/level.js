/* =====================================================================
   level.js  --  BUILDING THE WORLD OUT OF PIECES.

   A level is a list of piece names. A piece is a little 8-wide,
   10-tall picture. This file glues the pictures together, left to
   right, into one big grid.

   The pictures live in data/pieces.json.
   The lists of names live in data/levels.json.
   ===================================================================== */

var Level = {
  pieces: null,     // every piece picture, loaded from pieces.json
  levels: null,     // every level list, loaded from levels.json
  grid: [],         // the finished world. grid[row][col] is one character
  cols: 0,          // how many columns wide the finished world is
  name: "",
  startX: 0,        // where the player begins, in pixels
  startY: 0,
  finishTiles: [],
  crumbleTiles: {},
  movingPlatforms: []
};

// --- STEP 1: read the two data files ----------------------------------
Level.loadData = function (whenDone) {
  fetch("data/pieces.json")
    .then(function (r) { return r.json(); })
    .then(function (piecesFile) {
      Level.pieces = piecesFile;
      return fetch("data/levels.json");
    })
    .then(function (r) { return r.json(); })
    .then(function (levelsFile) {
      Level.levels = levelsFile.levels;
      whenDone();
    })
    .catch(function (error) {
      document.getElementById("message").textContent =
        "Could not load the level files. Check data/pieces.json and data/levels.json.";
      console.error(error);
    });
};

// --- STEP 2: glue the pieces together ---------------------------------
Level.build = function (levelNumber) {
  var level = Level.levels[levelNumber];
  Level.buildPieces(level.name, level.pieces);
};

Level.buildPieces = function (name, pieceNames) {
  Level.name = name;
  Level.dark = name.indexOf("Dark") >= 0 || pieceNames.indexOf("dark_run") >= 0;
  Level.grid = [];
  Level.cols = pieceNames.length * CONFIG.PIECE_COLS;

  // start with 10 empty rows
  for (var row = 0; row < CONFIG.ROWS; row++) {
    Level.grid.push("");
  }

  // add each piece onto the end of every row
  for (var p = 0; p < pieceNames.length; p++) {
    var pieceName = pieceNames[p];
    var piece = Level.pieces[pieceName];

    if (!piece) {
      console.error("No piece named '" + pieceName + "' in data/pieces.json");
      piece = Level.pieces["flat"];
    }

    for (var row = 0; row < CONFIG.ROWS; row++) {
      Level.grid[row] = Level.grid[row] + piece[row];
    }
  }

  Level.findStart();
  Level.finishTiles = [];
  for (var finishRow = 0; finishRow < CONFIG.ROWS; finishRow++) {
    for (var finishCol = 0; finishCol < Level.cols; finishCol++) {
      if (Level.charAt(finishCol, finishRow) === "F") { Level.finishTiles.push({ x: finishCol * CONFIG.TILE, y: finishRow * CONFIG.TILE }); }
    }
  }
  Level.crumbleTiles = {};
  Level.movingPlatforms = [];
  for (var scanRow = 0; scanRow < CONFIG.ROWS; scanRow++) {
    for (var scanCol = 0; scanCol < Level.cols; scanCol++) {
      var dynamicChar = Level.charAt(scanCol, scanRow);
      if (dynamicChar === "C") { Level.crumbleTiles[scanCol + ":" + scanRow] = { timer: 45, cooldown: 0 }; }
      if (dynamicChar === "M") { Level.movingPlatforms.push({ baseX: scanCol * CONFIG.TILE, x: scanCol * CONFIG.TILE, y: scanRow * CONFIG.TILE, width: CONFIG.TILE * 3, phase: scanCol }); }
    }
  }
};

Level.updateDynamic = function () {
  var key;
  for (key in Level.crumbleTiles) {
    var parts = key.split(":");
    var col = Number(parts[0]), row = Number(parts[1]);
    var tile = Level.crumbleTiles[key];
    if (tile.cooldown > 0) { tile.cooldown--; if (tile.cooldown === 0) { tile.timer = 45; } continue; }
    var x = col * CONFIG.TILE, y = row * CONFIG.TILE;
    if (Player.x + CONFIG.PLAYER_SIZE > x && Player.x < x + CONFIG.TILE &&
        Player.y + CONFIG.PLAYER_SIZE >= y - 4 && Player.y + CONFIG.PLAYER_SIZE <= y + 8) {
      tile.timer--;
      if (tile.timer <= 0) { tile.cooldown = 120; }
    }
  }
  for (var i = 0; i < Level.movingPlatforms.length; i++) {
    var platform = Level.movingPlatforms[i];
    platform.x = platform.baseX + Math.sin(Game.levelTime / 28 + platform.phase) * 55;
  }
};

Level.buildRandom = function () {
  var random = Math.random;
  if (arguments.length > 0) {
    var state = arguments[0] >>> 0;
    random = function () { state = (Math.imul(1664525, state) + 1013904223) >>> 0; return state / 4294967296; };
  }
  var choices = ["flat", "gap", "spikes", "step", "platform", "stairs", "spikepit", "hard_gap3", "hard_gauntlet", "enemy_line", "enemy_tower", "turret_room", "charger_run", "splitter_hall", "crumble_run", "moving_platform"];
  if (Game.endless && Game.endlessWave > 2) { choices.push("boss_arena"); }
  var pieceNames = ["start"];
  for (var i = 0; i < 14; i++) {
    pieceNames.push(choices[Math.floor(random() * choices.length)]);
  }
  pieceNames.push("finish");
  Level.buildPieces("RANDOM ASSAULT", pieceNames);
  var enemyChars = Object.keys(CONFIG.ENEMY_TYPES);
  for (var col = 8; col < Level.cols - 8; col++) {
    if (Level.charAt(col, 7) === "." && Level.isSolid(col, 8) && random() < 0.7) {
      Level.setCharAt(col, 7, enemyChars[Math.floor(random() * enemyChars.length)]);
    }
  }
};

Level.setCharAt = function (col, row, character) {
  var line = Level.grid[row];
  Level.grid[row] = line.substring(0, col) + character + line.substring(col + 1);
};

// --- STEP 3: find the S and remember where it is ----------------------
Level.findStart = function () {
  for (var row = 0; row < CONFIG.ROWS; row++) {
    for (var col = 0; col < Level.cols; col++) {
      if (Level.charAt(col, row) === "S") {
        Level.startX = col * CONFIG.TILE;
        Level.startY = row * CONFIG.TILE;
        return;
      }
    }
  }
  // no S found anywhere, so just start at the top left
  Level.startX = 0;
  Level.startY = 0;
};

// --- ASKING THE WORLD QUESTIONS ---------------------------------------
// What character is at this grid square?
Level.charAt = function (col, row) {
  if (row < 0 || row >= CONFIG.ROWS) { return "."; }
  if (col < 0 || col >= Level.cols)  { return "."; }
  return Level.grid[row].charAt(col);
};

Level.isSolid  = function (col, row) {
  var character = Level.charAt(col, row);
  if (character === "#") { return true; }
  if (character === "C") { return Level.crumbleTiles[col + ":" + row] && Level.crumbleTiles[col + ":" + row].cooldown === 0; }
  return false;
};
Level.isSpike  = function (col, row) { return Level.charAt(col, row) === "^"; };
Level.isLava   = function (col, row) { return Level.charAt(col, row) === "~"; };
Level.isFinish = function (col, row) { return Level.charAt(col, row) === "F"; };

// How wide is the whole world, in pixels?
Level.pixelWidth = function () { return Level.cols * CONFIG.TILE; };
