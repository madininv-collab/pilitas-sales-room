# ALGO Concierge Engine v0 — Arquitectura y Guía de Extensión

Este documento documenta la arquitectura técnica, catálogo de herramientas, sincronización de estado y la receta para conectar futuros modelos de Inteligencia Artificial (locales o remotos) en la Sales Room de **PILITAS / Verandas de Olas Altas**.

---

## 1. Resumen del Comportamiento Construido

El **ALGO Concierge Engine v0** introduce una capa desacoplada que permite al asistente comercial de la Sales Room operar como un **Presentador Comercial Interactivo** y ejecutor de acciones guiadas, manteniendo el 100% de la experiencia visual y comercial previa.

### Capacidades Implementadas
1. **Entrada pública unificada:** Toda interacción textual ingresa mediante `concierge.handle({ text })` o mediante el `PresentationDirector`.
2. **Observabilidad profunda (Context Snapshot):** En cada turno, el motor genera un snapshot inmutable (`ConciergeContext`, `schemaVersion: "1.0.0"`) que refleja la fachada activa, la unidad seleccionada, modales abiertos (plano, amenidad, tour), estado del inventario y tipo de cambio.
3. **Catálogo tipado y validado:** 10 acciones comerciales con validación de esquemas Zod en runtime y comprobación estricta de precondiciones sobre los datos reales.
4. **Parser local determinista:** Normaliza texto, descarta negaciones y ambigüedades, previene selecciones accidentales por números aislados y delega preguntas comerciales complejas a la función original `answerQuestion`.
5. **Presentador Comercial Interactivo (Presentation Director):** Coordina un recorrido guiado determinista de 6 pasos reales (Bienvenida -> Arquitectura -> Residencia 401 -> Plano 401 -> Rooftop -> Cierre). Implementa el principio **"Mostrar antes de Explicar"**: ejecuta la acción visual, confirma el render y luego emite la explicación correspondiente.
6. **Pausa e interrupción respetuosas:** Si el visitante escribe en el chat o interactúa manualmente con la pantalla (haciendo clic en una unidad, fachada o plano), la presentación se pausa automáticamente para no competir con el usuario.

---

## 2. Diagrama de Arquitectura

```
                            ┌──────────────────────────────────────────────┐
                            │            Sales Room UI (React)             │
                            │  [Chat Input]  [Botones Guion]  [Navegación] │
                            └──────────────────────┬───────────────────────┘
                                                   │
                ┌──────────────────────────────────┼──────────────────────────────────┐
                │                                  │                                  │
                ▼                                  ▼                                  ▼
   [Texto del Visitante]              [Acción Manual Usuario]               [Controles Guion]
                │                                  │                                  │
                ▼                                  ▼                                  ▼
      concierge.handle({ text })       director.onManualNavigation()      director.start() / nextStep()
                │                                  │                                  │
                ├──────────────────────────────────┼──────────────────────────────────┘
                ▼                                  ▼
   ┌───────────────────────────┐      ┌──────────────────────────────┐
   │      Context Builder      │◄────┤     Presentation Director    │
   │ (Snapshot Inmutable v1.0) │      │  (idle/presenting/paused/...)│
   └────────────┬──────────────┘      └──────────────┬───────────────┘
                │                                    │
                ▼                                    │
   ┌───────────────────────────┐                     │
   │       Local Parser        │                     │
   │ (Decisión estructurada)   │                     │
   └────────────┬──────────────┘                     │
                │                                    │
                ▼                                    ▼
   ┌─────────────────────────────────────────────────────────────────┐
   │                         Tool Executor                           │
   │       (Validación Zod + Verificación de Precondiciones)         │
   └────────────────────────────────┬────────────────────────────────┘
                                    │
                                    ▼
   ┌─────────────────────────────────────────────────────────────────┐
   │                       SalesRoomAdapter                          │
   │  (Sincronización por Lote Atómico de Handlers de React)         │
   └────────────────────────────────┬────────────────────────────────┘
                                    │
                                    ▼
   ┌─────────────────────────────────────────────────────────────────┐
   │             Estado Confirmado + Respuesta al Usuario            │
   └─────────────────────────────────────────────────────────────────┘
```

---

## 3. Catálogo de Herramientas (10 Acciones)

Todas las acciones se validan en runtime antes de ejecutar cualquier efecto en la UI:

| Herramienta | Parámetros | Comportamiento y Precondiciones | Código de Error |
| :--- | :--- | :--- | :--- |
| `select_residence` | `residenceId: UnitId` | Selecciona la unidad y centra la cámara. Si la unidad está en la fachada opuesta, cambia la fachada automáticamente. Requiere que la unidad exista en el inventario. | `NOT_FOUND` |
| `set_facade` | `facade: "front" \| "rear"` | Cambia la fachada. Es idempotente: si se invoca sobre la fachada actual, no borra la selección activa. | `INVALID_ARGUMENTS` |
| `open_inventory` | Ninguno | Abre el cajón lateral con la lista de unidades y precios. | - |
| `close_inventory` | Ninguno | Cierra el cajón lateral del inventario. | - |
| `open_floor_plan` | `residenceId: UnitId` | Abre el modal del plano arquitectónico para la unidad indicada. Valida existencia de la unidad. | `NOT_FOUND` |
| `close_floor_plan` | Ninguno | Cierra el modal de plano. Protege otras experiencias: no cierra tours ni amenidades si estuvieran abiertos. | - |
| `show_amenity` | `amenityId: "lobby" \| "rooftop"` | Abre la galería de la amenidad. Si es el Lobby, asegura vista frontal. | `INVALID_ARGUMENTS` |
| `open_tour` | `residenceId: UnitId` | Abre el recorrido virtual 360°. Valida que la unidad cuente con Matterport en el catálogo autorizado. | `NOT_AVAILABLE` |
| `set_language` | `language: "es" \| "en"` | Cambia el idioma de la interfaz y confirma en el idioma resultante. | `INVALID_ARGUMENTS` |
| `set_currency` | `currency: "MXN" \| "USD"` | Cambia la moneda activa para el cálculo y visualización de precios. | `INVALID_ARGUMENTS` |

---

## 4. Ejemplo Real de Snapshot de Contexto (Sanitizado)

```json
{
  "schemaVersion": "1.0.0",
  "project": {
    "id": "pilitas",
    "name": "Las Verandas de Olas Altas",
    "language": "es",
    "currency": "USD",
    "exchangeRate": {
      "mxnPerUsd": 17.0427,
      "source": "fixed_catalog",
      "asOf": "2026-09-14T12:00:00.000Z"
    },
    "mode": "exploring"
  },
  "navigation": {
    "activeFacade": "front",
    "selectedResidenceId": "401",
    "inventoryOpen": false,
    "experienceModal": {
      "isOpen": true,
      "activeType": "plan",
      "targetId": "401"
    },
    "selectedAmenityId": null,
    "generalPlans": {
      "isOpen": false,
      "activeIndex": 0,
      "totalCount": 8
    }
  },
  "inventory": {
    "syncStatus": "synced",
    "isUsingLocalBackup": false,
    "lastUpdated": "2026-09-14T12:00:00.000Z",
    "residences": [
      {
        "id": "401",
        "code": "U 09",
        "name": "Residencia 401",
        "level": 4,
        "beds": 1,
        "baths": 1,
        "areaM2": 76.90,
        "priceUsd": 485100,
        "status": "Disponible",
        "facade": "front",
        "hasTour": true,
        "hasFloorPlan": true
      }
    ]
  },
  "capabilities": {
    "supportedTools": [
      "select_residence", "set_facade", "open_inventory", "close_inventory",
      "open_floor_plan", "close_floor_plan", "show_amenity", "open_tour",
      "set_language", "set_currency"
    ],
    "availableTours": ["PH1", "501", "201", "301", "401", "202", "302", "402", "204", "304", "404"]
  }
}
```

---

## 5. Tratamiento del Asistente Comercial y Endpoint Remoto

- **`answerQuestion` (`lib/pilitas/assistant.ts`):**
  Se reutiliza intacta. Cuando el parser detecta que la intención del usuario es informativa o comercial (presupuestos, comparación, consultas de recámaras, vistas), adapta el `ConciergeContext` y delega la respuesta a esta función. Se añadieron pruebas de regresión en `tests/concierge-local-parser.test.mjs` que validan que no hay divergencias.
- **`askRemoteAssistant` (`lib/pilitas/remote-assistant.ts`):**
  Queda completamente fuera del ciclo de ejecución de v0. El motor no realiza peticiones HTTP externas ni llamadas a pasarelas de IA durante la interacción, garantizando funcionamiento autónomo y determinista.

---

## 6. Receta para Conectar un Modelo de IA Local o una API Remota

La arquitectura está expresamente preparada para sustituir el parser local sin tocar la interfaz ni los handlers:

```typescript
// 1. Crear el adaptador del nuevo proveedor implementando ConciergeProvider
import type { ConciergeProvider, ProviderDecision } from "@/lib/concierge";

export const myAIProvider: ConciergeProvider = {
  id: "openai_or_local_llm",
  async interpret({ text, context, tools, signal }): Promise<ProviderDecision> {
    // A. Formatear el prompt o payload con el snapshot 'context' y los 'tools'
    // B. Invocar la inferencia (local en WebWorker/Ollama o remota en backend)
    // C. Mapear la salida del modelo al contrato ProviderDecision:
    //    - Si decidió usar herramienta: { kind: "action", action: parsedAction }
    //    - Si respondió al usuario: { kind: "reply", message: responseText }
    //    - Si requiere clarificación: { kind: "clarification", message: questionText }
  }
};

// 2. Inyectar el proveedor en la inicialización del motor:
const concierge = createConciergeEngine({
  provider: myAIProvider,
  salesRoom: adapter,
});
```

### Consideraciones Críticas de Conexión Futura
- **Modelo Local (WebLLM / Ollama local):**
  - Si corre en el navegador (WebGPU/WebAssembly), asegurar manejo de memoria y abort controllers ante interacción rápida del usuario.
  - Si corre en un servidor local (ej. `localhost:11434`), recordar que un sitio web en HTTPS bloquea solicitudes a HTTP local por políticas de Mixed Content y CORS; se requiere una capa proxy o certificado local.
- **API Remota (OpenAI, Gemini, Anthropic, etc.):**
  - **Nunca** colocar claves API en el navegador ni en variables públicas `VITE_*`.
  - Debe utilizarse una ruta de servidor (como `app/api/concierge/route.ts` o un Cloudflare Worker) que reciba el mensaje y el snapshot, llame a la API con credenciales seguras y devuelva la decisión estructurada.

---

## 7. Verificación de Suites de Pruebas y Builds

Todas las verificaciones ejecutadas pasan con 0 errores:

| Comando | Resultado | Notas |
| :--- | :--- | :--- |
| `npm run typecheck` | Aprobado (0 errores) | Verificación estricta de TypeScript en todo el proyecto. |
| `npm test` | Aprobado (40/40 tests) | 15 tests originales + 25 tests nuevos de concierge y director. |
| `npm run lint` | Aprobado (0 errores, 0 warnings) | ESLint con reglas de React 19 y TypeScript. |
| `npm run build` | Aprobado (0 errores) | Compilación de servidor SSR (`vinext build`). |
| `npm run build:pages` | Aprobado (0 errores) | Compilación estática de producción (`dist-pages`). |
