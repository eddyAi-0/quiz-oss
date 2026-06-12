-- Aggiunge colonna oral_answers a profiles per sincronizzare le risposte orali svolte
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS oral_answers JSONB DEFAULT '{}';
