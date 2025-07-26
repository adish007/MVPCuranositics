import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    // Simple test response
    return NextResponse.json({ 
      success: true,
      message: "Vital launch endpoint is working!",
      timestamp: new Date().toISOString(),
      env: {
        hasVitalKey: !!process.env.VITAL_API_KEY,
        nodeEnv: process.env.NODE_ENV
      }
    });
  } catch (error: any) {
    console.error("Error in vital launch:", error);
    return NextResponse.json({ 
      error: "Internal server error", 
      message: error.message
    }, { status: 500 });
  }
} 