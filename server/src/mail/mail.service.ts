import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private resend: Resend | null = null;

  constructor() {
    if (process.env.RESEND_API_KEY) {
      this.resend = new Resend(process.env.RESEND_API_KEY);
    } else {
      console.warn('[MailService] RESEND_API_KEY non configuré — les emails ne seront pas envoyés.');
    }
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    if (!this.resend) return;
    const url = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    const { error } = await this.resend.emails.send({
      from: 'onboarding@resend.dev',
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
    if (error) {
      console.error('[MailService] Erreur Resend:', error);
      throw new Error(error.message);
    }
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    if (!this.resend) return;
    const url = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    const { error } = await this.resend.emails.send({
      from: 'onboarding@resend.dev',
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
    if (error) {
      console.error('[MailService] Erreur Resend:', error);
      throw new Error(error.message);
    }
  }
}
