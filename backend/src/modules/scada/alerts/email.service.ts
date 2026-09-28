import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export interface AlertEmailOptions {
  to: string[];
  deviceId: string;
  deviceName?: string;
  alertType: string;
  message: string;
  intensity?: number;
  triggerKey?: string;
  conditionDetails?: string;
  currentValue?: number | string;
}

@Injectable()
export class AlertsEmailService {
  private readonly logger = new Logger(AlertsEmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private isSmtpReady = false;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS ? process.env.SMTP_PASS.replace(/\s+/g, '') : undefined;
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;

    if (host && user && pass) {
      try {
        this.transporter = nodemailer.createTransport({
          host,
          port,
          secure,
          auth: { user, pass },
          tls: {
            rejectUnauthorized: false, // Useful for self-signed or enterprise gateways
          },
        });
        this.isSmtpReady = true;
        this.logger.log(`SMTP configured for ${host}:${port} (Sender: ${this.getFromAddress()})`);
      } catch (err: any) {
        this.logger.error(`Failed to initialize SMTP transporter: ${err.message}`);
        this.isSmtpReady = false;
      }
    } else {
      this.logger.warn(
        'SMTP credentials not fully configured in environment (SMTP_HOST, SMTP_USER, SMTP_PASS). Email service in preview/simulation mode.',
      );
    }
  }

  private getFromAddress(): string {
    return process.env.SMTP_FROM || 'Gmark IoT Alerts <alerts@gmarkiot.com>';
  }

  public isConfigured(): boolean {
    return this.isSmtpReady && this.transporter !== null;
  }

  public getStatus() {
    const defaultEmails = (process.env.ALERT_DEFAULT_EMAILS || '')
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean);

    return {
      configured: this.isConfigured(),
      host: process.env.SMTP_HOST || 'Not set',
      port: process.env.SMTP_PORT || '587',
      from: this.getFromAddress(),
      defaultRecipients: defaultEmails,
    };
  }

  /**
   * Send an automated Device Alert Email
   */
  async sendAlertEmail(options: AlertEmailOptions): Promise<{ success: boolean; sentTo: string[]; error?: string }> {
    const recipients = options.to.filter((email) => email && email.includes('@'));
    if (recipients.length === 0) {
      this.logger.warn(`No valid recipient emails provided for alert on device ${options.deviceId}`);
      return { success: false, sentTo: [], error: 'No valid recipient email addresses' };
    }

    const typeColor = this.getSeverityColor(options.alertType);
    const htmlContent = this.generateAlertEmailHtml(options, typeColor);
    const subject = `[DEVICE ALERT - ${options.alertType}] Device ${options.deviceName || options.deviceId}: ${options.message}`;

    if (!this.isConfigured() || !this.transporter) {
      this.logger.warn(
        `[EMAIL SIMULATION] SMTP not set. Would have sent email to: [${recipients.join(', ')}] with subject: "${subject}"`,
      );
      return {
        success: true,
        sentTo: recipients,
        error: 'Simulated (SMTP not configured in .env)',
      };
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.getFromAddress(),
        to: recipients.join(', '),
        subject,
        html: htmlContent,
      });

      this.logger.log(`Alert email sent to ${recipients.join(', ')} [MessageId: ${info.messageId}]`);
      return { success: true, sentTo: recipients };
    } catch (err: any) {
      this.logger.error(`Failed to send alert email to ${recipients.join(', ')}: ${err.message}`);
      return { success: false, sentTo: [], error: err.message };
    }
  }

  /**
   * Send a test email to verify SMTP configuration
   */
  async sendTestEmail(toEmail: string, deviceId: string = 'TEST-DEVICE-01') {
    return this.sendAlertEmail({
      to: [toEmail],
      deviceId,
      deviceName: 'Booster Pump Station #1',
      alertType: 'WARNING',
      message: 'This is a test notification confirming email delivery is functional.',
      intensity: 3,
      triggerKey: 'test_alert',
      conditionDetails: 'Test Triggered via Alert Settings',
      currentValue: 'OK (Verified)',
    });
  }

  private getSeverityColor(type: string): { bg: string; border: string; text: string; badge: string } {
    switch (type.toUpperCase()) {
      case 'EMERGENCY':
        return { bg: '#FEF2F2', border: '#EF4444', text: '#991B1B', badge: '#DC2626' };
      case 'CRITICAL':
        return { bg: '#FFF1F2', border: '#F43F5E', text: '#9F1239', badge: '#E11D48' };
      case 'WARNING':
        return { bg: '#FFFBEB', border: '#F59E0B', text: '#92400E', badge: '#D97706' };
      case 'NOTIFY':
      default:
        return { bg: '#EFF6FF', border: '#3B82F6', text: '#1E40AF', badge: '#2563EB' };
    }
  }

  private generateAlertEmailHtml(options: AlertEmailOptions, colors: { bg: string; border: string; text: string; badge: string }): string {
    const frontendBaseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const monitorUrl = `${frontendBaseUrl}/scada/devices/${options.deviceId}/monitor`;
    const timestamp = new Date().toLocaleString('en-US', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'full',
      timeStyle: 'medium',
    });

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Device Alert Notification</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F3F4F6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1F2937;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #F3F4F6; padding: 30px 15px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table width="600" border="0" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08); border: 1px solid #E5E7EB;">
          
          <!-- Header Bar -->
          <tr>
            <td style="background-color: #0F172A; padding: 20px 30px; text-align: left;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="color: #10B981; font-weight: 800; font-size: 18px; letter-spacing: 1px;">GMARK</span>
                    <span style="color: #94A3B8; font-weight: 500; font-size: 16px; margin-left: 6px;">IoT Monitoring Platform</span>
                  </td>
                  <td align="right">
                    <span style="background-color: ${colors.badge}; color: #FFFFFF; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px;">
                      ${options.alertType}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Alert Banner Box -->
          <tr>
            <td style="padding: 24px 30px 10px 30px;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: ${colors.bg}; border-left: 5px solid ${colors.border}; border-radius: 6px; padding: 16px 20px;">
                <tr>
                  <td>
                    <h2 style="margin: 0 0 6px 0; color: ${colors.text}; font-size: 18px; font-weight: 700;">
                      ${options.message}
                    </h2>
                    <p style="margin: 0; color: #4B5563; font-size: 13px;">
                      Trigger key: <strong style="font-family: monospace;">${options.triggerKey || 'System Event'}</strong>
                      ${options.intensity ? ` | Intensity Level: <strong>${options.intensity} / 5</strong>` : ''}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Device & Telemetry Details -->
          <tr>
            <td style="padding: 10px 30px 24px 30px;">
              <h4 style="margin: 15px 0 10px 0; color: #374151; font-size: 13px; text-transform: uppercase; letter-spacing: 0.8px;">
                Telemetry & Incident Details
              </h4>
              <table width="100%" border="0" cellpadding="8" cellspacing="0" style="background-color: #F9FAFB; border-radius: 8px; border: 1px solid #E5E7EB; font-size: 14px;">
                <tr style="border-bottom: 1px solid #E5E7EB;">
                  <td width="35%" style="color: #6B7280; font-weight: 500;">Device ID:</td>
                  <td width="65%" style="color: #111827; font-weight: 600; font-family: monospace;">${options.deviceId}</td>
                </tr>
                ${options.deviceName ? `
                <tr style="border-bottom: 1px solid #E5E7EB;">
                  <td style="color: #6B7280; font-weight: 500;">Device Name:</td>
                  <td style="color: #111827; font-weight: 600;">${options.deviceName}</td>
                </tr>` : ''}
                ${options.conditionDetails ? `
                <tr style="border-bottom: 1px solid #E5E7EB;">
                  <td style="color: #6B7280; font-weight: 500;">Threshold Condition:</td>
                  <td style="color: #111827; font-weight: 600;">${options.conditionDetails}</td>
                </tr>` : ''}
                ${options.currentValue !== undefined ? `
                <tr style="border-bottom: 1px solid #E5E7EB;">
                  <td style="color: #6B7280; font-weight: 500;">Trigger Value:</td>
                  <td style="color: #DC2626; font-weight: 700; font-family: monospace;">${options.currentValue}</td>
                </tr>` : ''}
                <tr>
                  <td style="color: #6B7280; font-weight: 500;">Timestamp:</td>
                  <td style="color: #111827; font-weight: 500;">${timestamp}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Action Button -->
          <tr>
            <td align="center" style="padding: 0 30px 30px 30px;">
              <table border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="border-radius: 8px; background-color: #0F172A;">
                    <a href="${monitorUrl}" target="_blank" style="display: inline-block; padding: 12px 28px; font-size: 14px; font-weight: 600; color: #FFFFFF; text-decoration: none; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                      Open Device Live Monitor &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 12px 0 0 0; color: #9CA3AF; font-size: 12px;">
                You can acknowledge or resolve this alarm directly inside the live monitoring dashboard.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 18px 30px; text-align: center;">
              <p style="margin: 0; color: #64748B; font-size: 12px; line-height: 18px;">
                This is an automated alert generated by Gmark IoT Notification Engine.<br>
                For technical assistance or alert configuration changes, access your device management console.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }
}
