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
| Tipografía editorial | **Inter** (300 en cifras grandes) para todo; **JetBrains Mono** en mayúsculas y muy espaciada para las "etiquetas sello" de cada tarjeta; **Lora itálica** solo para el título grande de los dashboards y del inicio de sesión (nunca menos de 32 px). |
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
- **Inicio de sesión** (`AuthShell`): tarjeta de vidrio como un "pase de acceso" con la ruta *Tu Wi-Fi → WiFiSense*
  y anillos concéntricos que suben desde el horizonte, como un Wi-Fi.
- **Fondo animado** (`NetworkBackdrop`): red de nodos violeta; cuando un paquete llega, el nodo responde con dos
  anillos que se expanden, como una señal. Con «reducir movimiento» queda quieto.
- **Pie de página** (`SiteFooter`): marca, la promesa de privacidad del agente (las MAC nunca salen del computador) y
  la zona horaria de los reportes semanales.
- **Gráficas** (`MetricChart`): la serie principal con un relleno que se desvanece, cuadrícula punteada y un tooltip
  que sigue el tema.

## Hojas de estilo

`src/index.css` solo importa las hojas de `src/styles/`, una por área: base y tokens; marco (`shell`, `topbar`,
`page`, `footer`); piezas (`panels`, `buttons`, `forms`, `feedback`, `tables`, `lists`, `gauge`, `tiles`, `strip`,
`wifi-logo`); áreas (`dashboard`, `auth`, `enduser`, `connection`, `agent`, `devices`, `findings`, `identify`,
`alerts`, `modal`, `channels`, `ai`, `team`, `weekly`); y al final `motion` y `print`. Antes todo estaba en un solo
archivo de 800 líneas.

## Lo que no se tomó de la referencia

| De la referencia | Por qué no |
|---|---|
| Fuentes Whyte Inktrap y GrandSlang | Son de pago; se usan los sustitutos que la misma referencia propone (Inter, JetBrains Mono, Lora itálica) desde Google Fonts, que la CSP ya permitía. |
| Títulos sello de 74 px | En un dashboard ocuparían media pantalla; el sello se usa en 11 px para las etiquetas de cada tarjeta. |
| Pie con coordenadas GPS en vivo | Mostrar una ubicación sería un dato sensible; el pie muestra la promesa de privacidad. |
| Solo un color además del gris | Los estados (bien, advertencia, mal) necesitan color para leerse rápido; se dejaron, siempre con palabra. |
