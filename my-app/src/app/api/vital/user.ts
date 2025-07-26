import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const response = await fetch("https://api.tryvital.io/v2/user", {
      headers: {
        "X-Vital-API-Key": process.env.VITAL_API_KEY!,
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.ok ? 200 : response.status });
  } catch (error: any) {
    console.error("❌ Failed to fetch Vital user list:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
