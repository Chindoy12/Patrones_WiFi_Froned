# Sistema de diseño de WiFiSense (Avance 19)

La página se rediseñó con una referencia de estilo "terminal de medianoche con balizas violeta": un lienzo casi
negro, una escala de grises para el texto y las líneas, y **un solo color de señal, el violeta**, racionado como las
luces de una pista. Se eligió porque encaja con lo que muestra WiFiSense: una red que se ve como señales que se
encienden en la oscuridad.

## Principios

| Principio | Cómo se aplica |
|---|---|
| Un solo color de señal | `--accent` (#af50ff) solo en los medidores, la acción principal, el resplandor de una tarjeta por página y el indicador del menú. El texto en violeta usa `--accent-ink` (lavanda), que sí es legible. |
| Superficies planas, sin sombras | Las tarjetas son un lavado translúcido con una línea fina (`--line`). Al pasar el puntero se aclara la línea; nada proyecta sombra. |
| Tipografía editorial | **Inter** (300 en cifras grandes) para todo; **JetBrains Mono** en mayúsculas y muy espaciada para las "etiquetas sello" de cada tarjeta; **Lora itálica** solo para el título grande de los dashboards (nunca menos de 32 px); **Space Grotesk** 500 para la marca «WiFiSense» y 400 para los titulares del inicio. |
| Colores de estado solo con palabras | Verde, ámbar y rosa son funcionales (bien, advertencia, mal) y siempre van con una palabra o un ícono. |
| Un resplandor por página | La tarjeta principal (Salud de la red, Calidad de tu red o el saludo de bienvenida) lleva el degradado violeta `--bloom`; las demás no. |

## Tokens (`src/styles/tokens.css`)

Todos los colores, radios y fuentes están ahí. Las demás hojas solo usan `var(--…)`; una prueba automática
(`tests/designTokens.test.ts`) falla si alguna hoja escribe un color a mano, si usa un token que no existe, si los
dos temas no definen los mismos tokens o si un color de texto baja de 4,5:1 de contraste (WCAG AA).

| Token | Oscuro (por defecto) | Claro | Uso |
|---|---|---|---|
| `--paper` | #090909 | #f5f5f7 | lienzo de la página |
| `--ink` | #f7f9fa | #090909 | texto principal (18,9:1 y 18,3:1) |
| `--muted` | #8e8f90 | #5b5c5e | texto secundario (6,2:1 y 6,2:1) |
| `--accent` | #af50ff | #7a2bd6 | medidores, indicador, resplandor |
| `--accent-ink` | #e1bdff | #6d22c4 | enlaces y texto de acento |
| `--accent-fill` | #9b3ff0 | #7a2bd6 | botón principal (texto blanco 4,8:1 y 6,7:1) |
| `--line` | blanco al 12 % | negro al 12 % | líneas finas de tarjetas y tablas |
| Radios | 19,2 px tarjetas · 8 px controles · píldora para la acción grande | | |

El tema **oscuro es el predeterminado**. El claro sigue disponible con el botón de tema y se recuerda en el
navegador (clave `wifisense.theme.v2`; la clave vieja guardaba "claro" para todos y no se lee).

## Componentes

- **Medidor circular** (`Gauge`): arco de 240° con 31 marcas alrededor que se encienden hasta el valor, como las
  barras de la señal Wi-Fi. Se usa para la calidad, la latencia, el jitter, la seguridad y, desde este avance, para
  **el porcentaje de cada protocolo en Mediciones** (antes eran barras). El estado `share` dibuja una proporción en
  violeta y sin ícono de bien o mal, porque que el tráfico sea 97 % UDP no es bueno ni malo.
- **Franja de servicios** (`StatusStrip`): una línea que atraviesa todos los servicios con un nodo circular por cada
  uno, como los saltos de un paquete. El nodo repite el estado en color; el texto lo dice.
- **Encabezado de los dashboards** (`TopBar`): etiqueta sello del área ("Equipo · Monitoreo en vivo", "Mi Wi-Fi"),
  título en Lora itálica, reloj y acciones en una franja de vidrio esmerilado.
- **El inicio** (`LandingShell` + `ParticleStage`, Avances 28 y 29): una sola pantalla, lienzo `--auth-canvas` sin
  cajas, barra con la marca, «Ya tengo cuenta» o «Ver la presentación» y el tema. La bienvenida (`Welcome`) muestra un
  capítulo a la vez con el botón «Comenzar» en píldora `--auth-cta` (late suave para invitar), cinco puntos que se
  alargan en el capítulo actual y se llenan en 6 segundos, y la pausa redonda; el login es compacto. Titular grande en Space Grotesk 400 con el degradado
  `--auth-wordmark` y espaciado negativo, texto en Inter 300 y etiquetas en mono ámbar (`--landing-label`). Detrás, una
  escena 3D de triángulos de contorno en seis colores (`--particle-1` a `--particle-6`, más oscuros en el tema claro)
  que pasa del símbolo Wi-Fi a una nube por toda la pantalla, a un router y a un planeta según la sección. La parte de
  atrás de cada forma es más tenue que la de adelante, y en el planeta el mar es más tenue que los continentes.
- **Registro y recuperación** (`AuthShell` + `WifiNetworkFlow`): lienzo `--auth-canvas` con cuadrícula de plano y un foco
  desde arriba, etiqueta en mono entre dos líneas, la marca con degradado `--auth-wordmark`, tarjeta de vidrio
  (`--auth-card`, radio 16, campos de radio 6) con el botón en píldora `--auth-cta` y el cambio de tema debajo. Detrás,
  la red Wi-Fi dibujada en capas como una red neuronal: equipos → puntos de acceso → router → Internet, con paquetes de
  subida (`--flow-up`) y de respuesta (`--flow-down`). Es interactiva: el puntero sobre un equipo muestra su ruta y un
  clic en un espacio vacío conecta un equipo nuevo al punto de acceso más cercano. En pantallas angostas o verticales
  el dibujo se vuelve una franja bajo la tarjeta. Los colores del inicio de sesión son los tokens `--auth-*` y
  `--flow-*`, definidos para los dos temas.
- **Fondo animado** (`NetworkBackdrop`): red de nodos violeta; cuando un paquete llega, el nodo responde con dos
  anillos que se expanden, como una señal. Con «reducir movimiento» queda quieto.
- **Pie de página** (`SiteFooter`): marca, la promesa de privacidad del agente (las MAC nunca salen del computador) y
  la zona horaria de los reportes semanales.
- **Redes cercanas** (`NearbyNetworksPanel`): barra con el estado del escaneo (insignia de color con su palabra) y el
  botón, tabla con la señal en cuatro barras como en un celular, «Tu conexión» con `tag--accent` y la fila resaltada
  con `--accent-soft`, «Sin contraseña» (`badge--bad`) y «Débil» (`badge--warn`) siempre con su palabra, y el aviso de
  resultado viejo en `--warn-soft`. En pantallas angostas cada fila es una tarjeta con sus etiquetas
  (`td[data-label]::before`).
- **Hechos e inferencias** (`FindingList`, `findings.css`): dos bloques separados con su título
  («Hechos medidos», «Posibles explicaciones»); las inferencias llevan el borde izquierdo punteado y una barra de
  confianza con su palabra (baja, media, alta) y su porcentaje, para que una suposición nunca se lea como una medición.
- **Capturas técnicas** (`CapturesPage`, `captures.css`): los motivos que impiden capturar en una caja `--bad-soft`,
  las herramientas con una insignia «Lista»/«No», los cuatro escenarios como tarjetas con su estado en palabras, los
  totales en una grilla de mosaicos con etiqueta sello, barras de protocolos y una línea de tiempo de barras verticales
  (`--chart-1`) con su descripción para lectores de pantalla.
- **Router y guía de funciones** (`router.css`): capacidades del router con insignia «Disponible»/«No disponible» y los
  pasos en un desplegable; la guía «¿Qué hace cada cosa?» como un desplegable con un ícono por función. La etiqueta de
  identificación de un equipo usa `badge--good` (tu nombre o confirmado), neutra (anunciado, del router, de la red) o
  `badge--warn` (estimado o desconocido).
- **Gráficas** (`MetricChart`): la serie principal con un relleno que se desvanece, cuadrícula punteada y un tooltip
  que sigue el tema.

## Hojas de estilo

`src/index.css` solo importa las hojas de `src/styles/`, una por área: base y tokens; marco (`shell`, `topbar`,
`page`, `footer`); piezas (`panels`, `buttons`, `forms`, `feedback`, `tables`, `lists`, `gauge`, `tiles`, `strip`,
`wifi-logo`); áreas (`dashboard`, `auth`, `enduser`, `connection`, `agent`, `devices`, `findings`, `identify`,
`alerts`, `modal`, `channels`, `nearby`, `router`, `captures`, `audit`, `ai`, `team`, `weekly`); y al final `motion` y `print`. Antes todo estaba en un solo
archivo de 800 líneas.

## Lo que no se tomó de la referencia

| De la referencia | Por qué no |
|---|---|
| Fuentes Whyte Inktrap y GrandSlang | Son de pago; se usan los sustitutos que la misma referencia propone (Inter, JetBrains Mono, Lora itálica) desde Google Fonts, que la CSP ya permitía. |
| Títulos sello de 74 px | En un dashboard ocuparían media pantalla; el sello se usa en 11 px para las etiquetas de cada tarjeta. |
| Pie con coordenadas GPS en vivo | Mostrar una ubicación sería un dato sensible; el pie muestra la promesa de privacidad. |
| Solo un color además del gris | Los estados (bien, advertencia, mal) necesitan color para leerse rápido; se dejaron, siempre con palabra. |
