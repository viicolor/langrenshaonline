import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import path from 'path';
import { getUserByUsername, createUser, hashPassword } from './src/lib/database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
    }
    
    const user = getUserByUsername(username);
    
    if (!user) {
      return res.status(401).json({ success: false, message: '用户不存在' });
    }
    
    const passwordHash = await hashPassword(password);
    
    if (user.password_hash !== passwordHash) {
      return res.status(401).json({ success: false, message: '密码错误' });
    }
    
    res.json({ 
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
    res.status(500).json({ success: false, message: '登录失败' });
  }
});

app.post('/api/register', async (req, res) => {
  try {
    const { username, passwordHash, email } = req.body;
    
    if (!username || !passwordHash || !email) {
      return res.status(400).json({ success: false, message: '用户名、密码和邮箱不能为空' });
    }
    
    const existingUser = getUserByUsername(username);
    
    if (existingUser) {
      return res.status(409).json({ success: false, message: '用户名已存在' });
    }
    
    const avatarUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${username}`;
    const userId = createUser(username, passwordHash, email, avatarUrl);
    
    res.json({ 
      success: true, 
      user: {
        id: userId,
        username,
        email,
        avatar_url: avatarUrl
      }
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ success: false, message: '注册失败' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 API服务器运行在 http://localhost:${PORT}`);
  console.log(`📋 可用端点：`);
  console.log(`  POST /api/login - 用户登录`);
  console.log(`  POST /api/register - 用户注册`);
});
