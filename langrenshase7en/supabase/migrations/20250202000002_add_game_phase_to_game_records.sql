-- 对局阶段与倒计时持久化，供多端同步
ALTER TABLE public.game_records
  ADD COLUMN IF NOT EXISTS current_phase TEXT DEFAULT 'waiting',
  ADD COLUMN IF NOT EXISTS current_round INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS phase_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS phase_ends_at TIMESTAMPTZ;

COMMENT ON COLUMN public.game_records.current_phase IS 'waiting | night | day | voting | finished';
COMMENT ON COLUMN public.game_records.current_round IS '当前回合数';
COMMENT ON COLUMN public.game_records.phase_started_at IS '当前阶段开始时间';
COMMENT ON COLUMN public.game_records.phase_ends_at IS '当前阶段结束时间（用于倒计时与自动切换）';

-- 便于按房间查询进行中的对局
CREATE INDEX IF NOT EXISTS idx_game_records_room_ongoing
  ON public.game_records(room_id)
  WHERE ended_at IS NULL;

-- 允许客户端订阅 game_records 变更以同步阶段/倒计时
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_records;
