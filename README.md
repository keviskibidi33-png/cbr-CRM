# CBR CRM Frontend

Frontend del módulo **CBR ASTM D1883-21** para Geofal.

- Dominio productivo: `https://cbr.geofal.com.pe`
- Backend API: `https://api.geofal.com.pe` (endpoints `/api/cbr`)

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
3. Build arg/ENV:
   - `VITE_API_URL=https://api.geofal.com.pe`
   - `VITE_CRM_LOGIN_URL=https://crm.geofal.com.pe/login`
4. Exponer puerto `80`.
5. Configurar dominio personalizado:
   - `cbr.geofal.com.pe`

