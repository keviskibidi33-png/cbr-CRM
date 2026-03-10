# CBR CRM Frontend

Microfrontend del módulo **CBR ASTM D1883-21** para Geofal.

- Dominio productivo: `https://cbr.geofal.com.pe`
- Backend API: `https://api.geofal.com.pe` (rutas `/api/cbr`)
- Integración shell: `crm-geofal` vía iframe modal (`CBRModule`)

## Objetivo del módulo

- Registrar/editar ensayos CBR.
- Guardar estado en BD (`EN PROCESO`/`COMPLETO`).
- Exportar Excel con plantilla oficial.
- Devolver control al CRM con `postMessage` al finalizar.

## Stack técnico

- Vite + React + TypeScript
- Tailwind CSS
- Axios
- Sonner/React Hot Toast

## Arquitectura funcional (resumen)

### 1) Control de acceso (`src/App.tsx`)

- Lee `token` desde query string (`?token=...`) y lo persiste en `localStorage`.
- Si no hay token y no está embebido, bloquea acceso y redirige a login CRM.

### 2) Guard de sesión (`src/components/SessionGuard.tsx`)

- Escucha `session-expired` disparado por la capa API.
- Solicita renovación al padre con `TOKEN_REFRESH_REQUEST` cada 60 min.
- Recibe `TOKEN_REFRESH` y actualiza el token local.

### 3) Capa API (`src/services/api.ts`)

- Inyecta `Authorization: Bearer <token>` en cada request.
- Si recibe `401`, emite `session-expired`.
- Soporta flujo guardar vs guardar+descargar:
  - `POST /api/cbr/excel?download=false`
  - `POST /api/cbr/excel?download=true`
- Soporta edición con `ensayo_id`.

### 4) Formulario CBR (`src/pages/CBRForm.tsx`)

- Si URL contiene `ensayo_id`, carga detalle para edición.
- Al finalizar guardado/descarga envía:
  - `window.parent.postMessage({ type: 'CLOSE_MODAL' }, '*')`

## Contrato iframe <-> CRM

### Query params de entrada

- `token`: JWT inicial (obligatorio para uso embebido).
- `ensayo_id`: ID opcional para abrir en modo edición.

### Eventos `postMessage`

- Hijo -> Padre:
  - `TOKEN_REFRESH_REQUEST`
  - `CLOSE_MODAL`
- Padre -> Hijo:
  - `TOKEN_REFRESH` (payload: `{ token }`)

## Endpoints backend usados

- `GET /api/cbr` -> listado para historial CRM.
- `GET /api/cbr/{id}` -> detalle para edición.
- `POST /api/cbr/excel` -> guardado/export.

Headers relevantes en descarga:

- `Content-Disposition`
- `X-CBR-Id`
- `X-Storage-Object-Key` (si aplica)

## Desarrollo local

```bash
npm install
npm run dev
```

Variables mínimas:

- `VITE_API_URL=https://api.geofal.com.pe`
- `VITE_CRM_LOGIN_URL=https://crm.geofal.com.pe/login`

## Deploy en Coolify

1. Crear servicio desde este repositorio (`cbr-CRM`).
2. Build type: `Dockerfile`.
3. Variables:
   - `VITE_API_URL=https://api.geofal.com.pe`
   - `VITE_CRM_LOGIN_URL=https://crm.geofal.com.pe/login`
4. Exponer puerto `80`.
5. Dominio:
   - `cbr.geofal.com.pe`

## Guía de réplica para nuevo módulo iframe

1. Crear `Module.tsx` en `crm-geofal` con patrón:
   - tabla historial
   - modal `<iframe>`
   - puente `TOKEN_REFRESH_REQUEST` / `TOKEN_REFRESH`
   - `CLOSE_MODAL` para cierre y refresco.
2. Crear `AccessGate` + `SessionGuard` en microfrontend.
3. Estandarizar API con:
   - `GET /api/<modulo>`
   - `GET /api/<modulo>/{id}`
   - `POST /api/<modulo>/excel?download=...&ensayo_id=...`
4. Exponer headers de descarga necesarios en CORS backend.
