# Branding Iframes - Humedad

Documento de referencia para mantener consistente el branding del microfrontend de Humedad y su visualizacion embebida en iframe dentro del CRM.

## 1) Alcance

- Microfrontend: `humedad-crm`
- Shell embebedor (iframe): `crm-geofal` modulo Humedad
- Flujo: CRM abre `https://humedad.geofal.com.pe` en dialog modal, pasando `token` y opcionalmente `ensayo_id`

## 2) Identidad visual

- Marca visible: `Geofal` (asset: `public/geofal.svg`)
- Lenguaje visual principal: laboratorio tecnico, limpio, claro, con acentos azules
- Iconografia principal:
  - `Droplets` para cabecera del modulo
  - `FlaskConical` para secciones tecnicas
  - `Loader2` para estados de carga

## 3) Design tokens (fuente de verdad)

Definidos en `src/index.css` y usados via Tailwind en `tailwind.config.js`.

| Token | Valor | Uso |
|---|---|---|
| `--background` | `0 0% 100%` | Fondo general |
| `--foreground` | `222.2 84% 4.9%` | Texto principal |
| `--card` | `0 0% 100%` | Tarjetas y paneles |
| `--primary` | `221.2 83.2% 53.3%` | CTA, foco, acentos |
| `--primary-foreground` | `210 40% 98%` | Texto sobre color primario |
| `--secondary` | `210 40% 96.1%` | Botones secundarios y superficies suaves |
| `--muted` | `210 40% 96.1%` | Fondos suaves y filas alternas |
| `--muted-foreground` | `215.4 16.3% 46.9%` | Texto secundario |
| `--destructive` | `0 84.2% 60.2%` | Estado de error |
| `--border` / `--input` | `214.3 31.8% 91.4%` | Bordes de inputs y tablas |
| `--ring` | `221.2 83.2% 53.3%` | Focus ring |
| `--radius` | `0.5rem` | Border radius base |

## 4) Tipografia y tono

- Familia: `font-sans` (stack por defecto Tailwind del proyecto)
- Jerarquia:
  - Titulos: `font-bold`
  - Labels: `text-xs` o `text-sm`, `font-medium`
  - Ayuda y metadatos: `text-muted-foreground`
- Tono de copy:
  - Tecnico y directo
  - Espanol operativo de laboratorio
  - Mensajes cortos y accionables en toasts/modales

## 5) Patrones de UI del modulo Humedad

- Layout principal:
  - Grid 3 columnas en desktop
  - Formulario en `lg:col-span-2`
  - Panel de calculadora/resumen en 1 columna
- Secciones:
  - Cards con `border`, `rounded-lg`, header con `bg-muted/40`
- Inputs/Selects:
  - Alto estandar `h-9`
  - Focus: `focus:ring-2 focus:ring-ring`
  - Dropdowns con icono `ChevronDown` a la derecha
- CTA:
  - Primario: `Guardar y Descargar` (`bg-primary`)
  - Secundario: `Guardar` (`bg-secondary`)
- Tabla tecnica:
  - Encabezado en `bg-muted/40`
  - Bordes visibles para lectura de datos de ensayo
- Condiciones del Ensayo:
  - Texto a la izquierda + dropdown a la derecha (alineacion tipo formulario)
  - `Descripcion material excluido` integrada en el mismo bloque principal

## 6) Branding del iframe en CRM (shell)

Definido en `crm-geofal/src/components/dashboard/humedad-module.tsx`.

- Entrada visual del modulo:
  - Icono `Droplets` en fondo `bg-primary/10`
  - Titulo: `Contenido de Humedad`
  - Subtitulo: `ASTM D2216-19 - Reportes`
- Modal iframe:
  - Tamaño: `95vw x 95vh`
  - Fondo: `bg-background`
  - Boton close oculto para control por flujo
- Estado loading:
  - Overlay blanco semitransparente (`bg-white/90`)
  - Spinner primario grande (`Loader2`)
  - Mensaje de warm-up del servicio
- Estado error:
  - Contenedor centrado con icono rojo (`AlertCircle`)
  - CTA: `Recargar Pagina` y `Reintentar Conexion`
- Tabla historial en CRM:
  - Header: `Codigo de Muestra`, `N OT`, `Fecha`, `Estado`, `Acciones`
  - Estado visual con pill azul
  - Acciones: `Ver detalle` y `Editar`

## 7) Estados y feedback

- Toasts:
  - Guardado correcto
  - Guardado + descarga correcto
  - Errores de red o validacion con mensaje claro
- Session expiration:
  - Modal bloqueante con fondo oscuro y blur
  - CTA unica: recargar pagina
- Seguridad de embebido:
  - Token via query string inicial
  - Renovacion por `postMessage` (`TOKEN_REFRESH_REQUEST` / `TOKEN_REFRESH`)

## 8) Reglas de consistencia (no romper branding)

- Mantener los tokens HSL de `src/index.css` como fuente unica
- No usar colores hardcodeados si existe token semantico equivalente
- Conservar radios y alturas de control (`h-9`, `rounded-md/lg`)
- Mantener textos de accion cortos (`Guardar`, `Guardar y Descargar`, `Ver detalle`, `Editar`)
- Cualquier nuevo estado de carga/error debe seguir el patron del `SmartIframe`

## 9) Referencias de implementacion

- `humedad-crm/src/index.css`
- `humedad-crm/tailwind.config.js`
- `humedad-crm/src/pages/HumedadForm.tsx`
- `humedad-crm/src/components/TMCalculator.tsx`
- `humedad-crm/src/App.tsx`
- `humedad-crm/src/components/SessionGuard.tsx`
- `crm-geofal/src/components/dashboard/humedad-module.tsx`
