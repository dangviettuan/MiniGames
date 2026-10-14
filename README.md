# MiniGames

Local multiplayer board games built with React and Vite. Each game has a pure rules engine under `src/<game>/`, a UI module under `src/games/<game>/`, and real browser interaction tests under `e2e/`. Xiangqi currently lives in `src/App.jsx` and `src/xiangqi/`.

## Run locally

Use Node.js 22 or newer:

```sh
npm ci
npm run dev
```

Open `http://localhost:5173/MiniGames/`. Available game modules appear in the top navigation. Hash links select a game (`#xiangqi`, `#chess`, `#go`, `#co-ca-ngua`); ongoing games survive navigation between boards within the page. Reloading starts fresh games. All play shares one device; accounts, online multiplayer and AI opponents are outside this version.

## Verify changes

```sh
npm test
npm run build
npx playwright install --with-deps chromium webkit
npm run test:e2e
```

Playwright builds and serves production output automatically. Projects exercise desktop Chromium, iPad Pro 11 WebKit and Pixel 7 Chromium. These are browser/device profiles, not physical-device tests. CI retains a `playwright-report` artifact with screenshots and failure traces for seven days. Individual game rules, limits and test flows are documented in `docs/` on the corresponding feature branch.

The three game branches (`feat/chess`, `feat/go`, `feat/co-ca-ngua`) include the common Playwright/game-hub foundation from PR #6. Merge the foundation first, then review the game PRs. Merging into `main` triggers GitHub Pages deployment, so do so only after explicit owner approval and green CI.
