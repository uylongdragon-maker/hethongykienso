"use client";

import { useEffect, useRef, useState } from "react";

interface SerializedPetition {
  id: string;
  petitionCode: string;
  source: string;
  quarter: string | null;
  senderName: string;
  senderAddress: string;
  senderPhone: string | null;
  category: string;
  location: string;
  content: string;
  authority: string;
  department: string;
  receivedDate: string;
  deadline: string;
  extendedUntil: string | null;
  status: string;
  replyDocNumber: string | null;
  replyDocDate: string | null;
  replyDocLink: string | null;
}

interface GoongMapProps {
  petitions: SerializedPetition[];
}

// Hàm băm tọa độ ngẫu nhiên nhưng cố định cho mỗi kiến nghị nằm trong phạm vi phường Bình Đông
function getPetitionCoordinates(pet: SerializedPetition) {
  let hash = 0;
  for (let i = 0; i < pet.id.length; i++) {
    hash = pet.id.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Tọa độ bao quanh Phường Bình Đông (Quận 8)
  const minLat = 10.718;
  const maxLat = 10.729;
  const minLng = 106.626;
  const maxLng = 106.640;
  
  const lat = minLat + (Math.abs(hash) % 10000) / 10000 * (maxLat - minLat);
  const lng = minLng + (Math.abs(hash >> 3) % 10000) / 10000 * (maxLng - minLng);
  
  return [lng, lat];
}

export default function GoongMap({ petitions }: GoongMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dynamic API keys selection: use demo keys on localhost to bypass domain/referrer restrictions
  const isLocal = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
  const GOONG_MAP_KEY = isLocal ? "8y6t5o7c9m1k2v8y6t5o7c9m1k2v8y6t" : (process.env.NEXT_PUBLIC_GOONG_MAP_KEY || "wMcOxHb7uftjWS5GbIiOdTVmP2jwXOTPPHUof6oC");
  const GOONG_API_KEY = isLocal ? "7tK1g1n8vR22y0K6o7c9m1k2v8y6t5o7" : (process.env.NEXT_PUBLIC_GOONG_API_KEY || "KnX2ICwrz3dEAXpeNaCtyrpvdZo438CbBCQBxhEE");

  useEffect(() => {
    // 1. Tải stylesheet của Goong Map
    const linkId = "goong-map-css";
    if (!document.getElementById(linkId)) {
      const link = document.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      link.href = "/libs/goong-js.css";
      document.head.appendChild(link);
    }

    // 2. Tải Goong Map JS SDK
    const scriptId = "goong-map-js";
    const initMap = () => {
      const goongjs = (window as any).goongjs;
      if (!goongjs) {
        setError("Không thể tải thư viện Goong Map JS SDK.");
        return;
      }

      if (!mapContainerRef.current) return;

      try {
        goongjs.accessToken = GOONG_MAP_KEY;
        
        // Khởi tạo bản đồ Goong Map centered vào Phường Bình Đông, Quận 8, TP.HCM
        const map = new goongjs.Map({
          container: mapContainerRef.current,
          style: `https://tiles.goong.io/assets/goong_map_web.json?api_key=${GOONG_API_KEY}`,
          center: [106.632, 10.724], // Tọa độ trung tâm phường Bình Đông
          zoom: 14.5,
          pitch: 30, // Góc nghiêng 3D nhẹ
        });

        // Thêm các control điều hướng
        map.addControl(new goongjs.NavigationControl(), "top-right");

        map.on("load", () => {
          setMapLoaded(true);

          // 3. Nạp ranh giới Phường Bình Đông từ file GeoJSON
          map.addSource("binhdong-boundary", {
            type: "geojson",
            data: "/geojson/binhdong_boundary.geojson",
          });

          // Vẽ mảng đa giác (Polygon Fill)
          map.addLayer({
            id: "binhdong-fill",
            type: "fill",
            source: "binhdong-boundary",
            paint: {
              "fill-color": "#10b981",
              "fill-opacity": 0.12,
            },
          });

          // Vẽ đường viền (Polygon Stroke)
          map.addLayer({
            id: "binhdong-stroke",
            type: "line",
            source: "binhdong-boundary",
            paint: {
              "line-color": "#047857",
              "line-width": 3,
              "line-dasharray": [1, 1], // viền đứt nét nhẹ nhàng
            },
          });

          // 4. Plot các ghim kiến nghị lên bản đồ
          petitions.forEach((pet) => {
            const coords = getPetitionCoordinates(pet);
            
            // Xác định màu sắc marker
            let markerColor = "#10b981"; // Đã xong: Xanh lá
            if (pet.status === "Quá hạn" || (pet.status !== "Đã xong" && new Date(pet.deadline) < new Date())) {
              markerColor = "#f43f5e"; // Quá hạn: Đỏ
            } else if (pet.status === "Đang xử lý") {
              markerColor = "#f59e0b"; // Đang xử lý: Vàng
            }

            // Tạo HTML Custom Marker Element
            const el = document.createElement("div");
            el.className = "custom-map-marker";
            el.style.width = "18px";
            el.style.height = "18px";
            el.style.borderRadius = "50%";
            el.style.backgroundColor = markerColor;
            el.style.border = "2.5px solid #fff";
            el.style.boxShadow = "0 3px 6px rgba(0,0,0,0.3)";
            el.style.cursor = "pointer";

            // Tạo popup thông tin chi tiết
            const popupHTML = `
              <div style="font-family: var(--font-sans); padding: 0.25rem; font-size: 0.8rem; color: #191918;">
                <strong style="color: ${markerColor}; display: block; margin-bottom: 0.25rem;">[${pet.petitionCode}]</strong>
                <div style="font-weight: 700; margin-bottom: 0.25rem;">Người gửi: ${pet.senderName}</div>
                <div style="color: var(--text-secondary); font-size: 0.75rem; margin-bottom: 0.5rem; line-height: 1.3;">
                  Nội dung: ${pet.content.substring(0, 80)}${pet.content.length > 80 ? "..." : ""}
                </div>
                <div style="font-size: 0.72rem; color: var(--text-muted);">Địa điểm: ${pet.quarter || pet.location}</div>
                <a href="/petitions/${pet.id}" style="display: block; margin-top: 0.5rem; color: var(--primary); font-weight: 700; text-decoration: underline;">Xem chi tiết →</a>
              </div>
            `;

            const popup = new goongjs.Popup({ offset: 10 }).setHTML(popupHTML);

            // Ghim lên bản đồ
            new goongjs.Marker(el)
              .setLngLat(coords)
              .setPopup(popup)
              .addTo(map);
          });
        });
      } catch (err: any) {
        console.error("Lỗi khởi tạo bản đồ Goong:", err);
        setError("Lỗi khởi tạo bản đồ Goong Map: Vui lòng kiểm tra cấu hình khóa API.");
      }
    };

    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!(window as any).goongjs) {
      if (!script) {
        script = document.createElement("script");
        script.id = scriptId;
        script.src = "/libs/goong-js.js";
        script.async = true;
        script.onload = initMap;
        document.body.appendChild(script);
      } else {
        script.addEventListener("load", initMap);
      }
    } else {
      initMap();
    }
  }, [petitions]);

  return (
    <div style={{ position: "relative", width: "100%", height: "450px", borderRadius: "var(--radius-lg)", overflow: "hidden", border: "1px solid var(--border-color)" }}>
      {error ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: "2rem", backgroundColor: "#fef2f2", color: "#991b1b", textAlign: "center" }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginBottom: "0.5rem" }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <strong style={{ fontSize: "0.95rem" }}>Cấu hình Goong Map chưa hoàn tất</strong>
          <span style={{ fontSize: "0.8rem", marginTop: "0.25rem", opacity: 0.85 }}>{error}</span>
          <span style={{ fontSize: "0.75rem", marginTop: "0.5rem", color: "var(--text-secondary)" }}>
            * Vui lòng bổ sung biến môi trường <code>NEXT_PUBLIC_GOONG_MAP_KEY</code> và <code>NEXT_PUBLIC_GOONG_API_KEY</code> để kích hoạt bản đồ nền.
          </span>
        </div>
      ) : (
        <>
          <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />
          {!mapLoaded && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.7)", zIndex: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "600" }}>
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                Đang tải bản đồ số phường Bình Đông...
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
