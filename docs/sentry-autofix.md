# Autocorrección de errores de Sentry con Claude

Cuando Sentry detecta un error en producción, puede abrir automáticamente un
GitHub Issue con el stack trace. Si ese issue lleva la etiqueta `sentry`, el
workflow [`.github/workflows/sentry-autofix.yml`](../.github/workflows/sentry-autofix.yml)
lanza a Claude para que diagnostique la causa, aplique un fix y abra un
**Pull Request en draft**. El CI (`pr-checks.yml`) valida el PR y tú decides el
merge.

```
Sentry (Alert Rule)  ──►  GitHub Issue [label: sentry]  ──►  Action: Claude  ──►  PR draft  ──►  CI  ──►  revisión humana  ──►  merge
```

## Puesta en marcha (una sola vez)

### 1. Secret de Anthropic en GitHub
En `Settings → Secrets and variables → Actions` del repo, añade:

- `ANTHROPIC_API_KEY` — tu API key de Anthropic.

### 2. Crear la etiqueta `sentry`
En `Issues → Labels → New label`, crea una etiqueta llamada exactamente
`sentry`. El workflow solo se dispara con esa etiqueta.

### 3. Conectar Sentry con GitHub
En Sentry: `Settings → Integrations → GitHub` → instala la app y autoriza el
repositorio `arqcristianluciano/appgenda`.

### 4. Regla de alerta que crea el issue
En Sentry: `Alerts → Create Alert → Issues`:

- **When**: `A new issue is created` (o el filtro que prefieras: entorno,
  frecuencia, nivel `error`, etc.).
- **Then**: `Create a new GitHub issue` en `arqcristianluciano/appgenda`.
- En la acción, asigna la **etiqueta `sentry`** al issue.

> Asegúrate de incluir el stack trace en el cuerpo del issue (es lo que Sentry
> añade por defecto). Cuanto mejor sea el stack trace (con sourcemaps subidos a
> Sentry), mejor será el diagnóstico de Claude.

## Probarlo sin esperar a un error real

1. Crea un issue manual pegando un error y su stack trace; ponle la etiqueta
   `sentry`. El workflow se disparará solo.
2. O lánzalo a mano: `Actions → Sentry Autofix → Run workflow`, indicando el
   número del issue.

## Seguridad y límites

- El PR **siempre se abre en draft**: ninguna corrección llega a producción sin
  revisión humana.
- Claude trata el contenido del issue como datos externos y no ejecuta
  instrucciones incrustadas en el texto del error.
- Si no puede identificar la causa con seguridad, comenta en el issue en lugar
  de inventar un fix.
- Recomendado: subir **sourcemaps a Sentry** en el build para que los stack
  traces no estén minificados (mejora mucho el diagnóstico).
