# Xiangqi review and test coverage

The game is local two-player Xiangqi. Red moves first. The engine is independent
of React: `playMove(board, turn, from, to)` validates ownership and legality,
returns a new board and the next turn, and resolves the winner/reason. Illegal
moves return `null` without modifying the input.

Implemented rules include palace and river restrictions, blocked horse legs and
elephant eyes, the cannon screen, flying generals, self-check prevention,
capture, checkmate, and stalemate. **Stalemate is a loss** in Xiangqi. Repetition,
perpetual check/chase adjudication and tournament no-progress limits are not
implemented; the game states this limitation in its rules panel.

## Review changes

- Fixed an infinite loop in exported `between` for identical endpoints.
- Moved terminal resolution and turn validation out of the UI into the engine.
  The UI now distinguishes checkmate, stalemate and general capture.
- Tapping an already selected piece deselects it.
- The status announces turn/check/win updates with a polite live region.
- History uses Vietnamese piece names and one-based coordinates matching cell
  labels. Undo/Redo preserve terminal results; a new move truncates the redo branch.
- Reduced mobile padding, condensed status cards, and scaled piece text/borders
  to retain usable space at 320px width.
- Use widely supported 馬/車 glyphs for red horse/rook; rare 傌/俥 glyphs
  were missing in available CJK fonts, producing blank-looking pieces.

## Verification

`npm test`: 17 engine tests pass. Besides basic piece rules, coverage includes
44 opening moves per side, pinned pieces, immutable application, wrong-turn
rejection, checkmate, stalemate and capture.

`npm run build`: passes.

Playwright: five real interaction scenarios, each run on desktop Chromium,
iPad-sized touch Chromium and Pixel 7 Chromium (15 checks pass locally):

1. Alternating legal moves and capture, then Undo/Redo restoring pieces and turn.
2. Illegal destinations, opponent selection and selected-piece deselection.
3. Undo followed by another move truncating Redo; reset clearing all state.
4. A 17-ply double-cannon checkmate played from the standard opening using only
   board clicks; terminal interaction lock, Undo reopening play, Redo restoring
   the win and reset reopening a fresh game.
5. Viewport bounds, distinct touch cells, no horizontal page overflow and a legal
   horse move without runtime errors.

Manual screenshot review additionally checked 320px, Pixel 7 and iPad portrait
sizes. The board fits horizontally at each size. Installed temporary CJK fonts for local screenshot QA and corrected the red
horse/rook glyph fallback after inspecting the rendered board. Actual iPad Safari
coverage uses the configured WebKit project in GitHub Actions and must pass
before merge. The local iPad-shaped Chromium run is not Safari coverage.
