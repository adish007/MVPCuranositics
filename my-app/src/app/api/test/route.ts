import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ 
    message: "API is working!",
    timestamp: new Date().toISOString(),
    env: {
      hasVitalKey: !!process.env.VITAL_API_KEY,
      nodeEnv: process.env.NODE_ENV
    }
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    return NextResponse.json({ 
      message: "POST is working!",
      receivedData: body,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({ 
      error: "Failed to parse JSON",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 400 });
  }
} 