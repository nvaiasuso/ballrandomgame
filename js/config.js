/* =====================================================================
   config.js  --  ALL THE NUMBERS.
   ===================================================================== */

var CONFIG = {
  TILE: 40,
  ROWS: 10,
  PIECE_COLS: 8,
  CANVAS_W: 800,
  CANVAS_H: 400,
  VERSION: "0.4.0",

  ENEMY_SPEED: 2,
  ENEMY_SIZE: 32,
  SPOT_FRAMES: 60,
  SPOT_DISTANCE: 240,
  HEAR_DISTANCE: 80,
  ENEMY_SHOOT_FRAMES: 45,
  ENEMY_HEALTH: 2,
  ENEMY_SHOOT_DISTANCE: 360,
  ENEMY_TYPES: {
    e: { name: "Hunter", health: 2, speed: 2, shootFrames: 45, bulletSpeed: 6, color: "#ffffff" },
    b: { name: "Brute", health: 6, speed: 1, shootFrames: 12, bulletSpeed: 7, color: "#30343b" },
    s: { name: "Sprinter", health: 1, speed: 4, shootFrames: 60, bulletSpeed: 6, color: "#d8e6ed" },
    t: { name: "Turret", health: 4, speed: 0, shootFrames: 18, bulletSpeed: 7, color: "#9aa7ad" },
    h: { name: "Hopper", health: 2, speed: 2.5, shootFrames: 40, bulletSpeed: 6, color: "#f0d5a0" },
    r: { name: "Ripper", health: 2, speed: 2.2, shootFrames: 8, bulletSpeed: 5, color: "#e08f8f" },
    m: { name: "Tank", health: 8, speed: 0.8, shootFrames: 30, bulletSpeed: 5, color: "#59636b" },
    q: { name: "Sniper", health: 3, speed: 1.2, shootFrames: 70, bulletSpeed: 10, color: "#c5b8e8" },
    v: { name: "Swarm", health: 1, speed: 3, shootFrames: 35, bulletSpeed: 5, color: "#b3d98c" },
    w: { name: "Warden", health: 5, speed: 1.5, shootFrames: 25, bulletSpeed: 6, color: "#d6b36a" },
    f: { name: "Flyer", health: 3, speed: 2.5, shootFrames: 30, bulletSpeed: 7, color: "#8fc4d9", flying: true }
  },
  BOSS_HEALTH: 30,
  BOSS_SIZE: 64,
  BOSS_SPEED: 1.5,
  BOSS_ATTACK_FRAMES: 100,
  BOSS_SPAWN_FRAMES: 150,
  BULLET_SPEED: 6,
  LEAD_FRAMES: 10,

  MOVE_SPEED: 4,
  JUMP_POWER: 15,
  GRAVITY: 0.8,
  MAX_FALL: 16,

  PLAYER_SIZE: 32,
  PLAYER_RADIUS: 16,
  PLAYER_BULLET_SPEED: 8,
  PLAYER_SHOOT_COOLDOWN: 15,
  GUN_UPGRADE_TIME: 8 * 60,
  GUN_ULTRA_TIME: 10 * 60,
  INVINCIBILITY_TIME: 6 * 60,
  LEVEL_TIMES: [30, 28, 26, 24, 22, 20, 18, 18, 16, 40],
  RANDOM_LEVEL_TIME: 28,

  LINE_WIDTH: 3,
  DOT_DISTANCE: 0.55,
  START_LEVEL: 0
};
