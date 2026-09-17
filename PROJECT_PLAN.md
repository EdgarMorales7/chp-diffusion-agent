# PROJECT PLAN: CHP Diffusion Agent

Este documento detalla el plan de desarrollo para el CHP Diffusion Agent, dividido en 9 fases según los requerimientos.

## FASE 1 — FOUNDATION (Fundamentos)
- [ ] Definición de arquitectura y documentación inicial (README, ARCHITECTURE, PROJECT_PLAN, etc.).
- [ ] Inicialización del proyecto base (Next.js con TypeScript).
- [ ] Configuración de Supabase (tablas iniciales, tipos).
- [ ] Configuración de variables de entorno (`.env.example`).
- [ ] Creación de layouts y estructura de navegación del Dashboard.

## FASE 2 — GROUP MANAGER (Gestor de Grupos)
- [x] Esquema de BD para `groups` y `group_rules`.
- [x] CRUD de Grupos y Categorías.
- [x] Módulo para registrar reglas de los grupos (Confirmada, Pendiente, Desconocida).
- [x] Implementación del "Opportunity Score" (lógica de ordenamiento y filtrado).

## FASE 3 — AI CONTENT ENGINE (Motor de Contenido IA)
- [x] Esquema de BD para `campaigns`, `post_variants`, `ai_generations`, `cta_templates`, `creative_briefs`.
- [x] AI Abstraction Layer (proveedor agnóstico con Vercel AI SDK).
- [x] Generador estructurado de Estrategia de Campaña.
- [x] Generador de 10 variantes de post con ángulos diferentes.
- [x] Generador de Creative Briefs (para Fase 4).
- [x] Historial de trazabilidad (`ai_generations`).
- [x] UI de Wizard para Campañas (lista y detalle).
- [x] Generación de múltiples variantes de copies y CTAs.
- [x] Lógica de adaptación de mensajes según la audiencia del grupo.

## FASE 4 — CREATIVE ENGINE (Motor Creativo)
- [x] Esquema de BD para `creatives` y `post_creatives`.
- [x] Proveedor de imágenes configurable (DALL-E 3 / OpenAI API).
- [x] Sistema de costos y validación.
- [x] Generador de imágenes desde `creative_briefs` utilizando Prompt Builder.
- [x] Almacenamiento persistente en `Supabase Storage` (bucket `creatives`).
- [x] Vista interactiva: Librería visual (`/creatives`) y Previsualización con Textos simulados.

## FASE 5 — QUEUE (Cola de Publicaciones)
**Estado:** [x] COMPLETADA
**Objetivo:** Cola de publicación Human-in-the-Loop y prevención de duplicados.
- [x] Esquema de BD para `schedule_queue` y `publication_history`.
- [x] Vista de calendario y lista de trabajo (Queue).
- [x] Lógica de prevención de duplicados (alertas si se repite imagen o texto en poco tiempo).
- [x] Crear tabla `publication_queue` con estados (Draft, Ready, Today, Published).
- [x] Lógica de validación de reglas de grupo (`checkGroupAvailability`).
- [x] Lógica de prevención de duplicados (`checkDuplicates`).
- [x] Sugerencias inteligentes y coincidencia contextual (Compatibilidad sugerida).
- [x] Validación estructurada de reglas (rule_type, value, status con 'Needs verification').
- [x] Configuración dinámica: MIN_DAYS_BETWEEN_GROUP_POSTS y DUPLICATE_WINDOW_DAYS.
- [x] UI: Vista de "Hoy" (`/queue`) y Calendario (`/queue/calendar`).
- [x] UI: Vista de "Preparación" (`/queue/prepare/[id]`) con checklist manual.
- [x] UI: Wizard generador desde la vista de campaña.
- [x] Botón para "Abrir grupo" en Facebook.
- [x] Registro de resultados y marcado como "Publicada".

## FASE 6 — HUMAN-IN-THE-LOOP FACEBOOK PUBLISHER (Estación de Publicación)
**Estado:** [x] COMPLETADA
**Objetivo:** Estación de trabajo optimizada para ejecución manual segura de publicaciones en Facebook Groups.
- [x] Corrección crítica en `getNextTask()`: exclusión de `Pending` (estado inexistente) y uso exclusivo de estados accionables (`Today`, `Approved`, `Ready`, `Planned`).
- [x] Exclusión estricta de estados terminales (`Published`, `Skipped`, `Cancelled`) y `Draft`.
- [x] Ordenamiento multi-criterio ponderado: Prioridad real (`High: 3` > `Medium: 2` > `Low: 1`) y desempate cronológico (`scheduled_for ASC`).
- [x] Registro idempotente de `prepared_at` mediante acción explícita o inicio de preparación en el workstation.
- [x] Acción explícita de "Aprobar Publicación" (`approved_at` persistente y preservado en transiciones posteriores).
- [x] Checklist interactivo de 5 puntos (Grupo, Reglas, Copy, Imagen, CTA).
- [x] Registro atómico de publicación manual (`status = 'Published'`, `published_at`, `facebook_post_url`, `publication_notes`).
- [x] Registro de auditoría interna al abrir grupo (`opened_at`).
- [x] Encadenamiento dinámico a la siguiente publicación accionable mediante `getNextTask(currentId)` con retorno seguro a `/queue`.
- [x] Máquina de estados centralizada (`src/lib/queue/status.ts`) con definición de estados terminales y transiciones permitidas.
- [x] Suite de 16 pruebas unitarias específicas en `publisher.test.ts` cubriendo los Casos 1 al 9 requeridos.

## FASE 7 — COMMENT ASSISTANT (Asistente de Comentarios)
- [ ] Esquema de BD para `comments` y `comment_replies`.
- [ ] Interfaz para pegar comentario de Facebook.
- [ ] Generación de respuesta sugerida vía IA (con datos reales de CHP).
- [ ] Copiado al portapapeles.

## FASE 8 — ANALYTICS (Métricas)
- [ ] Esquema de BD para `analytics`.
- [ ] Dashboard de métricas (posts publicados, grupos activos, rendimiento).
- [ ] Pantalla "Hoy" con resumen diario de tareas pendientes.

## FASE 9 — N8N (Orquestación y Automatizaciones)
- [ ] Configuración de workflows externos (recordatorios, sincronización, tareas en background).
- [ ] Documentación de webhooks y triggers.

---
**Estado Actual:** Fase 1 completada, iniciando base de código.
