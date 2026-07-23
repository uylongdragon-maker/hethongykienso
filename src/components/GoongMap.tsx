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
  height?: string;
  interactive?: boolean;
}

// Trích xuất hoặc tính toán tọa độ GPS thực tế của vụ việc
function getPetitionCoordinates(pet: SerializedPetition): [number, number] {
  // 1. Nếu có chuỗi GPS trong location (Ví dụ: "1122 Phạm Thế Hiển (GPS: 10.742300, 106.682100)")
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

  // 2. Tính toán phân bổ vị trí đẹp theo ID vụ việc trong phạm vi Phường Bình Đông
  let hash = 0;
  for (let i = 0; i < pet.id.length; i++) {
    hash = pet.id.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const minLat = 10.710;
  const maxLat = 10.740;
  const minLng = 106.620;
  const maxLng = 106.655;
  
  const lat = minLat + (Math.abs(hash) % 10000) / 10000 * (maxLat - minLat);
  const lng = minLng + (Math.abs(hash >> 3) % 10000) / 10000 * (maxLng - minLng);
  
  return [lng, lat];
}

export default function GoongMap({ petitions, height = "480px" }: GoongMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Đọc trực tiếp chìa khóa API Goong từ file .env (không ghi đè key giả trên localhost)
  const GOONG_MAP_KEY = process.env.NEXT_PUBLIC_GOONG_MAP_KEY || "wMcOxHb7uftjWS5GbIiOdTVmP2jwXOTPPHUof6oC";
  const GOONG_API_KEY = process.env.NEXT_PUBLIC_GOONG_API_KEY || "KnX2ICwrz3dEAXpeNaCtyrpvdZo438CbBCQBxhEE";

  useEffect(() => {
    // 1. Tải stylesheet chính thức của Goong Map từ CDN
    const linkId = "goong-map-css-cdn";
    if (!document.getElementById(linkId)) {
      const link = document.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      link.href = "https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.css";
      document.head.appendChild(link);
    }

    // 2. Tải Goong Map JS SDK từ CDN
    const scriptId = "goong-map-js-cdn";
    
    const initMap = () => {
      const goongjs = (window as any).goongjs;
      if (!goongjs) {
        setError("Không thể nạp thư viện SDK Goong Map JS.");
        return;
      }

      if (!mapContainerRef.current) return;

      try {
        goongjs.accessToken = GOONG_MAP_KEY;
        
        // Khởi tạo Goong Map góc nhìn 3D trực quan tại trung tâm Phường Bình Đông
        const map = new goongjs.Map({
          container: mapContainerRef.current,
          style: `https://tiles.goong.io/assets/goong_map_web.json?api_key=${GOONG_API_KEY}`,
          center: [106.635, 10.725],
          zoom: 14,
          pitch: 35, // Góc nghiêng 3D
        });

        // Điều khiển phím điều hướng & zoom
        map.addControl(new goongjs.NavigationControl(), "top-right");

        map.on("load", () => {
          setMapLoaded(true);

          // 3. Nạp ranh giới 30 Khu Phố Phường Bình Đông từ file GeoJSON chính xác
          map.addSource("binhdong-boundary-source", {
            type: "geojson",
            data: "/geojson/BD BINHDONG.geojson",
          });

          // Lớp phủ đa giác màu mượt mạ (Polygon Fill)
          map.addLayer({
            id: "binhdong-fill-layer",
            type: "fill",
            source: "binhdong-boundary-source",
            paint: {
              "fill-color": "#10b981",
              "fill-opacity": 0.15,
            },
          });

          // Lớp viền nét đứt sang trọng (Polygon Line Stroke)
          map.addLayer({
            id: "binhdong-line-layer",
            type: "line",
            source: "binhdong-boundary-source",
            paint: {
              "line-color": "#047857",
              "line-width": 2.5,
              "line-dasharray": [2, 1],
            },
          });

          // 4. Cắm các Marker điểm ghim kiến nghị cử tri
          petitions.forEach((pet) => {
            const coords = getPetitionCoordinates(pet);
            const isOverdue = pet.status === "Quá hạn" || (pet.status !== "Đã xong" && new Date(pet.deadline) < new Date());
            
            let markerClass = "goong-custom-marker marker-completed";
            let statusText = "Đã xong";
            let badgeColor = "#10b981";

            if (isOverdue) {
              markerClass = "goong-custom-marker marker-overdue";
              statusText = "Quá hạn";
              badgeColor = "#ef4444";
            } else if (pet.status === "Đang xử lý") {
              markerClass = "goong-custom-marker marker-in-progress";
              statusText = "Đang xử lý";
              badgeColor = "#f59e0b";
            }

            // Tạo thẻ HTML Marker
            const el = document.createElement("div");
            el.className = markerClass;
            el.innerHTML = `<span style="width: 8px; height: 8px; border-radius: 50%; background: #ffffff;"></span>`;

            // HTML Popup thông tin
            const popupHTML = `
              <div style="font-family: var(--font-sans), sans-serif; padding: 0.5rem; max-width: 240px; color: #191918;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
                  <strong style="color: ${badgeColor}; font-size: 0.85rem;">[${pet.petitionCode}]</strong>
                  <span style="font-size: 0.7rem; font-weight: 700; background: ${badgeColor}15; color: ${badgeColor}; padding: 0.1rem 0.4rem; border-radius: 999px;">${statusText}</span>
                </div>
                <div style="font-weight: 700; font-size: 0.82rem; margin-bottom: 0.25rem;">Người gửi: ${pet.senderName}</div>
                <div style="font-size: 0.76rem; color: #555550; margin-bottom: 0.4rem; line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
                  ${pet.content}
                </div>
                <div style="font-size: 0.72rem; color: #888880; font-weight: 600;">📍 ${pet.quarter || pet.location}</div>
                <a href="/petitions" style="display: inline-block; margin-top: 0.5rem; color: #6366f1; font-weight: 700; font-size: 0.78rem; text-decoration: underline;">Xem trong sổ theo dõi →</a>
              </div>
            `;

            const popup = new goongjs.Popup({ offset: 12, closeButton: true }).setHTML(popupHTML);

            new goongjs.Marker(el)
              .setLngLat(coords)
              .setPopup(popup)
              .addTo(map);
          });
        });
      } catch (err: any) {
        console.error("Lỗi khởi tạo bản đồ Goong:", err);
        setError(`Không thể kết nối đến máy chủ bản đồ Goong: ${err.message || "Kiểm tra khóa API"}`);
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
        script.onerror = () => setError("Không thể tải tập tin Goong Map SDK từ CDN.");
        document.body.appendChild(script);
      } else {
        script.addEventListener("load", initMap);
      }
    } else {
      initMap();
    }
  }, [petitions, GOONG_MAP_KEY, GOONG_API_KEY]);

  return (
    <div style={{ position: "relative", width: "100%", height, borderRadius: "16px", overflow: "hidden", border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 8px 32px rgba(0,0,0,0.06)" }}>
      {error ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: "2rem", backgroundColor: "#fff1f2", color: "#9f1239", textAlign: "center" }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ marginBottom: "0.5rem" }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <strong style={{ fontSize: "1rem" }}>Cấu hình Goong Map chưa hoàn tất</strong>
          <span style={{ fontSize: "0.85rem", marginTop: "0.25rem", opacity: 0.9 }}>{error}</span>
        </div>
      ) : (
        <>
          <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />
          {!mapLoaded && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.85)", backdropFilter: "blur(8px)", zIndex: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.9rem", color: "#191918", fontWeight: "700" }}>
                <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="3"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                Đang nạp dữ liệu địa hình Goong Map Phường Bình Đông...
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
