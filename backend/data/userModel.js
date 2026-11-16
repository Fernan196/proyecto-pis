// backend/data/userModel.js
const mongoose = require('mongoose');

// Definimos la estructura de la tabla/colección (Esquema)
const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        trim: true
    },
    email: { 
        type: String, 
        required: true, 
        unique: true, // Asegura que no haya dos correos iguales
        trim: true,
        lowercase: true
    },
    password: { 
        type: String, 
        required: false 
    },
    confirmado: { 
        type: Boolean,
        default: false
    },
   rol: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
    },
    githubId: {
        type: String,
        default: null
    },
    partidasJugadas: {
        type: Number,
        default: 0,
        min: 0
    },
    partidasGanadas: {
        type: Number,
        default: 0,
        min: 0
    }
}, {
    timestamps: true // Añade fecha de creación y actualización automáticamente
});

// Transformamos el _id de Mongo a un id normal para que el frontend no note la diferencia
userSchema.set('toJSON', {
    transform: (document, returnedObject) => {
        returnedObject.id = returnedObject._id.toString();
        delete returnedObject._id;
        delete returnedObject.__v;
        // Nunca devolvemos la contraseña al frontend (Apartado 4.2)
        delete returnedObject.password;
    }
});

const User = mongoose.model('User', userSchema);

const estadisticasEnMemoria = new Map();

/**
 * Incrementa partidasJugadas (y partidasGanadas al ganador) tras finalizar una partida.
 */
User.registrarResultadoPartidaUsuarios = async function ({ jugadores, ganadorId }) {
    if (!Array.isArray(jugadores)) return;

    for (const jugador of jugadores) {
        const uid = String(jugador.userId);
        const esGanador = String(ganadorId) === uid;

        const prev = estadisticasEnMemoria.get(uid) || {
            userId: uid,
            username: jugador.username || uid,
            partidasJugadas: 0,
            partidasGanadas: 0
        };
        prev.username = jugador.username || prev.username;
        prev.partidasJugadas += 1;
        if (esGanador) {
            prev.partidasGanadas += 1;
        }
        estadisticasEnMemoria.set(uid, prev);

        if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(uid)) {
            const incremento = esGanador
                ? { partidasJugadas: 1, partidasGanadas: 1 }
                : { partidasJugadas: 1 };
            await User.findByIdAndUpdate(uid, { $inc: incremento });
        }
    }
};

/**
 * Devuelve el ranking de jugadores ordenado por victorias y porcentaje de éxito.
 */
User.obtenerRankingUsuarios = async function (limite = 10) {
    const tope = Number.isFinite(limite) && limite > 0 ? Math.floor(limite) : 10;

    if (mongoose.connection.readyState === 1) {
        const docs = await User.find({ confirmado: true })
            .select('username email rol partidasJugadas partidasGanadas')
            .sort({ partidasGanadas: -1, partidasJugadas: -1, username: 1 })
            .limit(tope);

        if (docs.length > 0) {
            return docs.map(d => {
                const jugadas = d.partidasJugadas || 0;
                const ganadas = d.partidasGanadas || 0;
                return {
                    userId: d._id.toString(),
                    username: d.username,
                    partidasJugadas: jugadas,
                    partidasGanadas: ganadas,
                    porcentajeVictorias: jugadas > 0 ? Math.round((ganadas / jugadas) * 100) : 0
                };
            });
        }
    }

    const lista = Array.from(estadisticasEnMemoria.values()).map(u => ({
        userId: u.userId,
        username: u.username,
        partidasJugadas: u.partidasJugadas,
        partidasGanadas: u.partidasGanadas,
        porcentajeVictorias: u.partidasJugadas > 0
            ? Math.round((u.partidasGanadas / u.partidasJugadas) * 100)
            : 0
    }));

    lista.sort((a, b) => (
        b.partidasGanadas - a.partidasGanadas
        || b.porcentajeVictorias - a.porcentajeVictorias
        || b.partidasJugadas - a.partidasJugadas
        || a.username.localeCompare(b.username)
    ));

    return lista.slice(0, tope);
};

/**
 * Limpia las estadísticas en memoria (usado en pruebas unitarias).
 */
User.limpiarEstadisticasMemoria = function () {
    estadisticasEnMemoria.clear();
};

module.exports = User;