# Supabase 远程数据库首次配置

按下面步骤在**本机终端**（PowerShell 或 CMD）中执行即可完成首次连接。

---

## 步骤 1：登录 Supabase（需在本机终端执行）

在 Cursor 外打开 **PowerShell** 或 **命令提示符**，进入项目目录后执行：

```bash
cd L:\workshop\langrensha\langrenshase7en
npx supabase login
```

- 会**自动打开浏览器**，用你的 Supabase 账号登录并授权。
- 授权成功后终端会显示 `Finished supabase login.`，即可关闭浏览器。

> 若无法打开浏览器，可用 **Access Token** 方式：  
> 1. 打开 https://supabase.com/dashboard/account/tokens  
> 2. 新建 Token，复制  
> 3. 执行：`npx supabase login --token 你的Token`

---

## 步骤 2：获取「项目 Ref」和「数据库密码」

1. 打开 [Supabase Dashboard](https://supabase.com/dashboard)，进入你的项目。
2. 左侧 **Project Settings**（齿轮）→ **General**：
   - **Reference ID**：就是「项目 Ref」，用于下面 `--project-ref`（例如：`whkwnfuuzjamnrssvrha`）。
3. 左侧 **Project Settings** → **Database**：
   - **Database password**：创建项目时设置的数据库密码（忘记可重置），链接时会要求输入。

当前项目 `config.toml` 里已填的 project_id 可作为 Ref 使用（若你只有一个项目，一般就是这个）。

---

## 步骤 3：链接远程项目

在本机终端、项目目录下执行（把 `你的项目Ref` 换成步骤 2 的 Reference ID）：

```bash
cd L:\workshop\langrensha\langrenshase7en
npx supabase link --project-ref 你的项目Ref
```

- 按提示输入 **Database password**（输入时不会显示，正常输入后回车即可）。
- 成功会显示：`Linked project 你的项目Ref`。

**若你的项目 Ref 是 `whkwnfuuzjamnrssvrha`，可直接执行：**

```bash
npx supabase link --project-ref whkwnfuuzjamnrssvrha
```

---

## 步骤 4：推送迁移到远程（可选）

链接成功后，把本地迁移（含 `config_log`、`env_type` 等）推到远程：

```bash
npx supabase db push
```

或使用 npm 脚本：

```bash
npm run db:push
```

- 会按 `supabase/migrations/` 下文件名顺序执行未应用过的迁移。
- 若某条迁移已在远程执行过，Supabase 会跳过，不会重复执行。

---

## 常用命令速查

| 命令 | 说明 |
|------|------|
| `npx supabase login` | 登录（首次或过期时） |
| `npx supabase link --project-ref <Ref>` | 链接远程项目 |
| `npx supabase db push` | 推送本地迁移到远程 |
| `npx supabase db reset` | 重置本地数据库（仅本地） |
| `npx supabase status` | 查看链接状态与本地/远程信息 |

---

## 遇到问题

- **「Cannot use automatic login flow」**  
  在 Cursor 内置终端外，用系统自带的 PowerShell/CMD 执行 `npx supabase login`。

- **「Invalid database password」**  
  到 Dashboard → Project Settings → Database 重置密码后再试。

- **「Project not found」**  
  检查 `--project-ref` 是否与 Dashboard → General → Reference ID 一致。

- **「relation "users" already exists」**（远程已有表、首次 push 报错）  
  说明远程数据库之前已建过表（如 Dashboard 建表或旧迁移），当前迁移历史与远程不一致。  
  **做法：** 用 `migration repair` 把“远程已执行过”的迁移标成已应用，再重新 push。见下方「迁移已存在时的 repair 步骤」。

---

## 迁移已存在时的 repair 步骤

远程已经存在 `users` 等表、`db push` 报 **relation "xxx" already exists** 时，按下面做一遍即可。

在项目目录下执行（**每条执行完再执行下一条**）：

```bash
cd L:\workshop\langrensha\langrenshase7en

npx supabase migration repair 20250131000000 --status applied --linked
npx supabase migration repair 20250131000001 --status applied --linked
npx supabase migration repair 20250201000000 --status applied --linked
npx supabase migration repair 20251229182514 --status applied --linked
```

若某条报错「migration not found」或版本不对，可先查看本地与远程差异：

```bash
npx supabase migration list --linked
```

再根据列出的 **LOCAL** 里的版本名，把上面命令里的版本号换成对应的。  
全部 repair 成功后，再执行：

```bash
npx supabase db push
```

此时只会执行尚未应用的迁移（如 `20250202000000_create_config_log.sql`、`20250202000001_add_env_type_to_global_configs.sql`），不会再建已存在的表。

---

## 创建 game_actions 表（技能/行动记录）

游戏内夜晚技能提交依赖 `game_actions` 表，可用下面两种方式之一创建。

### 方式一：用 CLI 推送迁移（推荐）

若你已按上文完成「步骤 1～3」的登录与链接，在项目目录下执行：

```bash
cd L:\workshop\langrensha\langrenshase7en
npx supabase db push
```

若提示 **Found local migration files to be inserted before the last migration on remote database**，说明新迁移时间戳早于远程已应用的迁移，需加上 `--include-all` 再执行：

```bash
npx supabase db push --include-all
```

- 会按时间顺序执行**尚未在远程执行过的**迁移，其中包括 `20250202100000_create_game_actions.sql`。
- 若之前已 push 过，只会执行新增的迁移，不会重复执行旧的。

### 方式二：在 Dashboard 里手动执行 SQL

1. 打开 [Supabase Dashboard](https://supabase.com/dashboard)，进入你的项目。
2. 左侧点击 **SQL Editor**。
3. 新建查询，粘贴下面 SQL，点击 **Run**：

```sql
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
```

4. 执行成功后会提示 “Success”；之后用 CLI 再执行 `db push` 时，Supabase 可能会认为该迁移已应用，若出现冲突可参考上文「迁移已存在时的 repair 步骤」处理。

**建议**：优先用方式一（`npx supabase db push`），保持本地迁移与远程一致；只有在无法使用 CLI 时再用方式二。
