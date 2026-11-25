// backend/services/mailer.js
const nodemailer = require('nodemailer');

const REMITENTE_NOMBRE = 'Michis Explosivos';
const ASUNTO_CONFIRMACION = 'Activa tu cuenta en Michis Explosivos';

function escaparHtml(texto) {
    return String(texto)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Construye el mensaje completo (asunto, remitente, HTML corporativo y texto plano)
 * para el correo de confirmación de cuenta.
 */
function construirCorreoConfirmacion({ email, username, token, backendUrl, emailUser }) {
    if (!email || !token) {
        throw new Error('Email y token son obligatorios para construir el correo de confirmación');
    }

    const baseLimpia = typeof backendUrl === 'string' ? backendUrl.trim().replace(/\/+$/, '') : '';
    if (!baseLimpia) {
        throw new Error('BACKEND_URL no está configurada para generar el enlace de activación');
    }

    const urlConfirmacion = `${baseLimpia}/api/usuarios/confirmar/${token}`;
    const nombreVisible = typeof username === 'string' && username.trim() !== ''
        ? username.trim()
        : 'jugador';
    const nombreSeguro = escaparHtml(nombreVisible);
    const from = emailUser ? `"${REMITENTE_NOMBRE}" <${emailUser}>` : `"${REMITENTE_NOMBRE}"`;

    const text = [
        `¡Hola, ${nombreVisible}!`,
        '',
        'Gracias por registrarte en Michis Explosivos.',
        'Para activar tu cuenta y poder entrar al Lobby, abre este enlace en tu navegador:',
        urlConfirmacion,
        '',
        'Aviso de seguridad: este enlace caduca en 1 hora.',
        'Si no has creado esta cuenta, puedes ignorar este correo.'
    ].join('\n');

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${ASUNTO_CONFIRMACION}</title>
</head>
<body style="margin:0;padding:0;background-color:#0b1120;font-family:'Segoe UI',Arial,sans-serif;color:#e2e8f0;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0b1120;padding:32px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#111827;border:1px solid #312e81;border-radius:16px;overflow:hidden;">
                    <tr>
                        <td style="padding:28px 32px;background:linear-gradient(135deg,#1e1b4b 0%,#312e81 60%,#4c1d95 100%);text-align:center;">
                            <div style="display:inline-block;padding:6px 14px;border-radius:999px;background-color:rgba(255,255,255,0.12);color:#c7d2fe;font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;margin-bottom:10px;">
                                Michis Explosivos
                            </div>
                            <h1 style="margin:0;font-size:24px;line-height:1.3;color:#ffffff;">
                                Activa tu cuenta para jugar
                            </h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:32px;">
                            <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#f8fafc;">
                                ¡Hola, <strong>${nombreSeguro}</strong>!
                            </p>
                            <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#cbd5e1;">
                                Ya casi estás dentro de la mesa. Pulsa el siguiente botón para confirmar tu dirección de correo y desbloquear el acceso al Lobby y a las partidas multijugador:
                            </p>
                            <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 24px;">
                                <tr>
                                    <td align="center" style="border-radius:10px;background-color:#6366f1;">
                                        <a href="${urlConfirmacion}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">
                                            Confirmar mi cuenta
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            <div style="padding:14px 16px;background-color:#0f172a;border-left:3px solid #ec4899;border-radius:8px;margin-bottom:22px;">
                                <p style="margin:0;font-size:13px;line-height:1.5;color:#f9a8d4;">
                                    ⏳ <strong>Este enlace caduca en 1 hora</strong> por tu seguridad. Si expira, solicita un nuevo registro o contacta con soporte.
                                </p>
                            </div>
                            <p style="margin:0 0 8px;font-size:12px;color:#94a3b8;">
                                Si el botón no funciona, copia y pega este enlace en tu navegador:
                            </p>
                            <p style="margin:0;font-size:12px;line-height:1.5;word-break:break-all;">
                                <a href="${urlConfirmacion}" style="color:#818cf8;text-decoration:underline;">${urlConfirmacion}</a>
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:18px 32px;background-color:#0f172a;border-top:1px solid #1e293b;text-align:center;">
                            <p style="margin:0;font-size:12px;color:#64748b;">
                                Michis Explosivos · Si no creaste esta cuenta, puedes ignorar este mensaje.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`.trim();

    return {
        from,
        to: email,
        subject: ASUNTO_CONFIRMACION,
        text,
        html
    };
}

/**
 * Crea el adaptador SMTP de correo permitiendo inyectar un transporter doble en pruebas.
 */
function createMailer({
    transporter = null,
    emailUser = process.env.EMAIL_USER,
    emailPass = process.env.EMAIL_PASS,
    backendUrl = process.env.BACKEND_URL
} = {}) {
    let activeTransporter = transporter;

    function getTransporter() {
        if (!activeTransporter) {
            activeTransporter = nodemailer.createTransport({
                host: 'smtp.gmail.com',
                port: 465,
                secure: true,
                auth: {
                    user: emailUser,
                    pass: emailPass
                }
            });
        }
        return activeTransporter;
    }

    async function enviarCorreoConfirmacion({ email, username, token }) {
        const mailOptions = construirCorreoConfirmacion({
            email,
            username,
            token,
            backendUrl,
            emailUser
        });
        return await getTransporter().sendMail(mailOptions);
    }

    return {
        construirCorreoConfirmacion,
        enviarCorreoConfirmacion
    };
}

module.exports = {
    REMITENTE_NOMBRE,
    ASUNTO_CONFIRMACION,
    construirCorreoConfirmacion,
    createMailer
};
