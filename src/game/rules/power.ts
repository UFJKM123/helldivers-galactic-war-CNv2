import type { CampKey, Planet } from "../types";

export function getPowerByCamp(planets: readonly Planet[], campKeys: readonly CampKey[]) {
  return Object.fromEntries(
    campKeys.map((campKey) => [
      campKey,
      planets
        .filter((planet) => planet.camp === campKey)
        .reduce((total, planet) => total + planet.troop, 0),
    ]),
  ) as Record<CampKey, number>;
}
