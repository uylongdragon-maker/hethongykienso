import React from "react";

export default function PetitionsLoading() {
  return (
    <div className="page-content" aria-busy="true" aria-live="polite">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", gap: "1rem", flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div className="skeleton-bar" style={{ width: "300px", height: "30px" }} />
          <div className="skeleton-bar" style={{ width: "210px", height: "15px" }} />
        </div>
        <div style={{ display: "flex", gap: "0.6rem" }}>
          <div className="skeleton-bar" style={{ width: "150px", height: "38px" }} />
          <div className="skeleton-bar" style={{ width: "110px", height: "38px" }} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr repeat(5, minmax(120px, 1fr))", gap: "0.65rem", marginBottom: "1.5rem" }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton-bar" style={{ height: "40px" }} />
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", backgroundColor: "#ffffff", borderRadius: "14px", padding: "1.25rem" }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="skeleton-bar" style={{ width: "100%", height: "36px" }} />
        ))}
      </div>
    </div>
  );
}
