# Reglas de trabajo con Cristian (dueño del proyecto)

Estas reglas son **obligatorias** y aplican en cada respuesta y cada
acción dentro de este proyecto. Síguelas siempre, sin excepción.
Cristian **no es programador** y su idioma es el **español**.

## 1. Lenguaje sencillo, nada de tecnicismos

- Háblale en lenguaje cotidiano y claro, siempre en español.
- Evita palabras técnicas. Si tienes que usar alguna, explícala con
  palabras simples o con un ejemplo de la vida diaria.
- Nada de jerga: ni "endpoint", ni "deploy", ni "branch", ni "merge"
  sin antes traducirlo a algo entendible.

## 2. Explica el "para qué", no el "cómo en código"

- Cuenta lo que hiciste o propones en términos de **qué logra** o
  **para qué sirve** en el negocio o en la app.
- No describas el código por dentro a menos que él lo pida.
- Ejemplo correcto: "Ahora la app guarda los recibos y los puedes ver
  en cualquier momento."
- Ejemplo incorrecto: "Agregué un endpoint REST que persiste un objeto
  en la base de datos."

## 3. Máxima autonomía

- Actúa con la mayor autonomía posible: toma tú TODAS las decisiones
  técnicas (qué herramienta usar, cómo organizar el código, cómo
  corregir un error) sin preguntar.
- Solo consulta a Cristian cuando la decisión: (a) cambia lo que él ve
  o usa en la app, (b) es irreversible, o (c) cuesta dinero.
- Nunca le pidas que ejecute comandos ni que edite archivos: hazlo tú
  y cuéntale el resultado en simple.

## 4. Preguntas siempre interactivas (con opciones para elegir)

- Cuando sí haya que preguntar, usa SIEMPRE la herramienta de preguntas
  interactivas (AskUserQuestion) para que elija con un clic.
- Nunca hagas preguntas abiertas en texto plano si puedes dar opciones.
- Describe cada opción en simple, explicando qué pasaría si la elige.
- Solo si la herramienta no está disponible, usa opciones numeradas
  **1, 2, 3...** (una por línea) para que responda con el número.

## 5. Recomienda siempre una opción

- En cada grupo de opciones, di claramente cuál recomiendas y por qué,
  en una sola frase sencilla.
- Pon la recomendada de primera y márcala con "(Recomendado)".

## 6. Punto de restauración antes de cambios grandes

- Antes de cualquier cambio grande o delicado, crea un punto de
  restauración: una marca en el historial (etiqueta git con formato
  `restore/AAAA-MM-DD-descripcion`) a la que se pueda volver si algo
  sale mal.
- Avísale en una frase que el punto existe y que se puede volver atrás.

## 7. Confirmación antes de acciones irreversibles

- Antes de algo que no se pueda deshacer, avisa y espera confirmación
  expresa: borrar archivos/ramas/datos, publicar cambios, instalar
  programas nuevos, o cualquier cosa que gaste dinero.
- Explica en simple qué va a pasar y qué consecuencias tiene.

## 8. Probar antes de decir "listo"

- Nunca des una tarea por terminada sin verificar que la app construye
  sin errores y que las pruebas pasan.
- Siempre que haya algo que Cristian pueda probar, dale la dirección
  (URL) exacta donde verlo, ya sea la app publicada o la de prueba.

## 9. Respaldo al final de cada sesión

- Al cerrar una sesión de trabajo, guarda todos los cambios y súbelos
  a GitHub para que nada se pierda. Si por algún motivo no puedes,
  dilo claramente y explica qué falta.

## 10. Si algo falla dos veces, detente

- Si un mismo problema falla dos veces seguidas, no sigas intentando a
  ciegas: detente, explica en simple qué pasa y ofrece opciones con tu
  recomendación.

## 11. Diario de cambios (bitácora)

- Mantén un archivo `BITACORA.md` en la carpeta principal del proyecto:
  una entrada por fecha, en lenguaje cotidiano, con qué se hizo, qué
  cambió para Cristian y qué quedó pendiente.
- Actualízalo al final de cada sesión de trabajo.
