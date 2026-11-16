// frontend/src/services/api.js
const API_URL = 'https://proyecto-pis-814769346481.europe-southwest1.run.app/api';

async function requestJson(path, options = {}, defaultError = 'Error en la petición') {
    const response = await fetch(`${API_URL}${path}`, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.error || defaultError);
    }
    return data;
}

function authHeaders(token, withJson = false) {
    const headers = { Authorization: `Bearer ${token}` };
    if (withJson) {
        headers['Content-Type'] = 'application/json';
    }
    return headers;
}

export async function login(email, password) {
    return requestJson('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    }, 'Error en el login');
}

export async function register(username, email, password) {
    return requestJson('/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
    }, 'Error en el registro');
}

export async function cambiarRol(id, nuevoRol, token) {
    return requestJson(`/usuarios/${id}/rol`, {
        method: 'PATCH',
        headers: authHeaders(token, true),
        body: JSON.stringify({ nuevoRol })
    }, 'Error al cambiar rol');
}

export const obtenerUsuarios = async (token) => {
    return requestJson('/usuarios', {
        method: 'GET',
        headers: authHeaders(token)
    }, 'No autorizado');
};

export const eliminarUsuario = async (id, token) => {
    return requestJson(`/usuarios/${id}`, {
        method: 'DELETE',
        headers: authHeaders(token)
    }, 'Error al eliminar');
};

// Gestión de salas (Lobby)
export async function crearSala(nombre, maxJugadores, token) {
    return requestJson('/salas', {
        method: 'POST',
        headers: authHeaders(token, true),
        body: JSON.stringify({ nombre, maxJugadores })
    }, 'Error al crear la sala');
}

export async function obtenerSalas(token) {
    return requestJson('/salas', {
        method: 'GET',
        headers: authHeaders(token)
    }, 'Error al listar salas');
}

export async function obtenerSala(codigo, token) {
    return requestJson(`/salas/${codigo}`, {
        method: 'GET',
        headers: authHeaders(token)
    }, 'Error al obtener la sala');
}

export async function unirseSala(codigo, token) {
    return requestJson(`/salas/${codigo}/unirse`, {
        method: 'POST',
        headers: authHeaders(token)
    }, 'Error al unirse a la sala');
}

export async function salirSala(codigo, token) {
    return requestJson(`/salas/${codigo}/salir`, {
        method: 'POST',
        headers: authHeaders(token)
    }, 'Error al salir de la sala');
}

export async function iniciarPartida(codigo, token) {
    return requestJson(`/salas/${codigo}/iniciar`, {
        method: 'POST',
        headers: authHeaders(token)
    }, 'Error al iniciar la partida');
}

// Motor de juego (Partidas)
export async function obtenerPartida(codigo, token) {
    return requestJson(`/partidas/${codigo}`, {
        method: 'GET',
        headers: authHeaders(token)
    }, 'Error al obtener la partida');
}

export async function jugarCarta(codigo, tipoCarta, objetivoUserId, token) {
    return requestJson(`/partidas/${codigo}/jugar`, {
        method: 'POST',
        headers: authHeaders(token, true),
        body: JSON.stringify({ tipoCarta, objetivoUserId })
    }, 'Error al jugar la carta');
}

export async function robarCarta(codigo, posicionBomba, token) {
    return requestJson(`/partidas/${codigo}/robar`, {
        method: 'POST',
        headers: authHeaders(token, true),
        body: JSON.stringify({ posicionBomba })
    }, 'Error al robar carta');
}

export async function reinsertarBomba(codigo, posicionBomba, token) {
    return requestJson(`/partidas/${codigo}/reinsertar-bomba`, {
        method: 'POST',
        headers: authHeaders(token, true),
        body: JSON.stringify({ posicionBomba })
    }, 'Error al reinsertar el Michi Explosivo');
}

// Reconexión y Ranking
export async function obtenerRanking(token) {
    return requestJson('/ranking', {
        method: 'GET',
        headers: authHeaders(token)
    }, 'Error al obtener el ranking');
}

export async function obtenerSesionJuegoActiva(token) {
    return requestJson('/sesion-juego/activa', {
        method: 'GET',
        headers: authHeaders(token)
    }, 'Error al recuperar la sesión de juego');
}
