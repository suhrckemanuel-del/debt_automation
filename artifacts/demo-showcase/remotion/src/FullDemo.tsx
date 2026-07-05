import { AbsoluteFill } from "remotion";
import {
  TransitionSeries,
  linearTiming,
} from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import {
  DateStatesShot,
  NumberIntro,
  Outro,
  ProductShot,
} from "./shared";

const transition = linearTiming({ durationInFrames: 15 });

export const FULL_DEMO_DURATION = 2865;

export function FullDemo() {
  return (
    <AbsoluteFill style={{ background: "#070a0f" }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={240} premountFor={30}>
          <NumberIntro />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={transition} />
        <TransitionSeries.Sequence durationInFrames={420} premountFor={30}>
          <ProductShot
            image="01-dashboard-current.png"
            durationInFrames={420}
            kicker="Current position · 2 July 2026"
            caption="The amendment controls at 70.0%. The waiver's 72.0% figure is limited relief for one Test Date."
            accent="amber"
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={transition} />
        <TransitionSeries.Sequence durationInFrames={360} premountFor={30}>
          <ProductShot
            image="01-dashboard-current.png"
            durationInFrames={360}
            kicker="A separate effect"
            caption="The same waiver blocks Distributions through 30 September—changing the next action, not the covenant."
            accent="amber"
            baseScale={1.13}
            origin="67% 48%"
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={transition} />
        <TransitionSeries.Sequence durationInFrames={210} premountFor={30}>
          <DateStatesShot durationInFrames={210} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={transition} />
        <TransitionSeries.Sequence durationInFrames={300} premountFor={30}>
          <ProductShot
            image="04-dashboard-timeline.png"
            durationInFrames={300}
            kicker="Hierarchy over time"
            caption="Original terms, temporary amendments, and limited waivers remain visibly distinct."
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={transition} />
        <TransitionSeries.Sequence durationInFrames={330} premountFor={30}>
          <ProductShot
            image="05-dashboard-evidence.png"
            durationInFrames={330}
            kicker="Evidence, not assertion"
            caption="Each factual statement resolves to document title, section, page, and the exact persisted passage."
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={transition} />
        <TransitionSeries.Sequence durationInFrames={360} premountFor={30}>
          <ProductShot
            image="06-ask-supported.png"
            durationInFrames={360}
            kicker="Saved determination"
            caption="A follow-up returns the 70.0% current threshold and keeps the limited 72.0% relief separate."
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={transition} />
        <TransitionSeries.Sequence durationInFrames={240} premountFor={30}>
          <ProductShot
            image="07-ask-source-not-found.png"
            durationInFrames={240}
            kicker="Missing support"
            caption="When the agreement set does not support the question, the engine says “Source not found.”"
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={transition} />
        <TransitionSeries.Sequence durationInFrames={270} premountFor={30}>
          <ProductShot
            image="08-ask-legal-review.png"
            durationInFrames={270}
            kicker="Human boundary"
            caption="Transaction permission is not automated: the relevant evidence is surfaced and final judgment stays human."
            accent="amber"
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={transition} />
        <TransitionSeries.Sequence durationInFrames={270} premountFor={30}>
          <Outro />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
}
