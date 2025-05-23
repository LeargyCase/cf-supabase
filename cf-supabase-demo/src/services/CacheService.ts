interface CacheOptions {
  expiresIn: number; // 缓存过期时间（毫秒）
}

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresIn: number;
}

class CacheService {
  private static instance: CacheService;
  private storage: Storage;

  // 各种数据类型的默认过期时间配置（毫秒）
  private defaultExpirations = {
    jobs: 5 * 60 * 1000, // 招聘信息缓存5分钟
    categories: 10 * 60 * 1000, // 分类信息缓存10分钟
    tags: 10 * 60 * 1000, // 标签信息缓存10分钟
    statistics: 15 * 60 * 1000, // 统计信息缓存15分钟
    users: 15 * 60 * 1000, // 用户信息缓存15分钟
  };

  private constructor() {
    this.storage = window.localStorage;
  }

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * 设置缓存数据
   * @param key 缓存键
   * @param data 要缓存的数据
   * @param options 缓存选项
   */
  public set<T>(key: string, data: T, options?: Partial<CacheOptions>): void {
    // 确定过期时间
    const dataType = key.split(':')[0]; // 假设键的格式为 "dataType:specificKey"
    const expiresIn = options?.expiresIn || 
      this.defaultExpirations[dataType as keyof typeof this.defaultExpirations] || 
      5 * 60 * 1000; // 如果没有指定，默认为5分钟

    const cacheItem: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      expiresIn,
    };

    try {
      this.storage.setItem(key, JSON.stringify(cacheItem));
    } catch (error) {
      console.error('缓存数据时出错:', error);
      // 如果存储失败（例如存储已满），尝试清除所有缓存
      this.clearAllCache();
      // 再次尝试存储
      try {
        this.storage.setItem(key, JSON.stringify(cacheItem));
      } catch (retryError) {
        console.error('再次尝试缓存数据失败:', retryError);
      }
    }
  }

  /**
   * 获取缓存数据
   * @param key 缓存键
   * @returns 缓存的数据或null（如果缓存不存在或已过期）
   */
  public get<T>(key: string): T | null {
    const cachedItem = this.storage.getItem(key);
    if (!cachedItem) return null;

    try {
      const cacheItem: CacheItem<T> = JSON.parse(cachedItem);
      const now = Date.now();
      
      // 检查缓存是否过期
      if (now - cacheItem.timestamp > cacheItem.expiresIn) {
        this.remove(key);
        return null;
      }

      return cacheItem.data;
    } catch (error) {
      console.error('解析缓存数据时出错:', error);
      this.remove(key);
      return null;
    }
  }

  /**
   * 移除指定的缓存
   * @param key 缓存键
   */
  public remove(key: string): void {
    this.storage.removeItem(key);
  }

  /**
   * 清除指定的缓存键（与remove同义，为兼容现有代码）
   * @param key 要清除的缓存键
   */
  public clearKey(key: string): void {
    this.remove(key);
  }

  /**
   * 清除所有缓存
   */
  public clearAllCache(): void {
    this.storage.clear();
  }

  /**
   * 清除特定类型的所有缓存
   * @param dataType 数据类型，例如'jobs'
   */
  public clearTypeCache(dataType: string): void {
    const prefix = `${dataType}:`;
    
    // 找到所有匹配前缀的键
    const keysToRemove: string[] = [];
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }
    
    // 移除找到的键
    keysToRemove.forEach(key => this.storage.removeItem(key));
  }

  /**
   * 检查缓存是否已过期
   * @param key 缓存键
   * @returns 是否已过期
   */
  public isExpired(key: string): boolean {
    const cachedItem = this.storage.getItem(key);
    if (!cachedItem) return true;

    try {
      const cacheItem: CacheItem<any> = JSON.parse(cachedItem);
      const now = Date.now();
      return now - cacheItem.timestamp > cacheItem.expiresIn;
    } catch (error) {
      return true;
    }
  }
}

export default CacheService; 