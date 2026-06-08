// Filtros de errores que NO son bugs de la app y por tanto no deberían
// llegar a Sentry. Mantener esta lógica como funciones puras facilita
// probarla con vitest sin levantar el SDK de Sentry.

// Errores al registrar el Service Worker que vienen del dispositivo o la red
// del usuario, no del código:
//  - un antivirus o proxy de empresa que intercepta el cifrado SSL,
//  - el reloj del equipo mal puesto (hace que el certificado parezca inválido),
//  - una conexión inestable que corta la descarga del script.
// No hay nada que corregir en el código, así que los descartamos para que no
// ensucien el panel de errores con avisos sin solución.
const REGISTRO_SW_NO_ACCIONABLE: RegExp[] = [
  /An SSL certificate error occurred when fetching the script/i,
  /An unknown error occurred when fetching the script/i,
  /The script resource is behind a redirect/i,
]

/**
 * Devuelve `true` cuando el mensaje corresponde a un fallo de registro del
 * Service Worker causado por el entorno del usuario (SSL/red), que no es
 * accionable desde el código.
 */
export function esErrorServiceWorkerNoAccionable(
  mensaje: string | undefined | null,
): boolean {
  if (!mensaje) return false
  if (!/register a ServiceWorker|registration failed|fetching the script/i.test(mensaje)) {
    return false
  }
  return REGISTRO_SW_NO_ACCIONABLE.some((re) => re.test(mensaje))
}
