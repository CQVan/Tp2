// app/match/page.tsx
import { NextResponse } from "next/server";

export const dynamic = "force-static";

export default async function Match() {
  return new NextResponse(null, {
    status: 301,
    headers: {
      Location: "/matchmaking",
    },
  });
}
