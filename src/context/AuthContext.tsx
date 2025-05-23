import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// 从环境变量中获取Supabase配置
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 验证环境变量
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables:', {
    VITE_SUPABASE_URL: !!supabaseUrl,
    VITE_SUPABASE_ANON_KEY: !!supabaseKey
  });
  throw new Error('Missing required Supabase environment variables. Please check your .env file or environment configuration.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 用户类型定义
interface User {
  id: number;
  username: string;
  account: string;
}

// 管理员类型定义
interface Admin {
  id: number;
  admin_username: string;
  admin_permissions: string;
}

// 认证上下文类型定义
interface AuthContextType {
  user: User | null;
  admin: Admin | null;
  supabase: SupabaseClient;
  loading: boolean;
  error: string | null;
  loginUser: (account: string, password: string) => Promise<void>;
  loginAdmin: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

// 创建认证上下文
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 认证上下文提供者props类型
interface AuthProviderProps {
  children: ReactNode;
}

// 认证上下文提供者组件
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 用户登录方法
  const loginUser = async (account: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      // 查询用户表
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('account', account)
        .eq('password', password) // 注意：实际应用中应该使用哈希密码
        .eq('is_active', true)
        .single();

      if (error) {
        throw new Error('登录失败: ' + error.message);
      }

      if (!data) {
        throw new Error('用户名或密码错误');
      }

      setUser(data);
      localStorage.setItem('authType', 'user');
      localStorage.setItem('authData', JSON.stringify(data));
    } catch (err: any) {
      console.error('登录错误:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 管理员登录方法
  const loginAdmin = async (username: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      // 查询管理员表
      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .eq('admin_username', username)
        .eq('admin_password', password) // 注意：实际应用中应该使用哈希密码
        .eq('is_active', true)
        .single();

      if (error) {
        throw new Error('登录失败: ' + error.message);
      }

      if (!data) {
        throw new Error('管理员用户名或密码错误');
      }

      setAdmin(data);
      localStorage.setItem('authType', 'admin');
      localStorage.setItem('authData', JSON.stringify(data));
    } catch (err: any) {
      console.error('登录错误:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 登出方法
  const logout = async () => {
    setUser(null);
    setAdmin(null);
    localStorage.removeItem('authType');
    localStorage.removeItem('authData');
  };

  // 清除错误信息
  const clearError = () => {
    setError(null);
  };

  // 初始化时检查本地存储的登录状态
  useEffect(() => {
    const authType = localStorage.getItem('authType');
    const authData = localStorage.getItem('authData');

    if (authType && authData) {
      try {
        const parsedData = JSON.parse(authData);
        if (authType === 'user') {
          setUser(parsedData);
        } else if (authType === 'admin') {
          setAdmin(parsedData);
        }
      } catch (err) {
        console.error('解析存储的认证数据出错:', err);
        localStorage.removeItem('authType');
        localStorage.removeItem('authData');
      }
    }
  }, []);

  const value = {
    user,
    admin,
    supabase,
    loading,
    error,
    loginUser,
    loginAdmin,
    logout,
    clearError
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// 自定义hooks用于便捷获取认证上下文
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};