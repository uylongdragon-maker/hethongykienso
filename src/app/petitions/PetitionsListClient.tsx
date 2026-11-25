"use client";

import React, { useState, useMemo, useRef, useEffect, useDeferredValue } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PetitionForm from "@/components/PetitionForm";
import FileUpload from "@/components/FileUpload";
import { Spinner } from "@/components/Spinner";
import { openDocumentViewer } from "@/lib/fileViewer";
import { escapeHtml } from "@/lib/security";
import { REVIEW_STATUSES } from "@/lib/constants";
import {
  SerializedPetition,
  extractCommitteeFromNotes,
  formatDateVN,
  isPetitionOverdue,
} from "@/lib/petitionUtils";

interface PetitionsListClientProps {
  initialPetitions: SerializedPetition[];
  currentUserRole: string;
}

export default function PetitionsListClient({
  initialPetitions,
  currentUserRole,
}: PetitionsListClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [quarterFilter, setQuarterFilter] = useState("ALL");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const isSyncingScroll = useRef(false);

  // Nhận tham số lọc nhanh ?status=... khi chuyển từ trang Tổng quan sang
  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const st = sp.get("status");
      if (st) {
        setStatusFilter(st);
      }
    }
  }, []);

  // Reset về trang 1 khi thay đổi điều kiện lọc
  useEffect(() => {
    setCurrentPage(1);
  }, [deferredSearch, statusFilter, quarterFilter, departmentFilter, sourceFilter, categoryFilter, pageSize]);

  const handleTopScroll = () => {
    if (isSyncingScroll.current) return;
    isSyncingScroll.current = true;
    if (tableContainerRef.current && topScrollRef.current) {
      tableContainerRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    }
    requestAnimationFrame(() => {
      isSyncingScroll.current = false;
    });
  };

  const handleTableScroll = () => {
    if (isSyncingScroll.current) return;
    isSyncingScroll.current = true;
    if (topScrollRef.current && tableContainerRef.current) {
      topScrollRef.current.scrollLeft = tableContainerRef.current.scrollLeft;
    }
    requestAnimationFrame(() => {
      isSyncingScroll.current = false;
    });
  };

  const scrollTable = (offset: number) => {
    tableContainerRef.current?.scrollBy({ left: offset, behavior: "smooth" });
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
    const searchLower = deferredSearch.trim().toLowerCase();
    return initialPetitions.filter((p) => {
      const matchesSearch =
        !searchLower ||
        p.petitionCode.toLowerCase().includes(searchLower) ||
        p.senderName.toLowerCase().includes(searchLower) ||
        p.senderAddress.toLowerCase().includes(searchLower) ||
        p.content.toLowerCase().includes(searchLower) ||
        p.location.toLowerCase().includes(searchLower) ||
        (p.replyDocNumber && p.replyDocNumber.toLowerCase().includes(searchLower));

      let matchesStatus = true;
      if (statusFilter !== "ALL") {
        if (statusFilter === "OVERDUE") {
          matchesStatus = isPetitionOverdue(p);
        } else {
          matchesStatus = p.status === statusFilter;
        }
      }

      const matchesQuarter = quarterFilter === "ALL" || p.quarter === quarterFilter;
      const matchesDepartment = departmentFilter === "ALL" || p.department === departmentFilter;
      const matchesSource = sourceFilter === "ALL" || p.source === sourceFilter;
      const matchesCategory = categoryFilter === "ALL" || p.category === categoryFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesQuarter &&
        matchesDepartment &&
        matchesSource &&
        matchesCategory
      );
    });
  }, [
    initialPetitions,
    deferredSearch,
    statusFilter,
    quarterFilter,
    departmentFilter,
    sourceFilter,
    categoryFilter,
  ]);

  const totalPages = useMemo(() => {
    if (pageSize <= 0) return 1;
    return Math.max(1, Math.ceil(filteredPetitions.length / pageSize));
  }, [filteredPetitions.length, pageSize]);

  const paginatedPetitions = useMemo(() => {
    if (pageSize <= 0) return filteredPetitions;
    const start = (currentPage - 1) * pageSize;
    return filteredPetitions.slice(start, start + pageSize);
  }, [filteredPetitions, currentPage, pageSize]);

  // Xuất công văn đôn đốc an toàn (chống Stored XSS bằng escapeHtml)
  const handleExportReminder = (pet: SerializedPetition) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const today = new Date();
    const dayStr = today.getDate().toString().padStart(2, "0");
    const monthStr = (today.getMonth() + 1).toString().padStart(2, "0");
    const yearStr = today.getFullYear();
    const dueFollowUp = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString("vi-VN");

    const safeCode = escapeHtml(pet.petitionCode);
    const safeReceived = escapeHtml(formatDateVN(pet.receivedDate));
    const safeCategory = escapeHtml(pet.category);
    const safeLocation = escapeHtml(pet.quarter || pet.location);
    const safeContent = escapeHtml(pet.content);

    const htmlContent = `<!DOCTYPE html>
      <html lang="vi">
        <head>
          <meta charset="utf-8" />
          <title>Công văn đôn đốc - ${safeCode}</title>
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
            .header-table { width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; }
            .header-table td { vertical-align: top; text-align: center; padding: 0; }
            .header-left { width: 45%; }
            .header-right { width: 55%; }
            .title-org, .title-nation { font-size: 11pt; font-weight: bold; }
            .title-suborg { font-size: 11pt; font-weight: bold; text-decoration: underline; }
            .doc-number { margin-top: 0.5rem; font-size: 11pt; }
            .doc-date { margin-top: 0.5rem; font-style: italic; font-size: 11pt; text-align: right; }
            .doc-title { text-align: center; font-weight: bold; margin-top: 2rem; margin-bottom: 1.5rem; font-size: 14pt; }
            .recipient { text-align: center; font-weight: bold; margin-bottom: 1.5rem; }
            .content-section { text-align: justify; margin-bottom: 1rem; text-indent: 1.27cm; }
            .bullet-list { margin-left: 1.27cm; text-align: justify; }
            .bullet-item { margin: 0.45rem 0; }
            .signature-table { width: 100%; margin-top: 2rem; border-collapse: collapse; }
            .signature-table td { vertical-align: top; padding: 0; }
            .signature-left { width: 40%; font-size: 11pt; text-align: left; }
            .signature-right { width: 60%; text-align: center; }
            .btn-print-box {
              position: fixed; top: 20px; right: 20px; background: #121316; color: #fff;
              padding: 10px 18px; border-radius: 6px; cursor: pointer; font-weight: bold; border: none; font-family: sans-serif;
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
                <div class="doc-number">Số: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/HĐND-ĐĐ</div>
                <div style="font-size: 9pt; margin-top: 0.35rem;">V/v đôn đốc giải quyết kiến nghị cử tri</div>
              </td>
              <td class="header-right">
                <div class="title-nation">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                <div class="title-suborg">Độc lập - Tự do - Hạnh phúc</div>
                <div class="doc-date">Bình Đông, ngày ${dayStr} tháng ${monthStr} năm ${yearStr}</div>
              </td>
            </tr>
          </table>

          <div class="doc-title">
            CÔNG VĂN ĐÔN ĐỐC<br/>
            <span style="font-size: 11pt; font-weight: normal; font-style: italic;">
              Về việc đôn đốc giải quyết kiến nghị cử tri nhiệm kỳ 2026 - 2031
            </span>
          </div>

          <div class="recipient">Kính gửi: Ủy ban nhân dân phường Bình Đông</div>

          <div class="content-section">
            Thực hiện chức năng giám sát theo quy định của Luật Tổ chức chính quyền địa phương và căn cứ dữ liệu theo dõi trên Hệ thống ứng dụng tổng hợp, theo dõi giải quyết kiến nghị cử tri của Hội đồng nhân dân phường Bình Đông.
          </div>

          <div class="content-section">
            Qua rà soát tiến độ giải quyết các kiến nghị của cử tri tính đến ngày ${dayStr}/${monthStr}/${yearStr}, Thường trực HĐND phường ghi nhận:
          </div>

          <div class="content-section">
            1. Về tiến độ giải quyết: Hồ sơ mã số <strong>${safeCode}</strong> tiếp nhận ngày ${safeReceived} đã quá thời hạn giải quyết theo quy định nhưng chưa có văn bản phản hồi chính thức.
          </div>

          <div class="content-section">
            2. Nội dung phản ánh thuộc lĩnh vực <strong>${safeCategory}</strong> tại khu vực <strong>${safeLocation}</strong>: <em>&ldquo;${safeContent}&rdquo;</em> cần sớm được giải quyết dứt điểm để đảm bảo quyền lợi chính đáng của cử tri.
          </div>

          <div class="content-section">
            Thường trực HĐND phường đề nghị UBND phường:
          </div>

          <div class="bullet-list">
            <div class="bullet-item">Chỉ đạo bộ phận chuyên môn khẩn trương kiểm tra, xử lý dứt điểm nội dung kiến nghị nêu trên.</div>
            <div class="bullet-item">Cập nhật kết quả xử lý và đính kèm văn bản trả lời lên Hệ thống trước ngày ${escapeHtml(dueFollowUp)} để Thường trực HĐND phường tổng hợp thông tin đến cử tri.</div>
          </div>

          <table class="signature-table">
            <tr>
              <td class="signature-left">
                <strong>Nơi nhận:</strong><br/>
                Như trên;<br/>
                Đảng ủy phường (để báo cáo);<br/>
                Đại biểu HĐND phường;<br/>
                Lưu: VT.
              </td>
              <td class="signature-right">
                <strong>TM. THƯỜNG TRỰC HĐND</strong><br/>
                <strong>KT. CHỦ TỊCH</strong><br/>
                <strong>PHÓ CHỦ TỊCH</strong>
                <br/><br/><br/><br/>
                <strong>(Ký tên, đóng dấu)</strong>
              </td>
            </tr>
          </table>
        </body>
      </html>`;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const renderStatusCell = (pet: SerializedPetition) => {
    const overdue = isPetitionOverdue(pet);
    if (overdue) {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", alignItems: "center" }}>
          <span className="status-text status-overdue">Quá hạn</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleExportReminder(pet);
            }}
            className="btn-danger-tonal"
            style={{ padding: "0.22rem 0.5rem", fontSize: "0.7rem" }}
          >
            Xuất đôn đốc
          </button>
        </div>
      );
    }

    switch (pet.status) {
      case "Đã xong":
        return <span className="status-text status-resolved">Đã xong</span>;
      case "Đang xử lý":
        return <span className="status-text status-progress">Đang xử lý</span>;
      case "Chờ Admin phê duyệt":
        return <span className="status-text status-pending-admin">Chờ Admin phê duyệt</span>;
      default:
        return <span className="status-text">{pet.status}</span>;
    }
  };

  const handleExportCSV = () => {
    const escapeXml = (unsafe: unknown) => {
      if (unsafe === null || unsafe === undefined) return "";
      return String(unsafe)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
    };

    let xmlRows = "";
    filteredPetitions.forEach((pet, index) => {
      const phone = pet.senderPhone || "";
      const extended = pet.extendedUntil ? formatDateVN(pet.extendedUntil) : "";
      const authPhuong = pet.authority === "UBND phường" ? "X" : "";
      const authSo = pet.authority !== "UBND phường" ? "X" : "";

      let replyLinkDisplay = "";
      if (pet.replyDocLink) {
        if (pet.replyDocLink.startsWith("data:") || pet.replyDocLink.startsWith("/api/petitions/")) {
          replyLinkDisplay = pet.replyDocNumber
            ? `${pet.replyDocNumber} [Tệp đính kèm]`
            : "[Tệp đính kèm]";
        } else {
          replyLinkDisplay = pet.replyDocNumber
            ? `${pet.replyDocNumber} (${pet.replyDocLink})`
            : pet.replyDocLink;
        }
      } else {
        replyLinkDisplay = pet.replyDocNumber || "";
      }

      const reviewHoanThanh =
        pet.reviewStatus === "Hoàn thành" ? pet.replyDocNumber || "Hoàn thành" : "";
      const reviewChuaGiaiQuyet =
        pet.reviewStatus === "Chưa giải quyết" ? pet.replyDocNumber || "Chưa giải quyết" : "";
      const reviewMotPhan =
        pet.reviewStatus === "Mới giải quyết 1 phần"
          ? pet.replyDocNumber || "Mới giải quyết 1 phần"
          : "";

      const displayStatus = isPetitionOverdue(pet) ? "Quá hạn" : pet.status;

      xmlRows += `
      <Row>
        <Cell ss:StyleID="CellCenter"><Data ss:Type="Number">${index + 1}</Data></Cell>
        <Cell ss:StyleID="CellBold"><Data ss:Type="String">${escapeXml(pet.petitionCode)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(pet.source)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(pet.senderName)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(pet.senderAddress)}</Data></Cell>
        <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(phone)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(pet.category)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(pet.location)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(pet.content)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(pet.department)}</Data></Cell>
        <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(authPhuong)}</Data></Cell>
        <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(authSo)}</Data></Cell>
        <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(formatDateVN(pet.receivedDate))}</Data></Cell>
        <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(formatDateVN(pet.deadline))}</Data></Cell>
        <Cell ss:StyleID="CellCenter"><Data ss:Type="String">Trước khai mạc kỳ họp 30 ngày</Data></Cell>
        <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(extended)}</Data></Cell>
        <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(displayStatus)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(replyLinkDisplay)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(reviewHoanThanh)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(reviewChuaGiaiQuyet)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(reviewMotPhan)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(pet.notes || "")}</Data></Cell>
      </Row>`;
    });

    const excelTemplate = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
   </Borders>
   <Font ss:FontName="Times New Roman" ss:Size="11" ss:Color="#111827"/>
  </Style>
  <Style ss:ID="Header">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#4B5563"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#4B5563"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#4B5563"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#4B5563"/>
   </Borders>
   <Font ss:FontName="Times New Roman" ss:Size="11" ss:Bold="1" ss:Color="#111827"/>
   <Interior ss:Color="#E5E7EB" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="CellCenter">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Times New Roman" ss:Size="11" ss:Color="#111827"/>
  </Style>
  <Style ss:ID="CellBold">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Times New Roman" ss:Size="11" ss:Bold="1" ss:Color="#1E40AF"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="So_Theo_Doi_Kien_Nghi">
  <Table ss:DefaultRowHeight="24">
   <Column ss:Width="40"/><Column ss:Width="95"/><Column ss:Width="130"/><Column ss:Width="120"/>
   <Column ss:Width="180"/><Column ss:Width="90"/><Column ss:Width="160"/><Column ss:Width="180"/>
   <Column ss:Width="260"/><Column ss:Width="160"/><Column ss:Width="60"/><Column ss:Width="70"/>
   <Column ss:Width="85"/><Column ss:Width="85"/><Column ss:Width="140"/><Column ss:Width="85"/>
   <Column ss:Width="95"/><Column ss:Width="140"/><Column ss:Width="120"/><Column ss:Width="120"/>
   <Column ss:Width="120"/><Column ss:Width="160"/>
   <Row ss:Height="32">
    <Cell ss:StyleID="Header"><Data ss:Type="String">STT</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Mã vụ việc</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Nguồn tiếp nhận</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Họ tên người gửi</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Địa chỉ người gửi</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Số điện thoại</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Lĩnh vực</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Địa chỉ phản ánh (GPS)</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Nội dung kiến nghị</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Đơn vị xử lý cấp phường</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Thẩm quyền: Phường</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Thẩm quyền: Sở ngành TP</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Ngày tiếp nhận</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Hạn giải quyết</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Thời hạn báo cáo tổng hợp</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Gia hạn</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Trạng thái xử lý</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Văn bản trả lời</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Rà soát: Hoàn thành</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Rà soát: Chưa giải quyết</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Rà soát: 1 phần</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Ghi chú</Data></Cell>
   </Row>
   ${xmlRows}
  </Table>
 </Worksheet>
</Workbook>`;

    const blob = new Blob([excelTemplate], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `so_theo_doi_kien_nghi_${new Date().toISOString().split("T")[0]}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportOfficialLetter = () => {
    let csv =
      "STT,Mã vụ việc,Nội dung kiến nghị,Đơn vị xử lý trực tiếp,Thẩm quyền xử lý,Ngày tiếp nhận,Hạn giải quyết,Trạng thái,Ghi chú\n";
    const pending = filteredPetitions.filter((p) => p.status !== "Đã xong");
    pending.forEach((pet, index) => {
      const { cleanNotes } = extractCommitteeFromNotes(pet.notes);
      const st = isPetitionOverdue(pet) ? "Quá hạn" : pet.status;
      csv += `${index + 1},${pet.petitionCode},"${pet.content.replace(/"/g, '""')}","${pet.department}","${pet.authority}","${formatDateVN(pet.receivedDate)}","${formatDateVN(pet.extendedUntil || pet.deadline)}","${st}","${cleanNotes.replace(/"/g, '""')}"\n`;
    });

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `danh_sach_chua_hoan_thanh_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // State modal cập nhật nhanh
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [quickStatus, setQuickStatus] = useState("");
  const [quickReviewStatus, setQuickReviewStatus] = useState("");
  const [quickNotes, setQuickNotes] = useState("");
  const [quickExtendedUntil, setQuickExtendedUntil] = useState("");
  const [quickReplyDocNumber, setQuickReplyDocNumber] = useState("");
  const [quickReplyDocLink, setQuickReplyDocLink] = useState("");
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickError, setQuickError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeletePetition = async (petId: string, petCode: string) => {
    if (!confirm(`Xác nhận xóa vĩnh viễn vụ việc "${petCode}"?`)) return;
    setDeletingId(petId);
    try {
      const res = await fetch(`/api/petitions/${petId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Không thể xóa vụ việc.");
      } else {
        router.refresh();
      }
    } catch {
      alert("Lỗi kết nối khi xóa vụ việc.");
    } finally {
      setDeletingId(null);
    }
  };

  const openQuickUpdate = (pet: SerializedPetition) => {
    const { cleanNotes } = extractCommitteeFromNotes(pet.notes);
    setUpdatingId(pet.id);
    setQuickStatus(pet.status);
    setQuickReviewStatus(pet.reviewStatus || "Chưa giải quyết");
    setQuickNotes(cleanNotes);
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
          reviewStatus: quickReviewStatus,
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
    <div className="page-content">
      <div className="page-header no-print">
        <div>
          <h1 className="page-title">Sổ theo dõi & giám sát vụ việc</h1>
          <p className="page-subtitle">
            Hiển thị {paginatedPetitions.length} trên tổng số {filteredPetitions.length} hồ sơ phù hợp
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          {currentUserRole !== "CAN_BO" && (
            <button onClick={() => setIsCreateOpen(true)} className="btn-accent">
              Tiếp nhận kiến nghị
            </button>
          )}
          <button onClick={handleExportCSV} className="btn-primary">
            Xuất Excel
          </button>
          <button onClick={handleExportOfficialLetter} className="btn-secondary">
            Danh sách đôn đốc phòng ban
          </button>
          <button onClick={() => window.print()} className="btn-secondary">
            In sổ
          </button>
        </div>
      </div>

      {/* Bộ lọc tìm kiếm đa tiêu chí đặt trực tiếp trên nền */}
      <div
        className="no-print"
        style={{
          display: "grid",
          gridTemplateColumns: "2fr repeat(5, minmax(140px, 1fr))",
          gap: "0.65rem",
          marginBottom: "1.25rem",
        }}
      >
        <input
          type="text"
          placeholder="Tìm mã vụ việc, họ tên, địa chỉ, nội dung, số văn bản..."
          className="form-control"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select className="form-control" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="ALL">Tất cả trạng thái</option>
          <option value="Đang xử lý">Đang xử lý</option>
          <option value="Chờ Admin phê duyệt">Chờ Admin phê duyệt</option>
          <option value="Đã xong">Đã xong</option>
          <option value="OVERDUE">Quá hạn</option>
        </select>

        <select className="form-control" value={quarterFilter} onChange={(e) => setQuarterFilter(e.target.value)}>
          <option value="ALL">Tất cả khu phố</option>
          {Array.from({ length: 30 }, (_, i) => {
            const kp = `Khu phố ${(i + 1).toString().padStart(2, "0")}`;
            return (
              <option key={kp} value={kp}>
                {kp}
              </option>
            );
          })}
        </select>

        <select className="form-control" value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}>
          <option value="ALL">Tất cả đơn vị</option>
          {departments.map((dept) => (
            <option key={dept} value={dept}>
              {dept}
            </option>
          ))}
        </select>

        <select className="form-control" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
          <option value="ALL">Tất cả nguồn</option>
          {sources.map((src) => (
            <option key={src} value={src}>
              {src}
            </option>
          ))}
        </select>

        <select className="form-control" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="ALL">Tất cả lĩnh vực</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Điều hướng cuộn ngang & phân trang gọn gàng */}
      <div
        className="no-print"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
          flexWrap: "wrap",
          marginBottom: "0.65rem",
        }}
      >
        <div style={{ display: "flex", gap: "0.45rem", alignItems: "center" }}>
          <button
            type="button"
            onClick={() => scrollTable(-520)}
            className="btn-secondary"
            style={{ padding: "0.35rem 0.75rem", fontSize: "0.76rem" }}
          >
            Cuộn trái
          </button>
          <button
            type="button"
            onClick={() => scrollTable(520)}
            className="btn-secondary"
            style={{ padding: "0.35rem 0.75rem", fontSize: "0.76rem" }}
          >
            Cuộn phải
          </button>
          {(search ||
            statusFilter !== "ALL" ||
            quarterFilter !== "ALL" ||
            departmentFilter !== "ALL" ||
            sourceFilter !== "ALL" ||
            categoryFilter !== "ALL") && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter("ALL");
                setQuarterFilter("ALL");
                setDepartmentFilter("ALL");
                setSourceFilter("ALL");
                setCategoryFilter("ALL");
              }}
              className="btn-danger-tonal"
              style={{ padding: "0.35rem 0.75rem", fontSize: "0.76rem" }}
            >
              Xóa bộ lọc
            </button>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
          <select
            className="form-control"
            style={{ width: "auto", padding: "0.35rem 2rem 0.35rem 0.75rem", fontSize: "0.78rem" }}
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
          >
            <option value={25}>25 dòng / trang</option>
            <option value={50}>50 dòng / trang</option>
            <option value={100}>100 dòng / trang</option>
            <option value={0}>Hiển thị tất cả</option>
          </select>

          {pageSize > 0 && totalPages > 1 && (
            <div className="tabular-nums" style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", fontWeight: 700 }}>
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="btn-secondary"
                style={{ padding: "0.3rem 0.65rem", fontSize: "0.75rem" }}
              >
                Trước
              </button>
              <span>
                Trang {currentPage}/{totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="btn-secondary"
                style={{ padding: "0.3rem 0.65rem", fontSize: "0.75rem" }}
              >
                Sau
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Thanh cuộn ngang đồng bộ */}
      <div
        ref={topScrollRef}
        onScroll={handleTopScroll}
        className="no-print"
        style={{
          overflowX: "auto",
          overflowY: "hidden",
          width: "100%",
          height: "10px",
          marginBottom: "0.4rem",
        }}
      >
        <div style={{ width: "3100px", height: "1px" }} />
      </div>

      {/* Sổ theo dõi 23 cột chuẩn hành chính */}
      <div
        ref={tableContainerRef}
        onScroll={handleTableScroll}
        className="table-container"
        style={{ backgroundColor: "#ffffff", borderRadius: "var(--radius-lg)" }}
      >
        <table className="data-table ledger-table">
          <thead>
            <tr>
              <th rowSpan={2} style={{ width: "52px", textAlign: "center" }}>STT</th>
              <th rowSpan={2} style={{ width: "115px" }}>Mã vụ việc</th>
              <th rowSpan={2} style={{ width: "140px" }}>Nguồn tiếp nhận</th>
              <th colSpan={3} style={{ textAlign: "center" }}>Thông tin người gửi</th>
              <th rowSpan={2} style={{ width: "150px" }}>Lĩnh vực</th>
              <th rowSpan={2} style={{ width: "190px" }}>Địa bàn phản ánh</th>
              <th rowSpan={2} style={{ width: "340px" }}>Nội dung kiến nghị</th>
              <th rowSpan={2} style={{ width: "200px" }}>Đơn vị xử lý trực tiếp</th>
              <th colSpan={2} style={{ textAlign: "center" }}>Thẩm quyền</th>
              <th rowSpan={2} style={{ width: "110px" }}>Ngày tiếp nhận</th>
              <th rowSpan={2} style={{ width: "115px" }}>Hạn giải quyết</th>
              <th rowSpan={2} style={{ width: "160px" }}>Thời hạn báo cáo kỳ họp</th>
              <th rowSpan={2} style={{ width: "110px" }}>Gia hạn</th>
              <th rowSpan={2} style={{ width: "135px", textAlign: "center" }}>Trạng thái</th>
              <th rowSpan={2} style={{ width: "155px" }}>Văn bản trả lời</th>
              <th colSpan={3} style={{ textAlign: "center" }}>Kết quả rà soát</th>
              <th rowSpan={2} style={{ width: "190px" }}>Ghi chú</th>
              <th rowSpan={2} style={{ width: "155px", textAlign: "center" }}>Thao tác</th>
            </tr>
            <tr>
              <th style={{ width: "135px" }}>Họ tên</th>
              <th style={{ width: "200px" }}>Địa chỉ liên hệ</th>
              <th style={{ width: "105px" }}>Điện thoại</th>
              <th style={{ width: "75px", textAlign: "center" }}>Phường</th>
              <th style={{ width: "90px", textAlign: "center" }}>Sở ngành TP</th>
              <th style={{ width: "110px", textAlign: "center" }}>Hoàn thành</th>
              <th style={{ width: "110px", textAlign: "center" }}>Chưa giải quyết</th>
              <th style={{ width: "110px", textAlign: "center" }}>Một phần</th>
            </tr>
          </thead>
          <tbody>
            {paginatedPetitions.length === 0 ? (
              <tr>
                <td colSpan={23} style={{ textAlign: "center", color: "var(--text-muted)", padding: "3rem" }}>
                  Không tìm thấy hồ sơ phù hợp với bộ lọc hiện tại.
                </td>
              </tr>
            ) : (
              paginatedPetitions.map((pet, idx) => {
                const overdue = isPetitionOverdue(pet);
                const rowNumber = pageSize > 0 ? (currentPage - 1) * pageSize + idx + 1 : idx + 1;
                const { committee, cleanNotes } = extractCommitteeFromNotes(pet.notes);

                // Sửa lỗi hiển thị 3 cột Kết quả rà soát đồng nhất với file Excel xuất ra
                const reviewHoanThanh =
                  pet.reviewStatus === "Hoàn thành" ? pet.replyDocNumber || "Hoàn thành" : "";
                const reviewChuaGiaiQuyet =
                  pet.reviewStatus === "Chưa giải quyết" ? "Chưa giải quyết" : "";
                const reviewMotPhan =
                  pet.reviewStatus === "Mới giải quyết 1 phần"
                    ? pet.replyDocNumber || "Một phần"
                    : "";

                return (
                  <tr
                    key={pet.id}
                    style={overdue ? { backgroundColor: "rgba(220, 38, 38, 0.045)" } : undefined}
                  >
                    <td style={{ textAlign: "center", color: "var(--text-muted)" }}>{rowNumber}</td>
                    <td
                      style={{
                        fontWeight: 800,
                        fontFamily: "var(--font-mono)",
                        color: overdue ? "var(--danger)" : "var(--text-primary)",
                      }}
                    >
                      {pet.petitionCode}
                    </td>
                    <td>{pet.source}</td>
                    <td style={{ fontWeight: 600 }}>{pet.senderName}</td>
                    <td style={{ color: "var(--text-secondary)" }}>{pet.senderAddress}</td>
                    <td style={{ fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
                      {pet.senderPhone || ""}
                    </td>
                    <td>{pet.category}</td>
                    <td style={{ color: "var(--text-secondary)" }}>
                      {pet.quarter ? `${pet.quarter} (${pet.location})` : pet.location}
                    </td>
                    <td>
                      <div style={{ whiteSpace: "pre-line" }}>{pet.content}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{pet.department}</div>
                      {committee && (
                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                          {committee}
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: "center", fontWeight: 800 }}>
                      {pet.authority === "UBND phường" ? "X" : ""}
                    </td>
                    <td style={{ textAlign: "center", fontWeight: 800 }}>
                      {pet.authority !== "UBND phường" ? "X" : ""}
                    </td>
                    <td>{formatDateVN(pet.receivedDate)}</td>
                    <td>{formatDateVN(pet.deadline)}</td>
                    <td style={{ color: "var(--text-muted)" }}>Trước kỳ họp 30 ngày</td>
                    <td style={{ color: "var(--warning)", fontWeight: 600 }}>
                      {pet.extendedUntil ? formatDateVN(pet.extendedUntil) : ""}
                    </td>
                    <td style={{ textAlign: "center" }}>{renderStatusCell(pet)}</td>
                    <td>
                      {pet.replyDocLink ? (
                        <button
                          type="button"
                          onClick={() =>
                            openDocumentViewer(
                              pet.replyDocLink!,
                              pet.replyDocNumber || pet.petitionCode
                            )
                          }
                          className="btn-secondary"
                          style={{
                            padding: "0.28rem 0.6rem",
                            fontSize: "0.75rem",
                            color: "var(--info)",
                            fontWeight: 700,
                          }}
                        >
                          {pet.replyDocNumber
                            ? pet.replyDocNumber.length > 22
                              ? pet.replyDocNumber.slice(0, 20) + "..."
                              : pet.replyDocNumber
                            : "Mở văn bản"}
                        </button>
                      ) : (
                        <span>{pet.replyDocNumber || ""}</span>
                      )}
                    </td>
                    <td style={{ textAlign: "center", color: "var(--success)", fontWeight: 700 }}>
                      {reviewHoanThanh}
                    </td>
                    <td style={{ textAlign: "center", color: "var(--text-muted)" }}>
                      {reviewChuaGiaiQuyet}
                    </td>
                    <td style={{ textAlign: "center", color: "var(--warning)", fontWeight: 600 }}>
                      {reviewMotPhan}
                    </td>
                    <td style={{ color: "var(--text-secondary)" }}>{cleanNotes}</td>
                    <td style={{ textAlign: "center" }}>
                      <div style={{ display: "flex", gap: "0.35rem", justifyContent: "center", flexWrap: "wrap" }}>
                        {currentUserRole !== "CAN_BO" && (
                          <button
                            type="button"
                            onClick={() => openQuickUpdate(pet)}
                            className="btn-secondary"
                            style={{ padding: "0.32rem 0.6rem", fontSize: "0.74rem" }}
                          >
                            Cập nhật
                          </button>
                        )}
                        <Link
                          href={`/petitions/${pet.id}`}
                          className="btn-primary"
                          style={{ padding: "0.32rem 0.6rem", fontSize: "0.74rem" }}
                        >
                          Chi tiết
                        </Link>
                        {currentUserRole === "ADMIN" && (
                          <button
                            type="button"
                            disabled={deletingId === pet.id}
                            onClick={() => handleDeletePetition(pet.id, pet.petitionCode)}
                            className="btn-danger-tonal"
                            style={{ padding: "0.32rem 0.55rem", fontSize: "0.74rem" }}
                          >
                            {deletingId === pet.id ? <Spinner size={13} /> : "Xóa"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal tiếp nhận kiến nghị mới */}
      {isCreateOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Tiếp nhận vụ việc mới</h3>
              <button className="modal-close" onClick={() => setIsCreateOpen(false)}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              <PetitionForm
                onSuccess={() => {
                  setIsCreateOpen(false);
                  router.refresh();
                }}
                onCancel={() => setIsCreateOpen(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal cập nhật tiến độ & rà soát đồng bộ */}
      {updatingId && (
        <div className="modal-overlay" onClick={() => setUpdatingId(null)}>
          <div
            className="modal-content"
            style={{ maxWidth: "520px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title">Cập nhật kết quả giải quyết</h3>
              <button className="modal-close" onClick={() => setUpdatingId(null)}>
                &times;
              </button>
            </div>
            <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {quickError && (
                <div
                  style={{
                    backgroundColor: "var(--danger-bg)",
                    color: "var(--danger)",
                    padding: "0.75rem 1rem",
                    borderRadius: "var(--radius-md)",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                  }}
                >
                  {quickError}
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
                <div className="form-group">
                  <label className="form-label">Trạng thái xử lý</label>
                  <select
                    className="form-control"
                    value={quickStatus}
                    onChange={(e) => {
                      const val = e.target.value;
                      setQuickStatus(val);
                      if (val === "Đã xong") setQuickReviewStatus("Hoàn thành");
                    }}
                  >
                    <option value="Đang xử lý">Đang xử lý</option>
                    <option value="Chờ Admin phê duyệt">Chờ Admin phê duyệt</option>
                    <option value="Đã xong">
                      {currentUserRole === "CHUYEN_VIEN" ? "Hoàn tất (Trình Admin duyệt)" : "Đã xong"}
                    </option>
                    <option value="Quá hạn">Quá hạn</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Kết quả rà soát</label>
                  <select
                    className="form-control"
                    value={quickReviewStatus}
                    onChange={(e) => setQuickReviewStatus(e.target.value)}
                  >
                    {REVIEW_STATUSES.map((rv) => (
                      <option key={rv} value={rv}>
                        {rv}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Gia hạn giải quyết (nếu có)</label>
                <input
                  type="date"
                  className="form-control tabular-nums"
                  value={quickExtendedUntil}
                  onChange={(e) => setQuickExtendedUntil(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Số hiệu văn bản trả lời</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ví dụ: Số 12/UBND-VHXH"
                  value={quickReplyDocNumber}
                  onChange={(e) => setQuickReplyDocNumber(e.target.value)}
                />
              </div>

              <FileUpload
                value={quickReplyDocLink}
                onChange={setQuickReplyDocLink}
                label="Văn bản trả lời đính kèm"
              />

              <div className="form-group">
                <label className="form-label">Ghi chú tiến độ</label>
                <textarea
                  className="form-control form-textarea"
                  rows={2}
                  placeholder="Ghi nhận tiến độ xử lý thực tế..."
                  value={quickNotes}
                  onChange={(e) => setQuickNotes(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", gap: "0.65rem", justifyContent: "flex-end", marginTop: "0.4rem" }}>
                <button
                  type="button"
                  onClick={() => setUpdatingId(null)}
                  className="btn-secondary"
                  disabled={quickLoading}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleQuickUpdate}
                  className="btn-primary"
                  disabled={quickLoading}
                >
                  {quickLoading ? (
                    <>
                      <Spinner size={14} />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    "Lưu cập nhật"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
