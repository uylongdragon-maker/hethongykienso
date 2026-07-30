import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import crypto from "crypto";

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function hashPassword(password: string): string {
  const salt = "binhdong_salt_2026";
  return crypto.createHmac("sha256", salt).update(password).digest("hex");
}

function sanitizeAddress(address: string): string {
  if (!address) return "";
  let cleaned = address.replace(/khu\s*phố\s*23|kp\s*23/gi, "");
  cleaned = cleaned.replace(/,\s*,/g, ",").replace(/^\s*,|,\s*$/g, "").trim();
  cleaned = cleaned.replace(/(,\s*)?(phường\s*)?bình\s*đông/gi, "");
  cleaned = cleaned.replace(/(,\s*)?(phường\s*)?chánh\s*hưng/gi, "");
  cleaned = cleaned.replace(/(,\s*)?tp\.?\s*h(ồ|o)\s*ch(í|i)\s*minh/gi, "");
  cleaned = cleaned.replace(/(,\s*)?tp\.?\s*hcm/gi, "");
  cleaned = cleaned.replace(/(,\s*)?ho\s*chi\s*minh(\s*city)?/gi, "");
  cleaned = cleaned.trim();
  return `${cleaned}, Phường Bình Đông, TP. Hồ Chí Minh`;
}

async function main() {
  console.log("Starting database seeding (upsert mode - preserves existing data)...");

  // 1. Seed Vietnamese Administrative Units (upsert)
  const hcm = await prisma.administrativeUnit.upsert({
    where: { code: "79" },
    update: {},
    create: {
      code: "79",
      name: "Thành phố Hồ Chí Minh",
      nameEn: "Ho Chi Minh City",
      fullName: "Thành phố Hồ Chí Minh",
      level: "TinhThanh",
    },
  });

  const q8 = await prisma.administrativeUnit.upsert({
    where: { code: "760" },
    update: {},
    create: {
      code: "760",
      name: "Quận 8",
      nameEn: "Quan 8",
      fullName: "Quận 8, Thành phố Hồ Chí Minh",
      level: "QuanHuyen",
      parentId: hcm.id,
    },
  });

  const binhDong = await prisma.administrativeUnit.upsert({
    where: { code: "26830" },
    update: {},
    create: {
      code: "26830",
      name: "Phường Bình Đông",
      nameEn: "Phuong Binh Dong",
      fullName: "Phường Bình Đông, Quận 8, Thành phố Hồ Chí Minh",
      level: "PhuongXa",
      parentId: q8.id,
    },
  });

  for (let i = 1; i <= 5; i++) {
    const quarterNum = i.toString().padStart(2, "0");
    await prisma.administrativeUnit.upsert({
      where: { code: `26830-${quarterNum}` },
      update: {},
      create: {
        code: `26830-${quarterNum}`,
        name: `Khu phố ${quarterNum}`,
        fullName: `Khu phố ${quarterNum}, Phường Bình Đông, Quận 8, TP. Hồ Chí Minh`,
        level: "KhuPho",
        parentId: binhDong.id,
      },
    });
  }
  console.log("Administrative units seeded.");

  // 2. Seed Accounts with CCCD:
  const users = [
    {
      username: "admin",
      passwordHash: hashPassword("123456"),
      fullName: "Quản Trị Viên Hệ Thống",
      cccd: "079090000001",
      email: "admin@binhdong.gov.vn",
      phone: "0909111222",
      role: "ADMIN",
      department: "Ban Quản trị & Phê duyệt Hệ thống",
      administrativeUnitId: binhDong.id,
    },
    {
      username: "chuyenvien",
      passwordHash: hashPassword("123456"),
      fullName: "Chuyên Viên Xử Lý Hồ Sơ",
      cccd: "079090000002",
      email: "chuyenvien@binhdong.gov.vn",
      phone: "0908333444",
      role: "CHUYEN_VIEN",
      department: "Phòng Tổng hợp & Tiếp nhận Hồ sơ",
      administrativeUnitId: binhDong.id,
    },
    {
      username: "canbo_binhdong",
      passwordHash: hashPassword("canbo123"),
      fullName: "Phạm Văn Bình",
      cccd: "079090000003",
      email: "canbo@binhdong.gov.vn",
      phone: "0907555666",
      role: "CAN_BO",
      department: "Phòng KT-HT & Đô thị",
      administrativeUnitId: binhDong.id,
    },
  ];

  for (const user of users) {
    const { administrativeUnitId, ...userData } = user;
    const createdUser = await prisma.user.upsert({
      where: { username: user.username },
      update: { passwordHash: user.passwordHash, role: user.role, department: user.department },
      create: user,
    });
    console.log(`Upsert User: ${createdUser.username} (${createdUser.fullName}) [CCCD: ${createdUser.cccd}] [Role: ${createdUser.role}]`);
  }

  // 3. Seed Petitions (upsert - không xóa kiến nghị đã nhập thủ công)
  const petitions = [
    {
      petitionCode: "KN2024-001",
      source: "Tiếp xúc cử tri (trước kỳ họp)",
      quarter: "Khu phố 15",
      senderName: "Nguyễn Văn A",
      senderPhone: "0909001111",
      senderAddress: sanitizeAddress("1111 Tạ Quang Bửu"),
      category: "Quản lý đô thị",
      location: "1122 Phạm Thế Hiển, Phường Bình Đông, TP. Hồ Chí Minh (GPS: 10.742300, 106.682100)",
      content: "Cử tri Nguyễn Văn A, cư ngụ tại 1111 Tạ Quang Bửu, Khu phố 15, Phường Bình Đông, kiến nghị về việc sửa chữa hẻm 123 Phạm Thế Hiển. Hiện trạng: mặt đường bê tông bị sụp lún nhiều đoạn, thoát nước kém, gây ngập úng khi mưa lớn, ảnh hưởng đến việc đi lại và sinh hoạt của khoảng 50 hộ dân trong hẻm. Đề nghị UBND Phường khảo sát và lập kế hoạch sửa chữa, nâng cấp mặt đường hẻm, lắp đặt hệ thống thoát nước mới.",
      authority: "UBND phường",
      department: "Phòng KT-HT và Đô thị",
      receivedDate: new Date("2025-12-01T08:00:00Z"),
      deadline: new Date("2025-12-31T17:00:00Z"),
      extendedUntil: null,
      status: "Quá hạn",
      replyDocNumber: "Số 45/BC-UBND",
      replyDocDate: new Date("2025-12-15T08:00:00Z"),
      replyDocLink: "https://example.com/reply-01.pdf",
      reviewStatus: "Chưa giải quyết",
      notes: "UBND Phường đã khảo sát thực tế hẻm 123, xác nhận tình trạng xuống cấp nghiêm trọng. Đã lập dự toán sửa chữa trình UBND Quận 8 xin kinh phí nhưng chưa được phê duyệt. Đã nhắc nhở cấp Quận lần 2.",
    },
    {
      petitionCode: "GS2026-015",
      source: "Sau giám sát",
      quarter: "Khu phố 02",
      senderName: "Trần Thị B",
      senderPhone: "0912345678",
      senderAddress: sanitizeAddress("456 Phạm Thế Hiển"),
      category: "Chế độ chính sách",
      location: "Trường Tiểu học Bình Đông, Phường Bình Đông, TP. Hồ Chí Minh",
      content: "Cử tri Trần Thị B, đại diện Hội Phụ nữ Khu phố 02, phản ánh sau đợt giám sát thực hiện chính sách an sinh xã hội Tết Nguyên Đán 2026. Nội dung: Một số hộ nghèo, hộ cận nghèo tại Khu phố 02 (danh sách 12 hộ đã nộp kèm) chưa nhận được quà Tết theo Quyết định số 08/QĐ-UBND Quận 8 ngày 10/01/2026. Đề nghị UBND Phường rà soát lại danh sách và phối hợp với Phòng LĐ-TB&XH Quận 8 cấp phát kịp thời cho các hộ còn thiếu sót.",
      authority: "UBND phường",
      department: "Phòng Văn hóa - Xã hội",
      receivedDate: new Date("2026-01-15T08:00:00Z"),
      deadline: new Date("2026-02-14T17:00:00Z"),
      extendedUntil: null,
      status: "Đã xong",
      replyDocNumber: "Số 12/BC-UBND",
      replyDocDate: new Date("2026-01-28T08:00:00Z"),
      replyDocLink: "https://example.com/reply-12.pdf",
      reviewStatus: "Hoàn thành",
      notes: "UBND Phường đã rà soát và phối hợp Phòng LĐ-TB&XH Quận 8 cấp phát quà Tết cho toàn bộ 12 hộ theo danh sách. Hoàn tất ngày 28/01/2026. Đã được Admin phê duyệt hoàn tất.",
    },
    {
      petitionCode: "KN2026-042",
      source: "Tiếp xúc cử tri (hàng tuần)",
      quarter: "Khu phố 28",
      senderName: "Lê Văn C",
      senderPhone: "0938765432",
      senderAddress: sanitizeAddress("789 Phạm Hùng"),
      category: "Môi trường",
      location: "Chợ Bình Đông, Phường Bình Đông, TP. Hồ Chí Minh",
      content: "Cử tri Lê Văn C, ngụ 789 Phạm Hùng, Khu phố 28, kiến nghị về tình trạng ô nhiễm môi trường tại khu vực Chợ Bình Đông. Hiện trạng: rác thải sinh hoạt và rác từ hoạt động buôn bán tại chợ bị vứt bừa bãi trên vỉa hè và lòng đường, đặc biệt vào buổi chiều tối sau khi chợ tan. Mùi hôi thối bốc lên gây ảnh hưởng sức khỏe cư dân xung quanh. Đề nghị Phường phối hợp Công ty Dịch vụ Công ích Quận 8 tăng tần suất thu gom rác, lắp đặt thêm thùng rác công cộng và xử lý nghiêm các trường hợp vi phạm vệ sinh môi trường.",
      authority: "UBND phường",
      department: "Phòng KT-HT và Đô thị",
      receivedDate: new Date("2026-01-20T08:00:00Z"),
      deadline: new Date("2026-02-19T17:00:00Z"),
      extendedUntil: null,
      status: "Chờ Admin phê duyệt",
      replyDocNumber: "Số 18/TTr-UBND",
      replyDocDate: null,
      replyDocLink: null,
      reviewStatus: "Mới giải quyết 1 phần",
      notes: "Chuyên viên đã khảo sát thực tế, lập tờ trình đề xuất phương án xử lý gửi UBND Quận 8 và Công ty DVCI Q8. Đang chờ ý kiến chỉ đạo của UBND Quận. Đã lắp thêm 5 thùng rác tạm quanh khu vực chợ.",
    },
    {
      petitionCode: "KN2026-058",
      source: "Tiếp xúc cử tri (trước kỳ họp)",
      quarter: "Khu phố 05",
      senderName: "Phạm Thị D",
      senderPhone: "0976543210",
      senderAddress: sanitizeAddress("234 Bến Bình Đông"),
      category: "An ninh trật tự",
      location: "Hẻm 234 Bến Bình Đông, Phường Bình Đông, TP. Hồ Chí Minh (GPS: 10.743500, 106.680200)",
      content: "Cử tri Phạm Thị D, cư ngụ tại 234 Bến Bình Đông, Khu phố 05, phản ánh về tình trạng mất an ninh trật tự tại khu vực hẻm 234. Vào ban đêm (từ 22h-02h), thường xuyên có nhóm thanh niên tụ tập uống rượu bia, gây tiếng ồn lớn, xả rác bừa bãi. Đã xảy ra 2 vụ trộm xe máy trong tháng 01/2026. Đề nghị UBND Phường phối hợp Công an Phường tăng cường tuần tra, lắp đặt camera an ninh và đèn chiếu sáng tại các điểm nóng trong hẻm.",
      authority: "UBND phường",
      department: "Công an Phường Bình Đông",
      receivedDate: new Date("2026-02-05T08:00:00Z"),
      deadline: new Date("2026-03-07T17:00:00Z"),
      extendedUntil: null,
      status: "Đang xử lý",
      replyDocNumber: null,
      replyDocDate: null,
      replyDocLink: null,
      reviewStatus: "Chưa giải quyết",
      notes: "Công an Phường đã tiếp nhận phản ánh, tăng cường tuần tra khu vực vào ban đêm. Đang phối hợp Ban Quản trị Khu phố 05 để khảo sát lắp camera.",
    },
    {
      petitionCode: "KN2026-063",
      source: "Đơn thư gửi trực tiếp",
      quarter: "Khu phố 10",
      senderName: "Võ Minh E",
      senderPhone: "0965432100",
      senderAddress: sanitizeAddress("567 Dương Bá Trạc"),
      category: "Đất đai",
      location: "567 Dương Bá Trạc, Phường Bình Đông, TP. Hồ Chí Minh (GPS: 10.744100, 106.681500)",
      content: "Ông Võ Minh E, ngụ 567 Dương Bá Trạc, Khu phố 10, gửi đơn kiến nghị về tranh chấp ranh giới đất giữa thửa đất số 45, tờ bản đồ số 12 (thuộc sở hữu ông E) và thửa đất liền kề số 46 (thuộc sở hữu hộ ông Nguyễn Văn F). Ông E cho rằng hàng rào của hộ liền kề đã lấn sang phần đất của ông khoảng 0.5m dọc theo chiều dài 15m. Đề nghị UBND Phường phối hợp Chi nhánh Văn phòng Đăng ký đất đai Quận 8 đo đạc lại ranh giới và hòa giải tranh chấp theo quy định.",
      authority: "UBND phường",
      department: "Tư pháp - Hộ tịch",
      receivedDate: new Date("2026-02-10T08:00:00Z"),
      deadline: new Date("2026-03-12T17:00:00Z"),
      extendedUntil: new Date("2026-04-12T17:00:00Z"),
      status: "Đang xử lý",
      replyDocNumber: "Số 22/GM-UBND",
      replyDocDate: new Date("2026-02-20T08:00:00Z"),
      replyDocLink: null,
      reviewStatus: "Mới giải quyết 1 phần",
      notes: "Đã gửi giấy mời 2 bên tranh chấp đến hòa giải tại UBND Phường ngày 25/02/2026. Buổi hòa giải lần 1 chưa thành công do hộ ông F vắng mặt. Đã gia hạn thêm 30 ngày. Đang chờ Chi nhánh VPĐKĐĐ Q8 bố trí đo đạc.",
    },
    {
      petitionCode: "KN2026-071",
      source: "Tiếp xúc cử tri (hàng tuần)",
      quarter: "Khu phố 18",
      senderName: "Huỳnh Thị G",
      senderPhone: null,
      senderAddress: sanitizeAddress("890 Phạm Thế Hiển"),
      category: "Chế độ chính sách",
      location: "UBND Phường Bình Đông, TP. Hồ Chí Minh",
      content: "Bà Huỳnh Thị G, 72 tuổi, ngụ 890 Phạm Thế Hiển, Khu phố 18, kiến nghị về việc chậm chi trả trợ cấp xã hội hàng tháng cho người cao tuổi theo Nghị định 20/2021/NĐ-CP. Bà G thuộc diện hộ nghèo, đủ 80 tuổi (sinh năm 1954), đã được công nhận hưởng trợ cấp từ tháng 06/2025 nhưng đến nay vẫn chưa nhận được khoản trợ cấp tháng 12/2025 và tháng 01/2026. Đề nghị UBND Phường kiểm tra và đôn đốc Phòng LĐ-TB&XH Quận 8 giải quyết chi trả kịp thời.",
      authority: "UBND phường",
      department: "Phòng Văn hóa - Xã hội",
      receivedDate: new Date("2026-02-15T08:00:00Z"),
      deadline: new Date("2026-03-17T17:00:00Z"),
      extendedUntil: null,
      status: "Đang xử lý",
      replyDocNumber: null,
      replyDocDate: null,
      replyDocLink: null,
      reviewStatus: "Chưa giải quyết",
      notes: "Phường đã có công văn gửi Phòng LĐ-TB&XH Quận 8 đề nghị xác minh và giải quyết chi trả cho bà G. Đang chờ phản hồi từ Quận.",
    },
  ];

  for (const item of petitions) {
    await prisma.petition.upsert({
      where: { petitionCode: item.petitionCode },
      update: item,
      create: item,
    });
    console.log(`Upsert petition: ${item.petitionCode} - ${item.senderName}`);
  }

  console.log("Seeding finished successfully!");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
