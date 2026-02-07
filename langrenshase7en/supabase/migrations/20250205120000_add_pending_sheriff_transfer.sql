-- 警长死后移交警徽：暂存待移交警徽状态，由死亡警长选择移交给谁或销毁

ALTER TABLE public.game_records
  ADD COLUMN IF NOT EXISTS pending_sheriff_transfer JSONB;

COMMENT ON COLUMN public.game_records.pending_sheriff_transfer IS '待移交警徽状态（JSON）：deadSheriffSeat, fromPhase(night|voting), round, eliminatedWasHunter(可选)';
