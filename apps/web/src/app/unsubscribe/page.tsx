import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase";

export const metadata = {
  title: "Unsubscribe · PromptScore",
};

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = searchParams?.token;
  let status: "success" | "invalid" | "already" = "invalid";

  if (token) {
    const { data: lead } = await supabaseAdmin
      .from("leads")
      .select("id, unsubscribed")
      .eq("unlock_token", token)
      .single();

    if (lead) {
      if (lead.unsubscribed) {
        status = "already";
      } else {
        await supabaseAdmin
          .from("leads")
          .update({ unsubscribed: true, unsubscribed_at: new Date().toISOString() })
          .eq("id", lead.id);
        status = "success";
      }
    }
  }

  return (
    <div className="min-h-screen flex flex-col font-[family-name:var(--font-geist-sans)]">
      <header className="px-6 py-4 border-b border-border">
        <Link href="/" className="font-semibold text-lg tracking-tight">PromptScore</Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-4">
          {status === "success" && (
            <>
              <h1 className="text-2xl font-bold">You&apos;ve been unsubscribed</h1>
              <p className="text-muted-foreground text-sm">
                You won&apos;t receive any more marketing emails from PromptScore or Performance Peak. If you submitted a scan while unsubscribed, you&apos;ll still receive your PDF report.
              </p>
            </>
          )}
          {status === "already" && (
            <>
              <h1 className="text-2xl font-bold">Already unsubscribed</h1>
              <p className="text-muted-foreground text-sm">You&apos;re already unsubscribed from our mailing list.</p>
            </>
          )}
          {status === "invalid" && (
            <>
              <h1 className="text-2xl font-bold">Invalid link</h1>
              <p className="text-muted-foreground text-sm">
                This unsubscribe link is invalid or has expired. Email{" "}
                <a href="mailto:lee@performancepeak.co.uk" className="underline underline-offset-2">
                  lee@performancepeak.co.uk
                </a>{" "}
                and we&apos;ll remove you manually.
              </p>
            </>
          )}
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4">
            Back to PromptScore
          </Link>
        </div>
      </main>
    </div>
  );
}
