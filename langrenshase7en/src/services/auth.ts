import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type User = Tables<'users'>;
export type AuthResponse = {
  user: User | null;
  error: string | null;
};

export const authService = {
  async login(username: string, password: string): Promise<AuthResponse> {
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();

      if (error) {
        return { user: null, error: '用户名或密码错误' };
      }

      if (!users) {
        return { user: null, error: '用户名或密码错误' };
      }

      const passwordMatch = await this.verifyPassword(password, users.password_hash);
      if (!passwordMatch) {
        return { user: null, error: '用户名或密码错误' };
      }

      const user = users as User;
      localStorage.setItem('user', JSON.stringify(user));
      
      return { user, error: null };
    } catch (error) {
      console.error('Login error:', error);
      return { user: null, error: '登录失败，请稍后重试' };
    }
  },

  async register(username: string, password: string, email?: string): Promise<AuthResponse> {
    try {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .single();

      if (existingUser) {
        return { user: null, error: '用户名已存在' };
      }

      const passwordHash = await this.hashPassword(password);

      const { data: newUser, error } = await supabase
        .from('users')
        .insert({
          username,
          password_hash: passwordHash,
          email: email || null,
          avatar_url: `https://api.dicebear.com/7.x/adventurer/svg?seed=${username}`,
        })
        .select()
        .single();

      if (error) {
        console.error('Register error:', error);
        return { user: null, error: '注册失败，请稍后重试' };
      }

      const user = newUser as User;
      localStorage.setItem('user', JSON.stringify(user));
      
      return { user, error: null };
    } catch (error) {
      console.error('Register error:', error);
      return { user: null, error: '注册失败，请稍后重试' };
    }
  },

  logout(): void {
    localStorage.removeItem('user');
  },

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr) as User;
    } catch {
      return null;
    }
  },

  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  },

  async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  },

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    const passwordHash = await this.hashPassword(password);
    return passwordHash === hash;
  },

  async updateProfile(userId: string, updates: Partial<User>): Promise<AuthResponse> {
    try {
      const { data: updatedUser, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('Update profile error:', error);
        return { user: null, error: '更新失败，请稍后重试' };
      }

      const user = updatedUser as User;
      localStorage.setItem('user', JSON.stringify(user));
      
      return { user, error: null };
    } catch (error) {
      console.error('Update profile error:', error);
      return { user: null, error: '更新失败，请稍后重试' };
    }
  },
};
