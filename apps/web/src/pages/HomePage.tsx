import type { FormEvent } from "react";
import { Link } from "react-router";
import * as O from "../../../../packages/foundation/src/option";
import { Body, H1, H4 } from "../../../../packages/design/src/type";
import type { GameView, PageActions } from "../ui-types";
import { Sender } from "../components/presentation";
import { Button } from "../../../../packages/design/src/index";

type Quest = GameView["player"]["campaigns"][number]["quests"][number];

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

export function HomePage({
  view,
  send,
}: {
  view: GameView;
  send: PageActions["send"];
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
          <div className="field">
            <textarea
              aria-labelledby="nico-question"
              name="text"
              required
              rows={4}
              maxLength={160}
            />
          </div>
          {places.length > 1 ? (
            <div className="focus-actions">
              {places.map((realm) => (
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
              ))}
            </div>
          ) : (
            <Button type="submit">Continue</Button>
          )}
        </form>
      )}
    </section>
  );
}
