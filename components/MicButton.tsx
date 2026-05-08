"use client";

import { useState, useRef } from "react";

interface Props {
  onTranscription: (text: string) => void;
  disabled?: boolean;
  endpoint?: string;
  size?: "md" | "lg";
}

type RecordingState = "idle" | "recording" | "loading" | "error";

function getSupportedMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  return types.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

export default function MicButton({ onTranscription, disabled, endpoint = "/api/transcribe", size = "md" }: Props) {
  const [state, setState] = useState<RecordingState>("idle");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = () => {
    void navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        const mimeType = getSupportedMimeType();
        const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        mediaRecorderRef.current = mediaRecorder;
        chunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        mediaRecorder.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());

          const blob = new Blob(chunksRef.current, { type: mimeType || "audio/mp4" });
        chunksRef.current = [];

        console.log("[MicButton] onstop — mimeType:", mimeType, "size:", blob.size);

        if (blob.size < 1000) {
          console.warn("[MicButton] blob too small, skipping");
          setState("error");
          setTimeout(() => setState("idle"), 2000);
          return;
        }

        // Derive extension from actual mimeType so Whisper can decode the container.
        // iOS records audio/mp4 → must send as .m4a (not .webm).
        const ext = mimeType.includes("mp4") || mimeType.includes("m4a") || mimeType === ""
          ? "m4a"
          : mimeType.includes("ogg") ? "ogg"
          : "webm";

        setState("loading");
        const form = new FormData();
        form.append("audio", blob, `recording.${ext}`);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 25_000);

        fetch(endpoint, { method: "POST", body: form, signal: controller.signal })
          .then((r) => {
            clearTimeout(timeout);
            return r.json() as Promise<{ text?: string; error?: string }>;
          })
          .then(({ text }) => {
            if (text?.trim()) {
              onTranscription(text.trim());
            } else {
              setState("error");
            }
          })
          .catch((err: Error) => {
            clearTimeout(timeout);
            console.error("[MicButton] fetch error:", err.name === "AbortError" ? "timeout" : err.message);
            setState("error");
          })
          .finally(() => setState("idle"));
      };

      mediaRecorder.start();
      setState("recording");
    })
    .catch((err: unknown) => {
      console.error("[MicButton] getUserMedia error:", err);
      setState("error");
      setTimeout(() => setState("idle"), 2000);
    });
  };

  const stopRecording = () => mediaRecorderRef.current?.stop();

  const handlePress = () => {
    if (state === "idle") startRecording();
    else if (state === "recording") stopRecording();
  };

  const sizeClass = size === "lg" ? "w-20 h-20 text-3xl" : "w-14 h-14 text-xl";

  return (
    <button
      type="button"
      onClick={handlePress}
      disabled={disabled || state === "loading"}
      className={`
        ${sizeClass} rounded-full flex items-center justify-center
        shadow-sm transition-all duration-200 active:scale-95 shrink-0
        ${state === "recording"
          ? "bg-rose-soft scale-110 shadow-md"
          : state === "loading"
          ? "bg-cream-dark opacity-60 cursor-wait"
          : state === "error"
          ? "bg-rose-soft"
          : "bg-lavender-light hover:bg-lavender"
        }
      `}
      aria-label={state === "recording" ? "stop recording" : "start recording"}
    >
      {state === "loading" ? (
        <span className="w-4 h-4 border-2 border-carbon-soft border-t-transparent rounded-full animate-spin" />
      ) : state === "recording" ? (
        <span className="w-3 h-3 bg-red-500 rounded-sm" />
      ) : (
        <MicIcon />
      )}
    </button>
  );
}

function MicIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}
