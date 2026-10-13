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

Equipo: Panel · Redes · Dispositivos · Mediciones · Historial · Análisis · Anomalías · Modelo de IA · Alertas ·
Reportes · Usuarios (solo administrador). Usuario final: **Mi Wi-Fi** (`/mi-wifi`), con su propio encabezado: prueba su conexión,
ve la calidad de cada red y registra, edita y elimina sus redes (hasta 3). Nunca ve el menú ni las rutas del equipo.

## Dashboards

Los dos paneles comparten el mismo diseño: barra con hora y fecha, **medidor en arco** de la calidad (0 a 100,
calificada por la IA), medidores pequeños de latencia y jitter, tarjetas de cifras y una franja inferior con el estado
de cada servicio. El color del medidor indica el estado y siempre va acompañado de la palabra (Buena, Regular,
Mala) y un ícono, así que no depende solo del color.

- **Equipo (Panel):** salud de la red elegida según su última medición, redes por estado, actividad (alertas,
  anomalías, latencia media, dispositivos) y estado de la IA, la base de datos y el monitoreo.
- **Mi Wi-Fi:** botón **Probar mi conexión** (`services/speedTest.ts`): 10 pings para latencia y jitter, y para bajada y
  subida una prueba corta más una mayor que dura unos 2 segundos (máximo 8 MB cada una). El resultado se guarda y la
  IA lo califica: calidad, para qué alcanza (videollamadas, video HD/4K, juegos) y consejos. Mide la conexión hasta
  el servidor de WiFiSense, no solo el Wi-Fi; la señal o el canal requieren el agente.
- **Agente (Mi Wi-Fi):** crea la clave del agente (se muestra una sola vez), descarga `public/downloads/wifisense_agent.py`
  y, cuando reporta, muestra cuántos equipos hay conectados, aviso de equipos nuevos, la auditoría de seguridad de la
  IA (puntaje, vulnerabilidades y qué hacer), los datos del Wi-Fi y si hay anomalías. Se actualiza cada minuto.
- **Diseño:** fondo azul cielo con tarjetas de vidrio blanco y un fondo animado (`NetworkBackdrop`): ondas y una red
  de nodos con paquetes que viajan entre ellos y se acercan al puntero. Con «reducir movimiento» queda quieto.
- **Carga por áreas:** cada página se descarga al entrar (`React.lazy`); un usuario final no descarga las páginas del
  equipo ni la librería de gráficas.
- **Modo claro y oscuro:** claro por defecto; el botón Modo oscuro cambia todos los colores (tokens en `index.css`)
  y se recuerda en el navegador.
Las acciones se muestran según el rol (Observador consulta; Analista recolecta, analiza y gestiona alertas;
Administrador además registra redes).

## Inteligencia artificial (equipo)

- **Análisis** y **Anomalías** muestran la **causa probable** que diagnostica la IA (congestión, interferencia,
  cobertura débil, falla del proveedor, tráfico sospechoso); Anomalías resume además las causas de los últimos 30 días.
- **Modelo de IA** (`/ai-model`) muestra el modelo en producción y su evaluación: comparación de Isolation Forest con
  Local Outlier Factor y One-Class SVM (precisión, recall, F1, falsas alarmas, ROC-AUC y tiempo), detección por tipo
  de falla, ajuste de hiperparámetros, sensibilidad del umbral y acierto del diagnóstico. Todo llega por el backend
  (`GET /api/ai/model`); el navegador nunca llama al servicio de IA.

## Inicio de sesión y cuentas

- **Login y registro** comparten el mismo diseño: fondo con destellos de luz animados, tarjeta de vidrio esmerilado y
  el logo Wi-Fi que se enciende de abajo hacia arriba, arco por arco, como si estuviera cargando (más rápido mientras
  se envía el formulario). Con «reducir movimiento» activado en el sistema, las animaciones se detienen.
- **Registro público** en `/registro` para usuarios finales: requisitos de la contraseña en vivo y confirmación. El
  rol siempre lo asigna el backend (`USER`); el formulario nunca lo envía.
- **Equipo:** el administrador crea hasta 3 cuentas en **Usuarios**, con los mismos requisitos de contraseña.
- Usuario (nombre o correo) limitado a 40 caracteres y contraseña a 12: pegar textos enormes no tiene efecto.
- Botón con ícono de ojo para mostrar u ocultar la contraseña.
- **La contraseña nunca sale legible del navegador.** Antes de enviarla, `services/passwordCipher.ts` pide al backend
  un reto de un solo uso y la cifra con Web Crypto (RSA-OAEP, SHA-256). En F12 → Red solo se ve
  `{username, challengeId, encryptedPassword}`; aplica a login, registro y creación de cuentas del equipo.
- Cualquier error de login muestra solo `Datos incorrectos.`
- `vercel.json` agrega cabeceras de seguridad (CSP, no embeber en iframes, sin referer).

## Instalación y ejecución

```bash
npm install
cp .env.example .env        # VITE_API_URL=http://localhost:8080
npm run dev                 # http://localhost:5173
npm test                    # 74 pruebas
npm run build               # tipos + build de producción en dist/
```

## Variables de entorno

| Variable | Uso |
|---|---|
| `VITE_API_URL` | URL pública del backend. Es la única dirección que conoce el frontend. |

## Dependencia del backend

Requiere WiFiSense-backend en ejecución y su variable `CORS_ALLOWED_ORIGINS` con el origen de este frontend.
Despliegue en Vercel: ver `DEPLOYMENT.md` en WiFiSense-backend (`vercel.json` ya resuelve las rutas del SPA).
