import { Resend } from 'resend';

let resendClient: Resend | null = null;

function getResend(): Resend {
  if (!resendClient) {
    const config = useRuntimeConfig();
    if (!config.resendApiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }
    resendClient = new Resend(config.resendApiKey);
  }
  return resendClient;
}

interface SendVerificationEmailParams {
  to: string;
  verifyUrl: string;
  contactEmail: string;
}

export async function sendVerificationEmail({ to, verifyUrl, contactEmail }: SendVerificationEmailParams) {
  const config = useRuntimeConfig();
  const resend = getResend();

  const htmlBody = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="background:linear-gradient(135deg,#6366f1,#10b981);padding:32px;text-align:center;">
      <h1 style="color:#ffffff;margin:0;font-size:24px;">AuctiMatch</h1>
    </div>
    <div style="padding:32px;">
      <h2 style="color:#18181b;margin:0 0 16px;">Confirmez votre adresse e-mail</h2>
      <p style="color:#52525b;line-height:1.6;margin:0 0 24px;">
        Merci de vous être inscrit sur AuctiMatch. Pour activer votre compte et accéder à toutes les fonctionnalités, veuillez confirmer votre adresse e-mail en cliquant sur le bouton ci-dessous.
      </p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${verifyUrl}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#10b981);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:16px;">
          Confirmer mon e-mail
        </a>
      </div>
      <p style="color:#71717a;font-size:13px;line-height:1.5;margin:0 0 8px;">
        Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :
      </p>
      <p style="color:#6366f1;font-size:13px;word-break:break-all;margin:0 0 24px;">
        ${verifyUrl}
      </p>
      <p style="color:#a1a1aa;font-size:13px;margin:0;">
        Ce lien expire dans 24 heures.
      </p>
    </div>
    <div style="background:#fafafa;padding:24px 32px;border-top:1px solid #e4e4e7;">
      <p style="color:#a1a1aa;font-size:12px;margin:0;text-align:center;">
        Besoin d'aide ? Contactez-nous : <a href="mailto:${contactEmail}" style="color:#6366f1;">${contactEmail}</a>
      </p>
    </div>
  </div>
</body>
</html>`;

  const textBody = `Confirmez votre adresse e-mail

Merci de vous être inscrit sur AuctiMatch. Pour activer votre compte, veuillez confirmer votre adresse e-mail en visitant le lien ci-dessous :

${verifyUrl}

Ce lien expire dans 24 heures.

Besoin d'aide ? Contactez-nous : ${contactEmail}`;

  const { error } = await resend.emails.send({
    from: config.emailFrom,
    to,
    subject: 'Confirmez votre adresse e-mail',
    html: htmlBody,
    text: textBody,
  });

  if (error) {
    console.error('[Mailer] Failed to send verification email:', error);
    throw new Error(`Failed to send verification email: ${error.message}`);
  }

  console.log(`[Mailer] Verification email sent to ${to}`);
}
