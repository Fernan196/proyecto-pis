import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import MichiCard from './michiCard';

const CARTAS_DESTACADAS = ['BOMB', 'DEFUSE', 'SEE_FUTURE', 'ATTACK'];

const PASOS_JUEGO = [
    {
        numero: '01',
        titulo: 'Crea o únete a una sala',
        descripcion: 'Abre una mesa para 2 a 4 jugadores y comparte el código de 6 caracteres. El Lobby se sincroniza al instante con Socket.IO.'
    },
    {
        numero: '02',
        titulo: 'Juega cartas y manipula el mazo',
        descripcion: 'Usa Salto Gatuno, Emboscada Felina, Visión Felina, Terremoto en el Arenero o parejas de Michis para esquivar el peligro.'
    },
    {
        numero: '03',
        titulo: 'Desactiva bombas y gana',
        descripcion: 'Si robas un Michi Explosivo, gasta tu Puntero Láser y escóndelo en secreto en el mazo. El último en pie sube en el ranking.'
    }
];

function leerSesionActiva() {
    try {
        const token = localStorage.getItem('token');
        const userRaw = localStorage.getItem('user');
        if (!token || !userRaw) return null;
        return JSON.parse(userRaw);
    } catch {
        return null;
    }
}

export default function Home() {
    const usuarioActivo = useMemo(() => leerSesionActiva(), []);

    return (
        <div className="landing-page">
            <header className="landing-header">
                <div className="landing-header-inner">
                    <Link to="/" className="brand-link" aria-current="page">
                        <span className="brand-badge">ME</span>
                        <span className="brand-text">
                            <strong>Michis Explosivos</strong>
                            <small>Multijugador Online</small>
                        </span>
                    </Link>

                    <nav className="landing-nav" aria-label="Navegación principal">
                        {usuarioActivo ? (
                            <>
                                <span className="landing-user-chip">
                                    Conectado como <strong>{usuarioActivo.username || usuarioActivo.email}</strong>
                                </span>
                                <Link to="/dashboard" className="btn-nav-primary">
                                    Ir al Lobby
                                </Link>
                            </>
                        ) : (
                            <>
                                <Link to="/login" className="btn-nav-ghost">
                                    Iniciar sesión
                                </Link>
                                <Link to="/register" className="btn-nav-primary">
                                    Crear cuenta
                                </Link>
                            </>
                        )}
                    </nav>
                </div>
            </header>

            <main className="landing-main">
                <section className="landing-hero">
                    <div className="landing-hero-copy">
                        <span className="landing-pill">Tiempo real · 2 a 4 jugadores</span>
                        <h1>
                            Sobrevive al <span className="hero-accent">Michi Explosivo</span> en partidas rápidas con amigos
                        </h1>
                        <p className="landing-hero-desc">
                            Crea salas privadas por código, juega cartas de acción con animaciones SVG, espía el mazo en privado y escala puestos en el ranking global.
                        </p>

                        <div className="landing-cta-row">
                            {usuarioActivo ? (
                                <Link to="/dashboard" className="btn-nav-primary btn-cta-lg">
                                    Entrar al Lobby y jugar
                                </Link>
                            ) : (
                                <>
                                    <Link to="/register" className="btn-nav-primary btn-cta-lg">
                                        Empezar a jugar gratis
                                    </Link>
                                    <Link to="/login" className="btn-nav-ghost btn-cta-lg">
                                        Ya tengo cuenta
                                    </Link>
                                </>
                            )}
                        </div>

                        <ul className="landing-highlights">
                            <li>⚡ Salas y turnos en vivo con Socket.IO</li>
                            <li>🔐 Acceso con Google, GitHub o correo</li>
                            <li>🏆 Ranking global y reconexión automática</li>
                        </ul>
                    </div>

                    <div className="hero-cards-stage" aria-hidden="true">
                        {CARTAS_DESTACADAS.map((tipo, index) => (
                            <div key={tipo} className={`hero-card-slot hero-card-slot-${index + 1}`}>
                                <MichiCard tipo={tipo} compacta disabled />
                            </div>
                        ))}
                    </div>
                </section>

                <section className="landing-steps-section" aria-labelledby="how-to-play-title">
                    <div className="landing-section-head">
                        <span className="landing-pill">Cómo funciona</span>
                        <h2 id="how-to-play-title">De la entrada a la mesa en tres pasos</h2>
                    </div>

                    <div className="steps-grid">
                        {PASOS_JUEGO.map((paso) => (
                            <article key={paso.numero} className="step-card">
                                <span className="step-number">{paso.numero}</span>
                                <h3>{paso.titulo}</h3>
                                <p>{paso.descripcion}</p>
                            </article>
                        ))}
                    </div>
                </section>
            </main>

            <footer className="landing-footer">
                <span>Michis Explosivos · Proyecto PIS</span>
                <div className="landing-footer-links">
                    {usuarioActivo ? (
                        <Link to="/dashboard">Lobby y Ranking</Link>
                    ) : (
                        <>
                            <Link to="/login">Iniciar sesión</Link>
                            <Link to="/register">Registrarse</Link>
                        </>
                    )}
                </div>
            </footer>
        </div>
    );
}
