import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = body.userId;
    
    console.log('🔍 Received request for user:', userId);
    
    // Check if VITAL_API_KEY is set
    const hasVitalKey = !!process.env.VITAL_API_KEY;
    console.log('🔑 VITAL_API_KEY exists:', hasVitalKey);
    
    if (!hasVitalKey) {
      return NextResponse.json({ 
        success: false,
        error: "VITAL_API_KEY is not configured",
        message: "Please set the VITAL_API_KEY environment variable"
      });
    }
    
    // For testing, return a mock response
    return NextResponse.json({ 
      success: true,
      linkUrl: "https://example.com/vital-test-link",
      vitalUserId: "test-vital-user-id",
      message: "Test mode - Vital integration ready",
      timestamp: new Date().toISOString(),
      env: {
        hasVitalKey: hasVitalKey,
        nodeEnv: process.env.NODE_ENV
      }
    });
  } catch (error: any) {
    console.error("❌ Error in vital launch:", error);
    return NextResponse.json({ 
      success: false,
      error: "Internal server error", 
      message: error.message
    }, { status: 500 });
  }
} 