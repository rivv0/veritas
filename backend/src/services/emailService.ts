import nodemailer, { Transporter } from 'nodemailer';
import { Resend } from 'resend';
import { config } from '../config';

export class EmailService {
  private resend: Resend | null = null;
  private smtpTransporter: Transporter | null = null;

  constructor() {
    this.initTransporters();
  }

  private initTransporters() {
    if (config.email.smtpUser && config.email.smtpPass) {
      this.smtpTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: config.email.smtpUser,
          pass: config.email.smtpPass.replace(/\s+/g, ''), // strip spaces if user pasted "abcd efgh ijkl mnop"
        },
      });
    }

    if (config.email.resendApiKey) {
      this.resend = new Resend(config.email.resendApiKey);
    }
  }

  private getSmtpTransporter(): Transporter | null {
    if (!this.smtpTransporter && config.email.smtpUser && config.email.smtpPass) {
      this.initTransporters();
    }
    return this.smtpTransporter;
  }

  private getResendClient(): Resend | null {
    if (!this.resend && config.email.resendApiKey) {
      this.initTransporters();
    }
    return this.resend;
  }

  async sendPasswordResetEmail(to: string, resetCode: string): Promise<boolean> {
    const subject = `[VERITAS] Your Password Reset Verification Code: ${resetCode}`;
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>VERITAS Password Reset</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 480px; background-color: #000000; border: 1px solid #27272a; padding: 32px;">
          <tr>
            <td>
              <div style="font-family: monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #a1a1aa; margin-bottom: 8px;">
                VERITAS Terminal Security
              </div>
              <h1 style="font-size: 20px; font-weight: 600; color: #ffffff; margin: 0 0 16px 0; letter-spacing: -0.5px;">
                Password Reset Verification
              </h1>
              <p style="font-size: 14px; line-height: 1.5; color: #d4d4d8; margin: 0 0 24px 0;">
                A password reset was requested for your account. Enter the 6-digit verification code below in your browser terminal:
              </p>
              
              <div style="background-color: #121214; border: 1px solid #3f3f46; padding: 20px; text-align: center; margin: 0 0 24px 0;">
                <span style="font-family: monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #ffffff;">
                  ${resetCode}
                </span>
              </div>

              <p style="font-size: 12px; line-height: 1.5; color: #71717a; margin: 0 0 16px 0;">
                • This verification code expires in <strong>15 minutes</strong>.<br>
                • Each code is single-use and invalidates any previous codes.<br>
                • If you did not request this password reset, please ignore this email.
              </p>

              <div style="border-top: 1px solid #27272a; padding-top: 16px; margin-top: 24px; font-size: 11px; color: #52525b; font-family: monospace;">
                VERITAS High-Frequency Market Terminal
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    const text = `
VERITAS Terminal Security - Password Reset
------------------------------------------
A password reset was requested for your account.

Your 6-Digit Verification Code:
${resetCode}

This code expires in 15 minutes.
If you did not request this reset, you can safely ignore this email.
    `.trim();

    // 1. Try Gmail / SMTP first if configured
    const smtp = this.getSmtpTransporter();
    if (smtp) {
      try {
        const fromHeader = `VERITAS Terminal <${config.email.smtpUser}>`;
        await smtp.sendMail({
          from: fromHeader,
          to,
          subject,
          html,
          text,
        });
        console.log(`[VERITAS Email] Password reset email successfully delivered to ${to} via Gmail SMTP.`);
        return true;
      } catch (err: any) {
        console.error(`[VERITAS Email] Gmail SMTP delivery failed for ${to}:`, err.message || err);
      }
    }

    // 2. Fall back to Resend API if configured
    const resend = this.getResendClient();
    if (resend) {
      try {
        const res = await resend.emails.send({
          from: config.email.fromEmail,
          to: [to],
          subject,
          html,
          text,
        });

        if (res.error) {
          console.error(`[VERITAS Email] Resend delivery error for ${to}:`, res.error);
          return false;
        }

        console.log(`[VERITAS Email] Password reset email successfully delivered to ${to} via Resend. (ID: ${res.data?.id})`);
        return true;
      } catch (err: any) {
        console.error(`[VERITAS Email] Resend delivery exception for ${to}:`, err.message || err);
        return false;
      }
    }

    if (!smtp && !resend) {
      console.warn(`[VERITAS Email] Neither SMTP (Gmail) nor RESEND_API_KEY is configured. Verification code was: ${resetCode}`);
    }

    return false;
  }
}

export const emailService = new EmailService();
