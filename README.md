# ALGO Sales Room — Pilitas

Sala de ventas bilingüe con inventario, planos, recorridos y asistente local.

## Desarrollo

Requiere Node.js 22.13+ y npm 11. Scripts compatibles con Windows, macOS y Linux, sin Bash.

```sh
npm ci
npm run dev
npm run verify
npm audit
```

`verify` ejecuta ESLint, TypeScript, compilación y pruebas automatizadas. Producción: `npm run build` y `npm start`. La salida `dist/` requiere el Worker para servir `/api/inventory`.

## Contactos editables

Edita `config/contact.json` en GitHub y vuelve a compilar/publicar. Valores iniciales: WhatsApp **+52 7442565667**, correo **algoritmoarquitectonico@gmail.com**, enlace de citas vacío.

Para modificarlos sin cambiar código, usa la pestaña **Configuración** del Google Sheet conectado, con dos columnas, `clave` y `valor`:

| clave | valor de ejemplo |
| --- | --- |
| mxn_por_usd | 17.0427 |
| actualizar_cada_minutos | 5 |
| ventas_whatsapp | +52 7442565667 |
| ventas_email | algoritmoarquitectonico@gmail.com |
| ventas_citas_url | vacío o enlace HTTPS de citas |

Formatea la celda de WhatsApp como texto. Los contactos válidos de la hoja sustituyen a los locales; si faltan, se usan los locales. Los botones abren WhatsApp o correo con la unidad seleccionada. El asistente no envía solicitudes ni confirma citas automáticamente.

No se añadió un editor administrativo dentro del sitio ni conexión a un Excel privado de Drive.

## Inventario

Configura `INVENTORY_SPREADSHEET_ID` en el entorno del servidor para cambiar de hoja; consulta `.env.example`. La fuente predeterminada está en `lib/pilitas/inventory-source.ts`.

La integración lee CSV sin autenticación: las pestañas **Inventario** y **Configuración** deben permitir lectura anónima mediante el endpoint CSV de Google. El permiso de GitHub no concede acceso a la hoja. Usa una hoja dedicada a información comercial pública, sin datos de clientes.

Inventario requiere columnas `unidad`, `precio base en USD`, `estado`; las 16 unidades únicas del catálogo; estados `Disponible`, `Apartada` o `Vendida`; precios positivos con punto decimal: `423500.00` o `423,500.00`. Se rechaza `423.500,00` para evitar precios mal interpretados. Intervalo permitido: de 1 a 60 minutos.

El servidor valida ambas pestañas, limita tiempo y tamaño de respuesta, comparte solicitudes concurrentes y guarda resultados válidos en caché por 60 segundos por instancia. Ante un fallo devuelve 503. El cliente conserva el último inventario válido o el catálogo integrado e indica **Inventario por confirmar**. La fecha mostrada corresponde a la última lectura válida, no a la última edición de la hoja.

## Organización

- `app/page.tsx`: interfaz y coordinación.
- `components/pilitas/zoomable-plan.tsx`: zoom y desplazamiento; flechas con zoom activo, +/− y 0.
- `hooks/use-inventory.ts`: sincronización del cliente.
- `lib/pilitas/`: catálogo, traducciones, formatos, contactos, validación y asistente.
- `tests/`: render del Worker, componentes y reglas comerciales.
- `public/`: recursos gráficos originales.

El asistente usa reglas locales, sin API de IA. Considera unidades, presupuesto, moneda y disponibilidad; avisa cuando los datos requieren confirmación. Cambiar idioma conserva moneda e historial.

## Hosting

Se conserva la identidad original en `.openai/hosting.json`. Para publicar una copia independiente: primero crea y vincula el proyecto de destino, actualiza esa identidad y **después** ejecuta `npm run build`. Cambiarla después exige recompilar porque se copia a `dist/.openai/hosting.json`.

Antes de publicar verifica fuente y salida:

```sh
node scripts/verify-hosting.mjs ID_DEL_PROYECTO_DESTINO
```

El script verifica, no publica. Conserva el Worker para la ruta de inventario. Google Maps y recorridos externos necesitan internet.

## Procedencia y verificación

Origen comercial V51: `fc947b8a66f3a8e5431e745499c76d6056774973`. `README.ORIGINAL.md` conserva documentación histórica. El manifiesto y las sumas describen los archivos actuales, excluyendo Git, dependencias, compilados y cachés.

Las pruebas cubren lógica comercial, validación, sincronización y render del servidor. No se realizó una revisión visual completa en dispositivos reales. Se conservan los recursos binarios originales; sigue pendiente optimizar la fachada PNG de gran tamaño.
