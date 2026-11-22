/* the showcase borrows the boy and his mother from the back-to-school story (their puppet pieces, copied into story-rigs.ts) */
import type { Rig } from "../../kit";
import { RIGS as STORY } from "./story-rigs";

export const RIGS: Record<string, Rig> = { boy: STORY.boy, mother: STORY.mother };
