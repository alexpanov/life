import { Link } from "react-router";
import { useState } from "react";
import { Effect } from "effect";
import { ThumbsDown, LockKeyhole } from "lucide-react";
import type { GameController } from "../../../../packages/application/src/controller";
import { runNicoChatRoutine } from "../../../../packages/application/src/routine-protocol";
import { mockNicoLayer } from "../../../../packages/application/src/nico-model";
import type {
  Player,
  NicoContentTarget,
  NicoFeedbackReason,
} from "../../../../packages/core/src/types";
import {
  NICO_STORIES,
  nicoEnergyStatus,
} from "../../../../packages/core/src/index";
import * as O from "../../../../packages/foundation/src/option";
import type { PageActions } from "../ui-types";
import { Sender, Area } from "../components/presentation";
import { Button } from "../components/ui/button";

type Target = { kind: NicoContentTarget; id: string };
export function NicoPage({
  controller,
  player,
  now,
  send,
}: {
  controller: GameController;
  player: Player;
  now: number;
  send: PageActions["send"];
}) {
  const energy = nicoEnergyStatus(player.energy, now);
  const [reply, setReply] = useState("Sir, yes, sir. What’s on your mind?");
  const [target, setTarget] = useState<O.Option<Target>>(O.none());
  const [feedback, setFeedback] = useState<O.Option<Target>>(O.none());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  async function chat(text: string) {
    if (!text.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await Effect.runPromise(
        runNicoChatRoutine(controller, text, target).pipe(
          Effect.provide(mockNicoLayer),
        ),
      );
      setReply(response.text);
      setTarget(response.target);
      setDraft("");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Nico could not respond. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (O.isSome(feedback))
    return (
      <section className="focus-screen">
        <h1>Leave this behind.</h1>
        <p>Nico will stop bringing this up.</p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            if (
              send({
                type: "nico-feedback",
                target: feedback.value.kind,
                id: feedback.value.id,
                reason: String(data.get("reason")) as NicoFeedbackReason,
                text: String(data.get("note") || ""),
              })
            ) {
              setFeedback(O.none());
              setTarget(O.none());
              setReply("Understood. I’ll leave that behind.");
            }
          }}
        >
          <label className="field">
            Why?
            <select name="reason" defaultValue="not-for-me">
              <option value="not-for-me">Not for me</option>
              <option value="not-interesting">Not interesting</option>
              <option value="repetitive">Repetitive</option>
              <option value="other">Something else</option>
            </select>
          </label>
          <Area name="note" label="Anything else? (optional)" />
          <div className="focus-actions">
            <Button type="submit">Let it go</Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setFeedback(O.none())}
            >
              Cancel
            </Button>
          </div>
        </form>
      </section>
    );
  const activeStories = NICO_STORIES.filter((story) =>
    player.sidekick.stories.some(
      (record) => record.id === story.id && O.isNone(record.deletedAt),
    ),
  );
  return (
    <section className="focus-screen nico-conversation">
      <h1>Nico Lopez.</h1>
      <p className="nico-energy">
        {energy.unlimited
          ? "Nico energy · Unlimited"
          : `Nico energy ${energy.remaining}/100`}
      </p>
      {energy.sleeping && (
        <p>
          Nico is resting until{" "}
          {new Date(energy.resetsAt).toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          })}
          . You can still ask him to forget something.
        </p>
      )}
      <div className="nico-reply" aria-live="polite">
        <Sender source="niko" />
        <p className="nico-copy">{reply}</p>
        {O.isSome(target) && (
          <Button
            variant="ghost"
            aria-label="Feedback on Nico’s reply"
            onClick={() => setFeedback(target)}
          >
            <ThumbsDown size={18} />
            <span>Not for me</span>
          </Button>
        )}
      </div>
      {error && <p role="alert">{error}</p>}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void chat(draft);
        }}
      >
        <label className="field">
          Talk to Nico
          <textarea
            name="chat"
            rows={3}
            maxLength={2000}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Tell me a story. Or: remember that…"
          />
        </label>
        <Button type="submit" disabled={busy || !draft.trim()}>
          {busy ? "Listening…" : "Send"}
        </Button>
      </form>
      <details className="quiet-details">
        <summary>Stories & a little wisdom</summary>
        <p>
          He rarely talks about his service. Ask about a story if you want to
          hear it.
        </p>
        <div className="nico-story-links">
          {activeStories.map((story) => (
            <Button
              key={story.id}
              variant="ghost"
              disabled={busy || energy.sleeping}
              onClick={() => void chat(`Please tell me ${story.title}`)}
            >
              {story.title}
            </Button>
          ))}
          <Button
            variant="ghost"
            disabled={busy || energy.sleeping}
            onClick={() => void chat("Share a bit of wisdom")}
          >
            A little wisdom
          </Button>
        </div>
      </details>
      <details className="quiet-details">
        <summary>Stories you’ve heard</summary>
        {activeStories
          .filter((story) =>
            player.sidekick.stories.some(
              (record) => record.id === story.id && record.tellingCount > 0,
            ),
          )
          .map((story) => {
            const record = player.sidekick.stories.find(
              (item) => item.id === story.id,
            )!;
            return (
              <article className="nico-memory" key={story.id}>
                <h2>{story.title}</h2>
                <p className="nico-copy">
                  {
                    story.retellings[
                      (record.tellingCount - 1) % story.retellings.length
                    ]
                  }
                </p>
                <Button
                  variant="ghost"
                  onClick={() =>
                    setFeedback(O.some({ kind: "story", id: story.id }))
                  }
                >
                  Let it go
                </Button>
              </article>
            );
          })}
      </details>
      <details className="quiet-details">
        <summary>What Nico remembers</summary>
        {player.sidekick.snippets
          .filter((item) => O.isNone(item.deletedAt))
          .map((item) => (
            <div className="nico-memory" key={item.id}>
              <p>{item.text}</p>
              <Button
                variant="ghost"
                aria-label={`Forget memory: ${item.text}`}
                onClick={() =>
                  setFeedback(O.some({ kind: "memory", id: item.id }))
                }
              >
                Let it go
              </Button>
            </div>
          ))}
        <p>{player.sidekick.reviews.length} recent quest outcomes.</p>
      </details>
      <details className="quiet-details">
        <summary>Nico’s personality</summary>
        {player.sidekick.traits
          .filter((item) => O.isNone(item.deletedAt))
          .map((item) => (
            <div className="nico-memory" key={item.id}>
              <p>{item.text}</p>
              {item.locked ? (
                <span className="nico-fixed">
                  <LockKeyhole size={14} /> Part of who he is
                </span>
              ) : (
                <Button
                  variant="ghost"
                  aria-label={`Forget trait: ${item.text}`}
                  onClick={() =>
                    setFeedback(O.some({ kind: "trait", id: item.id }))
                  }
                >
                  Let it go
                </Button>
              )}
            </div>
          ))}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const text = String(
              new FormData(event.currentTarget).get("trait") || "",
            ).trim();
            if (text && send({ type: "set-nico-trait", text }))
              event.currentTarget.reset();
          }}
        >
          <Area name="trait" label="How should Nico support you?" />
          <Button type="submit">Tell Nico</Button>
        </form>
      </details>
      <Link to="/invite" className="back-link">
        Invite a friend
      </Link>
      <details className="quiet-details">
        <summary>About Nico</summary>
        <p>
          Nico Lopez is a fictional veteran and your guide in life. His stories
          belong to the character. You’re the hero.
        </p>
        <p>
          His replies currently use a local simulator. Memories and choices are
          saved in this browser.
        </p>
      </details>
    </section>
  );
}
