-- 查看 TEST001 房间更详细的状态
SELECT 
    gr.id as 游戏记录ID,
    gr.status as 状态,
    gr.current_phase as 当前阶段,
    gr.current_round as 当前回合,
    gr.night_step as 夜步骤,
    gr.phase_ends_at as 阶段结束时间,
    NOW() as 当前时间,
    gr.phase_ends_at < NOW() as 是否超时
FROM rooms r
JOIN game_records gr ON gr.room_id = r.id
WHERE r.name = 'TEST001' AND gr.status = 'playing'
ORDER BY gr.created_at DESC
LIMIT 1;
