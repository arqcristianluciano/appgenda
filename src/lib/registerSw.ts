// Registro del service worker resistente a fallos.
//
// La carga del script `/sw.js` puede fallar de forma transitoria: el navegador
// está offline, la red es intermitente, hay un despliegue en curso (el cliente
// pide una versión que aún no está publicada) o se trata de una peculiaridad de
// iOS/Safari. En todos esos casos el navegador reintenta el registro en la
// siguiente carga de la página, así que el fallo no es accionable.
//
// Hasta ahora el registro lo inyectaba `vite-plugin-pwa` con un
// `navigator.serviceWorker.register('/sw.js')` sin `.catch`, por lo que el
// rechazo escalaba como un `TypeError: Script .../sw.js load failed` sin
// gestionar y acababa en Sentry (APPGENDA-7). Lo registramos nosotros y
// capturamos el error para que no se propague.
export async function registerServiceWorker(
  container: ServiceWorkerContainer = navigator.serviceWorker,
): Promise<ServiceWorkerRegistration | null> {
  try {
    return await container.register('/sw.js', { scope: '/' })
  } catch (err) {
    console.warn('No se pudo registrar el service worker:', err)
    return null
  }
}
