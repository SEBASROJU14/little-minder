import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  try {
    const formData = await request.formData();
    const audio = formData.get("audio") as File | null;

    if (!audio) {
      return NextResponse.json({ error: "No audio provided" }, { status: 400 });
    }

    const filename = audio instanceof File ? audio.name : "recording.m4a";
    const file = new File([audio], filename, { type: audio.type || "audio/mp4" });

    const transcription = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      language: "es",
    });

    return NextResponse.json({ text: transcription.text });
  } catch (err) {
    console.error("Transcribe note error:", err);
    return NextResponse.json({ error: "Transcription failed" }, { status: 500 });
  }
}
