-- 昨夜死亡原因（与 last_night_death_seats 一一对应），用于判断猎人是否可开枪（狼刀可开枪，毒/奶穿不可）

ALTER TABLE public.game_records
  ADD COLUMN IF NOT EXISTS last_night_death_causes JSONB DEFAULT NULL;

COMMENT ON COLUMN public.game_records.last_night_death_causes IS '昨夜死亡原因数组（wolf_kill/poison/none），与 last_night_death_seats 同序，用于猎人夜间死亡是否可开枪';
