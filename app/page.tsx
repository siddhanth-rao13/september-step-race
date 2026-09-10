import { RaceScene } from "@/components/race-scene";
import { getRaceSnapshot } from "@/lib/race-data";

/** Re-read the workbook on every request so a pushed update shows up at once. */
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const snapshot = await getRaceSnapshot();

  return (
    <main className="race-shell">
      <header className="race-header">
        <h1 className="race-title">{snapshot.config.name}</h1>
        <p className="race-updated">
          Data updated
          <strong>{snapshot.dataUpdatedLabel}</strong>
        </p>
      </header>
      <RaceScene snapshot={snapshot} />
    </main>
  );
}
