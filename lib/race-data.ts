/**
 * Reads data/steps.xlsx and turns it into everything the race needs.
 *
 * This module runs on the server only. The result is plain JSON so it can be
 * handed straight to the client component.
 */

import fs from "node:fs/promises";
import path from "node:path";
import * as XLSX from "xlsx";
import { raceConfig, type RaceConfig } from "@/lib/race-config";
import { formatDayLabel, formatTimestampLabel } from "@/lib/format";

export type ParticipantStanding = {
  id: string;
  name: string;
  sprite: string;
  accent: string;
  /** Sum of every reported day. `null` when nothing has been reported yet. */
  totalSteps: number | null;
  /** Steps on `latestStepDate`. `null` when that person has not updated yet. */
  todaySteps: number | null;
  /** Number of days with a reported value. */
  reportedDays: number;
  rank: number | null;
  /** 0 at the start line, 1 at the finish line. */
  progress: number;
};

export type RaceSnapshot = {
  config: RaceConfig;
  participants: ParticipantStanding[];
  /** Most recent date on which anybody reported steps, as YYYY-MM-DD. */
  latestStepDate: string | null;
  latestStepDateLabel: string;
  dataUpdatedLabel: string;
};

type StepRow = {
  date: string;
  stepsByParticipant: Record<string, number | null>;
};

const WORKBOOK_PATH = path.join(process.cwd(), "data", "steps.xlsx");
const SHEET_NAME = "Steps";

/** Format a Y/M/D triple as YYYY-MM-DD without touching the Date class. */
function toIsoDate(year: number, month: number, day: number): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)}`;
}

/**
 * Excel dates arrive as serial numbers, real dates or plain text depending on
 * how the cell was typed. All three are accepted.
 */
function parseSheetDate(rawValue: unknown): string | null {
  if (rawValue instanceof Date && !Number.isNaN(rawValue.getTime())) {
    return toIsoDate(rawValue.getUTCFullYear(), rawValue.getUTCMonth() + 1, rawValue.getUTCDate());
  }

  if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
    const parsed = XLSX.SSF.parse_date_code(rawValue);
    return parsed ? toIsoDate(parsed.y, parsed.m, parsed.d) : null;
  }

  if (typeof rawValue !== "string") return null;
  const text = rawValue.trim();
  if (!text) return null;

  // Already ISO: 2026-09-01
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
  if (iso) return toIsoDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  // Day first, as the workbook is written: 01-09-26 or 1/9/2026
  const dmy = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/.exec(text);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    const yearPart = Number(dmy[3]);
    const year = dmy[3].length === 2 ? 2000 + yearPart : yearPart;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) return toIsoDate(year, month, day);
  }

  return null;
}

/** Blank, non-numeric and negative cells all mean "not updated", never zero. */
function normalizeStepValue(rawValue: unknown): number | null {
  if (rawValue === null || rawValue === undefined) return null;
  if (typeof rawValue === "string" && rawValue.trim() === "") return null;

  const value = typeof rawValue === "number" ? rawValue : Number(rawValue);
  if (!Number.isFinite(value) || value < 0) return null;

  return Math.round(value);
}

async function readWorkbookRows(config: RaceConfig): Promise<StepRow[]> {
  const buffer = await fs.readFile(WORKBOOK_PATH);
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[SHEET_NAME];

  if (!sheet) {
    throw new Error(
      `data/steps.xlsx must contain a sheet named "${SHEET_NAME}". Found: ${workbook.SheetNames.join(", ") || "none"}.`,
    );
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null, raw: true });

  return rows
    .map((row) => {
      const date = parseSheetDate(row.Date);
      if (!date || date < config.startDate || date > config.endDate) return null;

      return {
        date,
        stepsByParticipant: Object.fromEntries(
          config.participants.map((participant) => [
            participant.id,
            normalizeStepValue(row[participant.name]),
          ]),
        ),
      } satisfies StepRow;
    })
    .filter((row): row is StepRow => row !== null)
    .sort((left, right) => left.date.localeCompare(right.date));
}

export function buildSnapshot(config: RaceConfig, rows: StepRow[]): RaceSnapshot {
  const latestStepDate =
    rows
      .filter((row) => Object.values(row.stepsByParticipant).some((value) => value !== null))
      .map((row) => row.date)
      .pop() ?? null;

  const totals = config.participants.map((participant) => {
    let totalSteps = 0;
    let reportedDays = 0;
    let todaySteps: number | null = null;

    for (const row of rows) {
      const value = row.stepsByParticipant[participant.id];
      if (value !== null) {
        totalSteps += value;
        reportedDays += 1;
      }
      if (row.date === latestStepDate) todaySteps = value;
    }

    return {
      id: participant.id,
      name: participant.name,
      sprite: participant.sprite,
      accent: participant.accent,
      totalSteps: reportedDays > 0 ? totalSteps : null,
      todaySteps,
      reportedDays,
      rank: null as number | null,
      progress: reportedDays > 0 ? Math.min(Math.max(totalSteps / config.maximumSteps, 0), 1) : 0,
    };
  });

  // Rank on totals, highest first. Equal totals share a rank; nobody without
  // any data is ranked at all.
  const ranked = [...totals].sort((left, right) => (right.totalSteps ?? -1) - (left.totalSteps ?? -1));
  let lastTotal: number | null = null;
  let lastRank = 0;
  ranked.forEach((participant, index) => {
    if (participant.totalSteps === null) return;
    if (lastTotal !== null && participant.totalSteps === lastTotal) {
      participant.rank = lastRank;
    } else {
      participant.rank = index + 1;
      lastRank = index + 1;
      lastTotal = participant.totalSteps;
    }
  });

  return {
    config,
    // Config order is the stable render order; rank is carried on each entry.
    participants: totals,
    latestStepDate,
    latestStepDateLabel: formatDayLabel(latestStepDate),
    dataUpdatedLabel: formatTimestampLabel(config.lastUpdated),
  };
}

export async function getRaceSnapshot(config: RaceConfig = raceConfig): Promise<RaceSnapshot> {
  return buildSnapshot(config, await readWorkbookRows(config));
}

export { readWorkbookRows };
