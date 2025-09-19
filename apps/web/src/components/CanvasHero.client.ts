/*
  Canvas mood board hero: fullscreen, DPR-aware, pan/zoom, hover + click.
  No animation loop; redraw on demand only.
*/

type Sprite = {
  x: number; // world coords (center)
  y: number;
  w: number; // intrinsic image size (css pixels)
  h: number;
  rotation: number; // radians
  href: string;
  title: string;
  image: HTMLImageElement;
  loaded: boolean;
  alpha: number; // 0..1 for fade-in
  fadeStart: number; // ms timestamp when fade should start
  fadeDuration: number; // ms duration
};

(() => {
  const canvas = document.getElementById(
    "ui-canvas"
  ) as HTMLCanvasElement | null;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  // Device pixel ratio scaling (cap at 2)
  const getDpr = () => Math.min(Math.max(window.devicePixelRatio || 1, 1), 2);
  let dpr = getDpr();

  // View state
  let cssWidth = 0;
  let cssHeight = 0;
  let centerX = 0; // viewport center in CSS pixels
  let centerY = 0;
  let zoom = 1; // logical zoom
  const MIN_ZOOM = 0.4;
  const MAX_ZOOM = 2.5;
  let panX = 0; // screen-space pan in CSS pixels
  let panY = 0;

  // Interaction state
  let isPanning = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let panStartX = 0;
  let panStartY = 0;
  let pointerDownOn: Sprite | null = null;
  let pointerDownAt: { x: number; y: number } | null = null;
  // Per-sprite drag state
  let draggingSprite: Sprite | null = null;
  let dragSpriteStartWorld = { x: 0, y: 0 };

  // Multi-pointer support for pinch zoom
  type PointerInfo = { id: number; x: number; y: number };
  const activePointers = new Map<number, PointerInfo>();
  let pinchStartDistance = 0;
  let pinchStartZoom = 1;
  let pinchAnchorScreen = { x: 0, y: 0 };

  // Sprites
  const sprites: Sprite[] = [];
  const placeholders = (() => {
    const sizePresets = [
      { w: 300, h: 180 },
      { w: 150, h: 150 },
      { w: 240, h: 100 },
      { w: 180, h: 140 },
      { w: 220, h: 120 },
      { w: 160, h: 200 },
      { w: 210, h: 130 },
      { w: 170, h: 100 },
      { w: 200, h: 160 },
      { w: 140, h: 180 },
    ];
    const arr: {
      w: number;
      h: number;
      label: string;
      href: string;
      title: string;
    }[] = [];
    const total = 20;
    for (let i = 1; i <= total; i++) {
      const sz = sizePresets[(i - 1) % sizePresets.length];
      arr.push({
        w: sz.w,
        h: sz.h,
        label: String(i),
        href: `/docs/demo${i}`,
        title: `Demo ${i}`,
      });
    }
    return arr;
  })();

  // Persisted randomized positions for current page load
  let positions: { x: number; y: number; rotation: number }[] = [];

  positions = [
    {
      x: 549,
      y: 6,
      rotation: -0.0587,
    },
    {
      x: 997,
      y: 250,
      rotation: 0.0098,
    },
    {
      x: 707,
      y: 335,
      rotation: 0.0107,
    },
    {
      x: -731,
      y: 319,
      rotation: -0.0936,
    },
    {
      x: 608,
      y: 164,
      rotation: 0.0636,
    },
    {
      x: 731,
      y: -152,
      rotation: 0.0504,
    },
    {
      x: -496,
      y: 493,
      rotation: -0.0612,
    },
    {
      x: 746,
      y: 75,
      rotation: -0.0223,
    },
    {
      x: 623,
      y: -549,
      rotation: 0.0814,
    },
    {
      x: -689,
      y: 178,
      rotation: -0.0383,
    },
    {
      x: -456,
      y: 263,
      rotation: -0.0929,
    },
    {
      x: -650,
      y: -38,
      rotation: -0.0536,
    },
    {
      x: 111,
      y: 191,
      rotation: -0.0138,
    },
    {
      x: 1042,
      y: -470,
      rotation: 0.0727,
    },
    {
      x: 217,
      y: 315,
      rotation: -0.0378,
    },
    {
      x: -62,
      y: -539,
      rotation: 0.0395,
    },
    {
      x: -24,
      y: 321,
      rotation: 0.093,
    },
    {
      x: -557,
      y: 88,
      rotation: -0.063,
    },
    {
      x: -728,
      y: -305,
      rotation: 0.0488,
    },
    {
      x: 801,
      y: -365,
      rotation: -0.0949,
    },
  ];

  function generateRandomPositions(viewW: number, viewH: number) {
    // Distribute across a rectangle area scaled by viewport size, with subtle rotations
    const spreadX = Math.max(600, viewW * 1.2);
    const spreadY = Math.max(400, viewH * 1.2);
    positions = new Array(placeholders.length);
    for (let i = 0; i < placeholders.length; i++) {
      const x = (Math.random() - 0.5) * spreadX;
      const y = (Math.random() - 0.5) * spreadY;
      const rotation = (Math.random() * 12 - 6) * (Math.PI / 180);
      positions[i] = { x, y, rotation };
    }
  }
  function applyPositionsToSprites() {
    for (let i = 0; i < sprites.length; i++) {
      const pos = positions[i];
      if (!pos) continue;
      const s = sprites[i];
      s.x = pos.x;
      s.y = pos.y;
      s.rotation = pos.rotation;
    }
  }

  function logAllSpritePositions() {
    const out = sprites.map((s) => ({
      x: Math.round(s.x),
      y: Math.round(s.y),
      rotation: +s.rotation.toFixed(4),
    }));
    console.log("positions:", out);
  }

  let needsInitialLayout = true;
  function createSprites() {
    for (const p of placeholders) {
      const img = new Image();
      img.decoding = "async";
      img.src = `https://placehold.co/${p.w}x${p.h}?text=${encodeURIComponent(p.label)}`;
      const sprite: Sprite = {
        x: 0,
        y: 0,
        w: p.w,
        h: p.h,
        rotation: 0,
        href: p.href,
        title: p.title,
        image: img,
        loaded: false,
        alpha: prefersReducedMotion ? 1 : 0,
        fadeStart: 0,
        fadeDuration: 450 + Math.random() * 400,
      };
      sprites.push(sprite);
      img.addEventListener("load", () => {
        sprite.loaded = true;
        if (!prefersReducedMotion) {
          // Randomized stagger start time from now
          sprite.fadeStart = performance.now() + Math.random() * 500;
          ensureAnimating();
        } else {
          sprite.alpha = 1;
          draw();
        }
      });
      img.addEventListener("error", () => {
        // Still draw placeholder rect if image fails
        sprite.loaded = false;
        draw();
      });
    }
    needsInitialLayout = true;
    if (!prefersReducedMotion) {
      const now = performance.now();
      for (const s of sprites) {
        s.fadeStart = now + Math.random() * 500;
      }
      ensureAnimating();
    }
  }

  function resizeCanvas() {
    const { clientWidth, clientHeight } = canvas;
    cssWidth = clientWidth;
    cssHeight = clientHeight;
    centerX = cssWidth / 2;
    centerY = cssHeight / 2;
    const nextDpr = getDpr();
    if (nextDpr !== dpr) {
      dpr = nextDpr;
    }
    canvas.width = Math.max(1, Math.floor(cssWidth * dpr));
    canvas.height = Math.max(1, Math.floor(cssHeight * dpr));
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    if (needsInitialLayout) {
      if (!positions.length) generateRandomPositions(cssWidth, cssHeight);
      console.log({ positions });
      applyPositionsToSprites();
      needsInitialLayout = false;
    }
    console.log({ positions });
    draw();
  }

  function worldFromScreen(screenX: number, screenY: number) {
    const sx = screenX - centerX;
    const sy = screenY - centerY;
    return {
      x: (sx - panX) / zoom,
      y: (sy - panY) / zoom,
    };
  }

  function clampZoom(z: number) {
    return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
  }

  function setZoomAtScreenPoint(
    newZoom: number,
    screenX: number,
    screenY: number
  ) {
    newZoom = clampZoom(newZoom);
    const sx = screenX - centerX;
    const sy = screenY - centerY;
    const k = newZoom / zoom;
    // Keep world point under cursor stationary on screen
    panX = sx - (sx - panX) * k;
    panY = sy - (sy - panY) * k;
    zoom = newZoom;
    draw();
  }

  // Hook up zoom controls
  function setupControls() {
    const zoomIn = document.getElementById(
      "zoom-in"
    ) as HTMLButtonElement | null;
    const zoomOut = document.getElementById(
      "zoom-out"
    ) as HTMLButtonElement | null;
    if (!zoomIn || !zoomOut) return;
    const step = 1.15;
    zoomIn.addEventListener("click", () => {
      const target = clampZoom(zoom * step);
      setZoomAtScreenPoint(target, centerX, centerY);
    });
    zoomOut.addEventListener("click", () => {
      const target = clampZoom(zoom / step);
      setZoomAtScreenPoint(target, centerX, centerY);
    });
  }

  function draw() {
    // Clear in CSS pixel space (ctx is already scaled by DPR)
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    // Optional background (transparent by default)
    // ctx.fillStyle = getComputedStyle(document.body).backgroundColor || '#fff';
    // ctx.fillRect(0, 0, cssWidth, cssHeight);

    ctx.save();
    ctx.translate(centerX + panX, centerY + panY);
    ctx.scale(zoom, zoom);

    // Draw sprites (base order; last items considered visually on top for hit-test)
    for (const s of sprites) {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rotation);
      const ox = -s.w / 2;
      const oy = -s.h / 2;
      const alpha = s.alpha ?? 1;
      const prevAlpha = ctx.globalAlpha;
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      if (s.loaded) {
        ctx.drawImage(s.image, ox, oy, s.w, s.h);
      } else {
        ctx.fillStyle = "#e2e8f0";
        ctx.fillRect(ox, oy, s.w, s.h);
        ctx.strokeStyle = "#94a3b8";
        ctx.strokeRect(ox, oy, s.w, s.h);
      }
      // Label (always draw for clarity)
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.font =
        "bold 14px system-ui, -apple-system, Segoe UI, Roboto, Inter, sans-serif";
      ctx.textBaseline = "top";
      ctx.fillText(s.title, ox + 8, oy + 8);
      ctx.globalAlpha = prevAlpha;
      ctx.restore();
    }

    ctx.restore();

    // Optional vignette or UI could be drawn here
  }

  // Lightweight animation for fade-in only; not a continuous loop otherwise
  let animating = false;
  function ensureAnimating() {
    if (animating) return;
    animating = true;
    requestAnimationFrame(tick);
  }
  function tick(now: number) {
    let needsAnotherFrame = false;
    let anyChange = false;
    if (!prefersReducedMotion) {
      for (const s of sprites) {
        if (s.alpha >= 1) continue;
        const t = (now - s.fadeStart) / s.fadeDuration;
        const next = Math.max(0, Math.min(1, t));
        if (next < 1) needsAnotherFrame = true;
        if (next !== s.alpha) {
          s.alpha = next;
          anyChange = true;
        }
      }
    }
    if (anyChange) draw();
    if (needsAnotherFrame) {
      requestAnimationFrame(tick);
    } else {
      animating = false;
    }
  }

  function spriteHitTest(screenX: number, screenY: number): Sprite | null {
    const world = worldFromScreen(screenX, screenY);
    // Iterate top-to-bottom (reverse draw order)
    for (let i = sprites.length - 1; i >= 0; i--) {
      const s = sprites[i];
      const halfW = s.w / 2;
      const halfH = s.h / 2;
      // Approximate AABB ignoring rotation
      if (
        world.x >= s.x - halfW &&
        world.x <= s.x + halfW &&
        world.y >= s.y - halfH &&
        world.y <= s.y + halfH
      ) {
        return s;
      }
    }
    return null;
  }

  let hovered: Sprite | null = null;
  function updateHover(screenX: number, screenY: number) {
    const h = spriteHitTest(screenX, screenY);
    if (h !== hovered) {
      hovered = h;
      canvas.style.cursor = hovered
        ? "grab"
        : draggingSprite
          ? "grabbing"
          : "auto";
      draw();
    }
  }

  // Pointer handlers
  canvas.addEventListener("pointerdown", (ev) => {
    canvas.setPointerCapture(ev.pointerId);
    activePointers.set(ev.pointerId, {
      id: ev.pointerId,
      x: ev.clientX,
      y: ev.clientY,
    });

    if (activePointers.size === 1) {
      // Single pointer: only allow sprite drag, no background panning
      pointerDownOn = spriteHitTest(ev.clientX, ev.clientY);
      pointerDownAt = { x: ev.clientX, y: ev.clientY };
      if (pointerDownOn) {
        draggingSprite = pointerDownOn;
        dragSpriteStartWorld = { x: draggingSprite.x, y: draggingSprite.y };
        canvas.style.cursor = "grabbing";
      }
    } else if (activePointers.size === 2) {
      // Begin pinch
      const pts = Array.from(activePointers.values());
      pinchStartDistance = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      pinchStartZoom = zoom;
      pinchAnchorScreen = {
        x: (pts[0].x + pts[1].x) / 2,
        y: (pts[0].y + pts[1].y) / 2,
      };
    }
  });

  canvas.addEventListener("pointermove", (ev) => {
    const info = activePointers.get(ev.pointerId);
    if (info) {
      info.x = ev.clientX;
      info.y = ev.clientY;
      activePointers.set(ev.pointerId, info);
    }

    if (activePointers.size >= 2) {
      // Pinch zoom
      const pts = Array.from(activePointers.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (pinchStartDistance > 0) {
        const factor = dist / pinchStartDistance;
        const targetZoom = clampZoom(pinchStartZoom * factor);
        setZoomAtScreenPoint(
          targetZoom,
          pinchAnchorScreen.x,
          pinchAnchorScreen.y
        );
      }
      return;
    }

    if (draggingSprite) {
      // Move sprite in world space based on screen delta translated to world units
      const down = pointerDownAt!;
      const dxScreen = ev.clientX - down.x;
      const dyScreen = ev.clientY - down.y;
      const dxWorld = dxScreen / zoom;
      const dyWorld = dyScreen / zoom;
      draggingSprite.x = dragSpriteStartWorld.x + dxWorld;
      draggingSprite.y = dragSpriteStartWorld.y + dyWorld;
      draw();
    } else {
      updateHover(ev.clientX, ev.clientY);
    }
  });

  function endPointer(ev: PointerEvent) {
    activePointers.delete(ev.pointerId);
    if (activePointers.size < 2) {
      pinchStartDistance = 0;
    }

    if (draggingSprite && activePointers.size === 0) {
      // End sprite drag
      draggingSprite = null;
      canvas.style.cursor = hovered ? "grab" : "auto";
      // Log all sprite positions after user finishes dragging any item
      logAllSpritePositions();
    } else if (isPanning && activePointers.size === 0) {
      isPanning = false;
      canvas.style.cursor = hovered ? "grab" : "auto";
    }

    // Click detection: if pointer down/up over same sprite with small movement
    if (pointerDownAt) {
      const moved = Math.hypot(
        ev.clientX - pointerDownAt.x,
        ev.clientY - pointerDownAt.y
      );
      if (moved < 6 && !draggingSprite) {
        const upOn = spriteHitTest(ev.clientX, ev.clientY);
        if (upOn && upOn === pointerDownOn) {
          try {
            window.open(upOn.href, "_blank", "noopener");
          } catch {
            location.href = upOn.href;
          }
        }
      }
    }
    pointerDownOn = null;
    pointerDownAt = null;
  }

  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", endPointer);
  canvas.addEventListener("lostpointercapture", endPointer as any);

  // Wheel zoom (at cursor)
  canvas.addEventListener(
    "wheel",
    (ev) => {
      // Scroll gestures pan; pinch-zoom (ctrlKey) zooms at cursor
      ev.preventDefault();
      if (ev.ctrlKey) {
        const delta = ev.deltaY;
        const scaleFactor = Math.exp(-delta * 0.0015);
        const targetZoom = clampZoom(zoom * scaleFactor);
        setZoomAtScreenPoint(targetZoom, ev.clientX, ev.clientY);
      } else {
        panX -= ev.deltaX;
        panY -= ev.deltaY;
        draw();
      }
    },
    { passive: false }
  );

  // Resize handling
  const ro = new ResizeObserver(() => resizeCanvas());
  ro.observe(canvas);
  window.addEventListener("resize", resizeCanvas);

  // Init
  createSprites();
  resizeCanvas();
  setupControls();
  if (!prefersReducedMotion) {
    // No animation loop by spec; single draw already done in resize & image loads
  }

  // Initial hover state if mouse is already over the canvas
  window.requestAnimationFrame(() => {
    // Use last known mouse position if accessible
    // Fallback: set default cursor
    canvas.style.cursor = "auto";
  });
})();
