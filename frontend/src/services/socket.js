// frontend/src/services/socket.js
import { io } from 'socket.io-client';

const SOCKET_URL = 'https://proyecto-pis-814769346481.europe-southwest1.run.app';

let socketInstance = null;

export function conectarSocket(token) {
    if (!token) return null;

    if (socketInstance) {
        if (socketInstance.auth?.token === token) {
            if (!socketInstance.connected) {
                socketInstance.connect();
            }
            return socketInstance;
        }
        socketInstance.disconnect();
    }

    socketInstance = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket', 'polling']
    });

    return socketInstance;
}

export function obtenerSocket() {
    return socketInstance;
}

export function desconectarSocket() {
    if (socketInstance) {
        socketInstance.disconnect();
        socketInstance = null;
    }
}

export function suscribirSalaSocket(codigo, callback) {
    if (!socketInstance) return;
    socketInstance.emit('room:subscribe', { codigo }, callback);
}

export function desuscribirSalaSocket(codigo) {
    if (!socketInstance) return;
    socketInstance.emit('room:unsubscribe', { codigo });
}

export function jugarCartaSocket(datos, callback) {
    if (!socketInstance) return;
    socketInstance.emit('game:play_card', datos, callback);
}

export function robarCartaSocket(datos, callback) {
    if (!socketInstance) return;
    socketInstance.emit('game:draw_card', datos, callback);
}

export function reinsertarBombaSocket(datos, callback) {
    if (!socketInstance) return;
    socketInstance.emit('game:insert_bomb', datos, callback);
}
