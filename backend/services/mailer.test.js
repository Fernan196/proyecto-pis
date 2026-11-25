// backend/services/mailer.test.js
const {
    REMITENTE_NOMBRE,
    ASUNTO_CONFIRMACION,
    createMailer
} = require('./mailer');

describe('Pruebas Unitarias del Adaptador de Correo (mailer)', () => {
    test('Envía correo con remitente, asunto, saludo con username, HTML oscuro, texto plano y BACKEND_URL limpia', async () => {
        const transporterDouble = {
            sendMail: jest.fn().mockResolvedValue({ messageId: 'msg-123' })
        };

        const mailer = createMailer({
            transporter: transporterDouble,
            emailUser: 'no-reply@test.local',
            backendUrl: 'https://api.michis.example///'
        });

        await mailer.enviarCorreoConfirmacion({
            email: 'jugador@test.com',
            username: 'MichiMaster',
            token: 'token-abc-123'
        });

        expect(transporterDouble.sendMail).toHaveBeenCalledTimes(1);
        const opciones = transporterDouble.sendMail.mock.calls[0][0];

        expect(opciones.from).toBe(`"${REMITENTE_NOMBRE}" <no-reply@test.local>`);
        expect(opciones.to).toBe('jugador@test.com');
        expect(opciones.subject).toBe(ASUNTO_CONFIRMACION);
        expect(opciones.html).toContain('MichiMaster');
        expect(opciones.html).toContain('#0b1120');
        expect(opciones.html).toContain('caduca en 1 hora');
        expect(opciones.html).toContain('https://api.michis.example/api/usuarios/confirmar/token-abc-123');
        expect(opciones.text).toContain('¡Hola, MichiMaster!');
        expect(opciones.text).toContain('https://api.michis.example/api/usuarios/confirmar/token-abc-123');
        expect(opciones.text).toContain('1 hora');
    });

    test('Escapa caracteres HTML peligrosos en el username antes de construir la plantilla', async () => {
        const transporterDouble = {
            sendMail: jest.fn().mockResolvedValue({ messageId: 'msg-xss' })
        };

        const mailer = createMailer({
            transporter: transporterDouble,
            emailUser: 'no-reply@test.local',
            backendUrl: 'http://localhost:8080'
        });

        await mailer.enviarCorreoConfirmacion({
            email: 'seguro@test.com',
            username: '<script>alert(1)</script>',
            token: 'tok-seguro'
        });

        const opciones = transporterDouble.sendMail.mock.calls[0][0];
        expect(opciones.html).not.toContain('<script>');
        expect(opciones.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    });

    test('Error: Lanza excepción si falta BACKEND_URL configurada', async () => {
        const transporterDouble = {
            sendMail: jest.fn()
        };

        const mailer = createMailer({
            transporter: transporterDouble,
            emailUser: 'no-reply@test.local',
            backendUrl: ''
        });

        await expect(
            mailer.enviarCorreoConfirmacion({
                email: 'jugador@test.com',
                username: 'Ana',
                token: 'tok-1'
            })
        ).rejects.toThrow('BACKEND_URL');
        expect(transporterDouble.sendMail).not.toHaveBeenCalled();
    });

    test('Error: Lanza excepción si faltan email o token', async () => {
        const transporterDouble = {
            sendMail: jest.fn()
        };

        const mailer = createMailer({
            transporter: transporterDouble,
            emailUser: 'no-reply@test.local',
            backendUrl: 'http://localhost:8080'
        });

        await expect(
            mailer.enviarCorreoConfirmacion({ email: '', username: 'Ana', token: 'tok-1' })
        ).rejects.toThrow('Email y token son obligatorios');
        expect(transporterDouble.sendMail).not.toHaveBeenCalled();
    });
});
