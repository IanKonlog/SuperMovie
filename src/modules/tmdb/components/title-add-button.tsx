"use client";

import { useState } from "react";
import { QuickAdd } from "@/modules/media/components/quick-add";
import type { QuickAddItem } from "@/modules/media/components/quick-add";

export function TitleAddButton({ item }: { item: QuickAddItem }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-white px-5 py-2.5 text-sm font-bold text-black transition hover:bg-white/80"
      >
        ＋ Add to library
      </button>
      {open && <QuickAdd item={item} onClose={() => setOpen(false)} />}
    </>
  );
}
