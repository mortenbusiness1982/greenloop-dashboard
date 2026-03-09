"use client";

import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";

type RecyclingEvent = {
  lat?: number | null;
  lng?: number | null;
  product_name?: string | null;
  city?: string | null;
  recycled_at?: string | null;
};

export default function RecyclingMap({ events }: { events: RecyclingEvent[] }) {
  const validEvents = (events || []).filter((e) => e.lat && e.lng);
  const center: [number, number] = [36.7213, -4.4214];

  return (
    <div className="relative rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="absolute top-0 left-0 h-[3px] w-full rounded-t-xl bg-[#2d6a4f]"></div>

      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Recycling Activity Map
      </h3>

      <MapContainer
        center={center}
        zoom={11}
        style={{ height: "400px", width: "100%" }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {validEvents.map((event, i) => (
          <Marker key={i} position={[event.lat as number, event.lng as number] as [number, number]}>
            <Popup>
              <strong>{event.product_name}</strong><br/>
              {event.city || "Unknown city"}<br/>
              {event.recycled_at ? new Date(event.recycled_at).toLocaleString() : ""}
            </Popup>
          </Marker>
        ))}

      </MapContainer>
    </div>
  );
}
