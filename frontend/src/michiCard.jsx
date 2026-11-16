import React from 'react';

export const INFO_CARTAS = {
    BOMB: {
        nombre: 'Michi Explosivo',
        categoria: 'PELIGRO',
        descripcion: 'Explotas al robarla salvo que tengas un Puntero Láser.',
        color: '#ef4444'
    },
    DEFUSE: {
        nombre: 'Puntero Láser',
        categoria: 'DEFENSA',
        descripcion: 'Desactiva un Michi Explosivo y lo esconde en el mazo.',
        color: '#10b981'
    },
    SKIP: {
        nombre: 'Salto Gatuno',
        categoria: 'ACCIÓN',
        descripcion: 'Termina tu turno actual sin robar carta del mazo.',
        color: '#38bdf8'
    },
    ATTACK: {
        nombre: 'Emboscada Felina',
        categoria: 'ACCIÓN',
        descripcion: 'Termina sin robar y obliga al siguiente a jugar 2 turnos.',
        color: '#f97316'
    },
    SEE_FUTURE: {
        nombre: 'Visión Felina',
        categoria: 'ACCIÓN',
        descripcion: 'Espía en privado las 3 primeras cartas del mazo.',
        color: '#a855f7'
    },
    SHUFFLE: {
        nombre: 'Terremoto en el Arenero',
        categoria: 'ACCIÓN',
        descripcion: 'Baraja aleatoriamente todo el mazo de robo.',
        color: '#eab308'
    },
    FAVOR: {
        nombre: 'Soborno de Atún',
        categoria: 'ACCIÓN',
        descripcion: 'Elige a un rival vivo y róbale 1 carta aleatoria.',
        color: '#ec4899'
    },
    CAT_1: {
        nombre: 'Michi Cósmico',
        categoria: 'PAREJA MICHI',
        descripcion: 'Juega 2 iguales para robar 1 carta aleatoria a un rival.',
        color: '#818cf8'
    },
    CAT_2: {
        nombre: 'Michi Ninja',
        categoria: 'PAREJA MICHI',
        descripcion: 'Juega 2 iguales para robar 1 carta aleatoria a un rival.',
        color: '#94a3b8'
    },
    CAT_3: {
        nombre: 'Michi Pirata',
        categoria: 'PAREJA MICHI',
        descripcion: 'Juega 2 iguales para robar 1 carta aleatoria a un rival.',
        color: '#f59e0b'
    },
    CAT_4: {
        nombre: 'Michi Zombie',
        categoria: 'PAREJA MICHI',
        descripcion: 'Juega 2 iguales para robar 1 carta aleatoria a un rival.',
        color: '#84cc16'
    }
};

function IlustracionCarta({ tipo, color }) {
    switch (tipo) {
        case 'BOMB':
            return (
                <svg viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="30" cy="38" r="16" fill={`${color}22`} />
                    <path d="M21 26 L18 19 L25 23" />
                    <path d="M39 26 L42 19 L35 23" />
                    <circle cx="25" cy="36" r="2" fill={color} />
                    <circle cx="35" cy="36" r="2" fill={color} />
                    <path d="M26 42 Q30 45 34 42" />
                    <path d="M41 25 C46 18 50 18 52 13" stroke="#fbbf24" />
                    <path d="M52 13 L56 10 M52 13 L56 15 M52 13 L49 9" stroke="#fde047" />
                </svg>
            );
        case 'DEFUSE':
            return (
                <svg viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="10" y="34" width="22" height="10" rx="4" transform="rotate(-25 10 34)" fill={`${color}22`} />
                    <line x1="31" y1="30" x2="50" y2="20" stroke="#34d399" strokeDasharray="3 3" />
                    <circle cx="52" cy="19" r="5" fill={color} />
                    <circle cx="52" cy="19" r="9" strokeOpacity="0.4" />
                </svg>
            );
        case 'SKIP':
            return (
                <svg viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 44 C20 20 42 20 48 40" fill={`${color}18`} />
                    <polyline points="42 36 48 41 53 34" />
                    <circle cx="30" cy="22" r="7" fill={`${color}22`} />
                    <path d="M25 17 L24 12 L29 15 M35 17 L36 12 L31 15" />
                </svg>
            );
        case 'ATTACK':
            return (
                <svg viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round">
                    <path d="M16 18 C28 28 34 38 42 50" />
                    <path d="M26 14 C38 24 44 34 52 46" />
                    <path d="M10 26 C22 36 28 44 34 54" />
                    <text x="42" y="24" fill={color} fontSize="14" fontWeight="bold" stroke="none">x2</text>
                </svg>
            );
        case 'SEE_FUTURE':
            return (
                <svg viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 32 C16 18 48 18 56 32 C48 46 16 46 8 32 Z" fill={`${color}22`} />
                    <ellipse cx="32" cy="32" rx="4" ry="9" fill={color} />
                    <path d="M32 10 L32 14 M16 14 L18 18 M48 14 L46 18" />
                </svg>
            );
        case 'SHUFFLE':
            return (
                <svg viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22 H24 L40 42 H52" />
                    <path d="M12 42 H24 L40 22 H52" />
                    <polyline points="47 17 52 22 47 27" />
                    <polyline points="47 37 52 42 47 47" />
                </svg>
            );
        case 'FAVOR':
            return (
                <svg viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <ellipse cx="32" cy="24" rx="18" ry="6" fill={`${color}22`} />
                    <path d="M14 24 V42 C14 46 50 46 50 42 V24" fill={`${color}15`} />
                    <path d="M24 34 L38 34 M38 34 L43 30 V38 Z M28 31 V37 M33 31 V37" />
                </svg>
            );
        case 'CAT_1':
            return (
                <svg viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="32" cy="34" r="18" strokeOpacity="0.55" />
                    <circle cx="32" cy="35" r="11" fill={`${color}22`} />
                    <path d="M24 27 L22 20 L29 24 M40 27 L42 20 L35 24" />
                    <circle cx="28" cy="35" r="1.5" fill={color} />
                    <circle cx="36" cy="35" r="1.5" fill={color} />
                    <circle cx="14" cy="14" r="1.5" fill="#fde047" stroke="none" />
                    <circle cx="51" cy="16" r="2" fill="#fde047" stroke="none" />
                </svg>
            );
        case 'CAT_2':
            return (
                <svg viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="32" cy="35" r="13" fill={`${color}22`} />
                    <path d="M23 25 L20 17 L28 22 M41 25 L44 17 L36 22" />
                    <rect x="20" y="28" width="24" height="5" rx="2" fill="#ef4444" stroke="none" />
                    <line x1="26" y1="36" x2="30" y2="35" />
                    <line x1="38" y1="36" x2="34" y2="35" />
                </svg>
            );
        case 'CAT_3':
            return (
                <svg viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="32" cy="36" r="13" fill={`${color}22`} />
                    <path d="M23 26 L20 18 L28 23 M41 26 L44 18 L36 23" />
                    <line x1="21" y1="33" x2="43" y2="33" />
                    <circle cx="27" cy="34" r="3.5" fill="#0f172a" />
                    <circle cx="37" cy="34" r="1.5" fill={color} />
                    <path d="M28 42 Q32 45 36 42" />
                </svg>
            );
        default:
            return (
                <svg viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="32" cy="35" r="13" fill={`${color}22`} />
                    <path d="M23 25 L20 17 L28 22 M41 25 L44 17 L36 22" />
                    <path d="M25 32 L29 36 M29 32 L25 36 M35 32 L39 36 M39 32 L35 36" />
                    <path d="M26 42 H38 M30 42 V45 M34 42 V45" />
                </svg>
            );
    }
}

export default function MichiCard({
    tipo,
    onClick,
    disabled = false,
    badge = null,
    compacta = false
}) {
    const info = INFO_CARTAS[tipo] || {
        nombre: tipo || 'Carta',
        categoria: 'CARTA',
        descripcion: 'Carta de Michis Explosivos.',
        color: '#818cf8'
    };

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled || !onClick}
            className={`michi-card ${compacta ? 'michi-card-compact' : ''} ${disabled ? 'michi-card-disabled' : ''}`}
            style={{
                '--card-accent': info.color,
                borderColor: `${info.color}66`
            }}
        >
            <div className="michi-card-top">
                <span className="michi-card-tag" style={{ color: info.color, background: `${info.color}22` }}>
                    {info.categoria}
                </span>
                {badge && (
                    <span className="michi-card-badge">{badge}</span>
                )}
            </div>

            <div className="michi-card-art">
                <IlustracionCarta tipo={tipo} color={info.color} />
            </div>

            <div className="michi-card-body">
                <h4 className="michi-card-title">{info.nombre}</h4>
                {!compacta && (
                    <p className="michi-card-desc">{info.descripcion}</p>
                )}
            </div>
        </button>
    );
}
