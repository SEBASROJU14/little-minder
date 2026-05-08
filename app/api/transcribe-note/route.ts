import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(request: NextRequest) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  try {
    const formData = await request.formData();
    const audio = formData.get("audio") as Blob | null;

    if (!audio) {
      return NextResponse.json({ error: "No audio provided" }, { status: 400 });
    }

    const file = new File([audio], "recording.webm", { type: audio.type || "audio/webm" });

    const transcription = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      // No language — auto-detects Spanish/English/etc.
    });

    return NextResponse.json({ text: transcription.text });
  } catch (err) {
    console.error("Transcribe note error:", err);
    return NextResponse.json({ error: "Transcription failed" }, { status: 500 });
  }
}
