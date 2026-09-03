# IACS — Motor de Flujos de Trabajo Dinámico e Inteligente — Blueprint

> Generado por The Architect el 2026-08-28  
> Shape: Internal Tool  
> Runtime track: TypeScript / Node.js  
> Emission mode: Bundle (16 pasos)  
> Blueprint version: 1  
> Versiones verificadas: 2026-08-28 — ver §11

---

## 1. Visión General y No-Metas

### Estado actual

IACS tiene un flujo de aprobación de iniciativas codificado estáticamente:
- **Roles fijos**: `registrador` → `bp_ti` → demanda
- **Estados**: `Borrador | Pendiente de aprobación | Observada | Desestimada | En demanda` — literales en `src/types.ts` L3–8
- **Transiciones**: hardcodeadas en `InitiativeDetail.tsx` `updateInitiativeData()` ~L968 y en `server.ts` PATCH `/api/initiatives/:id`
- **VoBo VP**: gateway condicional basado en `form_data._vobo_status`
- **Página de documentación**: `StateFlow.tsx` en `/admin/flujo-estados` — 541 líneas, hardcodeada, read-only

### Estado objetivo

Un módulo visual de diseño y ejecución de flujos de trabajo donde:
- El administrador dibuja visualmente estados, transiciones, gateways y nodos de IA en un canvas interactivo
- El flujo se publica y versionea; el motor dinámico lo evalúa en runtime
- El flujo canónico actual está precargado como `v1_legacy` desde el día uno

### Usuarios

| Persona | Qué hace aquí | Frecuencia |
|---|---|---|
| Admin | Diseña, versiona, prueba y publica flujos | Semanal |
| BP TI | Opera iniciativas bajo el flujo activo | Diaria |
| Registrador | Registra iniciativas según el flujo activo | Diaria |

### Metas v1

1. Canvas visual con 5 tipos de nodo (Estado, Gateway, IA Chat, IA Texto, Aprobación Humana)
2. Flujo IACS canónico precargado (11 nodos, 12 edges)
3. Publicación y versionamiento (draft → published → archived)
4. Motor de ejecución dinámico que reemplaza las validaciones hardcodeadas
5. Gestor de roles: asignación manual + carga masiva Excel
6. Simulador / Sandbox: pruebas paso a paso antes de publicar

### No-Metas v1

| Fuera del alcance | Revisar cuando |
|---|---|
| Migración automática de iniciativas existentes | El equipo defina criterios por estado |
| Notificaciones configurables por nodo | El motor lleve 2+ sprints en producción |
| Flujos paralelos (fork/join BPMN) | Se identifique el caso de uso real |
| Editor de condiciones CEL/JSONLogic | Las condiciones superen 3 variables por transición |
| Integración con Jira/ServiceNow | El negocio confirme la integración concreta |
| App móvil del canvas | Se identifique necesidad real |

---

## 2. Stack Tecnológico

| Capa | Elección | Por qué |
|---|---|---|
| Lenguaje / runtime | TypeScript 5.8 + Node.js (tsx dev, esbuild prod) | Ya en el repo |
| Frontend | React 19 + Vite 6 (SPA) | Ya en el repo; brownfield, no migrar a Next.js |
| Canvas | `@xyflow/react` **12.11.5** | Estándar de facto; nodos completamente personalizables |
| Styling | Tailwind CSS v4 | Ya en el repo |
| Estado canvas | Zustand | Liviano, sin boilerplate; recomendado por React Flow |
| Base de datos | Supabase PostgreSQL | Ya en el repo; migración aditiva |
| Backend / API | Express en `server.ts` | Ya en el repo; nuevos endpoints al final del archivo |
| Auth | Supabase Auth + `requireAdminAuth` existente | Sin cambio |
| IA (nodos) | `@google/genai` + `groq-sdk` | Reutilizar `/api/chat` y `/api/fields/analyze-unstructured` |
| Carga masiva | `xlsx` | Ya en el repo (`/admin/cargas-masivas`) |
| Package manager | npm | Ya en el repo (package-lock.json) |

**Compatibilidad verificada:** ninguna combinación conocida-mala de `knowledge/stack-compatibility.md` aplica.

---

## 3. Estructura de Directorios — Delta

```
d:/ProyectosJLPH/IACS/IACS/
├── src/
│   ├── pages/
│   │   ├── WorkflowEditor.tsx          [NEW]
│   │   ├── WorkflowSimulator.tsx       [NEW]
│   │   └── StateFlow.tsx               [MODIFY] — leer flujo activo de API
│   ├── components/
│   │   └── workflow/
│   │       ├── nodes/
│   │       │   ├── StateNode.tsx       [NEW]
│   │       │   ├── GatewayNode.tsx     [NEW]
│   │       │   ├── AIAgentNode.tsx     [NEW]
│   │       │   ├── AITextNode.tsx      [NEW]
│   │       │   └── HumanTaskNode.tsx   [NEW]
│   │       ├── WorkflowToolbar.tsx     [NEW]
│   │       ├── NodeConfigPanel.tsx     [NEW]
│   │       ├── WorkflowVersionBar.tsx  [NEW]
│   │       └── RoleAssignmentTable.tsx [NEW]
│   ├── lib/
│   │   ├── workflowEngine.ts           [NEW]
│   │   ├── workflowSeed.ts             [NEW]
│   │   └── workflowStore.ts            [NEW]
│   └── types.ts                        [MODIFY] — tipos Workflow*
├── supabase/migrations/
│   └── 20260828000000_workflow_engine.sql  [NEW]
├── server.ts                            [MODIFY] — endpoints /api/workflow/*
├── seed_workflow.mjs                    [NEW] — script one-shot
└── seed_data.json                       [NEW] — JSON del seed
```

**Reglas de límite:**
- Solo `workflowEngine.ts` lee el grafo activo de Supabase
- Nodos del canvas son componentes puros (sin lógica de negocio)
- Solo los endpoints `/api/workflow/*` escriben en las tablas de flujo

---

## 4. Modelo de Datos

### Tablas nuevas

**`workflow_definitions`** — Topología del flujo; lifecycle: `draft → published → archived`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid PK` | |
| `name` | `text NOT NULL` | ej. "Flujo de Iniciativas v2" |
| `version` | `integer NOT NULL DEFAULT 1` | Incremental al publicar |
| `status` | `text CHECK('draft','published','archived')` | Un único `published` (unique index parcial) |
| `graph_json` | `jsonb NOT NULL DEFAULT '{}'` | Nodos y edges en formato React Flow |
| `description` | `text` | |
| `created_by` | `uuid → profiles.id` | |
| `created_at`, `updated_at` | `timestamptz NOT NULL DEFAULT now()` | |
| `published_at` | `timestamptz` | |

**`workflow_node_roles`** — Permisos de rol por nodo

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid PK` | |
| `workflow_id` | `uuid → workflow_definitions CASCADE` | |
| `node_id` | `text NOT NULL` | ID del nodo en graph_json |
| `role_name` | `text NOT NULL` | ej. "bp_ti", "registrador" |
| `can_edit`, `can_approve`, `can_reject` | `boolean NOT NULL DEFAULT false` | |
| `required_fields` | `jsonb NOT NULL DEFAULT '[]'` | field_keys requeridos para transicionar |

**`workflow_transitions`** — Condiciones de las aristas

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid PK` | |
| `workflow_id` | `uuid CASCADE` | |
| `edge_id`, `label` | `text NOT NULL` | |
| `source_node_id`, `target_node_id` | `text NOT NULL` | |
| `condition_type` | `text CHECK('always','field_required','vobo_check','role_only')` | |
| `condition_config` | `jsonb NOT NULL DEFAULT '{}'` | |

**`workflow_role_assignments`** — Usuarios asignados a roles de un flujo

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid PK` | |
| `workflow_id`, `user_id`, `role_name` | | `UNIQUE(workflow_id, user_id, role_name)` |
| `assigned_by` | `uuid → profiles.id` | |

**`workflow_audit_log`** — Registro append-only

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid PK` | |
| `workflow_id`, `actor_id` | `uuid` | |
| `action` | `text NOT NULL` | ej. 'publish', 'simulate' |
| `details` | `jsonb DEFAULT '{}'` | |

**Modificación de `initiatives`:**

```sql
ALTER TABLE initiatives
  ADD COLUMN IF NOT EXISTS workflow_version text,
  ADD COLUMN IF NOT EXISTS current_node_id text;
```

### Índices

```sql
CREATE UNIQUE INDEX workflow_definitions_one_published ON workflow_definitions(status) WHERE status='published';
CREATE INDEX idx_workflow_node_roles_lookup ON workflow_node_roles(workflow_id, node_id);
CREATE INDEX idx_workflow_transitions_lookup ON workflow_transitions(workflow_id, source_node_id);
CREATE INDEX idx_workflow_role_assignments_lookup ON workflow_role_assignments(workflow_id, user_id);
CREATE INDEX idx_initiatives_workflow ON initiatives(workflow_version, current_node_id) WHERE workflow_version IS NOT NULL;
```

---

## 5. Diseño de API — Delta

Base path: `/api/workflow`

| Método | Path | Auth | Descripción |
|---|---|---|---|
| GET | `/active` | autenticado | Flujo publicado con roles y transiciones (cache 60s) |
| GET | `/definitions` | admin | Lista todos los flujos |
| POST | `/definitions` | admin | Crear draft (o clonar) |
| GET | `/definitions/:id` | admin | Flujo completo |
| PATCH | `/definitions/:id` | admin | Actualizar draft |
| POST | `/definitions/:id/publish` | admin | Publicar; archiva el anterior; audit log |
| POST | `/definitions/:id/roles` | admin | Upsert workflow_node_roles |
| GET | `/definitions/:id/assignments` | admin | Lista asignaciones usuario-rol |
| POST | `/definitions/:id/assignments` | admin | Asignar usuario |
| DELETE | `/definitions/:id/assignments/:aId` | admin | Remover asignación |
| POST | `/definitions/:id/assignments/bulk` | admin | Carga masiva Excel |
| POST | `/simulate` | admin | Transición ficticia en sandbox |
| GET | `/validate-transition` | autenticado | Valida transición real |

**`POST /definitions/:id/publish`** — Efectos:
1. Archive el published anterior
2. Publish este draft (version++)
3. Insert audit_log + `invalidateWorkflowCache()`

---

## 6. Arquitectura Frontend

### Rutas nuevas

| Ruta | Página | Auth |
|---|---|---|
| `/admin/workflow-editor` | WorkflowEditor | admin |
| `/admin/workflow-editor/:id` | WorkflowEditor | admin |
| `/admin/workflow-simulator` | WorkflowSimulator | admin |
| `/admin/flujo-estados` (existente) | StateFlow (modificada) | admin |

### Árbol de componentes — WorkflowEditor

```
WorkflowEditor
├── WorkflowVersionBar (top: nombre, versión, estado, Guardar/Publicar/Simular)
├── WorkflowToolbar (left w-48: cards arrastrables por tipo de nodo)
├── ReactFlowProvider
│   └── ReactFlow (center: canvas interactivo)
│       ├── StateNode, GatewayNode, AIAgentNode, AITextNode, HumanTaskNode
│       ├── CustomEdge con label y badge de condición
│       └── Controls, MiniMap, Background
└── NodeConfigPanel (right w-72: tabs Config/Roles/Campos)
    ├── RolePermissionsForm
    ├── RequiredFieldsSelector
    ├── TransitionConditionForm
    └── AINodeConfig
```

### workflowStore (Zustand)

`nodes`, `edges`, `selectedNodeId`, `isDirty`, `activeWorkflowId`, `isSaving` + setters + `updateNodeData(nodeId, data)`.  
Autosave debounce 2 segundos si `isDirty`.

---

## 7. Sistema de Diseño

Design system heredado de IACS. Sin modificaciones.

**Colores de nodos del canvas:**

| Tipo de nodo | Color | Token |
|---|---|---|
| Estado (borrador, pendiente) | Indigo/azul suave | `#4F5AF5` para selección |
| Gateway | Ámbar | `bg-amber-50 border-amber-400` |
| IA (chat y texto) | Violeta | `bg-violet-50 border-violet-300` |
| Aprobación humana | Índigo | `bg-indigo-50 border-indigo-300` |
| Final (demanda) | Esmeralda | `bg-emerald-50 border-emerald-400` |
| Error (desestimada) | Rojo | `bg-red-50 border-red-400` |

---

## 8. Autenticación y Autorización

Sin cambios en proveedor (Supabase Auth) ni flujos de login.

| Superficie | Enforcement |
|---|---|
| `/admin/workflow-editor`, `/admin/workflow-simulator` | `AdminRoute` client-side + `requireAdminAuth` server-side |
| `/api/workflow/*` escritura | `requireAdminAuth` middleware existente |
| `/api/workflow/active`, `/api/workflow/validate-transition` | Sesión Supabase válida |

---

## 9. BUILD ORDER

### Paso 1 — Migración de base de datos

```bash
# Do: crear supabase/migrations/20260828000000_workflow_engine.sql con el SQL del §4
# Aplicar:
npx supabase db push
# O ejecutar el SQL en el SQL Editor del panel de Supabase
```

**Done when:** Las 5 tablas `workflow_*` y las columnas `workflow_version`, `current_node_id` en `initiatives` existen en la DB.

```bash
# Verify:
npx supabase db execute --sql "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'workflow_%' ORDER BY table_name;"
# expect: 5 filas

npx supabase db execute --sql "SELECT column_name FROM information_schema.columns WHERE table_name='initiatives' AND column_name IN ('workflow_version','current_node_id') ORDER BY column_name;"
# expect: 2 filas
```

```bash
# Checkpoint:
git add supabase/migrations/20260828000000_workflow_engine.sql
git commit -m "step 01: workflow-db-schema"
git tag step-01-workflow-db-schema
```

---

### Paso 2 — Tipos TypeScript y workflowEngine base

**Do:** Agregar al final de `src/types.ts`:
```typescript
export type WorkflowNodeType = 'state' | 'gateway' | 'ai_agent' | 'ai_text' | 'human_task' | 'start' | 'end';
export interface WorkflowNodeData { label: string; nodeType: WorkflowNodeType; description?: string; roles?: WorkflowNodeRole[]; requiredFields?: string[]; aiConfig?: { promptTemplate?: string; outputFields?: string[] }; }
export interface WorkflowNodeRole { role_name: string; can_edit: boolean; can_approve: boolean; can_reject: boolean; }
export interface WorkflowTransitionConfig { edge_id: string; label: string; source_node_id: string; target_node_id: string; condition_type: 'always' | 'field_required' | 'vobo_check' | 'role_only'; condition_config: Record<string, unknown>; }
export interface WorkflowDefinition { id: string; name: string; version: number; status: 'draft' | 'published' | 'archived'; graph_json: { nodes: any[]; edges: any[] }; description?: string; created_at: string; updated_at: string; published_at?: string; }
export interface WorkflowTransitionResult { allowed: boolean; reason?: string; missing_fields?: string[]; next_node_id?: string; }
```

Crear `src/lib/workflowEngine.ts` con:
- `getActiveWorkflow()` — Supabase SELECT con cache 60s
- `validateTransition(params)` — evalúa en orden: modo legacy → transición no existe → sin permiso de rol → campos faltantes → vobo_check → allowed
- `invalidateWorkflowCache()` — resetea cache

**Done when:** `npm run lint` completa sin errores.

```bash
# Verify:
npm run lint
# expect: exit 0

# Checkpoint:
git add src/types.ts src/lib/workflowEngine.ts
git commit -m "step 02: workflow-types-engine"
git tag step-02-workflow-types-engine
```

---

### Paso 3 — Seed del flujo canónico IACS v1_legacy

**Do:** Crear `src/lib/workflowSeed.ts` con `IACS_LEGACY_SEED` conteniendo:

**11 nodos:**
| node_id | type | label |
|---|---|---|
| `start` | start | Inicio |
| `borrador` | state | Borrador |
| `ai_chat` | ai_agent | Asistente IA (Chat) |
| `ai_text` | ai_text | Extracción de Texto IA |
| `pendiente` | state | Pendiente de aprobación |
| `gw_vobo` | gateway | ¿VoBo VP adjunto? |
| `observada` | state | Observada |
| `demanda` | state | En demanda |
| `desestimada` | state | Desestimada |
| `end` | end | Fin |

**12 edges:**
start→borrador, borrador→ai_chat, borrador→ai_text, borrador→pendiente, pendiente→gw_vobo, gw_vobo→demanda, gw_vobo→observada, gw_vobo→desestimada, observada→pendiente, desestimada→pendiente, desestimada→demanda, demanda→end.

**8 configuraciones de roles de nodo:**
borrador/registrador (edit+approve), borrador/admin (edit+approve), pendiente/bp_ti (approve+reject), pendiente/admin (approve+reject), observada/registrador (edit+approve), observada/bp_ti (edit), desestimada/bp_ti (approve), desestimada/admin (approve).

**7 transiciones con condiciones:**
borrador→pendiente: field_required, gw_vobo→demanda: vobo_check, gw_vobo→observada: always, gw_vobo→desestimada: role_only, observada→pendiente: always, desestimada→pendiente: always, desestimada→demanda: always.

Crear `seed_data.json` (JSON de `IACS_LEGACY_SEED`) y `seed_workflow.mjs`. Ejecutar: `node seed_workflow.mjs`.

**Done when:** script imprime confirmación con UUID; DB tiene 1 workflow published, 8 node_roles.

```bash
# Verify:
node seed_workflow.mjs
# expect: "✓ Flujo canónico IACS v1_legacy insertado. ID: <uuid>"

npx supabase db execute --sql "SELECT count(*)::int as c FROM workflow_definitions WHERE status='published';"
# expect: c = 1

npx supabase db execute --sql "SELECT count(*)::int as c FROM workflow_node_roles;"
# expect: c = 8

# Checkpoint:
git add src/lib/workflowSeed.ts seed_workflow.mjs seed_data.json
git commit -m "step 03: workflow-seed-legacy"
git tag step-03-workflow-seed-legacy
```

---

### Paso 4 — Endpoints REST /api/workflow/* en server.ts

**Do:** Agregar bloque `// ===== WORKFLOW ENGINE API =====` al final de `server.ts` con los 13 endpoints del §5. `POST /definitions/:id/publish` llama a `invalidateWorkflowCache()` después de publicar.

**Done when:** `GET /api/workflow/active` devuelve HTTP 200 con el flujo v1_legacy. `POST /api/workflow/definitions` sin token devuelve HTTP 401.

```bash
# Verify:
npm run dev &
sleep 4
test "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/api/workflow/active)" = "200"
# expect: exit 0
test "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:3000/api/workflow/definitions -H 'Content-Type: application/json' -d '{\"name\":\"t\"}')" = "401"
# expect: exit 0
kill %1

# Checkpoint:
git add server.ts
git commit -m "step 04: workflow-api-endpoints"
git tag step-04-workflow-api-endpoints
```

---

### Paso 5 — Componentes de nodo del canvas

**Do:** Crear los 5 archivos en `src/components/workflow/nodes/`. Cada nodo usa `Handle` de `@xyflow/react` en las 4 posiciones. Colores según la paleta del §7. StateNode: selected → `ring-2 ring-[#4F5AF5]`. GatewayNode: `transform: rotate(45deg)`, `bg-amber-50`. AI*Node: `bg-violet-50`. HumanTaskNode: `bg-indigo-50`, badges de permisos.

```bash
# Verify:
npm run lint
# expect: exit 0

# Checkpoint:
git add src/components/workflow/nodes/
git commit -m "step 05: workflow-canvas-nodes"
git tag step-05-workflow-canvas-nodes
```

---

### Paso 6 — WorkflowStore (Zustand) y paneles

**Do:**
1. `npm show zustand version` — verificar versión stable.
2. `npm install zustand`
3. Crear `src/lib/workflowStore.ts` con el store.
4. Crear `WorkflowToolbar.tsx` (panel izquierdo, cards arrastrables con `onDragStart`).
5. Crear `NodeConfigPanel.tsx` (panel derecho, tabs, edita node data via `updateNodeData`).

```bash
# Verify:
npm install zustand && npm run lint
# expect: exit 0

# Checkpoint:
git add src/lib/workflowStore.ts src/components/workflow/WorkflowToolbar.tsx src/components/workflow/NodeConfigPanel.tsx package.json package-lock.json
git commit -m "step 06: workflow-store-panels"
git tag step-06-workflow-store-panels
```

---

### Paso 7 — Instalación de @xyflow/react y WorkflowVersionBar

**Do:**
1. `npm install @xyflow/react`
2. `src/index.css`: agregar `@import '@xyflow/react/dist/style.css';` al inicio.
3. Crear `WorkflowVersionBar.tsx`: nombre, badge versión/estado, botones Guardar/Publicar/Simular, badge "Sin guardar" rojo.

```bash
# Verify:
node -e "const p=JSON.parse(require('fs').readFileSync('package.json','utf8')); process.exit(p.dependencies['@xyflow/react'] ? 0 : 1);"
# expect: exit 0

npm run lint
# expect: exit 0

# Checkpoint:
git add src/components/workflow/WorkflowVersionBar.tsx src/index.css package.json package-lock.json
git commit -m "step 07: xyflow-install-versionbar"
git tag step-07-xyflow-install-versionbar
```

---

### Paso 8 — WorkflowEditor (página principal del canvas)

**Do:** Crear `src/pages/WorkflowEditor.tsx`:
- useEffect: carga flujo por `:id` o crea draft clonando el activo.
- nodeTypes registrados: state, gateway, ai_agent, ai_text, human_task, start, end.
- onNodesChange / onEdgesChange → store + autosave debounce 2s.
- onNodeClick → setSelectedNodeId.
- onConnect → añadir edge `label: 'Nueva transición'`.
- onDrop → crear nodo del tipo del dataTransfer.
- Layout: VersionBar top | Toolbar left | ReactFlow center | ConfigPanel right.

**Done when:** Canvas carga con 11 nodos del flujo v1_legacy. Click en nodo → NodeConfigPanel muestra su configuración.

```bash
# Verify:
npm run dev &
sleep 5
curl -s -o /dev/null -w "%{http_code}" http://localhost:5173
# expect: 200
kill %1
npm run lint
# expect: exit 0

# Checkpoint:
git add src/pages/WorkflowEditor.tsx
git commit -m "step 08: workflow-editor-canvas"
git tag step-08-workflow-editor-canvas
```

---

### Paso 9 — Routing en App.tsx

**Do:**
1. Importar `WorkflowEditor`, `WorkflowSimulator`.
2. Agregar 3 rutas en `<Routes>` (editor sin id, editor con id, simulador) dentro de `AdminRoute`.
3. Agregar en `adminGroups`: `{ name: 'Editor de Flujos', path: '/admin/workflow-editor', icon: Workflow }`, `{ name: 'Simulador de Flujos', path: '/admin/workflow-simulator', icon: Play }`.
4. Agregar ambas rutas a `ADMIN_PATHS`.
5. Importar `Workflow`, `Play` de `lucide-react`.

```bash
# Verify:
npm run lint
# expect: exit 0

# Checkpoint:
git add src/App.tsx
git commit -m "step 09: app-routing-workflow"
git tag step-09-app-routing-workflow
```

---

### Paso 10 — RoleAssignmentTable

**Do:** Crear `src/components/workflow/RoleAssignmentTable.tsx`:
- Tabla: Nombre, Rol, Remover.
- Selector usuario + selector rol + botón "Asignar" → POST `.../assignments`.
- Botón "Cargar Excel" → file picker → parsear xlsx → POST `.../assignments/bulk`.
- Mostrar "X insertadas, Y saltadas."
- Integrar como tab "Asignaciones" en `WorkflowEditor.tsx`.

```bash
# Verify:
npm run lint
# expect: exit 0

# Checkpoint:
git add src/components/workflow/RoleAssignmentTable.tsx src/pages/WorkflowEditor.tsx
git commit -m "step 10: role-assignment-table"
git tag step-10-role-assignment-table
```

---

### Paso 11 — WorkflowSimulator

**Do:** Crear `src/pages/WorkflowSimulator.tsx`:
- Panel izq: formulario (flujo, nodo inicial, rol, form_data).
- Panel centro: canvas read-only con nodo actual iluminado (`ring-4 ring-[#4F5AF5]`), camino recorrido en verde.
- Panel der: historial de pasos.
- Al clic en transición → POST `/api/workflow/simulate` → mover nodo iluminado o mostrar error.
- Botón "Reiniciar" → volver al nodo inicial.

**Done when:**
- "Enviar a aprobación" con rol registrador y campos mínimos → avanza a "Pendiente".
- "Aprobar" con rol registrador → reason "El rol 'registrador' no puede realizar 'Aprobar'".

```bash
# Verify:
npm run lint
# expect: exit 0

# Checkpoint:
git add src/pages/WorkflowSimulator.tsx
git commit -m "step 11: workflow-simulator"
git tag step-11-workflow-simulator
```

---

### Paso 12 — StateFlow.tsx: vista dinámica del flujo activo

**Do:** Modificar `StateFlow.tsx`:
1. useEffect → GET `/api/workflow/active`.
2. Si `data !== null`: React Flow read-only con los nodos del flujo activo; tabla de transiciones desde `workflow_transitions`.
3. Si `data === null`: fallback al contenido hardcodeado actual.
4. Preservar UX de expansión/colapso.

**Done when:** Con v1_legacy publicado, `/admin/flujo-estados` muestra el grafo dinámico. Sin flujo publicado → fallback sin errores.

```bash
# Verify:
npm run lint
# expect: exit 0

# Checkpoint:
git add src/pages/StateFlow.tsx
git commit -m "step 12: stateflow-dynamic-view"
git tag step-12-stateflow-dynamic-view
```

---

### Paso 13 — Integración del WorkflowEngine en InitiativeDetail.tsx

**Do:** Agregar en `InitiativeDetail.tsx`:

```typescript
const STATUS_TO_NODE_ID: Record<string, string> = {
  'Borrador': 'borrador', 'Pendiente de aprobación': 'pendiente',
  'Observada': 'observada', 'En demanda': 'demanda', 'Desestimada': 'desestimada',
};
```

Antes de cada acción de transición, llamar a GET `/api/workflow/validate-transition`. Si `!allowed` → mostrar `reason` y retornar. Si `allowed` → continuar con lógica existente.

**Done when:** Registrador que intenta "Aprobar" ve el mensaje de permiso denegado del motor.

```bash
# Verify:
npm run lint
# expect: exit 0

# Checkpoint:
git add src/pages/InitiativeDetail.tsx
git commit -m "step 13: workflow-engine-integration"
git tag step-13-workflow-engine-integration
```

---

### Paso 14 — PATCH /api/initiatives/:id actualizado en server.ts

**Do:** En el endpoint PATCH de iniciativas, agregar:
```typescript
const STATUS_TO_NODE_ID: Record<string, string> = { 'Borrador':'borrador', 'Pendiente de aprobación':'pendiente', 'Observada':'observada', 'En demanda':'demanda', 'Desestimada':'desestimada' };
if (req.body.status && STATUS_TO_NODE_ID[req.body.status]) {
  updates.current_node_id = STATUS_TO_NODE_ID[req.body.status];
}
if (!existingInitiative.workflow_version) {
  const { data: wf } = await supabase.from('workflow_definitions').select('id').eq('status','published').maybeSingle();
  if (wf) updates.workflow_version = wf.id;
}
```

**Done when:** Al cambiar status de "Borrador" a "Pendiente de aprobación", `current_node_id = 'pendiente'` queda en DB.

```bash
# Verify:
npm run lint
# expect: exit 0

# Checkpoint:
git add server.ts
git commit -m "step 14: server-workflow-node-tracking"
git tag step-14-server-workflow-node-tracking
```

---

### Paso 15 — Build de producción y verificación E2E

**Do:** `npm run build` → `npm start` → verificación manual end-to-end del flujo completo.

**Done when:** `npm run build` completa sin errores; `/api/workflow/active` devuelve HTTP 200 con el flujo activo.

```bash
# Verify:
npm run build
# expect: exit 0, "built in X.XXs"

npm start &
sleep 3
test "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/api/workflow/active)" = "200"
# expect: exit 0
kill %1

# Checkpoint:
git add -A
git commit -m "step 15: production-build-verification"
git tag step-15-production-build-verification
```

---

### Paso 16 — Documentación y cleanup

**Do:**
1. Actualizar `README.md` con sección "Motor de Flujos de Trabajo".
2. Agregar `seed_workflow.mjs` y `seed_data.json` a `.gitignore`.
3. Verificar que `/admin/flujo-estados` muestra el grafo dinámico.

```bash
# Verify:
npm run lint
# expect: exit 0
grep -q "Motor de Flujos" README.md
# expect: exit 0

# Checkpoint:
git add README.md .gitignore
git commit -m "step 16: docs-cleanup"
git tag step-16-docs-cleanup
```

---

## 10. Bootstrap

```bash
cd d:/ProyectosJLPH/IACS/IACS

# Verificar estado del repo
npm run lint   # expect: exit 0

# Instalar nuevas dependencias (pasos 6 y 7)
npm show zustand version    # verificar antes de instalar
npm install zustand
npm install @xyflow/react   # versión 12.11.5 verificada 2026-08-28

# Aplicar migración (paso 1)
npx supabase db push
# o ejecutar SQL manualmente en panel Supabase

# Insertar flujo canónico (paso 3, UNA SOLA VEZ por entorno)
node seed_workflow.mjs
```

**Variables de entorno:** mismas que el proyecto usa actualmente (`.env`). Sin variables nuevas.

---

## 11. Procedencia de Versiones

| Paquete | Versión | Estado | Fuente | Fecha |
|---|---|---|---|---|
| `@xyflow/react` | **12.11.5** | VERIFICADO | registry.npmjs.org dist-tags | 2026-08-28 |
| `zustand` | VERIFY: `npm show zustand version` | NO VERIFICADO | registry.npmjs.org | 2026-08-28 |
| `react` | ^19.0.1 | VERIFICADO | package.json del repo | 2026-08-28 |
| `@supabase/supabase-js` | ^2.107.0 | VERIFICADO | package.json del repo | 2026-08-28 |
| `@google/genai` | ^2.4.0 | VERIFICADO | package.json del repo | 2026-08-28 |
| `typescript` | ~5.8.2 | VERIFICADO | package.json del repo | 2026-08-28 |
| `vite` | ^6.2.3 | VERIFICADO | package.json del repo | 2026-08-28 |
| `xlsx` | ^0.18.5 | VERIFICADO | package.json del repo | 2026-08-28 |

---

## 12. Release y Rollback

### Release
1. Aplicar migración SQL (aditiva, no rompe nada)
2. Desplegar código
3. `node seed_workflow.mjs` en producción (una sola vez)

### Rollback por paso
`git reset --hard step-{N-1}-{slug}` + redesploy.

### Rollback completo de datos
```sql
ALTER TABLE initiatives DROP COLUMN workflow_version;
ALTER TABLE initiatives DROP COLUMN current_node_id;
DROP TABLE workflow_audit_log;
DROP TABLE workflow_role_assignments;
DROP TABLE workflow_transitions;
DROP TABLE workflow_node_roles;
DROP TABLE workflow_definitions;
```

---

## 13. Observabilidad

Usar el sistema de `agent_logs` existente. Nuevos tipos:
- `workflow_engine_error` — cuando `validateTransition` falla inesperadamente
- `workflow_publish` — cuando se publica un flujo
- `workflow_simulation` — resultado de cada simulación

---

## 14. Tests

NOT APPLICABLE — sin suite de tests automáticos en el repo. El Simulador (paso 11) actúa como herramienta de testing. Revisar cuando el equipo adopte Vitest.

---

## 15–18. Accesibilidad / i18n / Seguridad / Privacidad

**Accesibilidad:** NOT APPLICABLE — canvas para admins en escritorio; React Flow incluye soporte de teclado básico.  
**i18n:** NOT APPLICABLE — app 100% en español.  
**Seguridad:** Todos los endpoints de escritura protegidos por `requireAdminAuth`. `graph_json` es topología pura, sin ejecución de código. `seed_workflow.mjs` usa `SUPABASE_SERVICE_ROLE_KEY` — solo en entornos seguros.  
**Privacidad:** NOT APPLICABLE — sin procesamiento de datos personales nuevo.

---

## 19. Archivos del Workspace

### §19.1 CLAUDE.md (agregar/fusionar)

```markdown
## Motor de Flujos de Trabajo — IACS Workflow Engine

### Nuevas dependencias
- `@xyflow/react` 12.11.5 — canvas visual
- `zustand` — store del canvas

### Comandos
- `npm run dev`, `npm run lint`, `npm run build`, `npm start`
- `node seed_workflow.mjs` — insertar flujo canónico (una sola vez por entorno)

### Convenciones del módulo
- Solo `src/lib/workflowEngine.ts` llama a Supabase para leer el grafo activo
- Los nodos del canvas son componentes puros (sin lógica de negocio)
- Nuevos endpoints van en server.ts después de "===== WORKFLOW ENGINE API ====="
- El flujo "v1_legacy" es el modelo semilla; no modificar en producción
- Autosave del canvas: debounce 2s → PATCH /api/workflow/definitions/:id
```

### §19.2 AGENTS.md (agregar/fusionar)

```markdown
## Workflow Engine Module

Build from blueprints/iacs-workflow-engine/blueprint.md, one step at a time.
Do not start a step until the previous Verify passes.
Run `npm run lint` after every file you create or modify.
seed_workflow.mjs runs exactly once per environment.
```

### §19.3 .claude/settings.json

```json
{
  "allowedCommands": [
    "npm run dev", "npm run lint", "npm run build", "npm start",
    "npm install", "npm show",
    "node seed_workflow.mjs",
    "npx supabase db push", "npx supabase db execute",
    "curl", "test", "grep", "ls", "cat", "kill"
  ]
}
```

### §19.6 Cross-artifact value reconciliation

| Valor | Fuente única | Usado en |
|---|---|---|
| `@xyflow/react` 12.11.5 | §11 | npm install, package.json |
| Puerto 3000 | `.env` existente | Comandos `curl` en Verify blocks |
| `workflow_definitions` | §4 schema SQL | §5, §9, workflowEngine.ts |
| Node IDs del flujo (borrador, pendiente...) | workflowSeed.ts `IACS_LEGACY_SEED` | STATUS_TO_NODE_ID en InitiativeDetail.tsx y server.ts |
| 11 nodos / 8 roles del v1_legacy | workflowSeed.ts | Verify pasos 3 y 8, gate final §20.1 |

---

## 20. Post-Build

### §20.1 Gates manuales finales

```bash
# 1. Todos los tags de paso presentes
git tag -l 'step-*' | sort
# expect: step-01 a step-16

# 2. Flujo v1_legacy publicado
curl -s http://localhost:3000/api/workflow/active | grep -q "v1_legacy"
# expect: exit 0

# 3. Iniciativas legacy sin current_node_id
npx supabase db execute --sql "SELECT count(*)::int as c FROM initiatives WHERE current_node_id IS NOT NULL;"
# expect: c = 0

# 4. Canvas carga 11 nodos
curl -s http://localhost:3000/api/workflow/active | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); process.exit(d.data?.graph_json?.nodes?.length===11?0:1);"
# expect: exit 0
```

### §20.2 Registro de Riesgos

| Riesgo | Mitigación |
|---|---|
| `current_node_id` null en iniciativas existentes (esperado) | Motor opera en modo legacy cuando null |
| React Flow breaking changes en versión futura | Pinear exactamente `12.11.5` |
| RLS bloquea INSERT del seed | Usar `SUPABASE_SERVICE_ROLE_KEY` en seed_workflow.mjs |
| Dos admins editando el mismo draft | Last-write-wins; aceptable en v1 |
| Simulador no cubre todos los casos del VoBo VP | Casos edge se validan en producción con el flujo legacy existente |

### §20.3 Decision Log

| Decisión | Alternativa rechazada | Criterio de reversión |
|---|---|---|
| `@xyflow/react` para el canvas | mermaid.js, canvas HTML5 custom | Breaking changes que requieran reescribir nodos en cada major |
| Zustand para store del canvas | Redux Toolkit | Si el editor necesita más de 5 slices interconectados |
| `graph_json` JSONB monolítico | Tablas normalizadas de nodos y edges | Si se necesitan queries SQL complejas sobre el grafo |
| Coexistencia legacy (sin migración automática) | Migración automática | Cuando el negocio defina criterios de migración por estado |
| Seed como script one-shot | Generación automática al abrir el editor | Si se necesita reproducibilidad exacta en staging/QA |
