# Cờ vua

Open `#chess` in the game hub. This is an untimed local two-player game, without AI, accounts, persistence, or networking.

## Rules and architecture

`src/chess/engine.js` is a pure immutable engine with no React/browser dependencies. Board indices run a8 to h1; pieces use uppercase for White, lowercase for Black. `initialState`, `fromFEN`, `legalMoves`, `makeMove`, `inCheck`, `outcome`, `drawClaims`, `claimDraw`, `makeMoveAndClaim`, and `resign` are exported.

Supported: legal movement and self-check filtering, check/checkmate/stalemate, both castling sides (unmoved king/rook, empty route, no check/transit/final attacks), en passant including discovered-check restrictions and expiration, all four promotion choices including captures, insufficient mating material, repetition, and move-count draws. Repetition keys include castling rights and only legally capturable en passant targets.

Threefold repetition and 50 moves per player without pawn movement/capture enable **Yêu cầu hòa** rather than ending immediately. The optional **Yêu cầu hòa nếu nước tiếp theo đủ điều kiện** control also claims atomically on an intended move that reaches either threshold. Fivefold repetition and 75 moves per player end automatically. Checkmate takes precedence over the move-count draw. Insufficient material recognizes kings alone, king plus a lone bishop/knight versus king, and bishops confined to the same square color. Two knights versus king are not automatically declared dead because a mating position remains possible with cooperation. Arbitrary blocked-board dead-position proofs are not implemented.

`src/games/chess/index.jsx` owns UI selection, promotion choice, orientation and the immutable timeline. Undo/Redo restores all rule state, repetition history, castling rights, en passant rights, promotions and terminal results. A new action after Undo truncates the future timeline. Resignation requires explicit inline confirmation. Reset starts a new timeline. Board labels, live status, keyboard-operable square buttons, marked legal destinations and scoped styles support touch/keyboard use. On short desktop screens the board scales with viewport height to keep Undo/Redo adjacent and visible.

## Validation

`npm test` includes opening perft depth 3 (8,902), Kiwipete perft depths 1–3 (48 / 2,039 / 97,862), pins, illegal turns/movement, self-check, castling attacks/rights/rook capture, en passant expiration/discovered check, all promotions, Fool's Mate, stalemate, material draws, reached/intended-move claims, automatic draws and mate precedence.

`npx playwright test e2e/chess.spec.js` runs seven real UI scenarios in each configured desktop, iPad and mobile project: legal/invalid actions, branching Undo/Redo, rotation/reset, full Fool's Mate and terminal recovery, legal opening to castling, en passant, legal pawn race to promotion with cancellation/underpromotion, repetition claim/resignation, and responsive bounds/control visibility. No board injection or test-only production hooks are used.

Local browser validation uses Chromium for all three viewport/device profiles because Playwright browser CDN access is unavailable in this environment. The checked-in normal configuration retains the true WebKit iPad project for CI; local iPad Chromium results do not prove Safari behavior. No deployment is required to exercise this feature.
