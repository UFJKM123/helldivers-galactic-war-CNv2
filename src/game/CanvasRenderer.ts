import { CAMPS } from "./config";
import type { Link, Planet, Weapon } from "./types";

// ── 动画与视觉常量 ──────────────────────────────
const PULSE_PERIOD = Math.PI;       // 连线脉动周期（cos 参数，π=2s）
const LINK_WIDTH_PULSE = 1;         // 连线脉动最大额外线宽（px）
const LINK_BRIGHTEN = 0.2;          // 连线脉动最大提亮系数（0=不变 1=纯白）
const RING_ROTATE_SPEED = 3.0;      // 选中外环旋转速度（弧度/秒）
const RING_GAP = 0.3;               // 外环弧段间隙（弧度）
const CAPTURE_TRANSITION_S = 0.5;    // 星球占领颜色渐变时长（秒）

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
  /** 用于驱动选中星球外环旋转动画的时间戳（秒） */
  animTime: number;
  /** 星球颜色渐变过渡：uid → { 旧色, 新色, 起始时间(秒) } */
  colorTransitions: ReadonlyMap<string, { from: string; to: string; start: number }>;
}

/** 将 hex 颜色向白色混合，amount 0=原色 1=白色 */
function lightenHex(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return `#${mix(r).toString(16).padStart(2, "0")}${mix(g).toString(16).padStart(2, "0")}${mix(b).toString(16).padStart(2, "0")}`;
}

/** 在两个 hex 颜色之间按 t(0~1) 线性插值 */
function mixHex(a: string, b: string, t: number): string {
  const ar = parseInt(a.slice(1, 3), 16);
  const ag = parseInt(a.slice(3, 5), 16);
  const ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16);
  const bg = parseInt(b.slice(3, 5), 16);
  const bb = parseInt(b.slice(5, 7), 16);
  const mix = (c1: number, c2: number) => Math.round(c1 + (c2 - c1) * t);
  return `#${mix(ar, br).toString(16).padStart(2, "0")}${mix(ag, bg).toString(16).padStart(2, "0")}${mix(ab, bb).toString(16).padStart(2, "0")}`;
}

export function renderGalaxy(ctx: CanvasRenderingContext2D, state: RenderState): void {
  ctx.clearRect(0, 0, state.width, state.height);

  // 选中星球的脉动强度：以 2s 为周期，0→1→0 正弦波
  const pulse = (1 - Math.cos(state.animTime * PULSE_PERIOD)) / 2;

  state.links.forEach((link) => {
    const isBlocked = state.blockedLinks.has(link.idPair);
    const ax = link.a.x, ay = link.a.y;
    const bx = link.b.x, by = link.b.y;

    // 连线是否连接了选中星球
    const isSelectedLink =
      state.selectedPlanets.some((sp) => sp.uid === link.a.uid) ||
      state.selectedPlanets.some((sp) => sp.uid === link.b.uid);

    // 脉动效果：线宽增大，颜色向白色提亮
    const lw = isSelectedLink ? 1 + pulse * LINK_WIDTH_PULSE : 1;

    if (isBlocked) {
      // 被封锁：全线红色
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.strokeStyle = isSelectedLink ? lightenHex("#aa4444", pulse * LINK_BRIGHTEN) : "#aa4444";
      ctx.lineWidth = lw;
      ctx.stroke();
    } else if (link.a.camp && link.b.camp && link.a.camp !== link.b.camp) {
      // 不同阵营交界：两端用各自阵营色，中间渐变过渡
      const baseColorA = CAMPS[link.a.camp].color;
      const baseColorB = CAMPS[link.b.camp].color;
      const colorA = isSelectedLink ? lightenHex(baseColorA, pulse * LINK_BRIGHTEN) : baseColorA;
      const colorB = isSelectedLink ? lightenHex(baseColorB, pulse * LINK_BRIGHTEN) : baseColorB;
      const dx = bx - ax, dy = by - ay;
      const len = Math.hypot(dx, dy);
      const ux = dx / len, uy = dy / len;
      const half = 10;
      const midX = (ax + bx) / 2, midY = (ay + by) / 2;
      const gStartX = midX - ux * half, gStartY = midY - uy * half;
      const gEndX = midX + ux * half, gEndY = midY + uy * half;

      ctx.lineWidth = lw;

      // A 端 → 渐变起点
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(gStartX, gStartY);
      ctx.strokeStyle = colorA;
      ctx.stroke();

      // 中间渐变段
      const gradient = ctx.createLinearGradient(gStartX, gStartY, gEndX, gEndY);
      gradient.addColorStop(0, colorA);
      gradient.addColorStop(1, colorB);
      ctx.beginPath();
      ctx.moveTo(gStartX, gStartY);
      ctx.lineTo(gEndX, gEndY);
      ctx.strokeStyle = gradient;
      ctx.stroke();

      // 渐变终点 → B 端
      ctx.beginPath();
      ctx.moveTo(gEndX, gEndY);
      ctx.lineTo(bx, by);
      ctx.strokeStyle = colorB;
      ctx.stroke();
    } else {
      // 同阵营或含中立：单色
      const baseColor = link.a.camp && link.a.camp === link.b.camp
        ? CAMPS[link.a.camp].color
        : "#5a7aaa";
      const linkColor = isSelectedLink ? lightenHex(baseColor, pulse * LINK_BRIGHTEN) : baseColor;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.strokeStyle = linkColor;
      ctx.lineWidth = lw;
      ctx.stroke();
    }
  });

  state.planets.forEach((planet) => {
    const radius = planet.isHome ? 16 : 10;
    const camp = planet.camp ? CAMPS[planet.camp] : null;

    if (state.selectedPlanets.some((selected) => selected.uid === planet.uid)) {
      ctx.beginPath();
      ctx.arc(planet.x, planet.y, radius + 4, 0, Math.PI * 2);
      ctx.strokeStyle = "#ffd700";
      ctx.lineWidth = 3.25;
      ctx.stroke();

      // 外圆拆为 3 段等分扇形弧
      // arc() 的起止角单位是弧度，整圆 = 2π ≈ 6.283
      const outerR = radius + 6.75;                       // 外环半径（紧贴内环 gold 圈外侧）
      const gap = RING_GAP;
      const arcLen = (Math.PI * 2 - gap * 3) / 3;
      const rotate = state.animTime * RING_ROTATE_SPEED;
      for (let i = 0; i < 3; i++) {
        const start = rotate + gap / 2 + i * (arcLen + gap); // 旋转偏移 + 前半间隙 + 累计偏移
        ctx.beginPath();
        ctx.arc(planet.x, planet.y, outerR, start, start + arcLen);
        ctx.strokeStyle = "#b8960a";
        ctx.lineWidth = 4;
        ctx.stroke();
      }
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
    // 星球填充色：若存在占领过渡则插值，否则直接用阵营色
    let fillColor: string;
    const transition = state.colorTransitions.get(planet.uid);
    if (transition) {
      const elapsed = state.animTime - transition.start;
      const t = Math.min(elapsed / CAPTURE_TRANSITION_S, 1);
      fillColor = mixHex(transition.from, transition.to, t);
    } else {
      fillColor = camp?.color ?? "#505050";
    }
    ctx.fillStyle = fillColor;
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
