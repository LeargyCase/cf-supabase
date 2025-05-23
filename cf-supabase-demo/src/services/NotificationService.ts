import { SupabaseClient } from '@supabase/supabase-js';

interface NotificationListener {
  onNotify: (payload: any) => void;
}

interface Subscription {
  table: string;
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  listener: NotificationListener;
  subscription: any; // Supabase订阅对象
}

class NotificationService {
  private static instance: NotificationService;
  private supabase: SupabaseClient | null = null;
  private subscriptions: Subscription[] = [];
  private isInitialized: boolean = false;

  // 重要性配置: 定义哪些表格和事件是重要的，需要通知前端刷新
  private importanceConfig: Record<string, { [key: string]: boolean }> = {
    'job_recruitments': {
      'INSERT': true,   // 新招聘信息是重要的
      'UPDATE': true,   // 招聘信息更新是重要的
      'DELETE': true    // 招聘信息删除是重要的
    },
    'job_categories': {
      'INSERT': true,   // 新增分类是重要的
      'UPDATE': true,   // 更新分类是重要的
      'DELETE': true    // 删除分类是重要的
    },
    'tags': {
      'INSERT': true,   // 新增标签是重要的
      'UPDATE': true,   // 更新标签是重要的
      'DELETE': true    // 删除标签是重要的
    },
    'users': {
      'INSERT': false,  // 普通用户不需要知道新用户注册
      'UPDATE': false,  // 用户信息更新对其他用户不重要
      'DELETE': false   // 用户删除对其他用户不重要
    },
    'activation_codes': {
      'INSERT': false,  // 激活码变更对普通用户不重要
      'UPDATE': false,
      'DELETE': false
    },
    'job_tags': {
      'INSERT': true,   // 招聘信息标签关联变更是重要的
      'UPDATE': true,
      'DELETE': true
    }
  };

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * 初始化通知服务
   * @param supabase Supabase客户端
   */
  public initialize(supabase: SupabaseClient): void {
    if (this.isInitialized) return;
    
    this.supabase = supabase;
    this.isInitialized = true;
    console.log('通知服务已初始化');
  }

  /**
   * 订阅表格的变更事件
   * @param table 表格名称
   * @param event 事件类型（INSERT, UPDATE, DELETE, *）
   * @param listener 监听器对象
   * @returns 订阅ID
   */
  public subscribe(table: string, event: 'INSERT' | 'UPDATE' | 'DELETE' | '*', listener: NotificationListener): string {
    if (!this.isInitialized || !this.supabase) {
      throw new Error('通知服务尚未初始化');
    }

    // 生成唯一的订阅ID
    const subscriptionId = `${table}_${event}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 创建Supabase实时订阅
    const subscription = this.supabase
      .channel(subscriptionId)
      .on(
        'postgres_changes',
        {
          event: event,
          schema: 'public',
          table: table
        },
        (payload) => {
          console.log(`收到 ${table} 表的 ${event} 事件:`, payload);
          
          // 检查该变更的重要性
          if (this.isChangeImportant(table, event)) {
            listener.onNotify(payload);
          }
        }
      )
      .subscribe();

    // 将订阅信息保存到订阅列表
    this.subscriptions.push({
      table,
      event,
      listener,
      subscription
    });

    console.log(`已订阅 ${table} 表的 ${event} 事件`);
    return subscriptionId;
  }

  /**
   * 取消订阅
   * @param table 表格名称
   * @param event 事件类型
   * @param listener 监听器对象（可选，如果不提供，则取消该表格和事件的所有订阅）
   */
  public unsubscribe(table: string, event: 'INSERT' | 'UPDATE' | 'DELETE' | '*', listener?: NotificationListener): void {
    if (!this.isInitialized || !this.supabase) {
      throw new Error('通知服务尚未初始化');
    }

    // 找到要取消的订阅
    const subscriptionsToRemove = this.subscriptions.filter(
      sub => sub.table === table && sub.event === event && (!listener || sub.listener === listener)
    );

    // 取消每个匹配的订阅
    subscriptionsToRemove.forEach(sub => {
      if (this.supabase) {
        this.supabase.removeChannel(sub.subscription);
      }
      
      // 从订阅列表中移除
      const index = this.subscriptions.indexOf(sub);
      if (index !== -1) {
        this.subscriptions.splice(index, 1);
      }
    });

    console.log(`已取消 ${subscriptionsToRemove.length} 个 ${table} 表的 ${event} 事件订阅`);
  }

  /**
   * 取消所有订阅
   */
  public unsubscribeAll(): void {
    if (!this.isInitialized || !this.supabase) {
      throw new Error('通知服务尚未初始化');
    }

    // 取消所有订阅
    this.subscriptions.forEach(sub => {
      if (this.supabase) {
        this.supabase.removeChannel(sub.subscription);
      }
    });

    // 清空订阅列表
    this.subscriptions = [];
    console.log('已取消所有订阅');
  }

  /**
   * 判断变更是否重要
   * @param table 表格名称
   * @param event 事件类型
   * @returns 是否重要
   */
  private isChangeImportant(table: string, event: string): boolean {
    // 如果没有为表格配置重要性，默认为重要
    if (!this.importanceConfig[table]) {
      return true;
    }
    
    // 如果没有为事件配置重要性，默认为重要
    if (this.importanceConfig[table][event] === undefined) {
      return true;
    }
    
    // 返回配置的重要性
    return this.importanceConfig[table][event];
  }
}

export default NotificationService; 