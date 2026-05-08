"use client";

import { useState, useRef } from "react";

interface Props {
  onTranscription: (text: string) => void;
  disabled?: boolean;
}

type RecordingState = "idle" | "recording" | "loading" | "error";

export default function MicButton({ onTranscription, disabled }: Props) {
  const [state, setState] = useState<RecordingState>("idle");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4",
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setState("loading");
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });

        try {
          const formData = new FormData();
          formData.append("audio", blob, "recording.webm");
          const res = await fetch("/api/transcribe", { method: "POST", body: formData });
          const data = await res.json();
          if (data.text) onTranscription(data.text);
          else setState("error");
        } catch {
          setState("error");
        } finally {
          setState("idle");
        }
      };

      mediaRecorder.start();
      setState("recording");
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 2000);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
  };

  const handlePress = () => {
    if (state === "idle") startRecording();
    else if (state === "recording") stopRecording();
  };

  return (
    <button
      type="button"
      onClick={handlePress}
      disabled={disabled || state === "loading"}
      className={`
        w-14 h-14 rounded-full flex items-center justify-center text-xl
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
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}
