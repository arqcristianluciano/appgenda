/**
 * Re-descarga el service worker para detectar versiones nuevas de la app.
 *
 * Si la descarga falla (sin red, servidor caído o `sw.js` momentáneamente
 * inaccesible), Safari/WebKit rechaza la promesa con un error del tipo
 * "TypeError: Script .../sw.js load failed". Es un fallo transitorio que no
 * rompe la app: se sigue usando el service worker ya instalado. Tragamos el
 * error para que estos reintentos fallidos no se reporten como crashes.
 */
export function safeUpdate(reg: ServiceWorkerRegistration): Promise<void> {
  return reg.update().then(
    () => {},
    () => {},
  )
}
