# CLAUDE.md

This repository is a Vue 3 + Vite + TypeScript client-side turn-based strategy game. The app has no backend or persistence layer; campaign state is held in memory and the galaxy is rendered to a canvas.

## Development

Install dependencies and start the app with:

```bash
npm install
npm run dev
# Open the URL printed by Vite
# English UI: append ?lang=en-us
```

Use these checks before submitting changes:

```bash
npm run typecheck
npm run test:run
npm run build
python3 -m py_compile develop_tools/csv2json.py
```

Use `npm run preview` to exercise the production build. Gameplay changes must also be checked in a browser: setup controls, Canvas click/Shift selection/drag selection, troop movement and attack, turn progression, weapons, strategic events, deterrence, victory/defeat, and language switching. Maps use injected randomness in tests and `Math.random` in production, so campaign layouts are not fixed.

## Architecture

- `src/main.ts` mounts `src/App.vue`; `src/styles/main.css` contains the global layout and responsive styles.
- `src/components/GalaxyCanvas.vue` owns Canvas mounting and input forwarding. `src/components/GameControlPanel.vue` renders controls. `src/components/EventModal.vue` and `src/components/ResultModal.vue` render queued events and game-end results.
- `src/composables/useGame.ts` is the UI/game boundary. It owns the engine instance, reactive public-state snapshot, actions, errors, events, result state, and restart options. Do not put game rules in Vue event handlers.
- `src/game/config.ts` contains static balance and campaign data. `src/game/types.ts` contains shared domain contracts.
- `src/game/GameEngine.ts` owns mutable campaign state, procedural galaxy generation, selection, combat, AI, weapons, events, win/defeat checks, and the Canvas input contract. Preserve the `nextTurn()` pipeline ordering when adding mechanics.
- `src/game/CanvasRenderer.ts` contains the pure Canvas drawing implementation. `src/game/rules/` contains rule helpers suitable for unit tests.
- `src/i18n/index.ts` loads all five locale namespaces from `public/lang/<locale>/`, supports `?lang=zh-cn|en-us`, and exposes `t()` to Vue. Runtime strings that are not yet translated remain in the engine by design.

The galaxy is an in-memory graph. Planet objects are stored in `state.planets`, links retain endpoint references, and each link has a stable `idPair` used by `blockedLinks`. Friendly supply-line reachability is BFS over that graph. Restart clears selections before replacing the generated graph.

## Localization Workflow

The editable source is `lang/lang_csv/*.csv`; `id` is the first column and locale directories (`zh-cn`, `en-us`) are the remaining headers. Regenerate runtime JSON from the repository root:

```bash
python3 develop_tools/csv2json.py
```

The script writes corresponding files under `public/lang/<locale>/`, which Vite serves as static assets. Review generated changes. When adding a namespace, add its CSV and locale files and include the namespace in `src/i18n/index.ts`.
