import React from "react";

export default function GlobalLoading() {
  return (
    <div className="page-content" aria-busy="true" aria-live="polite">
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "2.25rem" }}>
        <div className="skeleton-bar" style={{ width: "340px", height: "32px" }} />
      </div>

      <div className="overview-kpi-grid" style={{ marginBottom: "2.5rem" }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
            <div className="skeleton-bar" style={{ width: "78px", height: "42px" }} />
            <div className="skeleton-bar" style={{ width: "130px", height: "14px" }} />
          </div>
        ))}
      </div>

      <div className="skeleton-bar" style={{ width: "100%", height: "8px", marginBottom: "3rem" }} />

      <div className="overview-split">
        <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
          <div className="skeleton-bar" style={{ width: "220px", height: "22px" }} />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
              <div className="skeleton-bar" style={{ width: `${85 - i * 8}%`, height: "14px" }} />
              <div className="skeleton-bar" style={{ width: "100%", height: "7px" }} />
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
          <div className="skeleton-bar" style={{ width: "250px", height: "22px" }} />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: "0.45rem", padding: "0.5rem 0" }}>
              <div className="skeleton-bar" style={{ width: "45%", height: "16px" }} />
              <div className="skeleton-bar" style={{ width: "95%", height: "14px" }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
