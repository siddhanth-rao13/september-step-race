/**
 * Central configuration for the September Step Race.
 *
 * Everything the race needs to know lives here. Change a value in this file and
 * the world, the axis, the milestones and the finish line all follow along.
 */

export type Participant = {
  /** Stable internal key. Never shown on screen. */
  id: string;
  /** Must match the column heading in data/steps.xlsx exactly. */
  name: string;
  gender: "female" | "male" | "other";
  /** File name inside public/assets/. */
  sprite: string;
  /** Highlight colour used for this runner's nameplate and tooltip. */
  accent: string;
};

export type RaceConfig = {
  name: string;
  /** First day counted, inclusive. Format: YYYY-MM-DD. */
  startDate: string;
  /** Last day counted, inclusive. Format: YYYY-MM-DD. */
  endDate: string;
  /** Steps required to reach the finish line. */
  maximumSteps: number;
  /** Spacing between milestones on the axis. */
  axisInterval: number;
  /**
   * Shown in the header as "DATA UPDATED".
   * Update this whenever you refresh data/steps.xlsx.
   * The offset at the end is kept as written, so the label never depends on
   * the viewer's clock, locale or timezone.
   */
  lastUpdated: string;
  participants: Participant[];
};

export const raceConfig: RaceConfig = {
  name: "September Step Race",
  startDate: "2026-09-01",
  endDate: "2026-09-30",
  maximumSteps: 300000,
  axisInterval: 5000,
  lastUpdated: "2026-09-11T09:00:00+05:30",
  participants: [
    { id: "chetana", name: "Chetana", gender: "female", sprite: "runner-chetana.png", accent: "#ff5f9e" },
    { id: "siddhanth", name: "Siddhanth", gender: "male", sprite: "runner-siddhanth.png", accent: "#3d8bff" },
    { id: "praneeth", name: "Praneeth", gender: "male", sprite: "runner-praneeth.png", accent: "#ff4d4d" },
    { id: "venkat", name: "Venkat", gender: "male", sprite: "runner-venkat.png", accent: "#35c94a" },
    { id: "sujan", name: "Sujan", gender: "male", sprite: "runner-sujan.png", accent: "#ffc632" },
  ],
};

/**
 * How the race world is drawn. These are pixel values in world space.
 * `pixelsPerInterval` is the main dial: raise it to spread the race out,
 * lower it to fit more of the race on screen at once.
 */
export const sceneConfig = {
  /** Horizontal pixels between two milestones (one `axisInterval`). */
  pixelsPerInterval: 150,
  /** Empty world to the left of 0K. */
  startPad: 120,
  /** Empty world to the right of the finish line. */
  endPad: 260,
  /** Every Nth milestone gets a bolder tick and an axis label. */
  majorEvery: 5,
  /** Roughly one decorative prop every N milestones. */
  decorEvery: 3,
} as const;

/** Milestone values that have their own dedicated sign artwork. */
export const milestoneArt: Record<number, string> = {
  0: "milestone-0k.png",
  5000: "milestone-5k.png",
  10000: "milestone-10k.png",
  15000: "milestone-15k.png",
  20000: "milestone-20k.png",
  25000: "milestone-25k.png",
};

export const assetPath = (file: string) => `/assets/${file}`;
