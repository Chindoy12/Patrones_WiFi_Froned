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
Reportes · Usuarios (solo administrador). Públicas: inicio de sesión, registro (pide correo de recuperación y celular opcional), `/recuperar` y `/restablecer`. Usuario final: **Mi Wi-Fi** (`/mi-wifi`), con su propio encabezado: prueba su conexión,
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
- **Instalar el agente:** «Instalar el agente» pide un código de 8 caracteres (15 min, un uso) y ofrece el instalador
  `WiFiSenseAgente.exe` (versión `agente` del repositorio de IA). Mientras el código está en pantalla la página
  revisa cada 10 s, así que el primer reporte aparece solo. Es la única forma de instalarlo que ofrece la página
  (nadie tiene que abrir CMD); el script de Python sigue en el repositorio de IA para Linux o desarrollo.
- **Mi cuenta:** correo de recuperación y celular (con la contraseña actual para confirmar) y cambio de contraseña;
  después del cambio la página sigue con la sesión nueva que devuelve el backend.
- **Recuperar la contraseña:** «¿Olvidaste tu contraseña?» (`/recuperar`) pide el correo; el enlace del correo abre
  `/restablecer#t=…`, que lee el token y lo quita de la barra de direcciones y del historial.
- **Agente (Mi Wi-Fi):** cuando reporta, muestra los equipos conectados como en la lista de Bluetooth (nombre,
  fabricante y, si usan dirección privada, «celular o tableta»), aviso de equipos nuevos, la auditoría de seguridad de
  la IA (puntaje, vulnerabilidades y qué hacer), el **mejor canal Wi-Fi** con la interferencia de cada canal, los
  datos del Wi-Fi y si hay anomalías. Se actualiza cada minuto.
- **Redes del equipo con sensor:** la página Redes empieza vacía. «Registrar red» crea ahí mismo la sede y la zona,
  y la fuente es siempre el **sensor** (el agente WiFiSense en un computador conectado a esa red; las fuentes
  simuladas solo aparecen si el backend corre en modo demostración). «Sensor» → «Conectar sensor» muestra un código
  de 8 caracteres y el mismo instalador de Mi Wi-Fi; el panel revisa cada 10 s y se pone verde con el primer reporte.
  La columna Sensor dice si está conectado, esperando la instalación o cuánto lleva sin reportar. En Mediciones, una
  red con sensor no tiene botón de recolectar: sus mediciones (con tráfico y protocolos) llegan solas.
- **Lo que ve el sensor:** con el sensor conectado, su panel muestra lo mismo que Mi Wi-Fi (el mismo componente
  `AgentReports`): equipos conectados con fabricante y nombre, auditoría de seguridad con sus consejos, datos del Wi-Fi,
  mejor canal y la conexión. **Dispositivos** lista los equipos de cada red con sensor; solo el administrador puede
  ponerles nombre o marcarlos como no autorizados. Nunca se muestra una MAC.
- **Historial de conexiones:** el reloj de cada equipo (en Mi Wi-Fi, en el panel del sensor y en Dispositivos) muestra
  cuándo estuvo conectado en los últimos 7 días: una franja con las 24 horas de hoy, cada periodo («2:10 p. m. → 3:05
  p. m.») y el total. Un equipo cuenta como desconectado después de faltar unos 10 minutos (dos reportes).
- **Reporte semanal** (Reportes): lunes a domingo en hora de Colombia, lo más importante en frases, los totales frente a
  la semana anterior, cada día, protocolos, equipos y seguridad. «Descargar CSV (Excel)» usa punto y coma y coma
  decimal, como lo abre Excel en español; «Imprimir o guardar PDF» imprime solo el reporte (`@media print`).
- **La sesión se renueva sola:** el token de acceso dura 15 minutos. Cuando una llamada recibe 401, `apiClient` cambia
  el refresh token por uno nuevo una sola vez (varias llamadas a la vez comparten esa renovación) y repite la llamada;
  solo si eso falla pide iniciar sesión. Cerrar sesión también revoca el refresh token en el backend. Ambos tokens
  viven solo en la pestaña (`sessionStorage`).
- **Redes de usuarios (ADMIN y ANALYST):** el panel del equipo con datos reales: usuarios, agentes conectados, redes
  en riesgo y con anomalías, y una tabla de cada red con su último reporte. Nada de sus equipos; el analista ve el
  usuario enmascarado. Un VIEWER no la ve.
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
npm test                    # 122 pruebas
npm run build               # tipos + build de producción en dist/
```

## Variables de entorno

| Variable | Uso |
|---|---|
| `VITE_API_URL` | URL pública del backend. Es la única dirección que conoce el frontend. |

## Dependencia del backend

Requiere WiFiSense-backend en ejecución y su variable `CORS_ALLOWED_ORIGINS` con el origen de este frontend.
Despliegue en Vercel: ver `DEPLOYMENT.md` en WiFiSense-backend (`vercel.json` ya resuelve las rutas del SPA).
