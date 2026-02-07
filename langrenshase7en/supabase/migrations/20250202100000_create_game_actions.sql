-- 游戏技能/行动记录表，用于夜晚技能提交与复盘
CREATE TABLE IF NOT EXISTS public.game_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_record_id UUID NOT NULL REFERENCES public.game_records(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  target_id TEXT,
  round INTEGER NOT NULL DEFAULT 1,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_game_actions_game_record_round
  ON public.game_actions(game_record_id, round);

COMMENT ON TABLE public.game_actions IS '对局内技能/行动记录（夜晚技能、投票等）';
