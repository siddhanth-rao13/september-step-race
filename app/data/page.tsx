import Link from "next/link";
import { getRaceSnapshot } from "@/lib/race-data";
import { formatStepCount, formatRank } from "@/lib/format";
import { buildRaceWorld, stepsToX } from "@/lib/race-scene";

export const dynamic = "force-dynamic";

/** Plain view of everything derived from data/steps.xlsx. Handy when checking a
 *  workbook edit. The race page itself never shows any of this. */
export default async function DataPage() {
  const snapshot = await getRaceSnapshot();
  const { config } = snapshot;
  const world = buildRaceWorld(config);

  return (
    <main className="data-page">
      <h1 style={{ fontSize: 13, marginTop: 0 }}>Race Data</h1>
      <p>
        <Link href="/">← back to the race</Link>
      </p>

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Rank</th>
            <th>Total</th>
            <th>Today</th>
            <th>Days</th>
            <th>World x</th>
          </tr>
        </thead>
        <tbody>
          {[...snapshot.participants]
            .sort((a, b) => (b.totalSteps ?? -1) - (a.totalSteps ?? -1))
            .map((participant) => (
              <tr key={participant.id}>
                <td>{participant.name}</td>
                <td>{formatRank(participant.rank)}</td>
                <td>{formatStepCount(participant.totalSteps)}</td>
                <td>{formatStepCount(participant.todaySteps)}</td>
                <td>{participant.reportedDays}</td>
                <td>{Math.round(stepsToX(participant.totalSteps ?? 0, config))}px</td>
              </tr>
            ))}
        </tbody>
      </table>

      <table style={{ marginTop: 20 }}>
        <tbody>
          <tr>
            <th>Window</th>
            <td>
              {config.startDate} → {config.endDate}
            </td>
          </tr>
          <tr>
            <th>Latest step date</th>
            <td>{snapshot.latestStepDateLabel}</td>
          </tr>
          <tr>
            <th>Data updated</th>
            <td>{snapshot.dataUpdatedLabel}</td>
          </tr>
          <tr>
            <th>Maximum steps</th>
            <td>{config.maximumSteps}</td>
          </tr>
          <tr>
            <th>Axis interval</th>
            <td>{config.axisInterval}</td>
          </tr>
          <tr>
            <th>Milestones</th>
            <td>
              {world.milestones.length} ({world.milestones[0]?.label} →{" "}
              {world.milestones[world.milestones.length - 1]?.label})
            </td>
          </tr>
          <tr>
            <th>World width</th>
            <td>{world.worldWidth}px</td>
          </tr>
          <tr>
            <th>Finish x</th>
            <td>{Math.round(world.finishX)}px</td>
          </tr>
        </tbody>
      </table>
    </main>
  );
}
