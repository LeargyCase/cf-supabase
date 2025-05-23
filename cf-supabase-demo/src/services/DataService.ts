import { SupabaseClient } from '@supabase/supabase-js';
import CacheService from './CacheService';
import NotificationService from './NotificationService';

// 数据类型定义
interface Job {
  id: number;
  job_title: string;
  company: string;
  description: string;
  category_id: number[];
  post_time: string;
  last_update: string;
  deadline: string;
  job_location: string;
  job_position: string;
  job_major: string;
  job_graduation_year: string;
  job_education_requirement: string;
  application_link: string;
  views_count: number;
  favorites_count: number;
  applications_count: number;
  is_active: boolean;
  is_24hnew: boolean;
  is_pregraduation: boolean;
  created_at: string;
  updated_at: string;
}

interface Category {
  id: number;
  category: string;
  category_number: number;
  active_job_count: number;
  is_active: boolean;
}

interface Tag {
  id: number;
  tag_name: string;
  tag_type: string;
  is_active: boolean;
  created_at: string;
}

interface User {
  id: number;
  username: string;
  account: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ActivationCode {
  id: number;
  code: string;
  is_active: boolean;
  is_used: boolean;
  validity_days: number;
  user_id: number | null;
  created_at: string;
}

// 统计数据类型
interface Statistics {
  totalJobs: number;
  activeJobs: number;
  totalUsers: number;
  activeUsers: number;
  totalActivationCodes: number;
  usedActivationCodes: number;
}

// 修改用户行为类型定义
interface UserAction {
  id: number;
  user_id: number;
  favorite_job_ids: number[];
  application_job_ids: number[];
  updated_at: string;
  created_at: string;
}

interface UserActionCallback extends DataCallback<UserAction> {}

// 回调函数类型
interface DataCallback<T> {
  (data: T[]): void;
}

// 添加JobTag接口定义
interface JobTag {
  job_id: number;
  time_tag_id?: number;
  action_tag_id?: number;
}

class DataService {
  private static instance: DataService;
  private supabase: SupabaseClient | null = null;
  private cacheService: CacheService;
  private notificationService: NotificationService;
  private isInitialized: boolean = false;

  // 数据刷新回调列表
  private jobsCallbacks: DataCallback<Job>[] = [];
  private categoriesCallbacks: DataCallback<Category>[] = [];
  private tagsCallbacks: DataCallback<Tag>[] = [];
  private usersCallbacks: DataCallback<User>[] = [];
  private activationCodesCallbacks: DataCallback<ActivationCode>[] = [];
  private statisticsCallbacks: DataCallback<Statistics>[] = [];
  private userActionsCallbacks: UserActionCallback[] = [];

  private constructor() {
    this.cacheService = CacheService.getInstance();
    this.notificationService = NotificationService.getInstance();
  }

  public static getInstance(): DataService {
    if (!DataService.instance) {
      DataService.instance = new DataService();
    }
    return DataService.instance;
  }

  /**
   * 初始化数据服务
   * @param supabase Supabase客户端
   */
  public initialize(supabase: SupabaseClient): void {
    if (this.isInitialized) return;

    this.supabase = supabase;

    // 初始化通知服务
    this.notificationService.initialize(supabase);

    // 设置各种数据表的订阅
    this.setupSubscriptions();

    this.isInitialized = true;
    console.log('数据服务已初始化');
  }

  /**
   * 设置数据订阅
   */
  private setupSubscriptions(): void {
    if (!this.notificationService || !this.supabase) return;

    // 订阅招聘信息变更
    this.notificationService.subscribe('job_recruitments', '*', {
      onNotify: (payload) => {
        console.log('招聘信息变更:', payload);
        // 清除相关缓存
        this.cacheService.clearTypeCache('jobs');
        // 通知订阅者
        this.refreshJobs();
      }
    });

    // 订阅分类信息变更
    this.notificationService.subscribe('job_categories', '*', {
      onNotify: (payload) => {
        console.log('分类信息变更:', payload);
        // 清除相关缓存
        this.cacheService.clearTypeCache('categories');
        // 通知订阅者
        this.refreshCategories();
      }
    });

    // 订阅标签信息变更
    this.notificationService.subscribe('tags', '*', {
      onNotify: (payload) => {
        console.log('标签信息变更:', payload);
        // 清除相关缓存
        this.cacheService.clearTypeCache('tags');
        // 通知订阅者
        this.refreshTags();
      }
    });

    // 订阅招聘信息与标签关系变更
    this.notificationService.subscribe('job_tags', '*', {
      onNotify: (payload) => {
        console.log('招聘信息标签关系变更:', payload);
        // 清除相关缓存
        this.cacheService.clearTypeCache('jobs');
        // 通知订阅者
        this.refreshJobs();
      }
    });

    // 订阅用户行为变更
    this.notificationService.subscribe('user_actions', '*', {
      onNotify: (payload) => {
        console.log('用户行为变更:', payload);
        // 清除相关缓存
        this.cacheService.clearTypeCache('userActions');
        this.cacheService.clearTypeCache('jobs');
        // 通知订阅者
        this.refreshUserActions();
        this.refreshJobs();
      }
    });
  }

  /**
   * 获取招聘信息列表
   * @param callback 回调函数，接收招聘信息数据
   * @param forceRefresh 是否强制刷新，忽略缓存
   */
  public getJobs(callback: DataCallback<Job>, forceRefresh: boolean = false): void {
    if (!this.isInitialized || !this.supabase) {
      throw new Error('数据服务尚未初始化');
    }

    // 添加回调到列表
    if (!this.jobsCallbacks.includes(callback)) {
      this.jobsCallbacks.push(callback);
    }

    // 检查缓存
    const cacheKey = 'jobs:all';
    const cachedData = this.cacheService.get<Job[]>(cacheKey);

    if (cachedData && !forceRefresh) {
      // 使用缓存数据
      callback(cachedData);
      return;
    }

    // 从数据库获取数据
    this.supabase
      .from('job_recruitments')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error('获取招聘信息错误:', error);
          return;
        }

        // 缓存数据
        this.cacheService.set(cacheKey, data);

        // 调用回调
        callback(data);
      });
  }

  /**
   * 获取分类列表
   * @param callback 回调函数，接收分类数据
   * @param forceRefresh 是否强制刷新，忽略缓存
   */
  public getCategories(callback: DataCallback<Category>, forceRefresh: boolean = false): void {
    if (!this.isInitialized || !this.supabase) {
      throw new Error('数据服务尚未初始化');
    }

    // 添加回调到列表
    if (!this.categoriesCallbacks.includes(callback)) {
      this.categoriesCallbacks.push(callback);
    }

    // 检查缓存
    const cacheKey = 'categories:all';
    const cachedData = this.cacheService.get<Category[]>(cacheKey);

    if (cachedData && !forceRefresh) {
      // 使用缓存数据
      callback(cachedData);
      return;
    }

    // 从数据库获取数据
    this.supabase
      .from('job_categories')
      .select('*')
      .order('id')
      .then(({ data, error }) => {
        if (error) {
          console.error('获取分类信息错误:', error);
          return;
        }

        // 缓存数据
        this.cacheService.set(cacheKey, data);

        // 调用回调
        callback(data);
      });
  }

  /**
   * 获取标签列表
   * @param callback 回调函数，接收标签数据
   * @param forceRefresh 是否强制刷新，忽略缓存
   */
  public getTags(callback: DataCallback<Tag>, forceRefresh: boolean = false): void {
    if (!this.isInitialized || !this.supabase) {
      throw new Error('数据服务尚未初始化');
    }

    // 添加回调到列表
    if (!this.tagsCallbacks.includes(callback)) {
      this.tagsCallbacks.push(callback);
    }

    // 检查缓存
    const cacheKey = 'tags:all';
    const cachedData = this.cacheService.get<Tag[]>(cacheKey);

    if (cachedData && !forceRefresh) {
      // 使用缓存数据
      callback(cachedData);
      return;
    }

    // 从数据库获取数据
    this.supabase
      .from('tags')
      .select('*')
      .order('tag_type')
      .order('tag_name')
      .then(({ data, error }) => {
        if (error) {
          console.error('获取标签信息错误:', error);
          return;
        }

        // 缓存数据
        this.cacheService.set(cacheKey, data);

        // 调用回调
        callback(data);
      });
  }

  /**
   * 获取用户列表
   * @param callback 回调函数，接收用户数据
   * @param forceRefresh 是否强制刷新，忽略缓存
   */
  public getUsers(callback: DataCallback<User>, forceRefresh: boolean = false): void {
    if (!this.isInitialized || !this.supabase) {
      throw new Error('数据服务尚未初始化');
    }

    // 添加回调到列表
    if (!this.usersCallbacks.includes(callback)) {
      this.usersCallbacks.push(callback);
    }

    // 检查缓存
    const cacheKey = 'users:all';
    const cachedData = this.cacheService.get<User[]>(cacheKey);

    if (cachedData && !forceRefresh) {
      // 使用缓存数据
      callback(cachedData);
      return;
    }

    // 从数据库获取数据
    this.supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error('获取用户信息错误:', error);
          return;
        }

        // 缓存数据
        this.cacheService.set(cacheKey, data);

        // 调用回调
        callback(data);
      });
  }

  /**
   * 获取激活码列表
   * @param callback 回调函数，接收激活码数据
   * @param forceRefresh 是否强制刷新，忽略缓存
   */
  public getActivationCodes(callback: DataCallback<ActivationCode>, forceRefresh: boolean = false): void {
    if (!this.isInitialized || !this.supabase) {
      throw new Error('数据服务尚未初始化');
    }

    // 添加回调到列表
    if (!this.activationCodesCallbacks.includes(callback)) {
      this.activationCodesCallbacks.push(callback);
    }

    // 检查缓存
    const cacheKey = 'activationCodes:all';
    const cachedData = this.cacheService.get<ActivationCode[]>(cacheKey);

    if (cachedData && !forceRefresh) {
      // 使用缓存数据
      callback(cachedData);
      return;
    }

    // 从数据库获取数据
    this.supabase
      .from('activation_codes')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error('获取激活码信息错误:', error);
          return;
        }

        // 缓存数据
        this.cacheService.set(cacheKey, data);

        // 调用回调
        callback(data);
      });
  }

  /**
   * 获取统计数据
   * @param callback 回调函数，接收统计数据
   * @param forceRefresh 是否强制刷新，忽略缓存
   */
  public getStatistics(callback: DataCallback<Statistics>, forceRefresh: boolean = false): void {
    if (!this.isInitialized || !this.supabase) {
      throw new Error('数据服务尚未初始化');
    }

    // 添加回调到列表
    if (!this.statisticsCallbacks.includes(callback)) {
      this.statisticsCallbacks.push(callback);
    }

    // 检查缓存
    const cacheKey = 'statistics:all';
    const cachedData = this.cacheService.get<Statistics[]>(cacheKey);

    if (cachedData && !forceRefresh) {
      // 使用缓存数据
      callback(cachedData);
      return;
    }

    // 计算统计数据
    this.calculateStatistics().then(stats => {
      // 缓存数据
      this.cacheService.set(cacheKey, [stats]);

      // 调用回调
      callback([stats]);
    });
  }

  /**
   * 计算统计数据
   * @returns 统计数据Promise
   */
  private async calculateStatistics(): Promise<Statistics> {
    if (!this.supabase) {
      throw new Error('数据服务尚未初始化');
    }

    try {
      // 获取招聘信息统计
      const { data: jobsData, error: jobsError } = await this.supabase
        .from('job_recruitments')
        .select('id, is_active', { count: 'exact' });

      if (jobsError) throw jobsError;

      const activeJobs = jobsData?.filter(job => job.is_active).length || 0;

      // 获取用户统计
      const { data: usersData, error: usersError } = await this.supabase
        .from('users')
        .select('id, is_active', { count: 'exact' });

      if (usersError) throw usersError;

      const activeUsers = usersData?.filter(user => user.is_active).length || 0;

      // 获取激活码统计
      const { data: codesData, error: codesError } = await this.supabase
        .from('activation_codes')
        .select('id, is_used', { count: 'exact' });

      if (codesError) throw codesError;

      const usedCodes = codesData?.filter(code => code.is_used).length || 0;

      return {
        totalJobs: jobsData?.length || 0,
        activeJobs,
        totalUsers: usersData?.length || 0,
        activeUsers,
        totalActivationCodes: codesData?.length || 0,
        usedActivationCodes: usedCodes,
      };
    } catch (error) {
      console.error('计算统计数据错误:', error);
      // 返回空统计
      return {
        totalJobs: 0,
        activeJobs: 0,
        totalUsers: 0,
        activeUsers: 0,
        totalActivationCodes: 0,
        usedActivationCodes: 0,
      };
    }
  }

  /**
   * 刷新招聘信息数据
   */
  public refreshJobs(): void {
    if (!this.isInitialized || !this.supabase) return;

    // 从数据库重新获取数据
    this.supabase
      .from('job_recruitments')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error('刷新招聘信息错误:', error);
          return;
        }

        // 更新缓存
        this.cacheService.set('jobs:all', data);

        // 通知所有订阅者
        this.jobsCallbacks.forEach(callback => callback(data));
      });
  }

  /**
   * 刷新分类数据
   */
  public refreshCategories(): void {
    if (!this.isInitialized || !this.supabase) return;

    // 从数据库重新获取数据
    this.supabase
      .from('job_categories')
      .select('*')
      .order('id')
      .then(({ data, error }) => {
        if (error) {
          console.error('刷新分类信息错误:', error);
          return;
        }

        // 更新缓存
        this.cacheService.set('categories:all', data);

        // 通知所有订阅者
        this.categoriesCallbacks.forEach(callback => callback(data));
      });
  }

  /**
   * 刷新标签数据
   */
  public refreshTags(): void {
    if (!this.isInitialized || !this.supabase) return;

    // 从数据库重新获取数据
    this.supabase
      .from('tags')
      .select('*')
      .order('tag_type')
      .order('tag_name')
      .then(({ data, error }) => {
        if (error) {
          console.error('刷新标签信息错误:', error);
          return;
        }

        // 更新缓存
        this.cacheService.set('tags:all', data);

        // 通知所有订阅者
        this.tagsCallbacks.forEach(callback => callback(data));
      });
  }

  /**
   * 刷新用户数据
   */
  public refreshUsers(): void {
    if (!this.isInitialized || !this.supabase) return;

    // 从数据库重新获取数据
    this.supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error('刷新用户信息错误:', error);
          return;
        }

        // 更新缓存
        this.cacheService.set('users:all', data);

        // 通知所有订阅者
        this.usersCallbacks.forEach(callback => callback(data));
      });
  }

  /**
   * 刷新激活码数据
   */
  public refreshActivationCodes(): void {
    if (!this.isInitialized || !this.supabase) return;

    // 从数据库重新获取数据
    this.supabase
      .from('activation_codes')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error('刷新激活码信息错误:', error);
          return;
        }

        // 更新缓存
        this.cacheService.set('activationCodes:all', data);

        // 通知所有订阅者
        this.activationCodesCallbacks.forEach(callback => callback(data));
      });
  }

  /**
   * 刷新统计数据
   */
  public refreshStatistics(): void {
    if (!this.isInitialized || !this.supabase) return;

    // 重新计算统计数据
    this.calculateStatistics().then(stats => {
      // 更新缓存
      this.cacheService.set('statistics:all', [stats]);

      // 通知所有订阅者
      this.statisticsCallbacks.forEach(callback => callback([stats]));
    });
  }

  /**
   * 获取用户的行为记录
   * @param userId 用户ID
   * @param callback 回调函数
   * @param forceRefresh 是否强制刷新
   */
  public getUserActions(
    userId: number,
    callback: UserActionCallback,
    forceRefresh: boolean = false
  ): void {
    if (!this.isInitialized || !this.supabase) {
      throw new Error('数据服务尚未初始化');
    }

    // 添加回调到列表
    if (!this.userActionsCallbacks.includes(callback)) {
      this.userActionsCallbacks.push(callback);
    }

    // 构建缓存键
    const cacheKey = `userActions:${userId}`;
    const cachedData = this.cacheService.get<UserAction[]>(cacheKey);

    if (cachedData && !forceRefresh) {
      // 使用缓存数据
      callback(cachedData);
      return;
    }

    // 查询用户行为记录
    this.supabase
      .from('user_actions')
      .select('*')
      .eq('user_id', userId)
      .then(({ data, error }) => {
        if (error) {
          console.error('获取用户行为记录错误:', error);
          return;
        }

        // 缓存数据
        this.cacheService.set(cacheKey, data || []);

        // 调用回调
        callback(data || []);
      });
  }

  /**
   * 获取用户收藏的职位ID列表
   * @param userId 用户ID
   * @returns Promise<number[]>
   */
  public async getFavoriteJobIds(userId: number): Promise<number[]> {
    if (!this.isInitialized || !this.supabase) {
      throw new Error('数据服务尚未初始化');
    }

    // 首先尝试从缓存获取
    const cacheKey = `favoriteJobIds:${userId}`;
    const cachedIds = this.cacheService.get<number[]>(cacheKey);

    if (cachedIds) {
      return cachedIds;
    }

    try {
      const { data, error } = await this.supabase
        .from('user_actions')
        .select('favorite_job_ids')
        .eq('user_id', userId)
        .single();

      if (error) {
        // 如果是没找到记录的错误，返回空数组
        if (error.code === 'PGRST116') {
          return [];
        }
        console.error('获取收藏职位ID错误:', error);
        throw error;
      }

      const favoriteIds = data?.favorite_job_ids || [];

      // 缓存数据
      this.cacheService.set(cacheKey, favoriteIds, { expiresIn: 5 * 60 * 1000 }); // 5分钟缓存

      return favoriteIds;
    } catch (error) {
      console.error('获取收藏职位ID失败:', error);
      return [];
    }
  }

  /**
   * 获取用户投递的职位ID列表
   * @param userId 用户ID
   * @returns Promise<number[]>
   */
  public async getApplicationJobIds(userId: number): Promise<number[]> {
    if (!this.isInitialized || !this.supabase) {
      throw new Error('数据服务尚未初始化');
    }

    // 首先尝试从缓存获取
    const cacheKey = `applicationJobIds:${userId}`;
    const cachedIds = this.cacheService.get<number[]>(cacheKey);

    if (cachedIds) {
      return cachedIds;
    }

    try {
      const { data, error } = await this.supabase
        .from('user_actions')
        .select('application_job_ids')
        .eq('user_id', userId)
        .single();

      if (error) {
        // 如果是没找到记录的错误，返回空数组
        if (error.code === 'PGRST116') {
          return [];
        }
        console.error('获取投递职位ID错误:', error);
        throw error;
      }

      const applicationIds = data?.application_job_ids || [];

      // 缓存数据
      this.cacheService.set(cacheKey, applicationIds, { expiresIn: 5 * 60 * 1000 }); // 5分钟缓存

      return applicationIds;
    } catch (error) {
      console.error('获取投递职位ID失败:', error);
      return [];
    }
  }

  /**
   * 获取用户收藏的招聘信息
   * @param userId 用户ID
   * @param callback 回调函数
   * @param forceRefresh 是否强制刷新
   */
  public getUserFavoriteJobs(
    userId: number,
    callback: DataCallback<Job>,
    forceRefresh: boolean = false
  ): void {
    if (!this.isInitialized || !this.supabase) {
      throw new Error('数据服务尚未初始化');
    }

    // 构建缓存键
    const cacheKey = `userFavoriteJobs:${userId}`;
    const cachedData = this.cacheService.get<Job[]>(cacheKey);

    // 设置一个请求中的标记，避免重复请求
    const requestingKey = `requesting:${cacheKey}`;
    const isRequesting = this.cacheService.get<boolean>(requestingKey);

    // 如果有缓存数据并且不需要强制刷新，直接返回缓存数据
    if (cachedData && !forceRefresh) {
      callback(cachedData);
      return;
    }

    // 如果已经在请求中，不再发起新请求
    if (isRequesting && !forceRefresh) {
      console.log('已经有相同请求在进行中，跳过重复请求');
      if (cachedData) {
        callback(cachedData);
      }
      return;
    }

    // 标记为请求中
    this.cacheService.set(requestingKey, true, { expiresIn: 30000 }); // 30秒过期

    // 显示加载状态
    callback([]);

    // 获取用户收藏的职位ID
    this.getFavoriteJobIds(userId)
      .then(jobIds => {
        if (jobIds.length === 0) {
          // 没有收藏记录
          this.cacheService.set(cacheKey, []);
          callback([]);
          // 移除请求中标记
          this.cacheService.remove(requestingKey);
          return;
        }

        // 查询对应的招聘信息详情
        this.supabase?.from('job_recruitments')
          .select('*')
          .in('id', jobIds)
          .order('updated_at', { ascending: false })
          .then(({ data: jobData, error: jobError }) => {
            // 移除请求中标记
            this.cacheService.remove(requestingKey);

            if (jobError) {
              console.error('获取招聘信息详情错误:', jobError);
              callback([]);
              return;
            }

            // 确保数据不为null
            const validJobData = jobData || [];

            // 排序结果，使其与jobIds的顺序一致（最近收藏的排在前面）
            const sortedJobs = [...validJobData].sort((a, b) => {
              const indexA = jobIds.indexOf(a.id);
              const indexB = jobIds.indexOf(b.id);
              return indexA - indexB;
            });

            // 缓存数据
            this.cacheService.set(cacheKey, sortedJobs);

            // 调用回调
            callback(sortedJobs);
          })
          .catch(error => {
            // 移除请求中标记
            this.cacheService.remove(requestingKey);
            console.error('查询招聘信息失败:', error);
            callback([]);
          });
      })
      .catch(err => {
        // 移除请求中标记
        this.cacheService.remove(requestingKey);
        console.error('获取用户收藏职位ID错误:', err);
        callback([]);
      });
  }

  /**
   * 获取用户投递的招聘信息
   * @param userId 用户ID
   * @param callback 回调函数
   * @param forceRefresh 是否强制刷新
   */
  public getUserApplicationJobs(
    userId: number,
    callback: DataCallback<Job>,
    forceRefresh: boolean = false
  ): void {
    if (!this.isInitialized || !this.supabase) {
      throw new Error('数据服务尚未初始化');
    }

    // 构建缓存键
    const cacheKey = `userApplicationJobs:${userId}`;
    const cachedData = this.cacheService.get<Job[]>(cacheKey);

    // 设置一个请求中的标记，避免重复请求
    const requestingKey = `requesting:${cacheKey}`;
    const isRequesting = this.cacheService.get<boolean>(requestingKey);

    // 如果有缓存数据并且不需要强制刷新，直接返回缓存数据
    if (cachedData && !forceRefresh) {
      callback(cachedData);
      return;
    }

    // 如果已经在请求中，不再发起新请求
    if (isRequesting && !forceRefresh) {
      console.log('已经有相同请求在进行中，跳过重复请求');
      if (cachedData) {
        callback(cachedData);
      }
      return;
    }

    // 标记为请求中
    this.cacheService.set(requestingKey, true, { expiresIn: 30000 }); // 30秒过期

    // 显示加载状态
    callback([]);

    // 获取用户投递的职位ID
    this.getApplicationJobIds(userId)
      .then(jobIds => {
        if (jobIds.length === 0) {
          // 没有投递记录
          this.cacheService.set(cacheKey, []);
          callback([]);
          // 移除请求中标记
          this.cacheService.remove(requestingKey);
          return;
        }

        // 查询对应的招聘信息详情
        this.supabase?.from('job_recruitments')
          .select('*')
          .in('id', jobIds)
          .order('updated_at', { ascending: false })
          .then(({ data: jobData, error: jobError }) => {
            // 移除请求中标记
            this.cacheService.remove(requestingKey);

            if (jobError) {
              console.error('获取招聘信息详情错误:', jobError);
              callback([]);
              return;
            }

            // 确保数据不为null
            const validJobData = jobData || [];

            // 排序结果，使其与jobIds的顺序一致（最近投递的排在前面）
            const sortedJobs = [...validJobData].sort((a, b) => {
              const indexA = jobIds.indexOf(a.id);
              const indexB = jobIds.indexOf(b.id);
              return indexA - indexB;
            });

            // 缓存数据
            this.cacheService.set(cacheKey, sortedJobs);

            // 调用回调
            callback(sortedJobs);
          })
          .catch(error => {
            // 移除请求中标记
            this.cacheService.remove(requestingKey);
            console.error('查询招聘信息失败:', error);
            callback([]);
          });
      })
      .catch(err => {
        // 移除请求中标记
        this.cacheService.remove(requestingKey);
        console.error('获取用户投递职位ID错误:', err);
        callback([]);
      });
  }

  /**
   * 添加或删除用户收藏
   * @param userId 用户ID
   * @param jobId 招聘信息ID
   * @param isFavorite 是否收藏
   * @returns Promise
   */
  public async toggleFavorite(userId: number, jobId: number, isFavorite: boolean): Promise<void> {
    if (!this.isInitialized || !this.supabase) {
      throw new Error('数据服务尚未初始化');
    }

    try {
      if (isFavorite) {
        // 添加收藏
        const { error } = await this.supabase
          .rpc('add_favorite_job', {
            user_id_param: userId,
            job_id_param: jobId
          });

        if (error) {
          console.error('添加收藏错误:', error);
          throw error;
        }

        // 更新本地缓存
        this.updateLocalFavoriteCache(userId, jobId, true);

      } else {
        // 取消收藏
        const { error } = await this.supabase
          .rpc('remove_favorite_job', {
            user_id_param: userId,
            job_id_param: jobId
          });

        if (error) {
          console.error('取消收藏错误:', error);
          throw error;
        }

        // 更新本地缓存
        this.updateLocalFavoriteCache(userId, jobId, false);
      }

      // 清除所有相关缓存
      // 1. 直接清除与用户相关的缓存
      this.cacheService.remove(`userFavoriteJobs:${userId}`);
      this.cacheService.remove(`userActions:${userId}`);
      this.cacheService.remove(`favoriteJobIds:${userId}`);

      // 2. 清除可能包含该职位的缓存
      this.cacheService.remove(`jobs:${jobId}`);

      // 3. 清除类型缓存
      this.cacheService.clearTypeCache('userActions');
      this.cacheService.clearTypeCache('jobs');

      // 4. 强制触发全局刷新
      this.refreshUserActions();
      this.refreshJobs();

      console.log(`用户${userId}${isFavorite ? '收藏' : '取消收藏'}职位${jobId}成功，已清除相关缓存`);
    } catch (error) {
      console.error('切换收藏状态失败:', error);
      throw error;
    }
  }

  /**
   * 更新本地收藏缓存
   * @param userId 用户ID
   * @param jobId 职位ID
   * @param isAdd 是否添加（true为添加，false为移除）
   */
  private updateLocalFavoriteCache(userId: number, jobId: number, isAdd: boolean): void {
    const cacheKey = `favoriteJobIds:${userId}`;
    const cachedIds = this.cacheService.get<number[]>(cacheKey) || [];

    if (isAdd) {
      // 添加ID
      if (!cachedIds.includes(jobId)) {
        cachedIds.unshift(jobId); // 新收藏的放在前面
        this.cacheService.set(cacheKey, cachedIds);
      }
    } else {
      // 移除ID
      const newIds = cachedIds.filter(id => id !== jobId);
      this.cacheService.set(cacheKey, newIds);
    }
  }

  /**
   * 添加用户投递记录
   * @param userId 用户ID
   * @param jobId 招聘信息ID
   * @returns Promise
   */
  public async addApplication(userId: number, jobId: number): Promise<void> {
    if (!this.isInitialized || !this.supabase) {
      throw new Error('数据服务尚未初始化');
    }

    try {
      // 添加投递记录
      const { error } = await this.supabase
        .rpc('add_application_job', {
          user_id_param: userId,
          job_id_param: jobId
        });

      if (error) {
        console.error('添加投递记录错误:', error);
        throw error;
      }

      // 更新本地缓存
      this.updateLocalApplicationCache(userId, jobId, true);

      // 清除相关缓存
      this.cacheService.clearKey(`userApplicationJobs:${userId}`);
      this.cacheService.clearKey(`userActions:${userId}`);
      this.cacheService.clearKey(`applicationJobIds:${userId}`);
      this.cacheService.clearTypeCache('jobs');

      // 刷新数据
      this.refreshUserActions();
      this.refreshJobs();
    } catch (error) {
      console.error('添加投递记录失败:', error);
      throw error;
    }
  }

  /**
   * 更新本地投递缓存
   * @param userId 用户ID
   * @param jobId 职位ID
   * @param isAdd 是否添加（true为添加，false为移除）
   */
  private updateLocalApplicationCache(userId: number, jobId: number, isAdd: boolean = true): void {
    const cacheKey = `applicationJobIds:${userId}`;
    const cachedIds = this.cacheService.get<number[]>(cacheKey) || [];

    if (isAdd) {
      // 添加ID（如果不存在）
      if (!cachedIds.includes(jobId)) {
        cachedIds.unshift(jobId); // 新投递的放在前面
        this.cacheService.set(cacheKey, cachedIds);
      }
    } else {
      // 移除ID
      const newIds = cachedIds.filter(id => id !== jobId);
      this.cacheService.set(cacheKey, newIds);
    }
  }

  /**
   * 删除用户投递记录
   * @param userId 用户ID
   * @param jobId 招聘信息ID
   * @returns Promise
   */
  public async removeApplication(userId: number, jobId: number): Promise<void> {
    if (!this.isInitialized || !this.supabase) {
      throw new Error('数据服务尚未初始化');
    }

    try {
      // 删除投递记录
      const { error } = await this.supabase
        .rpc('remove_application_job', {
          user_id_param: userId,
          job_id_param: jobId
        });

      if (error) {
        console.error('删除投递记录错误:', error);
        throw error;
      }

      // 更新本地缓存
      this.updateLocalApplicationCache(userId, jobId, false);

      // 清除相关缓存
      this.cacheService.clearKey(`userApplicationJobs:${userId}`);
      this.cacheService.clearKey(`userActions:${userId}`);
      this.cacheService.clearKey(`applicationJobIds:${userId}`);
      this.cacheService.clearTypeCache('jobs');

      // 刷新数据
      this.refreshUserActions();
      this.refreshJobs();
    } catch (error) {
      console.error('删除投递记录失败:', error);
      throw error;
    }
  }

  /**
   * 检查用户是否已收藏招聘信息
   * @param userId 用户ID
   * @param jobId 招聘信息ID
   * @returns Promise<boolean>
   */
  public async checkIsFavorite(userId: number, jobId: number): Promise<boolean> {
    if (!this.isInitialized || !this.supabase) {
      throw new Error('数据服务尚未初始化');
    }

    // 首先尝试从本地缓存中获取收藏ID列表
    const cacheKey = `favoriteJobIds:${userId}`;
    const cachedIds = this.cacheService.get<number[]>(cacheKey);

    // 如果缓存有数据，直接从缓存判断
    if (cachedIds) {
      return cachedIds.includes(jobId);
    }

    // 缓存没有数据，查询数据库
    try {
      const { data, error } = await this.supabase
        .rpc('is_job_favorited', {
          user_id_param: userId,
          job_id_param: jobId
        });

      if (error) {
        console.error('检查收藏状态错误:', error);
        return false;
      }

      // 同时获取完整的收藏ID列表，并更新缓存（避免未来重复请求）
      this.getFavoriteJobIds(userId)
        .then(ids => {
          // 这里不需要做任何处理，getFavoriteJobIds内部会更新缓存
        })
        .catch(err => {
          console.error('获取收藏列表失败:', err);
        });

      return !!data;
    } catch (error) {
      console.error('检查收藏状态失败:', error);
      return false;
    }
  }

  /**
   * 检查用户是否已投递招聘信息
   * @param userId 用户ID
   * @param jobId 招聘信息ID
   * @returns Promise<boolean>
   */
  public async checkIsApplied(userId: number, jobId: number): Promise<boolean> {
    if (!this.isInitialized || !this.supabase) {
      throw new Error('数据服务尚未初始化');
    }

    // 首先尝试从本地缓存中获取投递ID列表
    const cacheKey = `applicationJobIds:${userId}`;
    const cachedIds = this.cacheService.get<number[]>(cacheKey);

    // 如果缓存有数据，直接从缓存判断
    if (cachedIds) {
      return cachedIds.includes(jobId);
    }

    // 缓存没有数据，查询数据库
    try {
      const { data, error } = await this.supabase
        .rpc('is_job_applied', {
          user_id_param: userId,
          job_id_param: jobId
        });

      if (error) {
        console.error('检查投递状态错误:', error);
        return false;
      }

      // 同时获取完整的投递ID列表，并更新缓存（避免未来重复请求）
      this.getApplicationJobIds(userId)
        .then(ids => {
          // 这里不需要做任何处理，getApplicationJobIds内部会更新缓存
        })
        .catch(err => {
          console.error('获取投递列表失败:', err);
        });

      return !!data;
    } catch (error) {
      console.error('检查投递状态失败:', error);
      return false;
    }
  }

  /**
   * 刷新用户行为数据
   */
  public refreshUserActions(): void {
    if (!this.isInitialized) {
      console.warn('数据服务尚未初始化，无法刷新用户行为数据');
      return;
    }

    // 清除缓存
    this.cacheService.clearTypeCache('userActions');
    this.cacheService.clearTypeCache('userFavoriteJobs');
    this.cacheService.clearTypeCache('userApplicationJobs');

    // 通知回调
    this.userActionsCallbacks.forEach(callback => {
      // 由于这里不知道具体的userId和actionType，回调函数需要自行处理刷新
      callback([]);
    });
  }

  /**
   * 取消订阅数据更新
   * @param callback 要取消的回调函数
   */
  public unsubscribe(callback: Function): void {
    // 从所有回调列表中移除该回调
    this.jobsCallbacks = this.jobsCallbacks.filter(cb => cb !== callback);
    this.categoriesCallbacks = this.categoriesCallbacks.filter(cb => cb !== callback);
    this.tagsCallbacks = this.tagsCallbacks.filter(cb => cb !== callback);
    this.usersCallbacks = this.usersCallbacks.filter(cb => cb !== callback);
    this.activationCodesCallbacks = this.activationCodesCallbacks.filter(cb => cb !== callback);
    this.statisticsCallbacks = this.statisticsCallbacks.filter(cb => cb !== callback);
    this.userActionsCallbacks = this.userActionsCallbacks.filter(cb => cb !== callback);
  }

  /**
   * 清除所有缓存
   */
  public clearAllCache(): void {
    this.cacheService.clearAllCache();
  }

  /**
   * 增加招聘信息浏览次数
   * @param jobId 招聘信息ID
   * @returns Promise
   */
  public async incrementJobViews(jobId: number): Promise<void> {
    if (!this.isInitialized || !this.supabase) {
      throw new Error('数据服务尚未初始化');
    }

    // 检查是否30秒内已经增加过该职位的浏览次数（防止频繁刷新导致的多次计数）
    const viewCacheKey = `jobView:${jobId}`;
    const lastViewTime = this.cacheService.get<number>(viewCacheKey);

    if (lastViewTime) {
      const now = Date.now();
      if (now - lastViewTime < 30000) { // 30秒内不重复计数
        console.log('30秒内已增加过该职位浏览次数，跳过');
        return;
      }
    }

    try {
      // 记录当前浏览时间
      this.cacheService.set(viewCacheKey, Date.now(), { expiresIn: 60000 }); // 1分钟过期

      // 调用数据库函数增加浏览次数
      const { error } = await this.supabase
        .rpc('increment_job_views', { job_id_param: jobId });

      if (error) {
        console.error('增加浏览次数错误:', error);
        throw error;
      }

      // 更新本地缓存中的职位数据（如果存在）
      const jobCacheKey = `jobs:${jobId}`;
      const cachedJob = this.cacheService.get<Job>(jobCacheKey);

      if (cachedJob) {
        cachedJob.views_count = (cachedJob.views_count || 0) + 1;
        this.cacheService.set(jobCacheKey, cachedJob);
      }

      // 清除相关缓存，但保留特定职位的缓存
      const keysToPreserve = [jobCacheKey, viewCacheKey];

      // 找到所有以'jobs:'开头但不在保留列表中的缓存键
      const keysToRemove: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && key.startsWith('jobs:') && !keysToPreserve.includes(key)) {
          keysToRemove.push(key);
        }
      }

      // 移除找到的缓存键
      keysToRemove.forEach(key => this.cacheService.remove(key));

      // 刷新招聘信息数据
      this.refreshJobs();
    } catch (error) {
      console.error('增加浏览次数失败:', error);
      // 出错时移除缓存标记，允许下次重试
      this.cacheService.remove(viewCacheKey);
    }
  }

  /**
   * 获取招聘信息的标签
   * @param jobId 招聘信息ID
   * @returns 包含时间标签ID和行为标签ID的对象
   */
  public async getJobTags(jobId: number): Promise<JobTag | null> {
    if (!this.supabase) return null;

    try {
      // 从缓存获取
      const cacheKey = `jobTags_${jobId}`;
      const cachedData = this.cacheService.get<JobTag>(cacheKey);
      if (cachedData) {
        console.log('从缓存获取到标签数据:', cachedData);
        return cachedData;
      }

      // 从数据库获取
      const { data, error } = await this.supabase
        .from('job_tags')
        .select('*')
        .eq('job_id', jobId)
        .single();

      if (error) {
        // 如果是没找到记录的错误，返回null
        if (error.code === 'PGRST116') {
          console.log(`职位 ${jobId} 没有对应的标签`);
          return null;
        }
        console.error('查询标签数据错误:', error);
        throw error;
      }

      console.log('从数据库获取到的标签数据:', data);

      // 兼容处理：如果有tag_id字段但没有time_tag_id字段，将tag_id作为time_tag_id
      if (data && data.tag_id && !data.time_tag_id) {
        data.time_tag_id = data.tag_id;
      }

      // 缓存结果
      if (data) {
        this.cacheService.set(cacheKey, data, { expiresIn: 5 * 60 * 1000 }); // 缓存5分钟
        return data as JobTag;
      }

      return null;
    } catch (error) {
      console.error('获取招聘信息标签失败:', error);
      return null;
    }
  }

  /**
   * 获取标签信息
   * @param tagId 标签ID
   * @returns 标签对象
   */
  public async getTagById(tagId: number): Promise<Tag | null> {
    if (!this.supabase) return null;

    try {
      // 从缓存获取
      const cacheKey = `tag_${tagId}`;
      const cachedData = this.cacheService.get<Tag>(cacheKey);
      if (cachedData) {
        console.log('从缓存获取到标签信息:', cachedData);
        return cachedData;
      }

      // 从数据库获取
      const { data, error } = await this.supabase
        .from('tags')
        .select('*')
        .eq('id', tagId)
        .single();

      if (error) {
        console.error('查询标签信息错误:', error);
        throw error;
      }

      console.log('从数据库获取到的标签信息:', data);

      // 缓存结果
      if (data) {
        this.cacheService.set(cacheKey, data, { expiresIn: 30 * 60 * 1000 }); // 缓存30分钟
        return data as Tag;
      }

      return null;
    } catch (error) {
      console.error('获取标签信息失败:', error);
      return null;
    }
  }
}

export default DataService;