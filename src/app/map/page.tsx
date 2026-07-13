import { prisma } from "@/lib/db";
import MapClient from "./MapClient";

export const revalidate = 0;

export default async function MapPage() {
  const petitions = await prisma.petition.findMany({
    orderBy: {
      receivedDate: "desc",
    },
  });

  const serializedPetitions = petitions.map((p) => ({
    ...p,
    receivedDate: p.receivedDate.toISOString(),
    deadline: p.deadline.toISOString(),
    extendedUntil: p.extendedUntil ? p.extendedUntil.toISOString() : null,
    replyDocDate: p.replyDocDate ? p.replyDocDate.toISOString() : null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));

  return <MapClient initialPetitions={serializedPetitions} />;
}
