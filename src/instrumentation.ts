import { checkEnv } from "@/lib/env-check";

const HOUR = 60 * 60 * 1000;

/** Runs once when the server starts: report configuration problems early, and keep expired link images cleared. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const issues = checkEnv(process.env);
  for (const i of issues) console[i.level === "error" ? "error" : "warn"](`[config] ${i.level.toUpperCase()}: ${i.message}`);
  if (process.env.NODE_ENV === "production" && issues.some((i) => i.level === "error")) {
    throw new Error("Invalid server configuration — see the [config] errors above and docs/DEPLOYMENT.md");
  }
  // this exact condition lets the bundler leave server-only code out of the edge build
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { purgeExpiredShares, purgeOldResets } = await import("@/lib/shares");
    const purge = () => Promise.all([purgeExpiredShares(), purgeOldResets()]).catch((e) => console.error("[cleanup] failed", e));
    void purge();
    setInterval(purge, HOUR).unref();
  }
}
