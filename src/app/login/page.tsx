"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forgot Password Modal
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotUsername, setForgotUsername] = useState("");
  const [forgotCccd, setForgotCccd] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const formCardRef = useRef<HTMLDivElement>(null);
  const bgHaloRef = useRef<HTMLDivElement>(null);

  // GSAP Grand Entrance Animation
  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    // Ambient Halo Pulse
    if (bgHaloRef.current) {
      gsap.to(bgHaloRef.current, {
        scale: 1.15,
        opacity: 0.7,
        duration: 4,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    }

    if (leftPanelRef.current) {
      tl.from(leftPanelRef.current.querySelectorAll(".gsap-anim-title"), {
        opacity: 0,
        y: 40,
        rotationX: -15,
        stagger: 0.12,
        duration: 0.9,
        clearProps: "transform,opacity",
      });
    }

    if (formCardRef.current) {
      tl.from(
        formCardRef.current,
        {
          opacity: 0,
          y: 35,
          scale: 0.94,
          duration: 0.8,
          ease: "back.out(1.4)",
          clearProps: "transform,opacity",
        },
        "-=0.5"
      );
    }
  }, { scope: containerRef });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.");
        if (formCardRef.current) {
          gsap.fromTo(
            formCardRef.current,
            { x: -10 },
            { x: 10, duration: 0.08, repeat: 3, yoyo: true, ease: "linear" }
          );
        }
      } else {
        if (formCardRef.current) {
          gsap.to(formCardRef.current, {
            opacity: 0,
            scale: 0.95,
            duration: 0.25,
          });
        }
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("Không thể kết nối đến máy chủ xác thực.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotMsg(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: forgotUsername,
          cccd: forgotCccd,
          newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setForgotMsg({ type: "error", text: data.error || "Không thể đặt lại mật khẩu." });
      } else {
        setForgotMsg({ type: "success", text: data.message });
        setUsername(forgotUsername);
        setPassword(newPassword);
        setTimeout(() => {
          setShowForgotModal(false);
          setForgotMsg(null);
        }, 1800);
      }
    } catch {
      setForgotMsg({ type: "error", text: "Lỗi kết nối máy chủ xác minh." });
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        minHeight: "100dvh",
        display: "flex",
        backgroundColor: "#090a0f",
        color: "#ffffff",
        fontFamily: "var(--font-sans)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Dynamic Background Neon Light Ambient Halos */}
      <div
        ref={bgHaloRef}
        style={{
          position: "absolute",
          top: "-20%",
          left: "-10%",
          width: "750px",
          height: "750px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(239, 68, 68, 0.15) 0%, rgba(249, 115, 22, 0.1) 40%, rgba(0, 240, 255, 0.05) 70%, rgba(9, 10, 15, 0) 100%)",
          filter: "blur(60px)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "absolute",
          bottom: "-25%",
          right: "-10%",
          width: "700px",
          height: "700px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0, 240, 255, 0.18) 0%, rgba(255, 215, 0, 0.08) 50%, rgba(9, 10, 15, 0) 100%)",
          filter: "blur(70px)",
          pointerEvents: "none",
        }}
      />

      {/* Main Container Layout */}
      <div
        style={{
          display: "flex",
          width: "100%",
          maxWidth: "1400px",
          margin: "0 auto",
          minHeight: "100dvh",
          alignItems: "center",
          padding: "2rem",
          gap: "3rem",
          zIndex: 2,
        }}
        className="login-split-container"
      >
        {/* Left Side: Clean & Powerful Typography */}
        <div
          ref={leftPanelRef}
          style={{
            flex: "1 1 55%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "2rem 1rem",
          }}
        >
          {/* Brand Pill */}
          <div
            className="gsap-anim-title"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.6rem",
              padding: "0.4rem 0.95rem",
              borderRadius: "9999px",
              backgroundColor: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(0, 240, 255, 0.3)",
              fontSize: "0.75rem",
              fontWeight: 700,
              color: "#00f0ff",
              boxShadow: "0 0 15px rgba(0, 240, 255, 0.2)",
              width: "fit-content",
              marginBottom: "2rem",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "#00f0ff",
                boxShadow: "0 0 10px #00f0ff",
              }}
            />
            HÀNH CHÍNH SỐ PHƯỜNG BÌNH ĐÔNG
          </div>

          {/* Headline Statement */}
          <h1
            className="gsap-anim-title"
            style={{
              fontSize: "clamp(2rem, 3.8vw, 3.4rem)",
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: "-0.03em",
              color: "#ffffff",
              marginBottom: "1.5rem",
            }}
          >
            HỆ THỐNG TIẾP NHẬN{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #ef4444 0%, #f97316 50%, #ffd700 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Ý KIẾN SỐ
            </span>{" "}
            VÀ GIẢI QUYẾT THỦ TỤC HÀNH CHÍNH PHƯỜNG BÌNH ĐÔNG
          </h1>

          <p
            className="gsap-anim-title"
            style={{
              fontSize: "1.05rem",
              color: "rgba(255, 255, 255, 0.7)",
              lineHeight: 1.6,
              maxWidth: "600px",
              fontWeight: 400,
            }}
          >
            Cổng xác thực tập trung số hóa quy trình rà soát, tiếp nhận và phân định thẩm quyền xử lý hồ sơ kiến nghị giữa Chuyên viên tham mưu và Quản trị viên Phường.
          </p>
        </div>

        {/* Right Side: Ultra-Modern Glassmorphic Login Card */}
        <div
          style={{
            flex: "1 1 45%",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            ref={formCardRef}
            style={{
              width: "100%",
              maxWidth: "440px",
              backgroundColor: "rgba(255, 255, 255, 0.04)",
              borderRadius: "24px",
              padding: "2.75rem 2.25rem",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.15)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              position: "relative",
            }}
          >
            <div style={{ marginBottom: "2rem" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#00f0ff", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.3rem" }}>
                Xác Thực Hệ Thống
              </div>
              <h2 style={{ fontSize: "1.6rem", fontWeight: 800, color: "#ffffff", letterSpacing: "-0.02em" }}>
                Đăng Nhập Tài Khoản
              </h2>
            </div>

            {error && (
              <div
                style={{
                  backgroundColor: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.4)",
                  borderRadius: "12px",
                  padding: "0.85rem 1rem",
                  fontSize: "0.85rem",
                  color: "#fca5a5",
                  fontWeight: 600,
                  marginBottom: "1.5rem",
                  lineHeight: 1.4,
                  backdropFilter: "blur(8px)",
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: "1.25rem" }}>
                <label
                  htmlFor="username"
                  style={{
                    display: "block",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    color: "rgba(255, 255, 255, 0.9)",
                    marginBottom: "0.45rem",
                  }}
                >
                  Tên đăng nhập
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Nhập username được cấp..."
                  required
                  className="led-input"
                />
              </div>

              <div style={{ marginBottom: "1.75rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.45rem" }}>
                  <label
                    htmlFor="password"
                    style={{
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      color: "rgba(255, 255, 255, 0.9)",
                    }}
                  >
                    Mật khẩu
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotUsername(username);
                      setForgotMsg(null);
                      setShowForgotModal(true);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#ffd700",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "color 0.2s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#00f0ff")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#ffd700")}
                  >
                    Quên mật khẩu?
                  </button>
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="led-input"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-neon-blue"
                style={{ width: "100%", padding: "0.85rem 1.25rem", fontSize: "0.95rem" }}
              >
                {loading ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "0.6rem" }}>
                    <span
                      style={{
                        width: "14px",
                        height: "14px",
                        borderRadius: "50%",
                        border: "2px solid #ffffff",
                        borderTopColor: "transparent",
                        animation: "spin 0.6s linear infinite",
                      }}
                    />
                    Đang Xác Thực Hệ Thống...
                  </span>
                ) : (
                  <>
                    Xác Thực Đăng Nhập
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal with LED Glow */}
      {showForgotModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "1.5rem",
          }}
        >
          <div
            style={{
              backgroundColor: "rgba(15, 17, 23, 0.95)",
              borderRadius: "20px",
              maxWidth: "440px",
              width: "100%",
              padding: "2.25rem 2rem",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 30px rgba(0, 240, 255, 0.2)",
              border: "1px solid rgba(0, 240, 255, 0.3)",
              backdropFilter: "blur(20px)",
            }}
          >
            <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#ffffff", marginBottom: "0.4rem" }}>
              Khôi Phục Mật Khẩu Qua CCCD
            </h3>
            <p style={{ fontSize: "0.82rem", color: "rgba(255, 255, 255, 0.7)", marginBottom: "1.25rem", lineHeight: 1.4 }}>
              Nhập chính xác số **Căn cước công dân (CCCD)** đã cấp kèm tên tài khoản để xác minh chính chủ và tạo mật khẩu mới.
            </p>

            {forgotMsg && (
              <div
                style={{
                  backgroundColor: forgotMsg.type === "error" ? "rgba(239, 68, 68, 0.2)" : "rgba(16, 185, 129, 0.2)",
                  border: `1px solid ${forgotMsg.type === "error" ? "rgba(239, 68, 68, 0.5)" : "rgba(16, 185, 129, 0.5)"}`,
                  color: forgotMsg.type === "error" ? "#fca5a5" : "#6ee7b7",
                  padding: "0.7rem 0.9rem",
                  borderRadius: "10px",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  marginBottom: "1rem",
                }}
              >
                {forgotMsg.text}
              </div>
            )}

            <form onSubmit={handleForgotPassword}>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "rgba(255, 255, 255, 0.9)", marginBottom: "0.35rem" }}>
                  Tên đăng nhập
                </label>
                <input
                  type="text"
                  value={forgotUsername}
                  onChange={(e) => setForgotUsername(e.target.value)}
                  placeholder="chuyenvien"
                  required
                  className="led-input"
                />
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "rgba(255, 255, 255, 0.9)", marginBottom: "0.35rem" }}>
                  Số CCCD được cấp (Định danh)
                </label>
                <input
                  type="text"
                  value={forgotCccd}
                  onChange={(e) => setForgotCccd(e.target.value)}
                  placeholder="079090000002"
                  required
                  className="led-input"
                  style={{ fontFamily: "ui-monospace, monospace" }}
                />
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "rgba(255, 255, 255, 0.9)", marginBottom: "0.35rem" }}>
                  Mật khẩu mới
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="led-input"
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  style={{
                    padding: "0.6rem 1.1rem",
                    borderRadius: "10px",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    backgroundColor: "transparent",
                    color: "rgba(255, 255, 255, 0.8)",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="led-glow-btn"
                  style={{ padding: "0.6rem 1.3rem", fontSize: "0.85rem" }}
                >
                  {forgotLoading ? "Đang xác minh..." : "Đặt Lại Mật Khẩu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Responsive Styles */}
      <style jsx global>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 900px) {
          .login-split-container {
            flex-direction: column !important;
            padding: 1.5rem !important;
            gap: 2rem !important;
            justify-content: center !important;
          }
        }
      `}</style>
    </div>
  );
}
