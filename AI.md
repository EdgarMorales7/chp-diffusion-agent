# AI Architecture & Documentation

## Overview
La FASE 3 introduce la **AI Content Engine**, diseñada para actuar como un asistente de marketing interno para CHP Personalizados. La IA no publica ciegamente, sino que genera contenido estructurado (estrategias, variantes de publicación, creatividades) basado en la verdad comercial del negocio.

## AI Abstraction Layer
El sistema utiliza el SDK `ai` (Vercel AI SDK) para crear una capa agnóstica de proveedores.

**Archivo principal:** `src/lib/ai/provider.ts`

- Utiliza `generateObject` con `Zod` schemas para forzar una salida JSON estricta y predecible.
- Permite cambiar de modelo o proveedor (OpenAI, Anthropic, etc.) modificando únicamente la configuración en este archivo.
- Registra cada generación en la tabla `ai_generations` para asegurar trazabilidad.

## Componentes de la FASE 3

### 1. Generador de Estrategia (`generateCampaignStrategy`)
Convierte un prompt sencillo ("Quiero promocionar playeras") en un JSON detallado con:
- Público objetivo
- Ángulos de comunicación
- Propuesta de valor
- CTA y Tono recomendado

### 2. Generador de Variantes (`generatePostVariants`)
A partir de la estrategia, genera exactamente 10 variantes de copy. Las variantes diferencian su enfoque (ej. mayoreo, identidad de marca, regalos) e incluyen una explicación breve (`explanation`) para guiar al usuario.

### 3. Generador de Creative Briefs (`generateCreativeBriefs`)
Prepara instrucciones detalladas (prompts, iluminación, setting) para herramientas de generación de imágenes (FASE 4).

## Context Builder y Base de Conocimiento (Knowledge Base)
La arquitectura utiliza un `Context Builder` (`src/lib/ai/contextBuilder.ts`) que abstrae la información comercial inyectada en los Prompts.
En lugar de depender exclusivamente de texto en duro, consulta la tabla `business_settings` de Supabase para obtener las directrices de la marca.

> **Pendiente para Fase Posterior:**
> Actualmente la base de datos no tiene un sistema relacional completo para el inventario. Para tener una Base de Conocimiento 100% autónoma y no depender de JSONs en `business_settings`, el sistema necesitará implementar en una fase posterior las siguientes tablas:
> - `products`: Inventario y descripciones de prendas base.
> - `customization_types`: Tipos de estampado (DTF, Bordado, DTG) con reglas.
> - `pricing_rules`: Reglas de mayoreo y precios mínimos.
> - `promotions`: Descuentos o campañas activas.

## Integración con Group Manager
Las futuras iteraciones y la generación de contenido adaptativo usarán las reglas definidas en el Group Manager (FASE 2) para asegurar que la IA recomiende contenido respetando las restricciones de Facebook.

## Manejo de Errores y Costos
El uso de `generateObject` permite atrapar respuestas inválidas y manejar `ZodError` en caso de que la IA alucine estructuras.
El historial de la IA (`ai_generations`) incluye modelo, proveedor y prompt version, sentando las bases para un cálculo de costos futuro.

---

## FASE 4 — Creative Engine (Image Generation)

### 1. Abstracción del Proveedor (`ImageGenerationProvider`)
Ubicación: `src/lib/ai/imageProvider.ts`

- **Modelo Inicial por Defecto:** `gpt-image-2.5-flare` (configurable vía `IMAGE_PROVIDER_MODEL`).
- **Proveedor Inicial:** `openai` (configurable vía `IMAGE_PROVIDER`).
- **Capa de Capacidades (`getImageCapabilities`):** Inspecciona dinámicamente las restricciones del proveedor y modelo sin hardcodear DALL-E ni tamaños rígidos en los componentes.
  - Para `gpt-image-2.5-flare`: Soporta `1:1` (`1024x1024`), `4:5` (`1024x1280`), `9:16` (`1024x1824`) y `16:9` (`1824x1024`), cumpliendo la regla de dimensiones divisibles por 16 y ratios entre 1:3 y 3:1.
  - Para `dall-e-3` (legacy): Soporta `1024x1024`, `1024x1792` y `1792x1024`. Si se solicita un ratio no soportado nativamente como `4:5`, se traduce a formato cuadrado seguro con advertencia.

### 2. Estrategia de Costos y Transparencia UX
- **Separación de Costos:** Se separa `estimated_cost` (proyección antes/durante la generación basada en tokens/tarifas estándar) de `actual_usage` (metadata de tokens retornada por la API).
- **Control de Costes en la UI:** El usuario visualiza el proveedor, modelo, resolución y costo estimado antes de ejecutar la acción.
- **Acción Explícita:** Las llamadas a la API de imágenes solo ocurren al presionar intencionalmente el botón de generar; nunca por ciclo de vida o render de React.

### 3. Fidelidad de Producto y Técnicas
Los prompts inyectan especificaciones exactas para evitar alucinaciones:
- **Prendas:**
  - Playera: Algodón cuello redondo, caída realista, costuras limpias.
  - Sudadera: Hoodie de felpa con gorro, textura textil premium, puños acanalados.
  - Polo: Piqué con cuello estructurado y botones.
- **Técnicas de Personalización:**
  - DTF: Impresión transfer de alta definición, bordes limpios y acabado semi-mate.
  - DTG: Tinta digital absorbida en la fibra de algodón con tacto suave.
  - Bordado: Puntadas densas de hilo con relieve y brillo característico de máquina bordadora.

### 4. Estrategia de Pruebas
- **Unitarias:** Los tests (`npm run test`) usan exclusivamente mocks (`vi.fn()`) y stubs para no generar costo ni requerir red.
- **Test de Integración Real (Opcional):** Solo se ejecuta si explícitamente se define `RUN_EXTERNAL_IMAGE_TESTS=true` en el entorno junto con una clave de API válida. No se ejecuta durante CI ni compilación normal.


### Phase 5 - Smart Matching & Contextual Compatibility (Queue Generator)
El sistema evalúa combinaciones de grupo, texto y creativo para sugerir tareas de publicación:
- **Match Score (Coincidencia Contextual / Compatibilidad Sugerida - `src/lib/queue/matching.ts`)**: 
  - Representa exclusivamente **coincidencia contextual** (afinidad temática entre audiencia, producto, mensaje y concepto visual).
  - **NO** representa probabilidad de venta, ROI, conversión ni rendimiento garantizado.
  - Escala base de 10 a 100 puntos.
- **Validación de Reglas de Grupo (`checkGroupAvailability`)**:
  - Prioriza campos estructurados (`rule_type`, `value`, `status`).
  - La descripción y evidencia se utilizan como contexto informativo, no como única fuente para prohibir.
  - Si la información estructurada no existe o es ambigua, marca `Needs verification` en lugar de asumir.
- **Frecuencia Configurable**:
  - `MIN_DAYS_BETWEEN_GROUP_POSTS` (default: 3 días): alerta si se publica con frecuencia menor a la configurada.
- **Ventana de Duplicados Configurable**:
  - `DUPLICATE_WINDOW_DAYS` (default: 7 días): alerta sobre publicaciones repetidas del mismo combo creativo/post/campaña en ese rango.
