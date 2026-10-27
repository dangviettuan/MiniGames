# Cờ vây

Local two-player Go, with a pure immutable engine in `src/go/engine.js` and React UI in `src/games/go/`. Open the hub's **Cờ vây** tab (`#go`). No online opponent or AI.

## Explicit rules

- 9×9 by default; 13×13 and 19×19 available when starting a new game. Black starts.
- Orthogonal groups/liberties; remove all adjacent opposing groups with no liberties before checking self-capture. Suicide is forbidden.
- Positional superko: a stone placement may not reproduce any prior board position in the current game branch. Passing is exempt. Undo restores the relevant repetition history; a new action discards redo.
- Two consecutive passes enter scoring, rather than deciding a winner. Players jointly mark/unmark entire dead groups. Every marking change clears both players' previous agreements. Both players must explicitly confirm the final state. Either may resume play if they disagree. Resume clears marks and passes, preserves the next player and repetition history.
- Chinese area scoring: live stones plus empty regions bordered only by that color. Unbordered regions or regions bordering both colors are neutral. Seki receives no special automatic adjudication; the agreed board is scored by these area rules. Prisoners do not score separately. White gets 7.5 komi.
- Resignation requires explicit confirmation. During scoring, either color may resign. Winning/losing, resignation, passes, dead marking and agreements all participate in Undo/Redo.

Dead-group adjudication is deliberately mutual; the program does not try to infer life/death. A single device cannot verify that two separate humans pressed the confirmation buttons.

## Interaction and accessibility

The board and primary actions share the `PlayLayout`: a side rail on desktop/landscape, a compact stack in portrait. Pass, Undo and Redo remain primary. During scoring, the compact score, both confirmation buttons and Resume replace Pass directly beside the board. Changing a dead group visibly explains that both confirmations must be repeated. Rules, detailed score breakdown and history are collapsed; board size, new game and resignation live in Tools. Starting over after progress and resignation use modal confirmation.

Coordinates and star points orient the board. **Toàn bàn** shows the whole board. If intersections would be smaller than 32px, this is an explicitly read-only overview with a **Phóng to** prompt. Zoom enables at least 36px intersections inside a square two-axis pan window; a coordinate range identifies the visible part while panning. The page itself never needs horizontal scrolling. Arrow keys navigate intersections and Enter/Space select. Color, last-move markers and dead-group crosses have accessible text equivalents.

The complete engine state, current board size, past/future history, repetition positions, scoring marks and confirmations persist locally. Saved records are validated, including history snapshots; malformed records start a fresh game. A codec deduplicates repetition-position strings into one table referenced by snapshots. A 300-move 19×19 state with an undo/redo future serializes to **963,589 bytes**, compared with **17,244,448 bytes** without the codec. Legacy uncompressed saves remain readable. The save hook shows a warning if browser storage is unavailable.

## Verification

`npm test` runs engine coverage for capture, whole-group capture, suicide, ko/superko across resume, scoring, mutual agreement invalidation, history branching and resignation. `npm run build` checks production bundling. `npx playwright test e2e/go.spec.js` exercises legal play/capture, pass/scoring/dead-marking/confirmation, disagreement/resume, resignation, Undo/Redo, reset, keyboard interaction, 13/19 sizing and page overflow in the repository's desktop, iPad and mobile projects.

UI verification uses eight browser flows at 1366×768, 834×1194, 1194×834, 393×851, 360×640 and 851×393. It checks capture, actual touch input in landscape, mutually confirmed scoring without scrolling, reload during scoring and after Undo, persisted superko, history branching, resignation, reset/cancel, keyboard navigation, read-only fit view and zoomed hit targets. A browser flow also restores a 300-move 19×19 game and uses Redo across reload without a storage warning. Four codec tests cover the 300-move payload budget, exact history round trips, superko, scoring agreements and malformed saves. The standard unit suite and production build are also required. True iPad Safari/WebKit remains a CI check; local browser runs use Chromium. No merge or deployment is included.
