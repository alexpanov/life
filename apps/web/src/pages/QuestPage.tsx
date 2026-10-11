import { Link, useParams } from "react-router";
import type { FormEvent } from "react";
import type { GameView, PageActions } from "../ui-types";
import { Area } from "../components/presentation";
import { Button } from "../../../../packages/design/src/index";
import { H1 } from "../../../../packages/design/src/type";
export function QuestPage({
  view,
  send,
  open,
}: PageActions & { view: GameView }) {
  const { questId } = useParams();
  const quest = view.player.campaigns
    .flatMap((c) => c.quests)
    .find((q) => q.id === questId);
  if (!quest)
    return (
      <section className="focus-screen">
        <H1>Quest not found.</H1>
        <Link to="/">Back home</Link>
      </section>
    );
  const lines =
    quest.lines.length > 0
      ? quest.lines
      : view.player.events
          .filter((event) => event.questId === quest.id)
          .sort((a, b) => a.at - b.at)
          .map((event) => ({
            id: event.id,
            speaker: "hero" as const,
            text: event.text,
            at: event.at,
          }));
  function progress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = String(
      new FormData(event.currentTarget).get("note") || "",
    ).trim();
    if (
      text &&
      quest &&
      send({ type: "quest-progress", questId: quest.id, text })
    )
      event.currentTarget.reset();
  }
  return (
    <section className="focus-screen">
      <Link className="back-link" to="/">
        Back home
      </Link>
      <small>{quest.status === "done" ? "Completed" : "Your quest"}</small>
      <H1>{quest.title}</H1>
      <p>{quest.nextMove || quest.detail}</p>
      {quest.status === "pending" ? (
        <form onSubmit={progress}>
          <Area name="note" label="What progress did you make?" />
          <div className="focus-actions">
            <Button type="submit">Save progress</Button>
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
        </form>
      ) : (
        <p>{quest.status === "done" ? "You did it." : quest.blockedReason}</p>
      )}
      <details className="quiet-details" open={lines.length > 0}>
        <summary>Quest history</summary>
        {lines.length ? (
          lines.map((line) => (
            <article className="history-entry" key={line.id}>
              <small>{line.speaker === "hero" ? "You" : "Niko"}</small>
              <p>{line.text}</p>
              <time>{new Date(line.at).toLocaleDateString()}</time>
            </article>
          ))
        ) : (
          <p>Your progress will appear here.</p>
        )}
      </details>
      <details className="quiet-details">
        <summary>Quest options</summary>
        <div className="actions">
          {quest.status === "pending" ? (
            <>
              <Button
                variant="secondary"
                onClick={() =>
                  send({ type: "propose-mission", questId: quest.id })
                }
              >
                Make this my priority
              </Button>
              <Button variant="ghost" onClick={() => open("blocked", quest.id)}>
                Cannot complete
              </Button>
              {view.player.focusQuestId === quest.id && (
                <Button
                  variant="ghost"
                  onClick={() => send({ type: "set-aside" })}
                >
                  Set aside
                </Button>
              )}
            </>
          ) : (
            <Button
              onClick={() =>
                send({
                  type: "set-status",
                  questId: quest.id,
                  status: "pending",
                })
              }
            >
              Reopen quest
            </Button>
          )}
          <Button variant="ghost" onClick={() => open("quest", quest.id)}>
            Edit details
          </Button>
        </div>
      </details>
    </section>
  );
}
