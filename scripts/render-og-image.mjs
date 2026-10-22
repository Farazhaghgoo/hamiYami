/*
 * Renders scripts/og-image.html to public/assets/images/og-image.png with a locally installed
 * Chromium browser (Edge or Chrome) in headless mode. Set BROWSER_PATH to override the lookup.
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = pathToFileURL(join(root, "scripts", "og-image.html")).href;
const output = join(root, "public", "assets", "images", "og-image.png");

const candidates = [
  process.env.BROWSER_PATH,
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);

const browser = candidates.find((path) => existsSync(path));
if (!browser) {
  console.error("No Edge or Chrome found. Set BROWSER_PATH to a Chromium-based browser.");
  process.exit(1);
}

execFileSync(browser, [
  "--headless=new",
  "--disable-gpu",
  "--hide-scrollbars",
  "--allow-file-access-from-files",
  "--window-size=1200,630",
  "--virtual-time-budget=3000",
  `--screenshot=${output}`,
  source,
]);
console.log(`Wrote ${output}`);
