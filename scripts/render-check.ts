/**
 * Headless smoke test: run renderTree against the full seed under jsdom and
 * measure (a) that it doesn't throw, (b) how many leaves land in the SVG,
 * (c) how long it takes. Useful when tuning the seed or the renderer.
 */

import { JSDOM } from "jsdom";
import { sampleJumps } from "../src/seed.ts";

const dom = new JSDOM(`<!DOCTYPE html><html><body><svg id="t"/></body></html>`);
const { window } = dom;

// Expose DOM globals so the renderer (built for browsers) can find them.
const g = globalThis as unknown as Record<string, unknown>;
g.document = window.document;
g.window = window;
g.SVGCircleElement = window.SVGCircleElement;
g.SVGSVGElement = window.SVGSVGElement;

const { renderTree } = await import("../src/tree.ts");

const jumps = sampleJumps();
const svg = window.document.getElementById("t") as unknown as SVGSVGElement;
svg.setAttribute("viewBox", "0 0 900 700");

const t0 = performance.now();
renderTree(svg, jumps, () => {});
const t1 = performance.now();

const leafCount = svg.querySelectorAll(".leaf").length;
const totalNodes = svg.querySelectorAll("*").length;

console.log(`jumps:        ${jumps.length.toLocaleString()}`);
console.log(`leaves drawn: ${leafCount.toLocaleString()}`);
console.log(`total nodes:  ${totalNodes.toLocaleString()}`);
console.log(`render time:  ${(t1 - t0).toFixed(1)} ms`);

if (leafCount !== jumps.length) {
  console.error("⚠ leaf count mismatch");
  process.exit(1);
}
