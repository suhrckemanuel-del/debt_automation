import { AbsoluteFill } from "remotion";
import {
  TransitionSeries,
  linearTiming,
} from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import {
  NumberIntro,
  Outro,
  ProductShot,
  SplitTrustShot,
} from "./shared";

const transition = linearTiming({ durationInFrames: 15 });

export const TEASER_DURATION = 1170;

export function Teaser() {
  return (
    <AbsoluteFill style={{ background: "#070a0f" }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={150} premountFor={30}>
          <NumberIntro />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={transition} />
        <TransitionSeries.Sequence durationInFrames={330} premountFor={30}>
          <ProductShot
            image="01-dashboard-current.png"
            durationInFrames={330}
            kicker="Current position"
            caption="70.0% controls. 72.0% is limited waiver relief—not the amended covenant."
            accent="amber"
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={transition} />
        <TransitionSeries.Sequence durationInFrames={270} premountFor={30}>
          <ProductShot
            image="05-dashboard-evidence.png"
            durationInFrames={270}
            kicker="Source-grounded"
            caption="The decision links directly to the exact waiver condition and its separate Distribution block."
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={transition} />
        <TransitionSeries.Sequence durationInFrames={270} premountFor={30}>
          <SplitTrustShot durationInFrames={270} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={transition} />
        <TransitionSeries.Sequence durationInFrames={210} premountFor={30}>
          <Outro />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
}
