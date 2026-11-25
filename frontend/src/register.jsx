import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register, getGithubAuthUrl, getGoogleAuthUrl } from './services/api';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function evaluarFortalezaPassword(clave) {
    if (!clave) {
        return { nivel: 'vacia', etiqueta: '', porcentaje: 0 };
    }
    let puntos = 0;
    if (clave.length >= 6) puntos += 1;
    if (clave.length >= 10) puntos += 1;
    if (/[A-Z]/.test(clave) && /[a-z]/.test(clave)) puntos += 1;
    if (/\d/.test(clave) || /[^A-Za-z0-9]/.test(clave)) puntos += 1;

    if (clave.length < 6 || puntos <= 1) {
        return { nivel: 'debil', etiqueta: 'Débil (mín. 6 caracteres)', porcentaje: 33 };
    }
    if (puntos <= 3) {
        return { nivel: 'media', etiqueta: 'Media', porcentaje: 66 };
    }
    return { nivel: 'fuerte', etiqueta: 'Fuerte', porcentaje: 100 };
}

export default function Register() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [touched, setTouched] = useState({
        username: false,
        email: false,
        password: false,
        confirmPassword: false
    });
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const fortaleza = evaluarFortalezaPassword(password);
    const usernameInvalido = (touched.username || submitted) && !username.trim();
    const emailInvalido = (touched.email || submitted) && !EMAIL_REGEX.test(email.trim());
    const passwordInvalida = (touched.password || submitted) && password.length < 6;
    const confirmInvalida = (touched.confirmPassword || submitted) && (confirmPassword.length === 0 || confirmPassword !== password);
    const mostrarEstadoCoincidencia = confirmPassword.length > 0;
    const contrasenasCoinciden = password.length > 0 && confirmPassword === password;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitted(true);
        setError('');
        setSuccessMsg('');

        if (!username.trim()) return setError('El nombre de usuario es obligatorio.');
        if (!EMAIL_REGEX.test(email.trim())) return setError('Introduce un correo válido.');
        if (password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.');
        if (password !== confirmPassword) return setError('Las contraseñas no coinciden.');

        setLoading(true);
        try {
            const data = await register(username.trim(), email.trim(), password);
            setSuccessMsg(data.mensaje || '¡Registro exitoso! Revisa tu correo.');
            setTimeout(() => navigate('/login'), 4000);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
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
                        <Link to="/login" className="auth-nav-link">
                            Iniciar sesión
                        </Link>
                        <Link to="/register" className="auth-nav-link" aria-current="page">
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
                                <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                                <circle cx="8.5" cy="7" r="4" />
                                <line x1="20" y1="8" x2="20" y2="14" />
                                <line x1="23" y1="11" x2="17" y2="11" />
                            </svg>
                        </div>
                        <h1>Crear cuenta</h1>
                        <p>Únete a las mesas de Michis Explosivos en pocos segundos</p>
                    </div>

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

                    {successMsg && (
                        <div className="alert alert-success" role="status">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                <path d="M20 6L9 17l-5-5" />
                            </svg>
                            <span>{successMsg}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="register-username" className="form-label">Nombre de usuario</label>
                            <input
                                id="register-username"
                                name="username"
                                type="text"
                                required
                                autoComplete="nickname"
                                spellCheck={false}
                                autoCorrect="off"
                                autoCapitalize="none"
                                enterKeyHint="next"
                                placeholder="michi_jugador"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                onBlur={() => setTouched(prev => ({ ...prev, username: true }))}
                                aria-invalid={usernameInvalido ? 'true' : 'false'}
                                className="form-input"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="register-email" className="form-label">Correo electrónico</label>
                            <input
                                id="register-email"
                                name="email"
                                type="email"
                                required
                                autoComplete="username"
                                spellCheck={false}
                                enterKeyHint="next"
                                placeholder="ejemplo@correo.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onBlur={() => setTouched(prev => ({ ...prev, email: true }))}
                                aria-invalid={emailInvalido ? 'true' : 'false'}
                                className="form-input"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="register-password" className="form-label">Contraseña</label>
                            <p id="password-rules" className="field-hint">
                                Mínimo 6 caracteres. Combina mayúsculas, números o símbolos para reforzarla.
                            </p>
                            <div className="input-container">
                                <input
                                    id="register-password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    minLength={6}
                                    autoComplete="new-password"
                                    enterKeyHint="next"
                                    aria-describedby="password-rules"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onBlur={() => setTouched(prev => ({ ...prev, password: true }))}
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
                            {password.length > 0 && (
                                <div className="password-strength" aria-live="polite">
                                    <div className="password-strength-track">
                                        <div
                                            className={`password-strength-bar strength-${fortaleza.nivel}`}
                                            style={{ width: `${fortaleza.porcentaje}%` }}
                                        />
                                    </div>
                                    <span className={`password-strength-label strength-text-${fortaleza.nivel}`}>
                                        Seguridad: {fortaleza.etiqueta}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="form-group">
                            <label htmlFor="register-confirm-password" className="form-label">Confirmar contraseña</label>
                            <div className="input-container">
                                <input
                                    id="register-confirm-password"
                                    name="confirm-password"
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    required
                                    minLength={6}
                                    autoComplete="new-password"
                                    enterKeyHint="done"
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    onBlur={() => setTouched(prev => ({ ...prev, confirmPassword: true }))}
                                    aria-invalid={confirmInvalida ? 'true' : 'false'}
                                    className="form-input input-with-toggle"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="toggle-password-btn"
                                    aria-label={showConfirmPassword ? 'Ocultar confirmación de contraseña' : 'Mostrar confirmación de contraseña'}
                                    aria-pressed={showConfirmPassword}
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                        {showConfirmPassword ? (
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
                            {mostrarEstadoCoincidencia && (
                                <p className={`match-feedback ${contrasenasCoinciden ? 'match-ok' : 'match-err'}`}>
                                    {contrasenasCoinciden ? '✓ Las contraseñas coinciden' : '✕ Las contraseñas aún no coinciden'}
                                </p>
                            )}
                        </div>

                        <button type="submit" disabled={loading} className="btn-primary">
                            {loading ? 'Procesando registro...' : 'Crear cuenta'}
                        </button>
                    </form>

                    <div className="divider">
                        <span>O continúa con</span>
                    </div>

                    <div className="oauth-buttons">
                        <button
                            type="button"
                            onClick={() => { window.location.href = getGoogleAuthUrl(); }}
                            className="btn-google"
                        >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.2-1.4 3.6-5.4 3.6-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.1 14.6 2 12 2 6.5 2 2 6.5 2 12s4.5 10 10 10c5.8 0 9.6-4.1 9.6-9.8 0-.7-.1-1.2-.2-2H12z" />
                                <path fill="#34A853" d="M3.2 7.3l3.2 2.3C7.2 7.4 9.4 6 12 6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.1 14.6 2 12 2 8.2 2 4.9 4.2 3.2 7.3z" />
                                <path fill="#FBBC05" d="M12 22c2.6 0 4.8-.9 6.4-2.4l-3-2.5c-.8.6-1.9 1-3.4 1-2.6 0-4.8-1.7-5.6-4.1l-3.2 2.5C4.9 19.7 8.2 22 12 22z" />
                                <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.2-.2-2H12v3.9h5.4c-.3 1.3-1 2.4-2 3.1l3 2.5c1.8-1.6 3.2-4.1 3.2-7.5z" />
                            </svg>
                            <span>Continuar con Google</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => { window.location.href = getGithubAuthUrl(); }}
                            className="btn-github"
                        >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                            </svg>
                            <span>Continuar con GitHub</span>
                        </button>
                    </div>

                    <p className="auth-footer">
                        ¿Ya tienes cuenta? <Link to="/login">Inicia sesión aquí</Link>
                    </p>
                </div>
            </main>
        </div>
    );
}
