import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  type HTMLAttributes,
  type ReactNode,
} from "react";

const PageTitles = createContext<Set<string> | null>(null);

/** Mount once around the app. Header one then warns if a second one appears. */
export function Typography({ children }: { children: ReactNode }) {
  const titles = useRef(new Set<string>());
  return (
    <PageTitles.Provider value={titles.current}>{children}</PageTitles.Provider>
  );
}

type Voice = "companion";

type Marks = {
  b?: boolean;
  i?: boolean;
  voice?: Voice;
};

function classes(role: string, voice: Voice | undefined, className?: string) {
  return [role, voice === "companion" ? "type-companion" : "", className]
    .filter((part) => part)
    .join(" ");
}

function marks(b: boolean | undefined, i: boolean | undefined) {
  return {
    "data-b": b ? "true" : undefined,
    "data-i": i ? "true" : undefined,
  };
}

type HeadingProps = Marks &
  Omit<HTMLAttributes<HTMLHeadingElement>, "style" | "color">;

export function H1(props: HeadingProps) {
  const ref = useRef<HTMLHeadingElement>(null);
  const titles = useContext(PageTitles);
  const id = useId();
  useEffect(() => {
    const node = ref.current;
    if (titles == null || node == null) return;
    if (node.closest("[inert], [hidden]")) return;
    titles.add(id);
    if (titles.size > 1)
      console.error(
        "Header one is the page subject. Mount one header one, or none.",
      );
    return () => {
      titles.delete(id);
    };
  }, [id, titles]);
  return <Heading level={1} headingRef={ref} {...props} />;
}

export function H2(props: HeadingProps) {
  return <Heading level={2} {...props} />;
}

export function H3(props: HeadingProps) {
  return <Heading level={3} {...props} />;
}

export function H4(props: HeadingProps) {
  return <Heading level={4} {...props} />;
}

export function H5(props: HeadingProps) {
  return <Heading level={5} {...props} />;
}

const tags = { 1: "h1", 2: "h2", 3: "h3", 4: "h4", 5: "h5" } as const;

function Heading({
  level,
  b,
  i,
  voice,
  className,
  headingRef,
  ...props
}: HeadingProps & {
  level: 1 | 2 | 3 | 4 | 5;
  headingRef?: { current: HTMLHeadingElement | null };
}) {
  const Tag = tags[level];
  return (
    <Tag
      ref={headingRef}
      className={classes(`type-h${level}`, voice, className)}
      {...marks(b, i)}
      {...props}
    />
  );
}

type BodyProps = Marks &
  Omit<HTMLAttributes<HTMLParagraphElement>, "style" | "color">;

/** Reading text. Libre Baskerville. `b` bolds. `i` italicizes. */
export function Body({ b, i, voice, className, ...props }: BodyProps) {
  return (
    <p
      className={classes("type-body", voice, className)}
      {...marks(b, i)}
      {...props}
    />
  );
}

type LabelProps = Marks &
  Omit<HTMLAttributes<HTMLSpanElement>, "style" | "color">;

/** Controls, eyebrows, and navigation. The face without serifs. */
export function Label({ b, i, voice, className, ...props }: LabelProps) {
  return (
    <span
      className={classes("type-label", voice, className)}
      {...marks(b, i)}
      {...props}
    />
  );
}
