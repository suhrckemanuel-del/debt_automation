import "./index.css";
import { Composition, Folder } from "remotion";
import { FullDemo, FULL_DEMO_DURATION } from "./FullDemo";
import { Teaser, TEASER_DURATION } from "./Teaser";

export function RemotionRoot() {
  return (
    <Folder name="Agreement-Intelligence">
      <Composition
        id="F001-Full-Demo"
        component={FullDemo}
        durationInFrames={FULL_DEMO_DURATION}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="F001-Teaser"
        component={Teaser}
        durationInFrames={TEASER_DURATION}
        fps={30}
        width={1920}
        height={1080}
      />
    </Folder>
  );
}
