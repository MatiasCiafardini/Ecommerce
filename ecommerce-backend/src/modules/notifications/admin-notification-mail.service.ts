import { Injectable, Logger } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../../prisma/prisma.service';

type AdminNotificationEmailInput = {
  storeId: number;
  title: string;
  body: string;
  href: string;
  buttonLabel?: string;
};

type CustomerNotificationEmailInput = {
  storeId: number;
  customerEmail: string;
  customerName?: string | null;
  title: string;
  body: string;
  href: string;
  buttonLabel?: string;
};

@Injectable()
export class AdminNotificationMailService {
  private readonly logger = new Logger(AdminNotificationMailService.name);
  private readonly enabled = this.readBoolean('EMAIL_NOTIFICATIONS_ENABLED');
  private readonly fromEmail =
    process.env.EMAIL_NOTIFICATIONS_FROM?.trim() ||
    process.env.SMTP_FROM_EMAIL?.trim() ||
    process.env.SMTP_USER?.trim() ||
    '';
  private readonly fromName =
    process.env.EMAIL_NOTIFICATIONS_FROM_NAME?.trim() || 'Ecommerce';
  private transporterPromise: Promise<nodemailer.Transporter> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async sendAdminNotification(input: AdminNotificationEmailInput) {
    if (!this.enabled) {
      return;
    }

    if (!this.fromEmail) {
      this.logger.warn(
        'Email notifications are enabled but no sender email is configured.',
      );
      return;
    }

    const [store, adminUsers] = await Promise.all([
      this.prisma.store.findUnique({
        where: { id: input.storeId },
        select: {
          id: true,
          name: true,
          domain: true,
        },
      }),
      this.prisma.user.findMany({
        where: {
          storeId: input.storeId,
          role: {
            in: [Role.OWNER, Role.ADMIN, Role.STAFF],
          },
        },
        select: {
          email: true,
        },
      }),
    ]);

    const recipients = adminUsers
      .map((user) => user.email?.trim().toLowerCase())
      .filter((email): email is string => Boolean(email));

    if (!store || recipients.length === 0) {
      return;
    }

    const storeLabel = store.name?.trim() || `Tienda ${store.id}`;

    try {
      await this.sendEmail({
        storeDomain: store.domain,
        recipients,
        storeLabel,
        title: input.title,
        body: input.body,
        href: input.href,
        buttonLabel: input.buttonLabel,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Could not send admin notification email: ${message}`);
    }
  }

  async sendCustomerNotification(input: CustomerNotificationEmailInput) {
    if (!this.enabled) {
      return;
    }

    if (!this.fromEmail) {
      this.logger.warn(
        'Email notifications are enabled but no sender email is configured.',
      );
      return;
    }

    const store = await this.prisma.store.findUnique({
      where: { id: input.storeId },
      select: {
        id: true,
        name: true,
        domain: true,
      },
    });

    const recipient = input.customerEmail.trim().toLowerCase();

    if (!store || !recipient) {
      return;
    }

    const storeLabel = store.name?.trim() || `Tienda ${store.id}`;
    const greetingName = input.customerName?.trim() || 'Hola';

    try {
      await this.sendEmail({
        storeDomain: store.domain,
        recipients: [recipient],
        storeLabel,
        title: input.title,
        body: `${greetingName}, ${input.body.charAt(0).toLowerCase()}${input.body.slice(1)}`,
        href: input.href,
        buttonLabel: input.buttonLabel,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Could not send customer notification email: ${message}`,
      );
    }
  }

  private async getTransporter() {
    if (!this.transporterPromise) {
      this.transporterPromise = Promise.resolve(
        nodemailer.createTransport({
          host: process.env.SMTP_HOST?.trim(),
          port: this.readNumber('SMTP_PORT', 587),
          secure: this.readBoolean('SMTP_SECURE'),
          auth: process.env.SMTP_USER?.trim()
            ? {
                user: process.env.SMTP_USER?.trim(),
                pass: process.env.SMTP_PASS?.trim(),
              }
            : undefined,
        }),
      );
    }

    return this.transporterPromise;
  }

  private async sendEmail(input: {
    storeDomain: string;
    recipients: string[];
    storeLabel: string;
    title: string;
    body: string;
    href: string;
    buttonLabel?: string;
  }) {
    const notificationUrl = this.buildNotificationUrl(
      input.storeDomain,
      input.href,
    );
    const transporter = await this.getTransporter();

    await transporter.sendMail({
      from: `"${this.escapeDisplayName(this.fromName)}" <${this.fromEmail}>`,
      to: input.recipients.join(', '),
      subject: `${input.storeLabel}: ${input.title}`,
      text: this.buildTextBody({
        storeLabel: input.storeLabel,
        title: input.title,
        body: input.body,
        notificationUrl,
        buttonLabel: input.buttonLabel,
      }),
      html: this.buildHtmlBody({
        storeLabel: input.storeLabel,
        title: input.title,
        body: input.body,
        notificationUrl,
        buttonLabel: input.buttonLabel,
      }),
    });
  }

  private buildNotificationUrl(domain: string, href: string) {
    const absoluteBase =
      process.env.STOREFRONT_PUBLIC_URL?.trim() ||
      this.inferStorefrontBaseUrl(domain);

    return new URL(href, absoluteBase).toString();
  }

  private inferStorefrontBaseUrl(domain: string) {
    const normalizedDomain = domain.trim();

    if (/^https?:\/\//i.test(normalizedDomain)) {
      return normalizedDomain.endsWith('/')
        ? normalizedDomain
        : `${normalizedDomain}/`;
    }

    const protocol =
      normalizedDomain.startsWith('localhost') ||
      normalizedDomain.startsWith('127.0.0.1') ||
      normalizedDomain.startsWith('192.168.') ||
      normalizedDomain.startsWith('10.') ||
      normalizedDomain.includes(':')
        ? 'http'
        : 'https';

    return `${protocol}://${normalizedDomain}/`;
  }

  private buildTextBody(input: {
    storeLabel: string;
    title: string;
    body: string;
    notificationUrl: string;
    buttonLabel?: string;
  }) {
    return [
      `${input.storeLabel}`,
      '',
      input.title,
      input.body,
      '',
      `${input.buttonLabel ?? 'Abrir notificacion'}: ${input.notificationUrl}`,
    ].join('\n');
  }

  private buildHtmlBody(input: {
    storeLabel: string;
    title: string;
    body: string;
    notificationUrl: string;
    buttonLabel?: string;
  }) {
    return `
      <div style="background:#f6f1ea;padding:32px 16px;font-family:Arial,sans-serif;color:#1f1f1f;">
        <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e6ddd2;border-radius:20px;overflow:hidden;">
          <div style="padding:24px 24px 16px;background:linear-gradient(180deg,#fcfaf7,#f4ede4);border-bottom:1px solid #e6ddd2;">
            <div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#8a6f55;">
              ${this.escapeHtml(input.storeLabel)}
            </div>
            <h1 style="margin:12px 0 0;font-size:24px;line-height:1.2;color:#201a17;">
              ${this.escapeHtml(input.title)}
            </h1>
          </div>
          <div style="padding:24px;">
            <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#4a3d33;">
              ${this.escapeHtml(input.body)}
            </p>
            <a
              href="${this.escapeHtml(input.notificationUrl)}"
              style="display:inline-block;padding:14px 20px;border-radius:999px;background:#201a17;color:#ffffff;text-decoration:none;font-weight:700;"
            >
              ${this.escapeHtml(input.buttonLabel ?? 'Abrir notificacion')}
            </a>
            <p style="margin:20px 0 0;font-size:12px;line-height:1.6;color:#8a7c70;">
              Si el boton no funciona, copia este enlace en tu navegador:<br />
              <span>${this.escapeHtml(input.notificationUrl)}</span>
            </p>
          </div>
        </div>
      </div>
    `;
  }

  private readBoolean(name: string) {
    const value = process.env[name]?.trim().toLowerCase();
    return value === '1' || value === 'true' || value === 'yes';
  }

  private readNumber(name: string, fallback: number) {
    const raw = process.env[name]?.trim();
    const value = raw ? Number(raw) : NaN;
    return Number.isFinite(value) ? value : fallback;
  }

  private escapeHtml(value: string) {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  private escapeDisplayName(value: string) {
    return value.replaceAll('"', '\\"');
  }
}
