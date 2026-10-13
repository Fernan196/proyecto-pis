const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

async function enviarCorreoConfirmacion(email, token) {
    // Esta es la URL que el usuario clickeará para activar su cuenta
    const urlConfirmacion = `http://localhost:3000/api/usuarios/confirmar/${token}`;

    const mailOptions = {
        from: `"Proyecto PIS" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Confirma tu cuenta',
        html: `
            <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
                <h2>¡Bienvenido a la plataforma!</h2>
                <p>Para activar tu cuenta y poder iniciar sesión, por favor haz clic en el siguiente botón:</p>
                <a href="${urlConfirmacion}" style="display: inline-block; padding: 10px 20px; margin: 20px 0; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">Confirmar mi cuenta</a>
                <p style="font-size: 12px; color: #777;">Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
                <p style="font-size: 12px; color: #777;">${urlConfirmacion}</p>
            </div>
        `
    };

    await transporter.sendMail(mailOptions);
}

module.exports = { enviarCorreoConfirmacion };