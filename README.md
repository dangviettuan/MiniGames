# MiniGames

Local multiplayer board games built with React and Vite. Each game has a pure rules engine under `src/<game>/`, a UI module under `src/games/<game>/`, and real browser interaction tests under `e2e/`. Xiangqi currently lives in `src/App.jsx` and `src/xiangqi/`.

## Run locally

Use Node.js 22 or newer:

```sh
npm ci
npm run dev
```

Open `http://localhost:5173/MiniGames/`. Available game modules appear in the top navigation. Hash links select a game (`#xiangqi`, `#chess`, `#go`, `#co-ca-ngua`); ongoing games survive navigation between boards within the page. Games and Undo/Redo history are saved automatically on this browser, including pending dice, board orientation and Go scoring agreements. Reloading restores the saved game. New game and resignation require confirmation. If browser storage is blocked or full, a visible warning explains that reloading will lose progress. All play shares one device; accounts, online multiplayer and AI opponents are outside this version.

## Verify changes

```sh
npm test
npm run build
npx playwright install --with-deps chromium webkit
npm run test:e2e
```

Playwright builds and serves production output automatically. Projects exercise desktop Chromium, iPad Pro 11 WebKit and Pixel 7 Chromium. These are browser/device profiles, not physical-device tests. CI retains a `playwright-report` artifact with screenshots and failure traces for seven days. Individual game rules, limits and test flows are documented in `docs/`. The UI regression suite covers 1366×768, 834×1194, 1194×834, 393×851, 360×640 and 851×393 layouts; touch profiles also exercise real taps. Boards, turn status and primary actions remain together. Go offers an explicit zoom/pan mode when intersections are too small to select safely.

The shared play layout, confirmation dialogs and versioned browser storage live in `src/shared/`. Rules engines remain independent of the UI. `npm test` discovers all nested engine and storage-validation tests.

Merging into `main` triggers GitHub Pages deployment. Merge or deploy only after explicit owner approval and green CI.
