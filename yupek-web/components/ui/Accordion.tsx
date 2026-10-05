"use client";
import { useState } from "react";
import Icon from "./Icon";

export default function Accordion({ items }: { items: { title: string; body: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="border-t border-brown/15">
      {items.map((it, i) => (
        <div key={it.title} className="border-b border-brown/15">
          <h3>
            <button className="label flex w-full items-center justify-between py-5 text-left" aria-expanded={open === i} aria-controls={`acc-${i}`} onClick={() => setOpen(open === i ? null : i)}>
              {it.title}<Icon name={open === i ? "minus" : "plus"} className="h-4 w-4" />
            </button>
          </h3>
          <div id={`acc-${i}`} role="region" className={`grid transition-all duration-300 ${open === i ? "grid-rows-[1fr] pb-5" : "grid-rows-[0fr]"}`}>
            <p className="overflow-hidden text-sm leading-7 text-brown/80">{it.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
