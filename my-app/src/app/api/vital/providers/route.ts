import { NextResponse } from "next/server";

const VITAL_API_KEY = process.env.VITAL_API_KEY;

export async function GET() {
  if (!VITAL_API_KEY) {
    console.error("❌ Missing VITAL_API_KEY in environment variables");
    return NextResponse.json({ error: "Missing API key" }, { status: 500 });
  }

  try {
    const response = await fetch("https://api.tryvital.io/v2/providers", {  // 🔁 switched to production
      headers: {
        "X-Vital-API-Key": VITAL_API_KEY,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    if (!Array.isArray(data)) {
      return NextResponse.json([], { status: 200 });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error("❌ Exception fetching providers:", err);
    return NextResponse.json([], { status: 500 });
  }
}
