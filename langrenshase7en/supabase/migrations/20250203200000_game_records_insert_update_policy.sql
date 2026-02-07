-- game_records 表启用了 RLS 但原先只有 SELECT 策略，插入/更新会被拒绝，导致「创建游戏记录失败」。
-- 添加 INSERT、UPDATE 策略，与「Anyone can read」一致，允许客户端创建并更新对局记录。

CREATE POLICY "Anyone can insert game records"
ON public.game_records
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update game records"
ON public.game_records
FOR UPDATE
USING (true)
WITH CHECK (true);
