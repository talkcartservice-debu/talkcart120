const nodemailer = require('nodemailer');
require('dotenv').config();

class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.initializeTransporter();
  }

  initializeTransporter() {
    try {
      // Check if email configuration is available
      const emailConfig = this.getEmailConfig();

      if (!emailConfig) {
        console.log('📧 Email service not configured - emails will be logged only');
        return;
      }

      // Create transporter based on configuration
      this.transporter = nodemailer.createTransport(emailConfig);
      this.isConfigured = true;

      console.log('📧 Email service initialized successfully');

      // Verify connection
      this.verifyConnection();
    } catch (error) {
      console.error('❌ Failed to initialize email service:', error.message);
      this.isConfigured = false;
    }
  }

  getEmailConfig() {
    // Gmail configuration (most common)
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      return {
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS // Use App Password for Gmail
        }
      };
    }

    // SMTP configuration
    if (process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS) {
      return {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT),
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      };
    }

    // SendGrid configuration
    if (process.env.SENDGRID_API_KEY) {
      return {
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY
        }
      };
    }

    // Mailgun configuration
    if (process.env.MAILGUN_SMTP_LOGIN && process.env.MAILGUN_SMTP_PASSWORD) {
      return {
        host: 'smtp.mailgun.org',
        port: 587,
        secure: false,
        auth: {
          user: process.env.MAILGUN_SMTP_LOGIN,
          pass: process.env.MAILGUN_SMTP_PASSWORD
        }
      };
    }

    return null;
  }

  async verifyConnection() {
    if (!this.transporter) return false;

    try {
      // Set a timeout for the verification
      const verifyPromise = this.transporter.verify();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Verification timeout')), 30000)
      );

      await Promise.race([verifyPromise, timeoutPromise]);
      console.log('✅ Email service connection verified');
      return true;
    } catch (error) {
      console.warn('⚠️ Email service verification failed (continuing without email):', error.message);
      // Don't disable the service completely, just log the warning
      // this.isConfigured = false;
      return false;
    }
  }

  generateEmailTemplate(template, data) {
    const { user, message, subject } = data;
    const userName = user.fullName || user.username;
    const currentYear = new Date().getFullYear();

    const baseTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .message { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #667eea; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
          .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
          .logo { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">TalkCart</div>
            <h1>${subject}</h1>
          </div>
          <div class="content">
            <p>Hello ${userName},</p>
            <div class="message">
              ${message.replace(/\n/g, '<br>')}
            </div>
            <p>If you have any questions, please don't hesitate to contact our support team.</p>
            <p>Best regards,<br>The TalkCart Team</p>
          </div>
          <div class="footer">
            <p>&copy; ${currentYear} TalkCart. All rights reserved.</p>
            <p>This email was sent from TalkCart Admin Panel.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return baseTemplate;
  }

  async sendEmail({ to, subject, message, template = 'admin-notification', user }) {
    try {
      const emailData = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@talkcart.com',
        to: to,
        subject: subject,
        html: this.generateEmailTemplate(template, { user, message, subject })
      };

      if (this.isConfigured && this.transporter) {
        // Send actual email
        const result = await this.transporter.sendMail(emailData);
        console.log(`📧 Email sent successfully to ${to}:`, result.messageId);

        return {
          success: true,
          messageId: result.messageId,
          recipient: to,
          sentAt: new Date()
        };
      } else {
        // Log email instead of sending (for development/testing)
        console.log('📧 Email would be sent (service not configured):');
        console.log(`   To: ${to}`);
        console.log(`   Subject: ${subject}`);
        console.log(`   Message: ${message.substring(0, 100)}...`);

        return {
          success: true,
          messageId: `mock_${Date.now()}`,
          recipient: to,
          sentAt: new Date(),
          mock: true
        };
      }
    } catch (error) {
      console.error(`❌ Failed to send email to ${to}:`, error.message);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  async sendBulkEmail({ recipients, subject, message, template = 'admin-notification' }) {
    const results = {
      total: recipients.length,
      sent: 0,
      failed: 0,
      errors: []
    };

    for (const recipient of recipients) {
      try {
        await this.sendEmail({
          to: recipient.email,
          subject,
          message,
          template,
          user: recipient
        });
        results.sent++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          email: recipient.email,
          error: error.message
        });
      }
    }

    return results;
  }

  getServiceStatus() {
    return {
      configured: this.isConfigured,
      provider: this.getProviderName(),
      ready: this.transporter !== null
    };
  }

  getProviderName() {
    if (process.env.EMAIL_USER) return 'Gmail';
    if (process.env.SENDGRID_API_KEY) return 'SendGrid';
    if (process.env.MAILGUN_SMTP_LOGIN) return 'Mailgun';
    if (process.env.SMTP_HOST) return 'SMTP';
    return 'Not configured';
  }
}

// Create singleton instance
const emailService = new EmailService();

module.exports = emailService;
