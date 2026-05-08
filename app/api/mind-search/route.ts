import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

interface NotePayload {
  text: string | null;
  photo_url: string | null;
  created_at: string;
}

export async function POST(request: NextRequest) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  try {
    const { query, notes } = (await request.json()) as {
      query: string;
      notes: NotePayload[];
    };

    if (!query) {
      return NextResponse.json({ error: "No query" }, { status: 400 });
    }

    const notesText = notes
      .map((n, i) => {
        const date = new Date(n.created_at).toLocaleDateString("es-MX", {
          day: "numeric",
          month: "short",
        });
        const hasPhoto = n.photo_url ? " 📷" : "";
        const content = n.text ?? "(sin texto)";
        return `[${i + 1}] ${date}${hasPhoto} — ${content}`;
      })
      .join("\n");

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 250,
      system: `Eres un asistente amable dentro de Little Minder, una app para personas con ADHD.
Ayudas al usuario a encontrar información en sus notas mentales.
Responde de forma cálida, conversacional y muy breve (máximo 2 oraciones).
Si encuentras información relevante, cítala naturalmente.
Si no hay nada relevante, dilo con dulzura, sin dramatizar.
Responde en el mismo idioma de la pregunta.`,
      messages: [
        {
          role: "user",
          content: `Mis notas:\n${notesText || "(todavía no tienes notas)"}\n\nPregunta: ${query}`,
        },
      ],
    });

    const answer =
      response.content[0]?.type === "text" ? response.content[0].text : "";
    return NextResponse.json({ answer });
  } catch (err) {
    console.error("Mind search error:", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
