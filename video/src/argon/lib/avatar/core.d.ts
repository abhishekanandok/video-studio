// types for core.js, the stick-figure engine ported from MotionAgent (renderer/src/avatar/core.js): plain JavaScript
// that draws one figure as SVG markup for the viewBox VIEWBOX, feet on y = 392
export const VIEWBOX: string;
export const BODY_STYLES: Record<string, { name: string; [k: string]: unknown }>;
export function drawAvatar(opts: {
  data: unknown; avatar?: string | Record<string, unknown>; pose?: string; from?: string | null; blend?: number; t?: number; k?: number; draw?: number;
  talking?: boolean; holdSrc?: string; ink?: string; accent?: string; face?: string; style?: string; dark?: boolean;
  human?: boolean; aim?: [number, number]; look?: number; gaitCycles?: number; beat?: number;
}): string;
export function poseNames(data: unknown): string[];
export function gaitStep(kind: string, leg?: number): number;
