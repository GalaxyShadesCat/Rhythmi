import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  const { messages } = body;

  if (!messages || !Array.isArray(messages)) {
    return NextResponse.json(
      { error: "Missing or invalid messages" },
      { status: 400 }
    );
  }

  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  if (!OPENROUTER_API_KEY) {
    return NextResponse.json(
      { error: "Missing OpenRouter API key" },
      { status: 500 }
    );
  }

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://rhythmi.vercel.app/",
        "X-Title": "Health Insights Assistant",
      },
      body: JSON.stringify({
        model: "microsoft/mai-ds-r1:free",
        messages,
      }),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("[CHATBOT_API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch from OpenRouter" },
      { status: 502 }
    );
  }
}
