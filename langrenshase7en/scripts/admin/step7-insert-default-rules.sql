-- 脚本7：插入默认规则配置
-- 6个基础规则：发言时长、字数限制、投票时长、游戏超时、允许观战、允许AI玩家

INSERT INTO public.rules (rule_key, rule_value, rule_type, description)
VALUES
('speak_time_limit', '60', 'time_limit', '发言时长限制（秒）'),
('speak_char_limit', '100', 'char_limit', '发言字数限制'),
('vote_time_limit', '30', 'time_limit', '投票时长限制（秒）'),
('game_timeout', '600', 'time_limit', '游戏超时设置（秒）'),
('allow_spectator', 'true', 'boolean', '允许观战'),
('allow_ai_players', 'true', 'boolean', '允许AI玩家')
ON CONFLICT (rule_key) DO NOTHING;
