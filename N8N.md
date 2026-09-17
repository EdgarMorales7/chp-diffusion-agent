# N8N: Orquestación Externa

n8n se utilizará como herramienta de apoyo para tareas que requieran procesamiento en background, programación recurrente compleja, o integración fluida con herramientas externas donde la aplicación Next.js no sea la opción más ergonómica.

## Principio de Uso
**No usar n8n para tareas que la aplicación (Next.js) pueda hacer por sí sola más fácilmente.**
Next.js y Supabase manejarán el CRUD y las llamadas IA inmediatas. n8n será para orquestación diferida.

## Workflows Propuestos (Fase 9)

### 1. Sincronización de Analytics
- **Trigger:** Cron diario.
- **Acción:** Consultar Supabase (`schedule_queue`), agrupar posts marcados como `Published` en el día, y enviar un resumen a Slack/Telegram/WhatsApp interno.

### 2. Notificación de Cola Vacía
- **Trigger:** Cron matutino.
- **Acción:** Verificar si hay publicaciones programadas en la cola para hoy. Si no hay, alertar para generar una nueva campaña.

### 3. Procesamiento Batch de Imágenes (Opcional)
- Si generar 10 imágenes a la vez en Next.js causa timeout, delegar a n8n mediante webhook para llamar a la API de DALL-E, guardar en Storage y actualizar Supabase asíncronamente.

## Configuración
*(Pendiente - Se definirá una vez lleguemos a la fase 9).*
