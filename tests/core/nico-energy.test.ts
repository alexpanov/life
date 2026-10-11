import { expect, it } from "vitest";
import {
  newGame,
  transition,
  serializeGame,
  restoreGame,
  nicoEnergyStatus,
  consumeNicoEnergy,
  grantVerifiedReferral,
  selectGame,
  type VerifiedReferralReceipt,
} from "../../packages/core/src/index";
import * as O from "../../packages/foundation/src/option";
const now = 1800000000000;
const ctx = { now, eventId: "energy", localDay: "2027-01-15" };
const fresh = () => newGame(ctx);
const receipt = (referrerHeroId: string): VerifiedReferralReceipt => ({
  receiptId: "verified-receipt",
  referrerHeroId,
  referredHeroId: "different-hero",
  phoneVerifiedAt: now,
});
it("gives each hero 100 daily interactions separately from XP", () => {
  const state = fresh();
  const hero = state.players[0]!;
  expect(hero.energy.referralCode).not.toContain(hero.id);
  expect(nicoEnergyStatus(hero.energy, now)).toMatchObject({
    tier: "Field",
    remaining: 100,
    sleeping: false,
  });
  let next = state;
  for (let i = 0; i < 100; i++)
    next = transition(
      next,
      { type: "consume-nico-energy", requestId: String(i) },
      ctx,
    ).state;
  expect(nicoEnergyStatus(next.players[0]!.energy, now)).toMatchObject({
    remaining: 0,
    sleeping: true,
  });
  expect(() =>
    transition(
      next,
      { type: "consume-nico-energy", requestId: "overflow" },
      ctx,
    ),
  ).toThrow("resting");
  expect(selectGame(next, now).xp).toBe(0);
  expect(nicoEnergyStatus(hero.energy, now).remaining).toBe(100);
  const two = transition(
    next,
    { type: "add-player", name: "Other" },
    { ...ctx, eventId: "other" },
  ).state;
  expect(nicoEnergyStatus(two.players[1]!.energy, now).remaining).toBe(100);
  expect(two.players[1]!.energy.referralCode).not.toBe(
    hero.energy.referralCode,
  );
});
it("replays charge IDs once and resets at UTC midnight without clock rollback refill", () => {
  let energy = fresh().players[0]!.energy;
  energy = consumeNicoEnergy(energy, "once", now);
  expect(consumeNicoEnergy(energy, "once", now)).toEqual(energy);
  const resetAt = nicoEnergyStatus(energy, now).resetsAt;
  expect(nicoEnergyStatus(energy, resetAt - 1).remaining).toBe(99);
  expect(nicoEnergyStatus(energy, resetAt).remaining).toBe(100);
  expect(nicoEnergyStatus(energy, now - 86400000).remaining).toBe(99);
  const reset = consumeNicoEnergy(energy, "new-day", resetAt);
  expect(reset.requestIds).toEqual(["new-day"]);
});
it("retains quotas across save reload and personalization reset", () => {
  let state = transition(
    fresh(),
    { type: "consume-nico-energy", requestId: "one" },
    ctx,
  ).state;
  state = restoreGame(JSON.parse(serializeGame(state)), ctx);
  state = transition(state, { type: "reset-memory" }, ctx).state;
  expect(nicoEnergyStatus(state.players[0]!.energy, now).remaining).toBe(99);
  const legacy = JSON.parse(serializeGame(state));
  delete legacy.players[0].energy;
  expect(
    nicoEnergyStatus(restoreGame(legacy, ctx).players[0]!.energy, now)
      .remaining,
  ).toBe(100);
});
it("grants 30 days only through the trusted receipt function, idempotently", () => {
  const hero = fresh().players[0]!;
  const granted = grantVerifiedReferral(
    hero.energy,
    hero.id,
    receipt(hero.id),
    now,
  );
  expect(nicoEnergyStatus(granted, now)).toMatchObject({
    tier: "Vanguard",
    unlimited: true,
    sleeping: false,
  });
  expect(consumeNicoEnergy(granted, "unlimited", now)).toEqual(granted);
  expect(
    grantVerifiedReferral(granted, hero.id, receipt(hero.id), now + 1000),
  ).toEqual(granted);
  expect(nicoEnergyStatus(granted, now + 30 * 86400000).tier).toBe("Field");
  expect(hero.energy.accessUntil).toEqual(O.none());
  expect(() =>
    grantVerifiedReferral(
      hero.energy,
      hero.id,
      { ...receipt(hero.id), referredHeroId: hero.id },
      now,
    ),
  ).toThrow("Invalid");
  expect(() =>
    grantVerifiedReferral(hero.energy, hero.id, receipt("other"), now),
  ).toThrow("Invalid");
  expect(() =>
    grantVerifiedReferral(
      hero.energy,
      hero.id,
      { ...receipt(hero.id), phoneVerifiedAt: now + 1 },
      now,
    ),
  ).toThrow("Invalid");
});
it("does not accept imported entitlement grants or roll back known quota", () => {
  const original = fresh();
  const forged = JSON.parse(serializeGame(original));
  forged.players[0].energy.accessUntil = O.some(now + 30 * 86400000);
  forged.players[0].energy.verifiedReceiptIds = ["forged"];
  const used = transition(
    original,
    { type: "consume-nico-energy", requestId: "spent" },
    ctx,
  ).state;
  const imported = transition(
    used,
    { type: "import", data: forged },
    ctx,
  ).state;
  expect(imported.players[0]!.energy).toEqual(used.players[0]!.energy);
  forged.players[0].id = "unknown-hero";
  forged.activePlayerId = "unknown-hero";
  const unknown = transition(used, { type: "import", data: forged }, ctx).state
    .players[0]!;
  expect(unknown.energy.accessUntil).toEqual(O.none());
  expect(unknown.energy.verifiedReceiptIds).toEqual([]);
});

it("does not credit the same referred hero twice under different receipt IDs", () => {
  const hero = fresh().players[0]!;
  const first = grantVerifiedReferral(
    hero.energy,
    hero.id,
    receipt(hero.id),
    now,
  );
  const repeated = grantVerifiedReferral(
    first,
    hero.id,
    {
      ...receipt(hero.id),
      receiptId: "different-receipt",
      phoneVerifiedAt: now + 86400000,
    },
    now + 86400000,
  );
  expect(repeated).toEqual(first);
  expect(first.creditedHeroIds).toEqual(["different-hero"]);
});
