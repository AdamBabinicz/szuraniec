// lib/logger.ts
export type IssueType =
  | "local_storage"
  | "yt_player"
  | "webmcp"
  | "audio"
  | "i18n";

export function reportIssue(issue: IssueType, detail: unknown): void {
  if (process.env.NODE_ENV !== "production") {
    console.debug(`[${issue}]`, detail);
  }
}
