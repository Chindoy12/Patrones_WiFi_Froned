# Patrones de diseño en la página (React + TypeScript)

Los patrones principales del proyecto están en el backend (`WiFiSense-backend/PATTERNS.md`). Estos son los de la
página: patrones de React y de manejo de peticiones, cada uno con el problema que resuelve y la prueba que lo
demuestra.

| Patrón | Dónde | Problema que resuelve | Prueba |
|---|---|---|---|
| **Error Boundary** | `src/components/ErrorBoundary.tsx`, usado en `App.tsx` y `Layout.tsx` | Un error al dibujar una página dejaba toda la pantalla en blanco | `errorBoundary.test.tsx` |
| **Provider (Context)** | `src/auth/AuthContext.tsx` | La sesión (usuario, rol, iniciar y cerrar sesión) la necesitan muchas pantallas: se comparte sin pasarla por props | `register.test.tsx`, `components.test.tsx` |
| **Componentes guardia** | `src/auth/guards.tsx` (`RequireAuth`, `RequireStaff`, `RequireEndUser`, `RequireAnalyst`, `RequireAdmin`) | Cada ruta declara quién puede entrar envolviendo la página; la regla no se repite dentro de cada pantalla | `guards.test.tsx` |
| **Custom Hook** | `src/hooks/useApi.ts`, `useNow.ts`, `useOnline.ts`, `useNetworkSelection.ts` | Cargar datos (cargando, error, recargar), el reloj y la conexión se escriben una vez y los usan todas las páginas | `components.test.tsx`, pruebas de cada página |
| **Single-flight** | `src/services/apiClient.ts`: `renewSession()` | Si varias peticiones encuentran el token vencido a la vez, la sesión se renueva **una sola vez** (el refresh token sirve una vez: dos renovaciones cerrarían la sesión) | `apiClient.test.ts` ("renews an expired token…") |
| **Lazy loading por área** | `src/App.tsx` (`React.lazy`) | Un usuario final nunca descarga las páginas del equipo ni la librería de gráficas | `npm run build` (un archivo por página) |

## Error Boundary

**Problema.** En React, un error mientras se dibuja un componente (por ejemplo, un dato que llega con una forma
inesperada) desmonta toda la aplicación: la pantalla queda en blanco, sin menú y sin forma de seguir. Hay un caso
que pasa de verdad en producción: Vercel publica una versión nueva mientras alguien tiene la página abierta y la
página vieja pide el código de una sección que ya no existe ("Failed to fetch dynamically imported module").

**Solución.** `ErrorBoundary` es el componente de clase que React define para esto (`getDerivedStateFromError`):
atrapa el error de lo que tiene adentro y muestra un mensaje en español con **Recargar** y **Volver al inicio**.
Está en dos lugares:

- en `Layout.tsx`, alrededor de la página del equipo: el menú y la sesión siguen funcionando;
- en `App.tsx`, como última red (inicio de sesión, Mi Wi-Fi).

Se reinicia al cambiar de ruta (`resetKey`), así que basta con ir a otra sección. Si el error es de una versión
vieja, el mensaje lo dice y solo ofrece recargar. Los errores de las peticiones no pasan por aquí: cada página los
muestra con `DataState`.

**Ejemplo.** Una página lanza "x is undefined": se ve "Algo salió mal en esta página" con los dos botones; al pulsar
otra sección del menú, esa sección se muestra normal (`errorBoundary.test.tsx`).

## Analizados y no implementados

| Patrón | Motivo |
|---|---|
| Redux u otro almacén global | El único estado compartido es la sesión (ya en un Provider); el resto de los datos vive en cada página y se recarga con `useApi`. |
| Higher-Order Components | Los componentes guardia y los hooks cubren lo mismo con menos código. |
| Caché de peticiones (React Query, SWR) | Agregaría una dependencia; las pantallas que lo necesitan (Mi Wi-Fi, el panel del sensor) ya se recargan solas. |
