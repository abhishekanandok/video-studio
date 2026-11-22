// The entry the fast export renders stills from (notes-stills.mjs): only the Notes composition, so a still loads only
// its own fonts, not every composition's (250 font requests a still once ran Windows out of connections, 2026-10-07).
import { Composition, registerRoot } from "remotion";
import { Notes, FPS as NOTES_FPS, notesFrames, type NotesProps } from "./notes/Notes";

const NotesRoot: React.FC = () => (
  <Composition
    id="Notes"
    component={Notes}
    fps={NOTES_FPS}
    width={1920}
    height={1080}
    defaultProps={{ kind: "slide", index: 1, total: 2, title: "", audio: "", seconds: 4, speed: 1, line_at: [], bullet_at: [] } as NotesProps}
    calculateMetadata={({ props }) => ({ durationInFrames: notesFrames(props) })}
  />
);

registerRoot(NotesRoot);
