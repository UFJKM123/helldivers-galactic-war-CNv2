import { describe, expect, it } from "vitest";
import { arePlanetsConnected, getFrontierPlanets } from "./connectivity";
import { calculateScore, resolveCombat } from "./combat";
import type { Link, Planet, Weapon } from "../types";

const planet = (uid: string, camp: Planet["camp"], troop = 10): Planet => ({
  uid, camp, troop, x: 0, y: 0, isHome: false, originalCamp: camp, planetName: uid, resource: false,
});
const link = (a: Planet, b: Planet): Link => ({ a, b, idPair: [a.uid, b.uid].sort().join("_") });

it("finds a friendly supply path and respects blocked links", () => {
  const earthA = planet("a", "EARTH");
  const earthB = planet("b", "EARTH");
  const earthC = planet("c", "EARTH");
  const links = [link(earthA, earthB), link(earthB, earthC)];

  expect(arePlanetsConnected(links, new Set(), "EARTH", earthA, earthC)).toBe(true);
  expect(arePlanetsConnected(links, new Set([links[1].idPair]), "EARTH", earthA, earthC)).toBe(false);
  expect(getFrontierPlanets(links, new Set(), "EARTH", earthC)).toEqual([earthB]);
});

it("resolves defended attacks without allowing zero troop planets", () => {
  const target = planet("target", "TERM", 30);
  const weapon: Weapon = { id: "weapon", camp: "TERM", type: "deploy", planetId: target.uid, guardBonus: 20, weaken: 15, decay: 5 };

  expect(resolveCombat(60, target, [weapon])).toEqual({ captured: false, kills: 30, remainingTroop: 1 });
  expect(resolveCombat(100, target, [weapon])).toEqual({ captured: true, kills: 30, remainingTroop: 35 });
});

it("calculates the existing score formula", () => {
  expect(calculateScore(10, 100, 12)).toBe(136);
});
