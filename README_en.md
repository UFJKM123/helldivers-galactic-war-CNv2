# Helldivers Galactic War
[简体中文](https://github.com/UFJKM123/helldivers-galactic-war-CNv2/blob/main/README.md) | [English](https://github.com/UFJKM123/helldivers-galactic-war-CNv2/blob/main/README_en.md)
## A non-profit fan-made indie game set in the Helldivers universe, developed in JavaScript, primarily built with AI.
If you like this game, feel free to join our [Discord server](https://discord.gg/4rmPXcESXr) to post suggestions or develop together.

This game is a fan-made work and has no affiliation, endorsement, or partnership with *Helldivers* or its copyright holders **Arrowhead Game Studios** and **Sony Interactive Entertainment**. All related characters, settings, names, and other intellectual property belong to their respective owners. This work is non-commercial and created for fan exchange and learning purposes only, with no profit motive.

## 📌 Project Overview
A turn-based galactic strategy game with faction-based confrontations centered around Super Earth, Terminids, etc. On the galactic map, players occupy planets, dispatch troops, and use special units to change the battlefield. Includes front-line troop deployment, lane maneuvering, and special unit deployment.

## 🛠️ Development

The project uses Vue 3, Vite, and TypeScript. Node.js 22 or newer is required.

```bash
npm install
npm run dev
# Open the URL printed by Vite
# English UI is the default; use ?lang=zh-cn for Chinese
```

Run checks and a production build with:

```bash
npm run typecheck
npm run test:run
npm run build
npm run preview
```

Editable localization sources are under `lang_csv/`. Regenerate the runtime JSON files with `python3 develop_tools/csv2json.py`; output is written to `public/lang/<locale>/`. Campaign state is held in browser memory and there is no backend or save layer.

## 📋 Update Log


### V5.3.0
- Fixes:
Settlement popups are now always placed at the end of the queue.
- Balance:
  1. The DSS and ASS can now remove one level of Haze or Silent Domain after being deployed to a planet affected by Haze or Silent Domain.
  2. The "reduce troop count by 20" effect of the DSS and ASS now triggers every turn.
  3. Random difficulty caps: the sum of the results must not exceed 3; the sum of custom difficulty settings must not exceed 9.

### V5.2.0
- Fixes：
  1. Fixed issue where small star maps could have disconnected isolated nodes.
  2. Optimized the “Homeworld Lost” pop-up: now displays in real-time when the player captures an enemy homeworld; for AI actions, the judgment is deferred until the end of the turn.
- Balance：
  Changed the base random value for Strategic Opportunities to 50 and the offset value to 50 (previously both were 25).
- New Features：
  1. Added an in-game statistics panel and a custom random difficulty button.
  2. UI art optimized.

### V5.1.0
- Fixes:
  fixed language assistance
- now all the text can change language synchronously and easy to add new language or fix translate mistakes
  added link of github page

### V5.0.0
- Refactor:
  Rebuilt the project with Vite.

### V4.0
- Fixes:
  1. Large-scale code refactoring.
  2. DSS and ASS can now only move to adjacent planets.
  3. DSS and ASS no longer incorrectly deduct friendly forces.
  4. Restored the Shift multi-select functionality.
- New Features:
  1. Single-select planet attack now follows the same rule as box-select: it can proceed as long as a friendly path connects to the target.
  2. Integrated English version.

### V3.15
- Fixes:
  1. Fixed: DSS/ASS will not move
  2. Optimized text in some pop-up dialogs
- Known issue: Democratic Dark Mode does not apply random intensity bonuses

### V3.14
- **Fixed**: Reworked batch attack logic; added supply line connectivity validation to determine whether a target planet can be reached.

### V3.13 (BUG version)
- **Fixed**: Bug fix attempts failed; this is not an official stable version.

### V3.12
- **Fixed**: Optimized attack logic, using unified total troop calculation instead of previous sequential troop simulation.
- **Known issues**: Cannot attack if adjacent friendly planet has zero points; troop calculation errors exist.

### V3.11
- **New feature**: Supports direct box selection.
- **Known issues**: Cannot attack if adjacent friendly planet has zero points; attack calculation errors occur when points are insufficient.

### V3.1
- **New feature**: Shift box selection; removed old Shift multi‑select mode.
- **Known issues**: Troop calculation errors exist.

### V3.0
- **Fixed**: Fixed unlimited stacking issue for Haze and Silent Domain.
- **Balance**: Removed dissipation mechanic; retained 5‑point continuous troop attrition effect.
- **Known issues**: Mini‑map has isolated region rendering/logic issues.

### V2.9 / V2.91 (test BUG versions)
- **New feature**: Attempted to develop Shift box selection; later abandoned.

### V2.8
- **New feature**: Galaxy map supports zoom.

### V2.7
- **Balance**: Maximum 4 Haze/Silent Domain per planet; after a planet is captured, Haze and Silent Domain will cause troop attrition for 2 rounds, then dissipate.

### V2.6 – Super Aggressive Version (scrapped)
> Plan abandoned; not officially released.
- **Balance**: Use BFS traversal to compute the shortest jumps from each planet to the front line; rear troops can only be transferred to adjacent friendly planets that are closer to the front line, achieving gradual troop concentration toward the front.

### V2.5 / V2.4
- **Fixed**:
  1. After capturing an enemy homeworld, its subsequent capture no longer triggers the "our homeworld has fallen" pop‑up.
  2. Increased brightness of lane display.
  3. After selecting an enemy/neutral planet, a prompt appears and selection is automatically canceled.
- **Balance**:
  - DSS and ASS units cannot be eliminated.
  - Defense +20, Weaken –30.
  - They can move to enemy planets; upon arrival, 20 points are deducted.
  - Can only move once per turn.

### V2.34
- **Fixed**: Silent Domain and Haze were incorrectly deployed on enemy planets.

### V2.33
- **Fixed**: AI would not actively deploy or use Silent Domain and Haze.

### V2.32
- **Fixed**: Mairafenmeng River spawned outside the galactic map boundary.

### V2.31
- **New feature**: Added starting random events (test version, balance continuously adjusted).
- **Fixed**: After assembling troops, you can directly launch an attack.
- **Balance**: Mairafenmeng River troop count adjusted to 10.

### V2.22
- **New feature**: Shift to assemble troops (assembly only, cannot directly launch attack).
- **Fixed**: Optimized homeworld fall pop‑up logic:
  - Pop‑up only triggers on first fall.
  - No repeated pop‑ups during back‑and‑forth faction struggles.
  - Own homeworld will not incorrectly trigger the pop‑up.
