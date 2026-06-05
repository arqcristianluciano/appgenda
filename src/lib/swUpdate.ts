/**
 * Comprueba si hay una versión nueva del Service Worker, ignorando los fallos
 * transitorios de red.
 *
 * `ServiceWorkerRegistration.update()` descarga el `sw.js` y rechaza la promesa
 * si no puede obtenerlo. Cuando el dispositivo está sin conexión o la red es
 * intermitente, WebKit/Safari rechaza con `TypeError: Script <url> load failed`.
 * Es un fallo esperado y no accionable: se reintenta solo en la siguiente
 * comprobación, así que lo silenciamos para no generar rechazos de promesa sin
 * capturar (que Sentry reportaba como ruido, agravado por el sondeo periódico).
 */
export async function safeUpdate(reg: ServiceWorkerRegistration): Promise<void> {
  try {
    await reg.update()
  } catch {
    // Fallo transitorio al descargar el sw.js; se reintenta en la próxima vuelta.
  }
}
