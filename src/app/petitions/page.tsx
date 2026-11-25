import { redirect } from "next/navigation";
import PetitionsListClient from "./PetitionsListClient";
import { getSession } from "@/lib/auth";
import { fetchSerializedPetitions } from "@/lib/petitions";

export const revalidate = 0;

export default async function PetitionsListPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const serializedPetitions = await fetchSerializedPetitions();

  return (
    <PetitionsListClient
      initialPetitions={serializedPetitions}
      currentUserRole={session.role}
    />
  );
}
