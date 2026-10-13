import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from './services/api';

export default function Register() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');

        if (!username.trim()) return setError('El nombre de usuario es obligatorio.');
        if (!EMAIL_REGEX.test(email)) return setError('Introduce un correo válido.');
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
        <div className="auth-wrapper">
            <div className="auth-card">
                <div className="auth-header">
                    <div className="auth-icon-badge">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                            <circle cx="8.5" cy="7" r="4" />
                            <line x1="20" y1="8" x2="20" y2="14" />
                            <line x1="23" y1="11" x2="17" y2="11" />
                        </svg>
                    </div>
                    <h1>Crear cuenta</h1>
                    <p>Únete a la plataforma en pocos segundos</p>
                </div>

                {error && (
                    <div className="alert alert-error">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <span>{error}</span>
                    </div>
                )}

                {successMsg && (
                    <div className="alert alert-success">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 6L9 17l-5-5" />
                        </svg>
                        <span>{successMsg}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Nombre de usuario</label>
                        <input
                            type="text"
                            required
                            placeholder="fernando_gn"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="form-input"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Correo electrónico</label>
                        <input
                            type="email"
                            required
                            placeholder="ejemplo@correo.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="form-input"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Contraseña</label>
                        <div className="input-container">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="form-input"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="toggle-password-btn"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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

                    <div className="form-group">
                        <label className="form-label">Confirmar contraseña</label>
                        <div className="input-container">
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                required
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="form-input"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="toggle-password-btn"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                    </div>

                    <button type="submit" disabled={loading} className="btn-primary">
                        {loading ? 'Procesando registro...' : 'Registrarse'}
                    </button>
                </form>

                <p className="auth-footer">
                    ¿Ya tienes cuenta? <Link to="/login">Inicia sesión aquí</Link>
                </p>
            </div>
        </div>
    );
}