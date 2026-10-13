// frontend/src/services/api.js
const API_URL = 'https://proyecto-pis-814769346481.europe-southwest1.run.app/api';

export async function login(email, password) {
    const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Error en el login');
    return data; // Devuelve { token, user }
}

export async function register(username, email, password) {
    const response = await fetch(`${API_URL}/usuarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Error en el registro');
    return data;
}

export async function cambiarRol(id, nuevoRol, token) {
    const response = await fetch(`${API_URL}/usuarios/${id}/rol`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ nuevoRol })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Error al cambiar rol');
    return data;
}

export const obtenerUsuarios = async (token) => {
    const response = await fetch('https://proyecto-pis-814769346481.europe-southwest1.run.app/api/usuarios', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    if (!response.ok) throw new Error('No autorizado');
    return response.json();
};

export const eliminarUsuario = async (id, token) => {
    const response = await fetch(`https://proyecto-pis-814769346481.europe-southwest1.run.app/api/usuarios/${id}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    if (!response.ok) throw new Error('Error al eliminar');
    return response.json();
};