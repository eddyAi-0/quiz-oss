-- Aggiunge colonna wrong_answers a profiles per sincronizzare gli errori utente
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS wrong_answers JSONB DEFAULT '{}';
