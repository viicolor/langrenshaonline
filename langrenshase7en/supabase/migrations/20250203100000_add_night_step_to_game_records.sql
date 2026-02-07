-- 夜晚子阶段：当前进行到第几步（0-based），用于按步倒计时与技能可用性
ALTER TABLE public.game_records
  ADD COLUMN IF NOT EXISTS night_step INTEGER DEFAULT 0;

COMMENT ON COLUMN public.game_records.night_step IS '夜晚子阶段索引（0-based），对应流程配置 night_steps 顺序';
