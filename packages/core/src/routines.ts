import { Effect } from "effect";
import * as E from "../../foundation/src/either";
import {
  newGame,
  restoreGame,
  transition,
  type Command,
  type Snapshot,
  type TransitionContext,
  type TransitionResult,
  type GameState,
} from "./index";
export class DomainError extends Error {
  readonly _tag = "DomainError";
  constructor(message: string) {
    super(message);
    this.name = "DomainError";
  }
}
const failure = (cause: unknown) =>
  new DomainError(
    cause instanceof Error ? cause.message : "Invalid game operation.",
  );
export const transitionEither = (
  state: Snapshot,
  command: Command,
  context: TransitionContext,
): E.Either<DomainError, TransitionResult> =>
  E.tryCatch(() => transition(state, command, context), failure);
export const executeRoutine = (
  state: Snapshot,
  command: Command,
  context: TransitionContext,
): Effect.Effect<TransitionResult, DomainError> =>
  Effect.suspend(() => {
    const result = transitionEither(state, command, context);
    return E.isRight(result)
      ? Effect.succeed(result.right)
      : Effect.fail(result.left);
  });
export const restoreRoutine = (
  data: unknown,
  context: TransitionContext,
): Effect.Effect<GameState, DomainError> =>
  Effect.try({ try: () => restoreGame(data, context), catch: failure });
export const startRoutine = (
  context: TransitionContext,
  name = "Player 1",
): Effect.Effect<GameState, DomainError> =>
  Effect.try({ try: () => newGame(context, name), catch: failure });
