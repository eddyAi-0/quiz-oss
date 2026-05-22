-- Row Level Security per quiz_sessions
ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lettura proprie sessioni"
  ON quiz_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Inserimento proprie sessioni"
  ON quiz_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Aggiornamento proprie sessioni"
  ON quiz_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Eliminazione proprie sessioni"
  ON quiz_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Row Level Security per profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lettura proprio profilo"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Inserimento proprio profilo"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Aggiornamento proprio profilo"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);
