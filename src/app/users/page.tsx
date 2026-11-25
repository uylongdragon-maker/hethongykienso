"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import FileUpload from "@/components/FileUpload";
import { DEPARTMENTS } from "@/lib/constants";
import { getRoleDisplayName } from "@/lib/petitionUtils";

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

  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);

  const [reqFullName, setReqFullName] = useState("");
  const [reqCccd, setReqCccd] = useState("");
  const [reqPosition, setReqPosition] = useState("");

  const [profileSaving, setProfileSaving] = useState(false);
  const [requestSaving, setRequestSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminFullName, setAdminFullName] = useState("");
  const [adminCccd, setAdminCccd] = useState("");
  const [adminRole, setAdminRole] = useState("CHUYEN_VIEN");
  const [adminDept, setAdminDept] = useState(DEPARTMENTS[0]);
  const [adminPosition, setAdminPosition] = useState("Chuyên viên thống kê báo cáo");
  const [adminSaving, setAdminSaving] = useState(false);
  const [adminFormError, setAdminFormError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
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
          if (data.data.length > 0) {
            setExpandedId((prev) => prev || data.data[0].id);
          }
        }
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  const handleChangeOwnPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdSaving(true);
    setMsg(null);

    try {
      const res = await fetch("/api/users/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ text: data.error || "Không thể đổi mật khẩu.", type: "error" });
      } else {
        setMsg({ text: data.message, type: "success" });
        setCurrentPassword("");
        setNewPassword("");
      }
    } catch {
      setMsg({ text: "Lỗi kết nối máy chủ.", type: "error" });
    } finally {
      setPwdSaving(false);
    }
  };

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
        loadData();
      }
    } catch {
      alert("Lỗi kết nối máy chủ.");
    }
  };

  const handleAdminSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminSaving(true);
    setAdminFormError(null);

    try {
      const endpoint = editingUser ? `/api/users/${editingUser.id}` : "/api/users";
      const method = editingUser ? "PUT" : "POST";
      const payload = editingUser
        ? {
            fullName: adminFullName,
            cccd: adminCccd,
            role: adminRole,
            department: adminDept,
            position: adminPosition,
            ...(adminPassword ? { password: adminPassword } : {}),
          }
        : {
            username: adminUsername,
            password: adminPassword,
            fullName: adminFullName,
            cccd: adminCccd,
            role: adminRole,
            department: adminDept,
            position: adminPosition,
          };

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setAdminFormError(data.error || "Không thể lưu tài khoản.");
      } else {
        setShowModal(false);
        loadData();
        router.refresh();
      }
    } catch {
      setAdminFormError("Lỗi kết nối.");
    } finally {
      setAdminSaving(false);
    }
  };

  const handleAdminDeleteUser = async (userId: string, targetUsername: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Xác nhận xóa tài khoản "${targetUsername}"?`)) return;
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
    setAdminDept(DEPARTMENTS[0]);
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
    setAdminDept(u.department || DEPARTMENTS[0]);
    setAdminPosition(u.position || "Chuyên viên thống kê báo cáo");
    setAdminFormError(null);
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className="page-content" style={{ color: "var(--text-secondary)", fontWeight: 600 }}>
        Đang tải thông tin tài khoản...
      </div>
    );
  }

  const pendingRequestsList = users.filter((u) => u.changeRequestStatus === "PENDING");

  /* ═══════════════════════════════════════════════════
     1. HỒ SƠ CÁ NHÂN (CHUYÊN VIÊN & LÃNH ĐẠO)
     ═══════════════════════════════════════════════════ */
  if (currentUser && currentUser.role !== "ADMIN") {
    return (
      <div className="page-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Hồ sơ tài khoản cá nhân</h1>
            <p className="page-subtitle">
              {currentUser.fullName} ({getRoleDisplayName(currentUser.role)})
            </p>
          </div>
        </div>

        {msg && (
          <div
            style={{
              backgroundColor: msg.type === "success" ? "var(--success-bg)" : "var(--danger-bg)",
              color: msg.type === "success" ? "var(--success)" : "var(--danger)",
              padding: "0.8rem 1rem",
              borderRadius: "var(--radius-md)",
              fontSize: "0.86rem",
              fontWeight: 700,
              marginBottom: "2rem",
            }}
          >
            {msg.text}
          </div>
        )}

        {/* Thông tin định danh hiện tại */}
        <section
          style={{
            display: "flex",
            gap: "2rem",
            alignItems: "center",
            flexWrap: "wrap",
            marginBottom: "3rem",
          }}
        >
          <div
            style={{
              width: "108px",
              height: "144px",
              borderRadius: "var(--radius-md)",
              overflow: "hidden",
              backgroundColor: "var(--bg-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {currentUser.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.fullName}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <span style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--text-secondary)" }}>
                {currentUser.fullName.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "1.25rem", flex: 1 }}>
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700 }}>Chức vụ</div>
              <div style={{ fontSize: "0.95rem", fontWeight: 700 }}>{currentUser.position || "Chuyên viên"}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700 }}>Tên đăng nhập</div>
              <div style={{ fontSize: "0.95rem", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                {currentUser.username}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700 }}>Số CCCD</div>
              <div className="tabular-nums" style={{ fontSize: "0.95rem", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                {currentUser.cccd || "Chưa cập nhật"}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700 }}>Đơn vị công tác</div>
              <div style={{ fontSize: "0.95rem", fontWeight: 700 }}>
                {currentUser.department || "Phường Bình Đông"}
              </div>
            </div>
          </div>
        </section>

        <div className="grid-layout-details" style={{ marginBottom: "3rem" }}>
          {/* Thông tin liên hệ & Ảnh thẻ */}
          <section>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 800, marginBottom: "1.15rem" }}>
              Thông tin liên hệ & ảnh thẻ
            </h2>
            <form onSubmit={handleSaveDirectProfile} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label">Số điện thoại di động</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="form-control tabular-nums"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email công vụ</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-control"
                />
              </div>

              <FileUpload
                value={avatarUrl}
                onChange={setAvatarUrl}
                label="Ảnh thẻ 3x4"
                placeholder="Dán liên kết ảnh thẻ..."
              />

              <div>
                <button type="submit" disabled={profileSaving} className="btn-primary">
                  {profileSaving ? "Đang lưu..." : "Lưu thông tin liên hệ"}
                </button>
              </div>
            </form>
          </section>

          {/* Đổi mật khẩu cá nhân */}
          <section>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 800, marginBottom: "1.15rem" }}>
              Đổi mật khẩu đăng nhập
            </h2>
            <form onSubmit={handleChangeOwnPassword} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label">Mật khẩu hiện tại</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mật khẩu mới (ít nhất 6 ký tự)</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="form-control"
                />
              </div>

              <div>
                <button type="submit" disabled={pwdSaving} className="btn-primary">
                  {pwdSaving ? "Đang cập nhật..." : "Đổi mật khẩu"}
                </button>
              </div>
            </form>
          </section>
        </div>

        {/* Yêu cầu thay đổi thông tin định danh */}
        <section>
          <h2 style={{ fontSize: "1.15rem", fontWeight: 800, marginBottom: "0.5rem" }}>
            Đề xuất điều chỉnh thông tin định danh
          </h2>
          <p style={{ fontSize: "0.86rem", color: "var(--text-secondary)", marginBottom: "1.25rem" }}>
            Thay đổi Họ tên, Số CCCD hoặc Chức vụ sẽ có hiệu lực sau khi Quản trị viên phê duyệt.
          </p>

          {currentUser.changeRequestStatus === "PENDING" && (
            <div
              style={{
                backgroundColor: "var(--warning-bg)",
                color: "var(--warning)",
                padding: "0.95rem 1.15rem",
                borderRadius: "var(--radius-md)",
                marginBottom: "1.25rem",
                fontSize: "0.85rem",
                fontWeight: 600,
              }}
            >
              Đang chờ phê duyệt: {currentUser.pendingFullName || currentUser.fullName} / CCCD:{" "}
              {currentUser.pendingCccd || currentUser.cccd} / Chức vụ:{" "}
              {currentUser.pendingPosition || currentUser.position}
            </div>
          )}

          <form onSubmit={handleSendChangeRequest}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
              <div className="form-group">
                <label className="form-label">Họ và tên đề xuất</label>
                <input
                  type="text"
                  required
                  value={reqFullName}
                  onChange={(e) => setReqFullName(e.target.value)}
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Số CCCD đề xuất</label>
                <input
                  type="text"
                  required
                  value={reqCccd}
                  onChange={(e) => setReqCccd(e.target.value)}
                  className="form-control tabular-nums"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Chức vụ đề xuất</label>
                <input
                  type="text"
                  required
                  value={reqPosition}
                  onChange={(e) => setReqPosition(e.target.value)}
                  className="form-control"
                />
              </div>
            </div>

            <button type="submit" disabled={requestSaving} className="btn-secondary">
              {requestSaving ? "Đang gửi..." : "Gửi yêu cầu phê duyệt"}
            </button>
          </form>
        </section>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════
     2. QUẢN LÝ TÀI KHOẢN & PHÊ DUYỆT (ADMIN)
     ═══════════════════════════════════════════════════ */
  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Quản lý tài khoản & phân quyền</h1>
          <p className="page-subtitle">
            Tổng số {users.length} tài khoản cán bộ, chuyên viên trên hệ thống
          </p>
        </div>

        <button type="button" onClick={openCreateModal} className="btn-accent">
          Tạo tài khoản mới
        </button>
      </div>

      {/* Danh sách chờ duyệt đổi thông tin */}
      {pendingRequestsList.length > 0 && (
        <section style={{ marginBottom: "2.75rem" }}>
          <h2 style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--warning)", marginBottom: "1rem" }}>
            Yêu cầu thay đổi thông tin chờ duyệt ({pendingRequestsList.length})
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            {pendingRequestsList.map((reqUser) => (
              <div
                key={reqUser.id}
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "var(--radius-lg)",
                  padding: "1.25rem 1.5rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "1rem",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                  <div style={{ fontWeight: 800, fontSize: "1rem" }}>
                    {reqUser.fullName} ({reqUser.username})
                  </div>
                  <div style={{ fontSize: "0.84rem", color: "var(--text-secondary)" }}>
                    Đề xuất đổi thành: <strong>{reqUser.pendingFullName || reqUser.fullName}</strong> | CCCD:{" "}
                    <strong>{reqUser.pendingCccd || reqUser.cccd}</strong> | Chức vụ:{" "}
                    <strong>{reqUser.pendingPosition || reqUser.position}</strong>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "0.55rem" }}>
                  <button
                    type="button"
                    onClick={() => handleAdminApproveChange(reqUser.id, "APPROVE")}
                    className="btn-primary"
                    style={{ padding: "0.45rem 0.95rem", fontSize: "0.8rem" }}
                  >
                    Phê duyệt
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdminApproveChange(reqUser.id, "REJECT")}
                    className="btn-danger-tonal"
                    style={{ padding: "0.45rem 0.95rem", fontSize: "0.8rem" }}
                  >
                    Từ chối
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Bảng danh sách toàn bộ tài khoản */}
      <div className="table-container" style={{ backgroundColor: "#ffffff", borderRadius: "var(--radius-lg)" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Họ và tên</th>
              <th>Tên đăng nhập</th>
              <th>Chức vụ & đơn vị</th>
              <th>Số CCCD</th>
              <th>Vai trò</th>
              <th style={{ textAlign: "right" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isSelf = currentUser?.id === u.id;
              return (
                <tr key={u.id} onClick={() => setExpandedId(expandedId === u.id ? null : u.id)} style={{ cursor: "pointer" }}>
                  <td style={{ fontWeight: 800 }}>
                    <div>{u.fullName}</div>
                    {u.email && <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500 }}>{u.email}</div>}
                  </td>
                  <td style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>{u.username}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{u.position || "Chuyên viên"}</div>
                    <div style={{ fontSize: "0.76rem", color: "var(--text-secondary)" }}>{u.department || ""}</div>
                  </td>
                  <td style={{ fontFamily: "var(--font-mono)" }}>{u.cccd || ""}</td>
                  <td>
                    <span
                      className={`status-text ${
                        u.role === "ADMIN"
                          ? "status-overdue"
                          : u.role === "CHUYEN_VIEN"
                          ? "status-pending-admin"
                          : "status-resolved"
                      }`}
                    >
                      {getRoleDisplayName(u.role)}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: "0.45rem" }}>
                      <button
                        type="button"
                        onClick={(e) => openEditModal(u, e)}
                        className="btn-secondary"
                        style={{ padding: "0.35rem 0.7rem", fontSize: "0.76rem" }}
                      >
                        Sửa
                      </button>
                      {!isSelf && (
                        <button
                          type="button"
                          onClick={(e) => handleAdminDeleteUser(u.id, u.username, e)}
                          className="btn-danger-tonal"
                          style={{ padding: "0.35rem 0.7rem", fontSize: "0.76rem" }}
                        >
                          Xóa
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal Thêm / Sửa Tài khoản */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: "540px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title">
                {editingUser ? `Cập nhật tài khoản ${editingUser.username}` : "Tạo tài khoản cán bộ mới"}
              </h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                &times;
              </button>
            </div>

            <div className="modal-body">
              {adminFormError && (
                <div
                  style={{
                    backgroundColor: "var(--danger-bg)",
                    color: "var(--danger)",
                    padding: "0.7rem 0.9rem",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    marginBottom: "1rem",
                  }}
                >
                  {adminFormError}
                </div>
              )}

              <form onSubmit={handleAdminSaveUser} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div className="form-group">
                  <label className="form-label">Họ và tên cán bộ *</label>
                  <input
                    type="text"
                    required
                    value={adminFullName}
                    onChange={(e) => setAdminFullName(e.target.value)}
                    className="form-control"
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
                  <div className="form-group">
                    <label className="form-label">Tên đăng nhập *</label>
                    <input
                      type="text"
                      required
                      disabled={!!editingUser}
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(e.target.value)}
                      className="form-control"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Số CCCD (9-12 chữ số) *</label>
                    <input
                      type="text"
                      required
                      value={adminCccd}
                      onChange={(e) => setAdminCccd(e.target.value)}
                      className="form-control tabular-nums"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Chức vụ công tác</label>
                  <input
                    type="text"
                    value={adminPosition}
                    onChange={(e) => setAdminPosition(e.target.value)}
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    {editingUser ? "Mật khẩu mới (để trống nếu giữ nguyên)" : "Mật khẩu khởi tạo (tối thiểu 6 ký tự) *"}
                  </label>
                  <input
                    type="password"
                    required={!editingUser}
                    minLength={6}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="form-control"
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
                  <div className="form-group">
                    <label className="form-label">Vai trò phân quyền *</label>
                    <select
                      value={adminRole}
                      onChange={(e) => setAdminRole(e.target.value)}
                      className="form-control"
                    >
                      <option value="CHUYEN_VIEN">Chuyên viên xử lý</option>
                      <option value="CAN_BO">Lãnh đạo phường (Chỉ xem)</option>
                      <option value="ADMIN">Quản trị viên (Admin)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Đơn vị công tác</label>
                    <select
                      value={adminDept}
                      onChange={(e) => setAdminDept(e.target.value)}
                      className="form-control"
                    >
                      {!DEPARTMENTS.includes(adminDept) && adminDept && (
                        <option value={adminDept}>{adminDept}</option>
                      )}
                      {DEPARTMENTS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.65rem", marginTop: "0.5rem" }}>
                  <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                    Hủy
                  </button>
                  <button type="submit" disabled={adminSaving} className="btn-primary">
                    {adminSaving ? "Đang lưu..." : editingUser ? "Lưu thay đổi" : "Tạo tài khoản"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
