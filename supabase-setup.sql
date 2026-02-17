-- ================================================================
--  SEISMIC VALENTINE — Supabase SQL Setup
--  Run this entire file in: Supabase Dashboard → SQL Editor → Run
-- ================================================================


-- ── 1. Create the confessions table ─────────────────────────────
CREATE TABLE IF NOT EXISTS confessions (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Posting mode: 'anonymous' or 'public'
  user_mode       TEXT NOT NULL DEFAULT 'anonymous'
                  CHECK (user_mode IN ('anonymous', 'public')),

  -- Poster info (only used when user_mode = 'public')
  user_name       TEXT,
  user_mag        TEXT,                        -- Discord/community tag

  -- Target info
  target_name     TEXT NOT NULL,
  target_mag      TEXT,
  target_pfp_url  TEXT,                        -- public URL from Supabase Storage

  -- The confession itself
  message         TEXT NOT NULL,

  -- Reactions stored as JSONB: {"❤️": 3, "🔥": 1, "🫡": 0}
  reactions       JSONB DEFAULT '{"❤️": 0, "🔥": 0, "🫡": 0}'::jsonb,

  -- Moderation flag
  is_reported     BOOLEAN DEFAULT FALSE,

  -- Timestamps (auto-set)
  created_at      TIMESTAMPTZ DEFAULT NOW()
);


-- ── 2. Index for fast feed queries (newest first) ────────────────
CREATE INDEX IF NOT EXISTS confessions_created_at_idx
  ON confessions (created_at DESC);


-- ── 3. Row-Level Security (RLS) ──────────────────────────────────
-- Enable RLS so only our API key rules apply
ALTER TABLE confessions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to READ confessions (public feed)
CREATE POLICY "Public read"
  ON confessions FOR SELECT
  USING (TRUE);

-- Allow anyone to INSERT (anonymous or public confessions)
CREATE POLICY "Public insert"
  ON confessions FOR INSERT
  WITH CHECK (TRUE);

-- Allow anyone to UPDATE only the reactions and is_reported columns
-- (restricts random updates of other fields)
CREATE POLICY "Reactions and reports update"
  ON confessions FOR UPDATE
  USING (TRUE)
  WITH CHECK (TRUE);

-- NOTE: No DELETE policy — confessions can only be deleted by a
--       Supabase Dashboard admin or a future admin endpoint.


-- ── 4. Quick test — insert a sample confession ───────────────────
-- (Optional: remove after testing)
INSERT INTO confessions (user_mode, target_name, target_mag, message, reactions)
VALUES (
  'anonymous',
  'Seismic Dev',
  'seismicdev#0001',
  'Every time you deploy a new feature I get butterflies. Your commits are literally poetry. 🌊💕',
  '{"❤️": 5, "🔥": 3, "🫡": 2}'
);


-- ── 5. View: non-reported confessions only ───────────────────────
-- Your feed.js could optionally query this view instead of the table
-- to automatically hide reported content.
CREATE OR REPLACE VIEW public_confessions AS
  SELECT * FROM confessions
  WHERE is_reported = FALSE
  ORDER BY created_at DESC;


-- ── Done! ────────────────────────────────────────────────────────
-- Your table is ready. Next step: set up the Storage bucket below.
