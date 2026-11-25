import OverviewClient from "./OverviewClient";
import { getSession } from "@/lib/auth";
import { fetchSerializedPetitions } from "@/lib/petitions";

export const revalidate = 0;

export default async function DashboardPage() {
  const session = await getSession();

  // Nếu chưa đăng nhập: không truy vấn & không lộ danh sách kiến nghị nội bộ ra phía trình duyệt công khai
  if (!session) {
    return <OverviewClient initialUser={null} initialPetitions={[]} />;
  }

  const serializedPetitions = await fetchSerializedPetitions();
  return <OverviewClient initialUser={session} initialPetitions={serializedPetitions} />;
}
