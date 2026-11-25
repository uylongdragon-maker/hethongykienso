import React from "react";

export default function ReportsLoading() {
  return (
    <div className="page-content" aria-busy="true" aria-live="polite">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2.25rem", flexWrap: "wrap", gap: "1rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div className="skeleton-bar" style={{ width: "320px", height: "30px" }} />
          <div className="skeleton-bar" style={{ width: "240px", height: "16px" }} />
        </div>
        <div style={{ display: "flex", gap: "0.65rem" }}>
          <div className="skeleton-bar" style={{ width: "130px", height: "38px" }} />
          <div className="skeleton-bar" style={{ width: "110px", height: "38px" }} />
        </div>
      </div>

      <div className="overview-kpi-grid" style={{ marginBottom: "2.75rem" }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
            <div className="skeleton-bar" style={{ width: "86px", height: "40px" }} />
            <div className="skeleton-bar" style={{ width: "145px", height: "14px" }} />
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.95rem" }}>
        <div className="skeleton-bar" style={{ width: "260px", height: "22px", marginBottom: "0.4rem" }} />
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
              gap: "1rem",
              alignItems: "center",
            }}
          >
            <div className="skeleton-bar" style={{ height: "18px" }} />
            <div className="skeleton-bar" style={{ height: "16px" }} />
            <div className="skeleton-bar" style={{ height: "16px" }} />
            <div className="skeleton-bar" style={{ height: "16px" }} />
            <div className="skeleton-bar" style={{ height: "10px" }} />
          </div>
        ))}
      </div>
    </div>
  );
}
