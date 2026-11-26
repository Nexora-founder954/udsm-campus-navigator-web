// Walking router over VERIFIED pathways only. Returns null if no connected route exists.
export type Node = { id: string; lat: number; lng: number };
export type Edge = { from_node: string; to_node: string; length_m: number; geometry?: [number, number][] | null };
export type Route = { points: [number, number][]; distanceM: number; durationMin: number; steps: string[] };

const WALK_M_PER_MIN = 80;
const rad = (d: number) => (d * Math.PI) / 180;

export function haversine(a: [number, number], b: [number, number]) {
  const dLat = rad(b[0] - a[0]), dLng = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}
function bearing(a: [number, number], b: [number, number]) {
  const y = Math.sin(rad(b[1] - a[1])) * Math.cos(rad(b[0]));
  const x = Math.cos(rad(a[0])) * Math.sin(rad(b[0])) - Math.sin(rad(a[0])) * Math.cos(rad(b[0])) * Math.cos(rad(b[1] - a[1]));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export function nearestNode(nodes: Node[], p: [number, number], maxM = 150): Node | null {
  let best: Node | null = null, bd = Infinity;
  for (const n of nodes) { const d = haversine(p, [n.lat, n.lng]); if (d < bd) { bd = d; best = n; } }
  return bd <= maxM ? best : null;
}

export function findRoute(nodes: Node[], edges: Edge[], fromId: string, toId: string): Route | null {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  type Adj = { to: string; w: number; geo?: [number, number][] | null; rev: boolean };
  const adj = new Map<string, Adj[]>();
  const add = (k: string, v: Adj) => { if (!adj.has(k)) adj.set(k, []); adj.get(k)!.push(v); };
  for (const e of edges) {
    add(e.from_node, { to: e.to_node, w: e.length_m, geo: e.geometry, rev: false });
    add(e.to_node, { to: e.from_node, w: e.length_m, geo: e.geometry, rev: true });
  }
  const dist = new Map<string, number>([[fromId, 0]]);
  const prev = new Map<string, { id: string; geo?: [number, number][] | null; rev: boolean }>();
  const queue = new Set<string>([fromId]);
  while (queue.size) {
    let u = "", ud = Infinity;
    for (const q of queue) { const d = dist.get(q)!; if (d < ud) { ud = d; u = q; } }
    queue.delete(u);
    if (u === toId) break;
    for (const { to, w, geo, rev } of adj.get(u) ?? []) {
      const nd = ud + w;
      if (nd < (dist.get(to) ?? Infinity)) { dist.set(to, nd); prev.set(to, { id: u, geo, rev }); queue.add(to); }
    }
  }
  if (!dist.has(toId)) return null;

  const points: [number, number][] = [];
  let cur = toId;
  for (;;) {
    const n = byId.get(cur)!;
    points.unshift([n.lat, n.lng]);
    const p = prev.get(cur);
    if (!p) break;
    if (p.geo) {
      const seg = p.rev ? [...p.geo].reverse() : p.geo;
      points.splice(0, 0, ...seg.slice(1, -1));
    }
    cur = p.id;
  }
  const distanceM = dist.get(toId)!;
  return { points, distanceM, durationMin: Math.max(1, Math.round(distanceM / WALK_M_PER_MIN)), steps: buildSteps(points) };
}

// Instructions come only from real route geometry (turns over 30 degrees).
export function buildSteps(pts: [number, number][]): string[] {
  const steps = ["Start along the mapped pathway."];
  let acc = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    acc += haversine(pts[i - 1], pts[i]);
    const turn = ((bearing(pts[i], pts[i + 1]) - bearing(pts[i - 1], pts[i]) + 540) % 360) - 180;
    if (Math.abs(turn) > 30) {
      steps.push(`After ${Math.round(acc)} m, turn ${turn > 0 ? "right" : "left"}.`);
      acc = 0;
    }
  }
  steps.push("You have arrived at your destination.");
  return steps;
}
