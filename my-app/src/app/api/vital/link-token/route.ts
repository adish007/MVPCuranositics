import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { provider, userId } = await req.json();  // 🔁 Accept dynamic user ID
    if (!provider || !userId) {
      return NextResponse.json({ error: "Missing provider or userId" }, { status: 400 });
    }

    console.log("Using user:", userId, "| Provider:", provider);

    // Step 1: Create or resolve Vital user
    const userCreateRes = await fetch("https://api.tryvital.io/v2/user", {
      method: "POST",
      headers: {
        "X-Vital-API-Key": process.env.VITAL_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ client_user_id: userId }),
    });

    const userJson = await userCreateRes.json();
    let resolvedUserId: string | null = null;

    if (userCreateRes.ok) {
      resolvedUserId = userJson.user_id;
    } else if (userCreateRes.status === 409) {
      resolvedUserId = userJson.detail?.user_id;
    } else {
      return NextResponse.json(
        { error: "User creation failed", detail: userJson },
        { status: 500 }
      );
    }

    if (!resolvedUserId) {
      return NextResponse.json({ error: "Could not resolve user_id" }, { status: 500 });
    }

    // Step 2: Generate link token
    const tokenRes = await fetch("https://api.tryvital.io/v2/link/token", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.VITAL_API_KEY!}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user_id: resolvedUserId }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.link_token) {
      return NextResponse.json({ error: "Token generation failed", detail: tokenData }, { status: 500 });
    }

    // Step 3: Generate OAuth URL
    const oauthRes = await fetch(`https://api.tryvital.io/v2/link/oauth-url/${provider}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.VITAL_API_KEY!}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        vitalLinkToken: tokenData.link_token,
      }),
    });

    const oauthData = await oauthRes.json();
    if (!oauthRes.ok || !oauthData.oauth_url) {
      return NextResponse.json({ error: "OAuth URL failed", detail: oauthData }, { status: 500 });
    }

    return NextResponse.json({ oauthUrl: oauthData.oauth_url });

  } catch (err: any) {
    console.error("Unexpected error:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
