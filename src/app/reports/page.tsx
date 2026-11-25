import { redirect } from "next/navigation";
import ReportsClient from "./ReportsClient";
import { getSession } from "@/lib/auth";
import { fetchSerializedPetitions } from "@/lib/petitions";

export const revalidate = 0;

export default async function ReportsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const serializedPetitions = await fetchSerializedPetitions();

  return <ReportsClient initialPetitions={serializedPetitions} />;
}
