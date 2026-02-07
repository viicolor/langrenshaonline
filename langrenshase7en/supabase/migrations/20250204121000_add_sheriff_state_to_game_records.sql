-- 警长竞选需要在对局记录中持久化状态（多端同步）

ALTER TABLE public.game_records
  ADD COLUMN IF NOT EXISTS sheriff_state JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS sheriff_seat INTEGER;

COMMENT ON COLUMN public.game_records.sheriff_state IS '警长竞选状态（JSON）：stage/signup/speech/vote/pk_speech/pk_vote/done 等';
COMMENT ON COLUMN public.game_records.sheriff_seat IS '警长座位号（1-based），未产生则为 NULL';

