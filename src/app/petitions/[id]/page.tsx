import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { updatePetitionResolution } from "./actions";
import FileUpload from "@/components/FileUpload";
import { getSession } from "@/lib/auth";
import { extractCommitteeFromNotes } from "@/lib/petitionUtils";
import {
  CATEGORIES,
  SOURCES,
  DEPARTMENTS,
  AUTHORITIES,
  RESPONSIBLE_COMMITTEES,
  STATUSES,
  REVIEW_STATUSES,
} from "@/lib/constants";

export const revalidate = 0;

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PetitionDetailPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const isReadOnly = session.role === "CAN_BO";
  const { id } = await params;

  const petition = await prisma.petition.findUnique({
    where: { id },
    select: {
      id: true,
      petitionCode: true,
      source: true,
      quarter: true,
      senderName: true,
      senderAddress: true,
      senderPhone: true,
      category: true,
      location: true,
      content: true,
      authority: true,
      department: true,
      receivedDate: true,
      deadline: true,
      extendedUntil: true,
      status: true,
      replyDocNumber: true,
      replyDocDate: true,
      reviewStatus: true,
      notes: true,
      attachmentUrl: true,
      replyDocLink: true,
    },
  });

  if (!petition) {
    notFound();
  }

  const safeAttachmentUrl = petition.attachmentUrl?.startsWith("data:")
    ? `/api/petitions/${petition.id}/document?field=attachmentUrl`
    : petition.attachmentUrl;

  const safeReplyDocLink = petition.replyDocLink?.startsWith("data:")
    ? `/api/petitions/${petition.id}/document?field=replyDocLink`
    : petition.replyDocLink;

  const toInputDateFormat = (date: Date | null) => {
    if (!date) return "";
    return date.toISOString().split("T")[0];
  };

  const updatePetitionWithId = updatePetitionResolution.bind(null, id);

  const currentCategory = petition.category || CATEGORIES[0];
  const allCategories = CATEGORIES.includes(currentCategory)
    ? CATEGORIES
    : [currentCategory, ...CATEGORIES];

  const currentSource = petition.source || SOURCES[0];
  const allSources = SOURCES.includes(currentSource)
    ? SOURCES
    : [currentSource, ...SOURCES];

  const currentDept = petition.department || DEPARTMENTS[0];
  const allDepartments = DEPARTMENTS.includes(currentDept)
    ? DEPARTMENTS
    : [currentDept, ...DEPARTMENTS];

  const currentAuthority = petition.authority || AUTHORITIES[0];
  const allAuthorities = AUTHORITIES.includes(currentAuthority)
    ? AUTHORITIES
    : [currentAuthority, ...AUTHORITIES];

  const { committee, cleanNotes } = extractCommitteeFromNotes(petition.notes);
  const currentCommittee = committee || RESPONSIBLE_COMMITTEES[0];

  return (
    <div className="page-content">
      <Link href="/petitions" className="back-link">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Quay lại sổ theo dõi
      </Link>

      <div className="page-header">
        <div>
          <h1 className="page-title">Hồ sơ vụ việc {petition.petitionCode}</h1>
          <p className="page-subtitle">
            {isReadOnly
              ? "Chế độ xem thông tin hồ sơ dành cho Lãnh đạo phường"
              : session.role === "CHUYEN_VIEN"
              ? "Cập nhật nội dung xử lý và trình Quản trị viên phê duyệt kết quả"
              : "Cập nhật và phê duyệt kết quả giải quyết kiến nghị"}
          </p>
        </div>
      </div>

      <form action={updatePetitionWithId}>
        <div className="grid-layout-details">
          {/* Vùng trái: Thông tin tiếp nhận */}
          <section style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 800 }}>Thông tin tiếp nhận kiến nghị</h2>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label">Họ tên người gửi</label>
                <input
                  type="text"
                  name="senderName"
                  defaultValue={petition.senderName}
                  className="form-control"
                  disabled={isReadOnly}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Số điện thoại</label>
                <input
                  type="text"
                  name="senderPhone"
                  defaultValue={petition.senderPhone || ""}
                  className="form-control tabular-nums"
                  disabled={isReadOnly}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Địa chỉ liên hệ</label>
              <input
                type="text"
                name="senderAddress"
                defaultValue={petition.senderAddress}
                className="form-control"
                disabled={isReadOnly}
                required
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label">Nguồn tiếp nhận</label>
                <select
                  name="source"
                  defaultValue={currentSource}
                  className="form-control"
                  disabled={isReadOnly}
                  required
                >
                  {allSources.map((src) => (
                    <option key={src} value={src}>
                      {src}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Khu phố</label>
                <select
                  name="quarter"
                  defaultValue={petition.quarter || "Khu phố 01"}
                  className="form-control"
                  disabled={isReadOnly}
                  required
                >
                  {Array.from({ length: 30 }, (_, i) => {
                    const kp = `Khu phố ${(i + 1).toString().padStart(2, "0")}`;
                    return (
                      <option key={kp} value={kp}>
                        {kp}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Lĩnh vực phản ánh</label>
              <select
                name="category"
                defaultValue={currentCategory}
                className="form-control"
                disabled={isReadOnly}
                required
              >
                {allCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label">Thẩm quyền xử lý</label>
                <select
                  name="authority"
                  defaultValue={currentAuthority}
                  className="form-control"
                  disabled={isReadOnly}
                  required
                >
                  {allAuthorities.map((auth) => (
                    <option key={auth} value={auth}>
                      {auth}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Ban HĐND phụ trách</label>
                <select
                  name="responsibleCommittee"
                  defaultValue={currentCommittee}
                  className="form-control"
                  disabled={isReadOnly}
                  required
                >
                  {RESPONSIBLE_COMMITTEES.map((comm) => (
                    <option key={comm} value={comm}>
                      {comm}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Đơn vị xử lý trực tiếp</label>
              <select
                name="department"
                defaultValue={currentDept}
                className="form-control"
                disabled={isReadOnly}
                required
              >
                {allDepartments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Địa bàn phản ánh (GPS)</label>
              <input
                type="text"
                name="location"
                defaultValue={petition.location}
                className="form-control"
                disabled={isReadOnly}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Nội dung kiến nghị</label>
              <textarea
                name="content"
                defaultValue={petition.content}
                rows={4}
                className="form-control form-textarea"
                disabled={isReadOnly}
                required
              />
            </div>

            <FileUpload
              name="attachmentUrl"
              defaultValue={safeAttachmentUrl}
              label="Tài liệu đính kèm ban đầu"
              disabled={isReadOnly}
            />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label">Ngày tiếp nhận</label>
                <input
                  type="date"
                  name="receivedDate"
                  defaultValue={toInputDateFormat(petition.receivedDate)}
                  className="form-control tabular-nums"
                  disabled={isReadOnly}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Hạn giải quyết</label>
                <input
                  type="date"
                  name="deadline"
                  defaultValue={toInputDateFormat(petition.deadline)}
                  className="form-control tabular-nums"
                  disabled={isReadOnly}
                  required
                />
              </div>
            </div>
          </section>

          {/* Vùng phải: Kết quả giải quyết & rà soát */}
          <section style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 800 }}>Kết quả giải quyết & ý kiến rà soát</h2>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label">Trạng thái xử lý</label>
                <select
                  name="status"
                  defaultValue={petition.status}
                  className="form-control"
                  disabled={isReadOnly}
                  required
                >
                  {STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {session.role === "CHUYEN_VIEN" && st === "Đã xong"
                        ? "Hoàn tất (Trình Admin duyệt)"
                        : st}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Kết quả rà soát</label>
                <select
                  name="reviewStatus"
                  defaultValue={petition.reviewStatus}
                  className="form-control"
                  disabled={isReadOnly}
                  required
                >
                  {REVIEW_STATUSES.map((rv) => (
                    <option key={rv} value={rv}>
                      {rv}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label">Gia hạn giải quyết (nếu có)</label>
                <input
                  type="date"
                  name="extendedUntil"
                  defaultValue={toInputDateFormat(petition.extendedUntil)}
                  className="form-control tabular-nums"
                  disabled={isReadOnly}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Ngày ban hành văn bản trả lời</label>
                <input
                  type="date"
                  name="replyDocDate"
                  defaultValue={toInputDateFormat(petition.replyDocDate)}
                  className="form-control tabular-nums"
                  disabled={isReadOnly}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Số hiệu văn bản trả lời</label>
              <input
                type="text"
                name="replyDocNumber"
                defaultValue={petition.replyDocNumber || ""}
                placeholder="Ví dụ: Số 12/UBND-VHXH"
                className="form-control"
                disabled={isReadOnly}
              />
            </div>

            <FileUpload
              name="replyDocLink"
              defaultValue={safeReplyDocLink}
              label="Văn bản kết quả trả lời"
              disabled={isReadOnly}
            />

            <div className="form-group">
              <label className="form-label">Ghi chú rà soát & tiến độ</label>
              <textarea
                name="notes"
                defaultValue={cleanNotes}
                placeholder="Ghi chú tiến độ xử lý hoặc ý kiến rà soát của Ban HĐND..."
                className="form-control form-textarea"
                rows={5}
                disabled={isReadOnly}
              />
            </div>

            <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
              {isReadOnly ? (
                <Link href="/petitions" className="btn-secondary">
                  Quay lại danh sách
                </Link>
              ) : (
                <>
                  <Link href="/petitions" className="btn-secondary">
                    Hủy
                  </Link>
                  <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                    {session.role === "CHUYEN_VIEN" ? "Lưu & cập nhật hồ sơ" : "Lưu kết quả & phê duyệt"}
                  </button>
                </>
              )}
            </div>
          </section>
        </div>
      </form>
    </div>
  );
}
