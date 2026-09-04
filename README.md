# PILITAS MASTER V51 — VERSIÓN COMERCIAL

Paquete reproducible del código fuente completo de la versión comercial 51 de **ALGO Sales Room — Pilitas**.

## Procedencia verificada

- Site original: `algo-sales-room-pilitas`
- Versión publicada: `51`
- Commit: `fc947b8a66f3a8e5431e745499c76d6056774973`
- Referencia funcional: `https://worldroulette.net/`
- Proyecto original de Sites: conservado en `.openai/hosting.json` únicamente como referencia de procedencia.

El código de la aplicación y sus recursos proceden directamente del árbol Git del commit indicado. El archivo `README.ORIGINAL.md` conserva el README que pertenecía al commit. Este README, `MANIFEST.md`, `.env.example` y `SHA256SUMS.txt` son documentación añadida únicamente al paquete descargable.

> Importante: no publiques este paquete utilizando el `project_id` original. Para desplegar una copia independiente, crea primero otro proyecto y sustituye la identidad de `.openai/hosting.json`.

## Requisitos

- Node.js `22.13.0` o superior.
- npm compatible con el `package-lock.json` incluido. La validación del paquete se realizó con npm 11.
- Conexión a internet para sincronizar inventario, mostrar Google Maps y abrir los recorridos 360°.

No se incluye `node_modules`: es una carpeta generada, voluminosa y dependiente del sistema operativo. Todas las versiones necesarias quedan fijadas en `package-lock.json` y se reconstruyen con `npm ci`.

## Instalación

```bash
npm ci
```

## Desarrollo

```bash
npm run dev
```

## Compilación

```bash
npm run build
```

El resultado se genera en `dist/` mediante Vinext/Vite y contiene la aplicación compatible con el runtime de Cloudflare Workers utilizado por Sites.

## Ejecución de producción

Después de compilar:

```bash
npm start
```

## Comprobaciones disponibles

```bash
npm run lint
npm run build
```

El repositorio también conserva pruebas heredadas del starter en `tests/`. Dos aserciones de ese starter esperan metadatos y utilidades CSS que ya no forman parte de la aplicación final; por ello no deben confundirse con una falla de compilación de la V51. La compilación y el lint de la aplicación sí fueron validados correctamente.

## Variables de entorno y secretos

La V51 comercial no requiere claves privadas, tokens ni variables de entorno de usuario para su comportamiento actual. `.env.example` documenta este estado.

Los valores `WRANGLER_LOG_PATH`, `WRANGLER_WRITE_LOGS` y `MINIFLARE_REGISTRY_PATH` son variables técnicas opcionales establecidas por los propios scripts del proyecto; no contienen credenciales.

## Inventario, precios y moneda

La fuente dinámica está implementada en `app/api/inventory/route.ts`.

- Google Sheet: el identificador público de lectura está incluido en esa ruta.
- Hoja `Inventario`: columnas esperadas `unidad`, `precio base en USD` y `estado`.
- Estados válidos: `Disponible`, `Apartada` y `Vendida`.
- Hoja `Configuración`: claves `mxn_por_usd` y `actualizar_cada_minutos`.
- El cliente consulta `/api/inventory` periódicamente y mantiene datos comerciales integrados como respaldo si la hoja no está disponible.
- La conversión MXN/USD y el formato bilingüe se encuentran en `app/page.tsx`.

Para actualizar precios o disponibilidad sin cambiar el código, edita la hoja publicada respetando las columnas, las 16 unidades y los nombres de estado existentes. Para cambiar de fuente, modifica con cuidado `SPREADSHEET_ID` en `app/api/inventory/route.ts`.

## Asistente de ventas

El asistente comercial de esta versión es una lógica local integrada en `app/page.tsx`; no realiza llamadas a OpenAI ni necesita una API key.

- Mantiene la unidad seleccionada, idioma, moneda, precios y disponibilidad actuales.
- Responde mediante reglas de intención y palabras clave en `answerFor()`.
- Atiende preguntas de precio, presupuesto, comparación, vistas, forma de pago y datos de la residencia seleccionada.
- `ask()` administra el historial local de la conversación.
- `requestRealView()` conecta la solicitud de vista real con el flujo comercial del asistente.

## Servicios externos

| Servicio | Uso | Requiere secreto |
| --- | --- | --- |
| Google Sheets publicado | Precios, estados y tipo de cambio | No |
| Google Maps Embed | Mapa de Olas Altas 601 | No |
| GitHub Pages de `madininv-collab` | Recorridos 360° | No |

Los recursos gráficos, fachadas, interiores, amenidades, logotipos y planos visibles están incluidos localmente en `public/`. En la V51 los planos generales e individuales están almacenados como imágenes WebP de alta resolución; el commit no contiene archivos PDF originales.

## Funciones que necesitan internet

- Actualización dinámica de precios, estados y tipo de cambio desde Google Sheets.
- Mapa embebido de Google Maps.
- Recorridos 360° alojados en GitHub Pages.

La interfaz, fachadas, imágenes interiores, planos, inventario de respaldo, precios de respaldo, moneda, tutoriales y asistente local continúan cargando desde el propio paquete.

## Despliegue independiente

1. Extrae el ZIP.
2. Ejecuta `npm ci`.
3. Ejecuta `npm run build`.
4. Crea un proyecto de hosting independiente.
5. Sustituye o elimina el `project_id` original antes de vincular la nueva copia.
6. Despliega la salida `dist/` y conserva la ruta dinámica `/api/inventory`.
7. Comprueba que el runtime admita módulos ESM y el Worker generado en `dist/server/index.js`.

No conviertas el proyecto en un sitio estático puro: la sincronización dinámica de inventario depende de la ruta del servidor.

## Estructura principal

- `app/page.tsx`: experiencia completa, datos comerciales, asistente, fachadas, hotspots, galerías, planos, recorridos y gestos.
- `app/globals.css`: diseño, animaciones y responsive.
- `app/api/inventory/route.ts`: sincronización del inventario comercial.
- `public/media/`: fachadas, interiores, planos, amenidades, marcas y logotipos.
- `build/`, `scripts/`, `worker/`: compilación y ejecución para Sites/Cloudflare.
- `package.json` y `package-lock.json`: scripts y dependencias reproducibles.
- `MANIFEST.md`: inventario del paquete.
- `SHA256SUMS.txt`: sumas SHA-256 de todos los archivos incluidos, excepto el propio archivo de sumas.

## Integridad

Desde la raíz del paquete puedes comprobar los archivos con:

```bash
sha256sum --check SHA256SUMS.txt
```

El paquete excluye deliberadamente `.git`, `node_modules`, `dist`, `.next`, cachés, archivos temporales y credenciales.
