import React, { useEffect, useRef } from 'react';

interface GridNode {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
  isFixed: boolean;
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  speed: number;
  strength: number;
  width: number;
}

interface GridState {
  width: number;
  height: number;
  mouseX: number;
  mouseY: number;
  targetMouseX: number;
  targetMouseY: number;
  isHovered: boolean;
  hoverAlpha: number;
  nodes: GridNode[][];
  ripples: Ripple[];
  lastTouchTime: number;
}

export const AmbientGridBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<GridState>({
    width: 0,
    height: 0,
    mouseX: 0,
    mouseY: 0,
    targetMouseX: 0,
    targetMouseY: 0,
    isHovered: false,
    hoverAlpha: 0,
    nodes: [],
    ripples: [],
    lastTouchTime: 0,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let animationId: number;

    // ─── TUNABLE CONSTANTS ────────────────────────────────────────────────────
    const GRID_SPACING = 32;        // px between grid nodes
    const SPRING_K = 0.045;         // spring stiffness (how fast nodes snap back)
    const DAMPING = 0.86;           // velocity damping (friction)
    const isMobile = window.innerWidth < 768;
    const MOUSE_RADIUS = isMobile ? 95 : 160;  // cursor influence radius (px)
    const PUSH_FORCE = isMobile ? 12 : 18;     // repulsion strength
    // ─────────────────────────────────────────────────────────────────────────

    // ─── GRID COLOR (Light background contrast) ──────────────────────────────
    const GRID_COLOR = (alpha: number) => `rgba(15, 23, 42, ${alpha.toFixed(4)})`;
    // ─────────────────────────────────────────────────────────────────────────

    const initGrid = (w: number, h: number) => {
      const state = stateRef.current;
      state.width = w;
      state.height = h;

      const cols = Math.ceil(w / GRID_SPACING) + 2;
      const rows = Math.ceil(h / GRID_SPACING) + 2;
      const nodes: GridNode[][] = [];

      for (let r = 0; r < rows; r++) {
        const rowNodes: GridNode[] = [];
        for (let c = 0; c < cols; c++) {
          const baseX = (c - 0.5) * GRID_SPACING;
          const baseY = (r - 0.5) * GRID_SPACING;
          rowNodes.push({
            x: baseX,
            y: baseY,
            baseX,
            baseY,
            vx: 0,
            vy: 0,
            // Edge nodes are anchored so the grid border stays aligned
            isFixed: r === 0 || r === rows - 1 || c === 0 || c === cols - 1,
          });
        }
        nodes.push(rowNodes);
      }
      state.nodes = nodes;
    };

    const resizeCanvas = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initGrid(canvas.width, canvas.height);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const state = stateRef.current;
      if (Date.now() - state.lastTouchTime < 1000) return; // ignore ghost events
      if (e.clientX === 0 && e.clientY === 0) return;      // ignore scroll dummy
      state.targetMouseX = e.clientX;
      state.targetMouseY = e.clientY;
      state.isHovered = true;
    };

    const handleMouseLeave = () => {
      stateRef.current.isHovered = false;
    };

    const handleWindowClick = (e: MouseEvent) => {
      stateRef.current.ripples.push({
        x: e.clientX,
        y: e.clientY,
        radius: 0,
        maxRadius: Math.max(window.innerWidth, window.innerHeight) * 0.85,
        speed: 12,
        strength: 28,
        width: 60,
      });
    };

    const updatePhysics = () => {
      const state = stateRef.current;
      const { nodes, ripples, isHovered } = state;

      // Smoothly track mouse with easing
      state.mouseX += (state.targetMouseX - state.mouseX) * 0.15;
      state.mouseY += (state.targetMouseY - state.mouseY) * 0.15;

      // Fade hover alpha in/out
      const targetA = isHovered ? 1 : 0;
      state.hoverAlpha += (targetA - state.hoverAlpha) * 0.08;

      // Advance ripples, remove expired ones
      state.ripples = ripples.filter((rip) => {
        rip.radius += rip.speed;
        return rip.radius < rip.maxRadius;
      });

      if (nodes.length === 0) return;
      const rows = nodes.length;
      const cols = nodes[0].length;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const n = nodes[r][c];
          if (n.isFixed) continue;

          // 1️⃣ Mouse repulsion
          if (state.hoverAlpha > 0.01) {
            const dx = n.x - state.mouseX;
            const dy = n.y - state.mouseY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < MOUSE_RADIUS && dist > 0.1) {
              const influence = (MOUSE_RADIUS - dist) / MOUSE_RADIUS;
              const force = influence * influence * PUSH_FORCE * state.hoverAlpha;
              n.vx += (dx / dist) * force;
              n.vy += (dy / dist) * force;
            }
          }

          // 2️⃣ Ripple shockwave
          for (const rip of state.ripples) {
            const rdx = n.x - rip.x;
            const rdy = n.y - rip.y;
            const rdist = Math.sqrt(rdx * rdx + rdy * rdy);
            if (rdist > 0.1) {
              const diff = Math.abs(rdist - rip.radius);
              if (diff < rip.width) {
                const ageFactor = 1 - rip.radius / rip.maxRadius;
                const force = (1 - diff / rip.width) * rip.strength * ageFactor;
                n.vx += (rdx / rdist) * force;
                n.vy += (rdy / rdist) * force;
              }
            }
          }

          // 3️⃣ Spring return to rest position
          n.vx += (n.baseX - n.x) * SPRING_K;
          n.vy += (n.baseY - n.y) * SPRING_K;

          // 4️⃣ Dampen and apply
          n.vx *= DAMPING;
          n.vy *= DAMPING;
          n.x += n.vx;
          n.y += n.vy;
        }
      }
    };

    const draw = () => {
      const state = stateRef.current;
      const { nodes, width, height, hoverAlpha, mouseX, mouseY } = state;
      if (nodes.length === 0) return;

      ctx.clearRect(0, 0, width, height);
      ctx.lineWidth = 1;

      const rows = nodes.length;
      const cols = nodes[0].length;

      // Draw grid lines
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const n = nodes[r][c];

          // Horizontal line
          if (c < cols - 1) {
            const nextH = nodes[r][c + 1];
            const avgY = (n.y + nextH.y) / 2;
            const avgX = (n.x + nextH.x) / 2;
            const distToMouse = Math.sqrt((avgX - mouseX) ** 2 + (avgY - mouseY) ** 2);

            // Tuned base alpha for clean light background
            const baseAlpha = Math.max(0.02, 0.12 * (1 - avgY / (height * 0.88)));
            const glowAlpha =
              hoverAlpha > 0.01 && distToMouse < MOUSE_RADIUS
                ? 0.32 * (1 - distToMouse / MOUSE_RADIUS) * hoverAlpha
                : 0;

            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(nextH.x, nextH.y);
            ctx.strokeStyle = GRID_COLOR(baseAlpha + glowAlpha);
            ctx.stroke();
          }

          // Vertical line
          if (r < rows - 1) {
            const nextV = nodes[r + 1][c];
            const avgY = (n.y + nextV.y) / 2;
            const avgX = (n.x + nextV.x) / 2;
            const distToMouse = Math.sqrt((avgX - mouseX) ** 2 + (avgY - mouseY) ** 2);

            const baseAlpha = Math.max(0.02, 0.12 * (1 - avgY / (height * 0.88)));
            const glowAlpha =
              hoverAlpha > 0.01 && distToMouse < MOUSE_RADIUS
                ? 0.32 * (1 - distToMouse / MOUSE_RADIUS) * hoverAlpha
                : 0;

            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(nextV.x, nextV.y);
            ctx.strokeStyle = GRID_COLOR(baseAlpha + glowAlpha);
            ctx.stroke();
          }
        }
      }

      // Draw intersection dots
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const n = nodes[r][c];
          if (n.isFixed) continue;

          const distToMouse = Math.sqrt((n.x - mouseX) ** 2 + (n.y - mouseY) ** 2);
          const baseAlpha = Math.max(0.015, 0.09 * (1 - n.y / (height * 0.88)));
          let glowAlpha = 0;
          let pointSize = 1.3;

          if (hoverAlpha > 0.01 && distToMouse < MOUSE_RADIUS) {
            const factor = 1 - distToMouse / MOUSE_RADIUS;
            glowAlpha = 0.4 * factor * hoverAlpha;
            pointSize = 1.3 + 1.8 * factor;
          }

          const alpha = baseAlpha + glowAlpha;
          if (alpha > 0.01) {
            ctx.beginPath();
            ctx.arc(n.x, n.y, pointSize, 0, Math.PI * 2);
            ctx.fillStyle = GRID_COLOR(alpha);
            ctx.fill();
          }
        }
      }
    };

    const loop = () => {
      updatePhysics();
      draw();
      animationId = requestAnimationFrame(loop);
    };

    // Touch handlers
    const handleTouchStart = (e: TouchEvent) => {
      if (!e.touches.length) return;
      const state = stateRef.current;
      state.lastTouchTime = Date.now();
      state.targetMouseX = e.touches[0].clientX;
      state.targetMouseY = e.touches[0].clientY;
      state.isHovered = true;
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (!e.touches.length) return;
      const state = stateRef.current;
      state.lastTouchTime = Date.now();
      state.targetMouseX = e.touches[0].clientX;
      state.targetMouseY = e.touches[0].clientY;
      state.isHovered = true;
    };
    const handleTouchEnd = () => {
      const state = stateRef.current;
      state.lastTouchTime = Date.now();
      state.isHovered = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('click', handleWindowClick);
    window.addEventListener('resize', resizeCanvas);

    resizeCanvas();
    loop();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('click', handleWindowClick);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return <canvas ref={canvasRef} className="ambient-grid-background" />;
};

export default AmbientGridBackground;
