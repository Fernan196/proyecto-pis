const logger = require('./logger');

describe('Pruebas Unitarias de la Capa Lógica - Logger (RNF-08)', () => {
    let consoleLogSpy;
    let consoleErrorSpy;

    beforeEach(() => {
        logger.limpiarLogs();
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();
    });

    test('Debe registrar un evento INFO con timestamp, nivel, accion y detalle', () => {
        const entrada = logger.registrarEvento('USUARIO_REGISTRADO', { userId: 'u1', rol: 'user' });

        expect(entrada.nivel).toBe('INFO');
        expect(entrada.accion).toBe('USUARIO_REGISTRADO');
        expect(entrada.detalle).toEqual({ userId: 'u1', rol: 'user' });
        expect(typeof entrada.timestamp).toBe('string');
        expect(Number.isNaN(Date.parse(entrada.timestamp))).toBe(false);
        expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    });

    test('Debe registrar un fallo con nivel ERROR mediante registrarError', () => {
        const entrada = logger.registrarError('ERROR_OAUTH', new Error('Fallo de proveedor'), { origen: 'github' });

        expect(entrada.nivel).toBe('ERROR');
        expect(entrada.accion).toBe('ERROR_OAUTH');
        expect(entrada.detalle).toEqual({ origen: 'github', error: 'Fallo de proveedor' });
        expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    test('obtenerLogs devuelve eventos del más reciente al más antiguo respetando el límite', () => {
        logger.registrarEvento('EVENTO_1', { orden: 1 });
        logger.registrarEvento('EVENTO_2', { orden: 2 });
        logger.registrarEvento('EVENTO_3', { orden: 3 });

        const ultimos = logger.obtenerLogs(2);
        expect(ultimos).toHaveLength(2);
        expect(ultimos[0].accion).toBe('EVENTO_3');
        expect(ultimos[1].accion).toBe('EVENTO_2');
    });

    test('limpiarLogs vacía completamente el historial en memoria', () => {
        logger.registrarEvento('EVENTO_A');
        expect(logger.obtenerLogs()).toHaveLength(1);

        logger.limpiarLogs();
        expect(logger.obtenerLogs()).toHaveLength(0);
    });
});
