import * as E from "../../foundation/src/either";

const PROJECT_REFERENCE = /^[A-Za-z0-9]+$/;

declare const directDatabaseUrlBrand: unique symbol;

/** Direct Postgres address. Only a successful parse produces one. */
export type DirectDatabaseUrl = string & {
  readonly [directDatabaseUrlBrand]: "DirectDatabaseUrl";
};

export type DatabaseUrlError =
  | { readonly _tag: "MissingProjectReference" }
  | { readonly _tag: "BlankProjectReference" }
  | { readonly _tag: "InvalidProjectReference" }
  | { readonly _tag: "MissingPassword" }
  | { readonly _tag: "BlankPassword" };

declare const projectReferenceBrand: unique symbol;

type ProjectReference = string & {
  readonly [projectReferenceBrand]: "ProjectReference";
};

function parseProjectReference(
  raw: string,
): E.Either<DatabaseUrlError, ProjectReference> {
  if (raw.trim().length === 0) return E.left({ _tag: "BlankProjectReference" });
  if (!PROJECT_REFERENCE.test(raw))
    return E.left({ _tag: "InvalidProjectReference" });
  return E.right(raw as ProjectReference);
}

function parsePassword(raw: string): E.Either<DatabaseUrlError, string> {
  if (raw.trim().length === 0) return E.left({ _tag: "BlankPassword" });
  return E.right(raw);
}

/** Percent-encode every reserved character so it cannot change the address. */
function encodePassword(password: string): string {
  return encodeURIComponent(password).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function seal(address: string): DirectDatabaseUrl {
  return address as DirectDatabaseUrl;
}

/**
 * Server-only direct address:
 * postgresql://postgres:<encoded>@db.<project-ref>.supabase.co:5432/postgres
 * Does not connect, and does not read the process environment.
 */
export function directDatabaseUrl(input: {
  readonly projectReference: string;
  readonly password: string;
}): E.Either<DatabaseUrlError, DirectDatabaseUrl> {
  const projectReference = parseProjectReference(input.projectReference);
  if (projectReference._tag === "Left") return projectReference;
  const password = parsePassword(input.password);
  if (password._tag === "Left") return password;
  return E.right(
    seal(
      `postgresql://postgres:${encodePassword(password.right)}@db.${projectReference.right}.supabase.co:5432/postgres`,
    ),
  );
}

/** Reads the two encrypted values from the object the caller passes. */
export function readDirectDatabaseUrl(env: {
  readonly SUPABASE_PROJECT_REF?: string;
  readonly SUPABASE_DB_PASSWORD?: string;
}): E.Either<DatabaseUrlError, DirectDatabaseUrl> {
  const projectReference = env.SUPABASE_PROJECT_REF;
  const password = env.SUPABASE_DB_PASSWORD;
  if (projectReference === undefined)
    return E.left({ _tag: "MissingProjectReference" });
  if (password === undefined) return E.left({ _tag: "MissingPassword" });
  return directDatabaseUrl({ projectReference, password });
}
