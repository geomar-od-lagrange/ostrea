import * as React from "react";
import Markdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import infoText from "./info.md?raw";

export default function InfoBox() {
  const [collapsed, setCollapsed] = React.useState(() => window.innerWidth <= 480);

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        style={{
          background: "transparent",
          border: "none",
          color: "#333",
          fontSize: 12,
          cursor: "pointer",
          padding: "2px 0",
        }}
        title="Show info"
      >
        Info
      </button>
    );
  }

  return (
    <div className="info-box-wrapper">
      <button
        onClick={() => setCollapsed(true)}
        style={{
          position: "absolute",
          top: 0,
          right: 16,
          background: "rgba(220, 220, 220, 0.9)",
          border: "none",
          color: "#333",
          fontSize: 14,
          cursor: "pointer",
          padding: "7px 12px",
          borderRadius: 4,
          zIndex: 1,
        }}
        title="Collapse"
      >
        ✕
      </button>
      <div className="info-box-content">
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
