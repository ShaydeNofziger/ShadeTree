/** Lightweight SVG pan + zoom via viewBox manipulation. Supports mouse wheel and touch pinch. */

export interface PanZoom {
  /** Call after re-rendering to fit the viewBox to actual content. */
  fitContent(): void;
  /** Reset to the fitted view (undo all pan/zoom). */
  resetView(): void;
  /** Remove all listeners. */
  destroy(): void;
}

export function initPanZoom(svg: SVGSVGElement): PanZoom {
  let vbX = 0;
  let vbY = 0;
  let vbW = 900;
  let vbH = 700;

  let fitVB = { x: 0, y: 0, w: 900, h: 700 };

  // Track active pointers for pan + pinch.
  const pointers = new Map<number, { x: number; y: number }>();

  // Prevent browser gestures on the SVG so we get raw touch events.
  svg.style.touchAction = "none";

  function apply() {
    svg.setAttribute("viewBox", `${vbX} ${vbY} ${vbW} ${vbH}`);
    const sky = svg.getElementById("sky-bg");
    if (sky) {
      sky.setAttribute("x", String(vbX));
      sky.setAttribute("y", String(vbY));
      sky.setAttribute("width", String(vbW));
      sky.setAttribute("height", String(vbH));
    }
  }

  function fitContent() {
    const bbox = svg.getBBox();
    const pad = 40;
    vbX = bbox.x - pad;
    vbY = bbox.y - pad;
    vbW = bbox.width + pad * 2;
    vbH = bbox.height + pad * 2;
    fitVB = { x: vbX, y: vbY, w: vbW, h: vbH };
    apply();
  }

  function resetView() {
    vbX = fitVB.x;
    vbY = fitVB.y;
    vbW = fitVB.w;
    vbH = fitVB.h;
    apply();
  }

  function centroid(): { x: number; y: number } {
    let sx = 0, sy = 0;
    for (const p of pointers.values()) { sx += p.x; sy += p.y; }
    const n = pointers.size || 1;
    return { x: sx / n, y: sy / n };
  }

  function pinchDist(): number {
    const pts = [...pointers.values()];
    if (pts.length < 2) return 0;
    const dx = pts[0]!.x - pts[1]!.x;
    const dy = pts[0]!.y - pts[1]!.y;
    return Math.hypot(dx, dy);
  }

  let lastCentroid = { x: 0, y: 0 };
  let lastDist = 0;

  function onWheel(e: WheelEvent) {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.1 : 1 / 1.1;
    zoomAt(e.clientX, e.clientY, factor);
  }

  function zoomAt(clientX: number, clientY: number, factor: number) {
    const rect = svg.getBoundingClientRect();
    const mx = (clientX - rect.left) / rect.width;
    const my = (clientY - rect.top) / rect.height;
    const newW = vbW * factor;
    const newH = vbH * factor;
    vbX += (vbW - newW) * mx;
    vbY += (vbH - newH) * my;
    vbW = newW;
    vbH = newH;
    apply();
  }

  function onPointerDown(e: PointerEvent) {
    // Don't start pan if the target is a leaf (let hover/tooltip work).
    const t = e.target as Element;
    if (t instanceof SVGCircleElement && t.classList.contains("leaf")) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    svg.setPointerCapture(e.pointerId);
    lastCentroid = centroid();
    lastDist = pinchDist();
    svg.style.cursor = "grabbing";
  }

  function onPointerMove(e: PointerEvent) {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const c = centroid();
    const rect = svg.getBoundingClientRect();

    // Pinch zoom (two fingers).
    if (pointers.size >= 2) {
      const dist = pinchDist();
      if (lastDist > 0 && dist > 0) {
        const factor = lastDist / dist;
        zoomAt(c.x, c.y, factor);
      }
      lastDist = dist;
    }

    // Pan (centroid movement).
    const dx = ((c.x - lastCentroid.x) / rect.width) * vbW;
    const dy = ((c.y - lastCentroid.y) / rect.height) * vbH;
    vbX -= dx;
    vbY -= dy;
    lastCentroid = c;
    apply();
  }

  function onPointerUp(e: PointerEvent) {
    pointers.delete(e.pointerId);
    if (pointers.size === 0) {
      svg.style.cursor = "";
    }
    // Recalculate baseline so remaining finger doesn't jump.
    lastCentroid = centroid();
    lastDist = pinchDist();
  }

  svg.addEventListener("wheel", onWheel, { passive: false });
  svg.addEventListener("pointerdown", onPointerDown);
  svg.addEventListener("pointermove", onPointerMove);
  svg.addEventListener("pointerup", onPointerUp);
  svg.addEventListener("pointercancel", onPointerUp);
  svg.addEventListener("pointerleave", onPointerUp);

  return {
    fitContent,
    resetView,
    destroy() {
      svg.removeEventListener("wheel", onWheel);
      svg.removeEventListener("pointerdown", onPointerDown);
      svg.removeEventListener("pointermove", onPointerMove);
      svg.removeEventListener("pointerup", onPointerUp);
      svg.removeEventListener("pointercancel", onPointerUp);
      svg.removeEventListener("pointerleave", onPointerUp);
    },
  };
}
