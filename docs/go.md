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

The default board fits narrow phones. Larger boards preserve minimum 32px intersections inside a horizontal scroll region, with a visible instruction; the page itself must not overflow. On phones, turn status and Pass/Undo/Redo stay visible while scrolling large boards. Arrow keys navigate intersections, Home/End navigate a row, and Enter/Space activate a point. Accessible labels name coordinates, stone color, dead status and the most recent placement. Stones use contrasting colors and dead groups show a red ×.

## Verification

`npm test` runs engine coverage for capture, whole-group capture, suicide, ko/superko across resume, scoring, mutual agreement invalidation, history branching and resignation. `npm run build` checks production bundling. `npx playwright test e2e/go.spec.js` exercises legal play/capture, pass/scoring/dead-marking/confirmation, disagreement/resume, resignation, Undo/Redo, reset, keyboard interaction, 13/19 sizing and page overflow in the repository's desktop, iPad and mobile projects.

Local verification: 10 Go engine tests plus 8 existing Xiangqi tests pass, production build passes, and 18 Go browser cases pass (6 flows × desktop Chromium, iPad-sized Chromium, Pixel 7 Chromium). Screenshots were inspected on desktop and mobile 9×9/19×19. iPad Safari/WebKit is configured in the tracked Playwright project and must pass CI; the local environment provides Chromium only. No deployment or merge is part of this change.
