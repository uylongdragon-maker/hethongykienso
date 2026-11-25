"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { escapeHtml } from "@/lib/security";
import {
  SerializedPetition,
  formatDateVN,
  isPetitionOverdue,
} from "@/lib/petitionUtils";

interface MapClientProps {
  initialPetitions: SerializedPetition[];
}

interface KpCenter {
  lng: number;
  lat: number;
}

function getMarkerColor(pet: SerializedPetition): string {
  if (isPetitionOverdue(pet)) return "#dc2626";
  if (pet.status === "Đã xong") return "#059669";
  return "#d97706";
}

function getPolygonCentroid(coordinates: any): [number, number] {
  let totalLng = 0;
  let totalLat = 0;
  let count = 0;

  const ring = coordinates?.[0];
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

  const GOONG_MAP_KEY =
    process.env.NEXT_PUBLIC_GOONG_MAP_KEY || "wMcOxHb7uftjWS5GbIiOdTVmP2jwXOTPPHUof6oC";
  const GOONG_API_KEY =
    process.env.NEXT_PUBLIC_GOONG_API_KEY || "KnX2ICwrz3dEAXpeNaCtyrpvdZo438CbBCQBxhEE";

  const stats = useMemo(() => {
    let overdue = 0;
    let pending = 0;
    let done = 0;
    initialPetitions.forEach((p) => {
      if (p.status === "Đã xong") done++;
      else if (isPetitionOverdue(p)) overdue++;
      else pending++;
    });
    return {
      total: initialPetitions.length,
      overdue,
      pending,
      done,
    };
  }, [initialPetitions]);

  const filteredPetitions = useMemo(() => {
    return initialPetitions.filter((p) => {
      if (filter === "OVERDUE") return isPetitionOverdue(p);
      if (filter === "PENDING") return !isPetitionOverdue(p) && p.status !== "Đã xong";
      if (filter === "DONE") return p.status === "Đã xong";
      return true;
    });
  }, [initialPetitions, filter]);

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
          const radius = 0.0006 + ((Math.abs(hash >> 2) % 1000) / 1000) * 0.0012;
          return [center.lng + Math.cos(angle) * radius, center.lat + Math.sin(angle) * radius];
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

    const linkId = "goong-map-css-cdn";
    if (!document.getElementById(linkId)) {
      const link = document.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      link.href = "https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.css";
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
          center: [106.635, 10.725],
          zoom: 14.2,
          pitch: 30,
          attributionControl: false,
        });

        mapInstanceRef.current = map;
        map.addControl(new goongjs.NavigationControl(), "top-right");

        map.on("load", () => {
          fetch("/geojson/BD%20BINHDONG.geojson")
            .then((r) => {
              if (!r.ok) throw new Error("Fetch GeoJSON failed");
              return r.json();
            })
            .then((geojson) => {
              const centers: { [key: number]: KpCenter } = {};

              if (geojson && Array.isArray(geojson.features)) {
                geojson.features = geojson.features.map((feature: any) => {
                  const name = feature.properties?.name || "";
                  const kpNum = parseInt(name.replace(/\D/g, ""), 10);

                  if (!isNaN(kpNum) && feature.geometry?.coordinates) {
                    const [cLng, cLat] = getPolygonCentroid(feature.geometry.coordinates);
                    centers[kpNum] = { lng: cLng, lat: cLat };
                  }

                  const kpPetitions = initialPetitions.filter((p) => {
                    if (!p.quarter) return false;
                    const m = p.quarter.match(/(?:Khu\s*phố|Khu\s*pho|KP)\s*(\d+)/i);
                    return m && parseInt(m[1], 10) === kpNum;
                  });

                  const kpTotal = kpPetitions.length;
                  const kpOverdue = kpPetitions.filter((p) => isPetitionOverdue(p)).length;
                  const kpCompleted = kpPetitions.filter((p) => p.status === "Đã xong").length;
                  const kpPending = kpTotal - kpCompleted;

                  let fillColor = "rgba(156, 163, 175, 0.14)";
                  let strokeColor = "rgba(107, 114, 128, 0.35)";
                  let fillOpacity = 0.12;

                  if (kpTotal > 0) {
                    if (kpOverdue > 0) {
                      fillColor = "#dc2626";
                      strokeColor = "#b91c1c";
                      fillOpacity = 0.25;
                    } else if (kpPending > 0) {
                      fillColor = "#d97706";
                      strokeColor = "#b45309";
                      fillOpacity = 0.2;
                    } else {
                      fillColor = "#059669";
                      strokeColor = "#047857";
                      fillOpacity = 0.2;
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
                    kpPending,
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
                  "fill-opacity": ["get", "fillOpacity"],
                },
              });

              map.addLayer({
                id: "ward-outline",
                type: "line",
                source: "ward-boundary",
                paint: {
                  "line-color": ["get", "strokeColor"],
                  "line-width": 2,
                  "line-opacity": 0.65,
                },
              });

              map.on("click", "ward-fill", (e: any) => {
                const props = e.features?.[0]?.properties || {};
                const title = escapeHtml(props.description || props.name || "Khu phố");
                const total = Number(props.kpTotal || 0);
                const completed = Number(props.kpCompleted || 0);
                const pending = Number(props.kpPending || 0);
                const overdue = Number(props.kpOverdue || 0);

                new goongjs.Popup()
                  .setLngLat(e.lngLat)
                  .setHTML(`
                    <div style="font-family: var(--font-sans); padding: 0.4rem; font-size: 0.8rem; color: #121316; min-width: 150px;">
                      <strong style="font-size: 0.85rem; display: block; margin-bottom: 0.35rem;">${title}</strong>
                      <div style="display: flex; justify-content: space-between; margin: 0.15rem 0;"><span>Tổng số:</span><strong>${total}</strong></div>
                      <div style="display: flex; justify-content: space-between; margin: 0.15rem 0; color: #059669;"><span>Đã xong:</span><strong>${completed}</strong></div>
                      <div style="display: flex; justify-content: space-between; margin: 0.15rem 0; color: #d97706;"><span>Đang xử lý:</span><strong>${pending}</strong></div>
                      <div style="display: flex; justify-content: space-between; margin: 0.15rem 0; color: #dc2626;"><span>Quá hạn:</span><strong>${overdue}</strong></div>
                    </div>
                  `)
                  .addTo(map);
              });

              map.on("mouseenter", "ward-fill", () => {
                map.getCanvas().style.cursor = "pointer";
              });
              map.on("mouseleave", "ward-fill", () => {
                map.getCanvas().style.cursor = "";
              });

              setMapLoaded(true);
            })
            .catch(() => {
              setMapLoaded(true);
            });
        });
      } catch {
        setError("Không thể khởi tạo bản đồ Goong Map.");
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
  }, [GOONG_MAP_KEY, GOONG_API_KEY, initialPetitions]);

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
      el.className = isPetitionOverdue(pet)
        ? "goong-custom-marker marker-overdue"
        : pet.status === "Đã xong"
        ? "goong-custom-marker marker-completed"
        : "goong-custom-marker marker-in-progress";

      el.addEventListener("click", () => setSelectedPetition(pet));

      const safeCode = escapeHtml(pet.petitionCode);
      const safeSender = escapeHtml(pet.senderName);
      const snippet = pet.content.length > 75 ? pet.content.slice(0, 75) + "..." : pet.content;
      const safeSnippet = escapeHtml(snippet);
      const safeLoc = escapeHtml(pet.quarter || pet.location);

      const popupHTML = `
        <div style="font-family: var(--font-sans), sans-serif; padding: 0.35rem; font-size: 0.8rem; color: #121316; max-width: 220px;">
          <strong style="color: ${color}; display: block; margin-bottom: 0.25rem;">${safeCode}</strong>
          <div style="font-weight: 700; margin-bottom: 0.2rem;">${safeSender}</div>
          <div style="color: #4b5563; font-size: 0.76rem; margin-bottom: 0.3rem; line-height: 1.35;">${safeSnippet}</div>
          <div style="font-size: 0.72rem; color: #787d87; font-weight: 600;">${safeLoc}</div>
        </div>
      `;

      const popup = new goongjs.Popup({ offset: 10 }).setHTML(popupHTML);

      const marker = new goongjs.Marker(el)
        .setLngLat(coords)
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [mapLoaded, filteredPetitions, kpCenters]);

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Bản đồ số vụ việc phường Bình Đông</h1>
          <p className="page-subtitle">
            Phân bố không gian 30 khu phố và điểm phản ánh kiến nghị
          </p>
        </div>
      </div>

      {/* Chỉ số trên không gian mở */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "1.75rem",
          marginBottom: "1.75rem",
        }}
      >
        <div>
          <div className="tabular-nums" style={{ fontSize: "2.25rem", fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.05 }}>
            {stats.total}
          </div>
          <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-secondary)", marginTop: "0.2rem" }}>
            Tổng vụ việc
          </div>
        </div>
        <div>
          <div className="tabular-nums" style={{ fontSize: "2.25rem", fontWeight: 800, color: "var(--danger)", lineHeight: 1.05 }}>
            {stats.overdue}
          </div>
          <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-secondary)", marginTop: "0.2rem" }}>
            Quá hạn
          </div>
        </div>
        <div>
          <div className="tabular-nums" style={{ fontSize: "2.25rem", fontWeight: 800, color: "var(--warning)", lineHeight: 1.05 }}>
            {stats.pending}
          </div>
          <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-secondary)", marginTop: "0.2rem" }}>
            Đang xử lý
          </div>
        </div>
        <div>
          <div className="tabular-nums" style={{ fontSize: "2.25rem", fontWeight: 800, color: "var(--success)", lineHeight: 1.05 }}>
            {stats.done}
          </div>
          <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-secondary)", marginTop: "0.2rem" }}>
            Đã hoàn thành
          </div>
        </div>
      </div>

      {/* Bộ lọc trạng thái */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        {([
          ["ALL", `Tất cả (${stats.total})`],
          ["OVERDUE", `Quá hạn (${stats.overdue})`],
          ["PENDING", `Đang xử lý (${stats.pending})`],
          ["DONE", `Đã hoàn thành (${stats.done})`],
        ] as [typeof filter, string][]).map(([val, label]) => (
          <button
            key={val}
            type="button"
            onClick={() => setFilter(val)}
            className={filter === val ? "btn-primary" : "btn-secondary"}
            style={{ padding: "0.45rem 1rem", fontSize: "0.8rem" }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Khung hiển thị bản đồ 3D */}
      <div
        style={{
          overflow: "hidden",
          position: "relative",
          minHeight: "560px",
          borderRadius: "var(--radius-xl)",
          backgroundColor: "#e5e7eb",
        }}
      >
        {error ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "560px",
              padding: "2rem",
              color: "var(--danger)",
              textAlign: "center",
            }}
          >
            <strong style={{ fontSize: "1rem" }}>Không thể kết nối bản đồ Goong Map</strong>
            <span style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>{error}</span>
          </div>
        ) : (
          <>
            <div ref={mapRef} style={{ width: "100%", height: "560px" }} />
            {!mapLoaded && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(246, 247, 249, 0.88)",
                  zIndex: 10,
                  fontWeight: 700,
                  fontSize: "0.9rem",
                }}
              >
                Đang tải dữ liệu bản đồ Phường Bình Đông...
              </div>
            )}
          </>
        )}
      </div>

      {selectedPetition && (
        <div className="modal-overlay" onClick={() => setSelectedPetition(null)}>
          <div
            className="modal-content"
            style={{ maxWidth: "520px", padding: "1.75rem" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <strong style={{ fontSize: "1.1rem", fontFamily: "var(--font-mono)" }}>
                {selectedPetition.petitionCode}
              </strong>
              <button className="modal-close" onClick={() => setSelectedPetition(null)}>
                &times;
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem", fontSize: "0.86rem" }}>
              <div><strong>Người gửi:</strong> {selectedPetition.senderName}</div>
              <div><strong>Khu phố:</strong> {selectedPetition.quarter || "Chưa xác định"}</div>
              <div><strong>Lĩnh vực:</strong> {selectedPetition.category}</div>
              <div><strong>Đơn vị xử lý:</strong> {selectedPetition.department}</div>
              <div><strong>Hạn giải quyết:</strong> {formatDateVN(selectedPetition.extendedUntil || selectedPetition.deadline)}</div>
              <div><strong>Nội dung:</strong> {selectedPetition.content}</div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.25rem" }}>
              <Link href={`/petitions/${selectedPetition.id}`} className="btn-primary">
                Mở chi tiết hồ sơ
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
