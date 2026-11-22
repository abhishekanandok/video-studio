import { BeforeAfter, Countdown, EraBands, FamilyTree, MonthCalendar, Timeline, VTimeline } from "../../lib/blocks-b";
import { pic } from "./pics";
import { Center, Showcase, type Item } from "./show";

export default function Scene() {
  const items: Item[] = [
    { name: "Timeline", does: "events pop up as the line moves on", loop: 5, node: <div style={{ position: "absolute", left: 30, top: 70 }}><Timeline w={900} at={0.2} dur={3.6} events={[{ year: "1915", label: "Returns" }, { year: "1920", label: "Non-cooperation" }, { year: "1930", label: "Salt March" }, { year: "1947", label: "Freedom" }]} /></div> },
    { name: "VTimeline", does: "a list of dates that scrolls", loop: 5, node: <div style={{ position: "absolute", left: 60, top: 0 }}><VTimeline w={880} h={540} at={0.2} per={0.7} events={[{ year: "1957", label: "Sputnik" }, { year: "1961", label: "Gagarin" }, { year: "1965", label: "First spacewalk" }, { year: "1969", label: "Apollo 11" }, { year: "1972", label: "Last Moon walk" }]} /></div> },
    { name: "EraBands", does: "long ages on one axis", loop: 4.4, node: <div style={{ position: "absolute", left: 40, top: 130 }}><EraBands start={-3000} end={2000} w={880} at={0.2} eras={[{ name: "Indus", from: -3000, to: -1300 }, { name: "Vedic", from: -1500, to: -500 }, { name: "Empires", from: -500, to: 1200 }, { name: "Mughal", from: 1526, to: 1857 }]} /></div> },
    { name: "MonthCalendar", does: "days crossed off", node: <Center><MonthCalendar month="MARCH 1930" days={31} startDay={6} upto={24} at={0.2} size={500} /></Center> },
    { name: "BeforeAfter", does: "then and now, wiped between", loop: 7, node: <Center><BeforeAfter before={pic("salt0.png")} after={pic("map.png")} w={880} h={480} at={0.2} labels={["1930", "TODAY"]} /></Center> },
    { name: "FamilyTree", does: "generations join, row by row", loop: 4.4, node: <div style={{ position: "absolute", left: 30, top: 10, transform: "scale(0.8)", transformOrigin: "0 0" }}><FamilyTree w={1120} at={0.2} rows={[["Motilal"], ["Jawaharlal", "Vijaya"], ["Indira", "Chandralekha", "Nayantara"]]} /></div> },
    { name: "Countdown", does: "seconds running out", loop: 5, node: <Center><Countdown from={5} at={0.2} size={420} /></Center> },
  ];
  return <Showcase layer="LAYER 2 · BLOCKS" group="Time" count={items.length} items={items} cols={4} />;
}
