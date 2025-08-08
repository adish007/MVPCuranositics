
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabaseclient";

export async function POST(req: NextRequest) {
  try {
    const vitalApiKey = process.env.VITAL_API_KEY;
    
    if (!vitalApiKey) {
      console.error("❌ VITAL_API_KEY is not set in environment variables");
      return NextResponse.json({ 
        success: false,
        error: "VITAL_API_KEY is not configured",
        message: "Please set the VITAL_API_KEY environment variable"
      }, { status: 500 });
    }
    
    console.log("🔥 Runtime VITAL_API_KEY exists:", !!vitalApiKey);

    // Extract userId from request body
    const body = await req.json();
    const userId = body.userId;
    
    if (!userId) {
      return NextResponse.json({ 
        success: false,
        error: "Missing user ID. Please provide userId in request body."
      }, { status: 400 });
    }

    console.log("Proceeding with userId:", userId);
    
    // Step 1: Create or resolve user (use same user ID)
    const userRes = await fetch("https://api.tryvital.io/v2/user", {
      method: "POST",
      headers: {
        "X-Vital-API-Key": vitalApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ client_user_id: userId }),
    });

    const userJson = await userRes.json();
    console.log("User creation response:", userRes.status, userJson);
    
    // Handle both new user creation (200) and existing user (409) cases
    let vitalUserId;
    if (userRes.status === 200) {
      vitalUserId = userJson.user_id;
      console.log(`✅ Created Vital user with ID: ${vitalUserId}`);
    } else if (userRes.status === 409) {
      // User already exists, extract from error detail
      vitalUserId = userJson.detail?.user_id || userJson.user_id;
      console.log(`✅ Found existing Vital user with ID: ${vitalUserId}`);
    } else {
      console.error("Unexpected response from Vital user creation:", userRes.status, userJson);
      return NextResponse.json({ 
        success: false,
        error: "Failed to create/resolve Vital user", 
        detail: userJson,
        status: userRes.status 
      }, { status: 500 });
    }

    if (!vitalUserId) {
      console.error("Failed to get Vital user ID:", userJson);
      return NextResponse.json({ 
        success: false,
        error: "Unable to resolve Vital user ID", 
        detail: userJson 
      }, { status: 500 });
    }
    
    console.log("Vital User ID:", vitalUserId);

    // Step 2: Generate link token
    const tokenRes = await fetch("https://api.tryvital.io/v2/link/token", {
      method: "POST",
      headers: {
        "X-Vital-API-Key": vitalApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user_id: vitalUserId }),
    });

    const tokenJson = await tokenRes.json();
    console.log("Token generation response:", tokenRes.status, tokenJson);

    if (!tokenRes.ok) {
      console.error("Failed to generate link token:", tokenRes.status, tokenJson);
      return NextResponse.json({ 
        success: false,
        error: "Failed to generate link token", 
        detail: tokenJson,
        status: tokenRes.status 
      }, { status: 500 });
    }

    if (!tokenJson.link_web_url) {
      console.error("No link_web_url in response:", tokenJson);
      return NextResponse.json({ 
        success: false,
        error: "Link URL not provided in response", 
        detail: tokenJson 
      }, { status: 500 });
    }

    // Save Vital data to Supabase
    try {
      const { error: saveError } = await supabase
        .from('wearables')
        .upsert({
          user_id: userId,
          vital_user_id: vitalUserId,
          link_url: tokenJson.link_web_url,
          status: 'link_generated',
          created_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (saveError) {
        console.error("Failed to save vital data:", saveError);
      } else {
        console.log("Vital data saved successfully");
      }
    } catch (saveError) {
      console.error("Failed to save vital data:", saveError);
      // Don't fail the request if saving fails, just log it
    }

    return NextResponse.json({ 
      success: true,
      linkUrl: tokenJson.link_web_url,
      vitalUserId,
    });
    
  } catch (error: any) {
    console.error("Error in vital launch:", error);
    return NextResponse.json({ 
      success: false,
      error: "Internal server error", 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}