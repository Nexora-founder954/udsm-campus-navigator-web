"use client";
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { createClient } from "@supabase/supabase-js";
import { findRoute, nearestNode, type Node, type Edge, type Route } from "@/lib/routing";
import { t, type Lang } from "@/lib/i18n";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
// Set NEXT_PUBLIC_UDSM_CENTER to the verified campus centre, e.g. [lat,lng]
const CENTER: [number, number] = JSON.parse(process.env.NEXT_PUBLIC_UDSM_CENTER || "[0,0]");

type Loc = { id: string; name: string; lat: number | null; lng: number | null; node_id: string | null; verified: boolean };

export default function CampusMap({ lang = "en" }: { lang?: Lang }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const routeLayer = useRef<L.Polyline | null>(null);
  const meMarker = useRef<L.CircleMarker | null>(null);
  const [locs, setLocs] = useState<Loc[]>([]);
  const [graph, setGraph] = useState<{ nodes: Node[]; edges: Edge[] }>({ nodes: [], edges: [] });
  const [from, setFrom] = useState<[number, number] | null>(null);
  const [toId, setToId] = useState("");
  const [route, setRoute] = useState<Route | null>(null);
  const [msg, setMsg] = useState("");
  const L10 = t[lang];

  useEffect(() => {
    const m = L.map(el.current!).setView(CENTER, 16);
    map.current = m;
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap contributors", maxZoom: 19 }).addTo(m);
    m.on("click", (e) => setFrom([e.latlng.lat, e.latlng.lng]));
    (async () => {
      const [l, n, p] = await Promise.all([
        supabase.from("locations").select("id,name,lat,lng,node_id,verified").eq("published", true),
        supabase.from("path_nodes").select("*"),
        supabase.from("pathways").select("from_node,to_node,length_m,geometry").eq("verified", true),
      ]);
      const rows = (l.data ?? []) as Loc[];
      setLocs(rows);
      setGraph({ nodes: (n.data ?? []) as Node[], edges: (p.data ?? []) as Edge[] });
      rows.forEach((x) => x.lat != null && x.lng != null &&
        L.marker([x.lat, x.lng]).addTo(m).bindPopup(`<b>${x.name}</b>${x.verified ? "" : `<br/>${L10.unverified}`}`));
    })();
    return () => { m.remove(); };
  }, []);

  function useMyLocation() {
    if (!navigator.geolocation) return setMsg(L10.gpsDenied);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setFrom(p);
        meMarker.current?.remove();
        meMarker.current = L.circleMarker(p, { radius: 9, color: "#fff", weight: 3, fillColor: "#1a56db", fillOpacity: 1 })
          .addTo(map.current!).bindTooltip(L10.youAreHere, { permanent: true });
        map.current!.setView(p, 18);
      },
      () => setMsg(L10.gpsDenied),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function go() {
    setMsg(""); routeLayer.current?.remove();
    const dest = locs.find((x) => x.id === toId);
    if (!from || !dest) return;
    const a = nearestNode(graph.nodes, from);
    const b = dest.node_id ? graph.nodes.find((n) => n.id === dest.node_id) ?? null
      : dest.lat != null && dest.lng != null ? nearestNode(graph.nodes, [dest.lat, dest.lng]) : null;
    const r = a && b ? findRoute(graph.nodes, graph.edges, a.id, b.id) : null;
    if (!r) { setRoute(null); return setMsg(L10.noRoute); }
    setRoute(r);
    routeLayer.current = L.polyline(r.points, { color: "#0b3d91", weight: 6 }).addTo(map.current!);
    map.current!.fitBounds(routeLayer.current.getBounds(), { padding: [40, 40] });
  }

  return (
    <div className="relative h-[100dvh] w-full">
      <div ref={el} className="absolute inset-0" />
      <div className="absolute left-3 right-3 top-3 z-[1000] max-w-md rounded-2xl bg-white p-3 shadow-lg">
        <button onClick={useMyLocation} className="mb-2 w-full rounded-xl bg-slate-100 p-3 text-left">
          {from ? `${L10.from}: ${from[0].toFixed(5)}, ${from[1].toFixed(5)}` : L10.currentLocation}
        </button>
        <select value={toId} onChange={(e) => setToId(e.target.value)} className="mb-2 w-full rounded-xl bg-slate-100 p-3">
          <option value="">{L10.findDestination}</option>
          {locs.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
        <button onClick={go} className="w-full rounded-xl bg-[#0b3d91] p-3 font-semibold text-white">{L10.findRoute}</button>
        {msg && <p className="mt-2 text-sm text-red-700">{msg}</p>}
        {route && (
          <div className="mt-2 text-sm">
            <p className="font-semibold">{Math.round(route.distanceM)} m · ~{route.durationMin} min</p>
            <ol className="ml-4 list-decimal">{route.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
          </div>
        )}
      </div>
    </div>
  );
}
