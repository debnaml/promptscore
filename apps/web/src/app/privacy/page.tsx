import Link from "next/link";

export const metadata = {
  title: "Privacy Policy · PromptScore",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col font-[family-name:var(--font-geist-sans)]">
      <header className="px-6 py-4 border-b border-border">
        <Link href="/" className="font-semibold text-lg tracking-tight">PromptScore</Link>
      </header>
      <main className="max-w-2xl mx-auto w-full px-4 py-12 space-y-10 text-sm leading-relaxed text-foreground">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Privacy Policy</h1>
          <p className="text-muted-foreground">Last updated: 26 April 2025</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Who we are</h2>
          <p>PromptScore is operated by Performance Peak Ltd, a company registered in England and Wales. When you use PromptScore you interact with us as a data controller under UK GDPR.</p>
          <p>Contact: <a href="mailto:lee@performancepeak.co.uk" className="underline underline-offset-2">lee@performancepeak.co.uk</a></p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">What data we collect</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Scan data:</strong> The URL you submit and the results of the scan (scores, check outputs).</li>
            <li><strong>Lead data:</strong> If you request a PDF report: your name, email address, company, role, and the scan ID. We also record whether you consented to marketing communications.</li>
            <li><strong>Technical data:</strong> A one-way hashed (SHA-256 + salt) representation of your IP address, used only to detect abuse and rate-limit submissions. We cannot reverse this to your IP address.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Legal bases for processing</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Legitimate interests</strong> — processing your URL to produce scan results, and sending you the PDF report you requested.</li>
            <li><strong>Consent</strong> — marketing emails (AI readiness tips and updates). You may withdraw consent at any time.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">How we use your data</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Generate and email your PDF report.</li>
            <li>If you opted in, send occasional emails about AI search readiness from Performance Peak.</li>
            <li>Improve our scoring model (aggregated, non-identifying analysis only).</li>
          </ul>
          <p>We do not sell your data to third parties. We do not use your data for advertising.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Data retention</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Scan results</strong> — retained for 30 days, then automatically deleted.</li>
            <li><strong>Lead records</strong> — retained until you request deletion, or 2 years of inactivity, whichever comes first.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Your rights</h2>
          <p>Under UK GDPR you have the right to access, correct, or erase your personal data; the right to restrict or object to processing; and the right to data portability. To exercise any right, email <a href="mailto:lee@performancepeak.co.uk" className="underline underline-offset-2">lee@performancepeak.co.uk</a>. We will respond within 30 days.</p>
          <p>You also have the right to lodge a complaint with the UK ICO at <a href="https://ico.org.uk" className="underline underline-offset-2" target="_blank" rel="noopener noreferrer">ico.org.uk</a>.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Unsubscribing</h2>
          <p>Every marketing email includes a one-click unsubscribe link. You can also email us to unsubscribe. Transactional emails (your PDF report delivery) are not affected by unsubscribing.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Cookies</h2>
          <p>PromptScore does not use tracking or advertising cookies. We may use a single session cookie for functional purposes (e.g., CSRF protection), which expires when you close your browser.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Third-party processors</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Supabase</strong> (EU region) — database</li>
            <li><strong>Vercel</strong> — hosting</li>
            <li><strong>Resend</strong> — transactional email delivery</li>
            <li><strong>Anthropic</strong> — AI-graded checks (URL content only, not personal data)</li>
          </ul>
        </section>
      </main>
      <footer className="px-6 py-6 border-t border-border text-center text-xs text-muted-foreground">
        PromptScore by Performance Peak
      </footer>
    </div>
  );
}
