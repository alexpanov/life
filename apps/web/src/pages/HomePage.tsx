import type { FormEvent } from "react";
import { Link } from "react-router";
import * as O from "../../../../packages/foundation/src/option";
import { Body, H1, H4, Label } from "../../../../packages/design/src/type";
import type { GameView, PageActions } from "../ui-types";
import { Sender } from "../components/presentation";
import { Button } from "../../../../packages/design/src/index";

export function HomePage({
  view,
  send,
}: {
  view: GameView;
  send: PageActions["send"];
}) {
  const { player } = view;
  const openQuests = player.campaigns.flatMap((campaign) =>
    campaign.quests
      .filter((quest) => quest.status === "pending")
      .map((quest) => ({
        quest,
        realm:
          player.realms.find((realm) => realm.id === campaign.realmId)?.name ||
          "Realm",
      })),
  );
  if (openQuests.length > 0)
    return (
      <section className="focus-screen">
        <H1>Home</H1>
        <nav className="menu-links" aria-label="Quests">
          {openQuests.map(({ quest, realm }) => (
            <Link key={quest.id} to={`/quest/${quest.id}`}>
              <span>
                <H4>{quest.title}</H4>
                <Body>{realm}</Body>
              </span>
              <span aria-hidden="true">→</span>
            </Link>
          ))}
        </nav>
      </section>
    );
  const draft = player.draftQuest;
  function describe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = String(new FormData(event.currentTarget).get("text") || "");
    if (text.trim()) send({ type: "describe-quest", text });
  }
  return (
    <section className="focus-screen">
      <H1>Home</H1>
      <Sender source="niko" />
      <Body i voice="companion">
        What's up, boss? What are we up to?
      </Body>
      {O.isNone(draft) ? (
        <form onSubmit={describe}>
          <label className="field" htmlFor="what-are-we-up-to">
            <Label>What are we up to?</Label>
            <textarea
              id="what-are-we-up-to"
              name="text"
              required
              rows={4}
              maxLength={160}
            />
          </label>
          <Button type="submit">Continue</Button>
        </form>
      ) : (
        <>
          <H4>{draft.value.title}</H4>
          <label className="field" htmlFor="quest-realm">
            <Label>Which realm?</Label>
            <select
              id="quest-realm"
              value={O.isSome(draft.value.realmId) ? draft.value.realmId.value : ""}
              onChange={(event) => {
                if (event.target.value)
                  send({ type: "choose-realm", realmId: event.target.value });
              }}
            >
              <option value="">Pick a realm</option>
              {player.realms.map((realm) => (
                <option key={realm.id} value={realm.id}>
                  {realm.name}
                </option>
              ))}
            </select>
          </label>
          <Button
            type="button"
            disabled={O.isNone(draft.value.realmId)}
            onClick={() => send({ type: "start-quest" })}
          >
            Start
          </Button>
        </>
      )}
    </section>
  );
}
