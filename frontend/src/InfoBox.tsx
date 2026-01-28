import * as React from "react";
import Markdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import infoText from "./info.md?raw";

export default function InfoBox() {
  const [collapsed, setCollapsed] = React.useState(false);

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        style={{
          background: "transparent",
          border: "none",
          color: "#333",
          fontSize: 20,
          cursor: "pointer",
          padding: 0,
        }}
        title="Show info"
      >
        ℹ️
      </button>
    );
  }

  return (
    <div style={{ width: 500, maxHeight: 300, overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1em" }}>
        <div style={{ fontSize: 12, lineHeight: 1.5, color: "#333" }}>
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
        <button
          onClick={() => setCollapsed(true)}
          style={{
            background: "transparent",
            border: "none",
            color: "#333",
            fontSize: 16,
            cursor: "pointer",
            padding: 0,
            flexShrink: 0,
          }}
          title="Collapse"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
