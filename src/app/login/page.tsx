"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotUsername, setForgotUsername] = useState("");
  const [forgotCccd, setForgotCccd] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState<{ type: "error" | "success"; text: string } | null>(null);

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
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Đăng nhập không thành công.");
      } else {
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
          username: forgotUsername.trim(),
          cccd: forgotCccd.trim(),
          newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setForgotMsg({ type: "error", text: data.error || "Không thể đặt lại mật khẩu." });
      } else {
        setForgotMsg({ type: "success", text: data.message });
        setUsername(forgotUsername.trim());
        setPassword(newPassword);
        setTimeout(() => {
          setShowForgotModal(false);
          setForgotMsg(null);
        }, 1500);
      }
    } catch {
      setForgotMsg({ type: "error", text: "Lỗi kết nối máy chủ xác minh." });
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "linear-gradient(135deg, #7f1d1d 0%, #991b1b 50%, #b91c1c 100%)",
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
      }}
    >
      <div
        className="login-grid"
        style={{
          width: "100%",
          maxWidth: "1260px",
          margin: "0 auto",
          padding: "3rem 2.5rem",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.25fr) minmax(0, 0.85fr)",
          gap: "4.5rem",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ marginBottom: "1.25rem" }}>
            <span
              style={{
                fontSize: "0.9rem",
                fontWeight: 800,
                color: "#FDE047",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              HỘI ĐỒNG NHÂN DÂN PHƯỜNG BÌNH ĐÔNG
            </span>
          </div>

          <h1
            style={{
              fontSize: "clamp(1.75rem, 3vw, 2.6rem)",
              fontWeight: 800,
              lineHeight: 1.26,
              letterSpacing: "-0.02em",
              color: "#ffffff",
              textTransform: "uppercase",
              marginBottom: "1.5rem",
            }}
          >
            HỆ THỐNG ỨNG DỤNG TỔNG HỢP, THEO DÕI GIẢI QUYẾT KIẾN NGHỊ CỬ TRI CỦA HỘI ĐỒNG NHÂN DÂN PHƯỜNG BÌNH ĐÔNG
          </h1>

          <p
            style={{
              fontSize: "1rem",
              color: "rgba(255, 255, 255, 0.85)",
              lineHeight: 1.65,
              maxWidth: "580px",
              marginBottom: "2rem",
            }}
          >
            Cổng quản trị và giám sát tiến độ xử lý dành cho Thường trực HĐND, các Ban HĐND, UBND và các phòng chuyên môn phường Bình Đông.
          </p>

          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.45rem",
              color: "#FDE047",
              fontSize: "0.88rem",
              fontWeight: 700,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Tra cứu tiến độ kiến nghị
          </Link>
        </div>

        {/* Vùng đăng nhập nền trắng sáng sạch, độ tương phản cao tối đa */}
        <div
          style={{
            width: "100%",
            maxWidth: "420px",
            justifySelf: "end",
            backgroundColor: "#ffffff",
            color: "var(--text-primary)",
            borderRadius: "18px",
            padding: "2.5rem 2.25rem",
            boxShadow: "0 24px 54px rgba(0, 0, 0, 0.28)",
          }}
        >
          <h2
            style={{
              fontSize: "1.5rem",
              fontWeight: 800,
              color: "#7f1d1d",
              marginBottom: "1.5rem",
            }}
          >
            Đăng nhập cán bộ
          </h2>

          {error && (
            <div
              style={{
                backgroundColor: "var(--danger-bg)",
                color: "var(--danger)",
                padding: "0.8rem 1rem",
                borderRadius: "10px",
                fontSize: "0.85rem",
                fontWeight: 700,
                marginBottom: "1.25rem",
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
            <div className="form-group">
              <label htmlFor="username" className="form-label">
                Tên đăng nhập
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nhập tên tài khoản"
                required
                className="form-control"
              />
            </div>

            <div className="form-group">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label htmlFor="password" className="form-label">
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
                    color: "#b91c1c",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Quên mật khẩu?
                </button>
              </div>
              <div style={{ position: "relative" }}>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  required
                  className="form-control"
                  style={{ paddingRight: "3.5rem" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  style={{
                    position: "absolute",
                    right: "0.75rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "var(--text-secondary)",
                    fontSize: "0.76rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {showPassword ? "Ẩn" : "Hiện"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ width: "100%", padding: "0.85rem 1.25rem", fontSize: "0.94rem", marginTop: "0.35rem" }}
            >
              {loading ? "Đang xác thực..." : "Đăng nhập"}
            </button>
          </form>
        </div>
      </div>

      {showForgotModal && (
        <div className="modal-overlay" onClick={() => setShowForgotModal(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: "430px", padding: "2rem" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="modal-title" style={{ marginBottom: "0.5rem" }}>
              Khôi phục mật khẩu
            </h3>
            <p style={{ fontSize: "0.86rem", color: "var(--text-secondary)", marginBottom: "1.25rem" }}>
              Nhập đúng Tên đăng nhập và Số CCCD đã đăng ký để đặt mật khẩu mới.
            </p>

            {forgotMsg && (
              <div
                style={{
                  backgroundColor: forgotMsg.type === "error" ? "var(--danger-bg)" : "var(--success-bg)",
                  color: forgotMsg.type === "error" ? "var(--danger)" : "var(--success)",
                  padding: "0.7rem 0.9rem",
                  borderRadius: "8px",
                  fontSize: "0.84rem",
                  fontWeight: 700,
                  marginBottom: "1rem",
                }}
              >
                {forgotMsg.text}
              </div>
            )}

            <form onSubmit={handleForgotPassword} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label">Tên đăng nhập</label>
                <input
                  type="text"
                  value={forgotUsername}
                  onChange={(e) => setForgotUsername(e.target.value)}
                  required
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Số CCCD định danh</label>
                <input
                  type="text"
                  value={forgotCccd}
                  onChange={(e) => setForgotCccd(e.target.value)}
                  required
                  className="form-control tabular-nums"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mật khẩu mới (tối thiểu 6 ký tự)</label>
                <input
                  type="password"
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="form-control"
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.65rem", marginTop: "0.5rem" }}>
                <button type="button" onClick={() => setShowForgotModal(false)} className="btn-secondary">
                  Đóng
                </button>
                <button type="submit" disabled={forgotLoading} className="btn-primary">
                  {forgotLoading ? "Đang xác minh..." : "Đặt lại mật khẩu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        @media (max-width: 900px) {
          .login-grid {
            grid-template-columns: 1fr !important;
            gap: 2.5rem !important;
            padding: 2rem 1.5rem !important;
          }
        }
      `}</style>
    </div>
  );
}
