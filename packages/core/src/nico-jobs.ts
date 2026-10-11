import * as O from "../../foundation/src/option";
import type { Sidekick, NicoJob, Player } from "./types";
/** Jobs belong to one Niko. Every routine returns a new value; input is unchanged. */
export const nextNicoJob = (nico: Sidekick): O.Option<NicoJob> =>
  O.fromNullable(
    [...nico.jobs]
      .filter((j) => j.status === "pending")
      .sort(
        (a, b) =>
          b.priority - a.priority ||
          a.createdAt - b.createdAt ||
          a.id.localeCompare(b.id),
      )[0],
  );
export function finishNicoJob(
  input: Sidekick,
  kind: NicoJob["kind"],
  now: number,
  questId = "",
): Sidekick {
  const nico: Sidekick = structuredClone(input);
  for (const job of nico.jobs) {
    if (
      job.kind === kind &&
      job.questId === questId &&
      job.status === "pending"
    ) {
      job.status = "done";
      job.completedAt = O.some(now);
    }
  }
  return nico;
}
export function queueReflection(
  input: Sidekick,
  questId: string,
  key: string,
  now: number,
): Sidekick {
  const nico: Sidekick = structuredClone(input);
  const id = `${nico.id}:review:${key}`;
  if (nico.jobs.some((j) => j.id === id)) return nico;
  // Preserve pending work; evict oldest completed work first.
  if (nico.jobs.length >= 100) {
    const done = nico.jobs.findIndex((j) => j.status === "done");
    if (done >= 0) nico.jobs.splice(done, 1);
    else
      throw Error(
        "Finish a conversation with Niko before adding more reviews.",
      );
  }
  nico.jobs.push({
    id,
    kind: "reflect-outcome",
    questId,
    status: "pending",
    priority: 90,
    createdAt: now,
    completedAt: O.none(),
  });
  return nico;
}
/** Learn support style, never infer the hero's character. Re-evaluation is idempotent. */
export function evolveNicoTraits(player: Player, now: number): Sidekick {
  const since = now - 5 * 86400000;
  const recent = player.sidekick.reviews.filter(
    (r) => r.outcome === "completed" && r.at >= since && r.at <= now,
  );
  const jobs = player.sidekick.jobs.filter(
    (j) =>
      j.status === "done" &&
      O.isSome(j.completedAt) &&
      j.completedAt.value >= since &&
      j.completedAt.value <= now,
  );
  const nico = structuredClone(player.sidekick);
  if (
    new Set(recent.map((r) => r.questId)).size < 3 ||
    jobs.length < 3 ||
    nico.traits.some((t) => t.id === "encouraging")
  )
    return nico;
  if (nico.traits.length >= 30) return nico;
  nico.traits.push({
    id: "encouraging",
    locked: false,
    deletedAt: O.none(),
    text: "Celebrate small wins and ask what helped.",
    source: "learned",
    acquiredAt: now,
    evidence: [...recent.map((r) => r.key), ...jobs.map((j) => j.id)].slice(
      -100,
    ),
  });
  return nico;
}
