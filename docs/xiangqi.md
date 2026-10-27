# Cờ tướng: gameplay and responsive UI

Local two-player Xiangqi, Red first. The engine is independent of React:
`playMove(board, turn, from, to)` validates turn and legality, returns a new board
and resolves the winner/reason. Invalid moves never modify the board.

Rules include palace and river restrictions, blocked horse legs and elephant
eyes, cannon screens, flying generals, self-check prevention, capture, checkmate
and stalemate. **Stalemate is a loss.** Repetition and perpetual-check/chase
adjudication remain unsupported and are disclosed in “Cách chơi”.

## Playing UI

- Uses the shared `PlayLayout` shell. Desktop and landscape keep the board left
  and status/actions right. Portrait uses a compact header, board and controls.
  All Xiangqi styles are scoped; this game injects no body or global layout CSS.
- Selected pieces have a green outline and a Vietnamese name in the status.
  Empty legal destinations have green dots; legal captures have red dashed rings.
  The last move's origin and destination have gold backgrounds/borders.
- Invalid moves retain the selection and explain how to choose a valid target.
- Undo, Redo and “Xoay bàn” remain directly visible, including after a result.
  Rotation changes only the view. Optional fixed row/column coordinates match
  the one-based history labels, regardless of orientation.
- “Ván mới” is in “Tùy chọn” and requires confirmation. Cancel preserves the game.
  “Cách chơi” and history start collapsed.

## Saved games

The shared storage hook saves board, turn, winner/reason, the complete timeline,
cursor, orientation and coordinate preference. Selection, feedback and dialogs
are transient. Reload preserves an undone cursor and its redo branch, including
terminal states. A new move after Undo replaces the old redo branch.

Saved data is validated by replaying every move from the standard initial board
and comparing snapshots. Fabricated winners, invalid transitions, corrupted
boards and invalid cursor/orientation settings fall back to a fresh game. Storage
failure is reported by the shared shell and does not prevent play.

## Verification

- 19 Xiangqi unit tests pass: 17 engine tests plus two saved-state tests covering
  exact replay/cursor/orientation and rejection of corrupted records.
- The production build passes.
- Seven Playwright scenarios run on desktop, iPad-sized touch Chromium and mobile
  touch Chromium: 21 passing checks. They cover capture/highlights, illegal-move
  feedback and selection/capture markers, reload/branch/orientation, coordinate
  controls and confirmed/cancelled reset, terminal persistence, corrupt storage,
  and full-viewport gameplay.
- The terminal test plays a legal 17-ply double-cannon mate from the standard
  opening via real board actions. It checks terminal lock, reload, Undo and Redo.
- The profile test runs 1366×768, 1194×834, 834×1194, 393×851, 360×640 and 851×393
  in every project. Touch contexts use actual `tap()` actions. Before each
  action, the target must already be entirely in the viewport; tests also check
  the full board, status, controls, invalid feedback and zero page scroll. This
  avoids Playwright's automatic scrolling concealing layout defects.
- Screenshots were reviewed at laptop and small-phone sizes; CJK glyphs render
  correctly with the local QA font installed. The iPad-shaped local Chromium
  run is not Safari coverage. The configured WebKit project must pass CI.
