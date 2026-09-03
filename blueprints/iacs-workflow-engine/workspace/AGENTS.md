# IACS Workflow Engine — Agents Instructions

## Overview
This module adds a Visual Workflow Engine to IACS (brownfield).
Build from blueprints/iacs-workflow-engine/blueprint.md, one step at a time.

## Rules
1. Do not start a step until the previous Verify passes (exit 0)
2. Run `npm run lint` after EVERY file you create or modify
3. End each step with git commit + git tag matching the slug in tasks.json
4. The seed script (seed_workflow.mjs) runs exactly once per environment
5. Do NOT modify existing endpoints in server.ts — only add after the marker comment
6. Do NOT remove the hardcoded logic in InitiativeDetail.tsx — add the engine as an additional layer

## Step status tracking
Check tasks.json for current step and status.
Update tasks.json after each step: "pending" -> "in_progress" -> "done"

## Key files
- src/lib/workflowEngine.ts — ONLY file that reads the active workflow graph from Supabase
- src/lib/workflowStore.ts  — Zustand store for the canvas editor state
- src/lib/workflowSeed.ts   — IACS v1_legacy canonical flow definition
- server.ts (WORKFLOW ENGINE API section) — all /api/workflow/* endpoints
- supabase/migrations/20260828000000_workflow_engine.sql — DB migration
