export const AI_BOT_USER_AGENTS = {
  "OAI-SearchBot": "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot)",
  "ChatGPT-User": "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ChatGPT-User/1.0; +https://openai.com/bot)",
  PerplexityBot: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)",
  "Claude-SearchBot": "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Claude-SearchBot/1.0; +https://anthropic.com/claude-searchbot)",
  GPTBot: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.0; +https://openai.com/gptbot)",
  ClaudeBot: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +https://anthropic.com/claudebot)",
} as const;

export type BotName = keyof typeof AI_BOT_USER_AGENTS;

export interface BotProbeResult {
  userAgent: string;
  status: number | null;
  blocked: boolean;
  cloudflareChallenge: boolean;
  error?: string;
}

const CLOUDFLARE_SIGNATURES = [
  "cf-ray",
  "cf_clearance",
  "cloudflare",
  "just a moment",
  "enable javascript",
  "checking your browser",
  "ddos protection",
];

function detectCloudflare(status: number, headers: Headers, body: string): boolean {
  if (headers.get("cf-ray")) return true;
  if (headers.get("server")?.toLowerCase().includes("cloudflare")) return true;
  const lowerBody = body.slice(0, 2000).toLowerCase();
  return CLOUDFLARE_SIGNATURES.some((sig) => lowerBody.includes(sig));
}

export async function runBotProbes(
  url: string,
  fetchFn: typeof fetch = globalThis.fetch
): Promise<Record<BotName, BotProbeResult>> {
  const entries = Object.entries(AI_BOT_USER_AGENTS) as [BotName, string][];

  const results = await Promise.all(
    entries.map(async ([name, ua]): Promise<[BotName, BotProbeResult]> => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10_000);

      try {
        const res = await fetchFn(url, {
          signal: controller.signal,
          headers: { "User-Agent": ua },
          redirect: "follow",
        });
        const body = await res.text().catch(() => "");
        const cf = detectCloudflare(res.status, res.headers, body);
        const blocked = res.status >= 400 || cf;
        return [name, { userAgent: ua, status: res.status, blocked, cloudflareChallenge: cf }];
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return [name, { userAgent: ua, status: null, blocked: true, cloudflareChallenge: false, error: msg }];
      } finally {
        clearTimeout(timer);
      }
    })
  );

  return Object.fromEntries(results) as Record<BotName, BotProbeResult>;
}
