"use client";

import L from "leaflet";
import "react-leaflet-cluster/dist/assets/MarkerCluster.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.Default.css";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";

type RecyclingEvent = {
  lat?: number | null;
  lng?: number | null;
  product_name?: string | null;
  city?: string | null;
  recycled_at?: string | null;
  scan_id?: string | null;
  units?: number | null;
};

const greenIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/2907/2907253.png",
  iconSize: [26, 26],
});

export default function RecyclingMap({ events }: { events: RecyclingEvent[] }) {
  const validEvents = (events || []).filter((e) => e.lat && e.lng);
  const center: [number, number] = [36.7213, -4.4214];

  return (
    <div className="w-full h-[520px] rounded-xl overflow-hidden border border-gray-200 shadow-sm">
      <MapContainer
        center={center}
        zoom={11}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution="© OpenStreetMap contributors"
        />

        <MarkerClusterGroup
          chunkedLoading
          iconCreateFunction={(cluster: { getChildCount: () => number }) => {
            return L.divIcon({
              html: `
                <div style="
                  background:#2d6a4f;
                  color:white;
                  width:40px;
                  height:40px;
                  border-radius:50%;
                  display:flex;
                  align-items:center;
                  justify-content:center;
                  font-weight:600;
                  font-size:14px;
                ">
                  ${cluster.getChildCount()}
                </div>
              `,
              className: "greenloop-cluster",
              iconSize: L.point(40, 40),
            });
          }}
        >
          {validEvents.map((event, i) => (
            <Marker
              key={event.scan_id ?? i}
              position={[event.lat as number, event.lng as number] as [number, number]}
              icon={greenIcon}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold text-gray-900">
                    {event.product_name}
                  </div>

                  <div className="text-gray-600">
                    📍 {event.city || "Unknown city"}
                  </div>

                  <div className="text-gray-500">
                    {event.recycled_at ? new Date(event.recycled_at).toLocaleString() : ""}
                  </div>

                  <div className="text-green-700 font-medium">
                    ♻ {event.units} unit recycled
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>

      </MapContainer>
    </div>
  );
}
