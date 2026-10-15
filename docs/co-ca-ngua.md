# Cờ cá ngựa

Local 2–4 player Vietnamese horse race, sharing one browser. Two players sit opposite (Red and Yellow); three use Red/Green/Yellow; four use all seats. No AI or network game is implied.

## Rules selected before play

- One die, **1 or 6** to leave the stable (default), or **6 only** as an explicit setup option.
- A 6 grants another roll, including when no move is possible. Other unplayable rolls automatically pass the turn with visible feedback.
- Every player travels 56 track squares from their own starting square, then enters their private six-slot home lane. Starting square is progress 0; home slot 1 is progress 56.
- No safe squares. Landing exactly on an opponent, including a starting square, returns that horse to the stable. Cannot jump any occupied track square or land on one's own horse.
- Home movement follows the exact die, cannot exceed slot 6, jump or land on another home horse. Win with four horses occupying **3, 4, 5, 6**. Bring horses to 6, then 5, then 4, then 3 to avoid blocking.
- A pending legal roll must be moved before another roll. Select via board or large numbered controls, then tap the highlighted destination or the move button. Blocked horse controls explain the reason instead of silently ignoring selection.
- Undo/Redo includes rolls, captures, skipped turns, winners and branches. Persistent roll tape prevents fishing for a different roll by undoing.

## UI and persistence

`src/co-ca-ngua/engine.js` remains the immutable pure engine. The UI samples crypto RNG once in the click event before passing a deterministic updater to React, so StrictMode cannot consume extra dice. Existing tape entries consume no new randomness.

The shared `PlayLayout` puts the board next to a control rail on desktop/landscape, and below the compact heading/status on portrait phones. Portrait uses available width rather than crushing the board against a fixed height budget: at 360×640 the board is 340 pixels wide. Large horse-choice buttons are available because individual track cells remain smaller touch targets. Secondary rules may scroll; the normal roll/select/move loop stays adjacent to the board.

All horse symbols are clipped SVG viewports constrained to their actual cell; SVG number badges fit within the same bounds. Stable pieces inherit their player color. Direction arrows remain visible around the entire route, including inactive sides in a two-player game. Colored home numbers and a ⌂ entry symbol explain the way home. The centerpiece communicates circuit direction rather than a technical square count.

The last move is derived from engine history, with a gold destination, dashed origin and a concise actor/horse/from/to label. This survives subsequent rolls, undo/redo and reload. Current player and the engine's move/skip/win explanation remain visible above the board.

`useStoredGame` saves `{ game, players, startRule }`, including dice tape, cursor, pending die and all past/future snapshots. Validation checks setup, seats, integer positions, phases, dice, winner and each history snapshot before restoration. Malformed data returns to setup. Storage failure uses the shared visible warning. New game is under Tùy chọn and opens the shared confirmation dialog; cancel preserves game and history.

## Verification

- Existing engine tests still cover alternate stable rules, skipped turns, six bonus, pending-roll lock, start capture, jump/own-occupant blocks, full-lap entry, exact home, win, undo/redo, branching, replay and RNG validation.
- Browser tests drive normal UI clicks with seeded browser crypto, without production state hooks. They play a full legal 45-move win and an opposing starting-square capture, including terminal/capture Undo/Redo. A separate Yellow-captures-Red regression verifies that recent-move labels and origin/destination highlights identify the moving player rather than the lower-index captured seat, including after reload.
- Persistence checks reload a pending roll, replay the same die after undo, restore a completed move and its last-move highlight, and retain Undo/Redo history. A malformed stored game safely returns to setup.
- Viewport checks cover desktop, iPad and Pixel 7, plus 393×851, 360×640 and touch 851×393 landscape. They check readable board width, actual cell width, SVG containment, no horizontal overflow, last-move feedback and board/primary-control visibility. Additional rules are deliberately allowed below the fold.
- Local iPad tests use Chromium emulation when WebKit is unavailable; CI keeps the real configured iPad/WebKit project. Chromium emulation does not certify Safari behavior.

Commands: `npm test`, `npm run build`, `npm run test:e2e -- e2e/co-ca-ngua.spec.js`.
