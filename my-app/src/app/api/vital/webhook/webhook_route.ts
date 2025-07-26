// /app/api/vital/webhook/route.ts
import { NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabaseclient";

export async function POST(req: Request) {
  const body = await req.json();
  const eventType: string = body.event_type;
  const userId: string = body.user_id;  // Use the same user ID
  const data: any = body.data || {};
  const timestamp = new Date().toISOString();

  if (!eventType || !userId || !data) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const category = eventType.split(".")[2] || "unknown";
    
    // Get existing wearable data
    const { data: existingData, error: fetchError } = await supabase
      .from('wearables')
      .select('*')
      .eq('user_id', userId)
      .single();

    const currentData = existingData || {};
    
    const updatedData: Record<string, any> = {
      user_id: userId,
      last_event: eventType,
      last_updated: timestamp,
      updated_at: timestamp,
    };

    const extractValue = (key: string) => {
      const first = data.data?.[0];
      if (first?.value != null) updatedData[key] = first.value;
    };

    switch (category) {
      case "steps":
        extractValue("steps");
        break;
      case "sleep":
        if (typeof data.total === "number") {
          updatedData.sleep_hours = Math.round((data.total / 3600) * 10) / 10;
        }
        if (data.hr_average != null) updatedData.heart_rate = data.hr_average;
        break;
      case "heart_rate_alert":
        extractValue("heart_rate");
        break;
      case "blood_pressure": {
        const bpData = data.data?.[0];
        if (bpData) {
          updatedData.blood_pressure_systolic = bpData.systolic ?? currentData?.blood_pressure_systolic ?? null;
          updatedData.blood_pressure_diastolic = bpData.diastolic ?? currentData?.blood_pressure_diastolic ?? null;
        }
        break;
      }
      case "basal_body_temperature":
        extractValue("basal_body_temperature");
        break;
      case "body_mass_index":
        extractValue("body_mass_index");
        break;
      case "glucose":
        extractValue("glucose");
        break;
      case "stress_level":
        extractValue("stress_level");
        break;
      case "workout_duration":
        extractValue("workout_duration");
        break;
      case "body_temperature":
        extractValue("body_temperature");
        break;
      case "calories": 
      case "calories_active":
        extractValue("calories");
        break;
      default:
        updatedData[`unparsed_${category}`] = data;
        break;
    }

    // Upsert the data (insert if not exists, update if exists)
    const { error: upsertError } = await supabase
      .from('wearables')
      .upsert(updatedData, { onConflict: 'user_id' });

    if (upsertError) {
      console.error("Error upserting wearable data:", upsertError);
      return NextResponse.json({ error: "Failed to store data" }, { status: 500 });
    }

    console.log(`✅ Stored ${category} data for user ${userId}`);
    return NextResponse.json({ message: `Stored ${category} for ${userId}` });
  } catch (err) {
    console.error("🔥 Error handling webhook:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
