# IACS Workflow Engine — Agent Instructions

## Stack
TypeScript 5.8 + React 19 + Vite 6 + Express 4 + Supabase + @xyflow/react 12.11.5 + Zustand

## Build
npm run dev    # dev server (Vite + tsx)
npm run lint   # type check (tsc --noEmit)
npm run build  # Vite build + esbuild server.ts
npm start      # serve production build

## Seed (UNA SOLA VEZ por entorno, despues del paso 1)
node seed_workflow.mjs

## Convenciones del modulo de flujos
- Solo src/lib/workflowEngine.ts llama a Supabase para leer el grafo activo
- Los nodos del canvas (src/components/workflow/nodes/) son componentes puros, sin logica de negocio
- Nuevos endpoints van en server.ts despues del bloque "===== WORKFLOW ENGINE API ====="
- El flujo "v1_legacy" es el modelo semilla; no modificar en produccion
- Autosave del canvas: debounce 2 segundos, PATCH /api/workflow/definitions/:id

## Build order
Ver blueprints/iacs-workflow-engine/blueprint.md §9 (16 pasos).
Ver blueprints/iacs-workflow-engine/tasks.json para el estado actual.

## Reglas
- Ejecutar npm run lint despues de cada archivo creado o modificado
- No avanzar al siguiente paso hasta que el Verify pase
- Cada paso termina con git commit + git tag segun el slug del tasks.json
- seed_workflow.mjs se ejecuta exactamente UNA VEZ por entorno (dev, staging, prod)

## Endpoints conservados (off-limits)
Todos los endpoints existentes en server.ts permanecen sin cambio.
Los nuevos endpoints se agregan DESPUES del comentario "===== WORKFLOW ENGINE API =====".
