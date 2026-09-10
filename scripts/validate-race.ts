/**
 * Quick sanity check on data/steps.xlsx.
 *
 * Run with `npm run validate` after editing the workbook. It uses the same
 * parsing and ranking code as the website, so if this passes the race page
 * will show the same numbers.
 */

import { raceConfig } from "@/lib/race-config";
import { getRaceSnapshot } from "@/lib/race-data";
import { buildRaceWorld, stepsToX } from "@/lib/race-scene";
import { formatStepCount, formatRank } from "@/lib/format";

async function main() {
  const problems: string[] = [];

  const snapshot = await getRaceSnapshot();
  const world = buildRaceWorld(raceConfig);

  console.log(`${raceConfig.name}  (${raceConfig.startDate} → ${raceConfig.endDate})`);
  console.log(`Data updated: ${snapshot.dataUpdatedLabel}`);
  console.log(`Latest step date: ${snapshot.latestStepDateLabel}`);
  console.log("");

  const standings = [...snapshot.participants].sort(
    (left, right) => (right.totalSteps ?? -1) - (left.totalSteps ?? -1),
  );

  for (const participant of standings) {
    console.log(
      [
        formatRank(participant.rank).padStart(4),
        participant.name.padEnd(12),
        `total ${formatStepCount(participant.totalSteps).padStart(11)}`,
        `today ${formatStepCount(participant.todaySteps).padStart(11)}`,
        `days ${String(participant.reportedDays).padStart(2)}`,
        `x ${Math.round(stepsToX(participant.totalSteps ?? 0, raceConfig))}px`,
      ].join("  "),
    );
  }

  console.log("");
  console.log(
    `Milestones: ${world.milestones.length} (${world.milestones[0].label} → ${world.milestones.at(-1)!.label})`,
  );
  console.log(`World width: ${world.worldWidth}px, finish at ${Math.round(world.finishX)}px`);

  /* ------------------------------------------------------------------ checks */

  const missingColumn = raceConfig.participants.filter((participant) => {
    const standing = snapshot.participants.find((entry) => entry.id === participant.id);
    return !standing || standing.reportedDays === 0;
  });
  for (const participant of missingColumn) {
    console.warn(`WARNING: no step values found for "${participant.name}".`);
  }

  if (snapshot.participants.length !== raceConfig.participants.length) {
    problems.push("Participant count does not match the configuration.");
  }

  const finalMilestone = world.milestones.at(-1);
  if (!finalMilestone || finalMilestone.steps !== raceConfig.maximumSteps) {
    problems.push(`Final milestone is ${finalMilestone?.steps} but maximumSteps is ${raceConfig.maximumSteps}.`);
  }

  if (Math.round(world.finishX) !== Math.round(stepsToX(raceConfig.maximumSteps, raceConfig))) {
    problems.push("Finish line is not aligned with the maximum step position.");
  }

  for (const participant of snapshot.participants) {
    if (participant.totalSteps !== null && participant.totalSteps < 0) {
      problems.push(`${participant.name} has a negative total.`);
    }
    if (participant.reportedDays === 0 && participant.totalSteps !== null) {
      problems.push(`${participant.name} has a total but no reported days.`);
    }
  }

  if (problems.length > 0) {
    console.error("\nValidation failed:");
    for (const problem of problems) console.error(` - ${problem}`);
    process.exit(1);
  }

  console.log("\nValidation passed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
