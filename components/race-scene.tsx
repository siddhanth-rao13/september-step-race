"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { assetPath, sceneConfig } from "@/lib/race-config";
import { assignRows, buildRaceWorld, stepsToX } from "@/lib/race-scene";
import { formatRank, formatSteps, formatStepCount } from "@/lib/format";
import type { RaceSnapshot } from "@/lib/race-data";

/** Rough width of a nameplate. Only used to keep plates from overlapping. */
const PLATE_WIDTH = 68;
const PLATE_ROWS = 2;
const PLATE_ROW_HEIGHT = 30;
const TOOLTIP_WIDTH = 168;
const VIEWPORT_MARGIN = 8;
/** Breathing room kept around the pack when the race first opens. */
const OPENING_MARGIN = 60;

/** Height of a runner's feet above the bottom of the runner layer. */
const FEET = "calc(var(--road-h) * (1 - var(--road-surface)))";

type Props = { snapshot: RaceSnapshot };

export function RaceScene({ snapshot }: Props) {
  const { config } = snapshot;
  const viewportRef = useRef<HTMLDivElement>(null);
  const programmaticScroll = useRef(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tooltipShift, setTooltipShift] = useState(0);
  const [cueHidden, setCueHidden] = useState(false);

  const world = useMemo(() => buildRaceWorld(config), [config]);

  /**
   * Runners in world coordinates. Lanes give a small vertical offset so sprites
   * never sit perfectly on top of one another when two totals are close, and
   * nameplates are spread over two rows so their text can never collide.
   */
  const runners = useMemo(() => {
    const placed = snapshot.participants.map((participant) => ({
      ...participant,
      x: stepsToX(participant.totalSteps ?? 0, config),
    }));

    const byRank = [...placed].sort((a, b) => (b.totalSteps ?? -1) - (a.totalSteps ?? -1));
    const laneById = new Map(byRank.map((entry, index) => [entry.id, index % 3]));

    const plateRows = assignRows(
      placed.map((entry) => ({ x: entry.x, width: PLATE_WIDTH })),
      PLATE_ROWS,
      6,
    );

    return placed.map((entry, index) => {
      const lane = laneById.get(entry.id) ?? 0;
      return { ...entry, lane, lift: lane * 13, plateRow: plateRows[index] };
    });
  }, [snapshot.participants, config]);

  const selected = runners.find((runner) => runner.id === selectedId) ?? null;

  /* Open on the pack rather than on an empty stretch of road. */
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || runners.length === 0) return;

    const xs = runners.map((runner) => runner.x);
    const leader = Math.max(...xs);
    const trailer = Math.min(...xs);
    const maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth);

    // Centre the pack. When it is narrow enough to leave room, also keep a
    // margin either side so no nameplate is clipped by a screen edge.
    let target = (leader + trailer) / 2 - viewport.clientWidth / 2;
    if (leader - trailer + OPENING_MARGIN * 2 <= viewport.clientWidth) {
      target = Math.min(target, trailer - OPENING_MARGIN);
      target = Math.max(target, leader + OPENING_MARGIN - viewport.clientWidth);
    }

    programmaticScroll.current = true;
    viewport.scrollLeft = Math.max(0, Math.min(target, maxScroll));
    // Ignore the scroll event this assignment triggers.
    const release = window.setTimeout(() => {
      programmaticScroll.current = false;
    }, 200);
    return () => window.clearTimeout(release);
  }, [runners]);

  /* Keep the tooltip fully on screen, even for a runner near a screen edge. */
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!selected || !viewport) {
      setTooltipShift(0);
      return;
    }

    const anchorCentre = selected.x - viewport.scrollLeft;
    const half = TOOLTIP_WIDTH / 2;
    const minCentre = half + VIEWPORT_MARGIN;
    const maxCentre = viewport.clientWidth - half - VIEWPORT_MARGIN;

    if (anchorCentre < minCentre) setTooltipShift(minCentre - anchorCentre);
    else if (anchorCentre > maxCentre) setTooltipShift(maxCentre - anchorCentre);
    else setTooltipShift(0);
  }, [selected]);

  const handleScroll = useCallback(() => {
    if (programmaticScroll.current) return;
    setCueHidden(true);
    setSelectedId(null);
  }, []);

  /* Tapping anywhere that is not a runner closes the tooltip. */
  useEffect(() => {
    if (!selectedId) return;
    const close = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-runner]") || target?.closest("[data-tooltip]")) return;
      setSelectedId(null);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedId(null);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [selectedId]);

  return (
    <div className="race-stage">
      <div
        className="race-viewport"
        ref={viewportRef}
        onScroll={handleScroll}
        aria-label={`${config.name} track`}
      >
        <div className="race-world" style={{ width: `${world.worldWidth}px` }}>
          <div className="layer sky" aria-hidden="true">
            {world.clouds.map((cloud) => (
              <img
                key={cloud.key}
                className="cloud"
                src={assetPath(cloud.asset)}
                alt=""
                style={{ left: `${cloud.x}px`, top: `${8 + cloud.drop}px`, height: `${cloud.height}px` }}
              />
            ))}
          </div>

          <div className="layer city" aria-hidden="true" />

          {/* Props, milestone signs and the finish arch stand on the roadside. */}
          <div className="layer verge" aria-hidden="true">
            {world.decorations.map((prop) => (
              <img
                key={prop.key}
                className="prop"
                src={assetPath(prop.asset)}
                alt=""
                style={{ left: `${prop.x}px`, height: `${prop.height}px`, bottom: `${-prop.drop}px` }}
              />
            ))}

            {world.milestones.map((milestone) => (
              <div key={milestone.steps} className="milestone" style={{ left: `${milestone.x}px` }}>
                {milestone.art ? (
                  <img className="milestone-sign" src={assetPath(milestone.art)} alt="" />
                ) : (
                  <>
                    <span className="milestone-plate">{milestone.label}</span>
                    <img className="milestone-post" src={assetPath("milestone-marker.png")} alt="" />
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="layer road" aria-hidden="true" />

          <div className="finish" style={{ left: `${world.finishX}px` }} aria-hidden="true">
            <span className="finish-tape" />
            <img src={assetPath("finish-line.png")} alt="" />
          </div>

          <div className="layer runners">
            {runners.map((runner) => {
              const isSelected = runner.id === selectedId;
              return (
                <button
                  key={runner.id}
                  type="button"
                  data-runner
                  className="runner"
                  aria-expanded={isSelected}
                  aria-label={`${runner.name}, ${formatStepCount(runner.totalSteps)} steps, rank ${formatRank(runner.rank)}`}
                  style={{
                    left: `${runner.x}px`,
                    bottom: `calc(${FEET} + ${runner.lift}px)`,
                    zIndex: 20 - runner.lane,
                  }}
                  onClick={() => setSelectedId(isSelected ? null : runner.id)}
                >
                  {runner.rank === 1 ? (
                    <span className="runner-crown" aria-hidden="true">
                      1st
                    </span>
                  ) : null}
                  <img src={assetPath(runner.sprite)} alt="" />
                </button>
              );
            })}

            {selected ? (
              <div
                data-tooltip
                className="tooltip"
                role="dialog"
                aria-label={`${selected.name} details`}
                style={{
                  left: `${selected.x + tooltipShift}px`,
                  bottom: `calc(${FEET} + ${selected.lift}px + var(--runner-h) + 20px)`,
                  ["--arrow-left" as string]: `calc(50% - ${tooltipShift}px)`,
                }}
              >
                <h2 style={{ color: selected.accent }}>{selected.name.toUpperCase()}</h2>
                <dl>
                  <dt>Steps</dt>
                  <dd>{formatStepCount(selected.totalSteps)}</dd>
                  <dt>Rank</dt>
                  <dd>{formatRank(selected.rank)}</dd>
                  <dt>Today</dt>
                  <dd>{formatStepCount(selected.todaySteps)}</dd>
                  <dt>To finish</dt>
                  <dd>{formatSteps(Math.max(0, config.maximumSteps - (selected.totalSteps ?? 0)))}</dd>
                </dl>
              </div>
            ) : null}
          </div>

          <div className="layer plates">
            {runners.map((runner) => (
              <div
                key={runner.id}
                className="plate"
                style={{
                  left: `${runner.x}px`,
                  top: `${5 + runner.plateRow * PLATE_ROW_HEIGHT}px`,
                  ["--accent" as string]: runner.accent,
                }}
              >
                <span
                  className="plate-stem"
                  style={{ height: `${7 + runner.plateRow * PLATE_ROW_HEIGHT}px` }}
                />
                <span className="plate-name">{runner.name.toUpperCase()}</span>
                <span className="plate-total" data-missing={runner.totalSteps === null}>
                  {runner.totalSteps === null ? "NOT UPDATED" : formatSteps(runner.totalSteps)}
                </span>
              </div>
            ))}
          </div>

          <div className="layer axis" aria-hidden="true">
            {world.milestones.map((milestone, index) => (
              <div key={milestone.steps}>
                <span className="axis-tick" data-major={milestone.major} style={{ left: `${milestone.x}px` }} />
                <span
                  className="axis-label"
                  data-major={milestone.major}
                  data-first={index === 0}
                  style={{ left: `${milestone.x}px` }}
                >
                  {milestone.label}
                </span>
              </div>
            ))}
            <span
              className="axis-hint"
              style={{ left: `${world.originX + sceneConfig.pixelsPerInterval * 2.5}px` }}
            >
              more steps →
            </span>
          </div>
        </div>
      </div>

      {/* Sits above the viewport, so it stays put while the world scrolls. */}
      <span className="swipe-cue" data-hidden={cueHidden} aria-hidden="true">
        ◀ SWIPE ▶
      </span>
    </div>
  );
}
