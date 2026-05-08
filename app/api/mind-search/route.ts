import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

interface NotePayload {
  text: string | null;
  photo_url: string | null;
  created_at: string;
}

export const maxDuration = 30;

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

    console.log(`[mind-search] query: "${query}" | notes received: ${notes?.length ?? 0}`);
    console.log("[mind-search] notes array:", JSON.stringify(notes));
    if (notes?.length) {
      notes.forEach((n, i) =>
        console.log(`  [${i + 1}] ${n.created_at} — ${String(n.text).slice(0, 80)}`)
      );
    }

    const notesText = notes
      .map((n, i) => {
        const date = new Date(n.created_at).toLocaleDateString("es-MX", {
          day: "numeric",
          month: "short",
        });
        const hasPhoto = n.photo_url ? " 📷" : "";
        const content = n.text ?? "(sin texto)";
        return `[${i + 1}] ${date}${hasPhoto}\n${content}`;
      })
      .join("\n\n");

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 400,
      system: `Eres un asistente dentro de Little Minder, una app para personas con ADHD.
Tu única tarea es buscar en las notas del usuario y responder su pregunta.
Las notas están ordenadas de más reciente a más antigua. Prioriza siempre la más reciente sobre el mismo tema.
Busca de forma flexible: coincidencias parciales, sinónimos, ideas relacionadas — no solo palabras exactas.
Si una nota menciona algo relacionado con la pregunta aunque sea indirectamente, inclúyela.
Cita el texto relevante de las notas directamente en tu respuesta.
Responde breve (máximo 3 oraciones), cálido y en el mismo idioma de la pregunta.
Si genuinamente no hay nada relacionado, dilo con una sola oración corta.`,
      messages: [
        {
          role: "user",
          content: `Mis notas (${notes.length} en total):\n\n${notesText || "(sin notas)"}\n\nPregunta: ${query}`,
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
