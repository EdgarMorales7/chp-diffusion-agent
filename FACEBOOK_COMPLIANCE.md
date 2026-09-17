# FACEBOOK COMPLIANCE

Este sistema está diseñado explícitamente para cumplir con las políticas de Meta/Facebook, priorizando la acción manual humana (Human-in-the-Loop) y evitando el spam.

## Principios Fundamentales

### 1. Cero Automatización de Publicación (No Scraping/Botting)
El sistema **NUNCA** intentará hacer login en Facebook, rellenar formularios automáticamente, o saltar CAPTCHAs.
Toda interacción de publicación final la realiza el humano haciendo clic en "Abrir grupo", pegando el contenido y pulsando publicar.

### 2. Prevención de Spam Interno
El sistema cuenta con un historial de publicaciones (`publication_history`).
- **No duplicidad:** Avisará si se intenta publicar el mismo copy en un lapso corto de tiempo en el mismo grupo.
- **Límites de frecuencia:** La cola de programación alertará si se excede la "frecuencia permitida" configurada para un grupo en particular.

### 3. Reglas Específicas de Grupo
El sistema permite catalogar las reglas de cada grupo (Ej. Solo ventas los martes, no compartir enlaces).
Al momento de "Preparar" la publicación, la IA evalúa el contenido contra las reglas conocidas del grupo y advierte si hay un posible incumplimiento.

### 4. Respuestas a Comentarios
El Asistente de Comentarios sugiere la respuesta, pero el humano la revisa y la pega manualmente.

## Cumplimiento de Políticas
Esta arquitectura asegura que la cuenta de Facebook que opera no es detectada como un bot, porque *no es un bot*. Es un operador humano altamente eficiente y organizado.
