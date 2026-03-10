"use client";
import { MapContainer, TileLayer, CircleMarker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import type { LatLngTuple } from "leaflet";
import L from "leaflet";
import type { HeatmapCell } from "@/app/api/analytics/heatmap/route";

// Fix Leaflet default icon resolution in Next.js
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: "", iconUrl: "", shadowUrl: "" });

interface HeatmapMapProps {
  cells: HeatmapCell[];
  maxCount: number;
}

function FitBounds({ cells }: { cells: HeatmapCell[] }) {
  const map = useMap();
  useEffect(() => {
    if (cells.length === 0) return;
    const lats = cells.map((c) => c.lat);
    const lngs = cells.map((c) => c.lng);
    const bounds: [LatLngTuple, LatLngTuple] = [
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)],
    ];
    map.fitBounds(bounds, { padding: [20, 20] });
  }, [map, cells]);
  return null;
}

/** Interpolate from blue (low) to red (high) in HSL */
function frequencyColor(count: number, maxCount: number): string {
  const ratio = maxCount > 1 ? count / maxCount : 1;
  const hue = Math.round(240 - ratio * 240); // 240=blue → 0=red
  return `hsl(${hue}, 90%, 50%)`;
}

export function HeatmapMap({ cells, maxCount }: HeatmapMapProps) {
  if (cells.length === 0) return null;
  const center: LatLngTuple = [cells[0].lat, cells[0].lng];

  return (
    <MapContainer
      center={center}
      zoom={13}
      style={{ height: "100%", width: "100%" }}
      zoomControl
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {cells.map((cell, i) => {
        const ratio = maxCount > 1 ? cell.count / maxCount : 1;
        return (
          <CircleMarker
            key={i}
            center={[cell.lat, cell.lng]}
            radius={4 + ratio * 8}
            pathOptions={{
              color: "transparent",
              fillColor: frequencyColor(cell.count, maxCount),
              fillOpacity: 0.3 + ratio * 0.55,
            }}
          />
        );
      })}
      <FitBounds cells={cells} />
    </MapContainer>
  );
}
