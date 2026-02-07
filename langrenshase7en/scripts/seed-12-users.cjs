/**
 * 批量创建 12 个测试用户：player1 ~ player12，密码均为 123456
 * 使用方式：在项目根目录执行 node scripts/seed-12-users.cjs
 * 若 Supabase 配置在 .env，请确保与 scripts/register-user.cjs 中的 URL/Key 一致
 */

const SUPABASE_URL = 'https://ioquklhxeisulnagkauo.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvcXVrbGh4ZWlzdWxuYWdrYXVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTg5NjY4NSwiZXhwIjoyMDg1NDcyNjg1fQ.avoO6BPgy_OODj-iYTuZeA8tpYrurCpSBYrynWVHu7w';

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function createUser(username, passwordHash) {
  const registerUrl = `${SUPABASE_URL}/rest/v1/users`;
  const res = await fetch(registerUrl, {
    method: 'POST',
    headers: {
      apikey: ANON_KEY,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      username,
      password_hash: passwordHash,
      email: null,
      avatar_url: `https://api.dicebear.com/7.x/adventurer/svg?seed=${username}`,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.details || String(data));
  return data;
}

async function userExists(username) {
  const url = `${SUPABASE_URL}/rest/v1/users?username=eq.${encodeURIComponent(username)}&select=id`;
  const res = await fetch(url, {
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
  });
  const data = await res.json();
  return Array.isArray(data) && data.length > 0;
}

async function main() {
  const password = '123456';
  console.log('批量创建用户：player1 ~ player12，密码均为 123456\n');

  const passwordHash = await hashPassword(password);
  let created = 0;
  let skipped = 0;

  for (let i = 1; i <= 12; i++) {
    const username = `player${i}`;
    try {
      const exists = await userExists(username);
      if (exists) {
        console.log(`  [跳过] ${username} 已存在`);
        skipped++;
        continue;
      }
      const user = await createUser(username, passwordHash);
      console.log(`  [创建] ${username} (id: ${user.id || user[0]?.id})`);
      created++;
    } catch (err) {
      console.error(`  [失败] ${username}: ${err.message}`);
    }
  }

  console.log(`\n完成：创建 ${created} 个，跳过 ${skipped} 个`);
  console.log('登录：用户名 player1 ~ player12，密码 123456');
}

main().catch((e) => {
  console.error('执行失败:', e);
  process.exit(1);
});
