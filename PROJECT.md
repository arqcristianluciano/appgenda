# APPgenda

Agenda personal estilo propio. Gestión de tareas, finanzas, inversiones y calendario semanal.

## Stack

- **Frontend:** React 19 + TypeScript + Vite
- **Estilos:** Tailwind CSS 3
- **Estado:** Zustand 5
- **Backend:** Supabase (fallback a localStorage si no hay credenciales)
- **Iconos:** Lucide React

## Estructura del proyecto

```
/
├── src/
│   ├── components/
│   │   ├── Sidebar.tsx              — Navegación lateral (desktop + mobile)
│   │   ├── LoginScreen.tsx          — Pantalla de login (Google Sign-In)
│   │   ├── EditTaskModal.tsx        — Modal de edición de tarea
│   │   ├── MemberAvatar.tsx        — Avatar de miembro de equipo
│   │   ├── MemberSelector.tsx      — Selector de miembros para asignar tareas
│   │   └── ScopeFilter.tsx         — Filtro scope (personal/equipo/todos) + hook useScopeFilter
│   ├── hooks/
│   │   └── useCanEdit.ts           — Hook que retorna false si el usuario es viewer en el equipo activo
│   ├── views/
│   │   ├── proyectos/
│   │   │   └── ProjectFiles.tsx     — Sección de archivos adjuntos por proyecto (upload/delete)
│   │   ├── calendar/
│   │   │   ├── ViewCalendar.tsx     — Contenedor principal del calendario
│   │   │   ├── CalendarHeader.tsx   — Nav + switch vista (mes/semana/día)
│   │   │   ├── MonthView.tsx        — Vista mensual tipo Google Calendar
│   │   │   ├── WeekView.tsx         — Vista semanal con franja horaria
│   │   │   ├── EventModal.tsx       — Modal crear/editar evento
│   │   │   ├── CalendarSources.tsx  — Gestión calendarios (local/Google/iCloud)
    │   │   │   ├── IcloudAuthForm.tsx   — Form iCloud: Apple ID+CalDAV o URL webcal
    │   │   │   └── useEventSync.ts     — Hook sync bidireccional para EventModal
│   │   ├── equipo/
│   │   │   ├── ViewEquipo.tsx       — Gestión de equipos y miembros
│   │   │   ├── CreateTeamForm.tsx   — Formulario crear equipo
│   │   │   └── InviteMemberForm.tsx — Invitar miembro por email
│   │   ├── ViewHoy.tsx              — Tareas del día con prioridades
│   │   ├── ViewProyectos.tsx        — Gestión de proyectos
│   │   ├── ViewSemana.tsx           — (legacy) Calendario semanal simple
│   │   ├── ViewFinanzas.tsx         — Tarjetas/préstamos y pagos mensuales
│   │   ├── ViewInversiones.tsx      — Portfolio de inversiones
│   │   ├── datos/
│   │   │   ├── ViewDatos.tsx        — Contenedor con tabs (cuentas/accesos)
│   │   │   ├── CuentasBancarias.tsx — CRUD cuentas + compartir por WhatsApp
│   │   │   └── AccesosRemotos.tsx   — CRUD AnyDesk/TeamViewer/RDP (show/hide pwd)
│   │   └── index.ts                 — Re-exports
│   ├── services/
    │   │   ├── auth.ts                  — Autenticación (Google Sign-In, sesión localStorage)
    │   │   ├── fileStorage.ts           — Upload/delete archivos (Supabase Storage o base64 fallback)
    │   │   ├── googleCalendar.ts        — Google Calendar API (OAuth2 code flow + REST, CRUD)
    │   │   ├── googleTokens.ts          — Gestión de tokens: access, refresh, expiración, auto-refresh silencioso
    │   │   ├── icloudCalendar.ts        — iCloud Calendar vía ICS/webcal (read-only)
    │   │   ├── icloudCalDAV.ts          — iCloud CalDAV lectura (Apple ID + contraseña de app)
    │   │   ├── icloudCalDAVBase.ts      — Funciones base CalDAV (auth, request proxy)
    │   │   ├── icloudCalDAVWrite.ts     — iCloud CalDAV escritura (create/update/delete)
    │   │   └── calendarSync.ts          — Orquestador sync bidireccional (Google + iCloud)
├── supabase/
│   ├── config.toml                  — Config local de Supabase (verify_jwt = false para funciones públicas)
│   └── functions/
│       ├── caldav-proxy/index.ts    — Supabase Edge Function: proxy CalDAV para iCloud (Deno)
│       └── google-oauth/index.ts    — Supabase Edge Function: exchange código + refresh token Google (Deno)
│   ├── store/
│   │   ├── useStore.ts              — Store global Zustand (datos persistidos)
│   │   ├── useCalendarStore.ts      — Store UI calendario (vista, fecha, fuentes)
│   │   └── useTeamStore.ts          — Store equipos y miembros
│   ├── lib/
│   │   ├── storage.ts               — Persistencia (Supabase o localStorage)
│   │   ├── realtimeSync.ts          — Suscripción realtime con reconexión y refresh on focus/online
│   │   ├── defaults.ts              — Datos por defecto y storage key
│   │   └── merge.ts                 — Migración de versiones + ensureMonths
│   ├── types/
│   │   ├── index.ts                 — Tipos TypeScript
│   │   └── google.d.ts              — Tipos Google Identity Services
│   ├── App.tsx                      — Layout principal + routing por vista
│   └── main.tsx                     — Entry point
├── .env.example                 — Variables de entorno necesarias
└── package.json
```

## Variables de entorno

Copiar `.env.example` a `.env` y completar:

```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

Sin variables de Supabase → usa localStorage automáticamente.

Para el login y sincronización con Google Calendar, agregar:

```
VITE_GOOGLE_CLIENT_ID=757163440595-sk5hkq3u2h9jka1g6j45ll7aak2bgeg3.apps.googleusercontent.com
VITE_ALLOWED_EMAIL=arqcristianluciano@gmail.com
```

Los secretos `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` van en **Supabase Edge Functions** (no en el frontend):

```bash
supabase secrets set GOOGLE_CLIENT_ID=...
supabase secrets set GOOGLE_CLIENT_SECRET=...
```

O vía Dashboard → Project Settings → Edge Functions → Secrets. Se obtienen en Google Cloud Console → APIs & Services → Credenciales → APPgenda Web → Descargar JSON. Son necesarios para el refresh automático de tokens de Google Calendar sin ventanas emergentes.

Google Cloud Console: proyecto `appgenda-rd`, Calendar API habilitada, OAuth 2.0 client `APPgenda Web` (orígenes: `http://localhost:5173`, `https://appgenda-rd.web.app`, `https://appgenda-rd.firebaseapp.com`). Usuario de prueba: `arqcristianluciano@gmail.com`.

## Supabase schema

### Legacy (backward compatible)
```sql
create table agenda_storage (key text primary key, value text not null, updated_at timestamptz default now());
```

### Multi-usuario (v2)
13 tablas relacionales con RLS: `profiles`, `teams`, `team_members`, `projects`, `tasks`, `events`, `obligations`, `payments`, `investments`, `bank_accounts`, `contacts`, `remote_accesses`, `calendar_configs`.

Funciones helper: `is_team_member(t_id)`, `is_team_admin(t_id)`, `handle_new_user()` (trigger en `auth.users`).

Migración: `supabase/migration_001_multiuser.sql`. Al login, `src/services/migration.ts` migra datos del JSON blob a tablas individuales.

`supabase/migration_003_realtime_full.sql` agrega `obligations`, `investments`, `bank_accounts`, `contacts`, `remote_accesses` y `calendar_configs` a la publicación `supabase_realtime` para que los cambios se propaguen entre dispositivos.

### Servicios de datos
- `src/services/db.ts` — CRUD individual por tabla (upsert/remove con mapeo frontend↔DB)
- `src/services/migration.ts` — Migración one-time del blob JSON a tablas
- `src/lib/storage.ts` — Carga desde tablas, fallback a blob, localStorage offline

## Tipos principales

| Tipo | Descripción |
|------|-------------|
| `Tarea` | Tarea con prioridad, proyecto, fecha, nota |
| `Proyecto` | Proyecto con nombre, color, archivos adjuntos y asignación opcional (personal/equipo) |
| `ArchivoAdjunto` | Archivo adjunto a un proyecto (nombre, tipo, tamaño, url o dataUrl) |
| `Evento` | Evento con título, fecha, hora inicio/fin, color, fuente (local/google/icloud) |
| `CalendarSource` | Fuente de calendario (local, Google, iCloud) |
| `CalendarConfig` | Config sincronizada de calendarios (iCloud auth, webcal, Google emails) — dentro de AppData |
| `Obligacion` | Tarjeta o préstamo |
| `Pago` | Pago mensual de una obligación |
| `Inversion` | Activo en USD/DOP (inmobiliario/vehículos/financiero/empresas) |
| `CuentaBancaria` | Cuenta bancaria con banco, número, titular, teléfono |
| `Contacto` | Persona con cédula, teléfono, email |
| `AccesoRemoto` | Acceso AnyDesk/TeamViewer/RDP con código y contraseña |

## Vistas (Vista type)

`hoy` | `proyectos` | `semana` | `finanzas` | `inversiones` | `datos` | `equipo`

## Paleta de colores (CSS Variables — light/dark)

Definidas en `index.css` como `:root` / `.dark`. Tailwind las consume vía `tailwind.config.js`.

| Token | Light | Dark |
|-------|-------|------|
| `surface-bg` | `#F7F4EF` | `#0F0F0F` |
| `surface` | `#FFFFFF` | `#1A1A1C` |
| `surface-2` | `#F9FAFB` | `#242426` |
| `surface-3` | `#F3F4F6` | `#2E2E30` |
| `ink` | `#1C1A17` | `#E8E6E1` |
| `ink-2` | `#5C5850` | `#A0A09A` |
| `ink-3` | `#9C9890` | `#706C65` |
| `ink-4` | `#C8C4BC` | `#484440` |
| `accent` | `#2B5E3E` | `#3D8A5A` |
| `edge` | `rgba(0,0,0,0.08)` | `rgba(255,255,255,0.08)` |
| `sidebar` | `#1C1A17` | `#0A0A0A` |

Toggle: botón Moon/Sun en el Sidebar, estado en Zustand + localStorage.

## Dev

```bash
npm install
npm run dev             # http://localhost:5173
npm run build           # Build producción
npm run generate-icons  # Regenerar iconos PNG desde public/favicon.svg
```

## Deploy

- **Frontend:** Firebase Hosting (`firebase.json`, project `appgenda-rd` en `.firebaserc`)
- **Backend:** Supabase Edge Functions (`supabase/functions/google-oauth`, `supabase/functions/caldav-proxy`)
- **URL producción:** `https://appgenda-rd.web.app` (Firebase asigna también `appgenda-rd.firebaseapp.com`)

### Pasos primer deploy

```bash
# 1) Frontend → Firebase Hosting
npm install -g firebase-tools
firebase login
firebase use --add                    # seleccioná el proyecto appgenda-rd
npm run build
firebase deploy --only hosting

# 2) Backend → Supabase Edge Functions
npm install -g supabase
supabase login
supabase link --project-ref bdtotsyunzgthycdaujg
supabase secrets set GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=...
supabase functions deploy google-oauth --no-verify-jwt
supabase functions deploy caldav-proxy --no-verify-jwt
```

### Updates

```bash
npm run build && firebase deploy --only hosting     # frontend
supabase functions deploy <name> --no-verify-jwt    # backend
```

## Estado del proyecto

- [x] Layout base (sidebar + mobile nav + routing de vistas)
- [x] ViewHoy — tareas con prioridades, filtros, drag-to-reorder
- [x] ViewProyectos — CRUD proyectos con colores
- [x] ViewSemana — eventos semanales
- [x] ViewFinanzas — obligaciones y pagos mensuales
- [x] ViewInversiones — portfolio con P&L
- [x] Persistencia dual (Supabase / localStorage)
- [x] Conectar Supabase con credenciales reales
- [x] Dark mode (toggle en sidebar, CSS variables, persistido en localStorage)
- [x] Calendario completo (mes/semana/día) tipo Google Calendar
- [x] Integración Google Calendar API (OAuth2, lectura/escritura eventos, credenciales en GCP + Supabase secrets)
- [x] Integración iCloud Calendar (CalDAV via Supabase Edge proxy + Apple ID + contraseña de app)
- [x] Sync bidireccional: crear/editar/eliminar eventos en Google Calendar e iCloud desde la app
- [x] Refresh automático de tokens Google (authorization code flow + refresh token vía Supabase Edge) — sin popups
- [x] Migración Vercel → Firebase Hosting + Supabase Edge Functions
- [x] Auth de usuario (Google Sign-In, sesión 7 días, registro abierto multi-usuario)
- [x] PWA / offline support (vite-plugin-pwa, manifest, service worker, iconos PNG)
- [x] Datos Importantes (cuentas bancarias + WhatsApp, contactos con cédula, accesos remotos AnyDesk)
- [x] Archivos adjuntos en proyectos (Supabase Storage bucket `project-files`, fallback base64 ≤1MB)
- [x] Equipos y colaboración (crear equipo, invitar miembros, roles admin/editor/viewer)
- [x] Asignación de tareas a miembros del equipo
- [x] Filtro scope (personal/equipo/todos) en todas las vistas
- [x] Enforcement rol viewer (solo lectura en todas las vistas)
- [x] Real-time sync de team_members
- [x] Asignación de grupos de tareas a persona o equipo (assignType/assignName en Proyecto, filtros Todos/Personal/Equipo)
