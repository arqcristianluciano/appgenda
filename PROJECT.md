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
│   │   └── EditTaskModal.tsx        — Modal de edición de tarea
│   ├── views/
│   │   ├── calendar/
│   │   │   ├── ViewCalendar.tsx     — Contenedor principal del calendario
│   │   │   ├── CalendarHeader.tsx   — Nav + switch vista (mes/semana/día)
│   │   │   ├── MonthView.tsx        — Vista mensual tipo Google Calendar
│   │   │   ├── WeekView.tsx         — Vista semanal con franja horaria
│   │   │   ├── EventModal.tsx       — Modal crear/editar evento
│   │   │   ├── CalendarSources.tsx  — Gestión calendarios (local/Google/iCloud)
│   │   │   └── IcloudAuthForm.tsx   — Form iCloud: Apple ID+CalDAV o URL webcal
│   │   ├── ViewHoy.tsx              — Tareas del día con prioridades
│   │   ├── ViewProyectos.tsx        — Gestión de proyectos
│   │   ├── ViewSemana.tsx           — (legacy) Calendario semanal simple
│   │   ├── ViewFinanzas.tsx         — Tarjetas/préstamos y pagos mensuales
│   │   ├── ViewInversiones.tsx      — Portfolio de inversiones
│   │   ├── datos/
│   │   │   ├── ViewDatos.tsx        — Contenedor con tabs (cuentas/contactos/accesos)
│   │   │   ├── CuentasBancarias.tsx — CRUD cuentas + compartir por WhatsApp
│   │   │   ├── Contactos.tsx        — CRUD contactos (cédula, tel, email)
│   │   │   └── AccesosRemotos.tsx   — CRUD AnyDesk/TeamViewer/RDP (show/hide pwd)
│   │   └── index.ts                 — Re-exports
│   ├── services/
│   │   ├── auth.ts                  — Autenticación (Google Sign-In, sesión localStorage)
│   │   ├── googleCalendar.ts        — Google Calendar API (OAuth2 + REST, silent refresh)
│   │   ├── icloudCalendar.ts        — iCloud Calendar vía ICS/webcal (read-only)
│   │   └── icloudCalDAV.ts          — iCloud CalDAV (Apple ID + contraseña de app)
├── api/
│   └── caldav-proxy.ts              — Vercel Edge Function: proxy CalDAV para iCloud
│   ├── store/
│   │   ├── useStore.ts              — Store global Zustand (datos persistidos)
│   │   └── useCalendarStore.ts      — Store UI calendario (vista, fecha, fuentes)
│   ├── lib/
│   │   ├── storage.ts               — Persistencia (Supabase o localStorage)
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

Google Cloud Console: proyecto `appgenda-rd`, Calendar API habilitada, OAuth 2.0 client `APPgenda Web` (orígenes: `http://localhost:5173`, `https://appgenda-rd.vercel.app`). Usuario de prueba: `arqcristianluciano@gmail.com`. Variable configurada en Vercel (production + preview).

## Supabase schema

Tabla requerida: `agenda_storage`

```sql
create table agenda_storage (
  key text primary key,
  value text not null,
  updated_at timestamptz default now()
);
```

## Tipos principales

| Tipo | Descripción |
|------|-------------|
| `Tarea` | Tarea con prioridad, proyecto, fecha, nota |
| `Proyecto` | Proyecto con nombre y color |
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

`hoy` | `proyectos` | `semana` | `finanzas` | `inversiones` | `datos`

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

- **URL producción:** https://appgenda-rd.vercel.app
- El nombre del proyecto en Vercel debe ser `appgenda-rd` (configurable en Project Settings → General → Project Name)

## Estado del proyecto

- [x] Layout base (sidebar + mobile nav + routing de vistas)
- [x] ViewHoy — tareas con prioridades, filtros, drag-to-reorder
- [x] ViewProyectos — CRUD proyectos con colores
- [x] ViewSemana — eventos semanales
- [x] ViewFinanzas — obligaciones y pagos mensuales
- [x] ViewInversiones — portfolio con P&L
- [x] Persistencia dual (Supabase / localStorage)
- [ ] Conectar Supabase con credenciales reales
- [x] Dark mode (toggle en sidebar, CSS variables, persistido en localStorage)
- [x] Calendario completo (mes/semana/día) tipo Google Calendar
- [x] Integración Google Calendar API (OAuth2, lectura/escritura eventos, credenciales configuradas en GCP y Vercel)
- [x] Integración iCloud Calendar (CalDAV via Vercel Edge proxy + Apple ID + contraseña de app)
- [x] Auth de usuario (Google Sign-In, sesión 7 días, solo email autorizado)
- [x] PWA / offline support (vite-plugin-pwa, manifest, service worker, iconos PNG)
- [x] Datos Importantes (cuentas bancarias + WhatsApp, contactos con cédula, accesos remotos AnyDesk)
