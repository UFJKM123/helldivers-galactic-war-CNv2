import { CAMPS } from "./config";
import type { Link, Planet, Weapon } from "./types";

export interface RenderState {
  width: number;
  height: number;
  links: readonly Link[];
  planets: readonly Planet[];
  weapons: readonly Weapon[];
  blockedLinks: ReadonlySet<string>;
  selectedPlanets: readonly Planet[];
  selectedWeapon: Weapon | null;
  isMouseDown: boolean;
  hasDragged: boolean;
  boxStartX: number;
  boxStartY: number;
  boxEndX: number;
  boxEndY: number;
}

export function renderGalaxy(ctx: CanvasRenderingContext2D, state: RenderState): void {
  ctx.clearRect(0, 0, state.width, state.height);

  state.links.forEach((link) => {
    const isBlocked = state.blockedLinks.has(link.idPair);
    ctx.beginPath();
    ctx.moveTo(link.a.x, link.a.y);
    ctx.lineTo(link.b.x, link.b.y);
    ctx.strokeStyle = isBlocked ? "#aa4444" : "#5a7aaa";
    ctx.lineWidth = isBlocked ? 2 : 1;
    ctx.stroke();
  });

  state.planets.forEach((planet) => {
    const radius = planet.isHome ? 16 : 10;
    const camp = planet.camp ? CAMPS[planet.camp] : null;

    if (state.selectedPlanets.some((selected) => selected.uid === planet.uid)) {
      ctx.beginPath();
      ctx.arc(planet.x, planet.y, radius + 6, 0, Math.PI * 2);
      ctx.strokeStyle = "#ffd700";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    if (state.selectedWeapon?.planetId === planet.uid) {
      ctx.beginPath();
      ctx.arc(planet.x, planet.y, radius + 5, 0, Math.PI * 2);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(planet.x, planet.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = camp?.color ?? "#505050";
    ctx.fill();

    if (planet.isHome) {
      ctx.beginPath();
      ctx.arc(planet.x, planet.y, radius + 3, 0, Math.PI * 2);
      ctx.strokeStyle = "#ffdd00";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    if (planet.resource) {
      ctx.fillStyle = "#ffaa00";
      ctx.font = "12px Arial";
      ctx.fillText("◆", planet.x, planet.y - radius - 2);
    }

    ctx.fillStyle = "#fff";
    ctx.font = "bold 11px Arial";
    ctx.textAlign = "center";
    ctx.fillText(String(planet.troop), planet.x, planet.y + radius + 13);
    ctx.fillStyle = "#aaa";
    ctx.font = "8px Microsoft Yahei";
    ctx.fillText(planet.planetName, planet.x, planet.y + radius + 22);

    const planetWeapons = state.weapons.filter((weapon) => weapon.planetId === planet.uid);
    let weaponY = planet.y - radius - 8;
    planetWeapons.forEach((weapon) => {
      ctx.fillStyle = CAMPS[weapon.camp]?.color ?? "#fff";
      ctx.font = "16px Arial";
      ctx.fillText(weapon.type === "mobile" ? "◈" : "⬢", planet.x, weaponY);
      weaponY -= 16;
    });
  });

  if (state.isMouseDown && state.hasDragged) {
    const x = Math.min(state.boxStartX, state.boxEndX);
    const y = Math.min(state.boxStartY, state.boxEndY);
    const width = Math.abs(state.boxEndX - state.boxStartX);
    const height = Math.abs(state.boxEndY - state.boxStartY);
    ctx.strokeStyle = "#00ffff";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, width, height);
    ctx.fillStyle = "rgba(0,255,255,0.1)";
    ctx.fillRect(x, y, width, height);
  }
}
