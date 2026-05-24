export type RunStatus = "ready" | "running" | "paused" | "crashed";

export type Hoop = {
  x: number;
  y: number;
  radius: number;
  side: "left" | "right";
  isScored: boolean;
};

export type BallPoint = {
  x: number;
  y: number;
  speed: number;
};

export type BasketballGame = {
  status: RunStatus;
  ballX: number;
  ballY: number;
  ballVx: number;
  ballVy: number;
  ballRadius: number;
  ballHistory: BallPoint[];
  hoop: Hoop;
  score: number;
  baskets: number;
  combo: number;
  timeRemaining: number;
  maxTime: number;
  hoopSwapDelay: number;
  scoreFlash: number;
  scoreX: number;
  scoreY: number;
  lastScoreValue: number;
  lastScoreWasSwish: boolean;
  shakeTime: number;
  netPull: number;
  bounceCooldown: number;
  tapGlow: number;
  fireTime: number;
  shotTouchedHoop: boolean;
  hasTapped: boolean;
};

export type ScoreEvent = {
  points: number;
  isSwish: boolean;
  swishStreak: number;
  totalScore: number;
};

export const COURT_WIDTH = 390;
export const COURT_HEIGHT = 844;
export const HOOP_RADIUS = 35;

const BALL_RADIUS = 17;
const HOOP_WALL_INSET = 11;
const GRAVITY = 1200;
const TAP_BOOST_Y = -525;
const MAX_UPWARD_SPEED = -865;
const TAP_FORWARD_SPEED = 358;
const HOOP_SWAP_DELAY = 0.34;
const CEILING_Y = 122;
const FLOOR_Y = COURT_HEIGHT - 44;
const MAX_PHYSICS_STEP = 1 / 150;
const RIM_THICKNESS = 6;
const BOARD_W = 9;
const BOARD_H = 112;
const NORMAL_BASKET_POINTS = 1;
const SWISH_BASKET_POINTS = 3;
const SWISH_FLASH_DURATION = 0.76;
const NORMAL_FLASH_DURATION = 0.58;

export function getFloorY() {
  return FLOOR_Y;
}

export function getHoopGeometry(hoop: Hoop) {
  const rimFrontX = hoop.side === "right" ? hoop.x - hoop.radius : hoop.x + hoop.radius;
  const rimBackX = hoop.side === "right" ? hoop.x + hoop.radius : hoop.x - hoop.radius;

  return {
    rimFrontX,
    rimBackX,
    targetMinX: Math.min(rimFrontX, rimBackX),
    targetMaxX: Math.max(rimFrontX, rimBackX),
  };
}

export function createTapTapGame(): BasketballGame {
  return {
    status: "ready",
    ballX: COURT_WIDTH * 0.62,
    ballY: FLOOR_Y - 115,
    ballVx: 0,
    ballVy: 0,
    ballRadius: BALL_RADIUS,
    ballHistory: [],
    hoop: generateRandomHoop("right", 0),
    score: 0,
    baskets: 0,
    combo: 0,
    timeRemaining: 10.5,
    maxTime: 10.5,
    hoopSwapDelay: 0,
    scoreFlash: 0,
    scoreX: 0,
    scoreY: 0,
    lastScoreValue: 0,
    lastScoreWasSwish: false,
    shakeTime: 0,
    netPull: 0,
    bounceCooldown: 0,
    tapGlow: 0,
    fireTime: 0,
    shotTouchedHoop: false,
    hasTapped: false,
  };
}

export function generateRandomHoop(currentSide: "left" | "right", score = 0, preferredY?: number): Hoop {
  const targetSide = currentSide === "left" ? "right" : "left";
  const minY = 292;
  const maxY = Math.max(548, 628 - Math.min(score, 20) * 2.4);
  let randomY = minY + Math.random() * (maxY - minY);
  if (preferredY !== undefined && Math.abs(randomY - preferredY) < 58) {
    const upperSpace = maxY - preferredY;
    const lowerSpace = preferredY - minY;
    randomY =
      upperSpace > lowerSpace
        ? Math.min(maxY, preferredY + 70 + Math.random() * Math.max(0, upperSpace - 70))
        : Math.max(minY, preferredY - 70 - Math.random() * Math.max(0, lowerSpace - 70));
  }
  const wallX = targetSide === "right" ? COURT_WIDTH - HOOP_WALL_INSET : HOOP_WALL_INSET;
  const targetX = targetSide === "right" ? wallX - HOOP_RADIUS : wallX + HOOP_RADIUS;

  return {
    x: targetX,
    y: randomY,
    radius: HOOP_RADIUS,
    side: targetSide,
    isScored: false,
  };
}

export function flapBall(game: BasketballGame) {
  if (game.status !== "running") return;
  const activeTargetSide = game.hoop.isScored ? (game.hoop.side === "right" ? "left" : "right") : game.hoop.side;
  const sideDirection = activeTargetSide === "right" ? 1 : -1;
  const { rimFrontX, rimBackX, targetMinX, targetMaxX } = getHoopGeometry(game.hoop);
  const fallbackAimX = activeTargetSide === "right" ? COURT_WIDTH * 0.72 : COURT_WIDTH * 0.28;
  const mouthCenterX = (rimFrontX + rimBackX) / 2;
  let aimX = game.hoop.isScored ? fallbackAimX : mouthCenterX;
  if (!game.hoop.isScored && game.hoop.side === "left" && game.ballX < mouthCenterX) {
    aimX = targetMaxX + game.ballRadius * 1.15;
  } else if (!game.hoop.isScored && game.hoop.side === "right" && game.ballX > mouthCenterX) {
    aimX = targetMinX - game.ballRadius * 1.15;
  }
  const aimDeltaX = aimX - game.ballX;
  const direction = Math.abs(aimDeltaX) > game.ballRadius * 0.85 ? Math.sign(aimDeltaX) : sideDirection;
  const distanceBoost = clamp(Math.abs(aimDeltaX) / 150, 0.78, 1.14);
  const difficulty = Math.min(game.baskets, 28);
  const targetVx = direction * (TAP_FORWARD_SPEED + difficulty * 2.2) * distanceBoost;

  game.ballVy = Math.max(game.ballVy + TAP_BOOST_Y, MAX_UPWARD_SPEED - difficulty * 2.2);
  game.ballVx = game.ballVx * 0.48 + targetVx * 0.52;
  game.tapGlow = 0.18;
  game.hasTapped = true;
}

function breakSwishStreak(game: BasketballGame) {
  game.combo = 0;
  game.fireTime = 0;
  game.shotTouchedHoop = true;
}

function emitBounce(game: BasketballGame, events: { onBounce: () => void }, breaksSwishStreak = false) {
  if (breaksSwishStreak) {
    breakSwishStreak(game);
  }
  if (game.bounceCooldown > 0) return;
  game.bounceCooldown = 0.08;
  events.onBounce();
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getBoardRect(hoop: Hoop) {
  const { rimBackX } = getHoopGeometry(hoop);
  const boardX = hoop.side === "left" ? rimBackX - BOARD_W - 2 : rimBackX + 2;
  const boardY = hoop.y - 76;

  return {
    left: boardX,
    right: boardX + BOARD_W,
    top: boardY,
    bottom: boardY + BOARD_H,
  };
}

function sweepPointAgainstAabb(
  previousX: number,
  previousY: number,
  currentX: number,
  currentY: number,
  left: number,
  top: number,
  right: number,
  bottom: number
) {
  const dx = currentX - previousX;
  const dy = currentY - previousY;
  const insideX = previousX >= left && previousX <= right;
  const insideY = previousY >= top && previousY <= bottom;

  if (insideX && insideY) {
    return { normalX: 0, normalY: previousY < (top + bottom) / 2 ? -1 : 1 };
  }

  let entryX = -Infinity;
  let exitX = Infinity;
  let xNormal = 0;
  if (dx > 0) {
    entryX = (left - previousX) / dx;
    exitX = (right - previousX) / dx;
    xNormal = -1;
  } else if (dx < 0) {
    entryX = (right - previousX) / dx;
    exitX = (left - previousX) / dx;
    xNormal = 1;
  } else if (!insideX) {
    return null;
  }

  let entryY = -Infinity;
  let exitY = Infinity;
  let yNormal = 0;
  if (dy > 0) {
    entryY = (top - previousY) / dy;
    exitY = (bottom - previousY) / dy;
    yNormal = -1;
  } else if (dy < 0) {
    entryY = (bottom - previousY) / dy;
    exitY = (top - previousY) / dy;
    yNormal = 1;
  } else if (!insideY) {
    return null;
  }

  const entryTime = Math.max(entryX, entryY);
  const exitTime = Math.min(exitX, exitY);
  if (entryTime > exitTime || entryTime < 0 || entryTime > 1) return null;

  return entryX > entryY ? { normalX: xNormal, normalY: 0 } : { normalX: 0, normalY: yNormal };
}

function resolveAabbCollision(
  game: BasketballGame,
  previousX: number,
  previousY: number,
  rect: { left: number; top: number; right: number; bottom: number },
  bounceX: number,
  bounceY: number,
  events: { onBounce: () => void },
  breaksSwishStreak = false
) {
  const inflated = {
    left: rect.left - game.ballRadius,
    right: rect.right + game.ballRadius,
    top: rect.top - game.ballRadius,
    bottom: rect.bottom + game.ballRadius,
  };
  const hit = sweepPointAgainstAabb(previousX, previousY, game.ballX, game.ballY, inflated.left, inflated.top, inflated.right, inflated.bottom);
  if (!hit) return false;

  if (hit.normalX < 0) {
    game.ballX = inflated.left - 0.5;
    game.ballVx = -Math.max(Math.abs(game.ballVx), 170) * bounceX;
  } else if (hit.normalX > 0) {
    game.ballX = inflated.right + 0.5;
    game.ballVx = Math.max(Math.abs(game.ballVx), 170) * bounceX;
  }

  if (hit.normalY < 0) {
    game.ballY = inflated.top - 0.5;
    game.ballVy = -Math.max(Math.abs(game.ballVy), 280) * bounceY;
  } else if (hit.normalY > 0) {
    game.ballY = inflated.bottom + 0.5;
    game.ballVy = Math.max(Math.abs(game.ballVy), 220) * bounceY;
  }

  game.ballVx *= hit.normalY === 0 ? 1 : 0.42;
  game.ballVy *= hit.normalX === 0 ? 1 : 0.82;
  emitBounce(game, events, breaksSwishStreak);
  return true;
}

function resolveRimPointCollision(
  game: BasketballGame,
  previousX: number,
  previousY: number,
  pointX: number,
  pointY: number,
  rimThickness: number,
  events: { onBounce: () => void }
) {
  const moveX = game.ballX - previousX;
  const moveY = game.ballY - previousY;
  const moveLenSq = moveX * moveX + moveY * moveY;
  const t = moveLenSq <= 0.001 ? 1 : clamp(((pointX - previousX) * moveX + (pointY - previousY) * moveY) / moveLenSq, 0, 1);
  const closestX = previousX + moveX * t;
  const closestY = previousY + moveY * t;
  const dist = Math.hypot(closestX - pointX, closestY - pointY);
  const minDist = game.ballRadius + rimThickness;
  if (dist <= 0.001 || dist >= minDist) return false;

  const nx = (closestX - pointX) / dist;
  const ny = (closestY - pointY) / dist;
  const velocityTowardRim = game.ballVx * nx + game.ballVy * ny;

  game.ballX = pointX + nx * (minDist + 0.5);
  game.ballY = pointY + ny * (minDist + 0.5);

  if (velocityTowardRim < 0) {
    game.ballVx = (game.ballVx - 2 * velocityTowardRim * nx) * 0.34;
    game.ballVy = (game.ballVy - 2 * velocityTowardRim * ny) * 0.78;
  }

  emitBounce(game, events, true);
  return true;
}

function resolveRimSegmentCollision(
  game: BasketballGame,
  rimLeftX: number,
  rimRightX: number,
  rimY: number,
  rimThickness: number,
  previousBallX: number,
  previousBallY: number,
  events: { onBounce: () => void }
) {
  return resolveAabbCollision(
    game,
    previousBallX,
    previousBallY,
    {
      left: rimLeftX,
      right: rimRightX,
      top: rimY - rimThickness,
      bottom: rimY + rimThickness,
    },
    0.34,
    previousBallY < rimY ? 0.74 : 0.62,
    events,
    true
  );
}

export function stepTapTapGame(
  game: BasketballGame,
  dt: number,
  events: {
    onBounce: () => void;
    onScore: (event: ScoreEvent) => void;
    onSwish: () => void;
    onBuzzer: () => void;
  }
) {
  const stepCount = Math.max(1, Math.ceil(dt / MAX_PHYSICS_STEP));
  const stepDt = dt / stepCount;
  for (let i = 0; i < stepCount; i += 1) {
    stepTapTapGameFrame(game, stepDt, events);
    if (game.status !== "running") break;
  }
}

function stepTapTapGameFrame(
  game: BasketballGame,
  dt: number,
  events: {
    onBounce: () => void;
    onScore: (event: ScoreEvent) => void;
    onSwish: () => void;
    onBuzzer: () => void;
  }
) {
  if (game.status !== "running") return;

  game.timeRemaining = Math.max(0, game.timeRemaining - dt);
  game.scoreFlash = Math.max(0, game.scoreFlash - dt);
  game.shakeTime = Math.max(0, game.shakeTime - dt);
  game.netPull = Math.max(0, game.netPull - dt);
  game.bounceCooldown = Math.max(0, game.bounceCooldown - dt);
  game.tapGlow = Math.max(0, game.tapGlow - dt);
  game.fireTime = Math.max(0, game.fireTime - dt);

  if (game.timeRemaining <= 0) {
    game.status = "crashed";
    events.onBuzzer();
    return;
  }

  game.ballVy += GRAVITY * dt;
  let previousBallX = game.ballX;
  let previousBallY = game.ballY;

  game.ballX += game.ballVx * dt;
  game.ballY += game.ballVy * dt;

  game.ballHistory.unshift({
    x: game.ballX,
    y: game.ballY,
    speed: Math.hypot(game.ballVx, game.ballVy),
  });
  if (game.ballHistory.length > 26) game.ballHistory.pop();

  const wrapMargin = game.ballRadius + 4;

  if (game.ballX < -wrapMargin) {
    game.ballX = COURT_WIDTH + wrapMargin;
    game.ballHistory = [];
    previousBallX = game.ballX;
    previousBallY = game.ballY;
  } else if (game.ballX > COURT_WIDTH + wrapMargin) {
    game.ballX = -wrapMargin;
    game.ballHistory = [];
    previousBallX = game.ballX;
    previousBallY = game.ballY;
  }

  if (game.ballY < CEILING_Y + game.ballRadius) {
    game.ballY = CEILING_Y + game.ballRadius;
    game.ballVy = Math.abs(game.ballVy) * 0.42;
    game.ballVx *= 0.78;
  }

  if (game.ballY >= FLOOR_Y - game.ballRadius) {
    game.ballY = FLOOR_Y - game.ballRadius;
    if (game.ballVy > 85) {
      game.ballVy = -Math.max(310, game.ballVy) * 0.76;
      game.ballVx *= 0.7;
      emitBounce(game, events);
    } else {
      game.ballVy = -295;
      game.ballVx *= 0.72;
    }
  }

  const hoop = game.hoop;
  const { rimFrontX, rimBackX, targetMinX, targetMaxX } = getHoopGeometry(hoop);
  const mouthCenterX = (rimFrontX + rimBackX) / 2;

  if (game.hoopSwapDelay > 0) {
    game.hoopSwapDelay = Math.max(0, game.hoopSwapDelay - dt);
    if (game.hoopSwapDelay === 0 && hoop.isScored) {
      game.hoop = generateRandomHoop(hoop.side, game.baskets, hoop.y);
      game.shotTouchedHoop = false;
      const direction = game.hoop.side === "right" ? 1 : -1;
      game.ballVx = game.ballVx * 0.48 + direction * 92;
    }
  }

  if (!hoop.isScored) {
    const dxToMouth = mouthCenterX - game.ballX;
    const nearEntryWindow =
      Math.abs(dxToMouth) < HOOP_RADIUS * 2.7 &&
      game.ballY > hoop.y - 108 &&
      game.ballY < hoop.y + 78 &&
      game.ballVy > -150;
    if (nearEntryWindow) {
      const verticalEntry = clamp((game.ballVy + 150) / 760, 0.18, 1);
      game.ballVx += dxToMouth * dt * (6.8 + verticalEntry * 2.2);
      if (Math.abs(dxToMouth) < HOOP_RADIUS * 0.86 && game.ballVy > 60) {
        game.ballVx *= 1 - Math.min(0.42, dt * 5.4);
      }
    }
  }

  if (!hoop.isScored) {
    const scorePadding = game.ballRadius * 1.02;
    const scoringPlaneY = hoop.y - game.ballRadius - RIM_THICKNESS - 1;
    const crossesRimFromAbove = previousBallY < scoringPlaneY && game.ballY >= scoringPlaneY && game.ballVy > 0;
    if (crossesRimFromAbove) {
      const crossingT = clamp((scoringPlaneY - previousBallY) / Math.max(0.001, game.ballY - previousBallY), 0, 1);
      const crossingX = previousBallX + (game.ballX - previousBallX) * crossingT;
      const entryPadding = Math.max(6, game.ballRadius * 0.43);
      const insideRing = crossingX >= targetMinX + entryPadding && crossingX <= targetMaxX - entryPadding;
      const ballWasAboveMouth = previousBallY < scoringPlaneY;
      if (insideRing && ballWasAboveMouth && game.ballX >= targetMinX - scorePadding && game.ballX <= targetMaxX + scorePadding) {
        const cleanEntry = !game.shotTouchedHoop && Math.abs(crossingX - mouthCenterX) < HOOP_RADIUS * 0.64 && Math.abs(game.ballVx) < 220;
        const points = cleanEntry ? SWISH_BASKET_POINTS : NORMAL_BASKET_POINTS;

        hoop.isScored = true;
        game.score += points;
        game.baskets += 1;
        game.combo = cleanEntry ? game.combo + 1 : 0;
        game.scoreFlash = cleanEntry ? SWISH_FLASH_DURATION : NORMAL_FLASH_DURATION;
        game.scoreX = mouthCenterX;
        game.scoreY = hoop.y;
        game.lastScoreValue = points;
        game.lastScoreWasSwish = cleanEntry;
        game.shakeTime = cleanEntry ? 0.16 : 0.11;
        game.netPull = 0.32;
        game.fireTime = cleanEntry ? 2.1 : 0;
        game.ballX = game.ballX * 0.25 + mouthCenterX * 0.75;
        game.ballVx *= 0.08;
        game.ballVy = Math.max(game.ballVy * 0.34, 190);
        game.maxTime = Math.max(5.8, 10.5 - game.baskets * 0.045);
        game.timeRemaining = game.maxTime;
        game.hoopSwapDelay = HOOP_SWAP_DELAY;

        events.onScore({
          points,
          isSwish: cleanEntry,
          swishStreak: game.combo,
          totalScore: game.score,
        });
        if (cleanEntry) events.onSwish();
      }
    }
  }

  if (hoop.isScored) return;

  if (resolveRimSegmentCollision(game, targetMinX, targetMaxX, hoop.y, RIM_THICKNESS, previousBallX, previousBallY, events)) {
    return;
  }

  if (resolveAabbCollision(game, previousBallX, previousBallY, getBoardRect(hoop), 0.44, 0.72, events, true)) {
    return;
  }

  if (resolveRimPointCollision(game, previousBallX, previousBallY, rimFrontX, hoop.y, RIM_THICKNESS, events)) return;
  resolveRimPointCollision(game, previousBallX, previousBallY, rimBackX, hoop.y, RIM_THICKNESS, events);
}