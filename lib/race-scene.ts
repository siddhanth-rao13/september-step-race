/**
 * Race geometry.
 *
 * Runners, milestones, the axis and the finish line are all placed with the
 * single `stepsToX` function below, so they can never drift out of alignment.
 * Everything here is pure and deterministic: the server and the browser build
 * the identical scene.
 */

import { milestoneArt, sceneConfig, type RaceConfig } from "@/lib/race-config";
import { formatMilestoneLabel } from "@/lib/format";

export type Milestone = {
  steps: number;
  x: number;
  label: string;
  /** Dedicated sign artwork for this value, when the asset pack has one. */
  art: string | null;
  /** Majors get a bolder axis tick and a printed axis label. */
  major: boolean;
};

export type Decoration = {
  key: string;
  x: number;
  asset: string;
  /** Rendered height in pixels. */
  height: number;
  /** Small vertical nudge for depth, in pixels (positive = lower). */
  drop: number;
};

export type RaceWorld = {
  /** Distance in pixels from 0K to the finish line. */
  trackWidth: number;
  /** Total scrollable width, including the padding either side. */
  worldWidth: number;
  /** World x of 0K. */
  originX: number;
  /** World x of the finish line. */
  finishX: number;
  milestones: Milestone[];
  decorations: Decoration[];
  clouds: Decoration[];
};

/** Convert a step count into a world x coordinate. */
export function stepsToX(steps: number, config: RaceConfig): number {
  const ratio = Math.min(Math.max(steps / config.maximumSteps, 0), 1);
  return sceneConfig.startPad + ratio * intervalCount(config) * sceneConfig.pixelsPerInterval;
}

function intervalCount(config: RaceConfig): number {
  return Math.max(1, Math.ceil(config.maximumSteps / config.axisInterval));
}

/** Tiny deterministic pseudo-random generator, so decor never shifts around. */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

/**
 * Roadside props. The city backdrop already has its own trees, benches and
 * lamps, so the foreground leans on the props that add something new and keeps
 * the repeats far apart.
 */
const DECOR_PROPS: Array<{ asset: string; height: number }> = [
  { asset: "spectators.png", height: 62 },
  { asset: "bush.png", height: 46 },
  { asset: "tree.png", height: 104 },
  { asset: "sign-keep-going.png", height: 72 },
  { asset: "bush.png", height: 40 },
  { asset: "lamp.png", height: 92 },
  { asset: "spectators.png", height: 56 },
  { asset: "bench.png", height: 44 },
  { asset: "tree.png", height: 92 },
  { asset: "bush.png", height: 50 },
];

const CLOUD_PROPS: Array<{ asset: string; height: number }> = [
  { asset: "cloud-large.png", height: 62 },
  { asset: "cloud-small.png", height: 30 },
  { asset: "cloud-medium.png", height: 44 },
  { asset: "cloud-large.png", height: 54 },
  { asset: "cloud-medium.png", height: 38 },
  { asset: "cloud-small.png", height: 26 },
];

export function buildRaceWorld(config: RaceConfig): RaceWorld {
  const intervals = intervalCount(config);
  const trackWidth = intervals * sceneConfig.pixelsPerInterval;
  const worldWidth = sceneConfig.startPad + trackWidth + sceneConfig.endPad;

  const milestones: Milestone[] = [];
  for (let index = 0; index <= intervals; index += 1) {
    const steps = Math.min(index * config.axisInterval, config.maximumSteps);
    milestones.push({
      steps,
      x: stepsToX(steps, config),
      label: formatMilestoneLabel(steps),
      art: milestoneArt[steps] ?? null,
      major: index % sceneConfig.majorEvery === 0,
    });
  }

  /*
   * Props are always dropped halfway between two milestones, with only a small
   * nudge either way, so they can never end up standing on a milestone sign.
   */
  const random = seeded(0x5e97);
  const decorations: Decoration[] = [];
  const jitter = sceneConfig.pixelsPerInterval * 0.1;
  for (
    let index = Math.round(sceneConfig.decorEvery / 2);
    index < intervals;
    index += sceneConfig.decorEvery
  ) {
    const centre = sceneConfig.startPad + (index + 0.5) * sceneConfig.pixelsPerInterval;
    const prop = DECOR_PROPS[decorations.length % DECOR_PROPS.length];
    decorations.push({
      key: `decor-${decorations.length}`,
      x: Math.round(centre + (random() - 0.5) * 2 * jitter),
      asset: prop.asset,
      height: prop.height,
      drop: Math.round(random() * 8),
    });
  }

  const cloudRandom = seeded(0x1f4d);
  const clouds: Decoration[] = [];
  for (let x = 60; x < worldWidth; x += 520) {
    const prop = CLOUD_PROPS[clouds.length % CLOUD_PROPS.length];
    clouds.push({
      key: `cloud-${clouds.length}`,
      x: Math.round(x + cloudRandom() * 180),
      asset: prop.asset,
      height: prop.height,
      drop: Math.round(cloudRandom() * 46),
    });
  }

  return {
    trackWidth,
    worldWidth,
    originX: sceneConfig.startPad,
    finishX: stepsToX(config.maximumSteps, config),
    milestones,
    decorations,
    clouds,
  };
}

/**
 * Spread items across a small number of rows so labels never overlap, no matter
 * how tightly bunched the runners are. Items are visited left to right and take
 * the first row that still has clearance.
 */
export function assignRows(
  items: Array<{ x: number; width: number }>,
  rowCount: number,
  gap = 8,
): number[] {
  const order = items
    .map((item, index) => ({ index, left: item.x - item.width / 2, right: item.x + item.width / 2 }))
    .sort((a, b) => a.left - b.left);

  const rowRight = new Array<number>(rowCount).fill(Number.NEGATIVE_INFINITY);
  const rows = new Array<number>(items.length).fill(0);

  for (const item of order) {
    let chosen = rowRight.findIndex((right) => right + gap <= item.left);
    if (chosen === -1) {
      // Nothing fits: use whichever row frees up first.
      chosen = rowRight.indexOf(Math.min(...rowRight));
    }
    rows[item.index] = chosen;
    rowRight[chosen] = item.right;
  }

  return rows;
}
