"use client";

import { useEffect, useState } from "react";
import { AppFrame, PageTitle } from "@/components/app/kit";

/* The motion library, to look at: every motion of the grammar, every card design, every creature in every movement and
   the robots, each a live tile drawn by the real components (video/src/gallery/gallery.tsx, bundled into
   public/library/gallery.js by `node video/gallery-build.mjs`) in any of the 50 looks. It runs in an iframe so the
   film engine's React and fonts stay out of the app; the iframe reports its height so the page scrolls as one. */

export default function LibraryPage() {
  const [h, setH] = useState(1400);
  useEffect(() => {
    const on = (e: MessageEvent) => { if (e.origin === window.location.origin && typeof e.data?.galleryHeight === "number") setH(e.data.galleryHeight); };
    window.addEventListener("message", on);
    return () => window.removeEventListener("message", on);
  }, []);
  return (
    <AppFrame>
      <div className="mx-auto max-w-[1180px]">
        <PageTitle title="Motion" accent="Library" sub="Every motion, box, creature and robot, in the look you pick. Hover one to play it; click to see it big and copy its code." />
        <iframe src="/library/gallery.html" title="Library gallery" className="block w-full border-0" style={{ height: h }} />
      </div>
    </AppFrame>
  );
}
