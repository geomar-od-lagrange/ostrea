import * as React from "react";
import Markdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import aboutText from "./info-about.md?raw";
import methodsText from "./info-methods.md?raw";

type InfoBoxState = "collapsed" | "normal" | "maximized";
type Tab = "about" | "methods";

const mdProps = {
  remarkPlugins: [remarkMath],
  rehypePlugins: [rehypeKatex],
  components: {
    img: ({ ...props }) => (
      <img {...props} style={{ maxWidth: "70%", height: "auto", display: "block" }} />
    ),
  },
};

export default function InfoBox() {
  const [state, setState] = React.useState<InfoBoxState>(() =>
    window.innerWidth <= 480 ? "collapsed" : "normal"
  );
  const [tab, setTab] = React.useState<Tab>("about");

  if (state === "collapsed") {
    return (
      <button
        onClick={() => setState("normal")}
        style={{
          background: "transparent",
          border: "none",
          color: "inherit",
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
      <div className="info-box-tabs">
        <button
          className="info-box-tab-btn"
          aria-selected={tab === "about"}
          onClick={() => setTab("about")}
        >About</button>
        <button
          className="info-box-tab-btn"
          aria-selected={tab === "methods"}
          onClick={() => setTab("methods")}
        >Methods</button>
      </div>
      <div className="info-box-content" data-state={state}>
        <Markdown {...mdProps}>
          {tab === "about" ? aboutText : methodsText}
        </Markdown>
      </div>
    </div>
  );
}
