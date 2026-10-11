import type { Prisma } from "../generated/prisma/client";
import * as E from "../../../foundation/src/either";
import * as O from "../../../foundation/src/option";
import {
  GAME_SAVE_OCTET_LIMIT,
  type GameSave,
  type GameSaveSlot,
} from "./game-save-repository";

/** Fields the parser needs. A renamed or removed column fails here at compile time. */
export const gameSaveSelect = {
  slot: true,
  payload: true,
  backupPayload: true,
  backupPresent: true,
} satisfies Prisma.GameSaveSelect;

export type GameSaveSelected = Prisma.GameSaveGetPayload<{
  select: typeof gameSaveSelect;
}>;

const octets = (value: string): number =>
  new TextEncoder().encode(value).length;

/** Payload in, the same string out when it is a JSON object within 1 MiB. */
export function parseGameSavePayload(
  value: string,
): E.Either<string, string> {
  if (value === "") return E.left("The save payload is empty.");
  if (octets(value) > GAME_SAVE_OCTET_LIMIT)
    return E.left("The save payload is larger than 1 MiB.");
  return jsonObject(value, "The save payload is not a JSON object.");
}

function jsonObject(
  value: string,
  message: string,
): E.Either<string, string> {
  const parsed = E.tryCatch(
    (): unknown => JSON.parse(value),
    () => message,
  );
  if (!E.isRight(parsed)) return parsed;
  const body: unknown = parsed.right;
  if (typeof body !== "object" || body === null || Array.isArray(body))
    return E.left(message);
  return E.right(value);
}

function parseSlot(slot: string): E.Either<string, GameSaveSlot> {
  if (slot === "game" || slot === "starter") return E.right(slot);
  return E.left("The save slot is not game or starter.");
}

/**
 * Absent backup is an empty string. Present backup is a JSON object within 1 MiB.
 * Anything else breaks the database rule.
 */
function parseBackup(
  present: boolean,
  payload: string,
): E.Either<string, O.Option<string>> {
  if (!present) {
    if (payload !== "")
      return E.left("The save backup does not match its flag.");
    return E.right(O.none());
  }
  if (payload === "") return E.left("The save backup does not match its flag.");
  if (octets(payload) > GAME_SAVE_OCTET_LIMIT)
    return E.left("The save backup is larger than 1 MiB.");
  const parsed = jsonObject(
    payload,
    "The save backup is not a JSON object.",
  );
  if (!E.isRight(parsed)) return parsed;
  return E.right(O.some(parsed.right));
}

/** Row in, domain save out. A missing backup becomes None. */
export function parseGameSave(
  row: GameSaveSelected,
): E.Either<string, GameSave> {
  const slot = parseSlot(row.slot);
  if (!E.isRight(slot)) return slot;
  const payload = parseGameSavePayload(row.payload);
  if (!E.isRight(payload)) return payload;
  const backup = parseBackup(row.backupPresent, row.backupPayload);
  if (!E.isRight(backup)) return backup;
  return E.right({
    slot: slot.right,
    payload: payload.right,
    backup: backup.right,
  });
}
