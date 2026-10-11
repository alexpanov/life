/** fp-ts-inspired typed synchronous success/failure. */
export type Either<E, A> =
  Readonly<{ _tag: "Left"; left: E }> | Readonly<{ _tag: "Right"; right: A }>;
export const left = <E>(error: E): Either<E, never> => ({
  _tag: "Left",
  left: error,
});
export const right = <A>(value: A): Either<never, A> => ({
  _tag: "Right",
  right: value,
});
export const isRight = <E, A>(
  value: Either<E, A>,
): value is Readonly<{ _tag: "Right"; right: A }> => value._tag === "Right";
export const map = <E, A, B>(
  value: Either<E, A>,
  f: (value: A) => B,
): Either<E, B> => (isRight(value) ? right(f(value.right)) : value);
export const mapLeft = <E, A, F>(
  value: Either<E, A>,
  f: (error: E) => F,
): Either<F, A> => (isRight(value) ? value : left(f(value.left)));
export const flatMap = <E, A, F, B>(
  value: Either<E, A>,
  f: (value: A) => Either<F, B>,
): Either<E | F, B> => (isRight(value) ? f(value.right) : value);
export const match = <E, A, B>(
  value: Either<E, A>,
  onLeft: (error: E) => B,
  onRight: (value: A) => B,
): B => (isRight(value) ? onRight(value.right) : onLeft(value.left));
export function tryCatch<E, A>(
  run: () => A,
  onError: (cause: unknown) => E,
): Either<E, A> {
  try {
    return right(run());
  } catch (cause) {
    return left(onError(cause));
  }
}
