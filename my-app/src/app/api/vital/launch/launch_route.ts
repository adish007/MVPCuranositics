
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabaseclient";

export async function POST(req: NextRequest) {
  try {
    const vitalApiKey = process.env.VITAL_API_KEY;
    
    if (!vitalApiKey) {
      console.error("❌ VITAL_API_KEY is not set in environment variables");
      return NextResponse.json({ 
        error: "VITAL_API_KEY is not configured",
        message: "Please set the VITAL_API_KEY environment variable"
      }, { status: 500 });
    }
    
    console.log("🔥 Runtime VITAL_API_KEY exists:", !!vitalApiKey);

    // Extract userId from multiple possible sources
    let userId;
    
    // Try to get from request body first
    try {
      const body = await req.json();
      userId = body.userId;
      console.log("Body userId:", userId);
    } catch (e) {
      console.log("No JSON body found, checking other sources");
    }
    
    // Try to extract userId from Supabase JWT token in Authorization header
    if (!userId) {
      const authHeader = req.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        try {
          // Verify and decode the Supabase token
          const { data: { user }, error } = await supabase.auth.getUser(token);
          if (!error && user) {
            userId = user.id;
            console.log("Extracted userId from JWT:", userId);
          }
        } catch (error) {
          console.error("Failed to decode JWT token:", error);
        }
      }
    }
    
    // Try to extract from patient_session cookie
    if (!userId) {
      const patientSession = req.cookies.get("patient_session")?.value;
      if (patientSession) {
        userId = patientSession;
        console.log("Using patient_session as userId:", userId);
      }
    }
    
    // If not in body, try other cookie names
    if (!userId) {
      userId = req.cookies.get("userId")?.value || 
               req.cookies.get("user_id")?.value || 
               req.cookies.get("uid")?.value ||
               req.cookies.get("session")?.value;
    }
    
    // If still not found, try headers
    if (!userId) {
      userId = req.headers.get("x-user-id") || req.headers.get("user-id");
    }
    
    // Debug: log all available sources
    console.log("All cookies:", Object.fromEntries(req.cookies.getAll().map(c => [c.name, c.value])));
    console.log("Authorization header present:", !!req.headers.get("authorization"));
    console.log("Vital API Key exists:", !!vitalApiKey);
    console.log("Final User ID:", userId);
    
    if (!userId) {
      return NextResponse.json({ 
        error: "Missing user ID. Please ensure you're authenticated or provide userId in request body.",
        debug: {
          cookiesFound: req.cookies.getAll().map(c => c.name),
          hasAuthHeader: !!req.headers.get("authorization"),
          bodyParsed: false
        }
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
        error: "Failed to create/resolve Vital user", 
        detail: userJson,
        status: userRes.status 
      }, { status: 500 });
    }

    if (!vitalUserId) {
      console.error("Failed to get Vital user ID:", userJson);
      return NextResponse.json({ 
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
        error: "Failed to generate link token", 
        detail: tokenJson,
        status: tokenRes.status 
      }, { status: 500 });
    }

    if (!tokenJson.link_web_url) {
      console.error("No link_web_url in response:", tokenJson);
      return NextResponse.json({ 
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
      linkUrl: tokenJson.link_web_url,
      vitalUserId,
      success: true 
    });
    
  } catch (error: any) {
    console.error("Error in vital launch:", error);
    return NextResponse.json({ 
      error: "Internal server error", 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}