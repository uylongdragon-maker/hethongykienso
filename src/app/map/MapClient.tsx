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
  attachmentUrl: string | null;
  authority: string;
  department: string;
  receivedDate: string;
  deadline: string;
  extendedUntil: string | null;
  status: string;
  replyDocNumber: string | null;
  replyDocDate: string | null;
  replyDocLink: string | null;
  reviewStatus: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface MapClientProps {
  initialPetitions: SerializedPetition[];
}

interface KpCenter {
  lng: number;
  lat: number;
}

function isOverdue(pet: SerializedPetition): boolean {
  return pet.status === "Quá hạn" || (pet.status !== "Đã xong" && new Date(pet.deadline) < new Date());
}

function getMarkerColor(pet: SerializedPetition): string {
  if (isOverdue(pet)) return "#ef4444";
  if (pet.status === "Đã xong") return "#10b981";
  return "#f59e0b";
}

function getPolygonCentroid(coordinates: any): [number, number] {
  let totalLng = 0;
  let totalLat = 0;
  let count = 0;
  
  const ring = coordinates[0];
  if (Array.isArray(ring)) {
    ring.forEach((coord: any) => {
      if (Array.isArray(coord) && coord.length >= 2) {
        totalLng += coord[0];
        totalLat += coord[1];
        count++;
      }
    });
  }
  
  if (count > 0) {
    return [totalLng / count, totalLat / count];
  }
  return [106.632, 10.724];
}

export default function MapClient({ initialPetitions }: MapClientProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [selectedPetition, setSelectedPetition] = useState<SerializedPetition | null>(null);
  const [filter, setFilter] = useState<"ALL" | "OVERDUE" | "PENDING" | "DONE">("ALL");
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kpCenters, setKpCenters] = useState<{ [key: number]: KpCenter }>({});
  
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // Lấy chìa khóa API Goong từ file .env
  const GOONG_MAP_KEY = process.env.NEXT_PUBLIC_GOONG_MAP_KEY || "wMcOxHb7uftjWS5GbIiOdTVmP2jwXOTPPHUof6oC";
  const GOONG_API_KEY = process.env.NEXT_PUBLIC_GOONG_API_KEY || "KnX2ICwrz3dEAXpeNaCtyrpvdZo438CbBCQBxhEE";

  const filteredPetitions = initialPetitions.filter((p) => {
    if (filter === "OVERDUE") return isOverdue(p);
    if (filter === "PENDING") return !isOverdue(p) && p.status !== "Đã xong";
    if (filter === "DONE") return p.status === "Đã xong";
    return true;
  });

  const stats = {
    total: initialPetitions.length,
    overdue: initialPetitions.filter(isOverdue).length,
    pending: initialPetitions.filter(p => !isOverdue(p) && p.status !== "Đã xong").length,
    done: initialPetitions.filter(p => p.status === "Đã xong").length,
  };

  const getCoords = (pet: SerializedPetition): [number, number] => {
    if (pet.location) {
      const match = pet.location.match(/(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/);
      if (match) {
        const lat = parseFloat(match[1]);
        const lng = parseFloat(match[2]);
        if (lat > 10 && lat < 11 && lng > 106 && lng < 107) {
          return [lng, lat];
        }
      }
    }
    
    if (pet.quarter) {
      const match = pet.quarter.match(/(?:Khu\s*phố|Khu\s*pho|KP)\s*(\d+)/i);
      if (match) {
        const kpNum = parseInt(match[1], 10);
        if (kpCenters[kpNum]) {
          const center = kpCenters[kpNum];
          let hash = 0;
          for (let i = 0; i < pet.id.length; i++) {
            hash = pet.id.charCodeAt(i) + ((hash << 5) - hash);
          }
          const angle = (Math.abs(hash) % 360) * (Math.PI / 180);
          const radius = 0.0006 + (Math.abs(hash >> 2) % 1000) / 1000 * 0.0012;
          const lng = center.lng + Math.cos(angle) * radius;
          const lat = center.lat + Math.sin(angle) * radius;
          return [lng, lat];
        }
      }
    }

    let hash = 0;
    for (let i = 0; i < pet.id.length; i++) {
      hash = pet.id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const lat = 10.724 + ((hash % 1000) / 1000) * 0.005 - 0.0025;
    const lng = 106.632 + (((hash >> 3) % 1000) / 1000) * 0.008 - 0.004;
    return [lng, lat];
  };

  useEffect(() => {
    if (!mapRef.current) return;

    // 1. Tải stylesheet từ CDN
    const linkId = "goong-map-css-cdn";
    if (!document.getElementById(linkId)) {
      const link = document.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      link.href = "https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.css";
      document.head.appendChild(link);
    }

    // 2. Tải Goong Map JS SDK từ CDN
    const initMap = () => {
      const goongjs = (window as any).goongjs;
      if (!goongjs || !mapRef.current) {
        setError("Không thể tải thư viện Goong Map JS SDK từ CDN.");
        return;
      }

      try {
        goongjs.accessToken = GOONG_MAP_KEY;

        const map = new goongjs.Map({
          container: mapRef.current,
          style: `https://tiles.goong.io/assets/goong_map_web.json?api_key=${GOONG_API_KEY}`,
          center: [106.635, 10.725],
          zoom: 14.2,
          pitch: 30,
          attributionControl: false,
        });

        mapInstanceRef.current = map;
        map.addControl(new goongjs.NavigationControl(), "top-right");

        map.on("load", () => {
          // Nạp ranh giới GeoJSON 30 Khu phố Phường Bình Đông
          fetch("/geojson/BD%20BINHDONG.geojson")
            .then((r) => {
              if (!r.ok) throw new Error("Fetch GeoJSON failed");
              return r.json();
            })
            .then((geojson) => {
              const centers: { [key: number]: KpCenter } = {};

              if (geojson && Array.isArray(geojson.features)) {
                geojson.features = geojson.features.map((feature: any) => {
                  const name = feature.properties.name || "";
                  const kpNum = parseInt(name.replace(/\D/g, ""), 10);
                  
                  if (!isNaN(kpNum) && feature.geometry && feature.geometry.coordinates) {
                    const [cLng, cLat] = getPolygonCentroid(feature.geometry.coordinates);
                    centers[kpNum] = { lng: cLng, lat: cLat };
                  }

                  const kpPetitions = initialPetitions.filter((p) => {
                    if (!p.quarter) return false;
                    const m = p.quarter.match(/(?:Khu\s*phố|Khu\s*pho|KP)\s*(\d+)/i);
                    return m && parseInt(m[1], 10) === kpNum;
                  });

                  const kpTotal = kpPetitions.length;
                  const kpOverdue = kpPetitions.filter(isOverdue).length;
                  const kpCompleted = kpPetitions.filter((p) => p.status === "Đã xong").length;
                  const kpPending = kpTotal - kpCompleted;

                  let fillColor = "rgba(156, 163, 175, 0.15)";
                  let strokeColor = "rgba(156, 163, 175, 0.4)";
                  let fillOpacity = 0.12;

                  if (kpTotal > 0) {
                    if (kpOverdue > 0) {
                      fillColor = "#ef4444";
                      strokeColor = "#dc2626";
                      fillOpacity = 0.28;
                    } else if (kpPending > 0) {
                      fillColor = "#f59e0b";
                      strokeColor = "#d97706";
                      fillOpacity = 0.22;
                    } else {
                      fillColor = "#10b981";
                      strokeColor = "#059669";
                      fillOpacity = 0.22;
                    }
                  }

                  feature.properties = {
                    ...feature.properties,
                    fillColor,
                    strokeColor,
                    fillOpacity,
                    kpTotal,
                    kpOverdue,
                    kpCompleted,
                    kpPending
                  };

                  return feature;
                });
              }

              setKpCenters(centers);

              map.addSource("ward-boundary", { type: "geojson", data: geojson });

              map.addLayer({
                id: "ward-fill",
                type: "fill",
                source: "ward-boundary",
                paint: {
                  "fill-color": ["get", "fillColor"],
                  "fill-opacity": ["get", "fillOpacity"]
                }
              });

              map.addLayer({
                id: "ward-outline",
                type: "line",
                source: "ward-boundary",
                paint: {
                  "line-color": ["get", "strokeColor"],
                  "line-width": 2.5,
                  "line-opacity": 0.7
                }
              });

              map.on("click", "ward-fill", (e: any) => {
                const props = e.features[0].properties;
                const name = props.name || "Khu phố";
                const total = props.kpTotal || 0;
                const completed = props.kpCompleted || 0;
                const pending = props.kpPending || 0;
                const overdue = props.kpOverdue || 0;

                new goongjs.Popup()
                  .setLngLat(e.lngLat)
                  .setHTML(`
                    <div style="font-family: var(--font-sans); padding: 0.35rem; font-size: 0.8rem; color: #1f2937; min-width: 150px;">
                      <strong style="font-size: 0.85rem; display: block; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.3rem; margin-bottom: 0.35rem;">
                        ${props.description || name}
                      </strong>
                      <div style="display: flex; justify-content: space-between; margin: 0.15rem 0;">
                        <span>Tổng số vụ:</span><strong>${total}</strong>
                      </div>
                      <div style="display: flex; justify-content: space-between; margin: 0.15rem 0; color: #059669;">
                        <span>Đã xong:</span><strong>${completed}</strong>
                      </div>
                      <div style="display: flex; justify-content: space-between; margin: 0.15rem 0; color: #d97706;">
                        <span>Đang xử lý:</span><strong>${pending}</strong>
                      </div>
                      <div style="display: flex; justify-content: space-between; margin: 0.15rem 0; color: #dc2626;">
                        <span>Quá hạn:</span><strong>${overdue}</strong>
                      </div>
                    </div>
                  `)
                  .addTo(map);
              });

              map.on("mouseenter", "ward-fill", () => { map.getCanvas().style.cursor = "pointer"; });
              map.on("mouseleave", "ward-fill", () => { map.getCanvas().style.cursor = ""; });

              setMapLoaded(true);
            })
            .catch((err) => {
              console.error("Lỗi nạp file GeoJSON Ranh giới Phường Bình Đông:", err);
              setMapLoaded(true);
            });
        });
      } catch (err: any) {
        console.error("Lỗi khởi tạo bản đồ Goong:", err);
        setError("Không thể khởi tạo bản đồ Goong Map: Kiểm tra khóa API trong .env.");
      }
    };

    const scriptId = "goong-map-js-cdn";
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (!(window as any).goongjs) {
      if (!script) {
        script = document.createElement("script");
        script.id = scriptId;
        script.src = "https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.js";
        script.async = true;
        script.onload = initMap;
        document.body.appendChild(script);
      } else {
        script.addEventListener("load", initMap);
      }
    } else {
      initMap();
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [GOONG_MAP_KEY, GOONG_API_KEY]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const goongjs = (window as any).goongjs;
    if (!map || !mapLoaded || !goongjs) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    filteredPetitions.forEach((pet) => {
      const coords = getCoords(pet);
      const color = getMarkerColor(pet);

      const el = document.createElement("div");
      el.className = isOverdue(pet) ? "goong-custom-marker marker-overdue" : pet.status === "Đã xong" ? "goong-custom-marker marker-completed" : "goong-custom-marker marker-in-progress";

      el.addEventListener("click", () => setSelectedPetition(pet));

      const popupHTML = `
        <div style="font-family: var(--font-sans), sans-serif; padding: 0.35rem; font-size: 0.8rem; color: #191918; max-width: 220px;">
          <strong style="color: ${color}; display: block; margin-bottom: 0.25rem;">[${pet.petitionCode}]</strong>
          <div style="font-weight: 700; margin-bottom: 0.2rem;">Người gửi: ${pet.senderName}</div>
          <div style="color: #555550; font-size: 0.75rem; margin-bottom: 0.35rem; line-height: 1.3;">
            Nội dung: ${pet.content.substring(0, 70)}${pet.content.length > 70 ? "..." : ""}
          </div>
          <div style="font-size: 0.72rem; color: #888880;">📍 ${pet.quarter || pet.location}</div>
        </div>
      `;

      const popup = new goongjs.Popup({ offset: 10 }).setHTML(popupHTML);

      const marker = new goongjs.Marker(el)
        .setLngLat(coords)
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [mapLoaded, filter, filteredPetitions, kpCenters]);

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: "1.5rem" }}>
        <div>
          <h1 className="page-title">Bản đồ số vụ việc Phường Bình Đông</h1>
          <p className="page-subtitle">Giám sát vị trí không gian địa hình 3D và tiến độ xử lý kiến nghị cử tri</p>
        </div>
      </div>

      {/* Thống kê nhanh */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
        {[
          { label: "Tổng vụ việc", value: stats.total, color: "var(--text-primary)", bg: "rgba(255,255,255,0.7)" },
          { label: "Vụ việc quá hạn", value: stats.overdue, color: "#ef4444", bg: "rgba(239,68,68,0.06)" },
          { label: "Đang xử lý", value: stats.pending, color: "#f59e0b", bg: "rgba(245,158,11,0.06)" },
          { label: "Đã hoàn thành", value: stats.done, color: "#10b981", bg: "rgba(16,185,129,0.06)" },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className="glass-card" style={{ padding: "1.25rem", background: bg }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: "0.25rem" }}>{label}</div>
            <div style={{ fontSize: "1.85rem", fontWeight: 800, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Bộ lọc */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        {([
          ["ALL", "Tất cả vụ việc"],
          ["OVERDUE", "Vụ việc quá hạn"],
          ["PENDING", "Đang xử lý"],
          ["DONE", "Đã hoàn thành"],
        ] as [string, string][]).map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilter(val as any)}
            className="btn"
            style={{
              padding: "0.45rem 1.1rem",
              borderRadius: 10,
              border: "1px solid",
              borderColor: filter === val ? "var(--text-primary)" : "rgba(0,0,0,0.08)",
              background: filter === val ? "var(--text-primary)" : "rgba(255,255,255,0.85)",
              color: filter === val ? "#fff" : "var(--text-secondary)",
              fontSize: "0.825rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {label}
            {val !== "ALL" && (
              <span style={{ marginLeft: "0.35rem", opacity: 0.8 }}>
                ({val === "OVERDUE" ? stats.overdue : val === "PENDING" ? stats.pending : stats.done})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Bản đồ */}
      <div className="glass-card" style={{ overflow: "hidden", position: "relative", minHeight: "560px", border: "1px solid var(--border-color)", borderRadius: "16px" }}>
        {error ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "560px", padding: "2rem", backgroundColor: "#fff1f2", color: "#9f1239", textAlign: "center" }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginBottom: "0.5rem" }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <strong style={{ fontSize: "1rem" }}>Không thể kết nối Goong Map</strong>
            <span style={{ fontSize: "0.85rem", marginTop: "0.25rem", opacity: 0.9 }}>{error}</span>
          </div>
        ) : (
          <>
            <div ref={mapRef} style={{ width: "100%", height: "560px" }} />
            
            {!mapLoaded && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.85)", backdropFilter: "blur(8px)", zIndex: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: "700" }}>
                  <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="3"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                  Đang nạp bản đồ địa hình Goong Map 3D...
                </div>
              </div>
            )}

            {/* Thẻ chú thích */}
            <div style={{
              position: "absolute", bottom: 20, left: 20, zIndex: 10,
              background: "rgba(255,255,255,0.92)",
              backdropFilter: "blur(12px)",
              borderRadius: 12,
              padding: "0.75rem 1rem",
              boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
              border: "1px solid rgba(0,0,0,0.06)",
              fontSize: "0.75rem",
            }}>
              <div style={{ fontWeight: 800, color: "#191918", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.5rem" }}>
                Chú thích bản đồ
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: "#ef4444", border: "2px solid white" }} />
                  <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>Quá hạn (Nhấp nháy đỏ)</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: "#f59e0b", border: "2px solid white" }} />
                  <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>Đang xử lý</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: "#10b981", border: "2px solid white" }} />
                  <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>Đã hoàn thành</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Detail Popup Modal */}
      {selectedPetition && (
        <div className="modal-overlay" onClick={() => setSelectedPetition(null)}>
          <div className="modal-content glass-card" style={{ maxWidth: 540, width: "90%", padding: "1.75rem" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <strong style={{ fontSize: "1.1rem", color: "#6366f1" }}>[{selectedPetition.petitionCode}]</strong>
              <button className="modal-close" onClick={() => setSelectedPetition(null)}>&times;</button>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.85rem" }}>
              <div><strong>Người gửi:</strong> {selectedPetition.senderName}</div>
              <div><strong>Địa chỉ cử tri:</strong> {selectedPetition.senderAddress}</div>
              <div><strong>Lĩnh vực:</strong> {selectedPetition.category}</div>
              <div><strong>Đơn vị xử lý:</strong> {selectedPetition.department}</div>
              <div><strong>Khu phố:</strong> {selectedPetition.quarter || "—"}</div>
              <div><strong>Nội dung:</strong> {selectedPetition.content}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
