import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getUserByUsername, createUser, hashPassword } from '$lib/database.js';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { username, password } = body;
    
    if (!username || !password) {
      return json({ success: false, message: '用户名和密码不能为空' }, { status: 400 });
    }
    
    const user = getUserByUsername(username);
    
    if (!user) {
      return json({ success: false, message: '用户不存在' }, { status: 401 });
    }
    
    const passwordHash = await hashPassword(password);
    
    if (user.password_hash !== passwordHash) {
      return json({ success: false, message: '密码错误' }, { status: 401 });
    }
    
    return json({ 
      success: true, 
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar_url: user.avatar_url,
        is_admin: user.is_admin
      }
    });
  } catch (error) {
    console.error('登录错误:', error);
    return json({ success: false, message: '登录失败' }, { status: 500 });
  }
};
