import React from "react";

export default function PetitionDetailLoading() {
  return (
    <div className="page-content" aria-busy="true" aria-live="polite">
      <div className="skeleton-bar" style={{ width: "160px", height: "18px", marginBottom: "1.5rem" }} />
      <div className="skeleton-bar" style={{ width: "320px", height: "32px", marginBottom: "2.25rem" }} />

      <div className="grid-layout-details">
        {Array.from({ length: 2 }).map((_, col) => (
          <div key={col} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div className="skeleton-bar" style={{ width: "220px", height: "22px" }} />
            {Array.from({ length: 5 }).map((_, row) => (
              <div key={row} style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                <div className="skeleton-bar" style={{ width: "130px", height: "13px" }} />
                <div className="skeleton-bar" style={{ width: "100%", height: "42px" }} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
