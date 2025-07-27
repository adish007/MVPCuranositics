import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabaseclient";

export async function POST(req: NextRequest) {
  const { public_token, user_id } = await req.json();
  
  if (!public_token || !user_id) {
    return NextResponse.json({ error: "Missing public_token or user_id" }, { status: 400 });
  }

  try {
    const exchangeResponse = await fetch("https://api.tryvital.io/v2/link/exchange", {
      method: "POST",
      headers: {
        "X-Vital-API-Key": process.env.VITAL_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code: public_token }),
    });

    if (!exchangeResponse.ok) {
      const text = await exchangeResponse.text();
      throw new Error(`Vital API error: ${text}`);
    }

    const data = await exchangeResponse.json();

    // Save to Supabase wearables table
    const { error: upsertError } = await supabase
      .from('wearables')
      .upsert({
        user_id: user_id,
        status: "connected",
        access_token: data.access_token,
        connected_at: new Date().toISOString(),
        vital_user_id: data.user_id
      }, { onConflict: 'user_id' });

    if (upsertError) {
      console.error("Error saving to Supabase:", upsertError);
      return NextResponse.json({ error: "Failed to save connection data" }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      vital_user_id: data.user_id 
    });

  } catch (error: any) {
    console.error("❌ Vital token exchange failed:", error);
    return NextResponse.json({ 
      error: error.message || "Internal Server Error" 
    }, { status: 500 });
  }
}