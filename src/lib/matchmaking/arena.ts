export type ArenaMatchRpcResult =
  | { status: "waiting" }
  | {
      status: "matched";
      room_id: string;
      topic_title: string;
      debate_format: ArenaDebateFormat;
      opponent_id: string;
      opponent_display_name: string;
      role: "pro" | "con";
    }
  | { status: "error"; message: string };

export type ArenaDebateFormat = "wsda" | "free_form";

export function normalizeArenaDebateFormat(
  value: unknown,
  fallback: ArenaDebateFormat = "wsda",
): ArenaDebateFormat {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === "wsda" || normalized === "free_form") {
    return normalized;
  }
  return fallback;
}

function normalizeRpcJson(data: unknown): unknown {
  if (typeof data === "string") {
    try {
      return JSON.parse(data) as unknown;
    } catch {
      return null;
    }
  }
  return data;
}

export function parseArenaMatchRpcResult(data: unknown): ArenaMatchRpcResult {
  const normalized = normalizeRpcJson(data);
  if (!normalized || typeof normalized !== "object") {
    return { status: "error", message: "Invalid response" };
  }
  const o = normalized as Record<string, unknown>;
  const status = o.status;
  if (status === "waiting") {
    return { status: "waiting" };
  }
  if (status === "error") {
    return {
      status: "error",
      message: typeof o.message === "string" ? o.message : "Error",
    };
  }
  if (status !== "matched") {
    return { status: "error", message: "Unknown match status" };
  }
  const roomId = o.room_id != null ? String(o.room_id) : "";
  const topicTitle = o.topic_title != null ? String(o.topic_title) : "";
  const opponentId = o.opponent_id != null ? String(o.opponent_id) : "";
  const opponentName = o.opponent_display_name != null ? String(o.opponent_display_name) : "";
  const debateFormat = normalizeArenaDebateFormat(o.debate_format, "wsda");
  const role = o.role;
  if (
    !roomId ||
    !topicTitle ||
    !opponentId ||
    (role !== "pro" && role !== "con")
  ) {
    return { status: "error", message: "Incomplete match payload" };
  }
  return {
    status: "matched",
    room_id: roomId,
    topic_title: topicTitle,
    debate_format: debateFormat,
    opponent_id: opponentId,
    opponent_display_name: opponentName || "Player",
    role,
  };
}
