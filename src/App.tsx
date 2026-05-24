import { BadgeHelp, Pause, Play, RotateCcw, Home, Volume2, VolumeX } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import assetSheetUrl from "./assets/generated/tap-tap-shots-asset-sheet.png";
import { createTapTapGame, stepTapTapGame, flapBall } from "./game/state";
import { drawTapTapGame } from "./game/render";
import { playTapSound, playRimBounceSound, playNetSwishSound, playBuzzerSound, toggleTapMute, startTapMusic, stopTapMusic, playScoreSound, playButtonSound } from "./game/sounds";

const SCORE_KEY = "taptap-shots-personal-best-v2";
const RULES_KEY = "taptap-shots-neon-rules-seen-v2";

function readBestScore() {
  const value = window.localStorage.getItem(SCORE_KEY);
  const num = value ? Number(value) : 0;
  return Number.isFinite(num) ? num : 0;
}

export function App() {
  const initialGame = useMemo(() => createTapTapGame(), []);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef(initialGame);
  const previousTimeRef = useRef<number | null>(null);
  const lastUiUpdateRef = useRef(0);
  const rulesPausedRunRef = useRef(false);
  const lastInputAtRef = useRef(0);

  const [snapshot, setSnapshot] = useState(() => ({ ...initialGame }));
  const [highScore, setHighScore] = useState(readBestScore);
  const [isMuted, setIsMuted] = useState(false);
  const [showRules, setShowRules] = useState(() => window.localStorage.getItem(RULES_KEY) !== "true");
  const [assetSheet, setAssetSheet] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const image = new Image();
    image.src = assetSheetUrl;
    image.onload = () => setAssetSheet(image);
  }, []);

  const handleStartRun = () => {
    playButtonSound();
    gameRef.current = createTapTapGame();
    gameRef.current.status = "running";
    rulesPausedRunRef.current = false;
    startTapMusic();
    window.localStorage.setItem(RULES_KEY, "true");
    setShowRules(false);
    previousTimeRef.current = null;
    setSnapshot({ ...gameRef.current });
  };

  const handleDismissRules = () => {
    playButtonSound();
    window.localStorage.setItem(RULES_KEY, "true");
    setShowRules(false);
    if (gameRef.current.status === "ready") {
      handleStartRun();
    } else if (gameRef.current.status === "paused" && rulesPausedRunRef.current) {
      rulesPausedRunRef.current = false;
      handleResumeRun();
    }
  };

  const handleResumeRun = () => {
    playButtonSound();
    gameRef.current.status = "running";
    startTapMusic();
    previousTimeRef.current = null;
    setSnapshot({ ...gameRef.current });
  };

  const handlePauseRun = () => {
    if (gameRef.current.status === "running") {
      playButtonSound();
      gameRef.current.status = "paused";
      rulesPausedRunRef.current = false;
      stopTapMusic();
      setSnapshot({ ...gameRef.current });
    }
  };

  const handleQuitToMenu = () => {
    playButtonSound();
    gameRef.current = createTapTapGame();
    gameRef.current.status = "ready";
    rulesPausedRunRef.current = false;
    stopTapMusic();
    setSnapshot({ ...gameRef.current });
  };

  const handleOpenRules = (e: React.MouseEvent) => {
    e.stopPropagation();
    playButtonSound();
    if (gameRef.current.status === "running") {
      gameRef.current.status = "paused";
      rulesPausedRunRef.current = true;
      stopTapMusic();
      setSnapshot({ ...gameRef.current });
    }
    setShowRules(true);
  };

  const handleTapAction = (e: React.PointerEvent | React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (e.target instanceof Element && e.target.closest("button")) return;
    const now = performance.now();
    if (now - lastInputAtRef.current < 70) return;
    lastInputAtRef.current = now;

    if (gameRef.current.status === "running") {
      playTapSound();
      flapBall(gameRef.current);
    }
  };

  const handleMuteToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    playButtonSound();
    setIsMuted(toggleTapMute());
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const resizeField = () => {
      const parent = canvas.parentElement;
      const rect = parent?.getBoundingClientRect();
      const width = Math.floor(rect?.width ?? window.innerWidth);
      const height = Math.floor(rect?.height ?? window.innerHeight);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawTapTapGame(context, gameRef.current, { width: canvas.clientWidth, height: canvas.clientHeight }, { sheet: assetSheet });
    };

    let isActive = true;
    let frameId = 0;

    const runLoop = (time: number) => {
      if (!isActive) return;

      const prevTime = previousTimeRef.current ?? time;
      const dt = Math.min((time - prevTime) / 1000, 0.04);
      previousTimeRef.current = time;

      stepTapTapGame(gameRef.current, dt, {
        onBounce: () => playRimBounceSound(),
        onScore: (scoreEvent) => {
          playScoreSound(scoreEvent.swishStreak, scoreEvent.points);
        }, 
        onSwish: () => playNetSwishSound(),
        onBuzzer: () => {
          playBuzzerSound();
          stopTapMusic();
          const finalScore = gameRef.current.score;
          if (finalScore > readBestScore()) {
            window.localStorage.setItem(SCORE_KEY, String(finalScore));
            setHighScore(finalScore);
          }
        },
      });

      // UI THROTTLE: Increased to 60ms to vastly improve mobile input latency
      if (time - lastUiUpdateRef.current > 60 || gameRef.current.status !== snapshot.status) {
        lastUiUpdateRef.current = time;
        setSnapshot({ ...gameRef.current });
      }

      drawTapTapGame(context, gameRef.current, { width: canvas.clientWidth, height: canvas.clientHeight }, { sheet: assetSheet });
      frameId = window.requestAnimationFrame(runLoop);
    };

    resizeField();
    window.addEventListener("resize", resizeField);
    frameId = window.requestAnimationFrame(runLoop);

    return () => {
      isActive = false;
      window.removeEventListener("resize", resizeField);
      window.cancelAnimationFrame(frameId);
    };
  }, [snapshot.status, highScore, assetSheet]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "ArrowUp" || e.key.toLowerCase() === "w") {
        e.preventDefault();
        if (gameRef.current.status === "running") {
          playTapSound();
          flapBall(gameRef.current);
        } else if (gameRef.current.status === "ready" || gameRef.current.status === "crashed") {
          handleStartRun();
        }
      }
      if (e.key === "Escape") {
        if (gameRef.current.status === "running") handlePauseRun();
        else if (gameRef.current.status === "paused") handleResumeRun();
      }
      if (e.key === "?" || e.key.toLowerCase() === "h") {
        e.preventDefault();
        if (gameRef.current.status === "running") {
          gameRef.current.status = "paused";
          rulesPausedRunRef.current = true;
          stopTapMusic();
        }
        setShowRules(true);
        setSnapshot({ ...gameRef.current });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <main className="app" style={{ "--asset-sheet": `url(${assetSheetUrl})` } as CSSProperties}>
      <section className="playfield" onPointerDown={handleTapAction} onMouseDown={handleTapAction} onTouchStart={handleTapAction}>
        <canvas ref={canvasRef} />

        {/* --- HUD --- */}
        <div className="hud-layer">
          {(snapshot.status === "running" || snapshot.status === "paused") && (
            <>
              <div className="timer-bar-container">
                <div 
                  className="timer-bar" 
                  style={{ 
                    width: `${(snapshot.timeRemaining / snapshot.maxTime) * 100}%`,
                  }} 
                />
              </div>
              <div className="hud-top">
                <div className="hud-buttons">
                  <button className="icon-btn" aria-label={isMuted ? "Unmute" : "Mute"} title={isMuted ? "Unmute" : "Mute"} onClick={handleMuteToggle}>
                    {isMuted ? <VolumeX size={22} /> : <Volume2 size={22} />}
                  </button>
                  <button className="icon-btn" aria-label="How to play" title="How to play" onClick={handleOpenRules}>
                    <BadgeHelp size={22} />
                  </button>
                </div>
                <div className="score-chip" aria-live="polite">
                  <span className="sr-only">Score</span>
                  <strong>{snapshot.score}</strong>
                </div>
                <div className="hud-buttons">
                  <button className="icon-btn" aria-label={snapshot.status === "paused" ? "Resume" : "Pause"} title={snapshot.status === "paused" ? "Resume" : "Pause"} onClick={(e) => {
                    e.stopPropagation();
                    if (snapshot.status === "paused") handleResumeRun();
                    else handlePauseRun();
                  }}>
                    {snapshot.status === "paused" ? <Play size={22} /> : <Pause size={22} />}
                  </button>
                </div>
              </div>
              {snapshot.score === 0 && !snapshot.hasTapped && snapshot.status === "running" && (
                <div className="tap-hint">Tap anywhere or press Space</div>
              )}
            </>
          )}

          {snapshot.status === "running" && snapshot.combo > 0 && (
             <div className="combo-text">
               SWISH FIRE x{snapshot.combo}
             </div>
          )}
        </div>

        {/* --- OVERLAYS --- */}
        {snapshot.status === "ready" && !showRules && (
          <div className="modal-overlay" onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <h1>TapTap Shots</h1>
              <div className="tap-preview" aria-hidden="true">
                <div className="preview-ball" />
                <div className="preview-hoop" />
              </div>
              <div className="stats-row">
                <div className="stat-item">
                  <span className="stat-label">Personal Best</span>
                  <span className="stat-value">{highScore}</span>
                </div>
              </div>
              <button className="primary-btn" onClick={handleStartRun}>
                <Play size={22} fill="currentColor"/> PLAY NOW
              </button>
            </div>
          </div>
        )}

        {showRules && (
          <div className="modal-overlay" onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <h1>How to Play</h1>
              <p>Tap anywhere to boost the ball toward the hoop before the clock runs out. The ball wraps through the side walls, so aim through either edge. Regular baskets score 1 point; clean swishes score 3 and ignite the ball until the streak breaks. Press Space on desktop.</p>
              <button
                className="primary-btn"
                onClick={handleDismissRules}
              >
                {snapshot.status === "ready" ? "START PLAYING" : "BACK TO GAME"}
              </button>
            </div>
          </div>
        )}

        {snapshot.status === "paused" && !showRules && (
          <div className="modal-overlay" onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <h1>PAUSED</h1>
              <div className="stats-row" style={{marginBottom: "20px"}}></div>
              <button className="primary-btn" onClick={handleResumeRun}>
                <Play size={22} fill="currentColor"/> RESUME
              </button>
              <button className="secondary-btn" onClick={handleStartRun}>
                <RotateCcw size={20} /> RESTART
              </button>
              <button className="secondary-btn" onClick={handleQuitToMenu}>
                <Home size={20} /> MAIN MENU
              </button>
            </div>
          </div>
        )}

        {snapshot.status === "crashed" && !showRules && (
          <div className="modal-overlay" onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <h1 style={{color: '#ff4400'}}>TIME OUT!</h1>
              <div className="stats-row">
                <div className="stat-item">
                  <span className="stat-label">Score</span>
                  <span className="stat-value" style={{color: '#ff5500'}}>{snapshot.score}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Best</span>
                  <span className="stat-value">{highScore}</span>
                </div>
              </div>
              <button className="primary-btn" onClick={handleStartRun}>
                <RotateCcw size={22} /> TRY AGAIN
              </button>
              <button className="secondary-btn" onClick={handleQuitToMenu}>
                <Home size={22} /> MAIN MENU
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}