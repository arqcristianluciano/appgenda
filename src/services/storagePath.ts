// Ruta de Firebase Storage con el uid del dueño como primer segmento, para que las
// reglas de Storage puedan acotar el acceso por usuario (no pueden consultar
// Firestore). Función pura → testeable sin inicializar Firebase.
export function buildStoragePath(
  uid: string, projectId: string, fileId: string, fileName: string,
): string {
  return `project-files/${uid}/${projectId}/${fileId}-${fileName}`
}
