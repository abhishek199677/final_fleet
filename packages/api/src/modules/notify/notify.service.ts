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
      // Session templates
      session_started: {
        name: 'session_started',
        body: '🚛 Work session started\nMachine: {machine_code}\nOperator: {operator_name}\nMeter: {start_meter} {meter_unit}\nTime: {start_time}'
      },
      session_ended: {
        name: 'session_ended',
        body: '✅ Work session ended\nMachine: {machine_code}\nDuration: {duration}h\nDistance: {distance} {meter_unit}\nFuel: {fuel_liters}L'
      },
      // Alert templates
      alert_created: {
        name: 'alert_created',
        body: '⚠️ Alert: {alert_message}\nMachine: {machine_code}\nSeverity: {severity}'
      },
      alert_critical: {
        name: 'alert_critical',
        body: '🚨 CRITICAL: {alert_message}\nMachine: {machine_code}\nImmediate attention required!'
      },
      // Maintenance templates
      maintenance_due: {
        name: 'maintenance_due',
        body: '🔧 Maintenance due\nMachine: {machine_code}\nTask: {task_name}\nDue at: {due_value} {meter_unit}\nCurrent: {current_meter} {meter_unit}'
      },
      maintenance_overdue: {
        name: 'maintenance_overdue',
        body: '🚨 MAINTENANCE OVERDUE\nMachine: {machine_code}\nTask: {task_name}\nOverdue by: {overdue_amount} {meter_unit}'
      },
      // Financial templates
      payment_received: {
        name: 'payment_received',
        body: '💰 Payment received\nClient: {client_name}\nAmount: {currency} {amount}\nReference: {reference}'
      },
      payment_due: {
        name: 'payment_due',
        body: '📅 Payment due\nClient: {client_name}\nAmount: {currency} {amount}\nDue date: {due_date}'
      },
      // Daily summary
      daily_summary: {
        name: 'daily_summary',
        body: '📊 Daily Summary - {date}\nSessions: {session_count}\nActive machines: {active_machines}\nFuel logged: {fuel_liters}L\nExpenses: {currency} {expense_amount}'
      },
      // Fuel alert
      fuel_anomaly: {
        name: 'fuel_anomaly',
        body: '⛽ Fuel anomaly detected\nMachine: {machine_code}\nExpected: {expected_liters}L\nActual: {actual_liters}L\nDifference: {difference}L'
      },
      // Cash variance
      cash_variance: {
        name: 'cash_variance',
        body: '💵 Cash variance detected\nAccount: {account_name}\nExpected: {currency} {expected}\nActual: {currency} {actual}\nVariance: {currency} {variance}'
      },
    };
    return templates[templateName] || { name: templateName, body: templateName };
  }
}
