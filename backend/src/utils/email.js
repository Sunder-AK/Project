import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

// Create transporter — uses Ethereal (free test SMTP) if no real SMTP configured
let transporterPromise = null;

async function getTransporter() {
  if (transporterPromise) return transporterPromise;

  transporterPromise = (async () => {
    if (process.env.SMTP_HOST) {
      return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }

    // Auto-create Ethereal test account for development
    const testAccount = await nodemailer.createTestAccount();
    console.log('📧 Ethereal test email account created:');
    console.log(`   Email: ${testAccount.user}`);
    console.log(`   Pass:  ${testAccount.pass}`);
    console.log('   View sent emails at: https://ethereal.email/login');

    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  })();

  return transporterPromise;
}

const FROM_ADDRESS = process.env.SMTP_FROM || 'RequestTracker AI <noreply@requesttracker.dev>';

function buildEmailHTML(title, greeting, bodyLines, actionUrl, actionText, footerNote) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#0f0f1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f1a;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#1a1a2e;border-radius:16px;overflow:hidden;border:1px solid rgba(99,102,241,0.2);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px 40px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <div style="display:inline-block;width:36px;height:36px;background:rgba(255,255,255,0.2);border-radius:10px;text-align:center;line-height:36px;font-size:18px;margin-right:12px;vertical-align:middle;">🧠</div>
                  <span style="color:#fff;font-size:18px;font-weight:700;vertical-align:middle;">RequestTracker</span>
                  <span style="color:rgba(255,255,255,0.6);font-size:12px;vertical-align:middle;margin-left:8px;">AI-Powered Platform</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <h1 style="color:#e0e0ff;font-size:22px;margin:0 0 8px;">${title}</h1>
            <p style="color:#9ca3af;font-size:14px;margin:0 0 24px;">${greeting}</p>
            ${bodyLines.map(line => `<p style="color:#d1d5db;font-size:14px;line-height:1.6;margin:0 0 12px;">${line}</p>`).join('')}
            ${actionUrl ? `
            <table cellpadding="0" cellspacing="0" style="margin:28px 0;">
              <tr>
                <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);border-radius:8px;padding:12px 28px;">
                  <a href="${actionUrl}" style="color:#fff;text-decoration:none;font-size:14px;font-weight:600;">${actionText || 'View Request'}</a>
                </td>
              </tr>
            </table>` : ''}
            ${footerNote ? `<p style="color:#6b7280;font-size:12px;margin-top:24px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.05);">${footerNote}</p>` : ''}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px;background:rgba(0,0,0,0.2);border-top:1px solid rgba(255,255,255,0.05);">
            <p style="color:#4b5563;font-size:11px;margin:0;text-align:center;">© 2026 RequestTracker · AI-Powered Enterprise Platform · This is an automated notification</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendTicketCreatedEmail({ supervisorEmail, supervisorName, requestId, requestorName, requestType, priority, description }) {
  try {
    const transporter = await getTransporter();
    const html = buildEmailHTML(
      '📋 New Request Assigned to You',
      `Hi ${supervisorName},`,
      [
        `A new request <strong style="color:#818cf8;">${requestId}</strong> has been submitted and assigned to you for review.`,
        `<table cellpadding="8" cellspacing="0" style="background:rgba(99,102,241,0.08);border-radius:8px;border:1px solid rgba(99,102,241,0.15);width:100%;margin:8px 0;">
          <tr><td style="color:#9ca3af;font-size:12px;width:120px;">Requestor</td><td style="color:#e0e0ff;font-size:14px;font-weight:500;">${requestorName}</td></tr>
          <tr><td style="color:#9ca3af;font-size:12px;">Type</td><td style="color:#e0e0ff;font-size:14px;">${requestType}</td></tr>
          <tr><td style="color:#9ca3af;font-size:12px;">Priority</td><td style="color:${priority === 'high' ? '#ef4444' : priority === 'medium' ? '#f59e0b' : '#64748b'};font-size:14px;font-weight:600;">${priority.toUpperCase()}</td></tr>
          <tr><td style="color:#9ca3af;font-size:12px;vertical-align:top;">Description</td><td style="color:#d1d5db;font-size:13px;">${description.substring(0, 200)}${description.length > 200 ? '...' : ''}</td></tr>
        </table>`,
        'Please review this request at your earliest convenience.'
      ],
      null, null,
      'You received this email because you are assigned as the supervisor for this request.'
    );

    const info = await transporter.sendMail({
      from: FROM_ADDRESS,
      to: supervisorEmail,
      subject: `[${requestId}] New Request: ${requestType} — ${priority.toUpperCase()} priority`,
      html,
    });

    console.log(`📧 Ticket created email sent to ${supervisorEmail}`, nodemailer.getTestMessageUrl(info) || '');
    return info;
  } catch (err) {
    console.error('Failed to send ticket created email:', err.message);
  }
}

export async function sendTicketApprovedEmail({ userEmail, userName, requestId, requestorName, approverName }) {
  try {
    const transporter = await getTransporter();
    const html = buildEmailHTML(
      '✅ Your Request Has Been Approved',
      `Hi ${userName},`,
      [
        `Great news! Your request <strong style="color:#34d399;">${requestId}</strong> has been <span style="color:#34d399;font-weight:700;">approved</span> by <strong>${approverName}</strong>.`,
        'The team will now proceed with the implementation. You\'ll receive updates as your request progresses.',
      ],
      null, null,
      `Request submitted by ${requestorName}.`
    );

    const info = await transporter.sendMail({
      from: FROM_ADDRESS,
      to: userEmail,
      subject: `✅ [${requestId}] Request Approved`,
      html,
    });

    console.log(`📧 Approved email sent to ${userEmail}`, nodemailer.getTestMessageUrl(info) || '');
    return info;
  } catch (err) {
    console.error('Failed to send approval email:', err.message);
  }
}

export async function sendTicketDeclinedEmail({ userEmail, userName, requestId, requestorName, declinedBy, reason }) {
  try {
    const transporter = await getTransporter();
    const html = buildEmailHTML(
      '❌ Your Request Has Been Declined',
      `Hi ${userName},`,
      [
        `Your request <strong style="color:#f87171;">${requestId}</strong> has been <span style="color:#f87171;font-weight:700;">declined</span> by <strong>${declinedBy}</strong>.`,
        reason ? `<div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:8px;padding:12px 16px;margin:8px 0;"><strong style="color:#fca5a5;font-size:12px;">REASON:</strong><br/><span style="color:#d1d5db;font-size:14px;">${reason}</span></div>` : '',
        'If you believe this was declined in error, please contact your supervisor or submit a revised request.',
      ],
      null, null,
      `Request originally submitted by ${requestorName}.`
    );

    const info = await transporter.sendMail({
      from: FROM_ADDRESS,
      to: userEmail,
      subject: `❌ [${requestId}] Request Declined`,
      html,
    });

    console.log(`📧 Declined email sent to ${userEmail}`, nodemailer.getTestMessageUrl(info) || '');
    return info;
  } catch (err) {
    console.error('Failed to send decline email:', err.message);
  }
}
