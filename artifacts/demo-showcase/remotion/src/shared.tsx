import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const palette = {
  background: "#070a0f",
  panel: "#10151d",
  text: "#f7f8fa",
  muted: "#9ba4b1",
  mint: "#67d1b5",
  amber: "#f5b942",
  border: "rgba(255,255,255,0.13)",
};

const fontFamily =
  '"Segoe UI", "Helvetica Neue", Arial, ui-sans-serif, system-ui, sans-serif';
const mono =
  '"Cascadia Mono", "SFMono-Regular", Consolas, ui-monospace, monospace';

function progressFor(frame: number, durationInFrames: number) {
  return interpolate(frame, [0, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.45, 0, 0.55, 1),
  });
}

function SyntheticMark() {
  return (
    <div
      style={{
        position: "absolute",
        right: 48,
        top: 38,
        display: "flex",
        alignItems: "center",
        gap: 12,
        color: palette.muted,
        fontFamily: mono,
        fontSize: 19,
        letterSpacing: 1.4,
        zIndex: 20,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: palette.mint,
          boxShadow: `0 0 20px ${palette.mint}`,
        }}
      />
      SYNTHETIC · LOCAL V0
    </div>
  );
}

function Caption({
  kicker,
  text,
  accent = "mint",
  durationInFrames,
}: {
  kicker: string;
  text: string;
  accent?: "mint" | "amber";
  durationInFrames?: number;
}) {
  const frame = useCurrentFrame();
  const enterOpacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const exitEnd =
    durationInFrames === undefined ? undefined : Math.max(0, durationInFrames - 15);
  const exitOpacity =
    exitEnd === undefined
      ? 1
      : interpolate(
          frame,
          [Math.max(0, exitEnd - 24), exitEnd],
          [1, 0],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.in(Easing.cubic),
          },
        );
  const y = interpolate(frame, [0, 22], [18, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  return (
    <div
      style={{
        position: "absolute",
        left: 120,
        right: 120,
        bottom: 54,
        padding: "23px 30px 24px",
        border: `1px solid ${palette.border}`,
        borderLeft: `5px solid ${
          accent === "amber" ? palette.amber : palette.mint
        }`,
        borderRadius: 18,
        background: "rgba(7,10,15,0.92)",
        boxShadow: "0 24px 70px rgba(0,0,0,0.45)",
        opacity: enterOpacity * exitOpacity,
        transform: `translateY(${y}px)`,
        zIndex: 15,
      }}
    >
      <div
        style={{
          color: accent === "amber" ? palette.amber : palette.mint,
          fontFamily: mono,
          fontSize: 19,
          fontWeight: 700,
          letterSpacing: 1.6,
          textTransform: "uppercase",
        }}
      >
        {kicker}
      </div>
      <div
        style={{
          marginTop: 9,
          color: palette.text,
          fontFamily,
          fontSize: 37,
          fontWeight: 650,
          lineHeight: 1.18,
          letterSpacing: -0.8,
        }}
      >
        {text}
      </div>
    </div>
  );
}

function BrowserFrame({
  image,
  durationInFrames,
  baseScale = 1,
  zoom = 0.025,
  origin = "50% 45%",
}: {
  image: string;
  durationInFrames: number;
  baseScale?: number;
  zoom?: number;
  origin?: string;
}) {
  const frame = useCurrentFrame();
  const progress = progressFor(frame, durationInFrames);
  const scale = baseScale + zoom * progress;
  return (
    <div
      style={{
        position: "absolute",
        left: 184,
        top: 55,
        width: 1552,
        height: 970,
        overflow: "hidden",
        borderRadius: 22,
        border: `1px solid ${palette.border}`,
        background: palette.panel,
        boxShadow: "0 42px 130px rgba(0,0,0,0.62)",
      }}
    >
      <div
        style={{
          height: 38,
          display: "flex",
          alignItems: "center",
          gap: 9,
          padding: "0 17px",
          borderBottom: `1px solid ${palette.border}`,
          background: "#111720",
        }}
      >
        {["#ff6f68", "#f5c451", "#66cf91"].map((color) => (
          <span
            key={color}
            style={{ width: 10, height: 10, borderRadius: 999, background: color }}
          />
        ))}
        <span
          style={{
            marginLeft: 14,
            color: "#707b89",
            fontFamily: mono,
            fontSize: 14,
          }}
        >
          local.synthetic / agreement-intelligence
        </span>
      </div>
      <Img
        src={staticFile(`captures/${image}`)}
        style={{
          width: "100%",
          height: 932,
          objectFit: "cover",
          objectPosition: "top center",
          transform: `scale(${scale})`,
          transformOrigin: origin,
        }}
      />
    </div>
  );
}

export function ProductShot({
  image,
  durationInFrames,
  kicker,
  caption,
  accent,
  baseScale,
  origin,
}: {
  image: string;
  durationInFrames: number;
  kicker: string;
  caption: string;
  accent?: "mint" | "amber";
  baseScale?: number;
  origin?: string;
}) {
  return (
    <AbsoluteFill style={{ background: palette.background }}>
      <BrowserFrame
        image={image}
        durationInFrames={durationInFrames}
        baseScale={baseScale}
        origin={origin}
      />
      <SyntheticMark />
      <Caption
        kicker={kicker}
        text={caption}
        accent={accent}
        durationInFrames={durationInFrames}
      />
    </AbsoluteFill>
  );
}

export function NumberIntro() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const reveal = (start: number) =>
    interpolate(frame, [start * fps, start * fps + 18], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    });
  const items = [
    { value: "65%", label: "Original agreement", color: palette.text, at: 0.5 },
    { value: "70%", label: "Later amendment", color: palette.mint, at: 1.5 },
    { value: "72%?", label: "Narrow waiver", color: palette.amber, at: 2.5 },
  ];
  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(circle at 72% 35%, rgba(103,209,181,0.10), transparent 34%), #070a0f",
        color: palette.text,
        fontFamily,
        padding: "118px 150px",
      }}
    >
      <SyntheticMark />
      <div
        style={{
          color: palette.muted,
          fontFamily: mono,
          fontSize: 24,
          letterSpacing: 2,
          textTransform: "uppercase",
        }}
      >
        One agreement set. Three plausible numbers.
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 110px 1fr 110px 1fr",
          alignItems: "center",
          marginTop: 120,
        }}
      >
        {items.map((item, index) => {
          const opacity = reveal(item.at);
          const scale = interpolate(opacity, [0, 1], [0.88, 1]);
          return (
            <div
              key={item.value}
              style={{ display: "contents", opacity }}
            >
              <div
                style={{
                  opacity,
                  transform: `scale(${scale})`,
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    color: item.color,
                    fontFamily: mono,
                    fontSize: 126,
                    fontWeight: 750,
                    letterSpacing: -8,
                  }}
                >
                  {item.value}
                </div>
                <div
                  style={{
                    marginTop: 20,
                    color: palette.muted,
                    fontSize: 27,
                  }}
                >
                  {item.label}
                </div>
              </div>
              {index < items.length - 1 ? (
                <div
                  style={{
                    opacity: reveal(item.at + 0.45),
                    color: "#4f5966",
                    fontFamily: mono,
                    fontSize: 54,
                    textAlign: "center",
                  }}
                >
                  →
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <div
        style={{
          marginTop: 118,
          color: palette.text,
          fontSize: 54,
          fontWeight: 700,
          letterSpacing: -1.5,
          opacity: reveal(4),
        }}
      >
        Which position can the reviewer rely on today?
      </div>
    </AbsoluteFill>
  );
}

export function DateStatesShot({ durationInFrames }: { durationInFrames: number }) {
  const frame = useCurrentFrame();
  const progress = progressFor(frame, durationInFrames);
  const shift = interpolate(progress, [0, 1], [-9, 9]);
  const states = [
    {
      image: "02-dashboard-original.png",
      label: "Before amendment",
      value: "65.0%",
      detail: "Original covenant controls",
    },
    {
      image: "03-dashboard-after-amendment.png",
      label: "After amendment expiry",
      value: "65.0%",
      detail: "Original threshold resumes",
    },
  ];
  return (
    <AbsoluteFill style={{ background: palette.background, fontFamily }}>
      <SyntheticMark />
      <div
        style={{
          position: "absolute",
          left: 120,
          top: 80,
          color: palette.text,
          fontSize: 56,
          fontWeight: 720,
          letterSpacing: -1.8,
        }}
      >
        The date changes the controlling position.
      </div>
      <div
        style={{
          position: "absolute",
          left: 120,
          right: 120,
          top: 180,
          bottom: 165,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 28,
        }}
      >
        {states.map((state, index) => (
          <div
            key={state.label}
            style={{
              overflow: "hidden",
              border: `1px solid ${palette.border}`,
              borderRadius: 20,
              background: palette.panel,
              transform: `translateY(${index === 0 ? shift : -shift}px)`,
              boxShadow: "0 28px 75px rgba(0,0,0,0.42)",
            }}
          >
            <Img
              src={staticFile(`captures/${state.image}`)}
              style={{
                width: "100%",
                height: 515,
                objectFit: "cover",
                objectPosition: "top left",
              }}
            />
            <div style={{ padding: "22px 28px" }}>
              <div style={{ color: palette.muted, fontFamily: mono, fontSize: 18 }}>
                {state.label}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 20,
                  marginTop: 9,
                }}
              >
                <span
                  style={{
                    color: palette.mint,
                    fontFamily: mono,
                    fontSize: 42,
                    fontWeight: 750,
                  }}
                >
                  {state.value}
                </span>
                <span style={{ color: palette.text, fontSize: 24 }}>
                  {state.detail}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <Caption
        kicker="Hierarchy by date"
        text="Later relief is not applied retrospectively—and expired amendments do not linger."
        durationInFrames={durationInFrames}
      />
    </AbsoluteFill>
  );
}

export function SplitTrustShot({ durationInFrames }: { durationInFrames: number }) {
  const frame = useCurrentFrame();
  const enter = interpolate(frame, [0, 24], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const cards = [
    {
      image: "07-ask-source-not-found.png",
      label: "Missing support",
      title: "Source not found.",
      accent: palette.mint,
    },
    {
      image: "08-ask-legal-review.png",
      label: "Judgment boundary",
      title: "Human review required.",
      accent: palette.amber,
    },
  ];
  return (
    <AbsoluteFill style={{ background: palette.background, fontFamily }}>
      <SyntheticMark />
      <div
        style={{
          position: "absolute",
          left: 120,
          top: 76,
          color: palette.text,
          fontSize: 55,
          fontWeight: 720,
          letterSpacing: -1.8,
        }}
      >
        Trust includes knowing when to stop.
      </div>
      <div
        style={{
          position: "absolute",
          left: 110,
          right: 110,
          top: 175,
          bottom: 195,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 30,
        }}
      >
        {cards.map((card, index) => (
          <div
            key={card.label}
            style={{
              overflow: "hidden",
              border: `1px solid ${palette.border}`,
              borderRadius: 22,
              background: palette.panel,
              boxShadow: "0 30px 90px rgba(0,0,0,0.44)",
              opacity: enter,
              transform: `translateX(${(1 - enter) * (index === 0 ? -35 : 35)}px)`,
            }}
          >
            <Img
              src={staticFile(`captures/${card.image}`)}
              style={{
                width: "100%",
                height: 540,
                objectFit: "cover",
                objectPosition: "top left",
              }}
            />
            <div
              style={{
                borderTop: `4px solid ${card.accent}`,
                padding: "20px 26px 24px",
              }}
            >
              <div style={{ color: palette.muted, fontFamily: mono, fontSize: 17 }}>
                {card.label}
              </div>
              <div
                style={{
                  marginTop: 7,
                  color: palette.text,
                  fontSize: 35,
                  fontWeight: 720,
                }}
              >
                {card.title}
              </div>
            </div>
          </div>
        ))}
      </div>
      <Caption
        kicker="Safe failure"
        text="No source means abstention. A transaction-permission question stays with a qualified human reviewer."
        accent="amber"
        durationInFrames={durationInFrames}
      />
    </AbsoluteFill>
  );
}

export function Outro() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = interpolate(frame, [0, 1.2 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(circle at 50% 20%, rgba(103,209,181,0.13), transparent 40%), #070a0f",
        color: palette.text,
        fontFamily,
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "110px 190px",
      }}
    >
      <SyntheticMark />
      <div
        style={{
          opacity: enter,
          transform: `translateY(${(1 - enter) * 25}px)`,
        }}
      >
        <div
          style={{
            color: palette.mint,
            fontFamily: mono,
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: 2.2,
            textTransform: "uppercase",
          }}
        >
          Evidence-backed first-pass review
        </div>
        <div
          style={{
            marginTop: 34,
            fontSize: 78,
            fontWeight: 760,
            lineHeight: 1.08,
            letterSpacing: -3,
          }}
        >
          Would this make the review clearer?
        </div>
        <div
          style={{
            marginTop: 30,
            color: palette.muted,
            fontSize: 39,
            lineHeight: 1.3,
          }}
        >
          What would you still need to verify before relying on it?
        </div>
        <div
          style={{
            width: 760,
            margin: "70px auto 0",
            paddingTop: 28,
            borderTop: `1px solid ${palette.border}`,
            color: palette.muted,
            fontSize: 24,
            lineHeight: 1.45,
          }}
        >
          Local synthetic evaluation only. Legal interpretation and commercial
          judgment remain human responsibilities.
        </div>
      </div>
    </AbsoluteFill>
  );
}
