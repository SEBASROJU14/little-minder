"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { EnergyLevel, getRandomCatMessage } from "@/lib/missions";

interface Props {
  energy: EnergyLevel;
  size?: "sm" | "md" | "lg";
  staticMessage?: string;
}

export default function CatDisplay({ energy, size = "md", staticMessage }: Props) {
  const [message, setMessage] = useState(staticMessage ?? "");

  useEffect(() => {
    if (!staticMessage) {
      setMessage(getRandomCatMessage(energy));
    }
  }, [energy, staticMessage]);

  const sizes = {
    sm: 80,
    md: 120,
    lg: 160,
  };

  const px = sizes[size];

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="animate-float">
        <Image
          src="/cat.png"
          alt="Little Minder cat"
          width={px}
          height={px}
          className="object-contain drop-shadow-sm"
          priority
        />
      </div>
      {message && (
        <div className="bg-white rounded-2xl px-5 py-3 shadow-sm max-w-[220px] text-center">
          <p className="text-carbon text-sm font-medium leading-snug">{message}</p>
        </div>
      )}
    </div>
  );
}
