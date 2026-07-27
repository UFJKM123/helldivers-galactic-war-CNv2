import type { Planet, Weapon } from "../types";

export interface CombatResult {
  captured: boolean;
  kills: number;
  remainingTroop: number;
}

export function resolveCombat(
  attackTroop: number,
  target: Planet,
  weapons: readonly Weapon[],
): CombatResult {
  let guardBonus = 0;
  let weakenEffect = 0;
  for (const weapon of weapons) {
    if (target.camp === weapon.camp) {
      guardBonus += weapon.guardBonus;
      weakenEffect += weapon.weaken;
    }
  }

  const effectiveAttack = Math.max(0, attackTroop - weakenEffect);
  const defendTroop = target.troop + guardBonus;
  const result = effectiveAttack - defendTroop;
  if (result > 0) {
    return { captured: true, kills: target.troop, remainingTroop: result };
  }
  return {
    captured: false,
    kills: Math.min(attackTroop, target.troop),
    remainingTroop: Math.max(1, target.troop - attackTroop),
  };
}

export function calculateScore(planetCount: number, kills: number, turns: number): number {
  return Math.round(planetCount * 9 + kills * 0.22 + turns * 2);
}
