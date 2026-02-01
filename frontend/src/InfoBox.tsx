import * as React from "react";
import Markdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import infoText from "./info.md?raw";

type InfoBoxState = "collapsed" | "normal" | "maximized";

export default function InfoBox() {
  const [state, setState] = React.useState<InfoBoxState>(() =>
    window.innerWidth <= 480 ? "collapsed" : "normal"
  );

  if (state === "collapsed") {
    return (
      <button
        onClick={() => setState("normal")}
        style={{
          background: "transparent",
          border: "none",
          color: "#333",
          fontSize: 12,
          lineHeight: 1,
          cursor: "pointer",
          padding: 0,
        }}
        title="Show info"
      >
        Info
      </button>
    );
  }

  return (
    <div className="info-box-wrapper" data-state={state}>
      <div className="info-box-buttons">
        <button
          onClick={() => setState(state === "normal" ? "maximized" : "normal")}
          className="info-box-btn"
          title={state === "normal" ? "Maximize" : "Normal size"}
        >□</button>
        <button onClick={() => setState("collapsed")} className="info-box-btn" title="Close">✕</button>
      </div>
      <div className="info-box-content" data-state={state}>
        <Markdown
          remarkPlugins={[remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={{
            img: ({ ...props }) => (
              <img {...props} style={{ maxWidth: "70%", height: "auto", display: "block" }} />
            ),
          }}
        >
          {infoText}
        </Markdown>
      </div>
    </div>
  );
}
