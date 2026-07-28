"use client";

import React from "react";

interface JarvisLoaderProps {
  text?: string;
  size?: number;
}

export default function JarvisLoader({ text = "Đang xử lý hệ thống...", size = 120 }: JarvisLoaderProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        gap: "1.25rem",
      }}
    >
      {/* Jarvis / Hey Siri Glowing Fluid Orb Container */}
      <div
        style={{
          position: "relative",
          width: `${size}px`,
          height: `${size}px`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Outer Pulsing Fluid Ring 1 (Cyan/Neon Blue) */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: "2px solid transparent",
            borderTopColor: "#00f0ff",
            borderRightColor: "#2563eb",
            filter: "drop-shadow(0 0 12px #00f0ff)",
            animation: "jarvisSpin 1.8s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite",
          }}
        />

        {/* Outer Pulsing Fluid Ring 2 (Red/Orange Flame) */}
        <div
          style={{
            position: "absolute",
            inset: "8px",
            borderRadius: "50%",
            border: "2px solid transparent",
            borderBottomColor: "#ef4444",
            borderLeftColor: "#f97316",
            filter: "drop-shadow(0 0 12px #ef4444)",
            animation: "jarvisSpinReverse 1.4s linear infinite",
          }}
        />

        {/* Inner Pulsing Fluid Ring 3 (Solar Yellow / Magenta) */}
        <div
          style={{
            position: "absolute",
            inset: "18px",
            borderRadius: "50%",
            border: "2px solid transparent",
            borderTopColor: "#ffd700",
            borderRightColor: "#e11d48",
            filter: "drop-shadow(0 0 10px #ffd700)",
            animation: "jarvisSpin 2.4s ease-in-out infinite",
          }}
        />

        {/* Center Siri AI Orb Core */}
        <div
          style={{
            width: `${size * 0.38}px`,
            height: `${size * 0.38}px`,
            borderRadius: "50%",
            background: "radial-gradient(circle, #00f0ff 0%, #ef4444 50%, #121316 100%)",
            boxShadow: "0 0 25px rgba(0, 240, 255, 0.8), 0 0 40px rgba(239, 68, 68, 0.6)",
            animation: "siriOrbPulse 1.5s ease-in-out infinite alternate",
          }}
        />
      </div>

      {text && (
        <div
          style={{
            fontSize: "0.85rem",
            fontWeight: 700,
            color: "#121316",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            animation: "textGlowPulse 1.5s ease-in-out infinite alternate",
          }}
        >
          {text}
        </div>
      )}

      <style jsx global>{`
        @keyframes jarvisSpin {
          0% {
            transform: rotate(0deg) scale(1);
          }
          50% {
            transform: rotate(180deg) scale(1.05);
          }
          100% {
            transform: rotate(360deg) scale(1);
          }
        }

        @keyframes jarvisSpinReverse {
          0% {
            transform: rotate(360deg) scale(1.04);
          }
          50% {
            transform: rotate(180deg) scale(0.96);
          }
          100% {
            transform: rotate(0deg) scale(1.04);
          }
        }

        @keyframes siriOrbPulse {
          0% {
            transform: scale(0.85);
            filter: brightness(1) drop-shadow(0 0 10px #00f0ff);
          }
          100% {
            transform: scale(1.15);
            filter: brightness(1.3) drop-shadow(0 0 20px #ef4444);
          }
        }

        @keyframes textGlowPulse {
          0% {
            opacity: 0.6;
          }
          100% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
