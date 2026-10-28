#!/usr/bin/env node
// Lightweight secret scan over tracked files (CI and pre-push). No third-party code.
// Prints file:line and the rule name only — never the matched value.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const RULES = [
  ["AWS access key", /AKIA[0-9A-Z]{16}/],
  ["Private key block", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ["GitHub token", /\bgh[pousr]_[A-Za-z0-9]{36,}\b/],
  ["Resend API key", /\bre_[A-Za-z0-9]{8,}_[A-Za-z0-9]{16,}\b/],
  ["Stripe secret key", /\bsk_(live|test)_[A-Za-z0-9]{16,}\b/],
  ["Slack token", /\bxox[abpr]-[A-Za-z0-9-]{10,}\b/],
  ["Connection string with password", /\b(postgres(ql)?|mysql|mongodb(\+srv)?|redis):\/\/[^:\s/@]+:(?!\*|\$\{|<|CHANGE|change|ci@|password@)[^@\s/]{6,}@/],
  ["Assigned secret", /^\s*(?:export\s+)?[A-Z0-9_]*(?:SECRET|PASSWORD|API_KEY|ACCESS_KEY|PRIVATE_KEY|TOKEN)[A-Z0-9_]*\s*=\s*["']?(?!CHANGE|change|<|\$|""|''|\s*$)[^"'\s#]{12,}/],
];
const SKIP = /(^|\/)(package-lock\.json|\.env\.example)$|\.(png|jpe?g|webp|gif|ico|woff2?|ttf|pdf|glb|hdr)$/i;

const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter((f) => f && !SKIP.test(f));
let findings = 0;
for (const file of files) {
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  text.split(/\r?\n/).forEach((line, i) => {
    for (const [name, re] of RULES) {
      if (re.test(line)) {
        findings++;
        console.error(`${file}:${i + 1}  ${name}`);
      }
    }
  });
}
if (findings) {
  console.error(`\n${findings} possible secret(s) in tracked files. Remove them, rotate the credential, and keep secrets in .env / the host's secret store.`);
  process.exit(1);
}
console.log(`Secret scan passed (${files.length} tracked files).`);
