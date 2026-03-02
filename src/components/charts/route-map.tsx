"use client";
import { MapContainer, TileLayer, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import type { LatLngTuple } from "leaflet";
import L from "leaflet";

// Fix Leaflet default icon resolution in Next.js
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: "", iconUrl: "", shadowUrl: "" });

interface RouteMapProps {
  lat: number[];
  lng: number[];
}

function FitBounds({ positions }: { positions: LatLngTuple[] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      map.fitBounds(positions, { padding: [20, 20] });
    }
  }, [map, positions]);
  return null;
}

export function RouteMap({ lat, lng }: RouteMapProps) {
  // Filter out invalid coordinates: zeros (no GPS fix), NaN, and out-of-range values
  const positions: LatLngTuple[] = lat
    .map((la, i) => [la, lng[i]] as LatLngTuple)
    .filter(
      ([la, ln]) =>
        !isNaN(la) &&
        !isNaN(ln) &&
        (la !== 0 || ln !== 0) &&
        la >= -90 && la <= 90 &&
        ln >= -180 && ln <= 180
    );
  if (positions.length === 0) return null;
  const center = positions[Math.floor(positions.length / 2)];

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
      <Polyline positions={positions} color="#2563eb" weight={3} opacity={0.9} />
      <FitBounds positions={positions} />
    </MapContainer>
  );
}
