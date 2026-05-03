"use client";

import { useState, useEffect } from "react";
import { Flame } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const QUOTES = [
  { text: "The obstacle in the path becomes the path. Never forget, within every obstacle is an opportunity to improve our condition.", author: "Marcus Aurelius" },
  { text: "We suffer more often in imagination than in reality.", author: "Seneca" },
  { text: "No man is free who is not master of himself.", author: "Epictetus" },
  { text: "You have power over your mind — not outside events. Realize this, and you will find strength.", author: "Marcus Aurelius" },
  { text: "Waste no more time arguing about what a good man should be. Be one.", author: "Marcus Aurelius" },
  { text: "It is not that we have a short time to live, but that we waste a great deal of it.", author: "Seneca" },
  { text: "He who fears death will never do anything worthy of a living man.", author: "Seneca" },
  { text: "Man is not worried by real problems so much as by his imagined anxieties about real problems.", author: "Epictetus" },
  { text: "The best revenge is not to be like your enemy.", author: "Marcus Aurelius" },
  { text: "Luck is what happens when preparation meets opportunity.", author: "Seneca" },
  { text: "First say to yourself what you would be; and then do what you have to do.", author: "Epictetus" },
  { text: "If it is not right, do not do it. If it is not true, do not say it.", author: "Marcus Aurelius" },
  { text: "He suffers more than necessary, who suffers before it is necessary.", author: "Seneca" },
  { text: "Make the best use of what is in your power, and take the rest as it happens.", author: "Epictetus" },
  { text: "The happiness of your life depends upon the quality of your thoughts.", author: "Marcus Aurelius" },
  { text: "Difficulties strengthen the mind, as labor does the body.", author: "Seneca" },
  { text: "It's not what happens to you, but how you react to it that matters.", author: "Epictetus" },
  { text: "Very little is needed to make a happy life; it is all within yourself, in your way of thinking.", author: "Marcus Aurelius" },
  { text: "Begin at once to live, and count each separate day as a separate life.", author: "Seneca" },
  { text: "Wealth consists not in having great possessions, but in having few wants.", author: "Epictetus" },
  { text: "The soul becomes dyed with the color of its thoughts.", author: "Marcus Aurelius" },
  { text: "As is a tale, so is life: not how long it is, but how good it is, is what matters.", author: "Seneca" },
  { text: "Don't explain your philosophy. Embody it.", author: "Epictetus" },
  { text: "When you arise in the morning, think of what a precious privilege it is to be alive.", author: "Marcus Aurelius" },
  { text: "A gem cannot be polished without friction, nor a man perfected without trials.", author: "Seneca" },
];

export function StoicQuote() {
  const { user } = useAuth();
  const [quote, setQuote] = useState<typeof QUOTES[number] | null>(null);

  useEffect(() => {
    const today = new Date();
    const dayOfYear = Math.floor(
      (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
    );
    const userSeed = user?.id?.charCodeAt(0) ?? 0;
    const index = (dayOfYear + userSeed) % QUOTES.length;
    setQuote(QUOTES[index]);
  }, [user?.id]);

  if (!quote) return null;

  return (
    <div className="relative border-l-[3px] border-l-brand px-4 py-3 overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-amber-500/[0.06] to-transparent"
      />
      <div className="relative">
        <div className="flex items-center gap-2 mb-1">
          <Flame className="h-3.5 w-3.5" style={{ color: "var(--gp-brand)" }} />
          <span className="gp-eyebrow" style={{ color: "var(--gp-brand)" }}>
            Today&apos;s Flame
          </span>
        </div>
        <p className="gp-quote">&ldquo;{quote.text}&rdquo;</p>
        <span className="gp-meta mt-1 block">— {quote.author}</span>
      </div>
    </div>
  );
}
