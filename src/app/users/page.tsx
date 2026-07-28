"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface UserAccount {
  id: string;
  username: string;
  fullName: string;
  cccd?: string | null;
  email?: string | null;
  phone?: string | null;
  role: string;
  department?: string | null;
  position?: string | null;
  avatarUrl?: string | null;
  pendingFullName?: string | null;
  pendingCccd?: string | null;
  pendingPosition?: string | null;
  changeRequestStatus?: string | null;
  changeRequestedAt?: string | null;
  createdAt: string;
}

export default function AccountCenterPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);

  // Specialist Profile Form States
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  
  // Sensitive Change Request Form States
  const [reqFullName, setReqFullName] = useState("");
  const [reqCccd, setReqCccd] = useState("");
  const [reqPosition, setReqPosition] = useState("");

  const [profileSaving, setProfileSaving] = useState(false);
  const [requestSaving, setRequestSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Admin Management States
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminFullName, setAdminFullName] = useState("");
  const [adminCccd, setAdminCccd] = useState("");
  const [adminRole, setAdminRole] = useState("CHUYEN_VIEN");
  const [adminDept, setAdminDept] = useState("Phòng Tổng hợp & Tiếp nhận");
  const [adminPosition, setAdminPosition] = useState("Chuyên viên thống kê báo cáo");
  const [adminSaving, setAdminSaving] = useState(false);
  const [adminFormError, setAdminFormError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const authRes = await fetch("/api/auth/me");
      const authData = await authRes.json();

      if (!authData.authenticated || !authData.user) {
        router.push("/login");
        return;
      }

      const u: UserAccount = authData.user;
      setCurrentUser(u);

      // Fill specialist profile form
      setPhone(u.phone || "");
      setEmail(u.email || "");
      setAvatarUrl(u.avatarUrl || "");

      setReqFullName(u.pendingFullName || u.fullName || "");
      setReqCccd(u.pendingCccd || u.cccd || "");
      setReqPosition(u.pendingPosition || u.position || "Chuyên viên thống kê báo cáo");

      if (u.role === "ADMIN") {
        const res = await fetch("/api/users");
        const data = await res.json();
        if (res.ok && data.success) {
          setUsers(data.data);
          if (data.data.length > 0) setExpandedId(data.data[0].id);
        }
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [router]);



  // Specialist direct profile update (Phone, Email, Avatar)
  const handleSaveDirectProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setMsg(null);

    try {
      const res = await fetch("/api/users/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, email, avatarUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ text: data.error || "Không thể cập nhật.", type: "error" });
      } else {
        setMsg({ text: data.message, type: "success" });
        loadData();
      }
    } catch {
      setMsg({ text: "Lỗi kết nối máy chủ.", type: "error" });
    } finally {
      setProfileSaving(false);
    }
  };

  // Specialist request sensitive changes (FullName, CCCD, Position)
  const handleSendChangeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequestSaving(true);
    setMsg(null);

    try {
      const res = await fetch("/api/users/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestedFullName: reqFullName,
          requestedCccd: reqCccd,
          requestedPosition: reqPosition,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ text: data.error || "Không thể gửi yêu cầu.", type: "error" });
      } else {
        setMsg({ text: data.message, type: "success" });
        loadData();
      }
    } catch {
      setMsg({ text: "Lỗi kết nối máy chủ.", type: "error" });
    } finally {
      setRequestSaving(false);
    }
  };

  // Admin Approve / Reject change request
  const handleAdminApproveChange = async (userId: string, action: "APPROVE" | "REJECT") => {
    try {
      const res = await fetch("/api/users/approve-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Lỗi xử lý yêu cầu.");
      } else {
        alert(data.message);
        loadData();
      }
    } catch {
      alert("Lỗi khi kết nối tới máy chủ.");
    }
  };

  // Admin Create / Edit User
  const handleAdminSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminSaving(true);
    setAdminFormError(null);

    try {
      if (editingUser) {
        const res = await fetch(`/api/users/${editingUser.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: adminFullName,
            cccd: adminCccd,
            role: adminRole,
            department: adminDept,
            position: adminPosition,
            ...(adminPassword ? { password: adminPassword } : {}),
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setAdminFormError(data.error || "Không thể cập nhật.");
        } else {
          setShowModal(false);
          loadData();
        }
      } else {
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: adminUsername,
            password: adminPassword,
            fullName: adminFullName,
            cccd: adminCccd,
            role: adminRole,
            department: adminDept,
            position: adminPosition,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setAdminFormError(data.error || "Không thể tạo tài khoản mới.");
        } else {
          setShowModal(false);
          loadData();
        }
      }
    } catch {
      setAdminFormError("Lỗi kết nối.");
    } finally {
      setAdminSaving(false);
    }
  };

  const handleAdminDeleteUser = async (userId: string, targetUsername: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Bạn có chắc chắn muốn xóa tài khoản "${targetUsername}"?`)) return;
    try {
      const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Không thể xóa.");
      } else {
        loadData();
      }
    } catch {
      alert("Lỗi khi xóa tài khoản.");
    }
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setAdminUsername("");
    setAdminPassword("");
    setAdminFullName("");
    setAdminCccd("");
    setAdminRole("CHUYEN_VIEN");
    setAdminDept("Phòng Tổng hợp & Tiếp nhận");
    setAdminPosition("Chuyên viên thống kê báo cáo");
    setAdminFormError(null);
    setShowModal(true);
  };

  const openEditModal = (u: UserAccount, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingUser(u);
    setAdminUsername(u.username);
    setAdminPassword("");
    setAdminFullName(u.fullName);
    setAdminCccd(u.cccd || "");
    setAdminRole(u.role);
    setAdminDept(u.department || "Phòng Tổng hợp & Tiếp nhận");
    setAdminPosition(u.position || "Chuyên viên thống kê báo cáo");
    setAdminFormError(null);
    setShowModal(true);
  };

  const getRoleBadge = (r: string) => {
    switch (r) {
      case "ADMIN":
        return <span className="status-badge status-expired">Quản trị viên (Admin)</span>;
      case "CHUYEN_VIEN":
        return <span className="status-badge status-in-progress">Chuyên viên xử lý</span>;
      case "CAN_BO":
        return <span className="status-badge status-completed">Cán bộ Phường</span>;
      default:
        return <span className="status-badge status-completed">{r}</span>;
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "5rem", textAlign: "center", color: "#6b7280", fontWeight: 600 }}>
        Đang khởi tạo Trung tâm Tài khoản...
      </div>
    );
  }

  const pendingRequestsList = users.filter((u) => u.changeRequestStatus === "PENDING");

  /* ═══════════════════════════════════════════════════
     1. GIAO DIỆN CHUYÊN VIÊN / CÁN BỘ (ACCOUNT CENTER)
     ═══════════════════════════════════════════════════ */
  if (currentUser && currentUser.role !== "ADMIN") {
    return (
      <div style={{ padding: "2rem 2.5rem", width: "100%" }}>
        
        {/* Header Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <div>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.3rem" }}>
              Cổng Dịch Vụ Công Bình Đông • Hồ Sơ Cá Nhân
            </div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#121316", letterSpacing: "-0.03em" }}>
              Trung Tâm Tài Khoản Chuyên Viên
            </h1>
          </div>
        </div>

        {msg && (
          <div
            style={{
              backgroundColor: msg.type === "success" ? "#ecfdf5" : "#fef2f2",
              border: `1px solid ${msg.type === "success" ? "#a7f3d0" : "#fecaca"}`,
              color: msg.type === "success" ? "#047857" : "#dc2626",
              padding: "0.85rem 1.25rem",
              borderRadius: "14px",
              fontSize: "0.88rem",
              fontWeight: 600,
              marginBottom: "1.5rem",
            }}
          >
            {msg.text}
          </div>
        )}

        {/* ── CARD 1: Profile 3x4 Header Card ── */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "20px",
            border: "1px solid rgba(0,0,0,0.07)",
            padding: "2rem",
            boxShadow: "0 4px 24px rgba(0,0,0,0.04)",
            marginBottom: "2rem",
            display: "flex",
            gap: "2rem",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {/* Frame ảnh thẻ 3x4 */}
          <div style={{ position: "relative" }}>
            <div
              style={{
                width: "120px",
                height: "160px",
                borderRadius: "14px",
                overflow: "hidden",
                border: "2px solid #2563eb",
                boxShadow: "0 6px 18px rgba(37,99,235,0.18)",
                backgroundColor: "#f3f4f6",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {currentUser.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentUser.avatarUrl}
                  alt="Ảnh thẻ 3x4"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <div style={{ textAlign: "center", padding: "0.5rem" }}>
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: "50%",
                      backgroundColor: "#ef4444",
                      color: "#fff",
                      fontWeight: 800,
                      fontSize: "1.4rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 0.5rem",
                    }}
                  >
                    {currentUser.fullName ? currentUser.fullName.substring(0, 2).toUpperCase() : "CV"}
                  </div>
                  <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#6b7280" }}>Ảnh thẻ 3x4</span>
                </div>
              )}
            </div>
            <span
              style={{
                position: "absolute",
                bottom: -8,
                left: "50%",
                transform: "translateX(-50%)",
                backgroundColor: "#2563eb",
                color: "#fff",
                fontSize: "0.62rem",
                fontWeight: 800,
                padding: "0.15rem 0.6rem",
                borderRadius: 9999,
                whiteSpace: "nowrap",
              }}
            >
              KÍCH THƯỚC 3X4
            </span>
          </div>

          {/* Core Info */}
          <div style={{ flex: 1, minWidth: "260px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", marginBottom: "0.5rem" }}>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#121316", margin: 0 }}>
                {currentUser.fullName}
              </h2>
              {getRoleBadge(currentUser.role)}
            </div>

            <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#ef4444", marginBottom: "0.85rem" }}>
              Chức vụ: {currentUser.position || "Chuyên viên thống kê báo cáo"}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
              <div>
                <span style={{ fontSize: "0.72rem", color: "#6b7280", fontWeight: 700, textTransform: "uppercase" }}>Tên đăng nhập</span>
                <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "#374151", fontFamily: "ui-monospace, monospace" }}>
                  {currentUser.username}
                </div>
              </div>

              <div>
                <span style={{ fontSize: "0.72rem", color: "#6b7280", fontWeight: 700, textTransform: "uppercase" }}>Số CCCD (Định danh)</span>
                <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "#121316", fontFamily: "ui-monospace, monospace" }}>
                  {currentUser.cccd || "Chưa cập nhật"} <span style={{ fontSize: "0.7rem", color: "#9ca3af", fontWeight: 500 }}>(Khóa)</span>
                </div>
              </div>

              <div>
                <span style={{ fontSize: "0.72rem", color: "#6b7280", fontWeight: 700, textTransform: "uppercase" }}>Đơn vị công tác</span>
                <div style={{ fontSize: "0.92rem", fontWeight: 600, color: "#374151" }}>
                  {currentUser.department || "Phường Bình Đông"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── CARD 2: Direct Edit (Phone, Email, Avatar URL) ── */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "20px",
            border: "1px solid rgba(0,0,0,0.07)",
            padding: "2rem",
            boxShadow: "0 4px 24px rgba(0,0,0,0.04)",
            marginBottom: "2rem",
          }}
        >
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.3rem" }}>
            Tự Cập Nhật Trực Tiếp
          </div>
          <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#121316", marginBottom: "1.25rem" }}>
            Thông Tin Liên Hệ & Ảnh Thẻ
          </h3>

          <form onSubmit={handleSaveDirectProfile}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.2rem", marginBottom: "1.25rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: "0.4rem" }}>
                  Số điện thoại di động
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0901234567"
                  style={{
                    width: "100%",
                    padding: "0.75rem 0.9rem",
                    borderRadius: "10px",
                    border: "1px solid #d1d5db",
                    fontSize: "0.9rem",
                    fontFamily: "ui-monospace, monospace",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: "0.4rem" }}>
                  Địa chỉ Email liên hệ
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="chuyenvien@binhdong.gov.vn"
                  style={{
                    width: "100%",
                    padding: "0.75rem 0.9rem",
                    borderRadius: "10px",
                    border: "1px solid #d1d5db",
                    fontSize: "0.9rem",
                  }}
                />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: "0.4rem" }}>
                  Đường dẫn (URL) Ảnh thẻ 3x4
                </label>
                <input
                  type="text"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/anh-3x4.jpg"
                  style={{
                    width: "100%",
                    padding: "0.75rem 0.9rem",
                    borderRadius: "10px",
                    border: "1px solid #d1d5db",
                    fontSize: "0.9rem",
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="submit"
                disabled={profileSaving}
                className="btn-neon-blue"
                style={{ padding: "0.65rem 1.5rem" }}
              >
                {profileSaving ? "Đang lưu..." : "Lưu Thông Tin Liên Hệ"}
              </button>
            </div>
          </form>
        </div>

        {/* ── CARD 3: Request Sensitive Changes (FullName, CCCD, Position) ── */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "20px",
            border: "1px solid rgba(0,0,0,0.07)",
            padding: "2rem",
            boxShadow: "0 4px 24px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#ef4444", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.3rem" }}>
            Quy Trình Duyệt Admin
          </div>
          <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#121316", marginBottom: "0.5rem" }}>
            Yêu Cầu Thay Đổi Thông Tin Định Danh (Họ tên, CCCD, Chức vụ)
          </h3>
          <p style={{ color: "#6b7280", fontSize: "0.88rem", lineHeight: 1.5, marginBottom: "1.5rem" }}>
            Do Họ tên, Số CCCD và Chức vụ là thông tin pháp lý chính thức của Cán bộ / Chuyên viên, mọi thay đổi phải gửi Yêu cầu Phê duyệt tới Quản trị viên (Admin). Thay đổi chỉ có hiệu lực chính thức sau khi Admin phê duyệt.
          </p>

          {currentUser.changeRequestStatus === "PENDING" && (
            <div
              style={{
                backgroundColor: "#fffbeb",
                border: "1px solid #fde68a",
                borderRadius: "14px",
                padding: "1.25rem",
                marginBottom: "1.5rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#b45309", fontWeight: 800, fontSize: "0.95rem", marginBottom: "0.4rem" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                ĐANG CÓ YÊU CẦU THAY ĐỔI ĐANG CHỜ ADMIN PHÊ DUYỆT
              </div>
              <p style={{ fontSize: "0.85rem", color: "#92400e", margin: 0, lineHeight: 1.5 }}>
                • Họ và tên đề xuất: <strong>{currentUser.pendingFullName || "(Không đổi)"}</strong><br />
                • Số CCCD đề xuất: <strong>{currentUser.pendingCccd || "(Không đổi)"}</strong><br />
                • Chức vụ đề xuất: <strong>{currentUser.pendingPosition || "(Không đổi)"}</strong><br />
                <em>Thời gian gửi: {currentUser.changeRequestedAt ? new Date(currentUser.changeRequestedAt).toLocaleString("vi-VN") : ""}</em>
              </p>
            </div>
          )}

          <form onSubmit={handleSendChangeRequest}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.2rem", marginBottom: "1.25rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: "0.4rem" }}>
                  Họ và tên chính thức (Mới)
                </label>
                <input
                  type="text"
                  value={reqFullName}
                  onChange={(e) => setReqFullName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  required
                  style={{
                    width: "100%",
                    padding: "0.75rem 0.9rem",
                    borderRadius: "10px",
                    border: "1px solid #d1d5db",
                    fontSize: "0.9rem",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: "0.4rem" }}>
                  Số CCCD định danh (Mới)
                </label>
                <input
                  type="text"
                  value={reqCccd}
                  onChange={(e) => setReqCccd(e.target.value)}
                  placeholder="079090000xxx"
                  required
                  style={{
                    width: "100%",
                    padding: "0.75rem 0.9rem",
                    borderRadius: "10px",
                    border: "1px solid #d1d5db",
                    fontSize: "0.9rem",
                    fontFamily: "ui-monospace, monospace",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: "0.4rem" }}>
                  Chức vụ công tác (Mới)
                </label>
                <input
                  type="text"
                  value={reqPosition}
                  onChange={(e) => setReqPosition(e.target.value)}
                  placeholder="Chuyên viên thống kê báo cáo"
                  required
                  style={{
                    width: "100%",
                    padding: "0.75rem 0.9rem",
                    borderRadius: "10px",
                    border: "1px solid #d1d5db",
                    fontSize: "0.9rem",
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="submit"
                disabled={requestSaving}
                className="btn-neon-blue"
                style={{ padding: "0.7rem 1.6rem" }}
              >
                {requestSaving ? "Đang gửi..." : "Gửi Yêu Cầu Thay Đổi Đến Admin"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════
     2. GIAO DIỆN QUẢN TRỊ VIÊN (ADMIN ACCOUNT CENTER & APPROVAL)
     ═══════════════════════════════════════════════════ */
  return (
    <div style={{ padding: "2rem 2.5rem", width: "100%" }}>
      {/* Header Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2rem" }}>
        <div>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.3rem" }}>
            Hệ Thống Phân Quyền & Duyệt Hồ Sơ
          </div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#121316", letterSpacing: "-0.03em" }}>
            Quản Lý Tài Khoản & Trung Tâm Phê Duyệt
          </h1>
        </div>

        <div style={{ display: "flex", gap: "1rem" }}>
          <button
            onClick={openCreateModal}
            className="btn-neon-blue"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Tạo Tài Khoản Mới
          </button>
        </div>
      </div>

      {/* ── SECTION 1: Pending Change Requests List for Admin ── */}
      {pendingRequestsList.length > 0 && (
        <div
          style={{
            backgroundColor: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: "20px",
            padding: "1.75rem 2rem",
            boxShadow: "0 10px 30px rgba(217,119,6,0.08)",
            marginBottom: "2.5rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <div>
              <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#b45309", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Hàng Chờ Duyệt Admin
              </span>
              <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#92400e", margin: 0 }}>
                Yêu Cầu Thay Đổi Thông Tin Cá Nhân ({pendingRequestsList.length})
              </h2>
            </div>
            <span className="status-badge status-expired" style={{ fontSize: "0.8rem" }}>
              Cần xử lý dứt điểm
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {pendingRequestsList.map((reqUser) => (
              <div
                key={reqUser.id}
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "14px",
                  border: "1px solid rgba(0,0,0,0.08)",
                  padding: "1.25rem 1.5rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "1rem",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.4rem" }}>
                    <strong style={{ fontSize: "1.05rem", color: "#121316" }}>{reqUser.fullName}</strong>
                    <span style={{ fontSize: "0.82rem", color: "#6b7280", fontFamily: "ui-monospace, monospace" }}>
                      ({reqUser.username})
                    </span>
                    {getRoleBadge(reqUser.role)}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", fontSize: "0.85rem", color: "#374151" }}>
                    <div>
                      <span style={{ color: "#6b7280" }}>Dữ liệu Hiện tại:</span><br />
                      • Họ tên: <strong>{reqUser.fullName}</strong><br />
                      • CCCD: <strong>{reqUser.cccd || "Chưa có"}</strong><br />
                      • Chức vụ: <strong>{reqUser.position || "Chuyên viên thống kê báo cáo"}</strong>
                    </div>

                    <div style={{ backgroundColor: "#f0fdf4", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
                      <span style={{ color: "#166534", fontWeight: 700 }}>Đề xuất Thay đổi mới:</span><br />
                      • Họ tên: <strong>{reqUser.pendingFullName || "(Giữ nguyên)"}</strong><br />
                      • CCCD: <strong>{reqUser.pendingCccd || "(Giữ nguyên)"}</strong><br />
                      • Chức vụ: <strong>{reqUser.pendingPosition || "(Giữ nguyên)"}</strong>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <button
                    onClick={() => handleAdminApproveChange(reqUser.id, "APPROVE")}
                    className="btn-neon-blue"
                    style={{ padding: "0.55rem 1.25rem", fontSize: "0.82rem" }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    Duyệt Thay Đổi
                  </button>

                  <button
                    onClick={() => handleAdminApproveChange(reqUser.id, "REJECT")}
                    className="btn-neon-red"
                    style={{ padding: "0.55rem 1rem", fontSize: "0.82rem" }}
                  >
                    Từ Chối
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SECTION 2: Expandable Account Cards List for Admin ── */}
      <div>
        <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5rem" }}>
          Danh Mục Toàn Bộ Tài Khoản
        </div>
        
        {users.map((u) => {
          const isExpanded = expandedId === u.id;
          return (
            <div key={u.id} className="expandable-user-card">
              {/* Card Header */}
              <div className="expandable-card-header" onClick={() => setExpandedId(isExpanded ? null : u.id)}>
                <div style={{ display: "flex", alignItems: "center", gap: "1.2rem" }}>
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "14px",
                      background: u.role === "ADMIN" ? "#121316" : u.role === "CHUYEN_VIEN" ? "#ef4444" : "#2563eb",
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      fontSize: "0.95rem",
                      overflow: "hidden",
                      flexShrink: 0,
                    }}
                  >
                    {u.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={u.avatarUrl} alt="3x4" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      u.fullName ? u.fullName.substring(0, 2).toUpperCase() : "CB"
                    )}
                  </div>

                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <span style={{ fontSize: "1.05rem", fontWeight: 800, color: "#121316" }}>
                        {u.fullName}
                      </span>
                      {getRoleBadge(u.role)}
                    </div>
                    <div style={{ fontSize: "0.82rem", color: "#6b7280", marginTop: "0.15rem", display: "flex", gap: "1rem" }}>
                      <span>Chức vụ: <strong style={{ color: "#ef4444" }}>{u.position || "Chuyên viên thống kê báo cáo"}</strong></span>
                      <span>•</span>
                      <span>Username: <strong style={{ fontFamily: "ui-monospace, monospace" }}>{u.username}</strong></span>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#6b7280", fontFamily: "ui-monospace, monospace" }}>
                    CCCD: {u.cccd || "Chưa cấp"}
                  </span>
                  <div className={`arrow-icon ${isExpanded ? "expanded" : ""}`} style={{ color: "#6b7280" }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
                </div>
              </div>

              {/* Card Body Details */}
              {isExpanded && (
                <div className="expandable-card-body">
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.25rem", marginBottom: "1.5rem" }}>
                    <div>
                      <div style={{ fontSize: "0.72rem", color: "#6b7280", fontWeight: 700, textTransform: "uppercase" }}>Số CCCD</div>
                      <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#121316", fontFamily: "ui-monospace, monospace" }}>
                        {u.cccd || "Chưa đăng ký"}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: "0.72rem", color: "#6b7280", fontWeight: 700, textTransform: "uppercase" }}>Số Điện Thoại</div>
                      <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "#121316" }}>
                        {u.phone || "Chưa cập nhật"}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: "0.72rem", color: "#6b7280", fontWeight: 700, textTransform: "uppercase" }}>Email</div>
                      <div style={{ fontSize: "0.92rem", color: "#374151" }}>
                        {u.email || "Chưa cập nhật"}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: "0.72rem", color: "#6b7280", fontWeight: 700, textTransform: "uppercase" }}>Chức vụ</div>
                      <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "#ef4444" }}>
                        {u.position || "Chuyên viên thống kê báo cáo"}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", paddingTop: "0.5rem" }}>
                    <button
                      onClick={(e) => openEditModal(u, e)}
                      className="btn-neon-blue"
                      style={{ padding: "0.5rem 1rem", fontSize: "0.8rem" }}
                    >
                      Sửa Quyền & Mật Khẩu
                    </button>
                    <button
                      onClick={(e) => handleAdminDeleteUser(u.id, u.username, e)}
                      className="btn-neon-red"
                      style={{ padding: "0.5rem 1rem", fontSize: "0.8rem" }}
                    >
                      Xóa Tài Khoản
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal Dialog: Add / Edit User for Admin */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "1.5rem",
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "20px",
              maxWidth: "540px",
              width: "100%",
              padding: "2.25rem 2rem",
              boxShadow: "0 20px 30px rgba(0, 0, 0, 0.15)",
              border: "1px solid rgba(0,0,0,0.08)",
            }}
          >
            <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#121316", marginBottom: "1.25rem" }}>
              {editingUser ? `Chỉnh sửa Tài khoản: ${editingUser.username}` : "Tạo Tài Khoản Chuyên Viên / Cán Bộ Mới"}
            </h2>

            {adminFormError && (
              <div style={{ backgroundColor: "#fef2f2", color: "#dc2626", padding: "0.65rem", borderRadius: 8, fontSize: "0.82rem", marginBottom: "1rem" }}>
                {adminFormError}
              </div>
            )}

            <form onSubmit={handleAdminSaveUser}>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.35rem" }}>Họ và tên cán bộ *</label>
                <input
                  type="text"
                  value={adminFullName}
                  onChange={(e) => setAdminFullName(e.target.value)}
                  required
                  style={{ width: "100%", padding: "0.7rem 0.85rem", borderRadius: "10px", border: "1px solid #d1d5db", fontSize: "0.9rem" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem", marginBottom: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.35rem" }}>Username *</label>
                  <input
                    type="text"
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    disabled={!!editingUser}
                    required
                    style={{ width: "100%", padding: "0.7rem 0.85rem", borderRadius: "10px", border: "1px solid #d1d5db", fontSize: "0.9rem", backgroundColor: editingUser ? "#f3f4f6" : "#fff" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.35rem" }}>Số CCCD *</label>
                  <input
                    type="text"
                    value={adminCccd}
                    onChange={(e) => setAdminCccd(e.target.value)}
                    required
                    style={{ width: "100%", padding: "0.7rem 0.85rem", borderRadius: "10px", border: "1px solid #d1d5db", fontSize: "0.9rem", fontFamily: "ui-monospace, monospace" }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.35rem" }}>Chức vụ công tác</label>
                <input
                  type="text"
                  value={adminPosition}
                  onChange={(e) => setAdminPosition(e.target.value)}
                  placeholder="Chuyên viên thống kê báo cáo"
                  style={{ width: "100%", padding: "0.7rem 0.85rem", borderRadius: "10px", border: "1px solid #d1d5db", fontSize: "0.9rem" }}
                />
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.35rem" }}>{editingUser ? "Mật khẩu mới (bỏ trống để giữ nguyên)" : "Mật khẩu *"}</label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  required={!editingUser}
                  style={{ width: "100%", padding: "0.7rem 0.85rem", borderRadius: "10px", border: "1px solid #d1d5db", fontSize: "0.9rem" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem", marginBottom: "1.5rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.35rem" }}>Vai trò *</label>
                  <select
                    value={adminRole}
                    onChange={(e) => setAdminRole(e.target.value)}
                    style={{ width: "100%", padding: "0.7rem 0.85rem", borderRadius: "10px", border: "1px solid #d1d5db", fontSize: "0.9rem", backgroundColor: "#fff" }}
                  >
                    <option value="CHUYEN_VIEN">Chuyên viên xử lý</option>
                    <option value="ADMIN">Quản trị viên (Admin)</option>
                    <option value="CAN_BO">Cán bộ Phường</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.35rem" }}>Đơn vị công tác</label>
                  <input
                    type="text"
                    value={adminDept}
                    onChange={(e) => setAdminDept(e.target.value)}
                    style={{ width: "100%", padding: "0.7rem 0.85rem", borderRadius: "10px", border: "1px solid #d1d5db", fontSize: "0.9rem" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: "0.65rem 1.2rem", borderRadius: "10px", border: "1px solid #d1d5db", backgroundColor: "#fff", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}>
                  Hủy
                </button>
                <button type="submit" disabled={adminSaving} className="btn-neon-blue" style={{ padding: "0.65rem 1.4rem" }}>
                  {adminSaving ? "Đang lưu..." : editingUser ? "Lưu thay đổi" : "Tạo Tài Khoản"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
