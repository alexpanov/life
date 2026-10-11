import { Context, Effect, Layer } from "effect";
import { z } from "zod";

export class ReferralError extends Error {
  readonly _tag = "ReferralError";
}
/** Production adapters must verify the server signature and authenticated beneficiary before returning a receipt. */
export class VerifiedReferralRepository extends Context.Service<
  VerifiedReferralRepository,
  {
    readonly verify: (
      receiptReference: string,
    ) => Effect.Effect<unknown, ReferralError>;
  }
>()("life/VerifiedReferralRepository") {}
export const unavailableReferralLayer = Layer.succeed(
  VerifiedReferralRepository,
)({
  verify: () =>
    Effect.fail(
      new ReferralError(
        "Phone verification is not connected yet. Invitations do not unlock Vanguard.",
      ),
    ),
});
const receiptSchema = z.strictObject({
  receiptId: z.string().min(1).max(200),
  referrerHeroId: z.string().min(1).max(200),
  referredHeroId: z.string().min(1).max(200),
  phoneVerifiedAt: z.number().finite().nonnegative(),
});
/** Validates only results from the trusted repository, never JSON proposed by a model or a browser form. */
export const verifyReferralReceiptRoutine = (receiptReference: string) =>
  Effect.gen(function* () {
    if (!receiptReference.trim() || receiptReference.length > 500)
      return yield* Effect.fail(
        new ReferralError("Invalid referral receipt reference."),
      );
    const repository = yield* VerifiedReferralRepository;
    const raw = yield* repository.verify(receiptReference);
    const parsed = receiptSchema.safeParse(raw);
    if (!parsed.success)
      return yield* Effect.fail(
        new ReferralError(
          "The verification service returned an invalid receipt.",
        ),
      );
    return parsed.data;
  });
/** Referral codes are public random invitation tokens; account identifiers never enter this URL. */
export function referralInviteUrl(
  baseUrl: string,
  referralCode: string,
): Effect.Effect<string, ReferralError> {
  return Effect.try({
    try: () => {
      if (!/^[a-zA-Z0-9_-]{8,100}$/.test(referralCode))
        throw new ReferralError("Invalid invitation code.");
      const url = new URL(baseUrl);
      if (url.protocol !== "https:")
        throw new ReferralError("An HTTPS invitation URL is required.");
      url.username = "";
      url.password = "";
      url.hash = "";
      url.search = "";
      url.searchParams.set("ref", referralCode);
      return url.toString();
    },
    catch: (cause) =>
      cause instanceof ReferralError
        ? cause
        : new ReferralError("Invalid invitation URL."),
  });
}
