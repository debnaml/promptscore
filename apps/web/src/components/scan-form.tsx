"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ScanForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    // Normalise: add https:// if no scheme given
    let normalised = url.trim();
    if (normalised && !/^https?:\/\//i.test(normalised)) {
      normalised = "https://" + normalised;
    }

    try {
      new URL(normalised);
    } catch {
      setError("Please enter a valid website URL, e.g. https://example.com");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalised }),
      });

      if (res.status === 429) {
        setError("You've submitted too many scans. Please wait a few minutes and try again.");
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError((body as { error?: string }).error ?? "Something went wrong. Please try again.");
        return;
      }

      const { scan_id } = (await res.json()) as { scan_id: string };
      router.push(`/scan/${scan_id}`);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-lg mx-auto space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          inputMode="url"
          placeholder="https://yourwebsite.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={loading}
          className="flex-1 h-11 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
          aria-label="Website URL"
        />
        <Button type="submit" disabled={loading || !url.trim()} className="h-11 px-5 whitespace-nowrap">
          {loading ? "Scanning…" : "Scan my site"}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-destructive text-left" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
