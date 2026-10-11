---
name: parse-dont-validate
description: Turn untrusted input into a trusted domain type, or return a typed failure, at QuestOS boundaries. Use when reading saves, network payloads, model output, forms, JSON, or any unknown value; when a check returns boolean and the same type continues; when null or undefined leak past a codec; or when the work mentions parse don't validate, shotgun parsing, branded types, smart constructors, or a language that does not insist.
---

# Parse, don't validate

TypeScript will let you do the right thing. It will not insist. A check that returns `boolean` and hands back the same type has already forgotten what it learned. The next function sees a `string` and believes you. Future you will believe you too.

That is the whole idea, from Alexis King, said again for this language by Christian Ekrem: [Parse, Don't Validate — In a Language That Doesn't Want You To](https://cekrem.github.io/posts/parse-dont-validate-typescript/). Read that post, and King's [Parse, don't validate](https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate/), when you want the long argument. This file is the rule for this repository.

A validator says "this looks fine, carry on." A parser says "give me a blob. I will give you a more precise type, or I will tell you why I cannot." The type is the proof. Memory is not.

## Where the proof has to live

Keep this at the boundary. Saves, HTTP, model output, forms, and `JSON.parse` are untrusted. The core receives domain types and may trust them. Do not re-check the same fact three functions deeper. That scattered checking is shotgun parsing: the information was there, and then it was thrown away.

`JSON.parse` turns text into a JavaScript value. It does not turn that value into a quest, a save, or a routine. Annotate the result as `unknown` at once, then parse.

## How to do it here

Use the types this repository already has. Do not invent a second Option.

1. Name the raw blob and the trusted value as different types. `unknown` in. A domain type out.
2. Parse with a schema (`safeParse`) or a hand-written parser. Map success into the domain. Map failure into `Either` (a reason) or `Effect` (an asynchronous typed failure). Map absence, when nothing is wrong and nothing is there, into `Option`.
3. Keep wire `null` inside the codec. `packages/core/src/codec.ts` already does this. Do not let `null` or `undefined` into core or application return types.
4. An assertion (`as`) is allowed in the parser that just proved the value, and nowhere else. A cast outside that module forges the proof. Treat it as a bug.
5. Match `Option` and `Either` on `_tag`. Do not ask whether a value is truthy and hope that meant "present."
6. Reject a bad import or model payload as a whole. Do not half-apply it, and do not overwrite a recoverable save because parsing failed.

Zod, io-ts, and a hand-rolled parser are the same job. The library makes the right thing cheaper. It does not make the choice for you. A `User` from the network is not a `User` until something has parsed it.

## When to leave it alone

A local predicate that never crosses a trust boundary can stay a predicate. Do not brand every string in a component. Do not wrap a value in `Option` when the type is already known to be present. The win is one parser at the door, and a core that stops asking.

## The tell

You are validating when you should be parsing if the same fact is checked in more than one place, if a function returns `boolean` and its caller keeps the original type, or if a later layer still has to wonder whether the email, the id, or the save was real.
