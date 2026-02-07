const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://whkwnfuuzjamnrssvrha.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indoa3duZnV1emphbW5yc3N2cmhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMjkyMzIsImV4cCI6MjA4MjYwNTIzMn0.LD8-vqaE6v6oqftIVkrjTZqkKCvNXf3-cuQp4nnfAAc';

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function registerUser() {
  try {
    const username = 'viicolor';
    const password = '123456';
    const email = 'viicolor@test.com';

    console.log(`正在注册用户: ${username}`);

    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (existingUser) {
      console.log('用户名已存在');
      return;
    }

    const passwordHash = await hashPassword(password);
    console.log(`密码哈希: ${passwordHash}`);

    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        username,
        password_hash: passwordHash,
        email: email,
        avatar_url: `https://api.dicebear.com/7.x/adventurer/svg?seed=${username}`,
      })
      .select()
      .single();

    if (error) {
      console.error('注册失败:', error);
      return;
    }

    console.log('注册成功！');
    console.log('用户信息:', newUser);
    console.log(`用户ID: ${newUser.id}`);
    console.log(`用户名: ${newUser.username}`);
    console.log(`邮箱: ${newUser.email}`);
    console.log(`头像: ${newUser.avatar_url}`);
    console.log(`创建时间: ${newUser.created_at}`);

  } catch (error) {
    console.error('注册过程中发生错误:', error);
  }
}

registerUser();
