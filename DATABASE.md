# DATABASE: Esquema y Modelos

Este documento describe la estructura base de Supabase para el CHP Diffusion Agent.

## Tablas Principales

### 1. `groups`
Almacena los grupos de Facebook.
- `id` (uuid)
- `name` (text)
- `facebook_url` (text)
- `category_id` (uuid, fk -> group_categories)
- `location` (text)
- `approximate_member_count` (int)
- `opportunity_score` (int)
- `status` (text)

### 2. `group_rules`
Reglas específicas de cada grupo.
- `id` (uuid)
- `group_id` (uuid, fk -> groups)
- `rule_type` (text)
- `description` (text)
- `status` (text)

### 3. `campaigns`
Campañas de marketing planificadas.
- `id` (uuid)
- `name` (text)
- `objective` (text)
- `brief` (text)
- `audience` (text)
- `product` (text)
- `customization` (text)
- `location` (text)
- `offer` (text)
- `cta_instruction` (text)
- `tone` (text)
- `strategy` (jsonb)
- `status` (text) - Draft, Generating, Ready, Approved, Active, Paused, Archived
- `created_at` (timestamp)
- `updated_at` (timestamp)

### 4. `post_variants`
Variantes de contenido (copys) para las campañas.
- `id` (uuid)
- `campaign_id` (uuid, fk -> campaigns)
- `hook` (text)
- `body` (text)
- `cta` (text)
- `tone` (text)
- `audience` (text)
- `estimated_length` (text)
- `angle` (text)
- `status` (text) - Draft, Approved, Rejected, Used, Archived
- `created_at` (timestamp)

### 5. `ai_generations`
Historial y trazabilidad de todo el contenido generado por IA.
- `id` (uuid)
- `campaign_id` (uuid, fk -> campaigns)
- `generation_type` (text)
- `provider` (text)
- `model` (text)
- `prompt_version` (text)
- `input` (jsonb)
- `output` (jsonb)
- `created_at` (timestamp)

### 6. `creative_briefs`
Instrucciones para la generación de imágenes.
- `id` (uuid)
- `campaign_id` (uuid, fk -> campaigns)
- `visual_concept` (text)
- `product_focus` (text)
- `target_audience` (text)
- `setting` (text)
- `composition` (text)
- `image_prompt` (text)
- `status` (text)
- `created_at` (timestamp)

### 7. `creatives`
Imágenes generadas o subidas para las campañas (Fase 4).
- `id` (uuid)
- `campaign_id` (uuid, fk -> campaigns)
- `creative_brief_id` (uuid, fk -> creative_briefs)
- `variant` (integer)
- `provider` (text)
- `model` (text)
- `prompt` (text)
- `image_url` (text) - URL firmada temporal generada para la sesión
- `storage_path` (text) - Ruta persistente en Supabase Storage
- `aspect_ratio` (text) - 1:1, 4:5, 9:16, 16:9
- `size` (text) - Dimensiones reales entregadas por el modelo (ej. 1024x1024, 1024x1280, 1824x1024)
- `requested_size` (text) - Tamaño solicitado originalmente
- `requested_quality` (text) - Calidad solicitada (standard, high, auto)
- `estimated_cost` (numeric) - Costo estimado calculado antes/durante la generación
- `actual_usage` (jsonb) - Métricas de tokens o uso real reportadas por la API del proveedor
- `generation_cost` (numeric) - Campo de compatibilidad legacy
- `status` (text) - Draft, Pending Approval, Approved, Rejected, Used, Archived
- `created_at` (timestamp)
- `updated_at` (timestamp)

### 8. `post_creatives`
Asociación (M:N) entre variantes de texto y creativos visuales.
- `post_variant_id` (uuid, fk -> post_variants)
- `creative_id` (uuid, fk -> creatives)
- `created_at` (timestamp)

### 9. `schedule_queue`
Cola de trabajo para publicaciones.
- `id` (uuid)
- `group_id` (uuid, fk -> groups)
- `campaign_id` (uuid, fk -> campaigns)
- `variant_id` (uuid, fk -> post_variants)
- `creative_id` (uuid, fk -> creatives)
- `status` (text)

### 10. `business_settings` (o variables estáticas)
Datos comerciales (productos, precios, reglas globales). Extraídos por la IA mediante el Context Builder.
- `key` (text)
- `value` (jsonb)
- `updated_at` (timestamp)

---

## Estrategia de Almacenamiento (Supabase Storage)

### Decisión de Arquitectura: Bucket Privado (`creatives`)
El bucket `creatives` se configura como **privado** (`public = false`) por las siguientes razones:
1. **Seguridad y Confidencialidad de Marca:** Los conceptos visuales en estado *Draft* o *Pending Approval* no deben ser públicos, indexables por motores de búsqueda ni accesibles por terceros antes de su aprobación explícita.
2. **Ciclo de Vida Controlado:** Evita fugas de URLs permanentes en caso de creativos rechazados o archivados.
3. **Mecanismo de Entrega:**
   - La imagen se almacena en el bucket en la ruta `campaigns/{campaign_id}/creatives/{brief_id}_{timestamp}.png`.
   - La base de datos almacena la ruta canónica en `storage_path`.
   - Para la renderización en el frontend (Galería y Vista Previa), el servidor utiliza `supabase.storage.from('creatives').createSignedUrl(storage_path, 3600)` para generar URLs firmadas temporales (1 hora).
   - De esta manera el navegador nunca depende de enlaces efímeros del proveedor de IA y los archivos permanecen protegidos bajo las políticas RLS de Supabase.

## `publication_queue`
Maneja las publicaciones programadas de forma Human-in-the-loop y su auditoría de ejecución.

### Columnas
- **id**: UUID (PK)
- **group_id**: UUID (FK a `groups`)
- **campaign_id**: UUID (FK a `campaigns`)
- **post_variant_id**: UUID (FK a `post_variants`)
- **creative_id**: UUID (FK a `creatives`)
- **scheduled_for**: TIMESTAMP WITH TIME ZONE
- **status**: `Draft`, `Planned`, `Ready`, `Approved`, `Today`, `Published`, `Skipped`, `Cancelled`
- **priority**: `Low`, `Medium`, `High`
- **notes**: Texto libre para sugerencias manuales.
- **facebook_post_url**: URL del post publicado en Facebook (opcional).
- **publication_notes**: Observaciones ingresadas por el usuario al publicar u omitir.
- **prepared_at**: TIMESTAMP WITH TIME ZONE — Se registra explícitamente mediante el botón "Iniciar Preparación".
- **approved_at**: TIMESTAMP WITH TIME ZONE — Se registra explícitamente mediante la acción "Aprobar Publicación". Se preserva si avanza a Today o Published.
- **opened_at**: TIMESTAMP WITH TIME ZONE — Auditoría interna al presionar "Abrir Grupo en Facebook".
- **published_at**: TIMESTAMP WITH TIME ZONE — Se registra atómicamente cuando el usuario confirma "Marcar como publicada".
- **skipped_at**: TIMESTAMP WITH TIME ZONE — Se registra cuando el usuario omite la tarea.
- **cancelled_at**: TIMESTAMP WITH TIME ZONE — Se registra cuando se cancela la tarea.
- **created_at**: TIMESTAMP WITH TIME ZONE
- **updated_at**: TIMESTAMP WITH TIME ZONE

### Ciclo de Estados y Máquina de Estados
- **Estados Accionables**: `Today`, `Approved`, `Ready`, `Planned` (si su `scheduled_for <= todayEnd`).
- **Estados Terminales**: `Published`, `Skipped`, `Cancelled`. Una tarea en un estado terminal nunca vuelve a ser seleccionada por `getNextTask()`.
- **Transiciones Válidas**:
  - `Draft` → `Planned`, `Ready`, `Cancelled`
  - `Planned` → `Ready`, `Today`, `Approved`, `Skipped`, `Cancelled`
  - `Ready` → `Approved`, `Today`, `Skipped`, `Cancelled`, `Published`
  - `Approved` → `Today`, `Ready`, `Published`, `Skipped`, `Cancelled`
  - `Today` → `Published`, `Skipped`, `Cancelled`, `Approved`, `Ready`

### Comportamiento de `getNextTask(currentId)`
1. Excluye la tarea actual (`id != currentId`).
2. Filtra tareas con estados accionables (`Today`, `Approved`, `Ready`, `Planned`) con `scheduled_for <= todayEnd`.
3. Excluye explícitamente estados terminales (`Published`, `Skipped`, `Cancelled`) y `Draft`. El estado `Pending` NO existe en el esquema y no es utilizado.
4. Ordena por prioridad ponderada real: `High (3)` > `Medium (2)` > `Low (1)`.
5. Desempata por `scheduled_for ASC`.
6. Si no existen más tareas pendientes, retorna `null`, redirigiendo el flujo al dashboard principal (`/queue`).
