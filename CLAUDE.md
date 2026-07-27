# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a dependency-free, client-side turn-based strategy game. There is no package manager, bundler, framework, backend, or persistence layer. `index.html` loads plain JavaScript files into browser globals and renders the galaxy on a `<canvas>` alongside a fixed-width DOM control panel.

Because localization uses `fetch()`, serve the repository over HTTP rather than opening `index.html` directly:

```bash
python3 -m http.server 8000
# Open http://localhost:8000/
# English UI: http://localhost:8000/?lang=en-us
```

There is currently no automated test suite or lint configuration, so there is no single-test command. Use syntax checks as the baseline verification:

```bash
for f in js/*.js; do node --check "$f" || exit 1; done
python3 -m py_compile develop_tools/csv2json.py
```

For gameplay changes, also run the app in a browser and exercise the affected setup, canvas interaction, turn progression, and game-end flow. Campaign maps are generated with `Math.random()`, so behavior is not deterministic.

## Architecture

Scripts are loaded in dependency order at the end of `index.html`: `config.js`, `i18n.js`, `gameEngine.js`, `ui.js`, then `main.js`. They use IIFEs assigned to `window`; there are no ES modules.

- `js/config.js` defines static game data through `window.GameConfig`: map-size parameters, faction definitions and weapon properties, strategic-event pools, and the planet-name pool. Balance/data changes belong here when they do not require new behavior.
- `js/gameEngine.js` owns all mutable campaign state, procedural galaxy generation, graph connectivity, canvas rendering, selection and combat, AI turns, weapons, events, and victory/defeat. Its private `state` is exposed only through methods such as `getPublicState()`. UI notifications cross the boundary through `onEvent`, `onGameEnd`, and `onStateChange` callbacks supplied to `init()`.
- `js/ui.js` is the DOM adapter. It caches controls, binds buttons/selects/mouse events to engine methods, renders engine-derived status into the side panel, and queues event modals. Keep game rules in the engine rather than event handlers here.
- `js/main.js` is the bootstrap layer. On `DOMContentLoaded`, it reads the `?lang=` query parameter, loads translations, wires engine callbacks to the UI, initializes both modules, and starts the default campaign. Changing language reloads the page with a new query parameter.
- `js/i18n.js` loads locale JSON and replaces text on elements marked with `data-lang`. It currently fetches only the `info` and `menu` namespaces. Many runtime strings in `config.js`, `gameEngine.js`, and `ui.js` are still hard-coded Chinese and do not pass through `I18n.t()`.
- `index.html` defines the entire UI and modal structure; `css/style.css` supplies all styling. The engine assumes the side panel is 340 px wide when sizing the canvas, matching `#uiPanel` in CSS.

The galaxy is an in-memory graph: planet objects are stored in `state.planets`, links hold direct references to endpoint planets, and each link has a stable `idPair` used by `blockedLinks`. Friendly supply-line reachability uses BFS over that graph. Selection stores planet object references, so restarting must clear selections before replacing the generated graph.

`nextTurn()` is the central simulation pipeline: deployed-weapon attrition, AI troop transfer and attacks, faction growth, AI weapon behavior, mode-specific events, deterrence countdown, end-state checks, selection reset, state notification, and rendering. Preserve this ordering deliberately when adding turn mechanics.

## Localization Workflow

The editable translation source is `lang/lang_csv/*.csv`. Each CSV uses `id` as the first column and locale directory names (`zh-cn`, `en-us`) as the remaining headers. Regenerate locale JSON from the repository root with:

```bash
python3 develop_tools/csv2json.py
```

The script rewrites corresponding files under `lang/<locale>/`, so review all generated changes. A Windows executable (`csv2json.exe`) is also checked in, but the Python source is the portable and inspectable workflow. When adding a new translation namespace, add its CSV/JSON files and also include the namespace in the `modules` array in `js/i18n.js`; merely generating the JSON does not load it in the browser.
