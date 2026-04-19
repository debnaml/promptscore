import { z } from "zod/v4";
import { isPrivateIP } from "./is-private-ip";

/**
 * Zod schema for scan request body.
 * Validates: must be http/https, not a private IP, not localhost.
 */
export const scanRequestSchema = z.object({
  url: z
    .url("Must be a valid URL")
    .refine(
      (url) => {
        try {
          const parsed = new URL(url);
          return parsed.protocol === "http:" || parsed.protocol === "https:";
        } catch {
          return false;
        }
      },
      { message: "URL must use http or https protocol" }
    )
    .refine(
      (url) => {
        try {
          const parsed = new URL(url);
          const hostname = parsed.hostname.toLowerCase();
          return hostname !== "localhost" && hostname !== "127.0.0.1" && hostname !== "::1";
        } catch {
          return false;
        }
      },
      { message: "Localhost URLs are not allowed" }
    )
    .refine(
      (url) => {
        try {
          const parsed = new URL(url);
          return !isPrivateIP(parsed.hostname);
        } catch {
          return false;
        }
      },
      { message: "Private/internal IP addresses are not allowed" }
    ),
});

export type ScanRequest = z.infer<typeof scanRequestSchema>;
