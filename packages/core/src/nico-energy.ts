import * as O from "../../foundation/src/option";
import type {
  NicoEnergy,
  VerifiedReferralReceipt,
  DeepReadonly,
} from "./types";
export const NICO_DAILY_ENERGY = 100;
export const NICO_REFERRAL_DAYS = 30;
const DAY = 86400000;
const dayOf = (now: number) => Math.floor(now / DAY);
/** Local prototype accounting; authorization and verified receipts belong on the server. */
export function createNicoEnergy(
  referralCode: string,
  now: number,
): NicoEnergy {
  return {
    day: dayOf(now),
    requestIds: [],
    referralCode,
    accessUntil: O.none(),
    verifiedReceiptIds: [],
    creditedHeroIds: [],
  };
}
export function nicoEnergyStatus(
  energy: DeepReadonly<NicoEnergy>,
  now: number,
) {
  const unlimited =
    O.isSome(energy.accessUntil) && now < energy.accessUntil.value;
  // A backwards clock must not reset a spent quota.
  const used = dayOf(now) > energy.day ? 0 : energy.requestIds.length;
  const remaining = unlimited
    ? NICO_DAILY_ENERGY
    : Math.max(0, NICO_DAILY_ENERGY - used);
  return {
    tier: unlimited ? ("Vanguard" as const) : ("Field" as const),
    remaining,
    unlimited,
    sleeping: !unlimited && remaining === 0,
    resetsAt: (Math.max(dayOf(now), energy.day) + 1) * DAY,
  };
}
export function consumeNicoEnergy(
  input: DeepReadonly<NicoEnergy>,
  requestId: string,
  now: number,
): NicoEnergy {
  if (!requestId.trim() || requestId.length > 200)
    throw Error("A valid interaction ID is required.");
  const energy: NicoEnergy = {
    ...input,
    requestIds: [...input.requestIds],
    verifiedReceiptIds: [...input.verifiedReceiptIds],
    creditedHeroIds: [...input.creditedHeroIds],
  };
  if (dayOf(now) > energy.day) {
    energy.day = dayOf(now);
    energy.requestIds = [];
  }
  if (energy.requestIds.includes(requestId)) return energy;
  const status = nicoEnergyStatus(energy, now);
  if (status.sleeping)
    throw Error("Niko is resting. Energy returns at the next daily reset.");
  if (!status.unlimited) energy.requestIds.push(requestId);
  return energy;
}
/** Call only with a receipt authenticated by the phone-verification repository.
 * This function is deliberately absent from Command and the LLM protocol. */
export function grantVerifiedReferral(
  input: DeepReadonly<NicoEnergy>,
  heroId: string,
  receipt: VerifiedReferralReceipt,
  now: number,
): NicoEnergy {
  if (
    !receipt.receiptId.trim() ||
    receipt.receiptId.length > 200 ||
    receipt.referrerHeroId !== heroId ||
    !receipt.referredHeroId.trim() ||
    receipt.referredHeroId === heroId ||
    !Number.isFinite(receipt.phoneVerifiedAt) ||
    receipt.phoneVerifiedAt < 0 ||
    receipt.phoneVerifiedAt > now
  )
    throw Error("Invalid verified referral receipt.");
  const energy: NicoEnergy = {
    ...input,
    requestIds: [...input.requestIds],
    verifiedReceiptIds: [...input.verifiedReceiptIds],
    creditedHeroIds: [...input.creditedHeroIds],
  };
  if (
    energy.verifiedReceiptIds.includes(receipt.receiptId) ||
    energy.creditedHeroIds.includes(receipt.referredHeroId)
  )
    return energy;
  if (energy.verifiedReceiptIds.length >= 1000)
    throw Error("Referral receipt archive is full.");
  energy.verifiedReceiptIds.push(receipt.receiptId);
  energy.creditedHeroIds.push(receipt.referredHeroId);
  const expiresAt = receipt.phoneVerifiedAt + NICO_REFERRAL_DAYS * DAY;
  energy.accessUntil = O.some(
    Math.max(
      expiresAt,
      O.getOrElse(energy.accessUntil, () => 0),
    ),
  );
  return energy;
}
