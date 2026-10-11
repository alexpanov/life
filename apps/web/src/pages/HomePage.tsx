import { useEffect, useState, type FormEvent } from "react";
import { Effect } from "effect";
import {
  nicoReplyRoutine,
  mockNicoLayer,
} from "../../../../packages/application/src/nico-model";
import {
  getSidekickContext,
  nextNicoJob,
  type Snapshot,
} from "../../../../packages/core/src/index";
import { Link } from "react-router";
import * as O from "../../../../packages/foundation/src/option";
import type {
  QuestInput,
  QuestOffer,
} from "../../../../packages/core/src/index";
import type { GameView, PageActions } from "../ui-types";
import { Sender, Area, Field } from "../components/presentation";
import { Button } from "../components/ui/button";

export function HomePage({
  view,
  game,
  now,
  offer,
  offeredQuest,
  send,
  open,
}: PageActions & {
  view: GameView;
  game: Snapshot;
  now: number;
  offer: QuestOffer | null;
  offeredQuest: QuestInput | undefined;
}) {
  const { player } = view;
  const [celebrated, setCelebrated] = useState("");
  const mission = O.isSome(view.mission) ? view.mission.value : null;
  const lastQuest = O.isSome(view.lastQuest) ? view.lastQuest.value : null;
  const nextJob = nextNicoJob(
    player.operation.phase === "review"
      ? {
          ...player.sidekick,
          jobs: player.sidekick.jobs.filter(
            (job) =>
              job.kind === "learn-name" ||
              (job.kind === "reflect-outcome" && job.questId === lastQuest?.id),
          ),
        }
      : player.sidekick,
  );
  const pendingReflection = player.sidekick.jobs.find(
    (job) =>
      job.kind === "reflect-outcome" &&
      job.status === "pending" &&
      job.questId === lastQuest?.id,
  );
  const outcomeKey =
    [...player.sidekick.jobs]
      .reverse()
      .find(
        (job) =>
          job.kind === "reflect-outcome" && job.questId === lastQuest?.id,
      )?.id ||
    lastQuest?.id ||
    "";
  const [reply, setReply] = useState("");
  const intent =
    player.operation.phase === "review"
      ? celebrated === outcomeKey
        ? "reflect"
        : "celebrate"
      : O.isSome(nextJob) && nextJob.value.kind === "meet-hero"
        ? "meet"
        : !player.sidekick.introduced
          ? "meet"
          : "choose";
  useEffect(() => {
    let active = true;
    void Effect.runPromise(
      nicoReplyRoutine(getSidekickContext(game, now), intent).pipe(
        Effect.provide(mockNicoLayer),
      ),
    )
      .then((text) => {
        if (active) setReply(text);
      })
      .catch(() => {
        if (active) setReply("");
      });
    return () => {
      active = false;
    };
  }, [game, now, intent]);
  function submit(
    event: FormEvent<HTMLFormElement>,
    action: "meet" | "name" | "reflect",
  ) {
    event.preventDefault();
    const text = String(
      new FormData(event.currentTarget).get("text") || "",
    ).trim();
    if (!text) return;
    if (action === "meet") send({ type: "meet-nico", text });
    if (action === "name") send({ type: "name-hero", name: text });
    if (action === "reflect" && pendingReflection)
      send({ type: "reflect-quest", questId: pendingReflection.questId, text });
  }
  // An existing mission stays one tap away even before the first introduction.
  if (player.operation.phase === "review" && lastQuest) {
    if (celebrated !== outcomeKey)
      return (
        <section className="focus-screen">
          <Sender source="niko" />
          <h1 className="nico-heading">
            {lastQuest.status === "done"
              ? `Great job, ${O.getOrElse(player.sidekick.heroName, () => "boss")}.`
              : "Let’s learn from this."}
          </h1>
          <p>{lastQuest.title}</p>
          {reply && <p className="nico-copy">{reply}</p>}
          <Button onClick={() => setCelebrated(outcomeKey)}>Continue</Button>
        </section>
      );
    if (
      O.isSome(nextJob) &&
      nextJob.value.kind === "learn-name" &&
      O.isNone(player.sidekick.heroName)
    )
      return (
        <section className="focus-screen">
          <Sender source="niko" />
          <h1 className="nico-heading">By the way, what’s your name?</h1>
          <form onSubmit={(event) => submit(event, "name")}>
            <Field name="text" label="Your name" required />
            <Button type="submit">Tell Niko</Button>
          </form>
        </section>
      );
    if (pendingReflection)
      return (
        <section className="focus-screen">
          <Sender source="niko" />
          <h1 className="nico-heading">What did we learn?</h1>
          <p className="nico-copy">
            {reply || "A small lesson for your next quest."}
          </p>
          <form onSubmit={(event) => submit(event, "reflect")}>
            <Area name="text" label="Your takeaway" />
            <Button type="submit">Remember this</Button>
          </form>
        </section>
      );
    return (
      <section className="focus-screen">
        <Sender source="niko" />
        <h1 className="nico-heading">One good next move.</h1>
        <p>Ready when you are.</p>
        <Button onClick={() => send({ type: "finish-review" })}>
          Pick next quest
        </Button>
      </section>
    );
  }
  if (mission)
    return (
      <section className="focus-screen">
        <small>Your current quest</small>
        <h1>{mission.title}</h1>
        <p>
          {mission.nextMove ||
            mission.detail ||
            "One real action. Your own pace."}
        </p>
        <div className="focus-actions">
          <Button
            onClick={() =>
              send({ type: "set-status", questId: mission.id, status: "done" })
            }
          >
            Complete quest
          </Button>
          <Button asChild variant="secondary">
            <Link to={`/quest/${mission.id}`}>Make progress</Link>
          </Button>
        </div>
      </section>
    );
  if (!player.sidekick.introduced)
    return (
      <section className="focus-screen">
        <Sender source="niko" />
        <h1 className="nico-heading">Meet Niko.</h1>
        <p className="nico-copy">
          {reply ||
            "Hey friend, I’m Niko Gonzalez. I’d like to be your sidekick. What are you up to?"}
        </p>
        <form onSubmit={(event) => submit(event, "meet")}>
          <Area name="text" label="What are you up to?" />
          <Button type="submit">Meet Niko</Button>
        </form>
      </section>
    );
  if (offer && offeredQuest)
    return (
      <section className="focus-screen">
        <Sender source="niko" />
        <h1>{offeredQuest.title}</h1>
        <p>{offeredQuest.nextMove}</p>
        <div className="focus-actions">
          <Button onClick={() => send({ type: "accept-offer", offer })}>
            Take quest
          </Button>
          <Button
            variant="secondary"
            onClick={() => send({ type: "dismiss-offer", offer })}
          >
            Not now
          </Button>
        </div>
      </section>
    );
  return (
    <section className="focus-screen">
      <Sender source="niko" />
      <h1 className="nico-heading">How are you feeling?</h1>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const mood = String(new FormData(event.currentTarget).get("mood")) as
            "ready" | "curious" | "quiet" | "tired";
          send({ type: "check-in", mood });
        }}
      >
        <label className="field">
          Today I feel
          <select name="mood">
            <option value="ready">Ready</option>
            <option value="curious">Curious</option>
            <option value="quiet">Quiet</option>
            <option value="tired">Low energy</option>
          </select>
        </label>
        <div className="focus-actions">
          <Button type="submit">
            {view.quests.some((q) => q.status === "pending")
              ? "Find my next quest"
              : "Pray for a quest"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => open("quest")}
          >
            Add my own quest
          </Button>
        </div>
      </form>
    </section>
  );
}
