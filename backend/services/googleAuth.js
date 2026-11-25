// backend/services/googleAuth.js

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

/**
 * Crea el adaptador OAuth 2.0 de Google permitiendo inyectar fetchFn en pruebas.
 */
function createGoogleAuth({
    clientId = process.env.GOOGLE_CLIENT_ID,
    clientSecret = process.env.GOOGLE_CLIENT_SECRET,
    backendUrl = process.env.BACKEND_URL,
    fetchFn = globalThis.fetch
} = {}) {
    function obtenerRedirectUri() {
        const base = typeof backendUrl === 'string' ? backendUrl.trim().replace(/\/+$/, '') : '';
        if (!base) {
            throw new Error('BACKEND_URL no está configurada para Google OAuth');
        }
        return `${base}/api/auth/google/callback`;
    }

    function construirUrlAutorizacion() {
        if (!clientId || String(clientId).trim() === '') {
            throw new Error('GOOGLE_CLIENT_ID no está configurado');
        }
        const redirectUri = obtenerRedirectUri();
        const params = new URLSearchParams({
            client_id: String(clientId).trim(),
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: 'openid email profile',
            access_type: 'online',
            prompt: 'select_account'
        });
        return `${GOOGLE_AUTH_URL}?${params.toString()}`;
    }

    async function intercambiarCodigoPorPerfil(code) {
        if (!code || String(code).trim() === '') {
            throw new Error('Código de autorización de Google ausente');
        }
        if (!clientId || !clientSecret) {
            throw new Error('Credenciales de Google OAuth no configuradas');
        }
        if (typeof fetchFn !== 'function') {
            throw new Error('Cliente fetch no disponible para Google OAuth');
        }

        const redirectUri = obtenerRedirectUri();
        const body = new URLSearchParams({
            code: String(code),
            client_id: String(clientId).trim(),
            client_secret: String(clientSecret).trim(),
            redirect_uri: redirectUri,
            grant_type: 'authorization_code'
        });

        const tokenRes = await fetchFn(GOOGLE_TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
            body: body.toString()
        });
        const tokenData = await tokenRes.json();

        if (!tokenRes.ok || !tokenData?.access_token) {
            throw new Error(tokenData?.error_description || 'No access token de Google');
        }

        const userRes = await fetchFn(GOOGLE_USERINFO_URL, {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });
        const profile = await userRes.json();

        if (!userRes.ok || !profile) {
            throw new Error('No se pudo obtener el perfil del usuario en Google');
        }

        const email = profile.email || null;
        const username = profile.name
            || profile.given_name
            || (email ? email.split('@')[0] : 'Usuario Google');

        return {
            googleId: String(profile.id || profile.sub || ''),
            email,
            username
        };
    }

    return {
        obtenerRedirectUri,
        construirUrlAutorizacion,
        intercambiarCodigoPorPerfil
    };
}

module.exports = { createGoogleAuth };
