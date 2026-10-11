import { Link } from "react-router";
import { useState } from "react";
import { browserIsOnline, useBrowserOnline } from "../connectivity";
import {
  useForm,
  type Resolver,
  type FieldValues,
  type FieldErrors,
} from "react-hook-form";
import {
  nicoChatForm,
  nicoFeedbackForm,
  nicoTraitForm,
  type FormDefinition,
} from "../../../../packages/core/src/forms";
import * as E from "../../../../packages/foundation/src/either";
import { Effect, type Layer } from "effect";
import { ThumbsDown, LockKeyhole } from "lucide-react";
import type { GameController } from "../../../../packages/application/src/controller";
import { runNicoChatRoutine } from "../../../../packages/application/src/routine-protocol";
import {
  mockNicoLayer,
  type NicoModel,
} from "../../../../packages/application/src/nico-model";
import type {
  Player,
  NicoContentTarget,
  DeepReadonly,
} from "../../../../packages/core/src/types";
import {
  NICO_STORIES,
  nicoEnergyStatus,
} from "../../../../packages/core/src/index";
import * as O from "../../../../packages/foundation/src/option";
import type { PageActions } from "../ui-types";
import { Sender } from "../components/presentation";
import { Button } from "../components/ui/button";
import { Body, H1, H4 } from "../../../../packages/design/src/type";

function formResolver<T extends FieldValues>(
  definition: FormDefinition<T>,
): Resolver<T> {
  return (values) => {
    const result = definition.parse(values);
    if (E.isRight(result)) return { values: result.right, errors: {} };
    const errors = Object.fromEntries(
      result.left.map((issue) => [
        issue.field,
        { type: "validation", message: issue.message },
      ]),
    ) as FieldErrors<T>;
    return { values: {}, errors };
  };
}

type Target = { kind: NicoContentTarget; id: string };
export function NicoPage({
  controller,
  player,
  now,
  send,
  modelLayer = mockNicoLayer,
}: {
  modelLayer?: Layer.Layer<NicoModel>;
  controller: GameController;
  player: DeepReadonly<Player>;
  now: number;
  send: PageActions["send"];
}) {
  const online = useBrowserOnline();
  const energy = nicoEnergyStatus(player.energy, now);
  const [reply, setReply] = useState("Sir, yes, sir. What’s on your mind?");
  const [target, setTarget] = useState<O.Option<Target>>(O.none());
  const [feedback, setFeedback] = useState<O.Option<Target>>(O.none());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const chatForm = useForm({
    defaultValues: { chat: "" },
    resolver: formResolver(nicoChatForm),
  });
  const feedbackForm = useForm({
    defaultValues: { reason: "not-for-me" as const, note: "" },
    resolver: formResolver(nicoFeedbackForm),
  });
  const traitForm = useForm({
    defaultValues: { trait: "" },
    resolver: formResolver(nicoTraitForm),
  });
  async function chat(text: string) {
    if (!text.trim() || busy || !browserIsOnline()) return;
    setBusy(true);
    setError("");
    try {
      const response = await Effect.runPromise(
        runNicoChatRoutine(controller, text, target).pipe(
          Effect.provide(modelLayer),
        ),
      );
      setReply(response.text);
      setTarget(response.target);
      chatForm.reset();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Niko could not respond. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (O.isSome(feedback))
    return (
      <section className="focus-screen">
        <H1>Leave this behind.</H1>
        <p>Niko will stop bringing this up.</p>
        <form
          noValidate
          onSubmit={feedbackForm.handleSubmit((values) => {
            if (
              send({
                type: "nico-feedback",
                target: feedback.value.kind,
                id: feedback.value.id,
                reason: values.reason,
                text: values.note,
              })
            ) {
              feedbackForm.reset();
              setFeedback(O.none());
              setTarget(O.none());
              setReply("Understood. I’ll leave that behind.");
            }
          })}
        >
          <label className="field">
            Why?
            <select {...feedbackForm.register("reason")}>
              <option value="not-for-me">Not for me</option>
              <option value="not-interesting">Not interesting</option>
              <option value="repetitive">Repetitive</option>
              <option value="other">Something else</option>
            </select>
          </label>
          <label className="field">
            Anything else? (optional)
            <textarea
              rows={3}
              {...feedbackForm.register("note")}
              aria-invalid={!!feedbackForm.formState.errors.note}
              aria-describedby="feedback-note-error"
            />
          </label>
          {feedbackForm.formState.errors.note && (
            <p id="feedback-note-error" role="alert">
              {feedbackForm.formState.errors.note.message}
            </p>
          )}
          {feedbackForm.formState.errors.reason && (
            <p role="alert">{feedbackForm.formState.errors.reason.message}</p>
          )}
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
      <H1>Niko Gonzalez.</H1>
      <p className="nico-energy">
        {energy.unlimited
          ? "Niko energy · Unlimited"
          : `Niko energy ${energy.remaining}/100`}
      </p>
      <p role="status" style={{ minHeight: "3em" }}>
        {online
          ? "Your quests and notes stay saved on this device."
          : "You’re offline. Niko is resting. Your quests and notes are still here."}
      </p>
      {energy.sleeping && (
        <p>
          Niko is resting until{" "}
          {new Date(energy.resetsAt).toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          })}
          . You can still ask him to forget something.
        </p>
      )}
      <div className="nico-reply" aria-live="polite">
        <Sender source="niko" />
        <Body voice="companion">{reply}</Body>
        {O.isSome(target) && (
          <Button
            variant="ghost"
            aria-label="Feedback on Niko’s reply"
            onClick={() => setFeedback(target)}
          >
            <ThumbsDown size={18} />
            <span>Not for me</span>
          </Button>
        )}
      </div>
      {error && <p role="alert">{error}</p>}
      <form
        noValidate
        onSubmit={chatForm.handleSubmit((values) => chat(values.chat))}
      >
        <label className="field">
          Talk to Niko
          <textarea
            {...chatForm.register("chat")}
            rows={3}
            readOnly={!online}
            aria-disabled={!online}
            aria-invalid={!!chatForm.formState.errors.chat}
            aria-describedby="chat-error"
            placeholder="Tell me a story. Or: remember that…"
          />
        </label>
        {chatForm.formState.errors.chat && (
          <p id="chat-error" role="alert">
            {chatForm.formState.errors.chat.message}
          </p>
        )}
        <Button type="submit" disabled={busy || !online}>
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
              disabled={busy || energy.sleeping || !online}
              onClick={() => void chat(`Please tell me ${story.title}`)}
            >
              {story.title}
            </Button>
          ))}
          <Button
            variant="ghost"
            disabled={busy || energy.sleeping || !online}
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
                <H4>{story.title}</H4>
                <Body voice="companion">
                  {
                    story.retellings[
                      (record.tellingCount - 1) % story.retellings.length
                    ]
                  }
                </Body>
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
        <summary>What Niko remembers</summary>
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
        <summary>Niko’s personality</summary>
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
          noValidate
          onSubmit={traitForm.handleSubmit((values) => {
            if (send({ type: "set-nico-trait", text: values.trait }))
              traitForm.reset();
          })}
        >
          <label className="field">
            How should Niko support you?
            <textarea
              rows={3}
              {...traitForm.register("trait")}
              aria-invalid={!!traitForm.formState.errors.trait}
              aria-describedby="trait-error"
            />
          </label>
          {traitForm.formState.errors.trait && (
            <p id="trait-error" role="alert">
              {traitForm.formState.errors.trait.message}
            </p>
          )}
          <Button type="submit">Tell Niko</Button>
        </form>
      </details>
      <Link to="/powerups" className="back-link">
        Power-ups
      </Link>
      <Link to="/invite" className="back-link">
        Invite a friend
      </Link>
      <details className="quiet-details">
        <summary>About Niko</summary>
        <p>
          Niko Gonzalez is a fictional veteran and your guide in life. His
          stories belong to the character. You’re the hero.
        </p>
        <p>
          Replies use a simulator until a model is configured. Memories and
          choices are saved in this browser.
        </p>
      </details>
    </section>
  );
}
