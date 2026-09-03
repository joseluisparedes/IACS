import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://gftvhbhckrzkgpchnfjm.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmdHZoYmhja3J6a2dwY2huZmptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1OTU4NDEsImV4cCI6MjA5NjE3MTg0MX0.errqmsEdDxGXA4DAqLihOvy1qzMpg14CzxD_NywLUZU';

const supabase = createClient(supabaseUrl, supabaseKey);
const rawJson = fs.readFileSync('./seed_data.json', 'utf8').replace(/^\uFEFF/, '');
const seed = JSON.parse(rawJson);

async function run() {
  const { data: existing } = await supabase
    .from('workflow_definitions')
    .select('id')
    .eq('status', 'published')
    .maybeSingle();

  if (existing) {
    await supabase
      .from('workflow_definitions')
      .update({ graph_json: seed.graph_json })
      .eq('id', existing.id);
    console.log('✓ Flujo publicado actualizado con nuevos handles. ID:', existing.id);
    return;
  }

  const { data: wf, error: wfErr } = await supabase
    .from('workflow_definitions')
    .insert({
      name: seed.name,
      description: seed.description,
      version: 1,
      status: 'published',
      graph_json: seed.graph_json,
      published_at: new Date().toISOString()
    })
    .select()
    .single();

  if (wfErr) {
    console.error('Error insertando workflow:', wfErr);
    process.exit(1);
  }

  const roles = seed.node_roles.map(r => ({ ...r, workflow_id: wf.id }));
  const { error: rolesErr } = await supabase.from('workflow_node_roles').insert(roles);
  if (rolesErr) {
    console.error('Error insertando roles:', rolesErr);
    process.exit(1);
  }

  const transitions = seed.transitions.map(t => ({ ...t, workflow_id: wf.id }));
  const { error: trErr } = await supabase.from('workflow_transitions').insert(transitions);
  if (trErr) {
    console.error('Error insertando transiciones:', trErr);
    process.exit(1);
  }

  console.log('✓ Flujo canonico IACS v1_legacy insertado. ID:', wf.id);
}

run();
