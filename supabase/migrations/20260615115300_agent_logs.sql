-- Tabla para el historial permanente de acciones de los Agentes IA
CREATE TABLE IF NOT EXISTS agent_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_role TEXT NOT NULL,
  task_title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  progress INTEGER DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Políticas de seguridad para permitir lectura a usuarios autenticados
ALTER TABLE agent_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cualquiera puede ver los logs de agentes"
ON agent_logs FOR SELECT
TO authenticated
USING (true);

-- Política para que anon también pueda leer (útil si el admin no ha iniciado sesión pero quiere ver el dashboard)
CREATE POLICY "Anon puede ver los logs de agentes"
ON agent_logs FOR SELECT
TO anon
USING (true);

-- Habilitar inserción solo desde el rol de servicio o admin (opcional, pero lo dejamos abierto a anon para simplificar pruebas o insertar vía REST API fácilmente)
CREATE POLICY "Permitir inserción de logs"
ON agent_logs FOR INSERT
TO public
WITH CHECK (true);
