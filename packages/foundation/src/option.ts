/** fp-ts-inspired algebraic absence. No sentinel escapes this boundary. */
export type Option<A> =
  Readonly<{ _tag: "None" }> | Readonly<{ _tag: "Some"; value: A }>;
const empty: Option<never> = Object.freeze({ _tag: "None" });
export const none = <A = never>(): Option<A> => empty;
export const some = <A>(value: A): Option<A> => ({ _tag: "Some", value });
export const isSome = <A>(
  option: Option<A>,
): option is Readonly<{ _tag: "Some"; value: A }> => option._tag === "Some";
export const isNone = <A>(
  option: Option<A>,
): option is Readonly<{ _tag: "None" }> => option._tag === "None";
export const fromNullable = <A>(value: A): Option<NonNullable<A>> =>
  value == null ? none() : some(value as NonNullable<A>);
export const map = <A, B>(option: Option<A>, f: (value: A) => B): Option<B> =>
  isSome(option) ? some(f(option.value)) : none();
export const flatMap = <A, B>(
  option: Option<A>,
  f: (value: A) => Option<B>,
): Option<B> => (isSome(option) ? f(option.value) : none());
export const match = <A, B>(
  option: Option<A>,
  onNone: () => B,
  onSome: (value: A) => B,
): B => (isSome(option) ? onSome(option.value) : onNone());
export const getOrElse = <A>(option: Option<A>, fallback: () => A): A =>
  match(option, fallback, (value) => value);
export const filter = <A>(
  option: Option<A>,
  predicate: (value: A) => boolean,
): Option<A> => (isSome(option) && predicate(option.value) ? option : none());
export const all = <A>(options: readonly Option<A>[]): Option<readonly A[]> =>
  options.reduce<Option<readonly A[]>>(
    (acc, current) =>
      flatMap(acc, (values) => map(current, (value) => [...values, value])),
    some([]),
  );
