# Bitácora de cambios

Diario en lenguaje sencillo de lo que se va haciendo en la app.


## 2026-06-08 — Reglas de trabajo y sistema de auto-corrección de errores

**Qué se hizo (en palabras simples):**

1. **Reglas de trabajo unificadas.** Este proyecto ahora tiene un archivo
   `CLAUDE.md` con 11 reglas para que Claude siempre hable en español
   simple, pregunte con opciones (y recomiende una), cree puntos de
   restauración antes de cambios grandes, pruebe antes de decir "listo",
   respalde a GitHub al final, y mantenga esta bitácora. Las mismas reglas
   están en los 3 proyectos (HousePro, Nominapp, Appgenda) y en la
   configuración general de la computadora.

2. **Sistema que arregla errores solo.** Se conectó Sentry (el vigilante
   que detecta errores) con GitHub y con Claude. Ahora el circuito completo
   es: la app falla → Sentry lo detecta → cada hora un "vigilante" revisa y
   crea un aviso → Claude investiga y prepara el arreglo → se prueba solo →
   si todo pasa, se publica solo; si algo falla, queda esperando revisión.

3. **Llaves y permisos.** Se guardaron en GitHub la llave de Claude
   (`ANTHROPIC_API_KEY`) y la del vigilante (`SENTRY_WATCH_TOKEN`), y se
   activó el permiso para que el sistema pueda publicar sus propias
   propuestas de cambio.

**Qué cambió para Cristian:** Los errores de la app ahora se detectan y, en
muchos casos, se corrigen solos sin que tengas que intervenir. Cada arreglo
queda anotado y se puede revisar. Cada corrección automática consume un poco
de crédito de la cuenta de Claude (centavos por arreglo).

**Pendiente / notas:** Mover los proyectos fuera de OneDrive (causa
tropiezos con el historial). Las apps siguen en línea con normalidad.
