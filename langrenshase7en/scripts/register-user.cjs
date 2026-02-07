const SUPABASE_URL = 'https://ioquklhxeisulnagkauo.supabase.co';

const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvcXVrbGh4ZWlzdWxuYWdrYXVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTg5NjY4NSwiZXhwIjoyMDg1NDcyNjg1fQ.avoO6BPgy_OODj-iYTuZeA8tpYrurCpSBYrynWVHu7w';

const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvcXVrbGh4ZWlzdWxuYWdrYXVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTg5NjY4NSwiZXhwIjoyMDg1NDcyNjg1fQ.avoO6BPgy_OODj-iYTuZeA8tpYrurCpSBYrynWVHu7w';

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function registerUser() {
  console.log('🚀 开始注册用户...\n');
  
  const username = 'viicolor';
  const password = '123456';
  const email = 'viicolor@test.com';
  
  try {
    console.log('📋 用户信息：');
    console.log(`  用户名: ${username}`);
    console.log(`  密码: ${password}`);
    console.log(`  邮箱: ${email}\n`);
    
    console.log('🔍 步骤1: 检查用户名是否已存在...');
    const checkUrl = `${SUPABASE_URL}/rest/v1/users?username=eq.${encodeURIComponent(username)}&select=id`;
    console.log(` 请求URL: ${checkUrl}`);
    
    const checkResponse = await fetch(checkUrl, {
      headers: {
        'apikey': ANON_KEY,
        'Content-Type': 'application/json',
      },
    });
    
    console.log(`  响应状态: ${checkResponse.status}`);
    const checkData = await checkResponse.json();
    console.log(`  检查结果: ${JSON.stringify(checkData)}`);
    
    if (checkData && checkData.length > 0) {
      console.log('❌ 用户名已存在！');
      console.log(`  现有用户ID: ${checkData[0].id}\n`);
      return;
    }
    
    console.log('✅ 用户名可用\n');
    
    console.log('🔐 步骤2: 加密密码...');
    const passwordHash = await hashPassword(password);
    console.log(`  密码哈希: ${passwordHash}\n`);
    
    console.log('📝 步骤3: 创建用户...');
    const registerUrl = `${SUPABASE_URL}/rest/v1/users`;
    console.log(`  请求URL: ${registerUrl}`);
    
    const userData = {
      username,
      password_hash: passwordHash,
      email,
      avatar_url: `https://api.dicebear.com/7.x/adventurer/svg?seed=${username}`,
    };
    console.log(`  用户数据: ${JSON.stringify(userData, null, 2)}`);
    
    const registerResponse = await fetch(registerUrl, {
      method: 'POST',
      headers: {
        'apikey': ANON_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(userData),
    });
    
    console.log(`  响应状态: ${registerResponse.status}`);
    const result = await registerResponse.json();
    console.log(`  注册结果: ${JSON.stringify(result, null, 2)}`);
    
    if (result.error) {
      console.error('❌ 注册失败！');
      console.error(`  错误代码: ${result.code}`);
      console.error(`  错误消息: ${result.message}`);
      console.error(`  错误详情: ${result.hint}`);
    } else {
      console.log('✅ 注册成功！\n');
      console.log('📋 用户详细信息：');
      console.log(`  用户ID: ${result.id}`);
      console.log(`  用户名: ${result.username}`);
      console.log(`  邮箱: ${result.email}`);
      console.log(`  头像: ${result.avatar_url}`);
      console.log(`  是否管理员: ${result.is_admin}`);
      console.log(`  创建时间: ${result.created_at}`);
      console.log(`  更新时间: ${result.updated_at}\n`);
      
      console.log('🎉 现在可以使用以下信息登录：');
      console.log(`  用户名: ${username}`);
      console.log(`  密码: ${password}`);
      console.log(`  邮箱: ${email}\n`);
      
      console.log('🌐 访问主应用: http://localhost:8080/');
      console.log('📝 或者使用注册页面测试登录功能\n');
    }
    
  } catch (error) {
    console.error('❌ 注册过程中发生错误：');
    console.error(`  错误消息: ${error.message}`);
    console.error(`  错误堆栈: ${error.stack}\n`);
  }
}

registerUser().catch(error => {
  console.error('❌ 注册脚本执行失败：');
  console.error(`  错误消息: ${error.message}`);
  console.error(`  错误堆栈: ${error.stack}\n`);
});
