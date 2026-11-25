import React from "react";

export default function MapLoading() {
  return (
    <div className="page-content" aria-busy="true" aria-live="polite">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.75rem", flexWrap: "wrap", gap: "1rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div className="skeleton-bar" style={{ width: "300px", height: "30px" }} />
          <div className="skeleton-bar" style={{ width: "260px", height: "16px" }} />
        </div>
        <div style={{ display: "flex", gap: "0.65rem" }}>
          <div className="skeleton-bar" style={{ width: "160px", height: "38px" }} />
          <div className="skeleton-bar" style={{ width: "160px", height: "38px" }} />
        </div>
      </div>

      <div className="skeleton-bar" style={{ width: "100%", height: "540px", borderRadius: "var(--radius-lg)" }} />
    </div>
  );
}
