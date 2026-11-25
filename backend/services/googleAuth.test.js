// backend/services/googleAuth.test.js
const { createGoogleAuth } = require('./googleAuth');

describe('Pruebas Unitarias del Adaptador Google OAuth (googleAuth)', () => {
    test('construirUrlAutorizacion genera la URL de Google con client_id y redirect_uri limpio', () => {
        const googleAuth = createGoogleAuth({
            clientId: 'client-id-123',
            clientSecret: 'secret-xyz',
            backendUrl: 'https://api.michis.example///'
        });

        const url = new URL(googleAuth.construirUrlAutorizacion());

        expect(url.origin).toBe('https://accounts.google.com');
        expect(url.pathname).toBe('/o/oauth2/v2/auth');
        expect(url.searchParams.get('client_id')).toBe('client-id-123');
        expect(url.searchParams.get('redirect_uri')).toBe('https://api.michis.example/api/auth/google/callback');
        expect(url.searchParams.get('response_type')).toBe('code');
        expect(url.searchParams.get('scope')).toBe('openid email profile');
    });

    test('intercambiarCodigoPorPerfil intercambia el código por token y extrae el perfil usando fetch doble', async () => {
        const fetchDouble = jest.fn()
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ access_token: 'google-access-tok' })
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    id: 'google-uid-999',
                    email: 'ana@gmail.com',
                    name: 'Ana Michi'
                })
            });

        const googleAuth = createGoogleAuth({
            clientId: 'client-id-123',
            clientSecret: 'secret-xyz',
            backendUrl: 'http://localhost:8080',
            fetchFn: fetchDouble
        });

        const perfil = await googleAuth.intercambiarCodigoPorPerfil('auth-code-01');

        expect(fetchDouble).toHaveBeenCalledTimes(2);
        expect(fetchDouble.mock.calls[0][0]).toBe('https://oauth2.googleapis.com/token');
        expect(fetchDouble.mock.calls[1][0]).toBe('https://www.googleapis.com/oauth2/v2/userinfo');
        expect(fetchDouble.mock.calls[1][1]).toEqual({
            headers: { Authorization: 'Bearer google-access-tok' }
        });
        expect(perfil).toEqual({
            googleId: 'google-uid-999',
            email: 'ana@gmail.com',
            username: 'Ana Michi'
        });
    });

    test('Error: Lanza excepción si falta GOOGLE_CLIENT_ID o BACKEND_URL', () => {
        const sinClient = createGoogleAuth({
            clientId: '',
            clientSecret: 'secret',
            backendUrl: 'http://localhost:8080'
        });
        expect(() => sinClient.construirUrlAutorizacion()).toThrow('GOOGLE_CLIENT_ID');

        const sinBackend = createGoogleAuth({
            clientId: 'cid',
            clientSecret: 'secret',
            backendUrl: ''
        });
        expect(() => sinBackend.construirUrlAutorizacion()).toThrow('BACKEND_URL');
    });

    test('Error: Lanza excepción si Google no devuelve access_token en el intercambio', async () => {
        const fetchDouble = jest.fn().mockResolvedValueOnce({
            ok: false,
            json: async () => ({ error_description: 'Código inválido o expirado' })
        });

        const googleAuth = createGoogleAuth({
            clientId: 'cid',
            clientSecret: 'secret',
            backendUrl: 'http://localhost:8080',
            fetchFn: fetchDouble
        });

        await expect(googleAuth.intercambiarCodigoPorPerfil('bad-code'))
            .rejects.toThrow('Código inválido o expirado');
    });
});
