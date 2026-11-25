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

const usuariosEnMemoria = new Map();
const estadisticasEnMemoria = new Map();

function usarBaseDeDatos() {
    return mongoose.connection.readyState === 1;
}

function normalizarUsuario(docOrObj, { incluirPassword = false } = {}) {
    if (!docOrObj) return null;
    const plain = typeof docOrObj.toObject === 'function' ? docOrObj.toObject() : { ...docOrObj };
    const id = plain.id || (plain._id ? plain._id.toString() : null);

    const resultado = {
        id,
        username: plain.username,
        email: plain.email,
        confirmado: Boolean(plain.confirmado),
        rol: plain.rol || 'user',
        githubId: plain.githubId ?? null,
        partidasJugadas: plain.partidasJugadas ?? 0,
        partidasGanadas: plain.partidasGanadas ?? 0,
        createdAt: plain.createdAt,
        updatedAt: plain.updatedAt
    };

    if (incluirPassword) {
        resultado.password = plain.password;
    }

    return resultado;
}

/**
 * Comprueba si un identificador tiene formato válido de ObjectId.
 */
User.esIdValido = function (id) {
    return Boolean(id && mongoose.Types.ObjectId.isValid(String(id)));
};

/**
 * Crea un nuevo usuario en MongoDB o en memoria si no hay conexión activa.
 */
User.crearUsuarioDatos = async function (datos) {
    const emailNorm = String(datos.email || '').trim().toLowerCase();

    if (usarBaseDeDatos()) {
        const doc = await User.create({
            ...datos,
            email: emailNorm
        });
        return normalizarUsuario(doc);
    }

    for (const existente of usuariosEnMemoria.values()) {
        if (existente.email === emailNorm) {
            throw new Error('El correo electrónico ya está registrado');
        }
    }

    const ahora = new Date().toISOString();
    const id = new mongoose.Types.ObjectId().toString();
    const registro = {
        id,
        username: String(datos.username || '').trim(),
        email: emailNorm,
        password: datos.password ?? null,
        confirmado: Boolean(datos.confirmado),
        rol: datos.rol || 'user',
        githubId: datos.githubId ?? null,
        partidasJugadas: datos.partidasJugadas ?? 0,
        partidasGanadas: datos.partidasGanadas ?? 0,
        createdAt: ahora,
        updatedAt: ahora
    };

    usuariosEnMemoria.set(id, registro);
    return normalizarUsuario(registro);
};

/**
 * Busca un usuario por email (incluye el hash de contraseña para autenticación).
 */
User.buscarPorEmail = async function (email) {
    const emailNorm = String(email || '').trim().toLowerCase();
    if (!emailNorm) return null;

    if (usarBaseDeDatos()) {
        const doc = await User.findOne({ email: emailNorm });
        return normalizarUsuario(doc, { incluirPassword: true });
    }

    for (const usuario of usuariosEnMemoria.values()) {
        if (usuario.email === emailNorm) {
            return normalizarUsuario(usuario, { incluirPassword: true });
        }
    }
    return null;
};

/**
 * Busca un usuario por su identificador único.
 */
User.buscarPorId = async function (id, { incluirPassword = false } = {}) {
    if (!User.esIdValido(id)) return null;
    const uid = String(id);

    if (usarBaseDeDatos()) {
        const doc = await User.findById(uid);
        return normalizarUsuario(doc, { incluirPassword });
    }

    return normalizarUsuario(usuariosEnMemoria.get(uid), { incluirPassword });
};

/**
 * Lista todos los usuarios registrados sin exponer hashes de contraseña.
 */
User.listarUsuariosDatos = async function () {
    if (usarBaseDeDatos()) {
        const docs = await User.find().select('-password');
        return docs.map(d => normalizarUsuario(d));
    }

    return Array.from(usuariosEnMemoria.values()).map(u => normalizarUsuario(u));
};

/**
 * Actualiza los campos indicados de un usuario por ID.
 */
User.actualizarUsuarioDatos = async function (id, cambios) {
    if (!User.esIdValido(id)) return null;
    const uid = String(id);

    if (usarBaseDeDatos()) {
        const doc = await User.findByIdAndUpdate(
            uid,
            { $set: cambios },
            { new: true, runValidators: true }
        );
        return normalizarUsuario(doc);
    }

    const existente = usuariosEnMemoria.get(uid);
    if (!existente) return null;

    const actualizado = {
        ...existente,
        ...cambios,
        updatedAt: new Date().toISOString()
    };
    usuariosEnMemoria.set(uid, actualizado);
    return normalizarUsuario(actualizado);
};

/**
 * Cuenta cuántos usuarios tienen asignado un rol concreto.
 */
User.contarPorRol = async function (rol) {
    if (usarBaseDeDatos()) {
        return await User.countDocuments({ rol });
    }

    let total = 0;
    for (const usuario of usuariosEnMemoria.values()) {
        if (usuario.rol === rol) total += 1;
    }
    return total;
};

/**
 * Elimina un usuario por su ID.
 */
User.eliminarPorId = async function (id) {
    if (!User.esIdValido(id)) return false;
    const uid = String(id);

    if (usarBaseDeDatos()) {
        const eliminado = await User.findByIdAndDelete(uid);
        return Boolean(eliminado);
    }

    return usuariosEnMemoria.delete(uid);
};

/**
 * Limpia los usuarios y estadísticas en MongoDB (si está conectado) y en memoria.
 */
User.limpiarUsuarios = async function () {
    if (usarBaseDeDatos()) {
        await User.deleteMany({});
    }
    usuariosEnMemoria.clear();
    estadisticasEnMemoria.clear();
};

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