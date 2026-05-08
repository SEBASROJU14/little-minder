import { NextRequest, NextResponse } from "next/server";

interface NotePayload {
  text: string | null;
  photo_url: string | null;
  created_at: string;
}

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  console.log("[mind-search] ANTHROPIC_API_KEY exists:", !!process.env.ANTHROPIC_API_KEY);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("[mind-search] ANTHROPIC_API_KEY is not set");
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  try {
    const { query, notes } = (await request.json()) as {
      query: string;
      notes: NotePayload[];
    };

    console.log("[mind-search] query:", query);
    console.log("[mind-search] notes received:", notes?.length);

    if (!query) {
      return NextResponse.json({ error: "No query" }, { status: 400 });
    }

    console.log(`[mind-search] query: "${query}" | notes received: ${notes?.length ?? 0}`);
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

    const body = JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 400,
      system: `Eres un asistente dentro de Little Minder, una app para personas con ADHD.
Tu única tarea es buscar en las notas del usuario y responder su pregunta.
Las notas están ordenadas de MÁS RECIENTE a MÁS ANTIGUA. La nota [1] es SIEMPRE la más reciente.
Cuando el usuario pregunte sobre algo, responde ÚNICAMENTE con la información de la nota más reciente que sea relevante. IGNORA las notas más antiguas sobre el mismo tema.
Busca de forma flexible: coincidencias parciales, sinónimos, ideas relacionadas — no solo palabras exactas.
Cita el texto relevante de la nota más reciente directamente en tu respuesta.
Responde breve (máximo 3 oraciones), cálido y en el mismo idioma de la pregunta.
Si genuinamente no hay nada relacionado, dilo con una sola oración corta.`,
      messages: [
        {
          role: "user",
          content: `Mis notas (${notes.length} en total):\n\n${notesText || "(sin notas)"}\n\nPregunta: ${query}`,
        },
      ],
    });

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body,
    });

    const rawBody = await res.text();
    console.log(`[mind-search] Anthropic status: ${res.status}, body: ${rawBody.slice(0, 300)}`);

    if (!res.ok) {
      return NextResponse.json(
        { error: `Anthropic ${res.status}: ${rawBody.slice(0, 200)}` },
        { status: 502 }
      );
    }

    const data = JSON.parse(rawBody) as { content: { type: string; text: string }[] };
    const answer = data.content[0]?.type === "text" ? data.content[0].text : "";
    return NextResponse.json({ answer });
  } catch (err) {
    const e = err instanceof Error ? err : new Error(String(err));
    console.error("[mind-search] Unexpected error:", e.name, e.message, e.cause);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
