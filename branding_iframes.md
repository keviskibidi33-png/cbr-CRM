# Branding Iframes - CBR

Documento de referencia para mantener consistente el branding del microfrontend de CBR y su visualizacion embebida en iframe dentro del CRM.

## 1) Alcance

- Microfrontend: `cbr-CRM`
- Shell embebedor (iframe): `crm-geofal` modulo CBR
- Flujo: CRM abre `https://cbr.geofal.com.pe/cbr` en dialog modal, pasando `token` y opcionalmente `ensayo_id`

## 2) Identidad visual

- Marca visible: `Geofal` (asset: `public/geofal.svg`)
- Lenguaje visual principal: laboratorio tecnico, limpio, orientado a ensayo CBR
- Iconografia principal:
  - `Gauge` para cabecera del modulo
  - `Loader2` para estados de carga
  - `AlertCircle` para estados de error

## 3) Design tokens (fuente de verdad)

Definidos en `src/index.css` y usados via Tailwind.

| Token | Valor | Uso |
|---|---|---|
| `--background` | `0 0% 100%` | Fondo general |
| `--foreground` | `222.2 84% 4.9%` | Texto principal |
| `--card` | `0 0% 100%` | Tarjetas y paneles |
| `--primary` | `221.2 83.2% 53.3%` | CTA, foco, acentos |
| `--secondary` | `210 40% 96.1%` | Botones secundarios |
| `--muted` | `210 40% 96.1%` | Fondos suaves |
| `--muted-foreground` | `215.4 16.3% 46.9%` | Texto secundario |
| `--destructive` | `0 84.2% 60.2%` | Estado de error |
| `--border` / `--input` | `214.3 31.8% 91.4%` | Bordes de inputs y tablas |
| `--ring` | `221.2 83.2% 53.3%` | Focus ring |
| `--radius` | `0.5rem` | Border radius base |

## 4) Patrones de UI del modulo CBR

- Layout principal:
  - Formulario tecnico por secciones
  - Tablas para lecturas y resumen de humedad referencial
- Secciones:
  - Cards con `border`, `rounded-lg`, header con `bg-muted/50`
- Inputs/Selects:
  - Alto estandar `h-9`
  - Focus: `focus:ring-2 focus:ring-ring`
- CTA:
  - Primario: `Guardar y Descargar`
  - Secundario: `Guardar`
- Tabla historial (shell CRM):
  - Header: `Codigo de Muestra`, `N OT`, `Estado`, `Acciones`
  - Acciones: `Ver detalle` y `Editar`

## 5) Branding del iframe en CRM (shell)

Definido en `crm-geofal/src/components/dashboard/cbr-module.tsx`.

- Entrada visual del modulo:
  - Icono `Gauge` en fondo `bg-primary/10`
  - Titulo: `CBR ASTM D1883-21`
  - Subtitulo: `Standard Test Method for California Bearing Ratio`
- Modal iframe:
  - Tamano: `95vw x 95vh`
  - Fondo: `bg-background`
  - Boton close oculto para control por flujo
- Estado loading:
  - Overlay blanco semitransparente (`bg-white/90`)
  - Spinner primario (`Loader2`)
  - Mensaje de warm-up del servicio
- Estado error:
  - Contenedor centrado con icono rojo (`AlertCircle`)
  - CTA: `Recargar Pagina` y `Reintentar Conexion`

## 6) Seguridad de embebido

- Token inicial via query string: `?token=<jwt>`
- Renovacion por `postMessage`:
  - hijo -> padre: `TOKEN_REFRESH_REQUEST`
  - padre -> hijo: `TOKEN_REFRESH` con nuevo token
- Cierre controlado del modal:
  - hijo -> padre: `CLOSE_MODAL`
- API client:
  - agrega `Authorization: Bearer <token>` en cada request
  - ante `401`, dispara `session-expired` para mostrar modal de recarga

## 7) Reglas de consistencia

- Mantener tokens de `src/index.css` como fuente unica
- Evitar colores hardcodeados si existe token semantico
- Conservar alturas y radios (`h-9`, `rounded-md/lg`)
- Mantener textos de accion cortos y operativos
- Nuevos estados de carga/error deben seguir patron `SmartIframe`

## 8) Referencias de implementacion

- `cbr-CRM/src/App.tsx`
- `cbr-CRM/src/components/SessionGuard.tsx`
- `cbr-CRM/src/pages/CBRForm.tsx`
- `cbr-CRM/src/services/api.ts`
- `crm-geofal/src/components/dashboard/cbr-module.tsx`
