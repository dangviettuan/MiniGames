# Cờ cá ngựa

Local 2–4 player Vietnamese horse race, sharing one browser. Two players sit opposite (Red and Yellow); three use Red/Green/Yellow; four use all seats. No AI or network game is implied.

## Rules selected before play

- One die, either **1 or 6** to leave the stable (default), or **6 only** as an explicit setup option.
- A 6 grants an additional roll, including when no move is possible. Other unplayable rolls automatically pass the turn, with a status message.
- Every player travels 56 track squares from their own starting square, then enters their private six-slot home lane. The starting square is progress 0 and home slot 1 is progress 56.
- No safe squares. Landing exactly on any opponent, even on a starting square, returns that horse to the stable. No jumping any occupied track square; cannot land on one's own horse.
- Home movement is by the exact die, cannot exceed slot 6, cannot jump or land on another home horse. The staged-home win is four horses occupying slots **3, 4, 5, 6**. Bring the first horse to 6, then the next to 5, then 4, then 3 to avoid blocking each other.
- After rolling, a legal move must be made before another roll. Choose a horse via the board or the large move-option controls, then confirm via its highlighted destination or the action button.
- Undo/Redo includes rolls, moves, captures, skipped turns, winners, and alternative move branches. A persistent roll tape means undoing a roll and trying again produces the same number; branching cannot fish for a different roll. Starting a fresh game resets the tape and requires confirmation when a game exists.

## Implementation

`src/co-ca-ngua/engine.js` contains immutable pure transitions. Randomness is supplied as an RNG argument to `rollDice`; the UI supplies `crypto.getRandomValues`. The UI samples new randomness in the click event before passing a deterministic updater to React; StrictMode cannot consume two dice values by re-invoking an updater. Existing tape entries consume no fresh randomness. Game history and deterministic replay are engine-owned. No production test state hooks are exposed.

The responsive UI shows a 16×16 cross board containing exactly 56 track cells. Color and horse numbers identify pieces; legal and selected destinations have outlines. A separate set of large controls remains available on touch screens where individual track cells are smaller. On mobile, the board appears first below a compact title, followed by one compact control dock containing the roll, die, history, horse choices and move action. Secondary help and rules stay collapsed. The board scales against viewport height. Playwright requires the entire board and all turn controls to be simultaneously visible before and after rolling, so automatic scrolling cannot hide this interaction constraint. Native modal reset confirmation traps focus and supports Escape. Visible rules appear before the first game and remain expandable while playing.

## Verification

- Unit tests cover 2/3/4-player setup; alternate stable rules; automatic skipped turns; six bonus; pending-move roll lock; capture on a start square; jumping/own-occupant blocks; full-lap home entry; exact home overshoot; home blocking; staged-home win; undo/redo of terminal state; alternate branches and deterministic dice replay; invalid RNG inputs.
- Playwright tests use normal UI clicks and browser-only seeded `crypto.getRandomValues`. No board injection or direct engine calls. Flows cover setup, a highlighted board destination, blocked stable exits, auto-passing, undo/redo, dice replay, four-player/six-only setup, reset/cancel, and a complete legal 45-move win with undo/redo of the winning move.
- Additional development-server verification with React StrictMode enabled seeded successive dice 6 and 1, rolled/moved/rolled via normal UI clicks, and verified exactly 6 then 1 on both Pixel 7 and iPad. This catches RNG consumption inside a re-invoked state updater, which a production-only test would miss.
- The same scenarios run under desktop, iPad and mobile projects. Local iPad runs use Chromium emulation if WebKit is unavailable; CI should retain the real configured iPad/WebKit project. Such local emulation does not certify Safari behavior.

Commands: `npm test`, `npm run build`, `npm run test:e2e -- e2e/co-ca-ngua.spec.js`.
