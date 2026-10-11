import { z } from "zod";
import * as E from "../../foundation/src/either";
import * as O from "../../foundation/src/option";
import { unit, type Unit } from "../../foundation/src/unit";

const PUBLISHABLE_PREFIX = "sb_publishable_";
const SERVER_SECRET_NAMES = [
  "DATABASE_URL",
  "SUPABASE_DB_PASSWORD",
  "SUPABASE_DEV_DB_PASSWORD",
  "SUPABASE_LIVE_DB_PASSWORD",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;
const CLIENT_PREFIXES = ["VITE_", "EXPO_PUBLIC_"] as const;
const FORBIDDEN_CLIENT_NAME = [
  "SERVICE_ROLE",
  "DB_PASSWORD",
  "DATABASE_URL",
  "SECRET_KEY",
] as const;

export interface PublicSupabaseConfig {
  readonly url: string;
  readonly anonKey: string;
}

export type CloudConfig =
  | { readonly _tag: "local" }
  | { readonly _tag: "refused"; readonly reason: string }
  | { readonly _tag: "ready"; readonly config: PublicSupabaseConfig };

const text = z.string().trim().min(1).max(4096);

function jwtPayload(token: string): O.Option<unknown> {
  const parts = token.split(".");
  if (parts.length !== 3) return O.none();
  const body = parts[1];
  if (!body) return O.none();
  const decoded = E.tryCatch(() => {
    const padded =
      body.replace(/-/g, "+").replace(/_/g, "/") +
      "===".slice((body.length + 3) % 4);
    const json: unknown = JSON.parse(atob(padded));
    return json;
  }, () => "unreadable");
  if (decoded._tag === "Left") return O.none();
  return O.some(decoded.right);
}

function jwtRole(token: string): O.Option<string> {
  const payload = jwtPayload(token);
  if (O.isNone(payload)) return O.none();
  const parsed = z.object({ role: z.string() }).safeParse(payload.value);
  if (!parsed.success) return O.none();
  return O.some(parsed.data.role);
}

function anonKeyRefusal(key: string): O.Option<string> {
  if (key.startsWith("sb_secret_"))
    return O.some("The browser key is a secret key.");
  if (/postgres(ql)?:\/\//i.test(key))
    return O.some("The browser key is a database URL.");
  const role = jwtRole(key);
  if (O.isSome(role)) {
    if (role.value === "service_role")
      return O.some("The browser key is a service-role key.");
    if (role.value !== "anon")
      return O.some("The browser key is not the public anon key.");
    return O.none();
  }
  if (!key.startsWith(PUBLISHABLE_PREFIX) || /\s/.test(key))
    return O.some("The browser key is not a public anon key.");
  return O.none();
}

function projectUrl(raw: string): E.Either<string, string> {
  const parsed = E.tryCatch(
    () => new URL(raw),
    () => "The project URL is not a URL.",
  );
  if (parsed._tag === "Left") return parsed;
  if (parsed.right.protocol !== "https:")
    return E.left("The project URL must use HTTPS.");
  if (parsed.right.username !== "" || parsed.right.password !== "")
    return E.left("The project URL contains a password.");
  return E.right(parsed.right.origin);
}

/** Local when both public values are absent. Refuses a service-role key or a database secret. */
export function readCloudConfig(input: {
  readonly url: unknown;
  readonly anonKey: unknown;
}): CloudConfig {
  const url = text.safeParse(input.url);
  const anonKey = text.safeParse(input.anonKey);
  if (!url.success && !anonKey.success) return { _tag: "local" };
  if (!url.success || !anonKey.success)
    return {
      _tag: "refused",
      reason:
        "Cloud save needs both the public project URL and the public anon key.",
    };
  const origin = projectUrl(url.data);
  if (origin._tag === "Left") return { _tag: "refused", reason: origin.left };
  const refusal = anonKeyRefusal(anonKey.data);
  if (O.isSome(refusal)) return { _tag: "refused", reason: refusal.value };
  return {
    _tag: "ready",
    config: { url: origin.right, anonKey: anonKey.data },
  };
}

/** Fails the build before a forbidden value can be written into the page. */
export function assertBrowserBuildEnv(
  env: Readonly<Record<string, string | undefined>>,
): E.Either<string, Unit> {
  const secrets = SERVER_SECRET_NAMES.flatMap((name) => {
    const value = env[name];
    return value && value.length >= 8 ? [value] : [];
  });
  for (const [name, value] of Object.entries(env)) {
    if (!value) continue;
    if (!CLIENT_PREFIXES.some((prefix) => name.startsWith(prefix))) continue;
    if (FORBIDDEN_CLIENT_NAME.some((marker) => name.includes(marker)))
      return E.left(
        "Refusing to build. A database password or service-role key was placed in a browser variable.",
      );
    if (secrets.some((secret) => value === secret || value.includes(secret)))
      return E.left(
        "Refusing to build. A database password or service-role key was placed in a browser variable.",
      );
    if (value.startsWith("sb_secret_") || /postgres(ql)?:\/\//i.test(value))
      return E.left(
        "Refusing to build. A database password or service-role key was placed in a browser variable.",
      );
    const role = value.startsWith("eyJ") ? jwtRole(value) : O.none();
    if (O.isSome(role) && role.value === "service_role")
      return E.left(
        "Refusing to build. A database password or service-role key was placed in a browser variable.",
      );
  }
  const cloud = readCloudConfig({
    url: env["VITE_SUPABASE_URL"],
    anonKey: env["VITE_SUPABASE_ANON_KEY"],
  });
  if (cloud._tag === "refused") return E.left(cloud.reason);
  return E.right(unit);
}
