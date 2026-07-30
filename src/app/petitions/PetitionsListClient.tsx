"use client";

import { useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import PetitionForm from "@/components/PetitionForm";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

interface SerializedPetition {
  id: string;
  petitionCode: string;
  source: string;
  quarter: string | null;
  senderName: string;
  senderAddress: string;
  senderPhone: string | null;
  category: string;
  location: string;
  content: string;
  attachmentUrl: string | null;
  authority: string;
  department: string;
  receivedDate: string;
  deadline: string;
  extendedUntil: string | null;
  status: string;
  replyDocNumber: string | null;
  replyDocDate: string | null;
  replyDocLink: string | null;
  reviewStatus: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PetitionsListClientProps {
  initialPetitions: SerializedPetition[];
}

export default function PetitionsListClient({ initialPetitions }: PetitionsListClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [quarterFilter, setQuarterFilter] = useState("ALL");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  
  // Trạng thái mở modal tạo mới
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Đánh giá quá hạn
  const isOverdue = (pet: SerializedPetition) => {
    return pet.status === "Quá hạn" || (pet.status !== "Đã xong" && new Date(pet.deadline) < new Date());
  };

  const departments = useMemo(() => {
    const set = new Set<string>();
    initialPetitions.forEach((p) => {
      if (p.department) set.add(p.department);
    });
    return Array.from(set);
  }, [initialPetitions]);

  const sources = useMemo(() => {
    const set = new Set<string>();
    initialPetitions.forEach((p) => {
      if (p.source) set.add(p.source);
    });
    return Array.from(set);
  }, [initialPetitions]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    initialPetitions.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [initialPetitions]);

  const filteredPetitions = useMemo(() => {
    return initialPetitions.filter((p) => {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        p.petitionCode.toLowerCase().includes(searchLower) ||
        p.senderName.toLowerCase().includes(searchLower) ||
        p.senderAddress.toLowerCase().includes(searchLower) ||
        p.content.toLowerCase().includes(searchLower) ||
        p.location.toLowerCase().includes(searchLower);

      let matchesStatus = true;
      if (statusFilter !== "ALL") {
        if (statusFilter === "OVERDUE") {
          matchesStatus = isOverdue(p);
        } else {
          matchesStatus = p.status === statusFilter;
        }
      }

      const matchesQuarter = quarterFilter === "ALL" || p.quarter === quarterFilter;
      const matchesDepartment = departmentFilter === "ALL" || p.department === departmentFilter;
      const matchesSource = sourceFilter === "ALL" || p.source === sourceFilter;
      const matchesCategory = categoryFilter === "ALL" || p.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesQuarter && matchesDepartment && matchesSource && matchesCategory;
    });
  }, [initialPetitions, search, statusFilter, quarterFilter, departmentFilter, sourceFilter, categoryFilter]);

  useGSAP(() => {
    // Hoạt ảnh xuất hiện mượt mà từng hàng (Staggered entry) của bảng
    gsap.from(".data-table tbody tr", {
      opacity: 0,
      y: 12,
      duration: 0.35,
      stagger: 0.02,
      ease: "power2.out",
      clearProps: "all"
    });
  }, {
    dependencies: [filteredPetitions],
    scope: containerRef,
    revertOnUpdate: true
  });

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const handleExportReminder = (pet: SerializedPetition) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const today = new Date();
    const dayStr = today.getDate().toString().padStart(2, "0");
    const monthStr = (today.getMonth() + 1).toString().padStart(2, "0");
    const yearStr = today.getFullYear();

    const categoryName = pet.category === "Quản lý đô thị" ? "Đô thị" : pet.category === "Chế độ chính sách" ? "Chính sách" : pet.category;
    const locationName = pet.quarter || pet.location;

    const htmlContent = `
      <html>
        <head>
          <title>Công văn đôn đốc - ${pet.petitionCode}</title>
          <style>
            @media print {
              body { margin: 1.5cm; font-size: 13pt; }
              .no-print { display: none; }
            }
            body {
              font-family: "Times New Roman", Times, serif;
              line-height: 1.5;
              color: #000;
              margin: 2cm;
              font-size: 13pt;
            }
            .header-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 1.5rem;
            }
            .header-table td {
              vertical-align: top;
              text-align: center;
              padding: 0;
            }
            .header-left {
              width: 45%;
            }
            .header-right {
              width: 55%;
            }
            .title-org {
              font-size: 11pt;
              font-weight: bold;
            }
            .title-suborg {
              font-size: 11pt;
              font-weight: bold;
              text-decoration: underline;
            }
            .title-nation {
              font-size: 11pt;
              font-weight: bold;
            }
            .title-motto {
              font-size: 11pt;
              font-weight: bold;
              text-decoration: underline;
            }
            .doc-number {
              margin-top: 0.5rem;
              font-size: 11pt;
            }
            .doc-date {
              margin-top: 0.5rem;
              font-style: italic;
              font-size: 11pt;
              text-align: right;
            }
            .doc-title {
              text-align: center;
              font-weight: bold;
              margin-top: 2rem;
              margin-bottom: 1.5rem;
            }
            .recipient {
              text-align: center;
              font-weight: bold;
              margin-bottom: 1.5rem;
            }
            .content-section {
              text-align: justify;
              margin-bottom: 1rem;
              text-indent: 1.5cm;
            }
            .content-section p {
              margin: 0.5rem 0;
              text-indent: 1.5cm;
            }
            .bullet-list {
              margin-left: 1.5cm;
              text-align: justify;
            }
            .bullet-item {
              margin: 0.5rem 0;
            }
            .signature-table {
              width: 100%;
              margin-top: 2rem;
              border-collapse: collapse;
            }
            .signature-table td {
              vertical-align: top;
              padding: 0;
            }
            .signature-left {
              width: 40%;
              font-size: 11pt;
              text-align: left;
            }
            .signature-right {
              width: 60%;
              text-align: center;
            }
            .btn-print-box {
              position: fixed;
              top: 20px;
              right: 20px;
              background: #000;
              color: #fff;
              padding: 10px 20px;
              border-radius: 4px;
              cursor: pointer;
              font-weight: bold;
              border: none;
              font-family: sans-serif;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
          </style>
        </head>
        <body>
          <button class="no-print btn-print-box" onclick="window.print()">In công văn / Lưu PDF</button>
          
          <table class="header-table">
            <tr>
              <td class="header-left">
                <div class="title-org">HỘI ĐỒNG NHÂN DÂN PHƯỜNG BÌNH ĐÔNG</div>
                <div class="title-suborg">THƯỜNG TRỰC HỘI ĐỒNG NHÂN DÂN</div>
                <div class="doc-number">Số: &nbsp; &nbsp; &nbsp; &nbsp; /HĐND- ĐĐ</div>
                <div style="font-size: 9pt; margin-top: 0.35rem;">V/v đôn đốc giải quyết kiến nghị cử tri</div>
              </td>
              <td class="header-right">
                <div class="title-nation">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                <div class="title-suborg" style="font-weight: bold;">Độc lập - Tự do - Hạnh phúc</div>
                <div class="doc-date">Bình Đông, ngày ${dayStr} tháng ${monthStr} năm ${yearStr}</div>
              </td>
            </tr>
          </table>

          <div class="doc-title" style="font-size: 14pt;">
            CÔNG VĂN ĐÔN ĐỐC<br/>
            <span style="font-size: 11pt; font-weight: normal; font-style: italic;">
              Về việc đôn đốc giải quyết kiến nghị cử tri trước/sau Kỳ họp, nhiệm kỳ 2026 - 2031 (lần 1)
            </span>
          </div>

          <div class="recipient">
            Kính gửi: Ủy ban nhân dân phường Bình Đông
          </div>

          <div class="content-section">
            Thực hiện chức năng giám sát theo quy định của Luật Tổ chức chính quyền địa phương và căn cứ vào dữ liệu theo dõi trên Hệ thống quản lý kiến nghị cử tri của HĐND phường.
          </div>

          <div class="content-section">
            Qua rà soát thực tế tiến độ giải quyết các kiến nghị của cử tri trước, sau Kỳ họp và việc thực hiện các thông báo kết luận sau giám sát, khảo sát của Thường trực HĐND phường, tính đến ngày ${dayStr}/${monthStr}/${yearStr}, Thường trực HĐND phường nhận thấy:
          </div>

          <div class="content-section">
            1. Về tiến độ giải quyết kiến nghị cử tri: Theo dữ liệu hệ thống, hiện vụ việc mã số <strong>${pet.petitionCode}</strong> gửi ngày ${new Date(pet.receivedDate).toLocaleDateString("vi-VN")} đã quá thời hạn giải quyết theo quy định nhưng chưa có báo cáo kết quả hoặc văn bản phản hồi chính thức từ UBND phường.
          </div>

          <div class="content-section">
            2. Về thực hiện kết luận giám sát, khảo sát: Nội dung kiến nghị về lĩnh vực <strong>${categoryName}</strong> tại khu vực <strong>${locationName}</strong> với nội dung: <em>"${pet.content}"</em> vẫn chưa được triển khai dứt điểm, gây ảnh hưởng đến quyền lợi chính đáng của cử tri và uy tín của cơ quan nhà nước tại địa bàn phường.
          </div>

          <div class="content-section">
            Để đảm bảo tính nghiêm minh trong công tác giải quyết kiến nghị và thực hiện đúng lộ trình chuyển đổi số của phường, Thường trực HĐND phường đề nghị UBND phường:
          </div>

          <div class="bullet-list">
            <div class="bullet-item">- Tập trung chỉ đạo các bộ phận chuyên môn rà soát, xác định rõ nguyên nhân, trách nhiệm của cá nhân, đơn vị trong việc chậm trễ đối với nội dung nêu trên.</div>
            <div class="bullet-item">- Khẩn trương cập nhật tiến độ, kết quả xử lý và đính kèm văn bản trả lời lên Hệ thống quản lý số của HĐND trước ngày ${new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString("vi-VN")} để Thường trực HĐND tổng hợp, thông tin đến cử tri.</div>
            <div class="bullet-item">- Đối với các kiến nghị có vướng mắc khách quan hoặc vượt thẩm quyền, yêu cầu có báo cáo bằng văn bản nêu rõ lộ trình và phương hướng kiến nghị cấp trên để Thường trực HĐND có cơ sở giám sát tiếp theo.</div>
          </div>

          <div class="content-section" style="margin-top: 1rem;">
            Thường trực HĐND phường đề nghị UBND phường nghiêm túc triển khai thực hiện và phản hồi đúng thời hạn quy định./.
          </div>

          <table class="signature-table">
            <tr>
              <td class="signature-left">
                <strong>Nơi nhận:</strong><br/>
                - Như trên;<br/>
                - Đảng ủy phường (để báo cáo);<br/>
                - Đại biểu HĐND phường (để biết);<br/>
                - Lưu: VT.
              </td>
              <td class="signature-right">
                <strong>TM. THƯỜNG TRỰC HĐND</strong><br/>
                <strong>KT. CHỦ TỊCH</strong><br/>
                <strong>PHÓ CHỦ TỊCH</strong>
                <br/><br/><br/><br/>
                <strong style="font-size: 12pt;">(Ký tên, đóng dấu)</strong>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const getStatusBadge = (pet: SerializedPetition) => {
    const overdue = isOverdue(pet);
    if (overdue) {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", alignItems: "center" }}>
          <span className="badge badge-overdue">Quá hạn</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleExportReminder(pet);
            }}
            className="btn-neon-blue"
            style={{
              padding: "0.2rem 0.4rem",
              fontSize: "0.7rem",
              lineHeight: "1.1",
              backgroundColor: "rgba(225, 29, 72, 0.08)",
              color: "var(--danger)",
              borderColor: "rgba(225, 29, 72, 0.2)",
              borderRadius: "4px",
              cursor: "pointer",
              whiteSpace: "nowrap"
            }}
            title="Xuất công văn nhắc nhở"
          >
            Công văn đôn đốc
          </button>
        </div>
      );
    }
    switch (pet.status) {
      case "Đã xong":
        return <span className="badge badge-resolved">Đã xong</span>;
      case "Đang xử lý":
        return <span className="badge badge-in-progress">Đang xử lý</span>;
      case "Chờ Admin phê duyệt":
        return <span className="badge badge-new" style={{ color: "var(--info)", backgroundColor: "var(--info-bg)" }}>Chờ Admin phê duyệt</span>;
      default:
        return <span className="badge">{pet.status}</span>;
    }
  };

  const handleExportCSV = () => {
    let csv = "STT,Mã vụ việc,Nguồn tiếp nhận,Thông tin người gửi - Họ tên,Thông tin người gửi - Địa chỉ liên hệ,Thông tin người gửi - Số điện thoại,Lĩnh vực,Địa chỉ nơi phản ánh (định vị tọa độ số GPS),Nội dung kiến nghị,Đơn vị xử lý trực tiếp thuộc cấp phường,Thẩm quyền xử lý - Phường,Thẩm quyền xử lý - Các Sở ban ngành Thành phố,Ngày tiếp nhận,Thời hạn giải quyết theo thẩm quyền,Thời hạn báo cáo tổng hợp kết quả giải quyết,Thời gian gia hạn (nếu có),Trạng thái xử lý,Văn bản trả lời (Link),Nội dung rà soát trả lời kiến nghị - Hoàn thành,Nội dung rà soát trả lời kiến nghị - Chưa giải quyết,Nội dung rà soát trả lời kiến nghị - Mới giải quyết 1 phần,Ghi chú\n";
    
    filteredPetitions.forEach((pet, index) => {
      const phone = pet.senderPhone || "";
      const extended = pet.extendedUntil ? formatDate(pet.extendedUntil) : "";
      
      const categoryDisplay = pet.category === "Quản lý đô thị" ? "Đô thị" : pet.category === "Chế độ chính sách" ? "Chính sách" : pet.category;

      const authPhuong = pet.authority === "UBND phường" ? "X" : "";
      const authSo = pet.authority !== "UBND phường" ? "X" : "";

      let replyLinkDisplay = "";
      if (pet.replyDocLink) {
        if (pet.replyDocNumber && pet.replyDocNumber.length > 15) {
          replyLinkDisplay = `[Link PDF] (${pet.replyDocLink})`;
        } else {
          replyLinkDisplay = `[${pet.replyDocNumber || "Văn bản"}] (${pet.replyDocLink})`;
        }
      } else {
        replyLinkDisplay = pet.replyDocNumber || "";
      }

      let reviewHoanThanh = "";
      let reviewChuaGiaiQuyet = "";
      let reviewMotPhan = "";

      if (pet.replyDocNumber && pet.replyDocNumber.length > 15) {
        if (pet.reviewStatus === "Hoàn thành") {
          reviewHoanThanh = pet.replyDocNumber;
        } else if (pet.reviewStatus === "Chưa giải quyết") {
          reviewChuaGiaiQuyet = pet.replyDocNumber;
        } else if (pet.reviewStatus === "Mới giải quyết 1 phần") {
          reviewMotPhan = pet.replyDocNumber;
        }
      }

      const notes = pet.notes || "";

      csv += `${index + 1},${pet.petitionCode},"${pet.source}","${pet.senderName}","${pet.senderAddress}","${phone}","${categoryDisplay}","${pet.location}","${pet.content.replace(/"/g, '""')}","${pet.department}","${authPhuong}","${authSo}","${formatDate(pet.receivedDate)}","${formatDate(pet.deadline)}","Ngày tổ chức kỳ họp trừ 30 ngày","${extended}","${pet.status}","${replyLinkDisplay.replace(/"/g, '""')}","${reviewHoanThanh.replace(/"/g, '""')}","${reviewChuaGiaiQuyet.replace(/"/g, '""')}","${reviewMotPhan.replace(/"/g, '""')}","${notes.replace(/"/g, '""')}"\n`;
    });

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `danh_sach_kien_nghi_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportOfficialLetter = () => {
    // Tạo nội dung công văn gửi các phòng ban dưới dạng CSV
    let csv = "STT,Mã vụ việc,Nội dung kiến nghị,Đơn vị xử lý trực tiếp,Thẩm quyền xử lý,Ngày tiếp nhận,Hạn giải quyết,Trạng thái,Ghi chú yêu cầu\n";
    const pending = filteredPetitions.filter((p) => p.status !== "Đã xong");
    pending.forEach((pet, index) => {
      const notes = pet.notes || "";
      csv += `${index + 1},${pet.petitionCode},"${pet.content.replace(/"/g, '""')}","${pet.department}","${pet.authority}","${formatDate(pet.receivedDate)}","${formatDate(pet.deadline)}","${pet.status}","${notes}"\n`;
    });

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `cong_van_gui_phong_ban_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFormSuccess = () => {
    setIsCreateOpen(false);
    router.refresh();
  };

  // Cập nhật tiến độ nhanh (inline)
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [quickStatus, setQuickStatus] = useState("");
  const [quickNotes, setQuickNotes] = useState("");
  const [quickExtendedUntil, setQuickExtendedUntil] = useState("");
  const [quickReplyDocNumber, setQuickReplyDocNumber] = useState("");
  const [quickReplyDocLink, setQuickReplyDocLink] = useState("");
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickError, setQuickError] = useState<string | null>(null);

  const openQuickUpdate = (pet: SerializedPetition) => {
    setUpdatingId(pet.id);
    setQuickStatus(pet.status);
    setQuickNotes(pet.notes || "");
    setQuickExtendedUntil(pet.extendedUntil ? pet.extendedUntil.split("T")[0] : "");
    setQuickReplyDocNumber(pet.replyDocNumber || "");
    setQuickReplyDocLink(pet.replyDocLink || "");
    setQuickError(null);
  };

  const handleQuickUpdate = async () => {
    if (!updatingId) return;
    setQuickLoading(true);
    setQuickError(null);
    try {
      const res = await fetch(`/api/petitions/${updatingId}/quick-update`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: quickStatus,
          notes: quickNotes,
          extendedUntil: quickExtendedUntil || null,
          replyDocNumber: quickReplyDocNumber || null,
          replyDocLink: quickReplyDocLink || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Có lỗi xảy ra.");
      setUpdatingId(null);
      router.refresh();
    } catch (err: any) {
      setQuickError(err.message || "Không thể cập nhật.");
    } finally {
      setQuickLoading(false);
    }
  };

  return (
    <div ref={containerRef}>
      <div className="page-header" style={{ marginBottom: "2rem" }}>
        <div>
          <h1 className="page-title">Sổ theo dõi & Giám sát vụ việc</h1>
          <p className="page-subtitle">Sổ chi tiết theo dõi tiến độ giải quyết kiến nghị cử tri</p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button onClick={() => setIsCreateOpen(true)} className="btn-neon-blue" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
            Tiếp nhận kiến nghị
          </button>
          <button onClick={handleExportCSV} className="btn-neon-blue" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            Xuất CSV
          </button>
          <button onClick={handleExportOfficialLetter} className="btn-neon-blue" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", borderColor: "var(--info)", color: "var(--info)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            Công văn gửi các phòng ban
          </button>
          <button onClick={() => window.print()} className="btn-neon-blue" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            In báo cáo
          </button>
        </div>
      </div>

      <div className="glass-card" style={{ padding: "1.5rem" }}>
        {/* Thanh tìm kiếm và bộ lọc */}
        <div className="filter-bar" style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
          <div className="search-input-wrapper" style={{ flexGrow: 1, minWidth: "250px" }}>
            <input
              type="text"
              placeholder="Tìm kiếm mã, người gửi, nội dung..."
              className="form-control"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div style={{ minWidth: "150px" }}>
            <select
              className="form-control"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="Đang xử lý">Đang xử lý</option>
              <option value="Đã xong">Đã xong</option>
              <option value="Chờ Admin phê duyệt">Chờ Admin phê duyệt</option>
              <option value="OVERDUE">Quá hạn</option>
            </select>
          </div>

          <div style={{ minWidth: "150px" }}>
            <select
              className="form-control"
              value={quarterFilter}
              onChange={(e) => setQuarterFilter(e.target.value)}
            >
              <option value="ALL">Tất cả khu phố</option>
              {Array.from({ length: 30 }, (_, i) => {
                const kp = `Khu phố ${(i + 1).toString().padStart(2, "0")}`;
                return <option key={kp} value={kp}>{kp}</option>;
              })}
            </select>
          </div>

          <div style={{ minWidth: "180px" }}>
            <select
              className="form-control"
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
            >
              <option value="ALL">Tất cả đơn vị</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          <div style={{ minWidth: "180px" }}>
            <select
              className="form-control"
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
            >
              <option value="ALL">Tất cả nguồn / kỳ họp</option>
              {sources.map((src) => (
                <option key={src} value={src}>
                  {src}
                </option>
              ))}
            </select>
          </div>

          <div style={{ minWidth: "180px" }}>
            <select
              className="form-control"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="ALL">Tất cả lĩnh vực</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Bảng chi tiết */}
        <div className="table-container" style={{ overflowX: "auto", width: "100%" }}>
          <table className="data-table ledger-table">
            <thead>
              <tr>
                <th rowSpan={2} style={{ width: "60px", textAlign: "center", borderBottom: "1px solid var(--border-color)", borderRight: "1px solid var(--border-color)", verticalAlign: "middle" }}>STT</th>
                <th rowSpan={2} style={{ width: "120px", borderBottom: "1px solid var(--border-color)", borderRight: "1px solid var(--border-color)", verticalAlign: "middle" }}>Mã vụ việc</th>
                <th rowSpan={2} style={{ width: "140px", borderBottom: "1px solid var(--border-color)", borderRight: "1px solid var(--border-color)", verticalAlign: "middle" }}>Nguồn tiếp nhận</th>
                <th colSpan={3} style={{ textAlign: "center", borderBottom: "1px solid var(--border-color)", borderRight: "1px solid var(--border-color)" }}>Thông tin người gửi</th>
                <th rowSpan={2} style={{ width: "120px", borderBottom: "1px solid var(--border-color)", borderRight: "1px solid var(--border-color)", verticalAlign: "middle" }}>Lĩnh vực</th>
                <th rowSpan={2} style={{ width: "200px", borderBottom: "1px solid var(--border-color)", borderRight: "1px solid var(--border-color)", verticalAlign: "middle" }}>Địa chỉ nơi phản ánh (GPS)</th>
                <th rowSpan={2} style={{ width: "380px", borderBottom: "1px solid var(--border-color)", borderRight: "1px solid var(--border-color)", verticalAlign: "middle" }}>Nội dung kiến nghị</th>
                <th rowSpan={1} style={{ width: "240px", borderBottom: "1px solid var(--border-color)", borderRight: "1px solid var(--border-color)", verticalAlign: "middle", textAlign: "center" }}>Đơn vị xử lý trực tiếp thuộc cấp phường</th>
                <th colSpan={2} style={{ textAlign: "center", borderBottom: "1px solid var(--border-color)", borderRight: "1px solid var(--border-color)" }}>Thẩm quyền xử lý</th>
                <th rowSpan={2} style={{ width: "120px", borderBottom: "1px solid var(--border-color)", borderRight: "1px solid var(--border-color)", verticalAlign: "middle" }}>Ngày tiếp nhận</th>
                <th rowSpan={2} style={{ width: "420px", borderBottom: "1px solid var(--border-color)", borderRight: "1px solid var(--border-color)", verticalAlign: "middle" }}>UBND chuẩn bị báo cáo tổng hợp kết quả giải quyết, trả lời kiến nghị của cử tri thuộc thẩm quyền giải quyết (Chậm nhất là 30 ngày, trước ngày khai mạc kỳ họp HĐND)</th>
                <th rowSpan={2} style={{ width: "200px", borderBottom: "1px solid var(--border-color)", borderRight: "1px solid var(--border-color)", verticalAlign: "middle" }}>Thời hạn báo cáo tổng hợp kết quả</th>
                <th rowSpan={2} style={{ width: "120px", borderBottom: "1px solid var(--border-color)", borderRight: "1px solid var(--border-color)", verticalAlign: "middle" }}>Thời gian gia hạn (nếu có)</th>
                <th rowSpan={2} style={{ width: "140px", borderBottom: "1px solid var(--border-color)", borderRight: "1px solid var(--border-color)", textAlign: "center", verticalAlign: "middle" }}>Trạng thái xử lý</th>
                <th rowSpan={2} style={{ width: "160px", borderBottom: "1px solid var(--border-color)", borderRight: "1px solid var(--border-color)", verticalAlign: "middle" }}>Văn bản trả lời (Link)</th>
                <th colSpan={3} style={{ textAlign: "center", borderBottom: "1px solid var(--border-color)", borderRight: "1px solid var(--border-color)" }}>Nội dung rà soát trả lời kiến nghị</th>
                <th rowSpan={2} style={{ width: "180px", borderBottom: "1px solid var(--border-color)", borderRight: "1px solid var(--border-color)", verticalAlign: "middle" }}>Ghi chú</th>
                <th rowSpan={2} style={{ width: "140px", textAlign: "center", borderBottom: "1px solid var(--border-color)", verticalAlign: "middle" }}>Hành động</th>
              </tr>
              <tr>
                <th style={{ fontSize: "0.75rem", padding: "0.5rem", borderBottom: "1px solid var(--border-color)", borderRight: "1px solid var(--border-color)", width: "140px" }}>Họ tên</th>
                <th style={{ fontSize: "0.75rem", padding: "0.5rem", borderBottom: "1px solid var(--border-color)", borderRight: "1px solid var(--border-color)", width: "220px" }}>Địa chỉ liên hệ</th>
                <th style={{ fontSize: "0.75rem", padding: "0.5rem", borderBottom: "1px solid var(--border-color)", borderRight: "1px solid var(--border-color)", width: "110px" }}>Số điện thoại</th>
                <th style={{ fontSize: "0.75rem", padding: "0.5rem", borderBottom: "1px solid var(--border-color)", borderRight: "1px solid var(--border-color)", fontWeight: "bold", width: "240px" }}>Các phòng, ban chuyên môn giải quyết</th>
                <th style={{ fontSize: "0.75rem", padding: "0.5rem", borderBottom: "1px solid var(--border-color)", borderRight: "1px solid var(--border-color)", width: "80px" }}>Phường</th>
                <th style={{ fontSize: "0.75rem", padding: "0.5rem", borderBottom: "1px solid var(--border-color)", borderRight: "1px solid var(--border-color)", width: "100px" }}>Sở/Ngành TP</th>
                <th style={{ fontSize: "0.75rem", padding: "0.5rem", borderBottom: "1px solid var(--border-color)", borderRight: "1px solid var(--border-color)", width: "120px" }}>Hoàn thành</th>
                <th style={{ fontSize: "0.75rem", padding: "0.5rem", borderBottom: "1px solid var(--border-color)", borderRight: "1px solid var(--border-color)", width: "120px" }}>Chưa giải quyết</th>
                <th style={{ fontSize: "0.75rem", padding: "0.5rem", borderBottom: "1px solid var(--border-color)", borderRight: "1px solid var(--border-color)", width: "120px" }}>1 Phần</th>
              </tr>
            </thead>
            <tbody>
              {filteredPetitions.length === 0 ? (
                <tr>
                  <td colSpan={23} style={{ textAlign: "center", color: "var(--text-muted)", padding: "3rem" }}>
                    Không tìm thấy dữ liệu nào phù hợp.
                  </td>
                </tr>
              ) : (
                filteredPetitions.map((pet, index) => {
                  const overdue = isOverdue(pet);

                  // Định dạng hiển thị lĩnh vực ngắn gọn
                  const categoryDisplay = pet.category === "Quản lý đô thị" ? "Đô thị" : pet.category === "Chế độ chính sách" ? "Chính sách" : pet.category;

                  // Tách nội dung rà soát theo trạng thái
                  const isLongReply = pet.replyDocNumber && pet.replyDocNumber.length > 15;
                  const reviewHoanThanh = isLongReply && pet.reviewStatus === "Hoàn thành" ? pet.replyDocNumber : "-";
                  const reviewChuaGiaiQuyet = isLongReply && pet.reviewStatus === "Chưa giải quyết" ? pet.replyDocNumber : "-";
                  const reviewMotPhan = isLongReply && pet.reviewStatus === "Mới giải quyết 1 phần" ? pet.replyDocNumber : "-";

                  return (
                    <tr key={pet.id} style={overdue ? { backgroundColor: "rgba(225, 29, 72, 0.04)" } : {}}>
                      <td style={{ textAlign: "center", fontWeight: "500", color: "var(--text-muted)", borderRight: "1px solid var(--border-color)" }}>
                        {index + 1}
                      </td>
                      <td style={{ fontWeight: "700", color: overdue ? "var(--danger)" : "var(--primary)", borderRight: "1px solid var(--border-color)" }}>
                        {pet.petitionCode}
                      </td>
                      <td style={{ fontSize: "0.85rem", borderRight: "1px solid var(--border-color)" }}>
                        {pet.source}
                      </td>
                      <td style={{ fontWeight: "600", fontSize: "0.85rem", borderRight: "1px solid var(--border-color)" }}>{pet.senderName}</td>
                      <td style={{ fontSize: "0.8rem", color: "var(--text-secondary)", borderRight: "1px solid var(--border-color)" }} title={pet.senderAddress}>
                        {pet.senderAddress}
                      </td>
                      <td style={{ fontSize: "0.8rem", color: "var(--text-muted)", borderRight: "1px solid var(--border-color)" }}>{pet.senderPhone || "-"}</td>
                      <td style={{ fontSize: "0.85rem", fontWeight: "500", borderRight: "1px solid var(--border-color)" }}>
                        {categoryDisplay}
                      </td>
                      <td style={{ fontSize: "0.8rem", color: "var(--text-secondary)", borderRight: "1px solid var(--border-color)" }}>
                        {pet.quarter || pet.location}
                      </td>
                      <td style={{ borderRight: "1px solid var(--border-color)" }}>
                        <div style={{ fontSize: "0.875rem", color: "var(--text-primary)", whiteSpace: "pre-line", minWidth: "250px" }}>
                          {pet.content}
                        </div>
                      </td>
                      <td style={{ fontSize: "0.85rem", color: "var(--text-secondary)", borderRight: "1px solid var(--border-color)" }}>
                        {pet.department}
                      </td>
                      <td style={{ textAlign: "center", fontWeight: "bold", color: "var(--primary)", borderRight: "1px solid var(--border-color)" }}>
                        {pet.authority === "UBND phường" ? "✓" : "-"}
                      </td>
                      <td style={{ textAlign: "center", fontWeight: "bold", color: "var(--primary)", borderRight: "1px solid var(--border-color)" }}>
                        {pet.authority !== "UBND phường" ? "✓" : "-"}
                      </td>
                      <td style={{ fontSize: "0.85rem", borderRight: "1px solid var(--border-color)" }}>
                        {formatDate(pet.receivedDate)}
                      </td>
                      <td style={{ fontSize: "0.85rem", borderRight: "1px solid var(--border-color)" }}>
                        {formatDate(pet.deadline)}
                      </td>
                      <td style={{ fontSize: "0.8rem", color: "var(--text-muted)", borderRight: "1px solid var(--border-color)" }}>
                        Ngày tổ chức kỳ họp trừ 30 ngày
                      </td>
                      <td style={{ fontSize: "0.85rem", color: "var(--warning)", borderRight: "1px solid var(--border-color)" }}>
                        {pet.extendedUntil ? formatDate(pet.extendedUntil) : "-"}
                      </td>
                      <td style={{ textAlign: "center", borderRight: "1px solid var(--border-color)" }}>
                        {getStatusBadge(pet)}
                      </td>
                      <td style={{ fontSize: "0.85rem", borderRight: "1px solid var(--border-color)" }}>
                        {pet.replyDocNumber ? (
                          pet.replyDocLink ? (
                            <a
                              href={pet.replyDocLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: "var(--primary)", fontWeight: "500", textDecoration: "underline" }}
                            >
                              {pet.replyDocNumber.length > 15 ? "[Link PDF]" : pet.replyDocNumber}
                            </a>
                          ) : (
                            <span style={{ fontWeight: "500" }}>{pet.replyDocNumber}</span>
                          )
                        ) : (
                          "-"
                        )}
                      </td>
                      <td style={{ fontSize: "0.8rem", color: "var(--success)", borderRight: "1px solid var(--border-color)" }}>{reviewHoanThanh}</td>
                      <td style={{ fontSize: "0.8rem", color: "var(--text-muted)", borderRight: "1px solid var(--border-color)" }}>{reviewChuaGiaiQuyet}</td>
                      <td style={{ fontSize: "0.8rem", color: "var(--warning)", borderRight: "1px solid var(--border-color)" }}>{reviewMotPhan}</td>
                      <td style={{ fontSize: "0.85rem", color: "var(--text-secondary)", borderRight: "1px solid var(--border-color)" }}>
                        {pet.notes || "-"}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <div style={{ display: "flex", gap: "0.35rem", justifyContent: "center" }}>
                          <button
                            onClick={() => openQuickUpdate(pet)}
                            className="btn-neon-blue"
                            style={{ padding: "0.35rem 0.6rem", fontSize: "0.7rem", display: "inline-flex", alignItems: "center", gap: "0.25rem", backgroundColor: "var(--info-bg)", color: "var(--info)", borderColor: "var(--info)" }}
                            title="Cập nhật tiến độ nhanh"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                            Tiến độ
                          </button>
                          <a href={`/petitions/${pet.id}`} className="btn-neon-blue" style={{ padding: "0.35rem 0.6rem", fontSize: "0.7rem" }}>
                            Chi tiết
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Glassmorphic Modal tiếp nhận kiến nghị mới */}
      {isCreateOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateOpen(false)}>
          <div className="modal-content glass-card" style={{ maxWidth: "750px", width: "90vw" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Tiếp nhận kiến nghị / Vụ việc mới</h3>
              <button className="modal-close" onClick={() => setIsCreateOpen(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <PetitionForm onSuccess={handleFormSuccess} onCancel={() => setIsCreateOpen(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Modal cập nhật tiến độ nhanh */}
      {updatingId && (
        <div className="modal-overlay" onClick={() => setUpdatingId(null)}>
          <div
            className="modal-content glass-card"
            style={{ maxWidth: "480px", width: "90vw" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: "0.5rem", verticalAlign: "middle" }}>
                  <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
                Cập nhật tiến độ
              </h3>
              <button className="modal-close" onClick={() => setUpdatingId(null)}>&times;</button>
            </div>
            <div className="modal-body">
              {quickError && (
                <div style={{ backgroundColor: "var(--danger-bg)", color: "var(--danger)", padding: "0.75rem 1rem", borderRadius: "var(--radius-md)", marginBottom: "1rem", fontSize: "0.875rem", border: "1px solid rgba(225,29,72,0.2)" }}>
                  {quickError}
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Trạng thái giải quyết</label>
                <select
                  className="form-control"
                  value={quickStatus}
                  onChange={(e) => setQuickStatus(e.target.value)}
                >
                  <option value="Đang xử lý">Đang xử lý</option>
                  <option value="Đã xong">Đã xong</option>
                  <option value="Chờ Admin phê duyệt">Chờ Admin phê duyệt</option>
                  <option value="Quá hạn">Quá hạn</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Thời hạn gia hạn giải quyết (nếu có)</label>
                <input
                  type="date"
                  className="form-control"
                  value={quickExtendedUntil}
                  onChange={(e) => setQuickExtendedUntil(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Văn bản trả lời (Số hiệu văn bản)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ví dụ: Số 12/UBND, Đang chờ Cty DVCI..."
                  value={quickReplyDocNumber}
                  onChange={(e) => setQuickReplyDocNumber(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Link văn bản trả lời (Đường dẫn PDF, nếu có)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ví dụ: https://example.com/reply.pdf"
                  value={quickReplyDocLink}
                  onChange={(e) => setQuickReplyDocLink(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Ghi chú tiến độ (tùy chọn)</label>
                <textarea
                  className="form-control form-textarea"
                  rows={2}
                  placeholder="Nhập ghi chú về tiến độ giải quyết..."
                  value={quickNotes}
                  onChange={(e) => setQuickNotes(e.target.value)}
                />
              </div>
              <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
                <button
                  type="button"
                  onClick={() => setUpdatingId(null)}
                  className="btn-neon-blue"
                  style={{ flexGrow: 1 }}
                  disabled={quickLoading}
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleQuickUpdate}
                  className="btn-neon-blue"
                  style={{ flexGrow: 2 }}
                  disabled={quickLoading}
                >
                  {quickLoading ? "Đang lưu..." : "Lưu tiến độ & Thông tin"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
