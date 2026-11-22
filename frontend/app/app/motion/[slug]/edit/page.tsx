"use client";

import { useParams } from "next/navigation";
import { MotionEditor, type EdFilm } from "@/components/app/motion-editor";
import { API, useApi } from "@/lib/api";

/* A motion film in the editor: every scene, picture, still, word timing and voice the agent made (components/app/motion-editor.tsx). */

const ORIGIN = API.replace(/\/api\/?$/, "");

export default function MotionFilmEditor() {
  const { slug } = useParams<{ slug: string }>();
  const { data } = useApi<EdFilm>(`/argon/${slug}`, { refreshInterval: (d) => (d && !d.running ? 0 : 2000) });
  if (!data) return <div className="grid h-dvh place-items-center bg-[#efefea] text-[15px] text-[#8a857f]">Opening the editor…</div>;
  return <MotionEditor film={data} origin={ORIGIN} back={`/app/motion/${slug}`} />;
}
