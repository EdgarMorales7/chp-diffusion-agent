# CHP Diffusion Agent

(Internal Project for CHP Personalizados)

Sistema semiautónomo para la generación de tráfico y ventas a través de Facebook Groups, integrándose con el chatbot de WhatsApp de CHP.

## Estructura de Fases

- [x] **Fase 1: Configuración de Arquitectura Inicial** (Supabase, Next.js, UI)
- [x] **Fase 2: Group Manager** (Auditoría, validación de reglas, scraper fallback conceptual)
- [x] **Fase 3: AI Content Engine** (Generación de Copywriting, Context Builder)
- [x] **Fase 4: Creative Engine** (Generación de briefs, integración con OpenAI Images, fallback genérico)
- [x] **Fase 5: Publication Queue & Calendar** (Smart Matching contextual, cola de publicación)
- [x] **Fase 6: Human-in-the-Loop Facebook Publisher** (Estación de trabajo manual, copiado a portapapeles, checklists, progresos de hoy)

## Fase 6 — Human-in-the-Loop Facebook Publisher
- **Estación de Publicación:** Centro de trabajo manual en `/queue/prepare/[id]` con previsualización, un clic para copiar copy formateado, un clic para descargar creativo y enlace directo al grupo.
- **Acciones y Timestamps de Auditoría:**
  - `prepared_at`: Registrado al iniciar la preparación activa.
  - `approved_at`: Registrado al aprobar explícitamente la publicación.
  - `opened_at`: Registrado al abrir el grupo en Facebook.
  - `published_at`: Registrado atómicamente al confirmar la publicación junto con la URL y notas.
  - `skipped_at`: Registrado al omitir la tarea con justificación opcional.
- **Flujo Encadenado (`getNextTask`):**
  - Priorización ponderada: High > Medium > Low.
  - Desempate: `scheduled_for ASC` para tareas con fecha `<= todayEnd`.
  - Estados accionables: `Today`, `Approved`, `Ready`, `Planned`.
  - Estados terminales protegidos: `Published`, `Skipped`, `Cancelled`.
- **Checklist Operativo:** 5 puntos de validación rápida (Grupo correcto, Reglas revisadas, Copy revisado, Imagen revisada, CTA revisada).
- **Atajos de Teclado:** C (Copiar texto), D (Descargar creativo), G (Abrir grupo), P (Marcar publicada), N (Siguiente tarea).

El sistema opera bajo una estricta política **Human-in-the-Loop**. El sistema prepara las campañas, los creativos y empareja de manera lógica el contenido con las reglas del grupo. El humano aprueba, copia, pega y publica.

## Ejecución Local
```bash
npm run dev
npx supabase start
```
