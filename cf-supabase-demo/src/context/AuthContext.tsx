import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// 从环境变量中获取Supabase配置
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

// 用户类型定义
interface User {
  id: number;
  username: string;
  account: string;
  icon: number;
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
  registerUser: (username: string, email: string, password: string) => Promise<void>;
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
        // 根据错误类型返回用户友好的错误信息
        if (error.code === 'PGRST116') {
          throw new Error('账号不存在或密码错误');
        } else {
          console.error('数据库错误:', error);
          throw new Error('登录失败，请稍后重试');
        }
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
      throw err; // 抛出错误，让调用者可以捕获并处理
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
        // 根据错误类型返回用户友好的错误信息
        if (error.code === 'PGRST116') {
          throw new Error('管理员账号不存在或密码错误');
        } else {
          console.error('数据库错误:', error);
          throw new Error('登录失败，请稍后重试');
        }
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
      throw err; // 抛出错误，让调用者可以捕获并处理
    } finally {
      setLoading(false);
    }
  };

  // 用户注册方法
  const registerUser = async (username: string, email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      // 检查邮箱是否已被注册
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('account', email)
        .single();

      if (existingUser) {
        throw new Error('该邮箱已被注册，请使用其他邮箱');
      }

      // 生成随机头像ID (1-9)
      const randomIcon = Math.floor(Math.random() * 9) + 1;

      // 将用户信息直接插入到users表中
      const { data: userData, error: insertError } = await supabase
        .from('users')
        .insert([
          {
            username,
            account: email,
            password, // 注意：实际应用中应该使用哈希密码
            icon: randomIcon,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
        .select();

      if (insertError) {
        throw insertError;
      }

      // 获取新注册用户的ID
      if (userData && userData.length > 0) {
        const userId = userData[0].id;

        // 查找一个未使用的试用会员激活码
        const { data: activationCodeData, error: activationCodeError } = await supabase
          .from('activation_codes')
          .select('*')
          .like('code', 'TEMP%')
          .eq('is_active', true)
          .eq('is_used', false)
          .limit(1)
          .single();

        if (activationCodeError && activationCodeError.code !== 'PGRST116') {
          console.error('获取试用激活码失败:', activationCodeError);
        } else if (activationCodeData) {
          // 计算会员到期日期（3天后）
          const today = new Date();
          const endDate = new Date();
          endDate.setDate(today.getDate() + activationCodeData.validity_days);

          // 格式化日期
          const formattedStartDate = today.toISOString();
          const formattedEndDate = endDate.toISOString();
          const remainingDays = activationCodeData.validity_days;

          // 创建用户会员信息记录
          const { error: userInfoError } = await supabase
            .from('user_info')
            .insert({
              user_id: userId,
              membership_type: 'temp_user',
              membership_code: activationCodeData.code,
              membership_start_date: formattedStartDate,
              membership_end_date: formattedEndDate,
              membership_remaining_days: remainingDays,
              is_active: true,
              created_at: formattedStartDate,
              updated_at: formattedStartDate
            });

          if (userInfoError) {
            console.error('创建用户会员信息失败:', userInfoError);
          } else {
            // 更新激活码为已使用状态
            await supabase
              .from('activation_codes')
              .update({
                is_used: true,
                user_id: userId,
              })
              .eq('id', activationCodeData.id);

            console.log('已自动为新用户激活试用会员');
          }
        } else {
          console.log('没有可用的试用会员激活码');
        }
      }
    } catch (err: any) {
      console.error('注册错误:', err);
      setError(err.message);
      throw err;
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
    registerUser,
    logout,
    clearError
  };

  console.log('AuthContext值:', { user, admin, hasSupabase: !!supabase });

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