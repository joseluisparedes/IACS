export const IACS_OFFICIAL_SEED = {
  name: 'Flujo Oficial de Gestión de la Demanda v2',
  description: 'Flujo corporativo completo: Registro -> BP TI -> BO -> VP -> Gestor Demanda -> Estimación Dominio -> VoBo Negocio -> Planificación de Fechas -> Cartera TI',
  graph_json: {
    nodes: [
      // ── FASE 1: REGISTRO Y GOBERNANZA INICIAL ─────────────────────────────
      { 
        id: 'start', 
        type: 'start', 
        position: { x: 60, y: 180 }, 
        data: { label: 'Inicio', nodeType: 'start' } 
      },
      { 
        id: 'borrador', 
        type: 'state', 
        position: { x: 240, y: 140 }, 
        data: { 
          label: '1. Borrador', 
          nodeType: 'state', 
          stateSubtype: 'standard',
          dispatchMode: 'general_inbox',
          form_id: '3bced73d-aa15-43ba-b9fe-54a92e5d2504', // form_registro_iniciativa
          consent_id: '97ebfe95-3e3a-426b-a4ed-4f6fd40259d1', // consent_key_user
          action_label: 'Guardar Borrador',
          description: 'Registro inicial de la necesidad TI por el Key User con asistencia de TEO IA.' 
        } 
      },
      { 
        id: 'ai_chat', 
        type: 'ai_agent', 
        position: { x: 240, y: 340 }, 
        data: { 
          label: 'Asistente IA (Chat)', 
          nodeType: 'ai_agent', 
          description: 'TEO guía interactivamente al registrador para clarificar y estructurar su necesidad.' 
        } 
      },
      { 
        id: 'eval_bp', 
        type: 'state', 
        position: { x: 520, y: 140 }, 
        data: { 
          label: '2. Evaluación BP TI', 
          nodeType: 'state', 
          stateSubtype: 'standard',
          dispatchMode: 'select_person',
          form_id: '72128de8-eff3-4e74-962f-4db6703ae383', // form_bp_viabilidad
          consent_id: '87947f9d-8b11-401c-8d4b-cc73d834455b', // consent_bp_ti
          action_label: 'Enviar a aprobación de Business Partner',
          description: 'BP TI evalúa viabilidad técnica preliminar y selecciona obligatoriamente al Business Owner (BO).' 
        } 
      },
      { 
        id: 'aprob_bo', 
        type: 'state', 
        position: { x: 800, y: 140 }, 
        data: { 
          label: '3. Aprobación BO', 
          nodeType: 'state', 
          stateSubtype: 'standard',
          dispatchMode: 'select_person',
          form_id: 'd3a0cf75-7e9c-47e5-8038-94139e3e9cb2', // form_bo_patrocinio
          consent_id: 'fe3b7e0e-0173-46a4-87f7-1dbd8d412352', // consent_business_owner
          action_label: 'Enviar a Aprobación BO',
          description: 'Business Owner valida beneficio y patrocinio del área usuaria y selecciona obligatoriamente al Vicepresidente.' 
        } 
      },
      { 
        id: 'aprob_vp', 
        type: 'state', 
        position: { x: 1080, y: 140 }, 
        data: { 
          label: '4. Aprobación VP', 
          nodeType: 'state', 
          stateSubtype: 'standard',
          dispatchMode: 'general_inbox',
          consent_id: '5975724b-0fd6-4549-9f40-e6a8cdeb04eb', // consent_vicepresidencia
          action_label: 'Escalar a Aprobación VP',
          description: 'Vicepresidente otorga visto bueno estratégico y canaliza directo a la bandeja general de Gestión de la Demanda.' 
        } 
      },
      { 
        id: 'asig_demanda', 
        type: 'state', 
        position: { x: 1360, y: 140 }, 
        data: { 
          label: '5. Asignación de Dominio', 
          nodeType: 'state', 
          stateSubtype: 'standard',
          dispatchMode: 'select_person',
          form_id: 'a405e368-5cd7-4166-a72b-7b2bf642e926', // form_dominio_dictamen
          consent_id: 'a0531db7-258d-429f-a988-a587feb75869', // consent_lider_dominio
          action_label: 'Canalizar a Gestión de Demanda',
          description: 'Gestor de la Demanda revisa capacidad técnica y asigna obligatoriamente al Líder de Dominio responsable.' 
        } 
      },

      // ── FASE 2: COMPROMISO DE ESTIMACIÓN Y BIFURCACIÓN (DOMINIO) ───────────
      { 
        id: 'ventana_est', 
        type: 'state', 
        position: { x: 1640, y: 140 }, 
        data: { 
          label: '6. Compromiso Estimación', 
          nodeType: 'state', 
          stateSubtype: 'standard',
          dispatchMode: 'general_inbox',
          form_id: '61c34e52-d74e-4631-90f3-b8922000f38a', // form_dominio_compromiso_ventana
          action_label: 'Asignar Ventana de Estimación',
          description: 'Líder de Dominio registra la ventana de tiempo (fecha inicio y fin) en la que realizará su análisis técnico.' 
        } 
      },
      { 
        id: 'gw_presupuesto', 
        type: 'gateway', 
        position: { x: 1920, y: 140 }, 
        data: { 
          label: '¿Requiere Presupuesto?', 
          nodeType: 'gateway',
          description: 'Al concluir la ventana, se bifurca según necesidad de presupuesto externo.'
        } 
      },
      { 
        id: 'est_con_presupuesto', 
        type: 'state', 
        position: { x: 2180, y: 40 }, 
        data: { 
          label: '7A. Estimación con Presupuesto', 
          nodeType: 'state', 
          stateSubtype: 'standard',
          dispatchMode: 'general_inbox',
          form_id: '422b386e-e744-49ff-b98b-a38880ea5585', // form_dominio_est_con_presupuesto
          consent_id: 'a0531db7-258d-429f-a988-a587feb75869', // consent_lider_dominio
          action_label: 'Estimación con Presupuesto',
          description: 'Líder de Dominio detalla presupuesto USD requerido y tiempo estimado de atención (esfuerzo).' 
        } 
      },
      { 
        id: 'est_sin_presupuesto', 
        type: 'state', 
        position: { x: 2180, y: 240 }, 
        data: { 
          label: '7B. Estimación sin Presupuesto', 
          nodeType: 'state', 
          stateSubtype: 'standard',
          dispatchMode: 'general_inbox',
          form_id: '998339b0-3817-4e24-8da1-8a061618255e', // form_dominio_est_sin_presupuesto
          consent_id: 'a0531db7-258d-429f-a988-a587feb75869', // consent_lider_dominio
          action_label: 'Estimación sin Presupuesto',
          description: 'Líder de Dominio detalla tiempo de atención con equipo interno (esfuerzo sin fechas fijas aún).' 
        } 
      },

      // ── FASE 3: VALIDACIÓN DEL ESFUERZO / COSTO POR NEGOCIO ───────────────
      { 
        id: 'val_est_bp', 
        type: 'state', 
        position: { x: 2480, y: 140 }, 
        data: { 
          label: '8A. Validación Estimación BP', 
          nodeType: 'state', 
          stateSubtype: 'standard',
          dispatchMode: 'select_person',
          action_label: 'Enviar a Validación BP',
          description: 'BP TI revisa la estimación técnica y la presenta al Business Owner para su conformidad.' 
        } 
      },
      { 
        id: 'vobo_est_bo', 
        type: 'state', 
        position: { x: 2760, y: 140 }, 
        data: { 
          label: '8B. VoBo Estimación BO', 
          nodeType: 'state', 
          stateSubtype: 'standard',
          dispatchMode: 'general_inbox',
          consent_id: 'fe3b7e0e-0173-46a4-87f7-1dbd8d412352', // consent_business_owner
          action_label: 'Enviar a VoBo Estimación BO',
          description: 'Business Owner aprueba el esfuerzo o presupuesto propuesto antes de programar fechas en TI.' 
        } 
      },

      // ── FASE 4: PLANIFICACIÓN DE FECHAS REALES Y CIERRE ───────────────────
      { 
        id: 'plan_fechas', 
        type: 'state', 
        position: { x: 3040, y: 140 }, 
        data: { 
          label: '9. Planificación de Fechas', 
          nodeType: 'state', 
          stateSubtype: 'standard',
          dispatchMode: 'general_inbox',
          form_id: '1bb441eb-fce8-45b5-8545-d0a41374c57a', // form_dominio_planificacion_fechas
          action_label: 'Planificar Fechas',
          description: 'Con la estimación aprobada por el BO, Líder de Dominio fija las fechas firmes de inicio y fin de atención.' 
        } 
      },
      { 
        id: 'val_plan_bp', 
        type: 'state', 
        position: { x: 3320, y: 140 }, 
        data: { 
          label: '10. Validación Planificación', 
          nodeType: 'state', 
          stateSubtype: 'standard',
          dispatchMode: 'select_person',
          action_label: 'Enviar a Validación de Plan BP',
          description: 'BP TI valida la viabilidad del calendario y coordina visto bueno final con el Business Owner.' 
        } 
      },
      { 
        id: 'aprob_plan_bo', 
        type: 'state', 
        position: { x: 3600, y: 140 }, 
        data: { 
          label: '11. Aprobación Final Fechas', 
          nodeType: 'state', 
          stateSubtype: 'standard',
          dispatchMode: 'general_inbox',
          consent_id: 'fe3b7e0e-0173-46a4-87f7-1dbd8d412352', // consent_business_owner
          action_label: 'Enviar a Aprobación Final BO',
          description: 'Business Owner aprueba formalmente las fechas de entrega acordadas.' 
        } 
      },
      { 
        id: 'planificacion', 
        type: 'state', 
        position: { x: 3880, y: 140 }, 
        data: { 
          label: '12. Planificación', 
          nodeType: 'state', 
          stateSubtype: 'demanda',
          dispatchMode: 'general_inbox',
          action_label: 'Aprobar y Registrar en Cartera',
          description: 'ESTADO FINAL OFICIAL. Iniciativa aprobada, registrada en cartera oficial con presupuesto y fechas firmes.' 
        } 
      },
      { 
        id: 'end', 
        type: 'end', 
        position: { x: 4140, y: 180 }, 
        data: { label: 'Fin', nodeType: 'end' } 
      },

      // ── CIRCUITO UNIVERSAL DE OBSERVACIONES Y DESCARTE ─────────────────────
      { 
        id: 'observada', 
        type: 'state', 
        position: { x: 1640, y: 440 }, 
        data: { 
          label: '⚠️ Observada (Hub BP TI)', 
          nodeType: 'state', 
          stateSubtype: 'observada',
          dispatchMode: 'general_inbox',
          action_label: 'Observar / Solicitar Ajustes',
          description: 'Recibe cualquier observación con detalle obligatorio. BP TI edita y recoloca con justificación.' 
        } 
      },
      { 
        id: 'desestimada', 
        type: 'state', 
        position: { x: 1920, y: 440 }, 
        data: { 
          label: '🗄️ Desestimada', 
          nodeType: 'state', 
          stateSubtype: 'desestimada',
          dispatchMode: 'general_inbox',
          action_label: 'Desestimar Iniciativa',
          description: 'Iniciativa archivada o declarada no viable.' 
        } 
      },
    ],
    edges: [
      // Flujo Principal Fase 1
      { id: 'e-start-borrador', source: 'start', target: 'borrador', sourceHandle: 'right', targetHandle: 'left', label: 'Crear iniciativa', type: 'workflow', data: { allowed_roles: ['registrador', 'admin'] } },
      { id: 'e-borrador-eval_bp', source: 'borrador', target: 'eval_bp', sourceHandle: 'right', targetHandle: 'left', label: 'Enviar a TI', type: 'workflow', data: { allowed_roles: ['registrador', 'key_user', 'admin'] } },
      { id: 'e-eval_bp-aprob_bo', source: 'eval_bp', target: 'aprob_bo', sourceHandle: 'right', targetHandle: 'left', label: 'Derivar a Negocio (BO)', type: 'workflow', data: { allowed_roles: ['bp_ti', 'admin'] } },
      { id: 'e-aprob_bo-aprob_vp', source: 'aprob_bo', target: 'aprob_vp', sourceHandle: 'right', targetHandle: 'left', label: 'Escalar a VP', type: 'workflow', data: { allowed_roles: ['business_owner', 'admin'] } },
      { id: 'e-aprob_vp-asig_demanda', source: 'aprob_vp', target: 'asig_demanda', sourceHandle: 'right', targetHandle: 'left', label: 'Aprobar y Canalizar', type: 'workflow', data: { allowed_roles: ['vicepresidente_del_negocio', 'admin'] } },
      { id: 'e-asig_demanda-ventana_est', source: 'asig_demanda', target: 'ventana_est', sourceHandle: 'right', targetHandle: 'left', label: 'Asignar Líder', type: 'workflow', data: { allowed_roles: ['gestor_de_la_demanda', 'admin'] } },

      // Bifurcación Fase 2
      { id: 'e-ventana_est-gw', source: 'ventana_est', target: 'gw_presupuesto', sourceHandle: 'right', targetHandle: 'left', label: 'Concluye Ventana', type: 'workflow', data: { allowed_roles: ['lider_de_dominio', 'admin'] } },
      { id: 'e-gw-si', source: 'gw_presupuesto', target: 'est_con_presupuesto', sourceHandle: 'top', targetHandle: 'left', label: 'SÍ requiere presupuesto', type: 'workflow', data: { allowed_roles: [] } },
      { id: 'e-gw-no', source: 'gw_presupuesto', target: 'est_sin_presupuesto', sourceHandle: 'bottom', targetHandle: 'left', label: 'NO requiere presupuesto', type: 'workflow', data: { allowed_roles: [] } },

      // Convergencia Fase 3 (Validación de Estimación)
      { id: 'e-est_si-val_bp', source: 'est_con_presupuesto', target: 'val_est_bp', sourceHandle: 'right', targetHandle: 'left', label: 'Enviar Estimación', type: 'workflow', data: { allowed_roles: ['lider_de_dominio', 'admin'] } },
      { id: 'e-est_no-val_bp', source: 'est_sin_presupuesto', target: 'val_est_bp', sourceHandle: 'right', targetHandle: 'left', label: 'Enviar Estimación', type: 'workflow', data: { allowed_roles: ['lider_de_dominio', 'admin'] } },
      { id: 'e-val_bp-vobo_bo', source: 'val_est_bp', target: 'vobo_est_bo', sourceHandle: 'right', targetHandle: 'left', label: 'Solicitar VoBo al BO', type: 'workflow', data: { allowed_roles: ['bp_ti', 'admin'] } },

      // Retorno a Dominio Fase 4 (Planificación de Fechas)
      { id: 'e-vobo_bo-plan_fechas', source: 'vobo_est_bo', target: 'plan_fechas', sourceHandle: 'right', targetHandle: 'left', label: 'Estimación Aprobada por BO', type: 'workflow', data: { allowed_roles: ['business_owner', 'admin'] } },
      { id: 'e-plan_fechas-val_plan_bp', source: 'plan_fechas', target: 'val_plan_bp', sourceHandle: 'right', targetHandle: 'left', label: 'Presentar Calendario', type: 'workflow', data: { allowed_roles: ['lider_de_dominio', 'admin'] } },
      { id: 'e-val_plan_bp-aprob_plan_bo', source: 'val_plan_bp', target: 'aprob_plan_bo', sourceHandle: 'right', targetHandle: 'left', label: 'Canalizar a Negocio', type: 'workflow', data: { allowed_roles: ['bp_ti', 'admin'] } },
      { id: 'e-aprob_plan_bo-planificacion', source: 'aprob_plan_bo', target: 'planificacion', sourceHandle: 'right', targetHandle: 'left', label: 'Aprobación Oficial', type: 'workflow', data: { allowed_roles: ['business_owner', 'admin'] } },
      { id: 'e-planificacion-end', source: 'planificacion', target: 'end', sourceHandle: 'right', targetHandle: 'left', label: 'Cartera TI', type: 'workflow', data: { allowed_roles: ['bp_ti', 'gestor_de_la_demanda', 'admin'] } },

      // Observaciones hacia el Hub Central del BP TI
      { id: 'e-aprob_bo-obs', source: 'aprob_bo', target: 'observada', sourceHandle: 'bottom', targetHandle: 'top', label: 'Observar requerimiento', type: 'workflow', data: { allowed_roles: ['business_owner', 'admin'] } },
      { id: 'e-aprob_vp-obs', source: 'aprob_vp', target: 'observada', sourceHandle: 'bottom', targetHandle: 'top', label: 'Observar iniciativa', type: 'workflow', data: { allowed_roles: ['vicepresidente_del_negocio', 'admin'] } },
      { id: 'e-vobo_bo-obs', source: 'vobo_est_bo', target: 'observada', sourceHandle: 'bottom', targetHandle: 'top', label: 'Observar estimación', type: 'workflow', data: { allowed_roles: ['business_owner', 'admin'] } },
      { id: 'e-aprob_plan-obs', source: 'aprob_plan_bo', target: 'observada', sourceHandle: 'bottom', targetHandle: 'top', label: 'Observar fechas', type: 'workflow', data: { allowed_roles: ['business_owner', 'admin'] } },

      // Recolocación desde Observada por BP TI (con Justificación obligatoria)
      { id: 'e-obs-borrador', source: 'observada', target: 'borrador', sourceHandle: 'top', targetHandle: 'bottom', label: 'Recolocar -> Borrador (Key User)', type: 'workflow', data: { allowed_roles: ['bp_ti', 'admin'] } },
      { id: 'e-obs-ventana', source: 'observada', target: 'ventana_est', sourceHandle: 'top', targetHandle: 'bottom', label: 'Recolocar -> Reestimar (Dominio)', type: 'workflow', data: { allowed_roles: ['bp_ti', 'admin'] } },
      { id: 'e-obs-plan', source: 'observada', target: 'plan_fechas', sourceHandle: 'top', targetHandle: 'bottom', label: 'Recolocar -> Replanificar (Dominio)', type: 'workflow', data: { allowed_roles: ['bp_ti', 'admin'] } },
      { id: 'e-obs-desestimar', source: 'observada', target: 'desestimada', sourceHandle: 'right', targetHandle: 'left', label: 'Desestimar / Cancelar', type: 'workflow', data: { allowed_roles: ['bp_ti', 'admin'] } },
    ]
  },
  node_roles: [
    { node_id: 'borrador', role_name: 'registrador', can_edit: true, can_approve: true, can_reject: false, required_fields: ['descripcion', 'pilar_estrategico', 'institucion'] },
    { node_id: 'borrador', role_name: 'admin', can_edit: true, can_approve: true, can_reject: false, required_fields: [] },
    { node_id: 'eval_bp', role_name: 'bp_ti', can_edit: true, can_approve: true, can_reject: true, required_fields: [] },
    { node_id: 'eval_bp', role_name: 'admin', can_edit: true, can_approve: true, can_reject: true, required_fields: [] },
    { node_id: 'aprob_bo', role_name: 'business_owner', can_edit: false, can_approve: true, can_reject: true, required_fields: [] },
    { node_id: 'aprob_bo', role_name: 'admin', can_edit: false, can_approve: true, can_reject: true, required_fields: [] },
    { node_id: 'aprob_vp', role_name: 'vicepresidente_del_negocio', can_edit: false, can_approve: true, can_reject: true, required_fields: [] },
    { node_id: 'aprob_vp', role_name: 'admin', can_edit: false, can_approve: true, can_reject: true, required_fields: [] },
    { node_id: 'asig_demanda', role_name: 'gestor_de_la_demanda', can_edit: false, can_approve: true, can_reject: true, required_fields: [] },
    { node_id: 'asig_demanda', role_name: 'admin', can_edit: false, can_approve: true, can_reject: true, required_fields: [] },
    { node_id: 'ventana_est', role_name: 'lider_de_dominio', can_edit: true, can_approve: true, can_reject: false, required_fields: [] },
    { node_id: 'ventana_est', role_name: 'admin', can_edit: true, can_approve: true, can_reject: false, required_fields: [] },
    { node_id: 'est_con_presupuesto', role_name: 'lider_de_dominio', can_edit: true, can_approve: true, can_reject: false, required_fields: [] },
    { node_id: 'est_con_presupuesto', role_name: 'admin', can_edit: true, can_approve: true, can_reject: false, required_fields: [] },
    { node_id: 'est_sin_presupuesto', role_name: 'lider_de_dominio', can_edit: true, can_approve: true, can_reject: false, required_fields: [] },
    { node_id: 'est_sin_presupuesto', role_name: 'admin', can_edit: true, can_approve: true, can_reject: false, required_fields: [] },
    { node_id: 'val_est_bp', role_name: 'bp_ti', can_edit: false, can_approve: true, can_reject: true, required_fields: [] },
    { node_id: 'val_est_bp', role_name: 'admin', can_edit: true, can_approve: true, can_reject: true, required_fields: [] },
    { node_id: 'vobo_est_bo', role_name: 'business_owner', can_edit: false, can_approve: true, can_reject: true, required_fields: [] },
    { node_id: 'vobo_est_bo', role_name: 'admin', can_edit: true, can_approve: true, can_reject: true, required_fields: [] },
    { node_id: 'plan_fechas', role_name: 'lider_de_dominio', can_edit: true, can_approve: true, can_reject: false, required_fields: [] },
    { node_id: 'plan_fechas', role_name: 'admin', can_edit: true, can_approve: true, can_reject: false, required_fields: [] },
    { node_id: 'val_plan_bp', role_name: 'bp_ti', can_edit: false, can_approve: true, can_reject: true, required_fields: [] },
    { node_id: 'val_plan_bp', role_name: 'admin', can_edit: true, can_approve: true, can_reject: true, required_fields: [] },
    { node_id: 'aprob_plan_bo', role_name: 'business_owner', can_edit: false, can_approve: true, can_reject: true, required_fields: [] },
    { node_id: 'aprob_plan_bo', role_name: 'admin', can_edit: true, can_approve: true, can_reject: true, required_fields: [] },
    { node_id: 'planificacion', role_name: 'invitado', can_edit: false, can_approve: false, can_reject: false, required_fields: [] },
    { node_id: 'planificacion', role_name: 'admin', can_edit: true, can_approve: true, can_reject: false, required_fields: [] },
    { node_id: 'observada', role_name: 'bp_ti', can_edit: true, can_approve: true, can_reject: true, required_fields: [] },
    { node_id: 'observada', role_name: 'admin', can_edit: true, can_approve: true, can_reject: true, required_fields: [] },
    { node_id: 'desestimada', role_name: 'bp_ti', can_edit: false, can_approve: true, can_reject: false, required_fields: [] },
    { node_id: 'desestimada', role_name: 'admin', can_edit: false, can_approve: true, can_reject: false, required_fields: [] },
  ],
  transitions: [
    { edge_id: 'e-borrador-eval_bp', label: 'Enviar a TI', source_node_id: 'borrador', target_node_id: 'eval_bp', condition_type: 'always', condition_config: {}, allowed_roles: ['registrador', 'key_user', 'admin'] },
    { edge_id: 'e-eval_bp-aprob_bo', label: 'Derivar a Negocio (BO)', source_node_id: 'eval_bp', target_node_id: 'aprob_bo', condition_type: 'always', condition_config: {}, allowed_roles: ['bp_ti', 'admin'] },
    { edge_id: 'e-aprob_bo-aprob_vp', label: 'Escalar a VP', source_node_id: 'aprob_bo', target_node_id: 'aprob_vp', condition_type: 'always', condition_config: {}, allowed_roles: ['business_owner', 'admin'] },
    { edge_id: 'e-aprob_vp-asig_demanda', label: 'Aprobar y Canalizar', source_node_id: 'aprob_vp', target_node_id: 'asig_demanda', condition_type: 'always', condition_config: {}, allowed_roles: ['vicepresidente_del_negocio', 'admin'] },
    { edge_id: 'e-asig_demanda-ventana_est', label: 'Asignar Líder', source_node_id: 'asig_demanda', target_node_id: 'ventana_est', condition_type: 'always', condition_config: {}, allowed_roles: ['gestor_de_la_demanda', 'admin'] },
    { edge_id: 'e-ventana_est-gw', label: 'Concluye Ventana', source_node_id: 'ventana_est', target_node_id: 'gw_presupuesto', condition_type: 'always', condition_config: {}, allowed_roles: ['lider_de_dominio', 'admin'] },
    { edge_id: 'e-gw-si', label: 'SÍ requiere presupuesto', source_node_id: 'gw_presupuesto', target_node_id: 'est_con_presupuesto', condition_type: 'always', condition_config: {}, allowed_roles: [] },
    { edge_id: 'e-gw-no', label: 'NO requiere presupuesto', source_node_id: 'gw_presupuesto', target_node_id: 'est_sin_presupuesto', condition_type: 'always', condition_config: {}, allowed_roles: [] },
    { edge_id: 'e-est_si-val_bp', label: 'Enviar Estimación', source_node_id: 'est_con_presupuesto', target_node_id: 'val_est_bp', condition_type: 'always', condition_config: {}, allowed_roles: ['lider_de_dominio', 'admin'] },
    { edge_id: 'e-est_no-val_bp', label: 'Enviar Estimación', source_node_id: 'est_sin_presupuesto', target_node_id: 'val_est_bp', condition_type: 'always', condition_config: {}, allowed_roles: ['lider_de_dominio', 'admin'] },
    { edge_id: 'e-val_bp-vobo_bo', label: 'Solicitar VoBo al BO', source_node_id: 'val_est_bp', target_node_id: 'vobo_est_bo', condition_type: 'always', condition_config: {}, allowed_roles: ['bp_ti', 'admin'] },
    { edge_id: 'e-vobo_bo-plan_fechas', label: 'Estimación Aprobada por BO', source_node_id: 'vobo_est_bo', target_node_id: 'plan_fechas', condition_type: 'always', condition_config: {}, allowed_roles: ['business_owner', 'admin'] },
    { edge_id: 'e-plan_fechas-val_plan_bp', label: 'Presentar Calendario', source_node_id: 'plan_fechas', target_node_id: 'val_plan_bp', condition_type: 'always', condition_config: {}, allowed_roles: ['lider_de_dominio', 'admin'] },
    { edge_id: 'e-val_plan_bp-aprob_plan_bo', label: 'Canalizar a Negocio', source_node_id: 'val_plan_bp', target_node_id: 'aprob_plan_bo', condition_type: 'always', condition_config: {}, allowed_roles: ['bp_ti', 'admin'] },
    { edge_id: 'e-aprob_plan_bo-planificacion', label: 'Aprobación Oficial', source_node_id: 'aprob_plan_bo', target_node_id: 'planificacion', condition_type: 'always', condition_config: {}, allowed_roles: ['business_owner', 'admin'] },
    { edge_id: 'e-planificacion-end', label: 'Cartera TI', source_node_id: 'planificacion', target_node_id: 'end', condition_type: 'always', condition_config: {}, allowed_roles: ['bp_ti', 'gestor_de_la_demanda', 'admin'] },
    { edge_id: 'e-aprob_bo-obs', label: 'Observar requerimiento', source_node_id: 'aprob_bo', target_node_id: 'observada', condition_type: 'always', condition_config: {}, allowed_roles: ['business_owner', 'admin'] },
    { edge_id: 'e-aprob_vp-obs', label: 'Observar iniciativa', source_node_id: 'aprob_vp', target_node_id: 'observada', condition_type: 'always', condition_config: {}, allowed_roles: ['vicepresidente_del_negocio', 'admin'] },
    { edge_id: 'e-vobo_bo-obs', label: 'Observar estimación', source_node_id: 'vobo_est_bo', target_node_id: 'observada', condition_type: 'always', condition_config: {}, allowed_roles: ['business_owner', 'admin'] },
    { edge_id: 'e-aprob_plan-obs', label: 'Observar fechas', source_node_id: 'aprob_plan_bo', target_node_id: 'observada', condition_type: 'always', condition_config: {}, allowed_roles: ['business_owner', 'admin'] },
    { edge_id: 'e-obs-borrador', label: 'Recolocar -> Borrador (Key User)', source_node_id: 'observada', target_node_id: 'borrador', condition_type: 'always', condition_config: {}, allowed_roles: ['bp_ti', 'admin'] },
    { edge_id: 'e-obs-ventana', label: 'Recolocar -> Reestimar (Dominio)', source_node_id: 'observada', target_node_id: 'ventana_est', condition_type: 'always', condition_config: {}, allowed_roles: ['bp_ti', 'admin'] },
    { edge_id: 'e-obs-plan', label: 'Recolocar -> Replanificar (Dominio)', source_node_id: 'observada', target_node_id: 'plan_fechas', condition_type: 'always', condition_config: {}, allowed_roles: ['bp_ti', 'admin'] },
    { edge_id: 'e-obs-desestimar', label: 'Desestimar / Cancelar', source_node_id: 'observada', target_node_id: 'desestimada', condition_type: 'always', condition_config: {}, allowed_roles: ['bp_ti', 'admin'] },
  ]
};

// Alias de retrocompatibilidad
export const IACS_LEGACY_SEED = IACS_OFFICIAL_SEED;

