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
src/components/             layout, AuthShell (login y registro), WifiLogo animado, gráficos, estados de carga y
                            ErrorBoundary (una página que falla muestra un mensaje en vez de dejar la pantalla en blanco)
src/pages/                  una página por sección
src/pages/miwifi/           Mi Wi-Fi en pantallas (Avance 27): el marco con el menú y una pantalla por cada cosa
src/components/landing/     el inicio (Avance 28): la escena 3D de partículas (WebGL) y la historia al desplazarse
src/auth/credentials.ts     límites de usuario (40, nombre o correo) y contraseña (10–12) y reglas de contraseña
tests/                      pruebas de apiClient, reglas de arquitectura y seguridad, y componentes
.github/workflows/pagina.yml  tipos, pruebas, build y npm audit en cada Pull Request
.github/dependabot.yml      actualizaciones mensuales de npm y de las acciones
src/styles/                 una hoja de estilos por área; tokens.css tiene todos los colores, radios y fuentes
docs/patrones.md            patrones de la página: Error Boundary, Provider, componentes guardia, Custom Hook y Single-flight
docs/diseno.md              sistema de diseño: tokens, tipografía, componentes y lo que no se tomó de la referencia
```

## Secciones

Equipo: Panel · Redes · Dispositivos · Mediciones · Historial · Análisis · Anomalías · Modelo de IA · Alertas ·
Reportes · Usuarios, Capturas técnicas y Auditoría (solo administrador). Públicas: inicio de sesión, registro (pide correo de recuperación y celular opcional), `/recuperar` y `/restablecer`. Usuario final: **Mi Wi-Fi**, con su propio encabezado y un menú con una pantalla por cada cosa
(Avance 27): **Resumen** (`/mi-wifi`), **Conexión**, **Equipos**, **Seguridad**, **Avisos**, **Redes cercanas** y
**Ajustes** (`/mi-wifi/conexion`, `/equipos`, `/seguridad`, `/avisos`, `/redes-cercanas`, `/ajustes`). Nunca ve el
menú ni las rutas del equipo.

## Dashboards

Los dos paneles comparten el mismo diseño: encabezado con el título en itálica, hora y fecha, **medidor en arco** de
la calidad (0 a 100, calificada por reglas del servicio de análisis) con marcas que se encienden como la señal Wi-Fi,
medidores pequeños de latencia y jitter, tarjetas de cifras y una franja inferior con el estado de cada servicio
dibujada como una ruta con un nodo por servicio. El color del medidor indica el estado y siempre va acompañado de la
palabra (Buena, Regular, Mala) y un ícono, así que no depende solo del color. En **Mediciones**, el porcentaje de cada
protocolo (UDP, TCP, ICMP…) se muestra con los mismos medidores circulares, de mayor a menor.

- **Equipo (Panel):** salud de la red elegida según su última medición, redes por estado, actividad (alertas,
  anomalías, latencia media, dispositivos) y estado de la IA, la base de datos y el monitoreo.
- **Mi Wi-Fi:** botón **Probar mi conexión** (`services/speedTest.ts`): 10 pings para latencia y jitter, y para bajada y
  subida una prueba corta más una mayor que dura unos 2 segundos (máximo 8 MB cada una). El resultado se guarda y la
  IA lo califica: calidad, para qué alcanza (videollamadas, video HD/4K, juegos) y consejos. Mide la conexión hasta
  el servidor de WiFiSense, no solo el Wi-Fi; la señal o el canal requieren el agente.
- **En vivo** (`LivePanel`, Avance 26; en Mi Wi-Fi y en el panel del sensor): con **«Ver en vivo»**, cada 2 segundos lo
  que el computador del agente baja y sube en ese momento, la latencia hasta el router y hasta internet y la señal, con
  dos gráficas de los últimos 5 minutos y qué significa el último minuto (por ejemplo, si la demora empieza antes o
  después del router). Es el uso de ese momento, no la capacidad (eso lo mide «Probar mi conexión»), y no gasta datos
  de prueba. Mientras está abierto pregunta cada 2 s; con la pestaña oculta no pregunta y a los 10 minutos se pausa
  sola, así el agente deja de medir cuando nadie mira. Necesita el agente 2.1.0.
- **Instalar el agente:** «Instalar el agente» pide un código de 8 caracteres (15 min, un uso) y ofrece el instalador
  `WiFiSenseAgente.exe` (versión `agente` del repositorio de IA). Mientras el código está en pantalla la página
  revisa cada 10 s, así que el primer reporte aparece solo. Es la única forma de instalarlo que ofrece la página
  (nadie tiene que abrir CMD); el script de Python sigue en el repositorio de IA para Linux o desarrollo.
- **Mi cuenta:** correo de recuperación y celular (con la contraseña actual para confirmar) y cambio de contraseña;
  después del cambio la página sigue con la sesión nueva que devuelve el backend.
- **Recuperar la contraseña:** «¿Olvidaste tu contraseña?» (`/recuperar`) pide el correo; el enlace del correo abre
  `/restablecer#t=…`, que lee el token y lo quita de la barra de direcciones y del historial.
- **Mi Wi-Fi en pantallas** (`src/pages/miwifi`, Avance 27): antes todo estaba en una sola página larga (la prueba, En
  vivo, el agente, los equipos, la seguridad, los avisos, las redes cercanas, el router, las redes y la cuenta). Ahora
  el marco (`MiWifiLayout`) tiene el saludo, la red elegida y un menú; cada cosa tiene su pantalla y su dirección, así
  que el botón Atrás y un enlace funcionan. **Resumen** muestra una tarjeta por pantalla con lo más importante (la
  calidad, cuántos equipos hay de cada tipo, el puntaje de seguridad, los avisos) y al tocarla lleva a esa pantalla.
  **Conexión**: «Probar mi conexión», En vivo y qué dice la IA. **Seguridad**: puntaje, vulnerabilidades y qué hacer,
  datos del Wi-Fi, mejor canal y el router. **Avisos**: cada aviso una sola vez con cuántas veces pasó («×6») y los
  avisos por correo. **Ajustes**: las redes (hasta 3), el agente (instalarlo, su estado y desconectarlo) y la cuenta.
  El aviso de un equipo nuevo o no autorizado aparece arriba en todas las pantallas. Los datos del agente se cargan
  una vez para todas las pantallas (`MiWifiContext`) y se actualizan cada minuto. En el celular el menú muestra todas
  las secciones en una cuadrícula.
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
- **Reconocer cada equipo:** desde el agente 1.7.0 cada equipo llega con su tipo (celular, computador, TV, impresora,
  cámara, parlante, consola o dispositivo inteligente), el modelo que anuncia y dos marcas: «Este computador (agente)»
  y «Router». Un equipo sin nombre se llama por su tipo («Celular o tableta 2», «TV o Chromecast 1»).
- **Equipos por categoría** (`DeviceCatalog`, Avance 27; en Mi Wi-Fi, el panel del sensor y Dispositivos): primero una
  tarjeta por tipo (**Computadores**, **Celulares y tabletas**, **TV y entretenimiento**, **Casa inteligente e
  impresoras**, **Router y otros equipos**) con cuántos hay, cuántos están conectados, cuántos no tienen nombre y los
  nuevos o no autorizados. Al tocar una tarjeta se abre esa categoría en su propia pantalla (`?tipo=celulares`, así
  Atrás vuelve a las tarjetas) con «Todos» y «Sin nombre», búsqueda por nombre o marca (desde 8 equipos) y los equipos
  en tres grupos: **Conectados ahora**, **Vistos en los últimos 7 días** y **Vistos antes**, este último plegado. Se
  muestran 30 a la vez con «Mostrar más», así una red de 700 equipos nunca se dibuja de una vez. La categoría sigue
  el ícono de cada equipo (`deviceCategories.ts`). Dice cuántos no dicen su nombre y por qué, y cada uno tiene
  «Ponerle nombre». El número de «Celular o tableta 3» no cambia al filtrar. Desde el agente 1.8.0 también llegan los nombres
  que los equipos dicen al pedir dirección por DHCP.
- **¿Cuál es este equipo?** (`IdentifyWizard`, en Mi Wi-Fi, el panel del sensor y Dispositivos; en el equipo solo
  ADMIN): el agente reporta cada minuto durante 10 minutos; el usuario apaga el Wi-Fi del equipo, la página ve cuál
  desapareció, lo vuelve a encender, se confirma que volvió y le pone nombre. Si desaparecen varios a la vez, el que
  vuelve primero es el suyo.
- **Historial de conexiones:** el reloj de cada equipo (en Mi Wi-Fi, en el panel del sensor y en Dispositivos) muestra
  cuándo estuvo conectado en los últimos 7 días: una franja con las 24 horas de hoy, cada periodo («2:10 p. m. → 3:05
  p. m.») y el total. Un equipo cuenta como desconectado después de faltar unos 10 minutos (dos reportes).
- **Redes cercanas** (`NearbyNetworksPanel`, Mi Wi-Fi): las redes Wi-Fi que alcanza a ver la antena del computador
  del agente, con señal (barras y %), canal, banda, seguridad anunciada y cuántas veces se ha visto cada punto de
  acceso. «Escanear ahora» pide un escaneo al agente y la página lo sigue cada 4 segundos (esperando al agente →
  escaneando → completado o falló con el motivo que dio el agente, por ejemplo el permiso de ubicación de Windows);
  además hay un escaneo programado cada hora. Filtros por nombre o marca, por señal y por seguridad; aviso cuando el
  resultado tiene más de 2,5 horas; historial de escaneos. El botón dice por qué no se puede (sin agente, agente
  apagado, escaneo en curso o unos segundos después del anterior). Lo que el sistema no reportó se muestra «—», nunca
  se inventa, y la página explica que ver una red no la hace tuya ni es la medición de tu conexión. En el celular
  cada red es una tarjeta. Los filtros y etiquetas están en `src/nearby.ts`. **«Analizar con IA»** (solo cuando la
  persona lo pide) muestra la lectura del último escaneo: hechos medidos en un bloque y posibles explicaciones con su
  confianza en otro, más la incertidumbre (`NearbyAnalysisSection`).
- **Tu router** (`RouterPanel`, en Mi Wi-Fi y en Dispositivos del equipo): fabricante y modelo que vio el agente y, sin
  rodeos, lo que WiFiSense no puede hacer (lista oficial de clientes, bloquear, cambiar la contraseña), con los pasos
  para hacerlo en el router. Ningún botón finge administrar el router.
- **De dónde sale cada nombre** (`IdentityTag` en la lista de equipos): «Tu nombre», «Confirmado» (el equipo y el
  router coinciden), «Anunciado», «Del router», «De la red», «Estimado» (solo fabricante o tipo) o «Desconocido»
  (`src/identification.ts`). Una estimación nunca se ve como el nombre.
- **Capturas técnicas** (`CapturesPage`, solo administrador; el backend se lo niega a todos los demás y lo audita):
  primero dice si se puede capturar y cada motivo que lo impide, qué herramienta tiene el sensor y los cuatro escenarios
  de lo que una captura puede ver (A el computador del sensor, B puerto espejo, C modo monitor, D router). El formulario
  pide el propósito autorizado, la duración y los paquetes dentro de los límites del servidor, y una confirmación. La
  página sigue la captura cada 3 segundos y permite detenerla. El resultado: totales, protocolos, servicios, paquetes
  por segundo, la pérdida de la herramienta dicha como pérdida de la captura (no de la red), hechos medidos y posibles
  explicaciones con su confianza, en bloques separados, y qué no incluye la captura. Lo desconocido se ve «—».
- **Auditoría** (`AuditPage`, solo administrador): quién hizo cada operación sensible, cuándo, sobre qué y con qué
  resultado (incluidos los intentos sin permiso), con filtros y páginas; y cuánto tiempo se guarda cada cosa.
- **¿Qué hace cada cosa?** (`FunctionGuide`): diferencia el escaneo de redes cercanas, la medición de la conexión, los
  equipos de la red, la captura técnica y la administración del router.
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
- **Diseño (Avance 19):** lienzo casi negro con un solo color de señal, el violeta; tarjetas planas de línea fina,
  sin sombras; Inter, JetBrains Mono para las etiquetas sello y Lora itálica para los títulos grandes. Fondo animado
  (`NetworkBackdrop`): ondas y una red de nodos con paquetes que, al llegar, se expanden en anillos como una señal
  Wi-Fi. Con «reducir movimiento» queda quieto. Detalle en [docs/diseno.md](docs/diseno.md).
- **Carga por áreas:** cada página se descarga al entrar (`React.lazy`); un usuario final no descarga las páginas del
  equipo ni la librería de gráficas.
- **Modo oscuro y claro:** oscuro por defecto; el botón de tema cambia todos los colores (tokens en
  `src/styles/tokens.css`) y la elección se recuerda en el navegador. El tema nuevo entra como una **ola suave** que
  sale del botón (view transitions con un borde difuminado), en vez de poner toda la pantalla blanca o negra de golpe;
  los navegadores sin view transitions funden los colores y con «reducir movimiento» el cambio es inmediato.
Las acciones se muestran según el rol (Observador consulta; Analista recolecta, analiza y gestiona alertas;
Administrador además registra redes).

## Inteligencia artificial (equipo)

- **Análisis** y **Anomalías** muestran la **causa probable** que diagnostica la IA (congestión, interferencia,
  cobertura débil, falla del proveedor, tráfico sospechoso); Anomalías resume además las causas de los últimos 30 días.
- **Modelo de IA** (`/ai-model`) muestra el modelo en producción y su evaluación: comparación de Isolation Forest con
  Local Outlier Factor y One-Class SVM (precisión, recall, F1, falsas alarmas, ROC-AUC y tiempo), detección por tipo
  de falla, ajuste de hiperparámetros, sensibilidad del umbral y acierto del diagnóstico. Todo llega por el backend
  (`GET /api/ai/model`); el navegador nunca llama al servicio de IA.
- **Entrenamiento con datos reales** (en Modelo de IA): cuántas mediciones reales hay, «Entrenar ahora» (ADMIN; desde
  300 mediciones), la fecha del entrenamiento automático semanal y el historial de versiones con F1 y falsas alarmas
  del modelo nuevo frente al anterior, la decisión (aprobado o rechazado) y por qué. La versión en uso dice si se
  entrenó con datos reales o sintéticos.

## Inicio de sesión y cuentas

- **El inicio** (`/login`, Avance 28) es una página que se recorre: el login sigue en la primera pantalla y detrás hay
  una **escena 3D** de miles de triángulos de colores (`ParticleStage`, WebGL propio, sin librerías). Primero forman el
  **símbolo Wi-Fi**; al bajar se **desintegran por toda la pantalla** mientras el texto cuenta cómo se ve hoy una red
  (invisible y regada), se vuelven a juntar en un **router** cuando se explica el agente y la IA, y terminan en un
  **planeta** con una órbita y enlaces entre lugares: «todo se conecta». Cada sección marca su forma con
  `data-stage` y cada punto sale en su propio momento, así la forma se deshace y se rehace como algo vivo. En celular la
  escena queda centrada y tenue detrás del texto; sin WebGL no se dibuja y la página se lee igual; con «reducir
  movimiento» la forma cambia sin volar; se pausa con la pestaña oculta. Los colores son los tokens `--particle-*`.
  Registro y recuperación siguen con el diseño de abajo.
- **Registro y recuperación** (y antes el login) comparten el mismo diseño: lienzo de medianoche con cuadrícula de plano, la marca
  «WiFiSense» iluminada (Space Grotesk), una tarjeta de vidrio con el botón principal en forma de píldora y, detrás, un
  dibujo vivo de **cómo funciona una red Wi-Fi**, en capas como una red neuronal: equipos → puntos de acceso → router →
  Internet (`WifiNetworkFlow`). Los paquetes suben en violeta y la respuesta vuelve en azul; el punto de acceso ondea
  cuando pasa un paquete. Al pasar el puntero (o tocar) un equipo se ilumina su ruta; al hacer clic en un espacio vacío
  se conecta un equipo nuevo: primero se asocia al punto de acceso más cercano (línea punteada) y luego pide su
  dirección (DHCP). En celular el dibujo pasa a una franja bajo la tarjeta para no tapar el formulario. Es solo
  decoración: oculto para lectores de pantalla, en pausa con la pestaña oculta y quieto con «reducir movimiento».
  El logo Wi-Fi de la tarjeta se enciende arco por arco mientras se envía el formulario.
- **Registro público** en `/registro` para usuarios finales: requisitos de la contraseña en vivo y confirmación. El
  rol siempre lo asigna el backend (`USER`); el formulario nunca lo envía.
- **Equipo:** el administrador crea hasta 3 cuentas en **Usuarios**, con los mismos requisitos de contraseña.
- Usuario (nombre o correo) limitado a 40 caracteres y contraseña a 12: pegar textos enormes no tiene efecto.
- Botón con ícono de ojo para mostrar u ocultar la contraseña.
- **La contraseña nunca sale legible del navegador.** Antes de enviarla, `services/passwordCipher.ts` pide al backend
  un reto de un solo uso y la cifra con Web Crypto (RSA-OAEP, SHA-256). En F12 → Red solo se ve
  `{username, challengeId, encryptedPassword}`; aplica a login, registro y creación de cuentas del equipo.
- Cualquier error de login muestra solo `Datos incorrectos.`
- `vercel.json` agrega cabeceras de seguridad: CSP (solo scripts propios, nada en línea ni de otros sitios), no
  embeber en iframes, `nosniff`, sin referer, HSTS, `Cross-Origin-Opener-Policy` y sin cámara, micrófono, ubicación,
  pagos ni USB. `tests/security.test.ts` falla si alguna desaparece, si la página habla directo con la IA o la base,
  si aparece un secreto o si el token se guarda en `localStorage` (vive solo en la pestaña).
- **Contrato con la IA** (`tests/contract.test.ts`): la página muestra la auditoría de seguridad, la calidad y el mejor
  canal tal como los responde la IA; la prueba usa los mismos ejemplos JSON que el backend y la IA y falla si cambia un
  campo que la página lee.
- **Build de Vercel sin URL del backend:** si falta `VITE_API_URL`, el build de Vercel se detiene con un mensaje claro
  en vez de publicar una página que llama a `localhost` (`vite.config.ts`, `tests/buildConfig.test.ts`).
- **Lo que se sabe y lo que se supone:** el tipo de cada equipo se muestra como «Parece…» (es una suposición del agente)
  y la página Modelo de IA explica qué resultados son aprendizaje automático y cuáles son reglas.
- **GitHub Actions** (`.github/workflows/pagina.yml`) en cada Pull Request: tipos, las pruebas, el build de producción
  y `npm audit` de lo que llega al navegador (0 vulnerabilidades conocidas el 19/10/2026).

## Instalación y ejecución

```bash
npm install
cp .env.example .env        # VITE_API_URL=http://localhost:8080
npm run dev                 # http://localhost:5173
npm test                    # 288 pruebas
npm run build               # tipos + build de producción en dist/
```

## Variables de entorno

| Variable | Uso |
|---|---|
| `VITE_API_URL` | URL pública del backend. Es la única dirección que conoce el frontend. |

## Dependencia del backend

Requiere WiFiSense-backend en ejecución y su variable `CORS_ALLOWED_ORIGINS` con el origen de este frontend.
Despliegue en Vercel: ver `DEPLOYMENT.md` en WiFiSense-backend (`vercel.json` ya resuelve las rutas del SPA).
