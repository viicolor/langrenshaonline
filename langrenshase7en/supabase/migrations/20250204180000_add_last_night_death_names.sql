-- 延迟宣布死讯：有警上竞选的局在警上结束后再发死讯，将昨夜死亡名单暂存于此

ALTER TABLE public.game_records
  ADD COLUMN IF NOT EXISTS last_night_death_names JSONB DEFAULT NULL;

COMMENT ON COLUMN public.game_records.last_night_death_names IS '昨夜死亡玩家名称列表（JSON 数组），警上局在进入白天时再发死讯用';
