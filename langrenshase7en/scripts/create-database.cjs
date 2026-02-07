const SUPABASE_URL = 'https://ioquklhxeisulnagkauo.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvcXVrbGh4ZWlzdWxuYWdrYXVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTg5NjY4NSwiZXhwIjoyMDg1NDcyNjg1fQ.avoO6BPgy_OODj-iYTuZeA8tpYrurCpSBYrynWVHu7w';

async function executeSQL(sql) {
  console.log(`📝 执行SQL: ${sql.substring(0, 60)}...`);
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Content-Type': 'application/sql',
        'Prefer': 'return=minimal',
      },
      body: sql,
    });
    
    const result = await response.json();
    
    if (result.error) {
      console.error(`❌ SQL执行失败:`, result.error);
      console.error(`  错误代码: ${result.code}`);
      console.error(`  错误消息: ${result.message}`);
      console.error(`  错误详情: ${result.hint}`);
      return false;
    } else {
      console.log(`✅ SQL执行成功`);
      return true;
    }
  } catch (error) {
    console.error(`❌ SQL执行出错:`, error.message);
    return false;
  }
}

const sqlStatements = [
  `CREATE TABLE IF NOT EXISTS public.users (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    email TEXT UNIQUE,
    avatar_url TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
  );

  ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

  CREATE POLICY IF NOT EXISTS "Anyone can register" 
  ON public.users 
  FOR INSERT 
  WITH CHECK (true);

  CREATE POLICY IF NOT EXISTS "Users can view own profile" 
  ON public.users 
  FOR SELECT 
  USING (auth.uid()::text = id::text OR is_admin = true);

  CREATE POLICY IF NOT EXISTS "Users can update own profile" 
  ON public.users 
  FOR UPDATE 
  USING (auth.uid()::text = id::text);`,

  `CREATE TABLE IF NOT EXISTS public.boards (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    player_count INTEGER NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
  );

  ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;

  CREATE POLICY IF NOT EXISTS "Anyone can read boards" 
  ON public.boards 
  FOR SELECT 
  USING (true);

  CREATE POLICY IF NOT EXISTS "Only admins can manage boards" 
  ON public.boards 
  FOR ALL 
  USING (is_admin = true);`,

  `CREATE TABLE IF NOT EXISTS public.board_roles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
    role_type TEXT NOT NULL,
    count INTEGER NOT NULL,
    UNIQUE(board_id, role_type)
  );

  ALTER TABLE public.board_roles ENABLE ROW LEVEL SECURITY;

  CREATE POLICY IF NOT EXISTS "Anyone can read board roles" 
  ON public.board_roles 
  FOR SELECT 
  USING (true);

  CREATE POLICY IF NOT EXISTS "Only admins can manage board roles" 
  ON public.board_roles 
  FOR ALL 
  USING (is_admin = true);`,

  `CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    host_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    board_id UUID REFERENCES public.boards(id) ON DELETE SET NULL,
    max_players INTEGER NOT NULL DEFAULT 12,
    ai_player_count INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'waiting',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
  );

  ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

  CREATE POLICY IF NOT EXISTS "Anyone can read rooms" 
  ON public.rooms 
  FOR SELECT 
  USING (true);

  CREATE POLICY IF NOT EXISTS "Authenticated users can create rooms" 
  ON public.rooms 
  FOR INSERT 
  WITH CHECK (auth.uid()::text = host_id::text);

  CREATE POLICY IF NOT EXISTS "Host can update room" 
  ON public.rooms 
  FOR UPDATE 
  USING (auth.uid()::text = host_id::text);

  ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.rooms;`,

  `CREATE TABLE IF NOT EXISTS public.game_records (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    board_id UUID REFERENCES public.boards(id),
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    winner_team TEXT,
    duration_seconds INTEGER
  );

  ALTER TABLE public.game_records ENABLE ROW LEVEL SECURITY;

  CREATE POLICY IF NOT EXISTS "Anyone can read game records" 
  ON public.game_records 
  FOR SELECT 
  USING (true);`,

  `CREATE TABLE IF NOT EXISTS public.room_messages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    game_record_id UUID REFERENCES public.game_records(id) ON DELETE CASCADE,
    phase TEXT,
    round_number INTEGER
  );

  ALTER TABLE public.room_messages ENABLE ROW LEVEL SECURITY;

  CREATE POLICY IF NOT EXISTS "Anyone can read room messages" 
  ON public.room_messages 
  FOR SELECT 
  USING (true);

  CREATE POLICY IF NOT EXISTS "Authenticated users can send messages" 
  ON public.room_messages 
  FOR INSERT 
  WITH CHECK (auth.uid()::text = user_id::text);

  ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.room_messages;`,

  `CREATE TABLE IF NOT EXISTS public.ai_configs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    provider TEXT NOT NULL,
    api_key TEXT,
    model TEXT,
    endpoint TEXT,
    config JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
  );

  ALTER TABLE public.ai_configs ENABLE ROW LEVEL SECURITY;

  CREATE POLICY IF NOT EXISTS "Only admins can manage AI configs" 
  ON public.ai_configs 
  FOR ALL 
  USING (is_admin = true);`,

  `CREATE TABLE IF NOT EXISTS public.spectator_records (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    game_record_id UUID NOT NULL REFERENCES public.game_records(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    perspective_type TEXT NOT NULL,
    target_id UUID,
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
  );

  ALTER TABLE public.spectator_records ENABLE ROW LEVEL SECURITY;

  CREATE POLICY IF NOT EXISTS "Anyone can read spectator records" 
  ON public.spectator_records 
  FOR SELECT 
  USING (true);

  CREATE POLICY IF NOT EXISTS "Authenticated users can create spectator records" 
  ON public.spectator_records 
  FOR INSERT 
  WITH CHECK (auth.uid()::text = user_id::text);`,

  `CREATE INDEX IF NOT EXISTS idx_rooms_status ON public.rooms(status);
  CREATE INDEX IF NOT EXISTS idx_rooms_host ON public.rooms(host_id);
  CREATE INDEX IF NOT EXISTS idx_room_messages_room_id ON public.room_messages(room_id);
  CREATE INDEX IF NOT EXISTS idx_room_messages_game_record_id ON public.room_messages(game_record_id);
  CREATE INDEX IF NOT EXISTS idx_room_messages_timestamp ON public.room_messages(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_game_records_room_id ON public.game_records(room_id);
  CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);`,

  `CREATE OR REPLACE FUNCTION update_updated_at_column()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = now();
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
  CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

  DROP TRIGGER IF EXISTS update_rooms_updated_at ON public.rooms;
  CREATE TRIGGER update_rooms_updated_at
    BEFORE UPDATE ON public.rooms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();`,

  `INSERT INTO public.boards (name, description, player_count, is_default) 
  VALUES
  ('12人标准局', '4狼4民4神，经典配置', 12, true),
  ('9人局', '3狼3民3神，快速游戏', 9, true),
  ('6人局', '2狼2民2神，新手友好', 6, true)
  ON CONFLICT (name) DO NOTHING;`,

  `INSERT INTO public.board_roles (board_id, role_type, count)
  SELECT 
    (SELECT id FROM public.boards WHERE name = '12人标准局' LIMIT 1),
    role_type,
    count
  FROM (VALUES 
    ('werewolf', 4),
    ('villager', 4),
    ('seer', 1),
    ('witch', 1),
    ('hunter', 1),
    ('guard', 1)
  ) AS roles(role_type, count)
  ON CONFLICT (board_id, role_type) DO NOTHING;`,

  `INSERT INTO public.board_roles (board_id, role_type, count)
  SELECT 
    (SELECT id FROM public.boards WHERE name = '9人局' LIMIT 1),
    role_type,
    count
  FROM (VALUES 
    ('werewolf', 3),
    ('villager', 3),
    ('seer', 1),
    ('witch', 1),
    ('hunter', 1)
  ) AS roles(role_type, count)
  ON CONFLICT (board_id, role_type) DO NOTHING;`,

  `INSERT INTO public.board_roles (board_id, role_type, count)
  SELECT 
    (SELECT id FROM public.boards WHERE name = '6人局' LIMIT 1),
    role_type,
    count
  FROM (VALUES 
    ('werewolf', 2),
    ('villager', 2),
    ('seer', 1),
    ('witch', 1)
  ) AS roles(role_type, count)
  ON CONFLICT (board_id, role_type) DO NOTHING;`
];

async function executeSQL() {
  console.log('🚀 开始创建数据库表...\n');
  
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < sqlStatements.length; i++) {
    const sql = sqlStatements[i];
    console.log(`\n📝 执行第 ${i + 1}/${sqlStatements.length} 条SQL语句...`);
    
    const success = await executeSQL(sql);
    
    if (success) {
      successCount++;
      console.log(`✅ 第 ${i + 1} 条SQL执行成功`);
    } else {
      failCount++;
    }
    
    await sleep(500);
  }
  
  console.log(`\n🎉 所有SQL语句执行完成！`);
  console.log(`✅ 成功: ${successCount} 条`);
  console.log(`❌ 失败: ${failCount} 条`);
  
  if (successCount > 0) {
    console.log('\n📋 现在可以注册用户了！');
    console.log('🌐 访问: http://localhost:8080/register-test.html');
  } else {
    console.log('\n❌ 数据库创建失败！');
    console.log('请检查SQL语句或API密钥');
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

executeSQL().catch(error => {
  console.error('❌ 创建数据库脚本执行失败：');
  console.error(`  错误消息: ${error.message}`);
  console.error(`  错误堆栈: ${error.stack}`);
});
