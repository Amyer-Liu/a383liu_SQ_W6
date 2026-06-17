// ============================================================
// Week 6 — One Night Ultimate Werewolf Theme
// ============================================================
// ============================================================
// Week 6 Side Quest — One Night Ultimate Werewolf Theme
// ============================================================
// Based on the vertical scrolling shoot 'em up example.
// Reskinned with a werewolf village theme:
//   - Background: dark medieval village night scene
//   - Player: custom werewolf character sprite sheet
//   - Enemies: styled as villagers with torches
//   - Obstacles: styled as silver traps / moonstone barriers
//   - Background music, shoot sound, and hit sound added
// ============================================================

// ------------------------------------------------------------
// SPRITE SHEET CONFIGURATION
// Mirrors the Week 5 maze reference (document 2).
// character.png is 320×320 total — a 4-column × 4-row grid.
// Each individual frame is 80×80 px (320 / 4 = 80).
// Row 0 = facing down  (walk toward camera)
// Row 1 = facing up    (walk away)
// Row 2 = facing right
// Row 3 = facing left
// ------------------------------------------------------------

const SPRITE = {
  frameWidth:  80,   // 320px sheet ÷ 4 columns = 80px per frame
  frameHeight: 80,   // 320px sheet ÷ 4 rows    = 80px per frame
  numFrames:   4,
  animSpeed:   10,   // frames between animation ticks
  scale:       0.60, // drawn size = 80 * 0.60 = 48px — fits the r:22 hitbox
  rows: {
    down:  0,
    up:    1,
    right: 2,
    left:  3,
  },
};

// Sprite animation state (attached to player object below)
let spriteFrame      = 0;
let spriteFrameTimer = 0;
let spriteDirection  = "up"; // default: facing up (shooting upward)
let spriteMoving     = false;

// ------------------------------------------------------------
// WORLD
// ------------------------------------------------------------
const WORLD_LENGTH = 3000;
const SCROLL_SPEED = 0.8;
let scrollY = 0;

// ------------------------------------------------------------
// PLAYER CONFIGURATION
// ------------------------------------------------------------
const PLAYER_SPEED    = 3;
const BULLET_SPEED    = 10;
const SHOOT_COOLDOWN  = 12;
const INVINCIBLE_FRAMES = 90;

// ------------------------------------------------------------
// ENEMY CONFIGURATION
// ------------------------------------------------------------
const ENEMY_SPAWN_RATE = 120;
const MAX_ENEMIES      = 3;
let spawnTimer         = 0;

// ------------------------------------------------------------
// OBSTACLES  (loaded from data/obstacles.json)
// ------------------------------------------------------------
let obstacleData;
let obstacles = [];

// ------------------------------------------------------------
// BACKGROUND SHAPES
// ------------------------------------------------------------
let bgShapes = [];

// ------------------------------------------------------------
// PLAYER
// ------------------------------------------------------------
let player = {
  x: 400,
  y: 370,
  r: 22,
  blobT: 0,
  direction: { x: 0, y: -1 },
  shootTimer: 0,
  health: 5,
  maxHealth: 5,
  invincible: false,
  invincibleTimer: 0,
  bounceVX: 0,
  bounceVY: 0,
};

// ------------------------------------------------------------
// BULLETS and ENEMIES
// ------------------------------------------------------------
let bullets = [];
let enemies = [];

// ------------------------------------------------------------
// GAME STATE
// ------------------------------------------------------------
let score = 0;

const STATE_PLAY = "play";
const STATE_WIN  = "win";
const STATE_OVER = "over";
let gameState = STATE_PLAY;

// ------------------------------------------------------------
// ASSETS
// ------------------------------------------------------------
let characterSheet; // loaded in preload()
let bgImage;        // background.jpg
let shootSound;
let hitSound;
let music;

// ============================================================
// preload()
// ============================================================
function preload() {
  obstacleData = loadJSON("data/obstacles.json");

  // Images
  characterSheet = loadImage("assets/images/character.png");
  bgImage        = loadImage("assets/images/background.jpg");

  // Sounds
  shootSound = loadSound("assets/sounds/shoot.mp3");
  hitSound   = loadSound("assets/sounds/get hit.mp3");
  music      = loadSound("assets/sounds/background music.mp3");
}

// ============================================================
// setup()
// ============================================================
function setup() {
  createCanvas(800, 450);
  imageMode(CORNER);

  // Build obstacle objects from JSON
  for (let i = 0; i < obstacleData.obstacles.length; i++) {
    let o = obstacleData.obstacles[i];
    obstacles.push({
      x:      o.x,
      worldY: o.worldY,
      size:   o.size,
    });
  }

  // Background parallax shapes — styled as floating moonlight particles
  for (let i = 0; i < 80; i++) {
    bgShapes.push({
      x:          random(width),
      worldY:     random(-WORLD_LENGTH, 0),
      scrollMult: random(0.4, 0.9),
      type:       random() > 0.5 ? "circle" : "rect",
      size:       random(4, 18),
      // Cool silver-blue palette fitting a moonlit village
      r: floor(random(150, 220)),
      g: floor(random(160, 210)),
      b: floor(random(180, 255)),
    });
  }

  // Start looping background music
  music.loop();
}

// ============================================================
// draw()
// ============================================================
function draw() {
  background(10, 8, 20); // very dark night sky fallback

  if (gameState === STATE_PLAY) {
    scrollWorld();
    drawBackground();
    drawObstacles();
    handleInput();
    applyBounce();
    updateBullets();
    updateEnemies();
    spawnEnemies();
    checkBulletEnemyCollisions();
    checkEnemyPlayerCollision();
    checkObstaclePlayerCollision();
    updateInvincibility();
    checkLevelComplete();
    drawEnemies();
    drawBullets();
    drawPlayer();
    drawHUD();
  } else if (gameState === STATE_WIN) {
    drawWinScreen();
  } else if (gameState === STATE_OVER) {
    drawGameOver();
  }
}

// ------------------------------------------------------------
// scrollWorld()
// ------------------------------------------------------------
function scrollWorld() {
  if (scrollY < WORLD_LENGTH) {
    scrollY += SCROLL_SPEED;
  }
}

// ------------------------------------------------------------
// drawBackground()
// Tiles/stretches background.jpg to fill the canvas, with a
// parallax scroll offset so it moves as the world scrolls.
// ------------------------------------------------------------
function drawBackground() {
  // Draw the background image stretched to canvas, offset vertically
  // by a fraction of scrollY for a subtle parallax feel.
  let parallaxOffset = (scrollY * 0.15) % height;

  // Draw two copies so there's no gap when scrolling
  image(bgImage, 0, parallaxOffset - height, width, height);
  image(bgImage, 0, parallaxOffset,          width, height);

  // Overlay — darkens the image to keep the moody werewolf atmosphere
  noStroke();
  fill(5, 0, 15, 120);
  rect(0, 0, width, height);

  // Moonlight particles (the bgShapes array)
  for (let i = 0; i < bgShapes.length; i++) {
    let s = bgShapes[i];
    let screenY = s.worldY + scrollY * s.scrollMult;

    if (screenY > height + s.size) {
      s.worldY -= WORLD_LENGTH + height;
    }

    // Very faint, tiny silver sparkles
    fill(s.r, s.g, s.b, 55);
    noStroke();

    if (s.type === "circle") {
      ellipse(s.x, screenY, s.size);
    } else {
      rect(s.x - s.size / 2, screenY - s.size / 2, s.size, s.size, 2);
    }
  }

  // Faint HUD boundary line
  stroke(200, 190, 255, 40);
  strokeWeight(1);
  line(0, 70, width, 70);
  noStroke();
}

// ------------------------------------------------------------
// drawObstacles()
// Silver-trap / moonstone aesthetic for ONUW theme.
// ------------------------------------------------------------
function drawObstacles() {
  for (let i = 0; i < obstacles.length; i++) {
    let o = obstacles[i];
    let screenY = o.worldY + scrollY;

    if (screenY < -o.size || screenY > height + o.size) continue;

    let x = o.x - o.size / 2;
    let y = screenY - o.size / 2;
    let s = o.size;

    // Animated silver glow
    let glow = map(sin(frameCount * 0.05 + i * 1.2), -1, 1, 40, 100);

    push();

    // Outer moonlight glow — cool silver-blue
    noStroke();
    fill(180, 200, 255, glow);
    rect(x - 4, y - 4, s + 8, s + 8, 8);

    // Stone base — dark grey-blue (silver trap)
    fill(55, 55, 80);
    rect(x, y, s, s, 4);

    // Silver surface patches — lighter moonstone highlights
    fill(130, 140, 180);
    rect(x + s * 0.1, y + s * 0.1, s * 0.4,  s * 0.35, 2);
    rect(x + s * 0.55, y + s * 0.5, s * 0.35, s * 0.3,  2);
    rect(x + s * 0.2,  y + s * 0.6, s * 0.25, s * 0.25, 2);

    // Crack / rune lines — dark blue-grey
    stroke(30, 30, 55);
    strokeWeight(1.5);
    line(x + s * 0.3, y,          x + s * 0.5, y + s * 0.4);
    line(x + s * 0.5, y + s * 0.4, x + s * 0.7, y + s * 0.6);
    line(x,           y + s * 0.5, x + s * 0.3, y + s * 0.7);
    line(x + s * 0.3, y + s * 0.7, x + s * 0.6, y + s);

    // Bright silver rim highlight
    noStroke();
    fill(210, 220, 255, 200);
    rect(x, y, s, 3, 2);
    rect(x, y, 3, s, 2);

    pop();
  }
}

// ------------------------------------------------------------
// checkObstaclePlayerCollision()
// Hit sound plays only for obstacle collisions (as required).
// ------------------------------------------------------------
function checkObstaclePlayerCollision() {
  if (player.invincible) return;

  for (let i = 0; i < obstacles.length; i++) {
    let o = obstacles[i];
    let screenY = o.worldY + scrollY;

    if (screenY < -o.size || screenY > height + o.size) continue;

    let closestX = constrain(player.x, o.x - o.size / 2, o.x + o.size / 2);
    let closestY = constrain(player.y, screenY - o.size / 2, screenY + o.size / 2);
    let d = dist(player.x, player.y, closestX, closestY);

    if (d < player.r) {
      player.health--;
      player.invincible      = true;
      player.invincibleTimer = INVINCIBLE_FRAMES;

      // Play hit sound on obstacle collision
      hitSound.play();

      // Bounce away from obstacle centre
      let dx  = player.x - o.x;
      let dy  = player.y - screenY;
      let len = dist(0, 0, dx, dy);
      if (len > 0) {
        player.bounceVX = (dx / len) * 8;
        player.bounceVY = (dy / len) * 8;
      }

      if (player.health <= 0) {
        gameState = STATE_OVER;
        music.stop();
      }

      break;
    }
  }
}

// ------------------------------------------------------------
// applyBounce()
// ------------------------------------------------------------
function applyBounce() {
  if (abs(player.bounceVX) > 0.1 || abs(player.bounceVY) > 0.1) {
    player.x += player.bounceVX;
    player.y += player.bounceVY;
    player.bounceVX *= 0.75;
    player.bounceVY *= 0.75;

    player.x = constrain(player.x, player.r, width - player.r);
    player.y = constrain(player.y, 70 + player.r, height - player.r);
  }
}

// ------------------------------------------------------------
// handleInput()
// Sets spriteDirection so drawPlayer() picks the right row.
// ------------------------------------------------------------
function handleInput() {
  spriteMoving = false;

  if (keyIsDown(87)) {
    player.y -= PLAYER_SPEED;
    player.direction = { x: 0, y: -1 };
    spriteDirection  = "up";
    spriteMoving     = true;
  }
  if (keyIsDown(83)) {
    player.y += PLAYER_SPEED;
    player.direction = { x: 0, y: 1 };
    spriteDirection  = "down";
    spriteMoving     = true;
  }
  if (keyIsDown(65)) {
    player.x -= PLAYER_SPEED;
    player.direction = { x: -1, y: 0 };
    spriteDirection  = "left";
    spriteMoving     = true;
  }
  if (keyIsDown(68)) {
    player.x += PLAYER_SPEED;
    player.direction = { x: 1, y: 0 };
    spriteDirection  = "right";
    spriteMoving     = true;
  }

  player.x = constrain(player.x, player.r, width - player.r);
  player.y = constrain(player.y, 70 + player.r, height - player.r);

  if (player.shootTimer > 0) player.shootTimer--;

  if (keyIsDown(32) && player.shootTimer === 0) {
    bullets.push({
      x:  player.x + player.direction.x * (player.r + 4),
      y:  player.y + player.direction.y * (player.r + 4),
      vx: player.direction.x * BULLET_SPEED,
      vy: player.direction.y * BULLET_SPEED,
    });
    player.shootTimer = SHOOT_COOLDOWN;

    // Play shoot sound every time spacebar fires
    shootSound.play();
  }
}

// ------------------------------------------------------------
// updateBullets()
// ------------------------------------------------------------
function updateBullets() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    bullets[i].x += bullets[i].vx;
    bullets[i].y += bullets[i].vy;

    if (
      bullets[i].x < 0 || bullets[i].x > width ||
      bullets[i].y < 0 || bullets[i].y > height
    ) {
      bullets.splice(i, 1);
    }
  }
}

// ------------------------------------------------------------
// spawnEnemies()
// ------------------------------------------------------------
function spawnEnemies() {
  if (enemies.length >= MAX_ENEMIES) return;

  spawnTimer++;
  if (spawnTimer < ENEMY_SPAWN_RATE) return;
  spawnTimer = 0;

  let progress = scrollY / WORLD_LENGTH;
  let speed    = 0.8 + progress * 1.0;

  enemies.push({
    x:      random(30, width - 30),
    y:      -25,
    r:      20,
    speed:  speed,
    blobT:  random(100),
  });
}

// ------------------------------------------------------------
// updateEnemies()
// ------------------------------------------------------------
function updateEnemies() {
  for (let i = enemies.length - 1; i >= 0; i--) {
    let e  = enemies[i];
    let dx = player.x - e.x;
    let dy = player.y - e.y;
    let d  = dist(e.x, e.y, player.x, player.y);

    if (d > 0) {
      e.x += (dx / d) * e.speed;
      e.y += (dy / d) * e.speed;
    }

    e.y += SCROLL_SPEED;

    if (e.y > height + 30) {
      enemies.splice(i, 1);
    }
  }
}

// ------------------------------------------------------------
// checkBulletEnemyCollisions()
// ------------------------------------------------------------
function checkBulletEnemyCollisions() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    for (let j = enemies.length - 1; j >= 0; j--) {
      let d = dist(bullets[i].x, bullets[i].y, enemies[j].x, enemies[j].y);
      if (d < enemies[j].r + 6) {
        bullets.splice(i, 1);
        enemies.splice(j, 1);
        score++;
        break;
      }
    }
  }
}

// ------------------------------------------------------------
// checkEnemyPlayerCollision()
// No hit sound here — per the assignment, hit sound is only
// for obstacle collisions.
// ------------------------------------------------------------
function checkEnemyPlayerCollision() {
  if (player.invincible) return;

  for (let i = 0; i < enemies.length; i++) {
    let d = dist(player.x, player.y, enemies[i].x, enemies[i].y);
    if (d < player.r + enemies[i].r - 8) {
      player.health--;
      player.invincible      = true;
      player.invincibleTimer = INVINCIBLE_FRAMES;

      if (player.health <= 0) {
        gameState = STATE_OVER;
        music.stop();
      }
      break;
    }
  }
}

// ------------------------------------------------------------
// updateInvincibility()
// ------------------------------------------------------------
function updateInvincibility() {
  if (player.invincible) {
    player.invincibleTimer--;
    if (player.invincibleTimer <= 0) {
      player.invincible = false;
    }
  }
}

// ------------------------------------------------------------
// checkLevelComplete()
// ------------------------------------------------------------
function checkLevelComplete() {
  if (scrollY >= WORLD_LENGTH) {
    gameState = STATE_WIN;
    music.stop();
  }
}

// ------------------------------------------------------------
// drawBullets()
// Silver moonstone bullets — fitting the werewolf theme.
// ------------------------------------------------------------
function drawBullets() {
  noStroke();
  for (let i = 0; i < bullets.length; i++) {
    // Outer glow
    fill(180, 200, 255, 120);
    ellipse(bullets[i].x, bullets[i].y, 14);
    // Bright core
    fill(230, 240, 255);
    ellipse(bullets[i].x, bullets[i].y, 7);
  }
}

// ------------------------------------------------------------
// drawEnemies()
// Styled as angry torch-carrying villagers (blob silhouettes
// with an orange torch-glow tint — classic ONUW mob feel).
// ------------------------------------------------------------
function drawEnemies() {
  for (let i = 0; i < enemies.length; i++) {
    let e = enemies[i];
    push();

    // Torch-light warm glow behind enemy
    noStroke();
    fill(255, 140, 30, 40);
    ellipse(e.x, e.y, e.r * 3.5, e.r * 3.5);

    // Body — dark cloaked villager blob
    fill(60, 40, 20);
    beginShape();
    let numPoints = 48;
    for (let j = 0; j < numPoints; j++) {
      let angle    = (TWO_PI / numPoints) * j;
      let noiseVal = noise(
        cos(angle) * 0.8 + e.blobT,
        sin(angle) * 0.8 + e.blobT
      );
      let r = e.r + map(noiseVal, 0, 1, -5, 5);
      vertex(e.x + cos(angle) * r, e.y + sin(angle) * r);
    }
    endShape(CLOSE);

    // Eyes — two angry red dots
    fill(220, 50, 30);
    ellipse(e.x - 6, e.y - 4, 6, 6);
    ellipse(e.x + 6, e.y - 4, 6, 6);

    // Torch flame — small bright orange dot
    fill(255, 200, 50);
    ellipse(e.x + e.r - 2, e.y - e.r + 4, 5, 7);

    pop();
    e.blobT += 0.015;
  }
}

// ------------------------------------------------------------
// drawPlayer()
// Uses the sprite sheet exactly like the Week 5 maze reference.
// Row is chosen by spriteDirection; frame cycles when moving.
// ------------------------------------------------------------
function drawPlayer() {
  // Blink when invincible (same logic as original)
  if (player.invincible && floor(player.invincibleTimer / 6) % 2 === 0) return;

  // Animate sprite frames
  if (spriteMoving) {
    spriteFrameTimer++;
    if (spriteFrameTimer >= SPRITE.animSpeed) {
      spriteFrameTimer = 0;
      spriteFrame = (spriteFrame + 1) % SPRITE.numFrames;
    }
  } else {
    spriteFrame      = 0;
    spriteFrameTimer = 0;
  }

  // Pick the correct row from the sprite sheet
  let row = SPRITE.rows[spriteDirection];

  // Source rectangle on the sprite sheet
  let sx = spriteFrame * SPRITE.frameWidth;
  let sy = row         * SPRITE.frameHeight;

  // Destination size
  let dw = SPRITE.frameWidth  * SPRITE.scale;
  let dh = SPRITE.frameHeight * SPRITE.scale;

  // Draw centred on player position (imageMode is CORNER by default,
  // so offset by half the drawn size)
  push();
  imageMode(CENTER);
  image(
    characterSheet,
    player.x, player.y,   // destination centre
    dw, dh,               // destination size
    sx, sy,               // source top-left
    SPRITE.frameWidth, SPRITE.frameHeight // source size
  );
  pop();

  // Update blobT so it stays in sync (unused visually now but kept)
  player.blobT += 0.015;
}

// ------------------------------------------------------------
// drawHUD()
// ------------------------------------------------------------
function drawHUD() {
  noStroke();

  fill(200, 190, 255);
  textSize(13);
  textAlign(LEFT);
  textFont("monospace");
  text("Move: WASD   Shoot: Spacebar", 16, 24);

  fill(255, 240, 180);
  textSize(16);
  textAlign(RIGHT);
  text("Villagers Banished: " + score, width - 16, 28);

  let barW  = 160;
  let barH  = 14;
  let barX  = width - barW - 16;
  let barY  = 40;
  let fillW = map(player.health, 0, player.maxHealth, 0, barW);

  fill(40);
  rect(barX, barY, barW, barH, 4);

  let healthColour = lerpColor(
    color(220, 60, 60),
    color(120, 220, 120),
    player.health / player.maxHealth
  );
  fill(healthColour);
  rect(barX, barY, fillW, barH, 4);

  fill(200, 190, 255);
  textSize(11);
  textAlign(RIGHT);
  text("Health", width - 16, barY + barH + 12);

  // Scroll progress bar
  let progBarX  = width - 6;
  let progBarH  = height - 40;
  let progBarY  = 20;
  let progFill  = map(scrollY, 0, WORLD_LENGTH, 0, progBarH);

  fill(40);
  rect(progBarX, progBarY, 4, progBarH, 2);

  fill(160, 180, 255);
  rect(progBarX, progBarY + progBarH - progFill, 4, progFill, 2);
}

// ------------------------------------------------------------
// drawWinScreen()
// ------------------------------------------------------------
function drawWinScreen() {
  background(10, 8, 20);
  fill(255, 240, 180);
  textAlign(CENTER);
  textSize(48);
  textFont("monospace");
  text("You Survived the Night!", width / 2, height / 2 - 30);

  fill(180, 170, 220);
  textSize(18);
  text("Villagers Banished: " + score, width / 2, height / 2 + 20);

  fill(120, 110, 160);
  textSize(14);
  text("Press R to play again", width / 2, height / 2 + 60);
}

// ------------------------------------------------------------
// drawGameOver()
// ------------------------------------------------------------
function drawGameOver() {
  background(10, 8, 20);
  fill(220, 80, 80);
  textAlign(CENTER);
  textSize(52);
  textFont("monospace");
  text("The Mob Got You!", width / 2, height / 2 - 30);

  fill(180, 170, 220);
  textSize(18);
  text("Villagers Banished: " + score, width / 2, height / 2 + 20);

  fill(120, 110, 160);
  textSize(14);
  text("Press R to play again", width / 2, height / 2 + 60);
}

// ------------------------------------------------------------
// keyPressed()
// ------------------------------------------------------------
function keyPressed() {
  if ((key === "r" || key === "R") && gameState !== STATE_PLAY) {
    gameState  = STATE_PLAY;
    score      = 0;
    scrollY    = 0;
    spawnTimer = 0;
    bullets    = [];
    enemies    = [];

    player.x              = 400;
    player.y              = 370;
    player.direction      = { x: 0, y: -1 };
    player.shootTimer     = 0;
    player.health         = player.maxHealth;
    player.invincible     = false;
    player.invincibleTimer = 0;
    player.bounceVX       = 0;
    player.bounceVY       = 0;

    spriteFrame      = 0;
    spriteFrameTimer = 0;
    spriteDirection  = "up";
    spriteMoving     = false;

    music.loop();
  }
}