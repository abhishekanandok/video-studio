import { Composition } from "remotion";
import { Episode } from "./Episode";
import { Explainer, FPS as EX_FPS, layoutEx, type ExProps } from "./explainer/Explainer";
import { Doc, FPS as DOC_FPS, layoutDoc, type DocProps } from "./doc/Doc";
import { FPS, layout, type Props } from "./timing";
import { Paper, FPS as PAPER_FPS, layoutPaper, type PaperProps } from "./paper/Paper";
import { Archive, FPS as ARCHIVE_FPS, layoutArchive, type ArchiveProps } from "./archive/Archive";
import { Board, layoutBoard, type BoardProps } from "./board/Board";
import { Notes, FPS as NOTES_FPS, notesFrames, type NotesProps } from "./notes/Notes";
import { Motion, FPS as MOTION_FPS, layoutMotion, type MotionProps } from "./motion/Motion";
import { UpiDemo, FPS as UPI_FPS, demoFrames, type DemoProps } from "./upidemo/UpiDemo";
import { Scenes, FPS as SCENES_FPS, scenesFrames, type ScenesProps } from "./scenes/Scenes";

const empty: Props = { title: "Episode", tagline: "", lesson: 1, scenes: [] };

const emptyEx: ExProps = { series: "", episode: 1, of: 1, title: "", takeaway: "", next: "", plates: [], beats: [] };

const emptyDoc: DocProps = { title: "", hosts: {}, scenes: [] };

const emptyPaper: PaperProps = { channel: "The AI Age", issue: "No. 01", place: "Bengaluru", date: "September 2026", host: { dir: "hosts/anchor", poses: {} }, scenes: [] };

export const Root = () => (
  <>
  <Composition
    id="Notes"
    component={Notes}
    fps={NOTES_FPS}
    width={1920}
    height={1080}
    defaultProps={{ kind: "slide", index: 1, total: 2, title: "", audio: "", seconds: 4, speed: 1, line_at: [], bullet_at: [] } as NotesProps}
    calculateMetadata={({ props }) => ({ durationInFrames: notesFrames(props) })}
  />
  {/* the agent-designed motion-graphics film (motionfx.py): landscape, and 9:16 for reels */}
  <Composition
    id="Motion"
    component={Motion}
    fps={MOTION_FPS}
    width={1920}
    height={1080}
    defaultProps={{ lines: [] } as MotionProps}
    calculateMetadata={({ props }) => ({ durationInFrames: Math.max(1, layoutMotion(props).total) })}
  />
  <Composition
    id="MotionVertical"
    component={Motion}
    fps={MOTION_FPS}
    width={1080}
    height={1920}
    defaultProps={{ lines: [] } as MotionProps}
    calculateMetadata={({ props }) => ({ durationInFrames: Math.max(1, layoutMotion(props).total) })}
  />
  <Composition
    id="Board"
    component={Board}
    fps={ARCHIVE_FPS}
    width={1920}
    height={1080}
    defaultProps={{ lines: [] } as BoardProps}
    calculateMetadata={({ props }) => ({ durationInFrames: Math.max(1, layoutBoard(props).total) })}
  />
  <Composition
    id="Archive"
    component={Archive}
    fps={ARCHIVE_FPS}
    width={1920}
    height={1080}
    defaultProps={{ lines: [] } as ArchiveProps}
    calculateMetadata={({ props }) => ({ durationInFrames: Math.max(1, layoutArchive(props).total) })}
  />
  <Composition
    id="Paper"
    component={Paper}
    fps={PAPER_FPS}
    width={1920}
    height={1080}
    defaultProps={emptyPaper}
    calculateMetadata={({ props }) => ({ durationInFrames: Math.max(1, layoutPaper(props).total) })}
  />
  <Composition
    id="Doc"
    component={Doc}
    fps={DOC_FPS}
    width={1920}
    height={1080}
    defaultProps={emptyDoc}
    calculateMetadata={({ props }) => ({ durationInFrames: Math.max(1, layoutDoc(props).total) })}
  />
  <Composition
    id="Explainer"
    component={Explainer}
    fps={EX_FPS}
    width={1920}
    height={1080}
    defaultProps={emptyEx}
    calculateMetadata={({ props }) => ({ durationInFrames: layoutEx(props).total })}
  />
  <Composition
    id="Episode"
    component={Episode}
    fps={FPS}
    width={1920}
    height={1080}
    defaultProps={empty}
    calculateMetadata={({ props }) => ({ durationInFrames: layout(props).total })}
  />
  <Composition
    id="UpiDemo"
    component={UpiDemo}
    fps={UPI_FPS}
    width={1920}
    height={1080}
    defaultProps={{ lines: [] } as DemoProps}
    calculateMetadata={({ props }) => ({ durationInFrames: Math.max(1, demoFrames(props)) })}
  />
  <Composition
    id="Scenes"
    component={Scenes}
    fps={SCENES_FPS}
    width={1920}
    height={1080}
    defaultProps={{ lines: [] } as ScenesProps}
    calculateMetadata={({ props }) => ({ durationInFrames: Math.max(1, scenesFrames(props)) })}
  />
  <Composition
    id="ScenesVertical"
    component={Scenes}
    fps={SCENES_FPS}
    width={1080}
    height={1920}
    defaultProps={{ lines: [], vertical: true } as ScenesProps}
    calculateMetadata={({ props }) => ({ durationInFrames: Math.max(1, scenesFrames(props)), props: { ...props, vertical: true } })}
  />
  </>
);
