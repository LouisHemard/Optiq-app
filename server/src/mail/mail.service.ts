import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    if (process.env.SMTP_HOST) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    } else {
      console.warn('[MailService] SMTP non configuré — les emails ne seront pas envoyés.');
    }
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    if (!this.transporter) return;
    const url = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    await this.transporter.sendMail({
      from: `"Optiq" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: email,
      subject: 'Vérifiez votre adresse email — Optiq',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
          <h2 style="color:#4F46E5;margin-bottom:8px">Bienvenue sur Optiq !</h2>
          <p style="color:#374151;margin-bottom:24px">
            Cliquez sur le bouton ci-dessous pour vérifier votre adresse email.
            Ce lien est valable <strong>24 heures</strong>.
          </p>
          <a href="${url}" style="display:inline-block;padding:12px 24px;background:#4F46E5;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
            Vérifier mon email
          </a>
          <p style="color:#9CA3AF;font-size:13px;margin-top:24px">
            Si vous n'avez pas créé de compte, ignorez cet email.
          </p>
        </div>
      `,
    });
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    if (!this.transporter) return;
    const url = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    await this.transporter.sendMail({
      from: `"Optiq" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: email,
      subject: 'Réinitialisation de mot de passe — Optiq',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
          <h2 style="color:#4F46E5;margin-bottom:8px">Réinitialisation de mot de passe</h2>
          <p style="color:#374151;margin-bottom:24px">
            Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.
            Ce lien est valable <strong>1 heure</strong>.
          </p>
          <a href="${url}" style="display:inline-block;padding:12px 24px;background:#4F46E5;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
            Réinitialiser mon mot de passe
          </a>
          <p style="color:#9CA3AF;font-size:13px;margin-top:24px">
            Si vous n'avez pas fait cette demande, ignorez cet email.
          </p>
        </div>
      `,
    });
  }
}
