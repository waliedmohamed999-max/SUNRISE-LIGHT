import { checkEnv } from "@/lib/env-check";

/** Runs once when the server starts: report configuration problems early. */
export function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const issues = checkEnv(process.env);
  for (const i of issues) console[i.level === "error" ? "error" : "warn"](`[config] ${i.level.toUpperCase()}: ${i.message}`);
  if (process.env.NODE_ENV === "production" && issues.some((i) => i.level === "error")) {
    throw new Error("Invalid server configuration — see the [config] errors above and docs/DEPLOYMENT.md");
  }
}
