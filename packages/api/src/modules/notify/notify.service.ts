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

export interface WhatsAppAdapter {
  send(phone: string, templateName: string, variables: Record<string, string>): Promise<{ message_id: string }>;
}

export interface SmsAdapter {
  send(phone: string, message: string): Promise<{ message_id: string }>;
}

@Injectable()
export class NotifyService {
  private readonly logger = new Logger(NotifyService.name);

  constructor(private db: DatabaseService) {}

  async send(message: NotifyMessage): Promise<{ success: boolean; message_id?: string }> {
    // Check user notification preferences before sending
    if (message.user_id) {
      const prefsResult = await this.db.queryWithTenant(message.tenant_id, 'owner',
        `SELECT notification_preferences FROM tenant.users WHERE id = $1`, [message.user_id]);
      const prefs = (prefsResult.rows[0]?.notification_preferences as Record<string, boolean>) ?? {};
      if (prefs[message.channel] === false) {
        this.logger.log(`Skipping ${message.channel} notification for user ${message.user_id} — disabled by preference`);
        return { success: true };
      }
    }

    this.logger.log(`Sending ${message.channel} notification to ${message.phone}`);

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
    const apiKey = process.env.WHATSAPP_API_KEY;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!apiKey || !phoneNumberId) {
      this.logger.warn('WhatsApp API not configured — notification logged but not sent');
      return;
    }

    const template = this.getTemplate(message.template, message.tenant_id);

    const response = await fetch(
      `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: message.phone,
          type: 'text',
          text: { body: this.formatTemplate(template.body, message.variables) },
        }),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`WhatsApp API error ${response.status}: ${errorBody}`);
    }

    const data = (await response.json()) as { messages?: { id: string }[] };
    this.logger.log(`WhatsApp message sent: ${data.messages?.[0]?.id}`);
  }

  private async sendSMS(message: NotifyMessage): Promise<void> {
    const apiKey = process.env.SMS_API_KEY;
    const provider = process.env.SMS_PROVIDER || 'twilio';

    if (!apiKey) {
      this.logger.warn('SMS API not configured — notification logged but not sent');
      return;
    }

    const template = this.getTemplate(message.template, message.tenant_id);
    const body = this.formatTemplate(template.body, message.variables);

    if (provider === 'twilio') {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const fromNumber = process.env.TWILIO_FROM_NUMBER;
      if (!accountSid || !fromNumber) {
        this.logger.warn('Twilio not configured');
        return;
      }
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${Buffer.from(`${accountSid}:${apiKey}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: message.phone,
            From: fromNumber,
            Body: body,
          }),
        }
      );
      if (!response.ok) {
        throw new Error(`SMS API error: ${response.status}`);
      }
    }
  }

  private async createInAppNotification(message: NotifyMessage): Promise<void> {
    if (!message.user_id) return;

    await this.db.queryWithTenant(message.tenant_id, 'owner',
      `INSERT INTO tenant.notifications (tenant_id, user_id, channel, template, variables, status)
       VALUES ($1,$2,'in_app',$3,$4,'delivered')`,
      [message.tenant_id, message.user_id, message.template, JSON.stringify(message.variables)]);
  }

  private formatTemplate(body: string, variables: Record<string, string>): string {
    return body.replace(/\{(\w+)\}/g, (_, key) => variables[key] ?? `{${key}}`);
  }

  private getTemplate(templateName: string, _tenantId: string): { name: string; body: string } {
    const templates: Record<string, { name: string; body: string }> = {
      session_started: {
        name: 'session_started',
        body: 'Work session started\nMachine: {machine_code}\nOperator: {operator_name}\nMeter: {start_meter} {meter_unit}\nTime: {start_time}'
      },
      session_ended: {
        name: 'session_ended',
        body: 'Work session ended\nMachine: {machine_code}\nDuration: {duration}h\nDistance: {distance} {meter_unit}\nFuel: {fuel_liters}L'
      },
      alert_created: {
        name: 'alert_created',
        body: 'Alert: {alert_message}\nMachine: {machine_code}\nSeverity: {severity}'
      },
      alert_critical: {
        name: 'alert_critical',
        body: 'CRITICAL: {alert_message}\nMachine: {machine_code}\nImmediate attention required!'
      },
      maintenance_due: {
        name: 'maintenance_due',
        body: 'Maintenance due\nMachine: {machine_code}\nTask: {task_name}\nDue at: {due_value} {meter_unit}\nCurrent: {current_meter} {meter_unit}'
      },
      maintenance_overdue: {
        name: 'maintenance_overdue',
        body: 'MAINTENANCE OVERDUE\nMachine: {machine_code}\nTask: {task_name}\nOverdue by: {overdue_amount} {meter_unit}'
      },
      payment_received: {
        name: 'payment_received',
        body: 'Payment received\nClient: {client_name}\nAmount: {currency} {amount}\nReference: {reference}'
      },
      payment_due: {
        name: 'payment_due',
        body: 'Payment due\nClient: {client_name}\nAmount: {currency} {amount}\nDue date: {due_date}'
      },
      daily_summary: {
        name: 'daily_summary',
        body: 'Daily Summary - {date}\nSessions: {session_count}\nActive machines: {active_machines}\nFuel logged: {fuel_liters}L\nExpenses: {currency} {expense_amount}'
      },
      fuel_anomaly: {
        name: 'fuel_anomaly',
        body: 'Fuel anomaly detected\nMachine: {machine_code}\nExpected: {expected_liters}L\nActual: {actual_liters}L\nDifference: {difference}L'
      },
      cash_variance: {
        name: 'cash_variance',
        body: 'Cash variance detected\nAccount: {account_name}\nExpected: {currency} {expected}\nActual: {currency} {actual}\nVariance: {currency} {variance}'
      },
    };
    return templates[templateName] || { name: templateName, body: templateName };
  }
}
