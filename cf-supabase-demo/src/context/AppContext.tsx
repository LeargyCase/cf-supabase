import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { DataService } from '../services';

interface AppContextType {
  dataService: DataService;
  isReady: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const { supabase } = useAuth();
  const [isReady, setIsReady] = useState(false);

  // 获取单例的数据服务实例
  const dataService = DataService.getInstance();

  // 初始化数据服务
  useEffect(() => {
    if (supabase) {
      try {
        dataService.initialize(supabase);
        setIsReady(true);
        console.log('数据服务已初始化完成');
      } catch (error) {
        console.error('初始化数据服务时出错:', error);
      }
    }
  }, [supabase]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      // 如果需要在组件卸载时执行清理，可以在这里添加
    };
  }, []);

  const value = {
    dataService,
    isReady
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// 自定义hook，方便获取应用上下文
export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}; 