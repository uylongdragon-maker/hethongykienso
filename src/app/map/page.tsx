import { redirect } from "next/navigation";
import MapClient from "./MapClient";
import { getSession } from "@/lib/auth";
import { fetchSerializedPetitions } from "@/lib/petitions";

export const revalidate = 0;

export default async function MapPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const serializedPetitions = await fetchSerializedPetitions();

  return <MapClient initialPetitions={serializedPetitions} />;
}
