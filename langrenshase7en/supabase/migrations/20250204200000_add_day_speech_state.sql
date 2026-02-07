-- 白天放逐发言：轮流发言顺序与当前发言者（按发言顺序.md 规则）

ALTER TABLE public.game_records
  ADD COLUMN IF NOT EXISTS day_speech_state JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS last_night_death_seats JSONB DEFAULT NULL;

COMMENT ON COLUMN public.game_records.day_speech_state IS '白天发言状态：speechOrder(座位号数组), speechIndex, currentSpeakerSeat, sheriffDirection(警左/警右)';
COMMENT ON COLUMN public.game_records.last_night_death_seats IS '昨夜死亡玩家座位号数组，无警长时用于死右/死左起始';
