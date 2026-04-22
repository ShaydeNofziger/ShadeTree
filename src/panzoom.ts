/** Lightweight SVG pan + zoom via viewBox manipulation. */

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
  let dragging = false;
  let startX = 0;
  let startY = 0;

  let fitVB = { x: 0, y: 0, w: 900, h: 700 };

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

  function onWheel(e: WheelEvent) {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.1 : 1 / 1.1;
    // Zoom toward cursor position in SVG space.
    const rect = svg.getBoundingClientRect();
    const mx = (e.clientX - rect.left) / rect.width;
    const my = (e.clientY - rect.top) / rect.height;
    const newW = vbW * factor;
    const newH = vbH * factor;
    vbX += (vbW - newW) * mx;
    vbY += (vbH - newH) * my;
    vbW = newW;
    vbH = newH;
    apply();
  }

  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0) return;
    // Don't start pan if the target is a leaf (let hover work).
    const t = e.target as Element;
    if (t instanceof SVGCircleElement && t.classList.contains("leaf")) return;
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    svg.setPointerCapture(e.pointerId);
    svg.style.cursor = "grabbing";
  }

  function onPointerMove(e: PointerEvent) {
    if (!dragging) return;
    const rect = svg.getBoundingClientRect();
    const dx = ((e.clientX - startX) / rect.width) * vbW;
    const dy = ((e.clientY - startY) / rect.height) * vbH;
    vbX -= dx;
    vbY -= dy;
    startX = e.clientX;
    startY = e.clientY;
    apply();
  }

  function onPointerUp() {
    dragging = false;
    svg.style.cursor = "";
  }

  svg.addEventListener("wheel", onWheel, { passive: false });
  svg.addEventListener("pointerdown", onPointerDown);
  svg.addEventListener("pointermove", onPointerMove);
  svg.addEventListener("pointerup", onPointerUp);
  svg.addEventListener("pointerleave", onPointerUp);

  return {
    fitContent,
    resetView,
    destroy() {
      svg.removeEventListener("wheel", onWheel);
      svg.removeEventListener("pointerdown", onPointerDown);
      svg.removeEventListener("pointermove", onPointerMove);
      svg.removeEventListener("pointerup", onPointerUp);
      svg.removeEventListener("pointerleave", onPointerUp);
    },
  };
}
