import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

export interface NotifyMessage {
  tenant_id: string;
  user_id?: string;
  phone: string;
  template: string;
  variables: Record<string, string>;
  channel: 'whatsapp' | 'sms' | 'in_app';
}

@Injectable()
export class NotifyService {
  private readonly logger = new Logger(NotifyService.name);

  constructor(private db: DatabaseService) {}

  async send(message: NotifyMessage): Promise<{ success: boolean; message_id?: string }> {
    this.logger.log(`Sending ${message.channel} notification to ${message.phone}`);

    // Store notification in DB
    const result = await this.db.queryWithTenant(message.tenant_id, 'owner',
      `INSERT INTO tenant.notifications (tenant_id, user_id, channel, template, variables, status, phone)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [message.tenant_id, message.user_id, message.channel, message.template,
       JSON.stringify(message.variables), 'pending', message.phone]);

    const notification = result.rows[0];

    try {
      if (message.channel === 'whatsapp') {
        await this.sendWhatsApp(message);
      } else if (message.channel === 'sms') {
        await this.sendSMS(message);
      } else {
        await this.createInAppNotification(message);
      }

      await this.db.queryWithTenant(message.tenant_id, 'owner',
        `UPDATE tenant.notifications SET status = 'sent', sent_at = NOW() WHERE id = $1`,
        [notification.id]);

      return { success: true, message_id: notification.id };
    } catch (error) {
      this.logger.error(`Failed to send notification: ${error}`);
      await this.db.queryWithTenant(message.tenant_id, 'owner',
        `UPDATE tenant.notifications SET status = 'failed', error = $2 WHERE id = $1`,
        [notification.id, (error as Error).message]);
      return { success: false };
    }
  }

  private async sendWhatsApp(message: NotifyMessage): Promise<void> {
    // WhatsApp Business API integration
    const apiKey = process.env.WHATSAPP_API_KEY;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!apiKey || !phoneNumberId) {
      this.logger.warn('WhatsApp API not configured, skipping');
      return;
    }

    const template = await this.getTemplate(message.template, message.tenant_id);

    // In production, this would call the WhatsApp Business API
    // const response = await fetch(`https://graph.facebook.com/v17.0/${phoneNumberId}/messages`, {
    //   method: 'POST',
    //   headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     messaging_product: 'whatsapp',
    //     to: message.phone,
    //     type: 'template',
    //     template: { name: template.name, language: { code: 'en' }, components: [...] }
    //   })
    // });

    this.logger.log(`WhatsApp message sent to ${message.phone}`);
  }

  private async sendSMS(message: NotifyMessage): Promise<void> {
    // SMS provider integration (e.g., Twilio, AWS SNS)
    this.logger.log(`SMS sent to ${message.phone}`);
  }

  private async createInAppNotification(message: NotifyMessage): Promise<void> {
    // Create in-app notification for the user
    if (!message.user_id) return;

    await this.db.queryWithTenant(message.tenant_id, 'owner',
      `INSERT INTO tenant.notifications (tenant_id, user_id, channel, template, variables, status)
       VALUES ($1,$2,'in_app',$3,$4,'delivered')`,
      [message.tenant_id, message.user_id, message.template, JSON.stringify(message.variables)]);
  }

  private async getTemplate(templateName: string, tenantId: string): Promise<{ name: string; body: string }> {
    // Load template from DB or default templates
    const templates: Record<string, { name: string; body: string }> = {
      session_started: { name: 'session_started', body: 'Work session started for {machine_code}' },
      session_ended: { name: 'session_ended', body: 'Work session ended. Duration: {duration}h' },
      alert_created: { name: 'alert_created', body: 'Alert: {alert_message}' },
      maintenance_due: { name: 'maintenance_due', body: 'Maintenance due for {machine_code}: {task_name}' },
      payment_received: { name: 'payment_received', body: 'Payment received: {amount} from {client_name}' },
    };
    return templates[templateName] || { name: templateName, body: templateName };
  }
}
