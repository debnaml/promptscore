"use client";

import { useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const ROLES = ["Marketing", "SEO", "Dev", "Founder", "Other"] as const;

export default function UnlockPage() {
  const params = useParams();
  const router = useRouter();
  const scanId = params?.id as string;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState<string>("");
  const [consentMarketing, setConsentMarketing] = useState(false);
  const [honeypot, setHoneypot] = useState(""); // bot trap
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          company,
          role: role || undefined,
          consent_marketing: consentMarketing,
          scan_id: scanId,
          honeypot,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError((body as { error?: string }).error ?? "Something went wrong.");
        return;
      }

      const { unlock_token } = (await res.json()) as { unlock_token: string };
      router.push(`/scan/${scanId}/report?token=${unlock_token}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col font-[family-name:var(--font-geist-sans)]">
      <header className="px-6 py-4 border-b border-border">
        <Link href="/" className="font-semibold text-lg tracking-tight">PromptScore</Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">Get your full PDF report</h1>
            <p className="text-muted-foreground text-sm">
              Your detailed report covers all 34 checks with evidence, explanations, and step-by-step fixes. We&apos;ll email it to you instantly.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Honeypot — hidden from humans, filled by bots */}
            <input
              type="text"
              name="website_url"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              tabIndex={-1}
              aria-hidden="true"
              style={{ display: "none" }}
              autoComplete="off"
            />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="name">Name *</label>
                <input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Lee Debnam"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="company">Company *</label>
                <input
                  id="company"
                  type="text"
                  required
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Acme Ltd"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="email">Email *</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="you@company.com"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="role">Role</label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Select role (optional)</option>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div className="flex items-start gap-3 pt-2">
              <input
                id="consent_marketing"
                type="checkbox"
                checked={consentMarketing}
                onChange={(e) => setConsentMarketing(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-input"
              />
              <label htmlFor="consent_marketing" className="text-sm text-muted-foreground leading-relaxed">
                I&apos;d like to receive occasional tips on AI search readiness from Performance Peak. You can unsubscribe anytime.
              </label>
            </div>

            <p className="text-xs text-muted-foreground">
              By submitting you agree to our{" "}
              <Link href="/privacy" className="underline underline-offset-2">privacy policy</Link>.
              We will never sell your data.
            </p>

            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

            <Button type="submit" disabled={loading} className="w-full h-11 font-semibold">
              {loading ? "Generating your report…" : "Send me the PDF report"}
            </Button>
          </form>

          <div className="text-center">
            <Link href={`/scan/${scanId}`} className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4">
              ← Back to summary
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
