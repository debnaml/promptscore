import { Client } from "@upstash/qstash";

export const qstash = new Client({
  token: process.env.QSTASH_TOKEN ?? "",
  baseUrl: process.env.QSTASH_URL ?? "https://qstash.upstash.io",
});
