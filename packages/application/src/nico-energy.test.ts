import { Effect, Layer } from "effect";
import { expect, it } from "vitest";
import {
  createGameController,
  createMemoryPersistence,
} from "./controller";
import {
  NicoModel,
  mockNicoLayer,
  ModelError,
} from "./nico-model";
import { runNicoChatRoutine } from "./routine-protocol";
import {
  VerifiedReferralRepository,
  unavailableReferralLayer,
  referralInviteUrl,
} from "./referrals";
import { nicoEnergyStatus, serializeGame } from "../../core/src/index";
import * as O from "../../foundation/src/option";

const now = 1800000000000;
async function setup(persistence = createMemoryPersistence()) {
  let seq = 0;
  const controller = createGameController(persistence, () => ({
    now,
    eventId: `energy-${seq++}`,
    localDay: "2027-01-15",
  }));
  await controller.load();
  return controller;
}
function hero(controller: Awaited<ReturnType<typeof setup>>) {
  const game = controller.getSnapshot().game;
  if (O.isNone(game)) throw Error("Missing game");
  const player = game.value.players.find(
    (p) => p.id === game.value.activePlayerId,
  );
  if (!player) throw Error("Missing hero");
  return player;
}
const chat = (
  controller: Awaited<ReturnType<typeof setup>>,
  message = "Hello",
) =>
  Effect.runPromise(
    runNicoChatRoutine(controller, message).pipe(Effect.provide(mockNicoLayer)),
  );
it("charges successful chat, blocks concurrent overspend before model, and leaves moderation free", async () => {
  const controller = await setup();
  controller.send({ type: "remember", text: "Mornings" });
  for (let i = 0; i < 99; i++)
    controller.send({ type: "consume-nico-energy", requestId: `used-${i}` });
  let calls = 0;
  const layer = Layer.succeed(NicoModel)({
    reply: () => Effect.succeed("unused"),
    propose: () =>
      Effect.promise(async () => {
        calls++;
        await Promise.resolve();
        return { version: 1, kind: "say", text: "One step." };
      }),
  });
  const settled = await Promise.allSettled(
    [1, 2].map(() =>
      Effect.runPromise(
        runNicoChatRoutine(controller, "Hello").pipe(Effect.provide(layer)),
      ),
    ),
  );
  expect(settled.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect(calls).toBe(1);
  expect(nicoEnergyStatus(hero(controller).energy, now).remaining).toBe(0);
  await expect(chat(controller)).rejects.toThrow("resting");
  await chat(controller, "Forget Mornings");
  expect(hero(controller).sidekick.snippets[0]?.deletedAt).toEqual(O.some(now));
  expect(nicoEnergyStatus(hero(controller).energy, now).remaining).toBe(0);
});
it("does not charge failed providers, malformed proposals, or failed core commands", async () => {
  const controller = await setup();
  const providers = [
    Layer.succeed(NicoModel)({
      reply: () => Effect.succeed("unused"),
      propose: () => Effect.fail(new ModelError("offline")),
    }),
    Layer.succeed(NicoModel)({
      reply: () => Effect.succeed("unused"),
      propose: () => Effect.succeed({ routine: "eval" }),
    }),
    Layer.succeed(NicoModel)({
      reply: () => Effect.succeed("unused"),
      propose: () =>
        Effect.succeed({
          version: 1,
          kind: "invoke",
          invocation: {
            routine: "forget-trait",
            parameters: { id: "delta-force-veteran" },
          },
        }),
    }),
  ];
  for (const provider of providers)
    await expect(
      Effect.runPromise(
        runNicoChatRoutine(controller, "Hello").pipe(Effect.provide(provider)),
      ),
    ).rejects.toThrow();
  expect(nicoEnergyStatus(hero(controller).energy, now).remaining).toBe(100);
  await chat(controller);
  expect(nicoEnergyStatus(hero(controller).energy, now).remaining).toBe(99);
});
it("referral verification is unavailable by default and client/model claims cannot award access", async () => {
  const controller = await setup();
  await expect(
    Effect.runPromise(
      controller
        .grantVerifiedReferralRoutine("receipt")
        .pipe(Effect.provide(unavailableReferralLayer)),
    ),
  ).rejects.toThrow("not connected");
  expect(nicoEnergyStatus(hero(controller).energy, now).tier).toBe("Field");
  const invalid = Layer.succeed(VerifiedReferralRepository)({
    verify: () =>
      Effect.succeed({
        receiptId: "r",
        referrerHeroId: hero(controller).id,
        referredHeroId: "other",
        phoneVerifiedAt: now,
        verified: true,
      }),
  });
  await expect(
    Effect.runPromise(
      controller
        .grantVerifiedReferralRoutine("receipt")
        .pipe(Effect.provide(invalid)),
    ),
  ).rejects.toThrow("invalid receipt");
  expect(nicoEnergyStatus(hero(controller).energy, now).tier).toBe("Field");
});
it("accepts an authenticated phone receipt once, rejecting wrong beneficiaries and self referrals", async () => {
  const controller = await setup();
  const id = hero(controller).id;
  const verify = (referrerHeroId: string, referredHeroId: string) =>
    Layer.succeed(VerifiedReferralRepository)({
      verify: () =>
        Effect.succeed({
          receiptId: "server-receipt",
          referrerHeroId,
          referredHeroId,
          phoneVerifiedAt: now,
        }),
    });
  for (const layer of [verify("other", "friend"), verify(id, id)])
    await expect(
      Effect.runPromise(
        controller
          .grantVerifiedReferralRoutine("ref")
          .pipe(Effect.provide(layer)),
      ),
    ).rejects.toThrow();
  await Effect.runPromise(
    controller
      .grantVerifiedReferralRoutine("ref")
      .pipe(Effect.provide(verify(id, "friend"))),
  );
  await Effect.runPromise(
    controller
      .grantVerifiedReferralRoutine("ref")
      .pipe(Effect.provide(verify(id, "friend"))),
  );
  expect(hero(controller).energy.verifiedReceiptIds).toEqual([
    "server-receipt",
  ]);
  expect(nicoEnergyStatus(hero(controller).energy, now).tier).toBe("Vanguard");
  await chat(controller);
  expect(hero(controller).energy.requestIds).toHaveLength(0);
});
it("persists migration before any interaction so invitation codes survive reload", async () => {
  const initial = await setup();
  const game = initial.getSnapshot().game;
  if (O.isNone(game)) throw Error("Expected game");
  const legacy = JSON.parse(serializeGame(game.value));
  for (const player of legacy.players) delete player.energy;
  const persistence = createMemoryPersistence();
  await Effect.runPromise(
    persistence.routines.save(JSON.stringify(legacy), O.none()),
  );
  const first = await setup(persistence);
  const code = hero(first).energy.referralCode;
  await first.flush();
  const second = await setup(persistence);
  expect(hero(second).energy.referralCode).toBe(code);
  const link = await Effect.runPromise(
    referralInviteUrl("https://example.com/life/?private=1#home", code),
  );
  expect(link).toBe(`https://example.com/life/?ref=${code}`);
  expect(link).not.toContain(hero(first).id);
});
