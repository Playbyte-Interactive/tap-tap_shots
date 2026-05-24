import type { BasketballGame, Hoop } from "./state";
import { COURT_HEIGHT, COURT_WIDTH, getFloorY, getHoopGeometry } from "./state";

export type TapTapRenderAssets = {
  sheet?: HTMLImageElement | null;
};

const SPRITES = {
  ball: { x: 64, y: 221, w: 295, h: 297 },
};

export function drawTapTapGame(
  ctx: CanvasRenderingContext2D,
  game: BasketballGame,
  viewport: { width: number; height: number },
  assets: TapTapRenderAssets = {}
) {
  const { width, height } = viewport;
  ctx.save();
  ctx.clearRect(0, 0, width, height);
  drawViewportBackground(ctx, width, height);

  // Responsive scaling to pin to the bottom edge on phones
  const isMobile = width < height;
  const scale = isMobile 
    ? width / COURT_WIDTH 
    : Math.min(width / COURT_WIDTH, height / COURT_HEIGHT);

  const gameWidthPixels = COURT_WIDTH * scale;
  const gameHeightPixels = COURT_HEIGHT * scale;
  const offsetX = (width - gameWidthPixels) / 2;
  const offsetY = isMobile 
    ? height - gameHeightPixels 
    : (height - gameHeightPixels) / 2;

  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  if (game.shakeTime > 0) {
    const shake = game.shakeTime / 0.11;
    ctx.translate((Math.random() - 0.5) * 7 * shake, (Math.random() - 0.5) * 5 * shake);
  }

  drawArena(ctx);
  drawScoreGhost(ctx, game.score);
  drawHoopBack(ctx, game.hoop, game.netPull);
  drawTrail(ctx, game, isMobile);
  drawBall(ctx, game, assets.sheet);
  drawHoopFront(ctx, game.hoop, game.netPull);
  drawScoreBurst(ctx, game, isMobile);

  ctx.restore();
}

function drawViewportBackground(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, "#15141c");
  bg.addColorStop(0.52, "#24232a");
  bg.addColorStop(1, "#08090f");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const glow = ctx.createRadialGradient(width * 0.5, height * 0.43, 20, width * 0.5, height * 0.43, height * 0.42);
  glow.addColorStop(0, "rgba(255,255,255,0.12)");
  glow.addColorStop(0.45, "rgba(102,121,255,0.08)");
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
}

function drawArena(ctx: CanvasRenderingContext2D) {
  const floorY = getFloorY();

  ctx.save();
  ctx.strokeStyle = "rgba(92, 105, 139, 0.14)";
  ctx.lineWidth = 1;
  for (let y = 150; y < floorY; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(COURT_WIDTH, y);
    ctx.stroke();
  }

  const floor = ctx.createLinearGradient(0, floorY - 22, 0, COURT_HEIGHT);
  floor.addColorStop(0, "rgba(14, 16, 25, 0)");
  floor.addColorStop(1, "rgba(0, 0, 0, 0.62)");
  ctx.fillStyle = floor;
  ctx.fillRect(0, floorY - 24, COURT_WIDTH, COURT_HEIGHT - floorY + 24);

  ctx.strokeStyle = "rgba(102, 225, 255, 0.32)";
  ctx.shadowColor = "#58e9ff";
  ctx.shadowBlur = 8;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, floorY);
  ctx.lineTo(COURT_WIDTH, floorY);
  ctx.stroke();
  ctx.restore();
}

function drawScoreGhost(ctx: CanvasRenderingContext2D, score: number) {
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.045)";
  ctx.font = "900 196px Impact, 'Arial Black', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(score), COURT_WIDTH / 2, COURT_HEIGHT * 0.53);
  ctx.restore();
}

function drawHoopBack(ctx: CanvasRenderingContext2D, hoop: Hoop, netPull: number) {
  drawBackboard(ctx, hoop);
  drawNet(ctx, hoop, false, netPull);
  drawRimSegment(ctx, hoop, false);
}

function drawHoopFront(ctx: CanvasRenderingContext2D, hoop: Hoop, netPull: number) {
  drawRimSegment(ctx, hoop, true);
  drawNet(ctx, hoop, true, netPull);
  drawRimCaps(ctx, hoop);
}

function drawBackboard(ctx: CanvasRenderingContext2D, hoop: Hoop) {
  const { rimBackX } = getHoopGeometry(hoop);
  const boardW = 9;
  const boardH = 112;
  const boardX = hoop.side === "left" ? rimBackX - boardW - 2 : rimBackX + 2;
  const boardY = hoop.y - 76;
  const postX = hoop.side === "left" ? 0 : COURT_WIDTH - 16;
  const postW = 16;
  const braceStart = hoop.side === "left" ? postX + postW : postX;
  const braceEnd = hoop.side === "left" ? rimBackX - 2 : rimBackX + 2;

  ctx.save();
  ctx.shadowBlur = 13;
  ctx.shadowColor = "#ffcc3d";
  ctx.fillStyle = "#ffca2c";
  ctx.fillRect(postX, boardY + 24, postW, 96);

  ctx.strokeStyle = "#ffb421";
  ctx.lineWidth = 8;
  ctx.lineCap = "square";
  ctx.beginPath();
  ctx.moveTo(braceStart, hoop.y + 18);
  ctx.lineTo(braceEnd, hoop.y + 18);
  ctx.stroke();

  ctx.shadowBlur = 9;
  ctx.shadowColor = "#ffffff";
  ctx.fillStyle = "#f7f8ff";
  ctx.fillRect(boardX, boardY, boardW, boardH);

  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(87,92,116,0.7)";
  ctx.fillRect(boardX, boardY + boardH - 26, boardW, 26);
  ctx.restore();
}

function drawRimSegment(ctx: CanvasRenderingContext2D, hoop: Hoop, front: boolean) {
  const { rimFrontX, rimBackX } = getHoopGeometry(hoop);
  const mouthCenterX = (rimFrontX + rimBackX) / 2;
  const startX = front ? rimFrontX : mouthCenterX;
  const endX = front ? mouthCenterX : rimBackX;

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineWidth = 7;
  ctx.strokeStyle = "#65a5ff";
  ctx.shadowBlur = 11;
  ctx.shadowColor = "#4c8cff";
  ctx.beginPath();
  ctx.moveTo(startX, hoop.y);
  ctx.lineTo(endX, hoop.y);
  ctx.stroke();

  ctx.lineWidth = 2;
  ctx.strokeStyle = "#e8f4ff";
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.moveTo(startX, hoop.y - 2);
  ctx.lineTo(endX, hoop.y - 2);
  ctx.stroke();
  ctx.restore();
}

function drawRimCaps(ctx: CanvasRenderingContext2D, hoop: Hoop) {
  const { rimFrontX, rimBackX } = getHoopGeometry(hoop);
  ctx.save();
  [rimFrontX, rimBackX].forEach((x) => {
    ctx.beginPath();
    ctx.arc(x, hoop.y, 5.3, 0, Math.PI * 2);
    ctx.fillStyle = "#9ed0ff";
    ctx.shadowColor = "#67a7ff";
    ctx.shadowBlur = 10;
    ctx.fill();
  });
  ctx.restore();
}

function drawNet(ctx: CanvasRenderingContext2D, hoop: Hoop, front: boolean, netPull: number) {
  const { rimFrontX, rimBackX } = getHoopGeometry(hoop);
  const leftX = Math.min(rimFrontX, rimBackX);
  const rightX = Math.max(rimFrontX, rimBackX);
  const width = rightX - leftX;
  const centerX = leftX + width / 2;
  const pullRatio = Math.sin((netPull / 0.32) * Math.PI);
  const drop = 45 + pullRatio * 22;
  const taper = 12 + pullRatio * 4;

  ctx.save();
  ctx.strokeStyle = front ? "rgba(255,255,255,0.92)" : "rgba(185,220,255,0.55)";
  ctx.lineWidth = front ? 1.9 : 1.3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowBlur = front ? 5 : 2;
  ctx.shadowColor = "#dff4ff";

  ctx.beginPath();
  for (let i = 0; i <= 5; i += 1) {
    const xTop = leftX + (width * i) / 5;
    if (front && i < 5) {
      const xBot = leftX + taper + ((width - taper * 2) * (i + 1)) / 5;
      ctx.moveTo(xTop, hoop.y + 5);
      ctx.lineTo(xBot, hoop.y + drop);
    }
    if (!front && i > 0) {
      const xBot = leftX + taper + ((width - taper * 2) * (i - 1)) / 5;
      ctx.moveTo(xTop, hoop.y + 5);
      ctx.lineTo(xBot, hoop.y + drop);
    }
  }

  for (let j = 1; j <= 3; j += 1) {
    const y = hoop.y + (drop * j) / 4;
    const sideInset = taper * (j / 3);
    ctx.moveTo(leftX + sideInset, y);
    ctx.quadraticCurveTo(centerX, y + (front ? 9 : -5), rightX - sideInset, y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawTrail(ctx: CanvasRenderingContext2D, game: BasketballGame, isMobile: boolean) {
  if (game.ballHistory.length < 2 || game.status !== "running") return;

  const fire = game.combo > 0 ? Math.max(0.92, game.fireTime / 1.55) : 0;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  // Density Cap: Draws fewer overlapping circles to save GPU on mobile, 
  // but keeps all shadows and glowing neon effects intact!
  const historyLimit = isMobile ? Math.min(14, game.ballHistory.length) : game.ballHistory.length;

  for (let index = 0; index < historyLimit; index += 1) {
    const point = game.ballHistory[index];
    const t = index / historyLimit; 
    const age = 1 - t;
    const comboBoost = fire > 0 ? 1.12 + fire * 0.28 : 0.72;
    const radius = game.ballRadius * (1.25 - t * 0.88) * comboBoost;

    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    
    if (fire > 0) {
      const hue = 48 - t * 36;
      ctx.fillStyle = `hsla(${hue}, 100%, ${index < 4 ? 58 : 40}%, ${age * 0.36 * fire})`;
      ctx.shadowColor = index < 4 ? "#ffe44c" : "#ff4c2f";
      ctx.shadowBlur = (22 - t * 12) * comboBoost;
    } else {
      ctx.fillStyle = `rgba(160, 222, 255, ${age * 0.12})`;
      ctx.shadowColor = "#75d9ff";
      ctx.shadowBlur = 7 - t * 3;
    }
    ctx.fill();

    if (fire > 0 && index > 4) {
      ctx.beginPath();
      ctx.arc(point.x + Math.sin(index) * 4, point.y + Math.cos(index * 1.7) * 4, radius * 0.92, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 62, 36, ${age * 0.18 * fire})`;
      ctx.shadowBlur = 4;
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawBall(ctx: CanvasRenderingContext2D, game: BasketballGame, sheet?: HTMLImageElement | null) {
  const readyBob = game.status === "ready" ? Math.sin(performance.now() / 420) * 11 : 0;
  const tapGlow = game.tapGlow / 0.18;
  const fire = game.combo > 0 ? Math.max(0.9, game.fireTime / 1.55) : 0;

  ctx.save();
  ctx.translate(game.ballX, game.ballY + readyBob);
  ctx.rotate(game.ballX * 0.055 + game.ballY * 0.014);

  if (tapGlow > 0) {
    ctx.beginPath();
    ctx.arc(0, 0, game.ballRadius * (1.35 + tapGlow * 0.22), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(108, 217, 255, ${0.18 * tapGlow})`;
    ctx.shadowColor = "#76dcff";
    ctx.shadowBlur = 12 + tapGlow * 10;
    ctx.fill();
  }

  if (fire > 0) {
    ctx.beginPath();
    ctx.arc(0, 0, game.ballRadius * (1.62 + fire * 0.34), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 204, 38, ${0.18 * fire})`;
    ctx.shadowColor = "#ff6a1e";
    ctx.shadowBlur = 18 + fire * 24;
    ctx.fill();
  }

  if (sheet?.complete) {
    const s = SPRITES.ball;
    const size = game.ballRadius * 2.58;
    ctx.drawImage(sheet, s.x, s.y, s.w, s.h, -size / 2, -size / 2, size, size);
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, game.ballRadius, 0, Math.PI * 2);
    ctx.fillStyle = "#ff8a18";
    ctx.fill();
    ctx.strokeStyle = "#1b0f06";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();
}

function drawScoreBurst(ctx: CanvasRenderingContext2D, game: BasketballGame, isMobile: boolean) {
  if (game.scoreFlash <= 0) return;
  const duration = game.lastScoreWasSwish ? 0.76 : 0.58;
  const pulse = Math.min(1, game.scoreFlash / duration);
  const outward = 1 - pulse;

  ctx.save();
  ctx.translate(game.scoreX, game.scoreY);
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = pulse;

  const gradient = ctx.createRadialGradient(0, 0, 5, 0, 0, 88 + outward * 42);
  gradient.addColorStop(0, "rgba(255,255,255,0.96)");
  gradient.addColorStop(0.22, "rgba(255,229,64,0.55)");
  gradient.addColorStop(1, "rgba(255,80,35,0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, 88 + outward * 42, 0, Math.PI * 2);
  ctx.fill();

  if (game.lastScoreWasSwish) {
    const fireGradient = ctx.createRadialGradient(0, 0, 18, 0, 0, 132 + outward * 48);
    fireGradient.addColorStop(0, `rgba(255,255,255,${0.72 * pulse})`);
    fireGradient.addColorStop(0.24, `rgba(255,232,74,${0.42 * pulse})`);
    fireGradient.addColorStop(0.54, `rgba(255,81,33,${0.28 * pulse})`);
    fireGradient.addColorStop(1, "rgba(255,81,33,0)");
    ctx.fillStyle = fireGradient;
    ctx.beginPath();
    ctx.ellipse(0, 10, 112 + outward * 54, 42 + outward * 28, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(255,255,255,${0.9 * pulse})`;
    ctx.lineWidth = 3.4;
    ctx.shadowColor = "#ffe84a";
    ctx.shadowBlur = 22;
    ctx.beginPath();
    ctx.ellipse(0, 5, 34 + outward * 112, 8 + outward * 36, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Particle Density Drop: Renders 11 sparks instead of 18 on mobile devices.
    const particleCount = isMobile ? 11 : 18;
    for (let i = 0; i < particleCount; i += 1) {
      const angle = (i / particleCount) * Math.PI * 2 + outward * 1.9;
      const wave = Math.sin(i * 2.17) * 0.28;
      const distance = 34 + outward * (68 + (i % 3) * 18);
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle + wave) * distance * 0.55;
      const size = 3.5 + ((i + 1) % 4) * 1.2;
      ctx.fillStyle = i % 2 === 0 ? `rgba(255,246,151,${pulse})` : `rgba(255,91,35,${pulse})`;
      ctx.shadowColor = i % 2 === 0 ? "#fff151" : "#ff5b23";
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(x, y, size * pulse, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.strokeStyle = "#fff4a8";
  ctx.lineWidth = 4;
  ctx.shadowColor = "#ffc928";
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.ellipse(0, 0, 46 + outward * 60, 10 + outward * 19, 0, 0, Math.PI * 2);
  ctx.stroke();

  for (let i = 0; i < 10; i += 1) {
    const angle = (i / 10) * Math.PI * 2;
    const start = 28 + outward * 10;
    const end = 50 + outward * 42;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * start, Math.sin(angle) * start * 0.35);
    ctx.lineTo(Math.cos(angle) * end, Math.sin(angle) * end * 0.35);
    ctx.lineWidth = 2.2;
    ctx.stroke();
  }

  ctx.fillStyle = "#ffffff";
  ctx.font = "900 30px Impact, 'Arial Black', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = game.lastScoreWasSwish ? "#ff5a1f" : "#ffb000";
  ctx.shadowBlur = game.lastScoreWasSwish ? 16 : 10;
  ctx.fillText(`+${game.lastScoreValue}`, 0, -64 - outward * 22);

  if (game.lastScoreWasSwish) {
    ctx.fillStyle = "#ffe84a";
    ctx.font = "900 18px Impact, 'Arial Black', sans-serif";
    ctx.fillText("SWISH", 0, -94 - outward * 18);
  }

  ctx.restore();
}