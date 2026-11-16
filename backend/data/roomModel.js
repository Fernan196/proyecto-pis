// backend/data/roomModel.js
const mongoose = require('mongoose');

const jugadorSalaSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true,
        trim: true
    }
}, { _id: false });

const roomSchema = new mongoose.Schema({
    codigo: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },
    nombre: {
        type: String,
        required: true,
        trim: true
    },
    hostId: {
        type: String,
        required: true
    },
    hostUsername: {
        type: String,
        required: true,
        trim: true
    },
    maxJugadores: {
        type: Number,
        default: 4,
        min: 2,
        max: 4
    },
    estado: {
        type: String,
        enum: ['WAITING', 'IN_PROGRESS', 'FINISHED'],
        default: 'WAITING'
    },
    jugadores: {
        type: [jugadorSalaSchema],
        default: []
    },
    partidaId: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

roomSchema.set('toJSON', {
    transform: (document, returnedObject) => {
        returnedObject.id = returnedObject._id.toString();
        delete returnedObject._id;
        delete returnedObject.__v;
    }
});

const Room = mongoose.model('Room', roomSchema);

const salasEnMemoria = new Map();

function usarBaseDeDatos() {
    return mongoose.connection.readyState === 1;
}

function clonarSala(sala) {
    return {
        ...sala,
        jugadores: Array.isArray(sala.jugadores)
            ? sala.jugadores.map(j => ({ userId: String(j.userId), username: String(j.username) }))
            : []
    };
}

/**
 * Persiste una nueva sala en MongoDB (o en memoria si no hay conexión activa).
 */
async function crearSalaDatos(datos) {
    if (usarBaseDeDatos()) {
        const doc = await Room.create(datos);
        return doc.toJSON();
    }

    const ahora = new Date().toISOString();
    const codigo = String(datos.codigo).trim().toUpperCase();
    const sala = clonarSala({
        id: codigo,
        codigo,
        nombre: datos.nombre,
        hostId: String(datos.hostId),
        hostUsername: datos.hostUsername,
        maxJugadores: datos.maxJugadores ?? 4,
        estado: datos.estado || 'WAITING',
        jugadores: datos.jugadores || [],
        partidaId: datos.partidaId ?? null,
        createdAt: ahora,
        updatedAt: ahora
    });
    salasEnMemoria.set(codigo, sala);
    return clonarSala(sala);
}

/**
 * Busca una sala por su código único (insensible a mayúsculas).
 */
async function buscarPorCodigo(codigo) {
    const clave = String(codigo || '').trim().toUpperCase();
    if (!clave) return null;

    if (usarBaseDeDatos()) {
        const doc = await Room.findOne({ codigo: clave });
        return doc ? doc.toJSON() : null;
    }

    const sala = salasEnMemoria.get(clave);
    return sala ? clonarSala(sala) : null;
}

/**
 * Lista las salas filtradas por estado, ordenadas de más reciente a más antigua.
 */
async function listarSalasPorEstado(estado = 'WAITING') {
    if (usarBaseDeDatos()) {
        const docs = await Room.find({ estado }).sort({ createdAt: -1 });
        return docs.map(d => d.toJSON());
    }

    return Array.from(salasEnMemoria.values())
        .filter(sala => sala.estado === estado)
        .map(clonarSala)
        .reverse();
}

/**
 * Actualiza los campos indicados de una sala existente identificada por su código.
 */
async function actualizarSalaDatos(codigo, cambios) {
    const clave = String(codigo || '').trim().toUpperCase();
    if (!clave) return null;

    if (usarBaseDeDatos()) {
        const doc = await Room.findOneAndUpdate(
            { codigo: clave },
            { $set: cambios },
            { new: true, runValidators: true }
        );
        return doc ? doc.toJSON() : null;
    }

    const existente = salasEnMemoria.get(clave);
    if (!existente) return null;

    const actualizada = clonarSala({
        ...existente,
        ...cambios,
        updatedAt: new Date().toISOString()
    });
    salasEnMemoria.set(clave, actualizada);
    return clonarSala(actualizada);
}

/**
 * Elimina una sala existente por su código.
 */
async function eliminarPorCodigo(codigo) {
    const clave = String(codigo || '').trim().toUpperCase();
    if (!clave) return false;

    if (usarBaseDeDatos()) {
        const res = await Room.deleteOne({ codigo: clave });
        return res.deletedCount > 0;
    }

    return salasEnMemoria.delete(clave);
}

/**
 * Busca la última sala activa (WAITING o IN_PROGRESS) en la que participa un usuario.
 */
async function buscarSalaActivaPorJugador(userId) {
    const uid = String(userId || '').trim();
    if (!uid) return null;

    if (usarBaseDeDatos()) {
        const doc = await Room.findOne({
            estado: { $in: ['WAITING', 'IN_PROGRESS'] },
            'jugadores.userId': uid
        }).sort({ updatedAt: -1 });
        return doc ? doc.toJSON() : null;
    }

    const sala = Array.from(salasEnMemoria.values())
        .reverse()
        .find(s => ['WAITING', 'IN_PROGRESS'].includes(s.estado)
            && s.jugadores.some(j => String(j.userId) === uid));

    return sala ? clonarSala(sala) : null;
}

/**
 * Limpia todas las salas en el almacén activo (usado principalmente en pruebas).
 */
async function limpiarSalas() {
    salasEnMemoria.clear();
    if (usarBaseDeDatos()) {
        await Room.deleteMany({});
    }
}

module.exports = {
    Room,
    crearSalaDatos,
    buscarPorCodigo,
    buscarSalaActivaPorJugador,
    listarSalasPorEstado,
    actualizarSalaDatos,
    eliminarPorCodigo,
    limpiarSalas
};
