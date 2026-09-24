/* =====================================================================
   collide.js  --  DID THE PLAYER TOUCH SOMETHING?

   The player is a BOX for collision, even though it is drawn as a
   circle. Boxes are much easier to check, and nobody can tell.

   Every function here answers one yes-or-no question about a box.
   ===================================================================== */

var Collide = {};

// Which grid squares does this box overlap?
// Returns a list of { col: , row: } objects.
Collide.squaresUnder = function (x, y, width, height) {
  var firstCol = Math.floor(x / CONFIG.TILE);
  var lastCol  = Math.floor((x + width  - 1) / CONFIG.TILE);
  var firstRow = Math.floor(y / CONFIG.TILE);
  var lastRow  = Math.floor((y + height - 1) / CONFIG.TILE);

  var squares = [];
  for (var row = firstRow; row <= lastRow; row++) {
    for (var col = firstCol; col <= lastCol; col++) {
      squares.push({ col: col, row: row });
    }
  }
  return squares;
};

// Is this box inside a solid block?
Collide.hitsSolid = function (x, y, width, height) {
  var squares = Collide.squaresUnder(x, y, width, height);
  for (var i = 0; i < squares.length; i++) {
    if (Level.isSolid(squares[i].col, squares[i].row)) { return true; }
  }
  return false;
};

Collide.lineHitsSolid = function (startX, startY, endX, endY) {
  var distance = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
  var steps = Math.ceil(distance / (CONFIG.TILE / 2));
  for (var i = 1; i < steps; i++) {
    var amount = i / steps;
    var x = startX + (endX - startX) * amount;
    var y = startY + (endY - startY) * amount;
    if (Collide.hitsSolid(x - 2, y - 2, 4, 4)) { return true; }
  }
  return false;
};

// Is this box touching a spike?
Collide.hitsSpike = function (x, y, width, height) {
  var squares = Collide.squaresUnder(x, y, width, height);
  for (var i = 0; i < squares.length; i++) {
    if (Level.isSpike(squares[i].col, squares[i].row)) { return true; }
  }
  return false;
};

Collide.hitsLava = function (x, y, width, height) {
  var squares = Collide.squaresUnder(x, y, width, height);
  for (var i = 0; i < squares.length; i++) {
    if (Level.isLava(squares[i].col, squares[i].row)) { return true; }
  }
  return false;
};

// Is this box touching the finish?
Collide.hitsFinish = function (x, y, width, height) {
  var squares = Collide.squaresUnder(x, y, width, height);
  for (var i = 0; i < squares.length; i++) {
    if (Level.isFinish(squares[i].col, squares[i].row)) { return true; }
  }
  return false;
};
