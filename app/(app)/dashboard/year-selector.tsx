"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

export default function YearSelector({
  years,
  selected,
}: {
  years: number[];
  selected: number;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function handleChange(next: string) {
    const sp = new URLSearchParams(params.toString());
    sp.set("year", next);
    startTransition(() => {
      router.replace(`?${sp.toString()}`, { scroll: false });
    });
  }

  return (
    <div
      className="toggle-group"
      style={{ opacity: pending ? 0.6 : 1, transition: "opacity var(--t-base)" }}
    >
      {years.map((y) => (
        <button
          key={y}
          type="button"
          className={`toggle-btn mono${selected === y ? " active" : ""}`}
          onClick={() => handleChange(String(y))}
          disabled={pending && selected !== y}
        >
          {y}
        </button>
      ))}
    </div>
  );
}
