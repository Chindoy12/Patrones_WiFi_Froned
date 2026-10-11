# WiFiSense-frontend

Interfaz web de WiFiSense en React + TypeScript. Muestra el estado de las redes, mediciones, historial, análisis,
anomalías, alertas y reportes. Tiene dos áreas: la del **equipo** (Administrador, Analista y Observador, máximo 3
cuentas creadas por el administrador) y la de los **usuarios finales**, que se registran solos y solo ven su propia
conexión.

**Solo se comunica con el backend.** No contiene SQL, credenciales, claves de IA ni direcciones internas; una
prueba automática (`tests/security.test.ts`) falla si aparece una referencia directa a la IA o a la base de datos.

## Tecnologías

React 19 · TypeScript · Vite · React Router · Recharts · Vitest + Testing Library. Node/npm se usan solo como
herramientas de desarrollo y build; no hay servidor Node en producción.

## Estructura

```text
src/services/apiClient.ts   único punto de salida HTTP: URL base, token JWT, errores
src/services/api.ts         funciones por endpoint del backend
src/auth/AuthContext.tsx    sesión, inicio de sesión y registro
src/auth/guards.tsx         rutas por rol: el equipo va al panel y los usuarios finales a /mi-wifi
src/hooks/                  carga de datos y selección de red
src/components/             layout, AuthShell (login y registro), WifiLogo animado, gráficos, estados de carga
src/pages/                  una página por sección
src/auth/credentials.ts     límites de usuario (40, nombre o correo) y contraseña (10–12) y reglas de contraseña
tests/                      pruebas de apiClient, reglas de arquitectura y componentes
```

## Secciones

Equipo: Panel · Redes · Dispositivos · Mediciones · Historial · Análisis · Anomalías · Alertas · Reportes · Usuarios
(solo administrador). Usuario final: **Mi Wi-Fi** (`/mi-wifi`).
Las acciones se muestran según el rol (Observador consulta; Analista recolecta, analiza y gestiona alertas;
Administrador además registra redes).

## Inicio de sesión y cuentas

- **Login y registro** comparten el mismo diseño: fondo con destellos de luz animados, tarjeta de vidrio esmerilado y
  el logo Wi-Fi que se enciende de abajo hacia arriba, arco por arco, como si estuviera cargando (más rápido mientras
  se envía el formulario). Con «reducir movimiento» activado en el sistema, las animaciones se detienen.
- **Registro público** en `/registro` para usuarios finales: requisitos de la contraseña en vivo y confirmación. El
  rol siempre lo asigna el backend (`USER`); el formulario nunca lo envía.
- **Equipo:** el administrador crea hasta 3 cuentas en **Usuarios**, con los mismos requisitos de contraseña.
- Usuario (nombre o correo) limitado a 40 caracteres y contraseña a 12: pegar textos enormes no tiene efecto.
- Botón con ícono de ojo para mostrar u ocultar la contraseña.
- Cualquier error de login muestra solo `Datos incorrectos.`
- `vercel.json` agrega cabeceras de seguridad (CSP, no embeber en iframes, sin referer).

## Instalación y ejecución

```bash
npm install
cp .env.example .env        # VITE_API_URL=http://localhost:8080
npm run dev                 # http://localhost:5173
npm test                    # 34 pruebas
npm run build               # tipos + build de producción en dist/
```

## Variables de entorno

| Variable | Uso |
|---|---|
| `VITE_API_URL` | URL pública del backend. Es la única dirección que conoce el frontend. |

## Dependencia del backend

Requiere WiFiSense-backend en ejecución y su variable `CORS_ALLOWED_ORIGINS` con el origen de este frontend.
Despliegue en Vercel: ver `DEPLOYMENT.md` en WiFiSense-backend (`vercel.json` ya resuelve las rutas del SPA).
