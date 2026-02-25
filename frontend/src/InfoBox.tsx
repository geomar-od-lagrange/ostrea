import * as React from "react";
import Markdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import aboutText from "./info-about.md?raw";
import methodsText from "./info-methods.md?raw";
import creditsText from "./info-credits.md?raw";


type InfoBoxState = "collapsed" | "normal" | "maximized";
type Tab = "about" | "methods" | "credits";

const TABS: { id: Tab; label: string }[] = [
  { id: "about", label: "About" },
  { id: "methods", label: "Methods" },
  { id: "credits", label: "Credits" },
];

const TAB_CONTENT: Record<Tab, string> = {
  about: aboutText,
  methods: methodsText,
  credits: creditsText,
};

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
        className="info-box-tab-btn"
        style={{ opacity: 1, padding: 0 }}
        title="Show info"
      >
        About
      </button>
    );
  }

  return (
    <div className="info-box-wrapper" data-state={state}>
      <div className="info-box-tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className="info-box-tab-btn"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
          >{t.label}</button>
        ))}
        <a
          href="https://www.geomar.de/en/impressum"
          target="_blank"
          rel="noopener noreferrer"
          className="info-box-tab-btn"
          style={{ textDecoration: "none" }}
        >Impressum</a>
        <div style={{ marginLeft: "auto", display: "flex" }}>
          <button
            onClick={() => setState(state === "normal" ? "maximized" : "normal")}
            className="info-box-btn"
            title={state === "normal" ? "Maximize" : "Normal size"}
          >□</button>
          <button onClick={() => setState("collapsed")} className="info-box-btn" title="Close">✕</button>
        </div>
      </div>
      <div className="info-box-content" data-state={state}>
        <Markdown {...mdProps}>
          {TAB_CONTENT[tab]}
        </Markdown>
      </div>
    </div>
  );
}
