/**
 * Report pipeline — generates PDF and sends via Resend.
 * Called fire-and-forget via waitUntil from POST /api/leads.
 */
import { Resend } from "resend";
import { supabaseAdmin } from "./supabase";
import { renderReportPDF } from "./pdf-generator";

const ADMIN_EMAIL = process.env["ADMIN_EMAIL"] ?? "lee@performancepeak.co.uk";
const FROM_EMAIL = process.env["FROM_EMAIL"] ?? "updates@updates.pp-worldwide.com";
const FROM_NAME = process.env["FROM_NAME"] ?? "PromptScore";

function buildResend(): Resend {
  const key = process.env["RESEND_API_KEY"];
  if (!key) throw new Error("RESEND_API_KEY not set");
  return new Resend(key);
}

export async function generateAndEmailReport(
  leadId: string,
  scanId: string,
  email: string,
  name: string
): Promise<void> {
  try {
    // Fetch full scan data with check details
    const [{ data: scan }, { data: checks }] = await Promise.all([
      supabaseAdmin.from("scans").select("*").eq("id", scanId).single(),
      supabaseAdmin.from("scan_checks").select("*").eq("scan_id", scanId).order("category"),
    ]);

    if (!scan) {
      console.error(`[report:${leadId}] scan not found`);
      return;
    }

    // Generate PDF buffer
    const pdfBuffer = await renderReportPDF({ scan, checks: checks ?? [] });

    // Send email
    const resend = buildResend();
    const domain = (() => {
      try { return new URL(scan.url).hostname; } catch { return scan.url; }
    })();
    const firstName = name.split(" ")[0] ?? name;

    await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: email,
      replyTo: ADMIN_EMAIL,
      subject: `Your PromptScore AI Readiness Report — ${domain}`,
      html: buildEmailHtml(firstName, domain, scan.overall_score, scan.summary),
      text: buildEmailText(firstName, domain, scan.overall_score),
      attachments: [
        {
          filename: `promptscore-${domain}-report.pdf`,
          content: pdfBuffer.toString("base64"),
        },
      ],
    });

    // Notify admin
    await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: ADMIN_EMAIL,
      subject: `New PromptScore lead — ${domain} (score: ${scan.overall_score})`,
      html: `<p>New lead from ${email} (${name}) for <strong>${domain}</strong>.<br>Score: <strong>${scan.overall_score}/100</strong><br>Scan ID: ${scanId}</p>`,
      text: `New lead: ${email} — ${domain} — score ${scan.overall_score}/100`,
    });

    // Mark PDF sent
    await supabaseAdmin
      .from("leads")
      .update({ pdf_generated_at: new Date().toISOString() })
      .eq("id", leadId);
  } catch (err) {
    console.error(`[report:${leadId}] error:`, err);
  }
}

function buildEmailHtml(
  firstName: string,
  domain: string,
  score: number | null,
  summary: Record<string, unknown> | null
): string {
  const band = (summary as { band?: { label?: string } } | null)?.band?.label ?? "";
  const actions = ((summary as { priority_actions?: Array<{ title?: string }> } | null)?.priority_actions ?? []).slice(0, 3);

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #111;">
  <h1 style="font-size: 24px; margin-bottom: 4px;">Your AI Readiness Report</h1>
  <p style="color: #666; margin-top: 0;">${domain}</p>

  <div style="background: #f4f4f5; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
    <div style="font-size: 56px; font-weight: 700; line-height: 1;">${score ?? "—"}</div>
    <div style="color: #666; font-size: 14px;">out of 100</div>
    ${band ? `<div style="font-weight: 600; margin-top: 8px;">${band}</div>` : ""}
  </div>

  <p>Hi ${firstName},</p>
  <p>Your full AI readiness report for <strong>${domain}</strong> is attached. It includes a score breakdown across all 5 categories, evidence from your site, and step-by-step fix instructions.</p>

  ${actions.length > 0 ? `
  <h2 style="font-size: 16px;">Your top 3 priorities:</h2>
  <ol style="padding-left: 20px;">
    ${actions.map((a) => `<li style="margin-bottom: 8px;">${a.title ?? ""}</li>`).join("")}
  </ol>
  ` : ""}

  <p style="margin-top: 24px;">Questions about your results? Reply to this email — I read every one.</p>
  <p>— Lee<br><span style="color: #666; font-size: 13px;">Performance Peak · <a href="https://promptscore.co.uk" style="color: #666;">promptscore.co.uk</a></span></p>

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
  <p style="font-size: 12px; color: #9ca3af;">You received this because you requested a PromptScore report for ${domain}. <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color: #9ca3af;">Unsubscribe</a>.</p>
</body>
</html>`;
}

function buildEmailText(firstName: string, domain: string, score: number | null): string {
  return `Hi ${firstName},

Your PromptScore AI Readiness Report for ${domain} is attached.

Overall score: ${score ?? "—"}/100

Open the PDF for your full breakdown, category scores, evidence, and step-by-step fixes.

Questions? Just reply to this email.

— Lee
Performance Peak · promptscore.co.uk`;
}
