# SETUP: Configuración e Instalación

Esta guía detalla los pasos para levantar el entorno de desarrollo local para el CHP Diffusion Agent.

## 1. Requisitos Previos

- Node.js (v18+)
- Gestor de paquetes: `npm` o `pnpm` o `yarn`
- CLI de Supabase (opcional, recomendado para desarrollo local rápido)
- Cuenta de OpenAI (para API key)
- Cuenta en Supabase (si usas nube)

## 2. Instalación de Dependencias

```bash
# Instalar dependencias
npm install
```

## 3. Variables de Entorno

Copia el archivo `.env.example` a `.env.local` y completa los valores:

```bash
cp ENV.example .env.local
```

Rellena los valores marcados como `TODO_CONFIGURE` con tus claves reales.

## 4. Configuración de Supabase

Si estás usando el proyecto vinculado a Supabase en la nube:

```bash
npx supabase login
npx supabase link --project-ref <TU_PROJECT_REF>
npx supabase db push # Para empujar las migraciones iniciales
```

## 5. Levantar Entorno de Desarrollo

Inicia el servidor Next.js:

```bash
npm run dev
```

El dashboard estará disponible en `http://localhost:3000`.

## 6. Configuración de Creative Engine (Fase 4)
- **Modelo de Imágenes:** Configura `IMAGE_PROVIDER_MODEL=gpt-image-2.5-flare` en `.env.local`.
- **Almacenamiento:** El bucket `creatives` de Supabase Storage se configura como privado. Al ejecutar `npx supabase db push` se crean las políticas de acceso y la estructura de carpetas automáticamente.
- **Costos y Cuota:** Las pruebas unitarias estándar nunca realizan peticiones reales a la red. Si deseas ejecutar una prueba en vivo con OpenAI, define temporalmente `RUN_EXTERNAL_IMAGE_TESTS=true`.

