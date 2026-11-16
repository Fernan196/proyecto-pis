// backend/data/gameModel.js
const mongoose = require('mongoose');

const jugadorPartidaSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true,
        trim: true
    },
    mano: {
        type: [String],
        default: []
    },
    vivo: {
        type: Boolean,
        default: true
    }
}, { _id: false });

const gameSchema = new mongoose.Schema({
    codigoSala: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },
    estado: {
        type: String,
        enum: ['PLAYING', 'WAITING_DEFUSE_INSERT', 'FINISHED'],
        default: 'PLAYING'
    },
    jugadores: {
        type: [jugadorPartidaSchema],
        default: []
    },
    mazo: {
        type: [String],
        default: []
    },
    descartes: {
        type: [String],
        default: []
    },
    turnoActualIndex: {
        type: Number,
        default: 0
    },
    turnoActualUserId: {
        type: String,
        required: true
    },
    turnosPendientes: {
        type: Number,
        default: 1,
        min: 1
    },
    jugadorDesactivando: {
        type: String,
        default: null
    },
    ganadorId: {
        type: String,
        default: null
    },
    ganadorUsername: {
        type: String,
        default: null
    },
    historialAcciones: {
        type: [String],
        default: []
    }
}, {
    timestamps: true
});

gameSchema.set('toJSON', {
    transform: (document, returnedObject) => {
        returnedObject.id = returnedObject._id.toString();
        delete returnedObject._id;
        delete returnedObject.__v;
    }
});

const Game = mongoose.model('Game', gameSchema);

const partidasEnMemoria = new Map();

function usarBaseDeDatos() {
    return mongoose.connection.readyState === 1;
}

function clonarPartida(partida) {
    return {
        ...partida,
        jugadores: Array.isArray(partida.jugadores)
            ? partida.jugadores.map(j => ({
                userId: String(j.userId),
                username: String(j.username),
                mano: Array.isArray(j.mano) ? [...j.mano] : [],
                vivo: Boolean(j.vivo)
            }))
            : [],
        mazo: Array.isArray(partida.mazo) ? [...partida.mazo] : [],
        descartes: Array.isArray(partida.descartes) ? [...partida.descartes] : [],
        historialAcciones: Array.isArray(partida.historialAcciones) ? [...partida.historialAcciones] : []
    };
}

/**
 * Persiste una nueva partida en MongoDB (o en memoria si no hay conexión activa).
 */
async function crearPartidaDatos(datos) {
    if (usarBaseDeDatos()) {
        const doc = await Game.create(datos);
        return doc.toJSON();
    }

    const ahora = new Date().toISOString();
    const codigoSala = String(datos.codigoSala).trim().toUpperCase();
    const partida = clonarPartida({
        id: `game-${codigoSala}`,
        codigoSala,
        estado: datos.estado || 'PLAYING',
        jugadores: datos.jugadores || [],
        mazo: datos.mazo || [],
        descartes: datos.descartes || [],
        turnoActualIndex: datos.turnoActualIndex ?? 0,
        turnoActualUserId: String(datos.turnoActualUserId),
        turnosPendientes: datos.turnosPendientes ?? 1,
        jugadorDesactivando: datos.jugadorDesactivando ?? null,
        ganadorId: datos.ganadorId ?? null,
        ganadorUsername: datos.ganadorUsername ?? null,
        historialAcciones: datos.historialAcciones || [],
        createdAt: ahora,
        updatedAt: ahora
    });

    partidasEnMemoria.set(codigoSala, partida);
    return clonarPartida(partida);
}

/**
 * Busca una partida por el código de sala asociado.
 */
async function buscarPorCodigoSala(codigoSala) {
    const clave = String(codigoSala || '').trim().toUpperCase();
    if (!clave) return null;

    if (usarBaseDeDatos()) {
        const doc = await Game.findOne({ codigoSala: clave });
        return doc ? doc.toJSON() : null;
    }

    const partida = partidasEnMemoria.get(clave);
    return partida ? clonarPartida(partida) : null;
}

/**
 * Actualiza los campos indicados de una partida existente por código de sala.
 */
async function actualizarPartidaDatos(codigoSala, cambios) {
    const clave = String(codigoSala || '').trim().toUpperCase();
    if (!clave) return null;

    if (usarBaseDeDatos()) {
        const doc = await Game.findOneAndUpdate(
            { codigoSala: clave },
            { $set: cambios },
            { new: true, runValidators: true }
        );
        return doc ? doc.toJSON() : null;
    }

    const existente = partidasEnMemoria.get(clave);
    if (!existente) return null;

    const actualizada = clonarPartida({
        ...existente,
        ...cambios,
        updatedAt: new Date().toISOString()
    });
    partidasEnMemoria.set(clave, actualizada);
    return clonarPartida(actualizada);
}

/**
 * Elimina una partida existente por su código de sala.
 */
async function eliminarPorCodigoSala(codigoSala) {
    const clave = String(codigoSala || '').trim().toUpperCase();
    if (!clave) return false;

    if (usarBaseDeDatos()) {
        const res = await Game.deleteOne({ codigoSala: clave });
        return res.deletedCount > 0;
    }

    return partidasEnMemoria.delete(clave);
}

/**
 * Limpia todas las partidas en el almacén activo (usado en pruebas).
 */
async function limpiarPartidas() {
    partidasEnMemoria.clear();
    if (usarBaseDeDatos()) {
        await Game.deleteMany({});
    }
}

module.exports = {
    Game,
    crearPartidaDatos,
    buscarPorCodigoSala,
    actualizarPartidaDatos,
    eliminarPorCodigoSala,
    limpiarPartidas
};
