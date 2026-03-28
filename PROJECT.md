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
│   │   └── EditTaskModal.tsx        — Modal de edición de tarea
│   ├── views/
│   │   ├── calendar/
│   │   │   ├── ViewCalendar.tsx     — Contenedor principal del calendario
│   │   │   ├── CalendarHeader.tsx   — Nav + switch vista (mes/semana/día)
│   │   │   ├── MonthView.tsx        — Vista mensual tipo Google Calendar
│   │   │   ├── WeekView.tsx         — Vista semanal con franja horaria
│   │   │   ├── EventModal.tsx       — Modal crear/editar evento
│   │   │   └── CalendarSources.tsx  — Gestión calendarios (local/Google/iCloud)
│   │   ├── ViewHoy.tsx              — Tareas del día con prioridades
│   │   ├── ViewProyectos.tsx        — Gestión de proyectos
│   │   ├── ViewSemana.tsx           — (legacy) Calendario semanal simple
│   │   ├── ViewFinanzas.tsx         — Tarjetas/préstamos y pagos mensuales
│   │   ├── ViewInversiones.tsx      — Portfolio de inversiones
│   │   └── index.ts                 — Re-exports
│   ├── services/
│   │   └── googleCalendar.ts        — Google Calendar API (OAuth2 + REST)
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

Para sincronizar con Google Calendar, agregar:

```
VITE_GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
```

Requiere: proyecto en Google Cloud Console con Calendar API habilitada + credenciales OAuth 2.0 (tipo Web application, origen autorizado: `http://localhost:5173`).

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
| `Obligacion` | Tarjeta o préstamo |
| `Pago` | Pago mensual de una obligación |
| `Inversion` | Activo en USD/DOP (inmobiliario/vehículos/financiero/empresas) |

## Vistas (Vista type)

`hoy` | `proyectos` | `semana` | `finanzas` | `inversiones`

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
- [x] Integración Google Calendar API (OAuth2, lectura/escritura eventos)
- [ ] Integración iCloud Calendar (requiere proxy CalDAV server-side)
- [ ] Auth de usuario
- [x] PWA / offline support (vite-plugin-pwa, manifest, service worker, iconos PNG)
