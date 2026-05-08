"use client";

import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import { EnergyLevel, CAT_MESSAGES, CAT_IDLE_MESSAGES } from "@/lib/missions";

const CLICK_MESSAGES = [
  "we can do one small thing",
  "it's okay to go slow",
  "this counts",
  "you're doing great",
  "one step is enough",
  "i'm here with you",
  "no rush, really",
  "even tiny things count",
];

interface Props {
  energy: EnergyLevel | null;
}

export default function CatCompanion({ energy }: Props) {
  const [message, setMessage] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = (msg: string, duration = 3800) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setMessage(msg);
    setVisible(true);
    timerRef.current = setTimeout(() => setVisible(false), duration);
  };

  const showNext = (msgs: string[]) => {
    show(msgs[Math.floor(Math.random() * msgs.length)]);
  };

  const handleCatClick = () => {
    show(CLICK_MESSAGES[Math.floor(Math.random() * CLICK_MESSAGES.length)], 3000);
  };

  useEffect(() => {
    const msgs = energy ? CAT_MESSAGES[energy] : CAT_IDLE_MESSAGES;

    const initial = setTimeout(() => showNext(msgs), 2000);
    const interval = setInterval(() => showNext(msgs), 18000);

    return () => {
      clearTimeout(initial);
      clearInterval(interval);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [energy]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed bottom-5 right-4 z-30 flex flex-col items-end gap-2 pointer-events-none">
      {/* Message bubble */}
      <div
        className="bg-white rounded-2xl rounded-br-sm px-3 py-2 shadow-md max-w-[160px] pointer-events-auto"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(6px)",
          transition: "opacity 0.3s ease, transform 0.3s ease",
        }}
      >
        {message && (
          <p className="text-[11px] text-carbon font-medium leading-snug">{message}</p>
        )}
      </div>

      {/* Cat */}
      <button
        onClick={handleCatClick}
        className="animate-float pointer-events-auto active:scale-95 transition-transform duration-100 outline-none focus:outline-none"
        aria-label="pet the cat"
      >
        <Image
          src="/cat.png"
          alt="Little Minder companion"
          width={120}
          height={120}
          className="object-contain"
          style={{ mixBlendMode: "multiply" }}
        />
      </button>
    </div>
  );
}
