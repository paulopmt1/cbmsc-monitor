-- Emergency Types Insert Script for Production
-- Use this script to insert all emergency types into the tp_emergencia table

-- For PostgreSQL/Neon Database
INSERT INTO tp_emergencia (id, title) VALUES 
  (1, 'Incêndio'),
  (2, 'Auxílios/Apoios'),
  (3, 'Produtos Perigosos'),
  (4, 'Salvamento/Busca/Resgate'),
  (5, 'Atendimento Pré-Hospitalar'),
  (7, 'Diversos'),
  (8, 'Acidente de Trânsito'),
  (9, 'Ações Preventivas'),
  (10, 'Averiguação/Corte de Árvore'),
  (11, 'Averiguação/Manejo de Inseto'),
  (12, 'Ação Preventiva Social'),
  (13, 'Risco Potencial');

-- For SQLite (alternative syntax)
-- INSERT OR IGNORE INTO tp_emergencia (id, title) VALUES 
--   (1, 'Incêndio'),
--   (2, 'Auxílios/Apoios'),
--   (3, 'Produtos Perigosos'),
--   (4, 'Salvamento/Busca/Resgate'),
--   (5, 'Atendimento Pré-Hospitalar'),
--   (7, 'Diversos'),
--   (8, 'Acidente de Trânsito'),
--   (9, 'Ações Preventivas'),
--   (10, 'Averiguação/Corte de Árvore'),
--   (11, 'Averiguação/Manejo de Inseto'),
--   (12, 'Ação Preventiva Social'),
--   (13, 'Risco Potencial');

-- Verify the insertion
SELECT id, title FROM tp_emergencia ORDER BY id; 