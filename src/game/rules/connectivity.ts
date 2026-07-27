import type { Link, Planet } from "../types";

export function arePlanetsConnected(
  links: readonly Link[],
  blockedLinks: ReadonlySet<string>,
  playerCampKey: Planet["camp"],
  a: Planet,
  b: Planet,
): boolean {
  if (a.uid === b.uid) return true;
  const visited = new Set<string>([a.uid]);
  const queue = [a];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const link of links) {
      let neighbor: Planet | null = null;
      if (link.a.uid === current.uid) neighbor = link.b;
      else if (link.b.uid === current.uid) neighbor = link.a;
      if (!neighbor || blockedLinks.has(link.idPair) || neighbor.camp !== playerCampKey) continue;
      if (neighbor.uid === b.uid) return true;
      if (!visited.has(neighbor.uid)) {
        visited.add(neighbor.uid);
        queue.push(neighbor);
      }
    }
  }
  return false;
}

export function getFrontierPlanets(
  links: readonly Link[],
  blockedLinks: ReadonlySet<string>,
  playerCampKey: Planet["camp"],
  target: Planet,
): Planet[] {
  return links.flatMap((link) => {
    if (blockedLinks.has(link.idPair)) return [];
    if (link.a.uid === target.uid && link.b.camp === playerCampKey) return [link.b];
    if (link.b.uid === target.uid && link.a.camp === playerCampKey) return [link.a];
    return [];
  });
}
