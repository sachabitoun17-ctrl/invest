"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { PropertyWithVotes, computeMetrics } from "@/types/property";

// Fix Leaflet marker icons in Next.js
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function scoreColor(score: number): string {
  if (score >= 70) return "#22c55e";
  if (score >= 50) return "#f59e0b";
  if (score >= 30) return "#f97316";
  return "#ef4444";
}

function makeIcon(score: number) {
  const color = scoreColor(score);
  return L.divIcon({
    className: "",
    html: `<div style="
      background:${color};
      color:white;
      border-radius:50%;
      width:36px;height:36px;
      display:flex;align-items:center;justify-content:center;
      font-weight:700;font-size:13px;
      border:2px solid white;
      box-shadow:0 2px 6px rgba(0,0,0,0.3);
    ">${score}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

function FitBounds({ properties }: { properties: PropertyWithVotes[] }) {
  const map = useMap();
  useEffect(() => {
    const pts = properties.filter((p) => p.lat && p.lng) as (PropertyWithVotes & {
      lat: number;
      lng: number;
    })[];
    if (pts.length === 0) return;
    const bounds = L.latLngBounds(pts.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }, [map, properties]);
  return null;
}

interface Props {
  properties: PropertyWithVotes[];
  selected: string | null;
  onSelect: (id: string) => void;
}

export default function Map({ properties, selected, onSelect }: Props) {
  const withCoords = properties.filter((p) => p.lat && p.lng);

  return (
    <MapContainer
      center={[48.8566, 2.3522]}
      zoom={11}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {withCoords.length > 0 && <FitBounds properties={properties} />}
      {withCoords.map((p) => {
        const m = computeMetrics(p);
        return (
          <Marker
            key={p.id}
            position={[p.lat!, p.lng!]}
            icon={makeIcon(m.score)}
            eventHandlers={{ click: () => onSelect(p.id) }}
          >
            <Popup>
              <div className="text-sm min-w-[180px]">
                <div className="font-semibold">{p.address}</div>
                <div className="text-gray-500">{p.city}</div>
                <div className="mt-1 grid grid-cols-2 gap-x-2 text-xs">
                  <span>{p.surface} m²</span>
                  <span>{(p.price / 1000).toFixed(0)}k €</span>
                  {m.yieldMin && (
                    <span className="font-medium text-green-600">
                      ~{m.yieldMin.toFixed(1)}% brut
                    </span>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
