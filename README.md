# ROLLER - the base game

A circle with an off-center dot rolls through a black and white world. It can move, jump, land on platforms, defeat enemies, collect their gun drops, and shoot.

## How to play it

Push your changes, then open your GitHub Pages link. Press `Ctrl + Shift + R` to hard refresh.

- LEFT / RIGHT arrow - roll
- SPACE or UP arrow - jump
- Jump onto an enemy to defeat it and make it drop a gun
- X or K - fire after collecting a gun
- R - restart the level
- G or the GAMBLE button - pause and risk a random buff or debuff once per level

The game now includes seven levels. The later levels include enemies, gaps, spikes, platforms, and stair sections.

## Where everything lives

| If you want to change... | Open this file |
|---|---|
| movement, enemy, and weapon tuning | `js/config.js` |
| keyboard controls | `js/input.js` |
| level shapes | `data/levels.json` and `data/pieces.json` |
| collision rules | `js/collide.js` |
| player movement and shooting | `js/player.js` |
| enemies, bullets, kills, and gun pickups | `js/enemy.js` |
| drawing | `js/draw.js` |
| page layout | `index.html` and `style.css` |

Level data is loaded with `fetch()`, so use GitHub Pages or another local HTTP server rather than opening `index.html` directly from your hard drive.
