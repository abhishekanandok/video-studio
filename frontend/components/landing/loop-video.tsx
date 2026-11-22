"use client";

import { useEffect, useRef, type CSSProperties } from "react";

/** A silent looping video that really autoplays. React does not render the `muted` attribute into the server HTML,
 *  so browsers treat the element as unmuted and block autoplay; this sets it on the element and starts playback. */
export function LoopVideo({ src, poster, className = "", style }: { src: string; poster?: string; className?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    const play = () => { v.play().catch(() => {}); };
    play();
    document.addEventListener("visibilitychange", play);
    return () => document.removeEventListener("visibilitychange", play);
  }, [src]);
  return <video ref={ref} src={src} poster={poster} autoPlay muted loop playsInline preload="auto" className={className} style={style} />;
}
