"use client";

import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";

type PlatformReportEvent = {
  lat?: number | null;
  lng?: number | null;
  units?: number;
  city?: string | null;
  product_name?: string;
  created_at?: string;
};

export default function AdminRecyclingHeatmap({
  events,
}: {
  events: PlatformReportEvent[];
}) {
  const center: [number, number] = [36.7213, -4.4214];
  const validEvents = events.filter(
    (event) => event.lat != null && event.lng != null
  );

  return (
    <div className="h-[520px] w-full overflow-hidden rounded-xl border border-gray-200 shadow-sm">
      <MapContainer center={center} zoom={8} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution="© OpenStreetMap contributors"
        />
        {validEvents.map((event, index) => (
          <CircleMarker
            key={`${event.created_at ?? "event"}-${index}`}
            center={[event.lat as number, event.lng as number]}
            radius={Math.max(4, Number(event.units ?? 0))}
            pathOptions={{ color: "#2d6a4f", fillOpacity: 0.7 }}
          >
            <Popup>
              <div className="text-sm">
                <div>
                  <span className="font-semibold text-gray-900">City:</span>{" "}
                  {event.city || "Unknown"}
                </div>
                <div>
                  <span className="font-semibold text-gray-900">Product:</span>{" "}
                  {event.product_name || "Unknown"}
                </div>
                <div>
                  <span className="font-semibold text-gray-900">Units:</span>{" "}
                  {Number(event.units ?? 0)}
                </div>
                <div>
                  <span className="font-semibold text-gray-900">Timestamp:</span>{" "}
                  {event.created_at ? new Date(event.created_at).toLocaleString() : ""}
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
