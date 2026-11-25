"use client";

import React from "react";

interface JarvisLoaderProps {
  text?: string;
}

export default function JarvisLoader({ text = "Đang tải dữ liệu..." }: JarvisLoaderProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        color: "var(--text-secondary)",
        fontSize: "0.88rem",
        fontWeight: 700,
      }}
    >
      {text}
    </div>
  );
}
