"use client";

import { useEffect, useRef, useState } from "react";
import { escapeHtml } from "@/lib/security";
import { SerializedPetition, isPetitionOverdue } from "@/lib/petitionUtils";

interface GoongMapProps {
  petitions: SerializedPetition[];
  height?: string;
}

function getPetitionCoordinates(pet: SerializedPetition): [number, number] {
  if (pet.location && pet.location.includes("GPS:")) {
    const match = pet.location.match(/GPS:\s*([0-9.]+),\s*([0-9.]+)/);
    if (match && match[1] && match[2]) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        return [lng, lat];
      }
    }
  }

  let hash = 0;
  for (let i = 0; i < pet.id.length; i++) {
    hash = pet.id.charCodeAt(i) + ((hash << 5) - hash);
  }

  const lat = 10.71 + ((Math.abs(hash) % 10000) / 10000) * 0.03;
  const lng = 106.62 + ((Math.abs(hash >> 3) % 10000) / 10000) * 0.035;
  return [lng, lat];
}

export default function GoongMap({ petitions, height = "480px" }: GoongMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const GOONG_MAP_KEY =
    process.env.NEXT_PUBLIC_GOONG_MAP_KEY || "wMcOxHb7uftjWS5GbIiOdTVmP2jwXOTPPHUof6oC";
  const GOONG_API_KEY =
    process.env.NEXT_PUBLIC_GOONG_API_KEY || "KnX2ICwrz3dEAXpeNaCtyrpvdZo438CbBCQBxhEE";

  useEffect(() => {
    const linkId = "goong-map-css-cdn";
    if (!document.getElementById(linkId)) {
      const link = document.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      link.href = "https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.css";
      document.head.appendChild(link);
    }

    const scriptId = "goong-map-js-cdn";

    const initMap = () => {
      const goongjs = (window as any).goongjs;
      if (!goongjs || !mapContainerRef.current) {
        setError("Không thể nạp thư viện Goong Map JS.");
        return;
      }

      try {
        goongjs.accessToken = GOONG_MAP_KEY;

        const map = new goongjs.Map({
          container: mapContainerRef.current,
          style: `https://tiles.goong.io/assets/goong_map_web.json?api_key=${GOONG_API_KEY}`,
          center: [106.635, 10.725],
          zoom: 14,
          pitch: 35,
        });

        map.addControl(new goongjs.NavigationControl(), "top-right");

        map.on("load", () => {
          setMapLoaded(true);

          map.addSource("binhdong-boundary-source", {
            type: "geojson",
            data: "/geojson/BD%20BINHDONG.geojson",
          });

          map.addLayer({
            id: "binhdong-fill-layer",
            type: "fill",
            source: "binhdong-boundary-source",
            paint: {
              "fill-color": "#059669",
              "fill-opacity": 0.14,
            },
          });

          map.addLayer({
            id: "binhdong-line-layer",
            type: "line",
            source: "binhdong-boundary-source",
            paint: {
              "line-color": "#047857",
              "line-width": 2,
            },
          });

          petitions.forEach((pet) => {
            const coords = getPetitionCoordinates(pet);
            const overdue = isPetitionOverdue(pet);

            let markerClass = "goong-custom-marker marker-completed";
            let statusText = "Đã xong";
            let badgeColor = "#059669";

            if (overdue) {
              markerClass = "goong-custom-marker marker-overdue";
              statusText = "Quá hạn";
              badgeColor = "#dc2626";
            } else if (pet.status !== "Đã xong") {
              markerClass = "goong-custom-marker marker-in-progress";
              statusText = pet.status;
              badgeColor = "#d97706";
            }

            const el = document.createElement("div");
            el.className = markerClass;

            const popupHTML = `
              <div style="font-family: var(--font-sans), sans-serif; padding: 0.45rem; max-width: 240px; color: #121316;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.3rem;">
                  <strong style="color: ${badgeColor}; font-size: 0.84rem;">${escapeHtml(pet.petitionCode)}</strong>
                  <span style="font-size: 0.72rem; font-weight: 700; color: ${badgeColor};">${escapeHtml(statusText)}</span>
                </div>
                <div style="font-weight: 700; font-size: 0.82rem; margin-bottom: 0.2rem;">${escapeHtml(pet.senderName)}</div>
                <div style="font-size: 0.76rem; color: #4b5563; margin-bottom: 0.35rem; line-height: 1.35;">${escapeHtml(pet.content.slice(0, 90))}</div>
                <div style="font-size: 0.72rem; color: #787d87; font-weight: 600;">${escapeHtml(pet.quarter || pet.location)}</div>
              </div>
            `;

            const popup = new goongjs.Popup({ offset: 12, closeButton: true }).setHTML(popupHTML);

            new goongjs.Marker(el).setLngLat(coords).setPopup(popup).addTo(map);
          });
        });
      } catch (err: any) {
        setError(err?.message || "Lỗi khởi tạo bản đồ.");
      }
    };

    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!(window as any).goongjs) {
      if (!script) {
        script = document.createElement("script");
        script.id = scriptId;
        script.src = "https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.js";
        script.async = true;
        script.onload = initMap;
        script.onerror = () => setError("Không thể tải Goong Map SDK.");
        document.body.appendChild(script);
      } else {
        script.addEventListener("load", initMap);
      }
    } else {
      initMap();
    }
  }, [petitions, GOONG_MAP_KEY, GOONG_API_KEY]);

  return (
    <div style={{ position: "relative", width: "100%", height, borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
      {error ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--danger)", fontWeight: 700 }}>
          {error}
        </div>
      ) : (
        <>
          <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />
          {!mapLoaded && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(246, 247, 249, 0.88)", zIndex: 10, fontWeight: 700 }}>
              Đang tải bản đồ Phường Bình Đông...
            </div>
          )}
        </>
      )}
    </div>
  );
}
