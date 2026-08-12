(() => {
  "use strict";

  const BUILD_ID = "WOOK-GAME-20260812-ACTION-SPACING-RESTORED-V30";
  console.log(`[${BUILD_ID}] loaded`);

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  const SUCCESS_LINK = "https://tmm.im/p/69316";
  const GAME_DURATION = 40;
  const WORLD_LENGTH = 6000;
  const MAX_LIVES = 3;
  const REQUIRED_POTATOES = 6;

  const PLAYER_SIZE = 150;
  const POTATO_SIZE = 84;

  // 모바일 조작 UI 크기
  const JOYSTICK_BASE_SIZE = 146;
  const JOYSTICK_KNOB_SIZE = 66;
  const ACTION_BUTTON_SIZE = 98;
  const ACTION_BUTTON_GAP_ADJUST = 0;

  // 조작 UI 전체 위치를 화면 바깥쪽으로 조금 더 이동
  const JOYSTICK_OUTER_OFFSET_X = 22;
  const ACTION_CLUSTER_OUTER_OFFSET_X = 32;

  // 걷는 속도는 그대로 유지하고,
  // 공중에서 좌우로 움직일 때만 이동량을 늘려 점프 사거리를 넓힘
  const AIR_MOVE_MULTIPLIER = 1.38;

  const WALK_FRAMES = ["wook1", "wook2", "wook3", "wook4"];
  const HARVEST_FRAMES = ["wook5", "wook6", "wook7", "wook8"];
  const SUCCESS_FRAME = "wook9";

  const UI = {
    frame: { x: 18, y: 14, w: 1244, h: 692 },
    stage: { x: 30, y: 26, w: 1220, h: 668 },

    hud: { x: 46, y: 38 },

    toast: { x: 390, y: 150, w: 500, h: 96 },

    progress: { x: 238, y: 610, w: 804, h: 70 }
  };

  const AUTO_CROP_KEYS = new Set([
    "hudPanel",

    "heartOn",
    "heartOff",
    "iconClock",
    "iconBag",

    "progressBg",
    "progressFill",
    "toastGreen",
    "toastYellow",
    "toastRed",
    "holePixel"
  ]);
  const imageOpaqueBounds = {};

  const FIELD_TOP_Y = 456;
  const BACKGROUND_Y_OFFSET = 0;
  const STAGE_GROUND_Y = 513;
  const PLAYER_GROUND_SINK = 10;
  const POTATO_BURY_DEPTH = 26;
  const HOLE_WIDTH = 104;
  const HOLE_HEIGHT = 34;
  const HOLE_TOP_OFFSET = 9;
  const HOLE_FRONT_RATIO = 0.72;
  const POTATO_VISIBLE_BOTTOM_OFFSET = 11;
  const TUTORIAL_POTATO_VISIBLE_BOTTOM_OFFSET = 8;
  const VISIBLE_WORLD_WIDTH = UI.stage.w - 110;
  const PIXEL_FONT = '"Pixel", "Galmuri11", "Malgun Gothic", monospace';

  const startOverlay = document.getElementById("startOverlay");
  const howToOverlay = document.getElementById("howToOverlay");
  const successOverlay = document.getElementById("successOverlay");
  const failOverlay = document.getElementById("failOverlay");
  const failReason = document.getElementById("failReason");
  const startBtn = document.getElementById("startBtn");
  const howToBtn = document.getElementById("howToBtn");
  const closeHowToBtn = document.getElementById("closeHowToBtn");
  const replayTutorialBtn = document.getElementById("replayTutorialBtn");
  const tutorialCanvas = document.getElementById("tutorialCanvas");
  const tutorialCtx = tutorialCanvas?.getContext("2d") ?? null;
  const tutorialMoveBadge = document.getElementById("tutorialMoveBadge");
  const tutorialJumpBadge = document.getElementById("tutorialJumpBadge");
  const tutorialHarvestBadge = document.getElementById("tutorialHarvestBadge");
  const jumpBtn = document.getElementById("jumpBtn");
  const harvestBtn = document.getElementById("harvestBtn");
  const joystickBase = document.getElementById("joystickBase");
  const joystickKnob = document.getElementById("joystickKnob");

  const images = {};

  const mobileJoystickPreload = [];

  [
    "assets/image/mobile_joystick_L.png",
    "assets/image/mobile_joystick_R.png"
  ].forEach((src) => {
    const image = new Image();
    image.src = src;
    mobileJoystickPreload.push(image);
  });
  const imageSources = {
    wook1: "assets/image/wook1.png",
    wook2: "assets/image/wook2.png",
    wook3: "assets/image/wook3.png",
    wook4: "assets/image/wook4.png",
    wook5: "assets/image/wook5.png",
    wook6: "assets/image/wook6.png",
    wook7: "assets/image/wook7.png",
    wook8: "assets/image/wook8.png",
    wook9: "assets/image/wook9.png",

    toxicHead: "assets/image/toxic_head.png",
    normalPotato: "assets/image/normal_potato.png",
    toxicPotato: "assets/image/toxic_potato.png",
    background: "assets/image/background.png",
    groundPixel: "assets/image/ground_pixel.png",
    holePixel: "assets/image/hole_pixel.png",

    hudPanel: "assets/image/hud_panel.png",
    heartOn: "assets/image/heart_on.png",
    heartOff: "assets/image/heart_off.png",
    iconClock: "assets/image/icon_clock.png",
    iconBag: "assets/image/icon_bag.png",
    progressBg: "assets/image/progress_bg.png",
    progressFill: "assets/image/progress_fill.png",
    toastGreen: "assets/image/toast_green.png",
    toastYellow: "assets/image/toast_yellow.png",
    toastRed: "assets/image/toast_red.png"
  };

  const tutorialSound = new Audio("assets/sound/tutorial.mp3");
  tutorialSound.preload = "auto";

  const backgroundSound = new Audio("assets/sound/backsound.m4A");
  backgroundSound.preload = "auto";
  backgroundSound.loop = true;
  const BACKGROUND_VOLUME = 0.28;
  backgroundSound.volume = BACKGROUND_VOLUME;

  let gameRunning = false;
  let lastFrameTime = performance.now();
  let goalToastCooldown = 0;

  const input = {
    left: false,
    right: false,
    joystickDirection: 0
  };

  const joystick = {
    active: false,
    pointerId: null,
    maxDistance: 46
  };

  const tutorial = {
    running: false,
    animationId: null,
    fallbackStartedAt: 0,
    soundStarted: false,
    duration: 12.22
  };

  const state = {
    timeLeft: GAME_DURATION,
    lives: MAX_LIVES,
    bagCount: 0,
    cameraX: 0,
    toast: null,
    lifePulseTime: 0,
    lastLostLife: -1,
    gameOverDelay: 0,
    pendingFailReason: "",
    player: null,
    potatoes: [],
    particles: [],
    holes: []
  };

  function loadImages() {
    Object.entries(imageSources).forEach(([key, src]) => {
      const img = new Image();
      img.onload = () => {
        if (AUTO_CROP_KEYS.has(key)) {
          imageOpaqueBounds[key] = findOpaqueBounds(img);
        }
        render();
      };
      img.onerror = () => console.warn(`[${BUILD_ID}] 이미지 로드 실패: ${src}`);
      img.src = src;
      images[key] = img;
    });
  }

  function imageReady(key) {
    const img = images[key];
    return Boolean(img && img.complete && img.naturalWidth > 0);
  }

  function findOpaqueBounds(img) {
    const fallbackBounds = {
      x: 0,
      y: 0,
      w: img.naturalWidth || img.width || 1,
      h: img.naturalHeight || img.height || 1
    };

    if (window.location.protocol === "file:") {
      return fallbackBounds;
    }

    try {
      const scanCanvas =
        document.createElement("canvas");

      scanCanvas.width =
        img.naturalWidth || img.width || 1;

      scanCanvas.height =
        img.naturalHeight || img.height || 1;

      const scanCtx =
        scanCanvas.getContext(
          "2d",
          { willReadFrequently: true }
        );

      if (!scanCtx) {
        return fallbackBounds;
      }

      scanCtx.clearRect(
        0,
        0,
        scanCanvas.width,
        scanCanvas.height
      );

      scanCtx.drawImage(
        img,
        0,
        0
      );

      const pixels =
        scanCtx.getImageData(
          0,
          0,
          scanCanvas.width,
          scanCanvas.height
        ).data;

      let left = scanCanvas.width;
      let top = scanCanvas.height;
      let right = -1;
      let bottom = -1;

      for (
        let y = 0;
        y < scanCanvas.height;
        y += 1
      ) {
        for (
          let x = 0;
          x < scanCanvas.width;
          x += 1
        ) {
          const alpha =
            pixels[
              (y * scanCanvas.width + x) *
              4 +
              3
            ];

          if (alpha <= 12) {
            continue;
          }

          if (x < left) left = x;
          if (x > right) right = x;
          if (y < top) top = y;
          if (y > bottom) bottom = y;
        }
      }

      if (
        right < left ||
        bottom < top
      ) {
        return fallbackBounds;
      }

      return {
        x: left,
        y: top,
        w: right - left + 1,
        h: bottom - top + 1
      };
    }
    catch (error) {
      console.warn(
        `[${BUILD_ID}] 자동 이미지 크롭을 생략하고 원본 영역을 사용합니다.`,
        error
      );

      return fallbackBounds;
    }
  }

  function getAutoCrop(key, capRatio = 0.14) {
    const img = images[key];
    const bounds = imageOpaqueBounds[key] ?? {
      x: 0,
      y: 0,
      w: img?.naturalWidth ?? 1,
      h: img?.naturalHeight ?? 1
    };

    return {
      ...bounds,
      cap: Math.max(1, Math.round(bounds.w * capRatio))
    };
  }

  function makePotato(type, x) {
    return {
      type,
      x,
      y: STAGE_GROUND_Y - POTATO_SIZE + POTATO_BURY_DEPTH,
      width: POTATO_SIZE,
      height: POTATO_SIZE,
      removed: false
    };
  }

  function applyMobileControlSizes() {
    if (joystickBase) {
      joystickBase.style.setProperty("width", `${JOYSTICK_BASE_SIZE}px`, "important");
      joystickBase.style.setProperty("height", `${JOYSTICK_BASE_SIZE}px`, "important");
      joystickBase.style.setProperty("min-width", `${JOYSTICK_BASE_SIZE}px`, "important");
      joystickBase.style.setProperty("min-height", `${JOYSTICK_BASE_SIZE}px`, "important");
      joystickBase.style.setProperty("transform", `translateX(-${JOYSTICK_OUTER_OFFSET_X}px)`, "important");
    }

    if (joystickKnob) {
      joystickKnob.style.setProperty("width", `${JOYSTICK_KNOB_SIZE}px`, "important");
      joystickKnob.style.setProperty("height", `${JOYSTICK_KNOB_SIZE}px`, "important");
    }

    if (jumpBtn) {
      jumpBtn.style.setProperty("width", `${ACTION_BUTTON_SIZE}px`, "important");
      jumpBtn.style.setProperty("height", `${ACTION_BUTTON_SIZE}px`, "important");
      jumpBtn.style.setProperty("min-width", `${ACTION_BUTTON_SIZE}px`, "important");
      jumpBtn.style.setProperty("min-height", `${ACTION_BUTTON_SIZE}px`, "important");
      jumpBtn.style.setProperty("font-size", "18px", "important");
      jumpBtn.style.setProperty("padding", "0", "important");
      jumpBtn.style.setProperty("box-sizing", "border-box", "important");
      jumpBtn.style.setProperty("border-radius", "50%", "important");
      jumpBtn.style.setProperty("clip-path", "circle(50% at 50% 50%)", "important");
      jumpBtn.style.setProperty("touch-action", "none", "important");
      jumpBtn.style.setProperty(
        "transform",
        `translateX(${ACTION_BUTTON_GAP_ADJUST + ACTION_CLUSTER_OUTER_OFFSET_X}px)`,
        "important"
      );
    }

    if (harvestBtn) {
      harvestBtn.style.setProperty("width", `${ACTION_BUTTON_SIZE}px`, "important");
      harvestBtn.style.setProperty("height", `${ACTION_BUTTON_SIZE}px`, "important");
      harvestBtn.style.setProperty("min-width", `${ACTION_BUTTON_SIZE}px`, "important");
      harvestBtn.style.setProperty("min-height", `${ACTION_BUTTON_SIZE}px`, "important");
      harvestBtn.style.setProperty("font-size", "18px", "important");
      harvestBtn.style.setProperty("padding", "0", "important");
      harvestBtn.style.setProperty("box-sizing", "border-box", "important");
      harvestBtn.style.setProperty("border-radius", "50%", "important");
      harvestBtn.style.setProperty("clip-path", "circle(50% at 50% 50%)", "important");
      harvestBtn.style.setProperty("touch-action", "none", "important");
      harvestBtn.style.setProperty(
        "transform",
        `translateX(${ACTION_CLUSTER_OUTER_OFFSET_X - ACTION_BUTTON_GAP_ADJUST}px)`,
        "important"
      );
    }
  }

  function resetJoystickVisual() {
    joystick.active = false;
    joystick.pointerId = null;

    if (joystickBase) {
      joystickBase.classList.remove(
        "joy-right",
        "joy-active"
      );

      joystickBase.classList.add(
        "joy-left"
      );

      joystickBase.dataset.joyVisualDirection =
        "left";
    }

    if (joystickKnob) {
      joystickKnob.style.transform =
        "translate(-50%, -50%)";
    }
  }

  function resetInput() {
    input.left = false;
    input.right = false;
    input.joystickDirection = 0;
    resetJoystickVisual();
  }

  function resetState() {
    state.timeLeft = GAME_DURATION;
    state.lives = MAX_LIVES;
    state.bagCount = 0;
    state.cameraX = 0;
    state.toast = null;
    state.lifePulseTime = 0;
    state.lastLostLife = -1;
    state.gameOverDelay = 0;
    state.pendingFailReason = "";
    state.particles = [];
    state.holes = [];
    goalToastCooldown = 0;
    resetInput();

    state.player = {
      x: 120,
      y: STAGE_GROUND_Y - PLAYER_SIZE + PLAYER_GROUND_SINK,
      width: PLAYER_SIZE,
      height: PLAYER_SIZE,
      vy: 0,
      speed: 275,
      jumpPower: 930,
      gravity: 2180,
      onGround: true,
      invincibleTime: 0,
      harvestTime: 0,
      harvestDuration: 0.48,
      harvestCooldown: 0,
      successPoseTime: 0,
      successPoseQueued: false,
      walkClock: 0,
      facing: 1,
      moving: false
    };

    state.potatoes = [
      makePotato("normal", 650),
      makePotato("toxic", 1070),
      makePotato("normal", 1510),
      makePotato("normal", 1960),
      makePotato("toxic", 2420),
      makePotato("normal", 2890),
      makePotato("normal", 3350),
      makePotato("toxic", 3820),
      makePotato("normal", 4280),
      makePotato("normal", 4750),
      makePotato("toxic", 5200),
      makePotato("normal", 5640)
    ];
  }

  function playBackgroundSound({ restart = false } = {}) {
    try {
      backgroundSound.volume = BACKGROUND_VOLUME;
      if (restart) backgroundSound.currentTime = 0;
      backgroundSound.play().catch(() => {
      });
    } catch (error) {
      console.warn(`[${BUILD_ID}] 배경음 재생 실패`, error);
    }
  }

  function stopBackgroundSound({ reset = false } = {}) {
    backgroundSound.pause();
    backgroundSound.volume = BACKGROUND_VOLUME;
    if (reset) backgroundSound.currentTime = 0;
  }

  function startGame() {
    stopTutorialDemo({ reset: true });
    resetState();
    startOverlay.classList.remove("show");
    howToOverlay.classList.remove("show");
    successOverlay.classList.remove("show");
    failOverlay.classList.remove("show");
    gameRunning = true;
    playBackgroundSound({ restart: true });
    lastFrameTime = performance.now();
    render();
    requestAnimationFrame(gameLoop);
  }

  function endGame(success, reason = "") {
    gameRunning = false;
    state.gameOverDelay = 0;
    state.pendingFailReason = "";
    stopBackgroundSound({ reset: true });
    resetInput();

    if (success) {
      successOverlay.classList.add("show");
    } else {
      failReason.textContent = reason;
      failOverlay.classList.add("show");
    }
  }

  function showToast(text, score = "", kind = "good", seconds = 1.8) {
    state.toast = { text, score, kind, time: seconds, maxTime: seconds };
  }

  function jump() {
    if (!gameRunning || state.gameOverDelay > 0 || !state.player || !state.player.onGround) return;
    if (state.player.harvestTime > 0 || state.player.successPoseTime > 0) return;

    state.player.vy = -state.player.jumpPower;
    state.player.onGround = false;
  }

  function loseLife(title) {
    const p = state.player;
    if (!gameRunning || !p || p.invincibleTime > 0) return false;

    state.lives -= 1;
    state.lastLostLife = state.lives;
    state.lifePulseTime = 0.82;
    p.invincibleTime = 0.95;
    showToast(title, "-1", "danger", 1.7);

    if (state.lives <= 0) {
      state.lives = 0;
      state.gameOverDelay = 2;
      state.pendingFailReason = "목숨을 모두 잃었어요.";
      p.moving = false;
      resetInput();
    }

    return true;
  }

  function harvest() {
    const p = state.player;
    if (!gameRunning || state.gameOverDelay > 0 || !p) return;
    if (p.harvestCooldown > 0 || p.harvestTime > 0 || p.successPoseTime > 0) return;

    p.harvestTime = p.harvestDuration;
    p.harvestCooldown = 0.56;
    p.successPoseQueued = false;
    p.moving = false;

    const playerCenterX = p.x + p.width / 2;
    const playerBodyCenterY = p.y + p.height * 0.72;

    const target = state.potatoes
      .filter((potato) => {
        if (potato.removed) return false;

        const potatoCenterX = potato.x + potato.width / 2;
        const potatoCenterY = potato.y + potato.height / 2;
        const forwardDistance = (potatoCenterX - playerCenterX) * p.facing;
        const verticalDistance = Math.abs(potatoCenterY - playerBodyCenterY);

        return forwardDistance >= -42 && forwardDistance <= 205 && verticalDistance <= 150;
      })
      .sort((a, b) => {
        const aDistance = Math.abs(a.x + a.width / 2 - playerCenterX);
        const bDistance = Math.abs(b.x + b.width / 2 - playerCenterX);
        return aDistance - bDistance;
      })[0];

    if (!target) {
      showToast("감자 가까이에서 캐기!", "", "hint", 1.1);
      return;
    }

    target.removed = true;
    state.holes.push({ x: target.x + target.width / 2 });
    spawnDirtBurst(target.x + target.width / 2, STAGE_GROUND_Y - 2);

    if (target.type === "normal") {
      state.bagCount += 1;
      p.successPoseQueued = true;
      showToast("욱감자 수확 성공!", "+1", "good", 1.6);
    } else {
      loseLife("독감자를 캐버렸어요!");
    }
  }

  function spawnDirtBurst(x, y) {
    const colors = ["#6f4424", "#8c592e", "#a86e39", "#c18a4f"];
    const count = 17 + Math.floor(Math.random() * 5);

    for (let i = 0; i < count; i += 1) {
      const life = 0.38 + Math.random() * 0.28;
      state.particles.push({
        x: x + (Math.random() - 0.5) * 34,
        y: y + Math.random() * 6,
        vx: (Math.random() - 0.5) * 245,
        vy: -105 - Math.random() * 190,
        gravity: 540 + Math.random() * 180,
        size: 5 + Math.random() * 7,
        life,
        maxLife: life,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
  }

  function updateParticles(dt) {
    for (const particle of state.particles) {
      particle.life -= dt;
      particle.vy += particle.gravity * dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
    }

    state.particles = state.particles.filter((particle) => particle.life > 0);
  }

  function getPlayerBodyAt(x, y) {
    const p = state.player;
    return {
      x: x + p.width * 0.2,
      y: y + p.height * 0.2,
      width: p.width * 0.6,
      height: p.height * 0.74
    };
  }

  function getPotatoBody(potato) {
    return {
      x: potato.x + potato.width * 0.08,
      y: potato.y + potato.height * 0.08,
      width: potato.width * 0.84,
      height: potato.height * 0.88
    };
  }

  function makeSweptBody(previousX, previousY) {
    const before = getPlayerBodyAt(previousX, previousY);
    const after = getPlayerBodyAt(state.player.x, state.player.y);
    const left = Math.min(before.x, after.x);
    const top = Math.min(before.y, after.y);
    const right = Math.max(before.x + before.width, after.x + after.width);
    const bottom = Math.max(before.y + before.height, after.y + after.height);

    return {
      x: left,
      y: top,
      width: right - left,
      height: bottom - top
    };
  }

  function overlaps(a, b) {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  function handlePotatoCollisions(previousX, previousY) {
    const p = state.player;
    if (!p || p.invincibleTime > 0) return;

    const playerBody = makeSweptBody(previousX, previousY);

    for (const potato of state.potatoes) {
      if (potato.removed) continue;
      if (!overlaps(playerBody, getPotatoBody(potato))) continue;

      potato.removed = true;
      state.holes.push({ x: potato.x + potato.width / 2 });
      spawnDirtBurst(potato.x + potato.width / 2, STAGE_GROUND_Y - 2);

      loseLife(
        potato.type === "toxic"
          ? "독감자에 닿았어요!"
          : "욱감자에 부딪혔어요!"
      );

      return;
    }
  }

  function getMoveDirection() {
    if (input.joystickDirection !== 0) return input.joystickDirection;
    if (input.left === input.right) return 0;
    return input.left ? -1 : 1;
  }

  function update(dt) {
    if (!gameRunning || !state.player) return;

    const p = state.player;
    const waitingForGameOver = state.gameOverDelay > 0;

    if (!waitingForGameOver) {
      state.timeLeft -= dt;
      goalToastCooldown = Math.max(0, goalToastCooldown - dt);

      if (state.timeLeft <= 0) {
        state.timeLeft = 0;
        endGame(false, "제한 시간이 끝났어요.");
        return;
      }
    }

    if (state.toast) {
      state.toast.time -= dt;
      if (state.toast.time <= 0) state.toast = null;
    }

    state.lifePulseTime = Math.max(0, state.lifePulseTime - dt);
    updateParticles(dt);

    const previousHarvestTime = p.harvestTime;
    p.harvestTime = Math.max(0, p.harvestTime - dt);
    p.harvestCooldown = Math.max(0, p.harvestCooldown - dt);
    p.successPoseTime = Math.max(0, p.successPoseTime - dt);
    p.invincibleTime = Math.max(0, p.invincibleTime - dt);

    if (previousHarvestTime > 0 && p.harvestTime === 0 && p.successPoseQueued) {
      p.successPoseQueued = false;
      p.successPoseTime = 0.72;
    }

    if (waitingForGameOver) {
      state.gameOverDelay = Math.max(0, state.gameOverDelay - dt);
      p.moving = false;

      p.vy += p.gravity * dt;
      p.y += p.vy * dt;
      const floorY = STAGE_GROUND_Y - p.height + PLAYER_GROUND_SINK;
      if (p.y >= floorY) {
        p.y = floorY;
        p.vy = 0;
        p.onGround = true;
      }

      state.cameraX = Math.max(
        0,
        Math.min(WORLD_LENGTH - VISIBLE_WORLD_WIDTH, p.x - 390)
      );

      if (state.gameOverDelay <= 0) {
        endGame(false, state.pendingFailReason || "목숨을 모두 잃었어요.");
      }
      return;
    }

    const direction = p.harvestTime > 0 || p.successPoseTime > 0 ? 0 : getMoveDirection();
    const previousX = p.x;
    const previousY = p.y;

    p.moving = direction !== 0;

    if (direction !== 0) {
      p.facing = direction;

      // 지상에서는 기존 걷기 속도 그대로,
      // 점프 중에만 수평 이동량을 늘려 더 멀리 점프할 수 있게 함
      const moveMultiplier = p.onGround ? 1 : AIR_MOVE_MULTIPLIER;
      p.x += direction * p.speed * moveMultiplier * dt;

      p.walkClock += dt * 10;
    }

    p.x = Math.max(0, Math.min(WORLD_LENGTH, p.x));

    p.vy += p.gravity * dt;
    p.y += p.vy * dt;

    const floorY = STAGE_GROUND_Y - p.height + PLAYER_GROUND_SINK;
    if (p.y >= floorY) {
      p.y = floorY;
      p.vy = 0;
      p.onGround = true;
    }

    handlePotatoCollisions(previousX, previousY);
    if (!gameRunning) return;

    state.cameraX = Math.max(
      0,
      Math.min(WORLD_LENGTH - VISIBLE_WORLD_WIDTH, p.x - 390)
    );

    if (p.x >= WORLD_LENGTH - 20) {
      if (state.bagCount >= REQUIRED_POTATOES) {
        endGame(true);
        return;
      }

      p.x = WORLD_LENGTH - 22;
      if (goalToastCooldown <= 0) {
        const needed = REQUIRED_POTATOES - state.bagCount;
        showToast(`욱감자 ${needed}개를 더 캐야 해요!`, "", "hint", 1.8);
        goalToastCooldown = 1.9;
      }
    }
  }

  function drawImageFit(key, x, y, w, h) {
    if (imageReady(key)) ctx.drawImage(images[key], x, y, w, h);
  }

  function drawCroppedImage(key, crop, x, y, w, h) {
    if (!imageReady(key) || !crop || w <= 0 || h <= 0) return;

    const img = images[key];
    const sx = Math.max(0, Math.min(img.naturalWidth - 1, crop.x));
    const sy = Math.max(0, Math.min(img.naturalHeight - 1, crop.y));
    const sw = Math.max(1, Math.min(crop.w, img.naturalWidth - sx));
    const sh = Math.max(1, Math.min(crop.h, img.naturalHeight - sy));

    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  }

  function drawAutoCroppedContain(key, x, y, maxW, maxH, alignX = 0.5, alignY = 0.5) {
    if (!imageReady(key) || maxW <= 0 || maxH <= 0) {
      return { x, y, w: 0, h: 0 };
    }

    const crop = getAutoCrop(key);
    const ratio = crop.w / crop.h;

    let w = maxW;
    let h = w / ratio;

    if (h > maxH) {
      h = maxH;
      w = h * ratio;
    }

    const dx = x + (maxW - w) * alignX;
    const dy = y + (maxH - h) * alignY;

    drawCroppedImage(key, crop, dx, dy, w, h);
    return { x: dx, y: dy, w, h };
  }

  function getHorizontalCapRatio(key) {
    if (key === "toastGreen" || key === "toastYellow" || key === "toastRed") return 0.24;
    if (key === "progressBg") return 0.18;
    if (key === "progressFill") return 0.08;
    if (key === "hudPanel") return 0.16;
    return 0.12;
  }

  function drawHorizontal3Slice(key, crop, x, y, w, h) {
    if (!imageReady(key) || !crop || w <= 0 || h <= 0) return;

    const img = images[key];
    const sx = Math.max(0, Math.min(img.naturalWidth - 1, crop.x));
    const sy = Math.max(0, Math.min(img.naturalHeight - 1, crop.y));
    const sw = Math.max(1, Math.min(crop.w, img.naturalWidth - sx));
    const sh = Math.max(1, Math.min(crop.h, img.naturalHeight - sy));
    const srcCap = Math.max(1, Math.min(crop.cap ?? 0, Math.floor(sw / 2)));

    if (srcCap <= 1 || sw <= srcCap * 2) {
      drawCroppedImage(key, crop, x, y, w, h);
      return;
    }

    const naturalScale = h / sh;
    const destCap = Math.min(w / 2, Math.max(1, srcCap * naturalScale));
    const middleW = Math.max(0, w - destCap * 2);
    const middleSrcW = sw - srcCap * 2;

    ctx.drawImage(
      img,
      sx, sy, srcCap, sh,
      x, y, destCap, h
    );

    if (middleW > 0 && middleSrcW > 0) {
      ctx.drawImage(
        img,
        sx + srcCap, sy, middleSrcW, sh,
        x + destCap, y, middleW, h
      );
    }

    ctx.drawImage(
      img,
      sx + sw - srcCap, sy, srcCap, sh,
      x + w - destCap, y, destCap, h
    );
  }

  function getHeroImageKey() {
    const p = state.player;

    if (p.successPoseTime > 0) return SUCCESS_FRAME;

    if (p.harvestTime > 0) {
      const elapsed = p.harvestDuration - p.harvestTime;
      const progress = Math.max(0, Math.min(0.9999, elapsed / p.harvestDuration));
      return HARVEST_FRAMES[Math.floor(progress * HARVEST_FRAMES.length)];
    }

    if (!p.onGround) return WALK_FRAMES[1];
    if (!p.moving) return WALK_FRAMES[0];

    return WALK_FRAMES[Math.floor(p.walkClock) % WALK_FRAMES.length];
  }

  function drawHero(x, y, w, h) {
    const p = state.player;
    const key = getHeroImageKey();

    if (p.invincibleTime > 0 && Math.floor(p.invincibleTime * 14) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }

    ctx.save();
    if (p.facing < 0) {
      ctx.translate(x + w, y);
      ctx.scale(-1, 1);
      drawImageFit(key, 0, 0, w, h);
    } else {
      drawImageFit(key, x, y, w, h);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawField(box) {
  }

  function getHoleRect(cx, ground) {
    return {
      x: Math.round(cx - HOLE_WIDTH / 2),
      y: Math.round(ground - HOLE_TOP_OFFSET),
      w: HOLE_WIDTH,
      h: HOLE_HEIGHT
    };
  }

  function drawHoleBase(cx, ground) {
    const rect = getHoleRect(cx, ground);

    if (imageReady("holePixel")) {
      drawCroppedImage(
        "holePixel",
        getAutoCrop("holePixel"),
        rect.x,
        rect.y,
        rect.w,
        rect.h
      );
      return;
    }

    ctx.fillStyle = "#4a2d20";
    ctx.beginPath();
    ctx.ellipse(cx, ground + 2, 52, 16, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawHoleFront(cx, ground) {
    if (!imageReady("holePixel")) {
      ctx.fillStyle = "#a36839";
      ctx.beginPath();
      ctx.ellipse(cx, ground + 12, 48, 9, 0, 0, Math.PI);
      ctx.fill();
      return;
    }

    const rect = getHoleRect(cx, ground);
    const image = images.holePixel;
    const crop = getAutoCrop("holePixel");
    const frontY = Math.round(crop.y + crop.h * HOLE_FRONT_RATIO);
    const sourceHeight = crop.y + crop.h - frontY;
    const scaleY = rect.h / crop.h;

    ctx.drawImage(
      image,
      crop.x, frontY, crop.w, sourceHeight,
      rect.x,
      rect.y + (frontY - crop.y) * scaleY,
      rect.w,
      sourceHeight * scaleY
    );
  }

  function drawBuriedPotato(key, x, y, width, height, ground) {
    const visibleBottom = Math.min(
      y + height,
      ground + POTATO_VISIBLE_BOTTOM_OFFSET
    );

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, width, Math.max(0, visibleBottom - y));
    ctx.clip();
    drawImageFit(key, x, y, width, height);
    ctx.restore();
  }

  function drawHoles(box, ground) {
    for (const hole of state.holes) {
      const x = box.x + hole.x - state.cameraX;
      if (x < box.x - 50 || x > box.x + box.w + 50) continue;

      drawHoleBase(x, ground);
    }
  }

  function drawParticles(box) {
    for (const particle of state.particles) {
      const x = box.x + particle.x - state.cameraX;
      const y = box.y + particle.y;

      ctx.save();
      ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
      ctx.fillStyle = particle.color;
      ctx.fillRect(
        Math.round(x),
        Math.round(y),
        Math.max(2, particle.size),
        Math.max(2, particle.size * 0.75)
      );
      ctx.restore();
    }
  }

  function drawHud() {
    const x = UI.hud.x;
    const y = UI.hud.y;

    const panelH = 62;
    const gap = 9;

    const timeW = 164;
    const bagW = 170;
    const lifeW = 198;

    const bagX = x + timeW + gap;
    const lifeX = bagX + bagW + gap;

    const panelCrop = getAutoCrop(
      "hudPanel",
      getHorizontalCapRatio("hudPanel")
    );

    drawHorizontal3Slice(
      "hudPanel",
      panelCrop,
      x,
      y,
      timeW,
      panelH
    );

    drawAutoCroppedContain(
      "iconClock",
      x + 8,
      y + 8,
      46,
      46
    );

    ctx.fillStyle = "#3f2f25";
    ctx.font = `14px ${PIXEL_FONT}`;
    ctx.textBaseline = "middle";

    ctx.fillText(
      `${Math.ceil(state.timeLeft)}초`,
      x + 60,
      y + panelH / 2 + 1
    );

    drawHorizontal3Slice(
      "hudPanel",
      panelCrop,
      bagX,
      y,
      bagW,
      panelH
    );

    drawAutoCroppedContain(
      "iconBag",
      bagX + 7,
      y + 7,
      50,
      48
    );

    ctx.fillText(
      `${state.bagCount}/${REQUIRED_POTATOES}`,
      bagX + 63,
      y + panelH / 2 + 1
    );

    drawHorizontal3Slice(
      "hudPanel",
      panelCrop,
      lifeX,
      y,
      lifeW,
      panelH
    );

    for (let i = 0; i < MAX_LIVES; i += 1) {
      const key = i < state.lives ? "heartOn" : "heartOff";

      let size = 40;
      let offset = 0;

      if (i === state.lastLostLife && state.lifePulseTime > 0) {
        const phase = 1 - state.lifePulseTime / 0.82;
        const scale = Math.max(
          0.68,
          1 - phase * 0.25 +
          Math.sin(phase * Math.PI * 6) * 0.1
        );

        size = 40 * scale;
        offset = (40 - size) / 2;
      }

      drawAutoCroppedContain(
        key,
        lifeX + 21 + i * 51 + offset,
        y + 11 + offset,
        size,
        size
      );
    }

    ctx.textBaseline = "alphabetic";
  }

  function drawProgress() {
    const progress = Math.max(
      0,
      Math.min(1, state.player.x / WORLD_LENGTH)
    );

    const { x, y, w, h } = UI.progress;

    drawHorizontal3Slice(
      "progressBg",
      getAutoCrop(
        "progressBg",
        getHorizontalCapRatio("progressBg")
      ),
      x,
      y,
      w,
      h
    );

    const trackX = x + 44;
    const trackY = y + 33;
    const trackW = w - 88;
    const trackH = 20;

    const fillW = Math.max(
      0,
      Math.round(trackW * progress)
    );

    if (fillW > 0) {

      ctx.fillStyle = "#245f32";
      ctx.fillRect(
        trackX,
        trackY,
        fillW,
        trackH
      );

      if (fillW > 4) {
        ctx.fillStyle = "#65c84e";
        ctx.fillRect(
          trackX + 2,
          trackY + 2,
          Math.max(0, fillW - 4),
          trackH - 4
        );
      }

      if (fillW > 8) {
        ctx.fillStyle = "#b9ef65";
        ctx.fillRect(
          trackX + 4,
          trackY + 3,
          Math.max(0, fillW - 8),
          4
        );
      }
    }

    const markerX =
      trackX + trackW * progress;

    drawImageFit(
      "wook1",
      markerX - 18,
      y - 2,
      36,
      42
    );
  }

  function wrapText(text, maxWidth) {
    const lines = [];
    let line = "";

    for (const ch of text) {
      const test = line + ch;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = ch;
      } else {
        line = test;
      }
    }

    if (line) lines.push(line);
    return lines.slice(0, 2);
  }

  function drawToast() {
    if (!state.toast) return;

    const toast = state.toast;

    const elapsed = toast.maxTime - toast.time;
    const appear = Math.min(1, elapsed / 0.14);
    const disappear =
      toast.time < 0.16
        ? Math.max(0, toast.time / 0.16)
        : 1;

    const scale =
      Math.max(
        0.01,
        Math.min(appear, disappear)
      );

    const x = 390;
    const y = 150;
    const w = 500;
    const h = 96;

    const panelKey =
      toast.kind === "danger"
        ? "toastRed"
        : toast.kind === "hint"
          ? "toastYellow"
          : "toastGreen";

    ctx.save();

    ctx.translate(
      x + w / 2,
      y + h / 2
    );

    ctx.scale(scale, scale);

    ctx.translate(
      -(x + w / 2),
      -(y + h / 2)
    );

    drawHorizontal3Slice(
      panelKey,
      getAutoCrop(
        panelKey,
        getHorizontalCapRatio(panelKey)
      ),
      x,
      y,
      w,
      h
    );

    ctx.fillStyle = "#493428";
    ctx.font = `800 18px ${PIXEL_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const lines =
      wrapText(
        toast.text,
        w - 170
      );

    const startY =
      y + h / 2 -
      ((lines.length - 1) * 23) / 2;

    lines.forEach((line, index) => {
      ctx.fillText(
        line,
        x + w / 2 - 10,
        startY + index * 23
      );
    });

    if (toast.score) {
      ctx.fillStyle =
        toast.kind === "danger"
          ? "#c85252"
          : "#5f8f36";

      ctx.font = `900 22px ${PIXEL_FONT}`;

      ctx.fillText(
        toast.score,
        x + w - 48,
        y + h / 2
      );
    }

    ctx.restore();

    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
  }

  function drawStage() {
    const box = UI.stage;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(box.x + 4, box.y + 4, box.w - 8, box.h - 8, 20);
    ctx.clip();

    if (imageReady("background")) {
      ctx.drawImage(
        images.background,
        box.x,
        box.y + BACKGROUND_Y_OFFSET,
        box.w,
        box.h
      );
    } else {
      ctx.fillStyle = "#efddb7";
      ctx.fillRect(box.x, box.y, box.w, box.h);
    }

    const ground = box.y + STAGE_GROUND_Y;
    drawField(box);

    drawHoles(box, ground);

    for (const potato of state.potatoes) {
      if (potato.removed) continue;

      const screenX = box.x + potato.x - state.cameraX;
      const screenY = box.y + potato.y;
      if (screenX < box.x - 110 || screenX > box.x + box.w + 110) continue;

      const centerX = screenX + potato.width / 2;
      drawHoleBase(centerX, ground);
      drawBuriedPotato(
        potato.type === "normal" ? "normalPotato" : "toxicPotato",
        screenX,
        screenY,
        potato.width,
        potato.height,
        ground
      );
      drawHoleFront(centerX, ground);
    }

    drawParticles(box);

    const p = state.player;
    drawHero(
      box.x + p.x - state.cameraX,
      box.y + p.y,
      p.width,
      p.height
    );

    ctx.restore();

    drawHud();
    drawProgress();
  }

  function drawFrame() {
    ctx.fillStyle = "#eaf8ed";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#fffaf0";
    ctx.strokeStyle = "#79bf98";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(UI.frame.x, UI.frame.y, UI.frame.w, UI.frame.h, 28);
    ctx.fill();
    ctx.stroke();
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!state.player) resetState();
    drawFrame();
    drawStage();
    drawToast();
  }

  function gameLoop(now) {
    if (!gameRunning) {
      render();
      return;
    }

    const dt = Math.min((now - lastFrameTime) / 1000, 0.033);
    lastFrameTime = now;
    update(dt);
    render();

    if (gameRunning) requestAnimationFrame(gameLoop);
  }

  function setTutorialBadge(activeBadge) {
    const badges = [tutorialMoveBadge, tutorialJumpBadge, tutorialHarvestBadge];
    badges.forEach((badge) => badge?.classList.toggle("active", badge === activeBadge));
  }

  function getTutorialScene(time) {
    const playerSize = 108;
    const groundY = 215;
    let x = 56;
    let y = groundY - playerSize;
    let key = WALK_FRAMES[0];
    let activeBadge = null;
    let normalRemoved = false;

    if (time < 2.8) {
      key = WALK_FRAMES[0];
    } else if (time < 5.7) {
      const progress = (time - 2.8) / (5.7 - 2.8);
      x = 56 + 214 * progress;
      key = WALK_FRAMES[Math.floor(time * 7) % WALK_FRAMES.length];
      activeBadge = tutorialMoveBadge;
    } else if (time < 7.3) {
      const progress = (time - 5.7) / (7.3 - 5.7);
      x = 270 + 180 * progress;
      const jumpHeight = Math.sin(progress * Math.PI) * 118;
      y -= jumpHeight;
      key = WALK_FRAMES[1];
      activeBadge = tutorialJumpBadge;
    } else if (time < 9.5) {
      const progress = (time - 7.3) / (9.5 - 7.3);
      x = 450 + 100 * progress;
      key = WALK_FRAMES[Math.floor(time * 7) % WALK_FRAMES.length];
      activeBadge = tutorialMoveBadge;
    } else if (time < 10.35) {
      x = 550;
      const progress = (time - 9.5) / (10.35 - 9.5);
      key = HARVEST_FRAMES[Math.min(
        HARVEST_FRAMES.length - 1,
        Math.floor(progress * HARVEST_FRAMES.length)
      )];
      activeBadge = tutorialHarvestBadge;
      normalRemoved = progress > 0.64;
    } else {
      x = 550;
      key = SUCCESS_FRAME;
      activeBadge = tutorialHarvestBadge;
      normalRemoved = true;
    }

    return { x, y, key, playerSize, groundY, activeBadge, normalRemoved };
  }

  function drawTutorialImage(key, x, y, width, height, facing = 1) {
    if (!tutorialCtx) return;

    if (!imageReady(key)) {
      tutorialCtx.fillStyle = "#8a674e";
      tutorialCtx.fillRect(x, y, width, height);
      return;
    }

    tutorialCtx.save();
    tutorialCtx.imageSmoothingEnabled = false;
    if (facing < 0) {
      tutorialCtx.translate(x + width, y);
      tutorialCtx.scale(-1, 1);
      tutorialCtx.drawImage(images[key], 0, 0, width, height);
    } else {
      tutorialCtx.drawImage(images[key], x, y, width, height);
    }
    tutorialCtx.restore();
  }

  function drawTutorialBuriedPotato(key, x, y, size, groundY) {
    if (!tutorialCtx) return;

    const visibleBottom = Math.min(
      y + size,
      groundY + TUTORIAL_POTATO_VISIBLE_BOTTOM_OFFSET
    );

    tutorialCtx.save();
    tutorialCtx.beginPath();
    tutorialCtx.rect(x, y, size, Math.max(0, visibleBottom - y));
    tutorialCtx.clip();
    drawTutorialImage(key, x, y, size, size);
    tutorialCtx.restore();
  }

  function getTutorialHoleRect(centerX, groundY) {

    const width = 80;
    const height = 26;

    return {
      x: Math.round(centerX - width / 2),
      y: Math.round(groundY - 7),
      width,
      height
    };
  }

  function drawTutorialHoleBase(centerX, groundY) {
    if (!tutorialCtx) return;

    const rect = getTutorialHoleRect(centerX, groundY);
    if (imageReady("holePixel")) {
      const crop = getAutoCrop("holePixel");
      tutorialCtx.drawImage(
        images.holePixel,
        crop.x,
        crop.y,
        crop.w,
        crop.h,
        rect.x,
        rect.y,
        rect.width,
        rect.height
      );
      return;
    }

    tutorialCtx.fillStyle = "#4a2d20";
    tutorialCtx.beginPath();
    tutorialCtx.ellipse(centerX, groundY + 1, 40, 11, 0, 0, Math.PI * 2);
    tutorialCtx.fill();
  }

  function drawTutorialHoleFront(centerX, groundY) {
    if (!tutorialCtx) return;

    if (!imageReady("holePixel")) {
      tutorialCtx.fillStyle = "#a36839";
      tutorialCtx.beginPath();
      tutorialCtx.ellipse(centerX, groundY + 7, 37, 7, 0, 0, Math.PI);
      tutorialCtx.fill();
      return;
    }

    const rect = getTutorialHoleRect(centerX, groundY);
    const image = images.holePixel;
    const crop = getAutoCrop("holePixel");
    const frontY = Math.round(crop.y + crop.h * HOLE_FRONT_RATIO);
    const sourceHeight = crop.y + crop.h - frontY;
    const scaleY = rect.height / crop.h;

    tutorialCtx.drawImage(
      image,
      crop.x, frontY, crop.w, sourceHeight,
      rect.x,
      rect.y + (frontY - crop.y) * scaleY,
      rect.width,
      sourceHeight * scaleY
    );
  }

  function drawTutorialGround(width, height, groundY) {

  }

  function renderTutorial(time = 0) {
    if (!tutorialCtx || !tutorialCanvas) return;

    const width = tutorialCanvas.width;
    const height = tutorialCanvas.height;
    const scene = getTutorialScene(Math.max(0, Math.min(tutorial.duration, time)));

    tutorialCtx.clearRect(0, 0, width, height);
    tutorialCtx.imageSmoothingEnabled = false;

    if (imageReady("background")) {
      tutorialCtx.drawImage(
        images.background,
        0,
        BACKGROUND_Y_OFFSET * (height / UI.stage.h),
        width,
        height
      );
    } else {
      tutorialCtx.fillStyle = "#efddb7";
      tutorialCtx.fillRect(0, 0, width, height);
    }

    tutorialCtx.fillStyle = "rgba(255,248,232,.28)";
    tutorialCtx.fillRect(0, 0, width, height);

    drawTutorialGround(width, height, scene.groundY);

    const toxicX = 356;
    const normalX = 676;
    const potatoSize = 62;
    const potatoY = scene.groundY - potatoSize + 19;

    drawTutorialHoleBase(toxicX + potatoSize / 2, scene.groundY);
    drawTutorialBuriedPotato("toxicPotato", toxicX, potatoY, potatoSize, scene.groundY);
    drawTutorialHoleFront(toxicX + potatoSize / 2, scene.groundY);

    if (!scene.normalRemoved) {
      drawTutorialHoleBase(normalX + potatoSize / 2, scene.groundY);
      drawTutorialBuriedPotato("normalPotato", normalX, potatoY, potatoSize, scene.groundY);
      drawTutorialHoleFront(normalX + potatoSize / 2, scene.groundY);
    } else {
      drawTutorialHoleBase(normalX + potatoSize / 2, scene.groundY);
      const burstTime = Math.max(0, time - 10.03);
      if (burstTime < 0.75) {
        const amount = 10;
        for (let i = 0; i < amount; i += 1) {
          const angle = (i / amount) * Math.PI * 2;
          const distance = 12 + burstTime * 42;
          const px = normalX + potatoSize / 2 + Math.cos(angle) * distance;
          const py = scene.groundY - 4 + Math.sin(angle) * distance * 0.45 - burstTime * 26;
          tutorialCtx.fillStyle = i % 2 ? "#8c592e" : "#c18a4f";
          tutorialCtx.fillRect(px, py, 5, 4);
        }
      }
    }

    drawTutorialImage(scene.key, scene.x, scene.y, scene.playerSize, scene.playerSize);

    if (scene.normalRemoved) {
      tutorialCtx.fillStyle = "rgba(255,255,255,.86)";
      tutorialCtx.strokeStyle = "#4a3629";
      tutorialCtx.lineWidth = 2;
      tutorialCtx.beginPath();
      tutorialCtx.roundRect(610, 22, 118, 38, 14);
      tutorialCtx.fill();
      tutorialCtx.stroke();
      tutorialCtx.fillStyle = "#4a3629";
      tutorialCtx.font = `700 17px ${PIXEL_FONT}`;
      tutorialCtx.textAlign = "center";
      tutorialCtx.fillText("욱감자 +1", 669, 47);
      tutorialCtx.textAlign = "start";
    }

    setTutorialBadge(scene.activeBadge);
  }

  function getTutorialTime() {
    if (tutorial.soundStarted && !tutorialSound.paused) {
      return tutorialSound.currentTime;
    }
    return (performance.now() - tutorial.fallbackStartedAt) / 1000;
  }

  function tutorialLoop() {
    if (!tutorial.running) return;

    const time = getTutorialTime();
    renderTutorial(time);

    if (time >= tutorial.duration || tutorialSound.ended) {
      tutorial.running = false;
      tutorial.animationId = null;
      renderTutorial(tutorial.duration);
      return;
    }

    tutorial.animationId = requestAnimationFrame(tutorialLoop);
  }

  function stopTutorialDemo({ reset = false } = {}) {
    tutorial.running = false;
    if (tutorial.animationId !== null) {
      cancelAnimationFrame(tutorial.animationId);
      tutorial.animationId = null;
    }

    tutorialSound.pause();
    tutorial.soundStarted = false;

    if (reset) {
      tutorialSound.currentTime = 0;
      renderTutorial(0);
    }
  }

  function startTutorialDemo() {
    stopTutorialDemo({ reset: true });
    tutorial.running = true;
    tutorial.fallbackStartedAt = performance.now();

    const playPromise = tutorialSound.play();
    if (playPromise && typeof playPromise.then === "function") {
      playPromise
        .then(() => {
          tutorial.soundStarted = true;
        })
        .catch(() => {
          tutorial.soundStarted = false;
        });
    }

    tutorial.animationId = requestAnimationFrame(tutorialLoop);
  }

  function openTutorial() {
    stopBackgroundSound();
    howToOverlay.classList.add("show");
    startTutorialDemo();
  }

  function closeTutorial() {
    stopTutorialDemo({ reset: true });
    howToOverlay.classList.remove("show");
    if (gameRunning) playBackgroundSound();
  }

  function setButtonPressed(button, pressed) {
    if (button) button.classList.toggle("pressed", pressed);
  }

  function getActionButtonDistance(button, clientX, clientY) {
    if (!button) return Number.POSITIVE_INFINITY;

    const rect = button.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    return Math.hypot(
      clientX - centerX,
      clientY - centerY
    );
  }

  function getNearestActionButton(clientX, clientY) {
    const jumpDistance =
      getActionButtonDistance(
        jumpBtn,
        clientX,
        clientY
      );

    const harvestDistance =
      getActionButtonDistance(
        harvestBtn,
        clientX,
        clientY
      );

    return jumpDistance <= harvestDistance
      ? jumpBtn
      : harvestBtn;
  }

  function releaseActionButtons() {
    setButtonPressed(jumpBtn, false);
    setButtonPressed(harvestBtn, false);
  }

  function bindActionButton(button, action) {
    if (!button) return;

    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();

      const nearestButton =
        getNearestActionButton(
          event.clientX,
          event.clientY
        );

      releaseActionButtons();
      setButtonPressed(nearestButton, true);

      nearestButton?.setPointerCapture?.(
        event.pointerId
      );

      if (nearestButton === jumpBtn) {
        jump();
      }
      else if (nearestButton === harvestBtn) {
        harvest();
      }
      else {
        action();
      }
    });

    const release = (event) => {
      event.preventDefault();
      releaseActionButtons();
    };

    button.addEventListener(
      "pointerup",
      release
    );

    button.addEventListener(
      "pointercancel",
      release
    );

    button.addEventListener(
      "lostpointercapture",
      releaseActionButtons
    );
  }

  function updateJoystick(clientX) {
    const rect =
      joystickBase.getBoundingClientRect();

    const centerX =
      rect.left + rect.width / 2;

    const maxDistance =
      Math.min(
        joystick.maxDistance,
        rect.width * 0.30
      );

    const deltaX =
      Math.max(
        -maxDistance,
        Math.min(
          maxDistance,
          clientX - centerX
        )
      );

    const normalized =
      maxDistance === 0
        ? 0
        : deltaX / maxDistance;

    const direction =
      Math.abs(normalized) < 0.18
        ? 0
        : Math.sign(normalized);

    input.joystickDirection = direction;

    if (!joystickBase) return;

    joystickBase.classList.add(
      "joy-active"
    );

    if (direction === 0) {
      return;
    }

    const nextDirection =
      direction > 0
        ? "right"
        : "left";

    if (
      joystickBase.dataset.joyVisualDirection ===
      nextDirection
    ) {
      return;
    }

    joystickBase.dataset.joyVisualDirection =
      nextDirection;

    if (nextDirection === "right") {
      joystickBase.classList.add(
        "joy-right"
      );

      joystickBase.classList.remove(
        "joy-left"
      );
    }
    else {
      joystickBase.classList.add(
        "joy-left"
      );

      joystickBase.classList.remove(
        "joy-right"
      );
    }
  }

  if (joystickBase && joystickKnob) {
    joystickBase.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      joystick.active = true;
      joystick.pointerId = event.pointerId;
      joystickBase.setPointerCapture?.(event.pointerId);
      updateJoystick(event.clientX);
    });

    joystickBase.addEventListener("pointermove", (event) => {
      if (!joystick.active || event.pointerId !== joystick.pointerId) return;
      event.preventDefault();
      updateJoystick(event.clientX);
    });

    const releaseJoystick = (event) => {
      if (!joystick.active) return;
      if (event && joystick.pointerId !== null && event.pointerId !== joystick.pointerId) return;

      input.joystickDirection = 0;
      resetJoystickVisual();
    };

    joystickBase.addEventListener("pointerup", releaseJoystick);
    joystickBase.addEventListener("pointercancel", releaseJoystick);
    joystickBase.addEventListener("lostpointercapture", () => releaseJoystick());
  }

  bindActionButton(jumpBtn, jump);
  bindActionButton(harvestBtn, harvest);

  startBtn.addEventListener("click", startGame);
  howToBtn.addEventListener("click", openTutorial);
  replayTutorialBtn?.addEventListener("click", startTutorialDemo);
  closeHowToBtn.addEventListener("click", closeTutorial);

  document.getElementById("restartSuccessBtn").addEventListener("click", startGame);
  document.getElementById("restartFailBtn").addEventListener("click", startGame);
  document.getElementById("successLinkBtn").addEventListener("click", () => {
    window.open(SUCCESS_LINK, "_blank", "noopener");
  });

  document.addEventListener("keydown", (event) => {
    if (["ArrowLeft", "ArrowRight", "Space", "ControlLeft", "ControlRight"].includes(event.code)) {
      event.preventDefault();
    }

    if (event.code === "ArrowLeft") input.left = true;
    if (event.code === "ArrowRight") input.right = true;
    if (event.code === "Space" && !event.repeat) jump();
    if ((event.code === "ControlLeft" || event.code === "ControlRight") && !event.repeat) harvest();
  });

  document.addEventListener("keyup", (event) => {
    if (event.code === "ArrowLeft") input.left = false;
    if (event.code === "ArrowRight") input.right = false;
  });

  window.addEventListener("blur", resetInput);
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());

  window.__wookGameDebug = {
    build: BUILD_ID,
    getState: () => ({
      running: gameRunning,
      lives: state.lives,
      bagCount: state.bagCount,
      playerX: state.player?.x ?? null,
      playerY: state.player?.y ?? null,
      heroFrame: state.player ? getHeroImageKey() : null,
      pixelGroundReady: imageReady("groundPixel"),
      pixelMoundReady: imageReady("holePixel"),
      pixelHoleReady: imageReady("holePixel"),
      backgroundMusicPlaying: !backgroundSound.paused,
      remainingPotatoes: state.potatoes.filter((potato) => !potato.removed).length
    }),
    start: startGame,
    jump,
    harvest,
    render,
    setRight: (value) => {
      input.right = Boolean(value);
    },
    setLeft: (value) => {
      input.left = Boolean(value);
    },
    step: (seconds = 1 / 60) => update(seconds)
  };

  async function bootGame() {
    resetState();
    applyMobileControlSizes();
    loadImages();

    try {
      if (document.fonts) {
        await document.fonts.load('18px "Pixel"');
        await document.fonts.ready;
      }
    } catch (error) {
      console.warn(`[${BUILD_ID}] Pixel 폰트 로드 실패`, error);
    }

    render();
    renderTutorial(0);
  }

  bootGame();
})();
