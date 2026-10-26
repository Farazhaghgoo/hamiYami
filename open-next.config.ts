import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Every page renders per request (the CSP needs a fresh nonce), so no incremental cache is configured.
export default defineCloudflareConfig();
