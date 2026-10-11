import { useState } from "react";
import { Link } from "react-router";
import { useForm, type Resolver, type FieldErrors } from "react-hook-form";
import type { Player, DeepReadonly } from "../../../../packages/core/src/types";
import { activeNicoPowerup } from "../../../../packages/core/src/powerups";
import {
  powerupForm,
  type PowerupFormValues,
} from "../../../../packages/core/src/powerup-form";
import * as O from "../../../../packages/foundation/src/option";
import * as E from "../../../../packages/foundation/src/either";
import type { PageActions } from "../ui-types";
import { Button } from "../../../../packages/design/src/index";
import { H1 } from "../../../../packages/design/src/type";

const resolver: Resolver<PowerupFormValues> = (values) => {
  const parsed = powerupForm.parse(values);
  return E.isRight(parsed)
    ? { values: parsed.right, errors: {} }
    : {
        values: {},
        errors: Object.fromEntries(
          parsed.left.map((issue) => [
            issue.field,
            { type: "validation", message: issue.message },
          ]),
        ) as FieldErrors<PowerupFormValues>,
      };
};
type View =
  { kind: "list" } | { kind: "create" } | { kind: "detail"; id: string };
export function PowerupsPage({
  player,
  now,
  send,
}: {
  player: DeepReadonly<Player>;
  now: number;
  send: PageActions["send"];
}) {
  const [view, setView] = useState<View>({ kind: "list" });
  const [status, setStatus] = useState("");
  const form = useForm<PowerupFormValues>({
    defaultValues: { name: "", description: "", context: "", instructions: "" },
    resolver,
  });
  const active = activeNicoPowerup(player.sidekick, now);
  const selected =
    view.kind === "detail"
      ? O.fromNullable(
          player.sidekick.powerups.instances.find(
            (item) => item.id === view.id,
          ),
        )
      : O.none();
  const back = () => {
    setView({ kind: "list" });
    setStatus("");
  };
  if (view.kind === "create")
    return (
      <section className="focus-screen">
        <H1>Make a power-up.</H1>
        <p>Give Niko a useful approach for one reply.</p>
        <form
          onSubmit={form.handleSubmit((values) => {
            if (send({ type: "create-powerup", ...values })) {
              form.reset();
              setView({ kind: "list" });
              setStatus("Power-up saved. Choose it when you need it.");
            }
          })}
          noValidate
        >
          <label className="field">
            Name
            <input
              {...form.register("name")}
              aria-invalid={!!form.formState.errors.name}
              aria-describedby="powerup-name-error"
            />
          </label>
          {form.formState.errors.name && (
            <p id="powerup-name-error" role="alert">
              {form.formState.errors.name.message}
            </p>
          )}
          <label className="field">
            How should Niko help?
            <textarea
              {...form.register("instructions")}
              aria-invalid={!!form.formState.errors.instructions}
              aria-describedby="powerup-instructions-error"
            />
          </label>
          {form.formState.errors.instructions && (
            <p id="powerup-instructions-error" role="alert">
              {form.formState.errors.instructions.message}
            </p>
          )}
          <details className="quiet-details">
            <summary>Add context (optional)</summary>
            <label className="field">
              Short description
              <input
                {...form.register("description")}
                aria-invalid={!!form.formState.errors.description}
              />
            </label>
            <label className="field">
              Useful background
              <textarea
                {...form.register("context")}
                aria-invalid={!!form.formState.errors.context}
              />
            </label>
          </details>
          {form.formState.errors.description && (
            <p role="alert">{form.formState.errors.description.message}</p>
          )}
          {form.formState.errors.context && (
            <p role="alert">{form.formState.errors.context.message}</p>
          )}
          <div className="actions">
            <Button type="submit">Save power-up</Button>
            <Button type="button" variant="ghost" onClick={back}>
              Back
            </Button>
          </div>
        </form>
      </section>
    );
  if (O.isSome(selected)) {
    const item = selected.value;
    const isActive = O.isSome(active) && active.value.id === item.id;
    return (
      <section className="focus-screen">
        <H1>{item.template.name}</H1>
        <p>{item.template.description}</p>
        <p>{item.template.context}</p>
        <p>
          Applies to Niko’s next successful reply within 30 minutes. Activating
          or cancelling does not spend its one use.
        </p>
        <details className="quiet-details">
          <summary>What Niko will use</summary>
          <p>{item.template.instructions}</p>
        </details>
        {status && <p role="status">{status}</p>}
        {item.charges === 0 && <p>Used. Your saved instructions stay here.</p>}
        <div className="actions">
          {isActive ? (
            <Button
              onClick={() => {
                if (send({ type: "deactivate-powerup" }))
                  setStatus("Cancelled. Your use is still available.");
              }}
            >
              Cancel power-up
            </Button>
          ) : (
            <Button
              disabled={item.charges === 0}
              onClick={() => {
                if (send({ type: "activate-powerup", id: item.id }))
                  setStatus("Ready for your next reply from Niko.");
              }}
            >
              Activate
            </Button>
          )}
          <Button variant="ghost" onClick={back}>
            Back
          </Button>
        </div>
        {isActive && (
          <Link className="back-link" to="/nico">
            Talk to Niko
          </Link>
        )}
      </section>
    );
  }
  return (
    <section className="focus-screen">
      <Link className="back-link" to="/nico">
        Back to Niko
      </Link>
      <H1>Power-ups.</H1>
      <p>A useful change of approach. Each has one use.</p>
      {O.isSome(active) && (
        <p role="status">Ready: {active.value.template.name}</p>
      )}
      {status && <p role="status">{status}</p>}
      <div className="focus-list">
        {player.sidekick.powerups.instances.map((item) => (
          <Button
            key={item.id}
            variant="ghost"
            onClick={() => {
              setStatus("");
              setView({ kind: "detail", id: item.id });
            }}
          >
            {item.template.name}
            {item.charges === 0 ? " · Used" : ""}
          </Button>
        ))}
      </div>
      <Button
        onClick={() => {
          setStatus("");
          setView({ kind: "create" });
        }}
      >
        Make a power-up
      </Button>
    </section>
  );
}
