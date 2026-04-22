import type { Discipline, Jump } from "./types.ts";
import { hashString, mulberry32, seasonColor, seasonOf } from "./util.ts";

const SVG_NS = "http://www.w3.org/2000/svg";

const DISCIPLINE_LABEL: Record<Discipline, string> = {
  belly: "Belly",
  freefly: "Freefly",
  swoop: "Swoop",
  wingsuit: "Wingsuit",
  tracking: "Tracking",
  "hop-pop": "Hop & Pop",
  student: "Student",
  coach: "Coach",
  aff: "AFF Instr.",
  "tandem-instructor": "Tandem Instr.",
  "tandem-student": "Tandem Student",
};

// Ordered by career arc: student → teaching → flat flying → angles/speed → canopy.
const DISCIPLINE_ORDER: Discipline[] = [
  "student",
  "tandem-student",
  "aff",
  "tandem-instructor",
  "coach",
  "belly",
  "freefly",
  "tracking",
  "wingsuit",
  "swoop",
  "hop-pop",
];

export interface LeafHover {
  jump: Jump;
  x: number;
  y: number;
  milestone?: string;
}

export function renderTree(
  svg: SVGSVGElement,
  jumps: Jump[],
  onLeafHover: (h: LeafHover | null) => void,
): void {
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  // Wipe any previous delegated handler.
  const prev = (svg as SvgWithHandlers).__shadetreeHandlers;
  if (prev) {
    svg.removeEventListener("mouseover", prev.over);
    svg.removeEventListener("mouseout", prev.out);
    svg.removeEventListener("focusin", prev.over);
    svg.removeEventListener("focusout", prev.out);
  }

  const W = 900;
  const H = 700;
  const groundY = 640;
  const trunkBaseX = W / 2;

  // Defs — gradients that give the tree softness.
  const defs = el("defs");
  defs.append(
    linearGrad("trunkGrad", [
      { offset: "0%", color: "#3a2a1c" },
      { offset: "60%", color: "#6b4a2b" },
      { offset: "100%", color: "#8a6a40" },
    ]),
    radialGrad("groundGrad", [
      { offset: "0%", color: "#dcd0b8" },
      { offset: "100%", color: "rgba(220,208,184,0)" },
    ]),
    linearGrad("skyGrad", [
      { offset: "0%", color: "#f4e6cf" },
      { offset: "60%", color: "#e8d4b2" },
      { offset: "100%", color: "#d8b98a" },
    ], true),
  );
  svg.append(defs);

  // Sky / backdrop — uses id so pan-zoom can resize after layout.
  const sky = rect(0, 0, W, H, "url(#skyGrad)");
  sky.id = "sky-bg";
  svg.append(
    sky,
    // Sun
    circle(W - 140, 120, 46, "rgba(255,239,200,0.9)"),
    circle(W - 140, 120, 68, "rgba(255,239,200,0.35)"),
  );

  // Ground ellipse.
  svg.append(
    ellipse(trunkBaseX, groundY + 8, 380, 32, "url(#groundGrad)"),
  );

  if (jumps.length === 0) {
    const msg = text(
      trunkBaseX,
      H / 2,
      "Plant your first jump to grow your tree.",
      "#4a3a28",
      22,
    );
    msg.setAttribute("text-anchor", "middle");
    svg.append(msg);
    return;
  }

  const sorted = [...jumps].sort((a, b) => a.date.localeCompare(b.date));
  const years = new Set(sorted.map((j) => j.date.slice(0, 4)));
  const yearCount = years.size;
  const jumpById = new Map<string, Jump>();
  for (const j of sorted) jumpById.set(j.id, j);

  // Detect milestone jumps.
  const milestones = new Map<string, string>(); // jump id → reason
  const NUMBER_MILESTONES = [100, 200, 500, 1000, 1500, 2000, 2500, 3000, 4000, 5000];
  const seenDisc = new Set<string>();
  let lastStudentId: string | undefined;
  for (let i = 0; i < sorted.length; i++) {
    const j = sorted[i]!;
    const num = i + 1;
    if (NUMBER_MILESTONES.includes(num)) {
      milestones.set(j.id, `Jump #${num.toLocaleString()}`);
    }
    if (!seenDisc.has(j.discipline)) {
      seenDisc.add(j.discipline);
      if (j.discipline !== "student" && seenDisc.size > 1) {
        milestones.set(j.id, `First ${j.discipline} jump`);
      }
    }
    if (j.discipline === "student") lastStudentId = j.id;
  }
  if (lastStudentId && !milestones.has(lastStudentId)) {
    milestones.set(lastStudentId, "Last student jump");
  }

  // Trunk — height scales with seasons.
  const trunkHeight = Math.min(300, 110 + yearCount * 14);
  const forkY = groundY - trunkHeight;
  const trunkWidth = 36;

  const trunkPath =
    `M ${trunkBaseX - trunkWidth / 2} ${groundY}` +
    ` C ${trunkBaseX - trunkWidth / 2 - 6} ${groundY - trunkHeight * 0.6},` +
    ` ${trunkBaseX - trunkWidth / 2 + 4} ${forkY + 12},` +
    ` ${trunkBaseX - 8} ${forkY}` +
    ` L ${trunkBaseX + 8} ${forkY}` +
    ` C ${trunkBaseX + trunkWidth / 2 - 4} ${forkY + 12},` +
    ` ${trunkBaseX + trunkWidth / 2 + 6} ${groundY - trunkHeight * 0.6},` +
    ` ${trunkBaseX + trunkWidth / 2} ${groundY}` +
    ` Z`;
  svg.append(path(trunkPath, "url(#trunkGrad)"));

  // Roots hint (subtle).
  for (let i = 0; i < 3; i++) {
    const sign = i === 1 ? 0 : i === 0 ? -1 : 1;
    const rootPath =
      `M ${trunkBaseX + sign * 4} ${groundY}` +
      ` q ${sign * 40} 12 ${sign * 80 + 5} 20`;
    svg.append(
      pathStroke(rootPath, "#6b4a2b", 4, "rgba(107,74,43,0.35)"),
    );
  }

  // Figure out disciplines present + order them by first-appearance.
  const disciplines: Discipline[] = [];
  for (const j of sorted) {
    if (!disciplines.includes(j.discipline)) disciplines.push(j.discipline);
  }
  // Stabilize by known order.
  disciplines.sort(
    (a, b) => DISCIPLINE_ORDER.indexOf(a) - DISCIPLINE_ORDER.indexOf(b),
  );

  const n = disciplines.length;
  // Wider fan (up to 165°) so 8–10 branches don't crowd the trunk.
  const angles = fanAngles(n);

  // Dense foliage gets smaller & more translucent leaves so overlap reads well.
  const total = sorted.length;
  const leafScale =
    total > 4000 ? 0.35 : total > 2000 ? 0.5 : total > 800 ? 0.7 : 1;
  const leafOpacity =
    total > 4000 ? 0.55 : total > 2000 ? 0.7 : total > 800 ? 0.85 : 1;
  const leafStrokeW = total > 2000 ? 0 : 0.6;

  const branchLenBase = 230;
  const leavesLayer = el("g");
  leavesLayer.setAttribute("class", "leaves");

  disciplines.forEach((disc, idx) => {
    const angleDeg = angles[idx]!;
    const angle = (angleDeg * Math.PI) / 180;
    const discJumps = sorted.filter((j) => j.discipline === disc);

    // Branch length grows with log(jump count) so 2000-jump branches
    // don't become 10× longer than 50-jump ones.
    const branchLen =
      branchLenBase + Math.min(160, Math.log2(discJumps.length + 1) * 22);

    // Branch curves: start at fork, out with slight sag.
    const startX = trunkBaseX;
    const startY = forkY + 6;
    const endX = startX + Math.sin(angle) * branchLen;
    const endY = startY - Math.cos(angle) * branchLen;
    const midX =
      startX + Math.sin(angle) * branchLen * 0.5 + Math.cos(angle) * 18;
    const midY = startY - Math.cos(angle) * branchLen * 0.5 + 24;

    const branchPath = `M ${startX} ${startY} Q ${midX} ${midY} ${endX} ${endY}`;
    svg.append(
      pathStroke(branchPath, "#6b4a2b", 10, undefined, "round"),
    );
    svg.append(
      pathStroke(branchPath, "#8a6a40", 4, undefined, "round"),
    );

    // Label near branch tip.
    const labelX = endX + Math.sin(angle) * 18;
    const labelY = endY - Math.cos(angle) * 18;
    const label = text(labelX, labelY, DISCIPLINE_LABEL[disc], "#3a2a1c", 13);
    label.setAttribute(
      "text-anchor",
      angleDeg < -8 ? "end" : angleDeg > 8 ? "start" : "middle",
    );
    label.setAttribute("font-weight", "600");
    // Small jump count alongside the label gives a legend for big trees.
    const countLabel = text(
      labelX,
      labelY + 14,
      `${discJumps.length}`,
      "#5a4532",
      11,
    );
    countLabel.setAttribute(
      "text-anchor",
      angleDeg < -8 ? "end" : angleDeg > 8 ? "start" : "middle",
    );
    countLabel.setAttribute("font-style", "italic");
    svg.append(label, countLabel);

    // Leaves along the branch. Use a seeded PRNG per discipline for stability.
    const prng = mulberry32(hashString(disc + ":" + discJumps.length));

    // Precompute curve tangent components for perpendicular offset.
    discJumps.forEach((jump, i) => {
      const t = 0.22 + (i / Math.max(1, discJumps.length - 1)) * 0.78;
      const bx = bezierAt(startX, midX, endX, t);
      const by = bezierAt(startY, midY, endY, t);

      const tangentX = 2 * (1 - t) * (midX - startX) + 2 * t * (endX - midX);
      const tangentY = 2 * (1 - t) * (midY - startY) + 2 * t * (endY - midY);
      const tangentLen = Math.hypot(tangentX, tangentY) || 1;
      const perpX = -tangentY / tangentLen;
      const perpY = tangentX / tangentLen;

      // Perpendicular jitter widens for later jumps so branches look fuller at the tip.
      const spread = 30 + Math.min(38, discJumps.length / 40) + t * 14;
      const jitter = (prng() - 0.5) * spread * 2;
      const along = (prng() - 0.5) * 14;
      const lx = bx + perpX * jitter + (tangentX / tangentLen) * along;
      const ly = by + perpY * jitter + (tangentY / tangentLen) * along;

      const freefall = Math.max(
        1000,
        jump.exitAltitude - jump.deploymentAltitude,
      );
      const r = (3 + Math.min(5, freefall / 2400)) * leafScale;
      const leafColor = seasonColor(seasonOf(jump.date));

      const leaf = circle(lx, ly, r, leafColor);
      if (leafStrokeW > 0) {
        leaf.setAttribute("stroke", "rgba(32,24,16,0.35)");
        leaf.setAttribute("stroke-width", String(leafStrokeW));
      }
      if (leafOpacity < 1) {
        leaf.setAttribute("opacity", String(leafOpacity));
      }
      leaf.classList.add("leaf");
      const msReason = milestones.get(jump.id);
      if (msReason) {
        leaf.classList.add("milestone");
        leaf.setAttribute("r", String(r * 1.8));
        leaf.setAttribute("stroke", "#d4a017");
        leaf.setAttribute("stroke-width", "2");
        leaf.dataset.milestone = msReason;
      }
      leaf.dataset.jumpId = jump.id;
      leaf.dataset.lx = String(lx);
      leaf.dataset.ly = String(ly);
      leavesLayer.append(leaf);
    });
  });

  svg.append(leavesLayer);

  // Event delegation — one pair of listeners handles thousands of leaves.
  const handleOver = (ev: Event) => {
    const target = ev.target as Element;
    if (!(target instanceof SVGCircleElement)) return;
    if (!target.classList.contains("leaf")) return;
    const id = target.dataset.jumpId;
    if (!id) return;
    const j = jumpById.get(id);
    if (!j) return;
    onLeafHover({
      jump: j,
      x: Number(target.dataset.lx),
      y: Number(target.dataset.ly),
      milestone: target.dataset.milestone,
    });
  };
  const handleOut = (ev: Event) => {
    const target = ev.target as Element;
    if (target instanceof SVGCircleElement && target.classList.contains("leaf")) {
      onLeafHover(null);
    }
  };
  svg.addEventListener("mouseover", handleOver);
  svg.addEventListener("mouseout", handleOut);
  svg.addEventListener("focusin", handleOver);
  svg.addEventListener("focusout", handleOut);
  (svg as SvgWithHandlers).__shadetreeHandlers = {
    over: handleOver,
    out: handleOut,
  };

  // Gentle floating falling-leaf flourish using last jump.
  const last = sorted[sorted.length - 1]!;
  const fallColor = seasonColor(seasonOf(last.date));
  const flourish = circle(trunkBaseX - 180, groundY - 40, 4, fallColor);
  flourish.setAttribute("opacity", "0.55");
  flourish.classList.add("falling-leaf");
  svg.append(flourish);
}

interface SvgWithHandlers extends SVGSVGElement {
  __shadetreeHandlers?: { over: (e: Event) => void; out: (e: Event) => void };
}

function fanAngles(n: number): number[] {
  if (n <= 0) return [];
  if (n === 1) return [0];
  // Widen the fan as more disciplines appear so branches never overlap.
  const spread = Math.min(165, 110 + n * 8);
  const step = spread / (n - 1);
  const start = -spread / 2;
  return Array.from({ length: n }, (_, i) => start + step * i);
}

function bezierAt(a: number, b: number, c: number, t: number): number {
  const mt = 1 - t;
  return mt * mt * a + 2 * mt * t * b + t * t * c;
}

// ---- Tiny SVG helpers ----

function el<K extends keyof SVGElementTagNameMap>(
  tag: K,
): SVGElementTagNameMap[K] {
  return document.createElementNS(SVG_NS, tag);
}

function rect(x: number, y: number, w: number, h: number, fill: string) {
  const r = el("rect");
  r.setAttribute("x", String(x));
  r.setAttribute("y", String(y));
  r.setAttribute("width", String(w));
  r.setAttribute("height", String(h));
  r.setAttribute("fill", fill);
  return r;
}

function circle(cx: number, cy: number, r: number, fill: string) {
  const c = el("circle");
  c.setAttribute("cx", String(cx));
  c.setAttribute("cy", String(cy));
  c.setAttribute("r", String(r));
  c.setAttribute("fill", fill);
  return c;
}

function ellipse(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  fill: string,
) {
  const e = el("ellipse");
  e.setAttribute("cx", String(cx));
  e.setAttribute("cy", String(cy));
  e.setAttribute("rx", String(rx));
  e.setAttribute("ry", String(ry));
  e.setAttribute("fill", fill);
  return e;
}

function path(d: string, fill: string) {
  const p = el("path");
  p.setAttribute("d", d);
  p.setAttribute("fill", fill);
  return p;
}

function pathStroke(
  d: string,
  stroke: string,
  width: number,
  _fill?: string,
  linecap?: "round" | "butt" | "square",
) {
  const p = el("path");
  p.setAttribute("d", d);
  p.setAttribute("fill", "none");
  p.setAttribute("stroke", stroke);
  p.setAttribute("stroke-width", String(width));
  if (linecap) p.setAttribute("stroke-linecap", linecap);
  return p;
}

function text(
  x: number,
  y: number,
  content: string,
  fill: string,
  size: number,
) {
  const t = el("text");
  t.setAttribute("x", String(x));
  t.setAttribute("y", String(y));
  t.setAttribute("fill", fill);
  t.setAttribute("font-size", String(size));
  t.setAttribute(
    "font-family",
    "'Iowan Old Style', 'Source Serif Pro', Georgia, serif",
  );
  t.textContent = content;
  return t;
}

interface Stop {
  offset: string;
  color: string;
}
function linearGrad(id: string, stops: Stop[], vertical = false) {
  const g = el("linearGradient");
  g.setAttribute("id", id);
  if (vertical) {
    g.setAttribute("x1", "0");
    g.setAttribute("y1", "0");
    g.setAttribute("x2", "0");
    g.setAttribute("y2", "1");
  }
  for (const s of stops) {
    const stop = el("stop");
    stop.setAttribute("offset", s.offset);
    stop.setAttribute("stop-color", s.color);
    g.append(stop);
  }
  return g;
}

function radialGrad(id: string, stops: Stop[]) {
  const g = el("radialGradient");
  g.setAttribute("id", id);
  for (const s of stops) {
    const stop = el("stop");
    stop.setAttribute("offset", s.offset);
    stop.setAttribute("stop-color", s.color);
    g.append(stop);
  }
  return g;
}
