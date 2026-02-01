import type { ReactNode } from "react";
import type { CSSProperties } from "react";

export function Layout({ theme, children }: { theme: "light" | "dark"; children: ReactNode }) {
  const vars: CSSProperties =
    theme === "dark"
      ? {
          // Dark
          ["--cc-bg" as any]: "rgb(15, 18, 24)",
          ["--cc-panel" as any]: "rgb(22, 26, 34)",
          ["--cc-cardSolid" as any]: "rgb(26, 31, 40)",
          ["--cc-text" as any]: "rgb(240, 244, 250)",
          ["--cc-muted" as any]: "rgba(240, 244, 250, 0.65)",
          ["--cc-border" as any]: "rgba(255, 255, 255, 0.10)",
          ["--cc-shadow" as any]: "rgba(0,0,0,0.55)",
        }
      : {
          // Light (✅ не белый, а мягкий серый)
          ["--cc-bg" as any]: "rgb(242, 244, 248)",
          ["--cc-panel" as any]: "rgb(255, 255, 255)",
          ["--cc-cardSolid" as any]: "rgb(250, 251, 253)",
          ["--cc-text" as any]: "rgb(20, 24, 31)",
          ["--cc-muted" as any]: "rgba(20, 24, 31, 0.62)",
          ["--cc-border" as any]: "rgba(20, 24, 31, 0.10)",
          ["--cc-shadow" as any]: "rgba(0,0,0,0.18)",
        };

  return (
    <div style={{ ...page, ...vars }}>
      <div style={container}>{children}</div>
    </div>
  );
}

const page: CSSProperties = {
  minHeight: "100vh",
  background: "var(--cc-bg)",
  color: "var(--cc-text)",
};

const container: CSSProperties = {
  maxWidth: 1400,
  margin: "0 auto",
  padding: 16,
};
