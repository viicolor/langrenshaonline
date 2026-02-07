-- 数据库重构执行脚本
-- 按照正确的顺序执行所有数据库迁移脚本
-- 执行前请确保已备份数据库

-- 执行顺序：
-- 1. step7-extend-cards-camp-skill.sql (扩展 cards 表)
-- 2. step8-create-skills-table.sql (创建 skills 表)
-- 3. step9-refactor-board-roles.sql (重构 board_roles 表)
-- 4. step10-create-global-configs.sql (创建 global_configs 表)
-- 5. step11-create-processes.sql (创建 processes 表)
-- 6. step12-migrate-and-validate.sql (数据迁移和验证)

-- 开始执行
\i step7-extend-cards-camp-skill.sql
\i step8-create-skills-table.sql
\i step9-refactor-board-roles.sql
\i step10-create-global-configs.sql
\i step11-create-processes.sql
\i step12-migrate-and-validate.sql

-- 执行完成
echo "所有数据库重构脚本执行完成！"
echo "请验证数据库表结构和数据"
