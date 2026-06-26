# Bitácora de cambios

Diario en lenguaje sencillo de lo que se va haciendo en la app.


## 2026-06-26 — Arreglo de fechas en Gastos fijos y menos espacio desperdiciado

**Qué se hizo (en palabras simples):**

1. **Las fechas vuelven a quedarse quietas.** Antes, cada vez que elegías
   una fecha en un gasto, la lista se reacomodaba sola y daba la sensación
   de que "no tomaba" la fecha y de que todo se desordenaba. Ahora los
   gastos siguen ordenados por fecha de vencimiento, pero ese orden se
   calcula solo al abrir la pantalla: mientras eliges o cambias una fecha,
   el renglón **se queda en su sitio** y no salta. El reacomodo por fecha
   se ve la próxima vez que entras a "Gastos fijos".

2. **Menos espacio vacío en "Gastos fijos".** El botón "Nuevo gasto" ahora
   va en la misma fila que los filtros (Todas / Personal / Equipo), y el
   título de arriba quedó más ajustado. Así se ve más contenido sin tener
   que bajar.

3. **Barra lateral más compacta y fácil de leer.** El menú de abajo (Modo
   claro, notificaciones, copias de seguridad, etc.) y los contadores de
   "Pendientes" y "Hechas" ahora ocupan menos alto y el texto se lee con
   más claridad.

**Qué cambió para Cristian:** En "Gastos fijos" puedes elegir fechas con
tranquilidad (no se desordena nada) y ves más cosas en pantalla. La barra
de la izquierda se lee mejor.

**Cómo probarlo:** Entra a "Gastos fijos", elige una fecha en cualquier
pago y verás que se queda en su sitio. Mira también la barra de la
izquierda: el menú de abajo se ve más ordenado.

**Punto de restauración:** `restore/2026-06-26-fechas-y-espacios` (por si
hay que volver atrás).


## 2026-06-08 — Los gastos fijos se muestran en orden de fecha

**Qué se hizo (en palabras simples):**

Dentro de cada mes, los pagos ahora aparecen ordenados por su fecha de
vencimiento, del día más temprano al más tardío. Los que todavía no tienen
fecha asignada quedan al final de la lista.

**Qué cambió para Cristian:** En "Gastos fijos" puedes leer de arriba hacia
abajo en el mismo orden en que van venciendo los pagos del mes, sin saltos.

**Cómo probarlo:** Entra a "Gastos fijos" y mira el mes actual: las fechas
van en orden.


## 2026-06-08 — "Finanzas" ahora se llama "Gastos fijos" (y más tipos de pago)

**Qué se hizo (en palabras simples):**

La sección que antes se llamaba **"Finanzas"** ahora se llama
**"Gastos fijos"**, porque ahí llevas los pagos que se repiten cada mes.
Además, al agregar un gasto ya no estás limitado a "Tarjeta" o "Préstamo":
ahora puedes elegir también **Servicio** (luz, agua, internet),
**Mantenimiento** y **Otro**. Cada tipo se muestra con su propio color
para reconocerlo de un vistazo.

**Qué cambió para Cristian:** El menú, el título y el calendario ahora
dicen "Gastos fijos". Y cuando agregues un pago nuevo podrás clasificarlo
mejor (por ejemplo, la luz como "Servicio" o el mantenimiento del edificio
como "Mantenimiento").

**Cómo probarlo:** Entra a "Gastos fijos", toca "+ Nuevo gasto" y elige el
tipo en la lista.

**Pendiente / notas:** Punto de restauración: `restore/2026-06-08-gastos-fijos`.


## 2026-06-08 — Botón para agregar finanzas (tarjetas y préstamos)

**Qué se hizo (en palabras simples):**

En la sección **Finanzas** ahora hay un botón verde **"+ Nueva finanza"**
arriba a la derecha. Con él puedes agregar tú mismo una tarjeta o un
préstamo: escribes el nombre, eliges si es Tarjeta o Préstamo y, si
quieres, el día del mes en que se paga. La app crea sola los pagos del
mes actual y del siguiente con esa fecha.

También puedes **corregir** una finanza (tocando su nombre en la lista se
abre para editarla) y **eliminarla** si te equivocaste (te pide
confirmación antes de borrar, porque no se puede deshacer). Si algún día
no tienes ninguna finanza, la pantalla muestra un mensaje amable con el
mismo botón para empezar.

**Qué cambió para Cristian:** Antes solo se podían marcar como pagadas las
finanzas que ya venían cargadas; no había forma de agregar nuevas desde la
app. Ahora sí puedes crear, corregir y borrar tus tarjetas y préstamos por
tu cuenta.

**Cómo probarlo:** Entra a la app, ve a **Finanzas** y toca
**"+ Nueva finanza"**.

**Pendiente / notas:** Punto de restauración creado por si hiciera falta
volver atrás: `restore/2026-06-08-boton-finanzas`.


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
