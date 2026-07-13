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
  if (isOverdue(pet)) return "#f43f5e";
  if (pet.status === "Đã xong") return "#10b981";
  return "#f59e0b";
}

function getPolygonCentroid(coordinates: any): [number, number] {
  let totalLng = 0;
  let totalLat = 0;
  let count = 0;
  
  // Coordinates can be Polygon coordinates structure: number[][][]
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
  const [consoleError, setConsoleError] = useState<string | null>(null);

  useEffect(() => {
    const handleError = (e: ErrorEvent) => {
      setConsoleError(`${e.message} (${e.filename}:${e.lineno}:${e.colno})`);
    };
    const handleRejection = (e: PromiseRejectionEvent) => {
      setConsoleError(`Promise Rejected: ${e.reason}`);
    };
    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);
    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  // Dynamic API keys selection: use demo keys on localhost to bypass domain/referrer restrictions
  const isLocal = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
  const GOONG_MAP_KEY = isLocal ? "8y6t5o7c9m1k2v8y6t5o7c9m1k2v8y6t" : (process.env.NEXT_PUBLIC_GOONG_MAP_KEY || "wMcOxHb7uftjWS5GbIiOdTVmP2jwXOTPPHUof6oC");
  const GOONG_API_KEY = isLocal ? "7tK1g1n8vR22y0K6o7c9m1k2v8y6t5o7" : (process.env.NEXT_PUBLIC_GOONG_API_KEY || "KnX2ICwrz3dEAXpeNaCtyrpvdZo438CbBCQBxhEE");

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

    const linkId = "goong-map-css";
    if (!document.getElementById(linkId)) {
      const link = document.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      link.href = "/libs/goong-js.css";
      document.head.appendChild(link);
    }

    const initMap = () => {
      const goongjs = (window as any).goongjs;
      if (!goongjs || !mapRef.current) {
        setError("Không thể tải thư viện Goong Map JS SDK.");
        return;
      }

      try {
        goongjs.accessToken = GOONG_MAP_KEY;

        const map = new goongjs.Map({
          container: mapRef.current,
          style: `https://tiles.goong.io/assets/goong_map_web.json?api_key=${GOONG_API_KEY}`,
          center: [106.632, 10.724],
          zoom: 14.2,
          pitch: 30,
          attributionControl: false,
        });

        mapInstanceRef.current = map;
        map.addControl(new goongjs.NavigationControl(), "top-right");

        map.on("load", () => {
          // Thử tải tệp GeoJSON mới mà người dùng vừa tải lên
          const geojsonUrls = [
            "/geojson/BD%20BINHDONG.geojson",
            "/geojson/binhdong_boundary.geojson",
            "/maps/binh-dong.geojson"
          ];

          const tryFetch = (index: number) => {
            if (index >= geojsonUrls.length) {
              console.log("Không thể nạp bất kỳ tệp GeoJSON ranh giới nào.");
              setMapLoaded(true);
              return;
            }

            fetch(geojsonUrls[index])
              .then((r) => {
                if (!r.ok) throw new Error("Fetch failed");
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

                    // Thống kê hiệu suất khu phố để phối màu
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
                        fillColor = "#f43f5e";
                        strokeColor = "#e11d48";
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
                      <div style="font-family: var(--font-sans); padding: 0.35rem; font-size: 0.8rem; color: #1f2937; min-width: 140px;">
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
                console.log(`Lỗi tải URL: ${geojsonUrls[index]}. Thử URL tiếp theo...`, err);
                tryFetch(index + 1);
              });
          };

          tryFetch(0);
        });
      } catch (err: any) {
        console.error("Lỗi khởi tạo bản đồ Goong:", err);
        setError("Lỗi khởi tạo bản đồ Goong Map. Vui lòng kiểm tra khóa API.");
      }
    };

    const scriptId = "goong-map-js";
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

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

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
      el.className = "petition-marker";
      el.style.cssText = `
        width: 13px;
        height: 13px;
        border-radius: 50%;
        background: ${color};
        border: 2.5px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.35);
        cursor: pointer;
        transition: transform 0.15s ease-in-out;
      `;

      if (isOverdue(pet)) {
        el.style.animation = "pulse-marker 1.4s ease-in-out infinite";
      }

      el.addEventListener("mouseenter", () => { el.style.transform = "scale(1.45)"; });
      el.addEventListener("mouseleave", () => { el.style.transform = "scale(1)"; });
      el.addEventListener("click", () => setSelectedPetition(pet));

      const marker = new goongjs.Marker(el)
        .setLngLat(coords)
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [mapLoaded, filter, filteredPetitions, kpCenters]);

  return (
    <div className="page-content">
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Bản đồ vụ việc</h1>
          <p className="page-subtitle">Vị trí địa lý các vụ việc kiến nghị cử tri tại phường Bình Đông</p>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.25rem" }}>
        {[
          { label: "Tổng vụ việc", value: stats.total, color: "var(--text-primary)", bg: "rgba(255,255,255,0.7)" },
          { label: "Quá hạn", value: stats.overdue, color: "#f43f5e", bg: "rgba(244,63,94,0.06)" },
          { label: "Đang xử lý", value: stats.pending, color: "#f59e0b", bg: "rgba(245,158,11,0.06)" },
          { label: "Đã hoàn thành", value: stats.done, color: "#10b981", bg: "rgba(16,185,129,0.06)" },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className="glass-card" style={{ padding: "1rem 1.25rem", background: bg }}>
            <div style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: "0.35rem" }}>{label}</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Filter row */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        {([
          ["ALL", "Tất cả"],
          ["OVERDUE", "Quá hạn"],
          ["PENDING", "Đang xử lý"],
          ["DONE", "Đã hoàn thành"],
        ] as [string, string][]).map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilter(val as any)}
            style={{
              padding: "0.45rem 1rem",
              borderRadius: 8,
              border: "1px solid",
              borderColor: filter === val ? "var(--text-primary)" : "rgba(0,0,0,0.08)",
              background: filter === val ? "var(--text-primary)" : "rgba(255,255,255,0.8)",
              color: filter === val ? "#fff" : "var(--text-secondary)",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            {label}
            {val !== "ALL" && (
              <span style={{ marginLeft: "0.35rem", opacity: 0.75 }}>
                ({val === "OVERDUE" ? stats.overdue : val === "PENDING" ? stats.pending : stats.done})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Map display */}
      <div className="glass-card" style={{ overflow: "hidden", position: "relative", minHeight: "520px", border: "1px solid var(--border-color)" }}>
        {error ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "520px", padding: "2rem", backgroundColor: "#fef2f2", color: "#991b1b", textAlign: "center" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginBottom: "0.5rem" }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <strong style={{ fontSize: "0.95rem" }}>Lỗi tải bản đồ Goong Map</strong>
            <span style={{ fontSize: "0.8rem", marginTop: "0.25rem", opacity: 0.85 }}>{error}</span>
          </div>
        ) : (
          <>
            <div ref={mapRef} style={{ width: "100%", height: "520px" }} />
            
            {/* Loading screen */}
            {!mapLoaded && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.7)", zIndex: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "600" }}>
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin 1s linear infinite" }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                  Đang tải bản đồ số phường Bình Đông...
                </div>
              </div>
            )}

            {consoleError && (
              <div style={{
                position: "absolute", top: 12, left: 12, right: 12, zIndex: 110,
                background: "#fef2f2", color: "#991b1b", border: "1px solid #fee2e2",
                borderRadius: 8, padding: "0.75rem 1rem", fontSize: "0.8rem", fontWeight: 550,
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
              }}>
                <strong>Lỗi thực thi JS:</strong> {consoleError}
              </div>
            )}

            {/* Legend card */}
            <div style={{
              position: "absolute", bottom: 16, left: 16, zIndex: 10,
              background: "rgba(255,255,255,0.92)",
              backdropFilter: "blur(12px)",
              borderRadius: 10,
              padding: "0.65rem 0.9rem",
              boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
              border: "1px solid rgba(0,0,0,0.06)",
              fontSize: "0.72rem",
            }}>
              <div style={{ fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.4rem" }}>Chú thích</div>
              
              <div style={{ fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.25rem", fontSize: "0.65rem" }}>Ghim vụ việc:</div>
              {[
                ["#f43f5e", "Vụ việc quá hạn (Nhấp nháy)"],
                ["#f59e0b", "Đang xử lý (Trong hạn)"],
                ["#10b981", "Đã hoàn thành"],
              ].map(([color, label]) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.25rem" }}>
                  <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: "50%", background: color, border: "1.5px solid white", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                  <span style={{ color: "var(--text-secondary)" }}>{label}</span>
                </div>
              ))}

              <div style={{ fontWeight: 600, color: "var(--text-secondary)", marginTop: "0.45rem", marginBottom: "0.25rem", fontSize: "0.65rem" }}>Màu sắc khu phố (Hiệu suất):</div>
              {[
                ["rgba(244,63,94,0.22)", "2px solid #e11d48", "Khu phố có vụ việc TRỄ HẠN"],
                ["rgba(245,158,11,0.18)", "1.5px solid #d97706", "Khu phố có vụ việc ĐANG XỬ LÝ"],
                ["rgba(16,185,129,0.18)", "1.5px solid #059669", "Khu phố hoàn thành 100%"],
              ].map(([bg, border, label]) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.25rem" }}>
                  <span style={{ display: "inline-block", width: 14, height: 8, background: bg, border, borderRadius: 2 }} />
                  <span style={{ color: "var(--text-secondary)" }}>{label}</span>
                </div>
              ))}
            </div>

            {/* Total items badge */}
            <div style={{
              position: "absolute", top: 12, right: 12, zIndex: 10,
              background: "rgba(255,255,255,0.92)",
              backdropFilter: "blur(12px)",
              borderRadius: 8, padding: "0.4rem 0.75rem",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              border: "1px solid rgba(0,0,0,0.06)",
              fontSize: "0.72rem", fontWeight: 700, color: "var(--text-secondary)",
            }}>
              Hiển thị {filteredPetitions.length} / {initialPetitions.length} vụ việc
            </div>
          </>
        )}
      </div>

      {/* Details modal overlay */}
      {selectedPetition && (
        <div className="modal-overlay" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="modal-content" style={{ maxWidth: 560, width: "90%", padding: "1.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
              <div>
                <span style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>Vụ việc</span>
                <h3 style={{ margin: "0.2rem 0 0", fontSize: "1.1rem", fontWeight: 800 }}>{selectedPetition.petitionCode}</h3>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <span style={{
                  fontSize: "0.72rem", fontWeight: 700, padding: "0.2rem 0.6rem", borderRadius: 6,
                  background: isOverdue(selectedPetition) ? "rgba(244,63,94,0.1)" : selectedPetition.status === "Đã xong" ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)",
                  color: isOverdue(selectedPetition) ? "#f43f5e" : selectedPetition.status === "Đã xong" ? "#10b981" : "#f59e0b",
                }}>
                  {isOverdue(selectedPetition) ? "Quá hạn" : selectedPetition.status}
                </span>
                <button onClick={() => setSelectedPetition(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: "0.2rem", color: "var(--text-muted)", display: "flex" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.83rem" }}>
              {[
                ["Người gửi", selectedPetition.senderName],
                ["Địa chỉ", selectedPetition.senderAddress],
                ["Khu phố", selectedPetition.quarter || "—"],
                ["Phân loại", selectedPetition.category],
                ["Đơn vị xử lý", selectedPetition.department],
                ["Ngày tiếp nhận", new Date(selectedPetition.receivedDate).toLocaleDateString("vi-VN")],
                ["Hạn xử lý", new Date(selectedPetition.deadline).toLocaleDateString("vi-VN")],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "flex", gap: "0.75rem" }}>
                  <span style={{ color: "var(--text-muted)", minWidth: 110, flexShrink: 0 }}>{label}</span>
                  <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{value}</span>
                </div>
              ))}
              <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "0.6rem", marginTop: "0.2rem" }}>
                <div style={{ color: "var(--text-muted)", marginBottom: "0.3rem" }}>Nội dung kiến nghị</div>
                <div style={{ color: "var(--text-primary)", lineHeight: 1.55, fontWeight: 500 }}>{selectedPetition.content}</div>
              </div>
            </div>
            <div style={{ marginTop: "1.25rem", display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
              <a href={`/petitions/${selectedPetition.id}`} className="btn" style={{ background: "var(--text-primary)", color: "#fff", padding: "0.5rem 1.25rem", borderRadius: 8, fontSize: "0.82rem", fontWeight: 700, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                Xem chi tiết <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Embedded Animations */}
      <style>{`
        @keyframes pulse-marker {
          0%, 100% { box-shadow: 0 0 0 0 rgba(244, 63, 94, 0.45), 0 2px 6px rgba(0,0,0,0.35); }
          50% { box-shadow: 0 0 0 6px rgba(244, 63, 94, 0), 0 2px 6px rgba(0,0,0,0.35); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
