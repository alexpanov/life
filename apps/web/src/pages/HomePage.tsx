import type { FormEvent } from "react";
import { Link } from "react-router";
import * as O from "../../../../packages/foundation/src/option";
import { Body, H1, H4 } from "../../../../packages/design/src/type";
import type { QuestOffer } from "../../../../packages/core/src/index";
import type { GameView, PageActions, PrayStep } from "../ui-types";
import { Area, Sender } from "../components/presentation";
import { Button } from "../../../../packages/design/src/index";

type Quest = GameView["player"]["campaigns"][number]["quests"][number];
const moods = ["ready", "curious", "quiet", "tired"] as const;
type Mood = (typeof moods)[number];

function nextStep(quest: Quest) {
  const move = quest.nextMove.trim();
  return move && move !== quest.title.trim() ? move : "";
}

function beat(quest: Quest) {
  return nextStep(quest) || "Do this one. Then tell me how it went.";
}

function realRealms(player: GameView["player"]) {
  return player.realms.filter(
    (realm) => realm.name.trim().toLowerCase() !== "home",
  );
}

function pendingTakeaway(player: GameView["player"]) {
  const jobs = player.sidekick.jobs.filter(
    (job) => job.kind === "reflect-outcome" && job.status === "pending",
  );
  return (
    jobs.find((job) => job.questId === player.operation.lastQuestId) ?? jobs[0]
  );
}

function offerCopy(player: GameView["player"], offer: QuestOffer) {
  if (offer.kind === "proposal")
    return {
      title: offer.quest.title || "A next step",
      nextMove: offer.quest.nextMove || "",
    };
  const quest = player.campaigns
    .flatMap((campaign) => campaign.quests)
    .find((item) => item.id === offer.questId);
  return {
    title: quest?.title || "A next step",
    nextMove: quest?.nextMove || "",
  };
}

function moodFrom(value: FormDataEntryValue | null): Mood | undefined {
  return moods.find((mood) => mood === value);
}

export function HomePage({
  view,
  send,
  open,
  pray,
  showMood,
  leavePray,
}: {
  view: GameView;
  send: PageActions["send"];
  open: PageActions["open"];
  pray: PrayStep | undefined;
  showMood: () => void;
  leavePray: () => void;
}) {
  const { player } = view;
  const openQuests = player.campaigns.flatMap((campaign) =>
    campaign.quests.filter((quest) => quest.status === "pending"),
  );
  function start(text: string, realmId: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (!send({ type: "describe-quest", text: trimmed })) return;
    if (!send({ type: "choose-realm", realmId })) return;
    send({ type: "start-quest" });
  }
  if (pray?.step === "offer") {
    const offer = pray.offer;
    const copy = offerCopy(player, offer);
    return (
      <section className="focus-screen">
        <Sender source="niko" />
        <H1>{copy.title}</H1>
        {copy.nextMove ? <Body>{copy.nextMove}</Body> : null}
        <div className="focus-actions">
          <Button
            type="button"
            onClick={() => send({ type: "accept-offer", offer })}
          >
            Take quest
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => send({ type: "dismiss-offer", offer })}
          >
            Not now
          </Button>
        </div>
      </section>
    );
  }
  if (pray?.step === "prayer")
    return (
      <section className="focus-screen">
        <H1>One good next step.</H1>
        <Body>
          Lord Jesus Christ, guide me toward what is good. Help me take the
          next step with love and wisdom. Amen.
        </Body>
        <Body>
          What is one good thing you can do next? Rest can be a quest too.
        </Body>
        <div className="focus-actions">
          <Button type="button" onClick={() => open("quest")}>
            Add my own quest
          </Button>
          <Button type="button" variant="secondary" onClick={showMood}>
            Back
          </Button>
        </div>
      </section>
    );
  if (pray?.step === "mood")
    return (
      <section className="focus-screen">
        <Sender source="niko" />
        <H1>How are you feeling?</H1>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const mood = moodFrom(new FormData(event.currentTarget).get("mood"));
            if (mood) send({ type: "check-in", mood });
          }}
        >
          <label className="field">
            Today I feel
            <select name="mood" defaultValue="ready">
              <option value="ready">Ready</option>
              <option value="curious">Curious</option>
              <option value="quiet">Quiet</option>
              <option value="tired">Low energy</option>
            </select>
          </label>
          <div className="focus-actions">
            <Button type="submit">Pray for a quest</Button>
            <Button type="button" variant="secondary" onClick={leavePray}>
              Back
            </Button>
          </div>
        </form>
      </section>
    );
  if (openQuests.length === 1) {
    const quest = openQuests[0]!;
    return (
      <section className="focus-screen quest-home">
        <div>
          <H1>{quest.title}</H1>
          <Sender source="niko" />
          <Body i voice="companion">
            {beat(quest)}
          </Body>
        </div>
        <div className="focus-actions">
          <Button asChild>
            <Link to={`/quest/${quest.id}`}>Make progress</Link>
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              send({ type: "set-status", questId: quest.id, status: "done" })
            }
          >
            Complete quest
          </Button>
        </div>
      </section>
    );
  }
  if (openQuests.length > 1)
    return (
      <section className="focus-screen">
        <nav className="quest-list" aria-label="Quests">
          {openQuests.map((quest) => {
            const step = nextStep(quest);
            return (
              <Link key={quest.id} to={`/quest/${quest.id}`}>
                <H4>{quest.title}</H4>
                {step ? <Body>{step}</Body> : null}
              </Link>
            );
          })}
        </nav>
      </section>
    );
  const takeaway = pendingTakeaway(player);
  if (takeaway)
    return (
      <section className="focus-screen">
        <Sender source="niko" />
        <H1>What did we learn?</H1>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const text = String(
              new FormData(event.currentTarget).get("text") || "",
            ).trim();
            if (!text) return;
            send({ type: "reflect-quest", questId: takeaway.questId, text });
          }}
        >
          <Area name="text" label="Your takeaway" submitOnEnter required />
          <Button type="submit">Remember this</Button>
        </form>
      </section>
    );
  const places = realRealms(player);
  const destination =
    places.length === 1
      ? places[0]
      : places.length === 0
        ? (player.realms.find((realm) => realm.home) ?? player.realms[0])
        : undefined;
  const draft = player.draftQuest;
  function begin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!destination) return;
    start(String(new FormData(event.currentTarget).get("text") || ""), destination.id);
  }
  return (
    <section className="focus-screen">
      <H1>Home</H1>
      <Sender source="niko" />
      <Body id="nico-question" i voice="companion">
        What's up, boss? What are we up to?
      </Body>
      {O.isSome(draft) ? (
        <>
          <H4>{draft.value.title}</H4>
          {places.length > 1 ? (
            <div className="focus-actions">
              {places.map((realm) => (
                <Button
                  key={realm.id}
                  type="button"
                  onClick={() => start(draft.value.title, realm.id)}
                >
                  {realm.name}
                </Button>
              ))}
            </div>
          ) : destination ? (
            <Button
              type="button"
              onClick={() => start(draft.value.title, destination.id)}
            >
              Continue
            </Button>
          ) : null}
        </>
      ) : (
        <form onSubmit={begin}>
          <Area
            name="text"
            label="What are you up to?"
            labelledBy="nico-question"
            submitOnEnter
            required
            maxLength={160}
          />
          <div className="focus-actions">
            {places.length > 1 ? (
              places.map((realm) => (
                <Button
                  key={realm.id}
                  type="button"
                  onClick={(event) => {
                    const form = event.currentTarget.form;
                    if (form)
                      start(
                        String(new FormData(form).get("text") || ""),
                        realm.id,
                      );
                  }}
                >
                  {realm.name}
                </Button>
              ))
            ) : (
              <Button type="submit">Continue</Button>
            )}
            <Button type="button" variant="secondary" onClick={showMood}>
              Pray for a quest
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
