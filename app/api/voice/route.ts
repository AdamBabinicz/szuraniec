import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GROQ_API_KEY is not configured on server." },
        { status: 500 },
      );
    }

    const formData = await req.formData();
    const audioFile = formData.get("file") as Blob | null;

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided." },
        { status: 400 },
      );
    }

    // Przygotowanie zapytania do oficjalnego OpenAI-compatible endpointu Groq Whisper
    const groqFormData = new FormData();
    groqFormData.append("file", audioFile, "audio.webm");
    groqFormData.append("model", "whisper-large-v3-turbo");
    groqFormData.append("temperature", "0");
    groqFormData.append("response_format", "json");

    const response = await fetch(
      "https://api.groq.com/openai/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: groqFormData,
      },
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("[Voice API] Groq error:", response.status, errText);
      return NextResponse.json(
        { error: `Groq Whisper failed: ${response.statusText}` },
        { status: response.status },
      );
    }

    const data = (await response.json()) as { text?: string };
    const transcript = data.text || "";

    return NextResponse.json({ transcript });
  } catch (error: any) {
    console.error("[Voice API] Internal error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 },
    );
  }
}
