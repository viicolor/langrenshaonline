-- 只创建users表，不包含RLS和策略

-- 删除旧表
DROP TABLE IF EXISTS public.users CASCADE;

-- 创建用户表
CREATE TABLE public.users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email TEXT UNIQUE,
  avatar_url TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 插入测试用户
INSERT INTO public.users (username, password_hash, email, avatar_url)
VALUES (
  'viicolor',
  '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
  'viicolor@test.com',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=viicolor'
);
