import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { login, getGithubAuthUrl, getGoogleAuthUrl } from './services/api';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [emailTouched, setEmailTouched] = useState(false);
    const [passwordTouched, setPasswordTouched] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');
    const [infoMsg, setInfoMsg] = useState('');
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const params = new URLSearchParams(location.search);

        if (params.get('confirmed') === 'true') {
            setInfoMsg('🎉 ¡Cuenta confirmada exitosamente! Ya puedes iniciar sesión.');
        }

        if (params.get('error') === 'token_invalido') {
            setError('El enlace de confirmación es inválido o ha caducado.');
        }

        if (params.get('error') === 'oauth_fallido' || params.get('error') === 'oauth_error') {
            setError('No se pudo completar el inicio de sesión con el proveedor externo.');
        }

        if (params.get('error') === 'oauth_google_no_configurado') {
            setError('El inicio de sesión con Google aún no está configurado en el servidor.');
        }

        const oauthToken = params.get('oauth_token');
        const userJson = params.get('user');
        if (oauthToken && userJson) {
            localStorage.setItem('token', oauthToken);
            localStorage.setItem('user', decodeURIComponent(userJson));
            navigate('/dashboard');
        }
    }, [location, navigate]);

    const emailInvalido = (emailTouched || submitted) && !EMAIL_REGEX.test(email.trim());
    const passwordInvalida = (passwordTouched || submitted) && password.length === 0;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitted(true);
        setError('');
        setLoading(true);

        try {
            const data = await login(email.trim(), password);
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            navigate('/dashboard');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGithubLogin = () => {
        window.location.href = getGithubAuthUrl();
    };

    const handleGoogleLogin = () => {
        window.location.href = getGoogleAuthUrl();
    };

    return (
        <div className="auth-page">
            <header className="auth-topbar">
                <div className="auth-topbar-inner">
                    <Link to="/" className="brand-link">
                        <span className="brand-badge">ME</span>
                        <span className="brand-text">
                            <strong>Michis Explosivos</strong>
                            <small>Volver al inicio</small>
                        </span>
                    </Link>

                    <nav className="auth-nav" aria-label="Navegación de acceso">
                        <Link to="/login" className="auth-nav-link" aria-current="page">
                            Iniciar sesión
                        </Link>
                        <Link to="/register" className="auth-nav-link">
                            Registrarse
                        </Link>
                    </nav>
                </div>
            </header>

            <main className="auth-wrapper">
                <div className="auth-card">
                    <div className="auth-header">
                        <div className="auth-icon-badge" aria-hidden="true">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0110 0v4" />
                            </svg>
                        </div>
                        <h1>Bienvenido de nuevo</h1>
                        <p>Inicia sesión para entrar al Lobby de Michis Explosivos</p>
                    </div>

                    {infoMsg && (
                        <div className="alert alert-success" role="status">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                <path d="M20 6L9 17l-5-5" />
                            </svg>
                            <span>{infoMsg}</span>
                        </div>
                    )}

                    {error && (
                        <div className="alert alert-error" role="alert">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="login-email" className="form-label">Correo electrónico</label>
                            <input
                                id="login-email"
                                name="email"
                                type="email"
                                required
                                autoComplete="username"
                                spellCheck={false}
                                enterKeyHint="next"
                                placeholder="ejemplo@correo.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onBlur={() => setEmailTouched(true)}
                                aria-invalid={emailInvalido ? 'true' : 'false'}
                                className="form-input"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="login-password" className="form-label">Contraseña</label>
                            <div className="input-container">
                                <input
                                    id="login-password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    autoComplete="current-password"
                                    enterKeyHint="done"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onBlur={() => setPasswordTouched(true)}
                                    aria-invalid={passwordInvalida ? 'true' : 'false'}
                                    className="form-input input-with-toggle"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="toggle-password-btn"
                                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                    aria-pressed={showPassword}
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                        {showPassword ? (
                                            <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" />
                                        ) : (
                                            <>
                                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                <circle cx="12" cy="12" r="3" />
                                            </>
                                        )}
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <button type="submit" disabled={loading} className="btn-primary">
                            {loading ? 'Iniciando sesión...' : 'Entrar al Lobby'}
                        </button>
                    </form>

                    <div className="divider">
                        <span>O continúa con</span>
                    </div>

                    <div className="oauth-buttons">
                        <button type="button" onClick={handleGoogleLogin} className="btn-google">
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.2-1.4 3.6-5.4 3.6-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.1 14.6 2 12 2 6.5 2 2 6.5 2 12s4.5 10 10 10c5.8 0 9.6-4.1 9.6-9.8 0-.7-.1-1.2-.2-2H12z" />
                                <path fill="#34A853" d="M3.2 7.3l3.2 2.3C7.2 7.4 9.4 6 12 6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.1 14.6 2 12 2 8.2 2 4.9 4.2 3.2 7.3z" />
                                <path fill="#FBBC05" d="M12 22c2.6 0 4.8-.9 6.4-2.4l-3-2.5c-.8.6-1.9 1-3.4 1-2.6 0-4.8-1.7-5.6-4.1l-3.2 2.5C4.9 19.7 8.2 22 12 22z" />
                                <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.2-.2-2H12v3.9h5.4c-.3 1.3-1 2.4-2 3.1l3 2.5c1.8-1.6 3.2-4.1 3.2-7.5z" />
                            </svg>
                            <span>Continuar con Google</span>
                        </button>

                        <button type="button" onClick={handleGithubLogin} className="btn-github">
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                            </svg>
                            <span>Continuar con GitHub</span>
                        </button>
                    </div>

                    <p className="auth-footer">
                        ¿No tienes una cuenta? <Link to="/register">Regístrate aquí</Link>
                    </p>
                </div>
            </main>
        </div>
    );
}
