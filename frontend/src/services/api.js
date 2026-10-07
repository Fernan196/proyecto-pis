// frontend/src/services/api.js
const API_URL = 'http://localhost:3000/api';

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

export async function register(email, password) {
    const response = await fetch(`${API_URL}/usuarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Error en el registro');
    return data;
}

export const obtenerUsuarios = async (token) => {
    const response = await fetch('http://localhost:3000/api/usuarios', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    if (!response.ok) throw new Error('No autorizado');
    return response.json();
};

export const eliminarUsuario = async (id, token) => {
    const response = await fetch(`http://localhost:3000/api/usuarios/${id}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    if (!response.ok) throw new Error('Error al eliminar');
    return response.json();
};