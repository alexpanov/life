---
name: typography
description: >-
  Set QuestOS player-facing type with the design-system typography module.
  Use when adding or changing headings, sentences, labels, cards, pages,
  dialogs, or fonts on the web or iPhone. Agents use these components and
  do not pick faces, sizes, or raw header tags.
---

# Typography

Read `../../CONTRACT.md`. Reading is Libre Baskerville. Headers are Libre Bodoni, a sharp serif: the capital A has feet, and the capital I is a column. Controls use IBM Plex Sans, the face without serifs, with flat terminals. Do not add a round face.

## Use the components

Web, from `packages/design/src/type`:

```tsx
<H1>Your realms.</H1>
<H2>Home</H2>
<H4>Morning walk</H4>
<Body>One real action. Then report back.</Body>
<Body b>This line carries weight.</Body>
<Body i voice="companion">Niko speaks in the reading face.</Body>
<Label>Your current quest</Label>
```

iPhone, from `apps/iphone/type.tsx`: the same components. `b` bolds. `i` italicizes. `voice="companion"` is Niko’s color.

Wrap the web tree once in `<Typography>` (the website already does). Do not set `style`, `font-family`, or `font-size` on player text. `className` is for layout only, such as margin.

## Header order

| Component | Use                                                                                                |
| --------- | -------------------------------------------------------------------------------------------------- |
| `H1`      | The page subject. Optional. One mounted header one, or none. A hidden inert region does not count. |
| `H2`      | A section subject, or the subject when the page has no header one.                                 |
| `H3`      | A smaller subject: a group, a panel, a dialog’s topic.                                             |
| `H4`      | A card title.                                                                                      |
| `H5`      | A heading inside a card.                                                                           |

The subject of the screen is header one, header two, or header three. Cards use header four and header five. Do not skip to a raw `<h1>`–`<h6>`.

Niko’s sentences are `Body` with `voice="companion"`. His name and icon stay with the sender label. Sender marks stay the existing mono label. Do not set a whole paragraph in mono.

The public entrance may scale header one up. That size stays on the entrance. Game pages use the normal header one.

## Faces and files

The scale is `packages/design/src/typography.ts`. Web rendering is `packages/design/src/typography.css`. Change a size or face there, then match the other file. Do not restyle a header in a page stylesheet.

Body copy stays at least 16 pixels. Header one is the largest header. Each header below it is smaller.
