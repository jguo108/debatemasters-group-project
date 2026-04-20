import type { CSSProperties } from "react";

export function MaterialIcon({
  name,
  className = "",
  filled,
  style,
}: {
  name: string;
  className?: string;
  filled?: boolean;
  style?: CSSProperties;
}) {
  const merged: CSSProperties = {
    ...style,
    ...(filled
      ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }
      : {}),
  };
  return (
    <span
      className={`material-symbols-outlined ${className}`.trim()}
      style={merged}
    >
      {name}
    </span>
  );
}
