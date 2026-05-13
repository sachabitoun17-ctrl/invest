import { prisma } from "@/lib/db";
import { PropertyWithVotes } from "@/types/property";
import HomeClient from "./HomeClient";

export const dynamic = "force-dynamic";

export default async function Home() {
  let initialProperties: PropertyWithVotes[] = [];
  try {
    const raw = await prisma.property.findMany({
      include: { votes: true },
      orderBy: { createdAt: "desc" },
    });
    initialProperties = JSON.parse(JSON.stringify(raw)) as PropertyWithVotes[];
  } catch {
    initialProperties = [];
  }

  return <HomeClient initialProperties={initialProperties} />;
}
