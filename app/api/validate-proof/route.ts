import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const FALLBACK_MESSAGES = [
  "this looks like it counts :)",
  "nice, i think you did it",
  "that works for me :)",
  "yeah, this counts",
  "looks good to me :)",
];

export async function POST(request: NextRequest) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  try {
    const { imageBase64, thingyText } = await request.json();

    if (!imageBase64) {
      return NextResponse.json({ message: FALLBACK_MESSAGES[0] });
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 60,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/jpeg",
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: `The user just completed a small task: "${thingyText}".

Look at their photo. Respond with ONE short message (max 10 words, lowercase, casual):
- If the photo seems related to or shows evidence of the task → a warm positive message. Examples: "this looks right 🐱", "nice, i think you did it", "yeah that counts :)"
- If the photo seems unrelated or unclear → a gentle soft question, never rejecting. Examples: "hmm, is this for ${thingyText}? that's okay either way 🐱", "not sure but this still counts :)"

Never be harsh. Never make the user feel bad. Always be warm and supportive. Just output the message, nothing else.`,
            },
          ],
        },
      ],
    });

    const text =
      message.content[0]?.type === "text"
        ? message.content[0].text.trim()
        : FALLBACK_MESSAGES[0];

    return NextResponse.json({ message: text });
  } catch (err) {
    console.error("Validate proof error:", err);
    const fallback = FALLBACK_MESSAGES[Math.floor(Math.random() * FALLBACK_MESSAGES.length)];
    return NextResponse.json({ message: fallback });
  }
}
