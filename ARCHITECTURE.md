# ARCHITECTURE: CHP Diffusion Agent

Este documento describe la arquitectura del sistema CHP Diffusion Agent, diseñado para ser estable, simple de mantener, de bajo costo y con un enfoque claro en "Human-in-the-Loop".

## 1. Stack Tecnológico

- **Frontend & Backend (Monorepo):** [Next.js (App Router)](https://nextjs.org/) con TypeScript. Nos permite tener una UI moderna (React) y endpoints de API/Server Actions en un solo lugar, simplificando el mantenimiento.
- **Base de Datos & Autenticación:** [Supabase](https://supabase.com/). Nos provee PostgreSQL, autenticación (si es necesaria) y una API sencilla (PostgREST).
- **Estilos y UI:** [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/). Para interfaces limpias, profesionales y rápidas de construir sin dependencias pesadas.
- **Inteligencia Artificial (LLM):** API de OpenAI (GPT-4o / GPT-4o-mini). Abstraída mediante servicios internos para poder cambiar de proveedor en el futuro.
- **Generación de Imágenes:** Abstracción `ImageGenerationProvider`. Implementación inicial con OpenAI (DALL-E 3) u opcional Replicate.
- **Automatización & Orquestación:** [n8n](https://n8n.io/). Para workflows de background (ej. sincronizaciones, recordatorios) que no requieran interfaz de usuario inmediata.

## 2. Diagrama Conceptual del Flujo

```
[ IA (Generación/Planificación) ] ---> [ Base de Datos (Supabase) ]
                                              |
                                              v
[ Dashboard (Next.js) ] <-----------------> [ Cola de Trabajo (Queue) ]
                                              |
                                              v
[ Humano (Aprobación y Preparación) ] ----> [ Facebook (Acción Manual) ]
                                              |
                                              v
[ Usuario Final de FB ] ------------------> [ WhatsApp Chatbot CHP ]
```

## 3. Estructura de Directorios (Propuesta)

```
/
├── src/
│   ├── app/                # Rutas de Next.js (Dashboard, Grupos, Cola, etc.)
│   ├── components/         # Componentes UI (shadcn, custom)
│   ├── lib/
│   │   ├── supabase/       # Cliente de Supabase
│   │   ├── ai/             # Abstracciones de LLM y Prompts
│   │   ├── n8n/            # Utilidades de integración con n8n
│   │   └── utils/          # Funciones de ayuda
│   └── types/              # Definiciones TypeScript
├── docs/                   # Documentación adicional
├── supabase/               # Migraciones de DB y configuración
└── ...
```

## 4. Principios de Diseño

1. **Datos Reales vs Generados:** Todo contenido IA (`GENERADO`) debe ser claramente distinguible de los datos del negocio (`REAL`).
2. **Sin Scraping Peligroso:** El sistema no interactúa automáticamente con Facebook. Prepara el enlace, copia el texto y abre la pestaña.
3. **Mantenibilidad:** Evitar sobreingeniería. Uso intensivo de Server Actions de Next.js para simplificar la obtención/mutación de datos.
