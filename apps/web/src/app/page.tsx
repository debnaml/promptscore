import { ScanForm } from "@/components/scan-form";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col font-[family-name:var(--font-geist-sans)]">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-border">
        <span className="font-semibold text-lg tracking-tight">PromptScore</span>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-20 text-center">
        <div className="max-w-2xl mx-auto space-y-6">
          <h1 className="text-4xl sm:text-5xl font-bold leading-tight tracking-tight">
            Is your website ready for{" "}
            <span className="text-primary">AI search</span>?
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            PromptScore analyses your site across 34 checks — from crawler
            access to structured data — and tells you exactly what to fix to
            appear in ChatGPT, Perplexity, and Claude answers.
          </p>

          <ScanForm />
        </div>

        {/* Three-column info strip */}
        <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-3xl mx-auto text-left px-4">
          <div className="space-y-2">
            <div className="text-2xl font-bold">34</div>
            <div className="font-medium">Checks across 5 categories</div>
            <p className="text-sm text-muted-foreground">
              Crawler access, structured data, content clarity, AI-specific
              signals, and authority &amp; trust.
            </p>
          </div>
          <div className="space-y-2">
            <div className="text-2xl font-bold">~60s</div>
            <div className="font-medium">Full scan time</div>
            <p className="text-sm text-muted-foreground">
              We fetch your site, run deterministic checks, and apply
              AI-graded rubrics — all in about a minute.
            </p>
          </div>
          <div className="space-y-2">
            <div className="text-2xl font-bold">Free</div>
            <div className="font-medium">No account required</div>
            <p className="text-sm text-muted-foreground">
              Paste your URL and get your score instantly. No sign-up, no
              credit card.
            </p>
          </div>
        </div>
      </main>

      <footer className="px-6 py-6 border-t border-border">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>&copy; {new Date().getFullYear()} PromptScore</span>
          <span>Built for the AI search era</span>
        </div>
      </footer>
    </div>
  );
}
