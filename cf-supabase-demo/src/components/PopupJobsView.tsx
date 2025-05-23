import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import DataService from '../services/DataService';
import './PopupJobsView.css';
import TagDisplay from './TagDisplay';
import { showAlert, closeAlert } from './AlertDialog';

// 分类映射
const CATEGORIES: Record<number, string> = {
  1: '国企',
  2: '外企',
  3: '事业单位',
  4: '银行/金融',
  5: '互联网',
  6: '制造业',
  7: '游戏',
  8: '快消/品牌',
  9: '生物医药',
  10: '汽车/新能源',
  11: '科技',
  12: '美妆',
  13: '传媒',
  14: '一线大厂',
  15: '小而美',
  16: '教育',
  17: '地产/建筑',
  18: '其他',
  19: '24h新开',
  20: '往届可投'
};

interface PopupJobsViewProps {
  categoryId: number;
  categoryName: string;
  jobCount: number;
  accentColor: string;
  isVisible: boolean;
  onClose: () => void;
  filterLocations?: string[];
  hideApplied?: boolean;
}

const SkeletonCard: React.FC = () => {
  return (
    <div className="skeleton-card">
      <div className="skeleton-header">
        <div className="skeleton-title"></div>
        <div className="skeleton-company"></div>
      </div>
      <div className="skeleton-basic">
        <div className="skeleton-field"></div>
        <div className="skeleton-field skeleton-small"></div>
        <div className="skeleton-field"></div>
        <div className="skeleton-field skeleton-small"></div>
      </div>
      <div className="skeleton-footer">
        <div className="skeleton-button" style={{ width: '80px' }}></div>
        <div className="skeleton-button" style={{ width: '90px' }}></div>
        <div className="skeleton-stats">
          <div className="skeleton-stat" style={{ width: '120px' }}></div>
        </div>
      </div>
    </div>
  );
};

// 添加一个辅助函数来检测屏幕大小并应用对应样式
const useScreenSize = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return { isMobile };
};

const PopupJobsView: React.FC<PopupJobsViewProps> = ({
  categoryId,
  categoryName,
  jobCount,
  accentColor,
  isVisible,
  onClose,
  filterLocations: propFilterLocations,
  hideApplied: propHideApplied
}) => {
  const { supabase, user } = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedJobs, setExpandedJobs] = useState<Record<number, boolean>>({});
  const [favoriteJobs, setFavoriteJobs] = useState<Record<number, boolean>>({});
  const [appliedJobs, setAppliedJobs] = useState<Record<number, boolean>>({});
  // 添加状态变量来跟踪分类ID的变化
  const [currentCategoryId, setCurrentCategoryId] = useState<number>(categoryId);
  const dataService = DataService.getInstance();
  const popupRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  // 不再跟踪是否显示过提示，每次打开都显示
  const [userMembershipType, setUserMembershipType] = useState<string>('common_user');
  // 存储广告文本
  const [advertisementText, setAdvertisementText] = useState<string>('普通用户每个分类最多查看20条招聘信息<br>升级为会员可查看全部招聘信息');

  // 控制弹窗显示状态和动画
  const [mountPopup, setMountPopup] = useState(false);
  const [animatePopup, setAnimatePopup] = useState(false);

  const { isMobile } = useScreenSize();

  // 引用展开卡片的元素
  const expandedCardRef = useRef<HTMLDivElement | null>(null);

  // 记录展开卡片的位置信息
  const [expandedCardPosition, setExpandedCardPosition] = useState<{
    top: number;
    left: number;
    width: number;
    id: number | null;
  }>({
    top: 0,
    left: 0,
    width: 0,
    id: null
  });

  // 添加悬停状态跟踪
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  // 添加用于处理点击的状态
  const [cardClickTimer, setCardClickTimer] = useState<NodeJS.Timeout | null>(null);

  // 更新要展开的卡片定位信息
  const updateExpandedCardPosition = useCallback((jobId: number) => {
    const cardElement = document.getElementById(`job-card-${jobId}`);
    if (cardElement) {
      const rect = cardElement.getBoundingClientRect();
      setExpandedCardPosition({
        top: rect.top + window.scrollY,
        left: rect.left,
        width: rect.width,
        id: jobId
      });
      // 保存展开卡片引用
      expandedCardRef.current = cardElement;
    }
  }, []);

  // 处理弹窗显示和隐藏的动画效果
  useEffect(() => {
    if (isVisible) {
      // 先挂载组件
      setMountPopup(true);

      // 使用requestAnimationFrame代替setTimeout，确保在下一帧渲染前应用动画
      // 防止浏览器在同一帧中批处理挂载和添加动画类，从而导致动画不生效
      const animationId = requestAnimationFrame(() => {
        // 再次使用requestAnimationFrame确保DOM已更新
        requestAnimationFrame(() => {
          setAnimatePopup(true);

          // 如果弹窗已经挂载，强制页面重排以确保CSS过渡应用
          if (popupRef.current) {
            // 读取一个会引起重排的属性，强制浏览器应用最新样式
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const forceReflow = popupRef.current.offsetHeight;
          }
        });
      });

      return () => cancelAnimationFrame(animationId);
    } else {
      // 先播放关闭动画
      setAnimatePopup(false);

      // 动画结束后再卸载组件
      const timer = setTimeout(() => {
        setMountPopup(false);
      }, 300); // 300ms与CSS过渡时间保持一致

      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  // 获取地点筛选和不看已投递设置
  const [filterLocations, setFilterLocations] = useState<string[]>(propFilterLocations || []);
  const [hideApplied, setHideApplied] = useState(propHideApplied || false);

  // 当属性变化时更新状态
  useEffect(() => {
    if (propFilterLocations) {
      setFilterLocations(propFilterLocations);
    }

    if (propHideApplied !== undefined) {
      setHideApplied(propHideApplied);
    }

    // 更新分类ID
    setCurrentCategoryId(categoryId);

    // 监听自定义事件
    const handleFilterLocationsChanged = (e: CustomEvent) => {
      setFilterLocations(e.detail.locations);
    };

    const handleHideAppliedChanged = (e: CustomEvent) => {
      setHideApplied(e.detail.hideApplied);
    };

    // 添加事件监听器
    window.addEventListener('filterLocationsChanged', handleFilterLocationsChanged as EventListener);
    window.addEventListener('hideAppliedChanged', handleHideAppliedChanged as EventListener);

    // 清理事件监听器
    return () => {
      window.removeEventListener('filterLocationsChanged', handleFilterLocationsChanged as EventListener);
      window.removeEventListener('hideAppliedChanged', handleHideAppliedChanged as EventListener);
    };
  }, [propFilterLocations, propHideApplied, categoryId]);

  // 获取系统设置
  const getSystemSetting = useCallback(async (settingKey: string) => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', settingKey)
        .single();

      if (error) {
        console.error(`获取系统设置 ${settingKey} 错误:`, error);
        return null;
      }

      return data?.setting_value;
    } catch (err) {
      console.error(`获取系统设置 ${settingKey} 异常:`, err);
      return null;
    }
  }, [supabase]);

  // 获取广告文本
  useEffect(() => {
    const fetchAdvertisementText = async () => {
      try {
        const adText = await getSystemSetting('current_advertisement');
        if (adText) {
          console.log('获取到广告文本:', adText);
          setAdvertisementText(adText);
        } else {
          console.log('未找到广告文本，使用默认值');
        }
      } catch (err) {
        console.error('获取广告文本错误:', err);
      }
    };

    fetchAdvertisementText();
  }, [getSystemSetting]);

  // 获取用户会员信息
  const getUserMembershipInfo = useCallback(async (userId: number) => {
    try {
      const { data, error } = await supabase
        .from('user_info')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('获取用户会员信息错误:', error);
        return null;
      }

      return data;
    } catch (err) {
      console.error('获取用户会员信息异常:', err);
      return null;
    }
  }, [supabase]);

  // 加载招聘信息
  useEffect(() => {
    if (!mountPopup) return;

    const loadJobs = async () => {
      try {
        setLoading(true);

        // 检查用户会员类型 - 先获取最新的会员信息
        let isLimitedView = true; // 默认限制查看
        let currentMembershipType = userMembershipType;

        if (user) {
          // 每次加载招聘信息时都重新获取用户会员信息，确保使用最新状态
          const userInfo = await getUserMembershipInfo(user.id);
          if (userInfo) {
            currentMembershipType = userInfo.membership_type;
            setUserMembershipType(currentMembershipType); // 更新状态
          }

          // 如果是试用会员或正式会员，则不限制查看
          if (currentMembershipType === 'temp_user' || currentMembershipType === 'official_user') {
            isLimitedView = false;
          }
        }

        console.log('加载招聘信息，用户会员类型:', currentMembershipType, '是否限制查看:', isLimitedView);

        // 普通用户每个分类最多查看20条
        const limit = isLimitedView ? 20 : 100; // 会员用户可以查看更多

        let query = supabase
          .from('job_recruitments')
          .select('*')
          .eq('is_active', true)
          .order('post_time', { ascending: false })
          .limit(limit);

        // 根据分类ID过滤
        if (currentCategoryId <= 18) {
          // 常规分类 (1-18)
          query = query.contains('category_id', [currentCategoryId]);
        } else if (currentCategoryId === 19) {
          // 24h新开分类
          query = query.eq('is_24hnew', true);
        } else if (currentCategoryId === 20) {
          // 往届可投分类
          query = query.eq('is_pregraduation', true);
        }

        // 添加地点筛选
        if (filterLocations.length > 0) {
          // 构建OR条件
          const locationFilters = filterLocations.map(loc => `job_location.ilike.%${loc}%`);
          query = query.or(locationFilters.join(','));
        }

        const { data, error } = await query;

        if (error) {
          throw new Error('加载招聘信息失败: ' + error.message);
        }

        // 如果设置了不看已投递，过滤掉已投递的招聘信息
        let filteredData = data || [];

        if (hideApplied && user) {
          // 获取用户投递的职位ID
          const applicationIds = await dataService.getApplicationJobIds(user.id);
          // 过滤掉已投递的招聘信息
          filteredData = filteredData.filter(job => !applicationIds.includes(job.id));
        }

        setJobs(filteredData);
      } catch (err: any) {
        console.error('获取招聘信息错误:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadJobs();
  }, [currentCategoryId, supabase, mountPopup, filterLocations, hideApplied, user, dataService, getUserMembershipInfo, userMembershipType]);



  // 加载用户的收藏、投递状态和会员信息
  useEffect(() => {
    if (!user || !mountPopup) return;

    const loadUserInfo = async () => {
      try {
        // 获取用户收藏的职位ID
        const favoriteIds = await dataService.getFavoriteJobIds(user.id);
        const favoritesMap: Record<number, boolean> = {};
        favoriteIds.forEach(id => {
          favoritesMap[id] = true;
        });
        setFavoriteJobs(favoritesMap);

        // 获取用户投递的职位ID
        const applicationIds = await dataService.getApplicationJobIds(user.id);
        const applicationsMap: Record<number, boolean> = {};
        applicationIds.forEach(id => {
          applicationsMap[id] = true;
        });
        setAppliedJobs(applicationsMap);

        // 获取用户会员信息
        const userInfo = await getUserMembershipInfo(user.id);
        if (userInfo) {
          setUserMembershipType(userInfo.membership_type);
        } else {
          setUserMembershipType('common_user');
        }
      } catch (err) {
        console.error('加载用户信息错误:', err);
      }
    };

    loadUserInfo();
  }, [user, dataService, mountPopup, getUserMembershipInfo]);

  // 处理点击外部关闭弹窗
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // 检查点击事件是否来自AlertDialog
      const alertContainer = document.getElementById('alert-container');
      if (alertContainer && alertContainer.contains(event.target as Node)) {
        // 如果点击事件来自AlertDialog，不关闭弹窗
        return;
      }

      // 检查点击事件是否在弹窗外部
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (mountPopup) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [mountPopup, onClose]);

  // 阻止滚动穿透并保持页面宽度
  useEffect(() => {
    if (mountPopup) {
      // 获取当前滚动条宽度
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

      // 设置body样式，禁用滚动但保持宽度一致
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    } else {
      // 恢复body样式
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }

    return () => {
      // 清理函数
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [mountPopup]);

  // 处理会员激活
  const handleActivateCode = useCallback(async (activationCode: string) => {
    if (!user) {
      showAlert({
        title: '需要登录',
        message: '请先登录后再激活会员',
        type: 'warning'
      });
      return;
    }

    if (!activationCode.trim()) {
      showAlert({
        title: '激活失败',
        message: '请输入激活码',
        type: 'error'
      });
      return;
    }

    try {
      // 显示处理中提示
      showAlert({
        title: '处理中',
        message: '正在验证激活码，请稍候...',
        type: 'info'
      });

      // 检查激活码是否存在且有效
      console.log('查询激活码:', activationCode.trim());
      const { data: codeData, error: codeError } = await supabase
        .from('activation_codes')
        .select('*')
        .eq('code', activationCode.trim())
        .eq('is_active', true)
        .eq('is_used', false)
        .single();

      if (codeError || !codeData) {
        throw new Error('激活码无效或已被使用');
      }

      // 获取当前用户会员信息
      console.log('检查用户会员信息:', user.id);
      const { data: userInfoData, error: userInfoError } = await supabase
        .from('user_info')
        .select('*')
        .eq('user_id', user.id);

      console.log('用户会员信息查询结果:', userInfoData, userInfoError);

      // 如果有多条记录，使用第一条
      const userInfo = userInfoData && userInfoData.length > 0 ? userInfoData[0] : null;

      if (userInfoError && userInfoError.code !== 'PGRST116') { // PGRST116 是 "未找到结果" 的错误代码
        throw userInfoError;
      }

      // 确定会员类型
      let membershipType = 'official_user'; // 默认为正式会员
      if (codeData.code.startsWith('TEMP')) {
        membershipType = 'temp_user'; // 如果是TEMP开头的激活码，则为试用会员
      }

      // 计算会员有效期
      const today = new Date();
      const validityDays = codeData.validity_days || 30; // 默认30天
      const newEndDate = new Date(today);
      newEndDate.setDate(today.getDate() + validityDays);

      // 格式化日期为ISO字符串（兼容数据库）
      const formattedStartDate = today.toISOString();
      const formattedEndDate = newEndDate.toISOString();

      // 更新会员信息
      try {
        // 使用最小化的字段集，避免触发器问题
        if (userInfo) {
          console.log('更新现有会员记录:', user.id, userInfo.id);

          // 只更新必要的字段
          const { data: updateData, error: updateError } = await supabase
            .from('user_info')
            .update({
              membership_type: membershipType,
              membership_code: activationCode,
              membership_start_date: formattedStartDate,
              membership_end_date: formattedEndDate
            })
            .eq('id', userInfo.id);

          if (updateError) {
            console.error('更新会员信息失败:', updateError);
            throw new Error(`更新会员信息失败: ${updateError.message}`);
          }
          console.log('会员信息更新成功');
        } else {
          console.log('创建新会员记录:', user.id);

          // 只插入必要的字段
          const { data: insertData, error: insertError } = await supabase
            .from('user_info')
            .insert({
              user_id: user.id,
              membership_type: membershipType,
              membership_code: activationCode,
              membership_start_date: formattedStartDate,
              membership_end_date: formattedEndDate
            });

          if (insertError) {
            console.error('创建会员信息失败:', insertError);
            throw new Error(`创建会员信息失败: ${insertError.message}`);
          }
          console.log('会员信息创建成功');
        }
      } catch (err) {
        console.error('会员信息操作最终错误:', err);
        throw new Error(`会员信息操作失败: ${err.message}`);
      }

      // 更新激活码为已使用状态
      console.log('更新激活码状态:', codeData.id);
      const { error: codeUpdateError } = await supabase
        .from('activation_codes')
        .update({
          is_used: true,
          user_id: user.id
        })
        .eq('id', codeData.id);

      if (codeUpdateError) {
        console.error('更新激活码状态失败:', codeUpdateError);
        throw new Error(`更新激活码状态失败: ${codeUpdateError.message}`);
      }
      console.log('激活码状态更新成功');

      // 更新本地会员类型状态
      setUserMembershipType(membershipType);

      // 根据会员类型显示不同的成功消息
      if (membershipType === 'temp_user') {
        showAlert({
          title: '激活成功',
          message: `试用会员激活成功！您可以免费使用${validityDays}天。`,
          type: 'success'
        });
      } else {
        showAlert({
          title: '激活成功',
          message: `正式会员激活成功！有效期至${newEndDate.toLocaleDateString('zh-CN')}`,
          type: 'success'
        });
      }

      // 重新加载招聘信息，以显示更多内容
      setTimeout(() => {
        // 触发重新加载
        if (currentCategoryId) {
          // 模拟分类ID变化，触发useEffect重新加载
          const tempId = currentCategoryId;
          setCurrentCategoryId(0);
          setTimeout(() => setCurrentCategoryId(tempId), 10);
        }
      }, 1000);

    } catch (error: any) {
      console.error('激活会员出错:', error);
      showAlert({
        title: '激活失败',
        message: error.message || '激活会员失败，请检查激活码是否正确',
        type: 'error'
      });
    }
  }, [user, supabase, currentCategoryId]);

  // 显示会员限制提示弹窗
  const showMembershipLimitAlert = useCallback(() => {
    console.log('showMembershipLimitAlert被调用，categoryId=', currentCategoryId);

    // 根据用户登录状态显示不同的提示信息
    const message = user
      ? advertisementText // 已登录用户：使用从数据库获取的广告文本
      : "未登录状态下限制查看20条，登录后可立即解锁"; // 未登录用户：使用固定文本

    const title = user ? '会员权限提示' : '登录提示';

    console.log('调用showAlert显示提示框，提示信息:', message);

    // 根据用户登录状态显示不同的按钮
    if (user) {
      // 已登录用户：显示升级会员的按钮
      showAlert({
        title: title,
        message: message,
        type: 'info',
        inputField: {
          placeholder: '请输入激活码（可选）',
        },
        buttons: [
          {
            text: '暂不升级',
            onClick: () => {
              closeAlert();
            }
          },
          {
            text: '立即升级',
            primary: true,
            onClick: (_, activationCode) => {
              if (activationCode && activationCode.trim()) {
                // 如果用户输入了激活码，尝试直接激活
                handleActivateCode(activationCode.trim());
              } else {
                // 如果没有输入激活码，直接跳转到会员页面
                closeAlert();
                window.location.href = '/user/dashboard?menu=membership';
              }
            }
          }
        ]
      });
    } else {
      // 未登录用户：显示登录按钮
      showAlert({
        title: title,
        message: message,
        type: 'info',
        buttons: [
          {
            text: '暂不登录',
            onClick: () => {
              closeAlert();
            }
          },
          {
            text: '立即登录',
            primary: true,
            onClick: () => {
              closeAlert();
              // 触发导航栏的登录模态框
              window.dispatchEvent(new CustomEvent('showLoginModal'));
            }
          }
        ]
      });
    }
  }, [currentCategoryId, advertisementText, handleActivateCode, user]);

  // 在弹窗打开后3秒自动显示会员限制提示（对未登录用户或普通用户）
  useEffect(() => {
    // 添加调试信息
    console.log('弹窗状态检查:', {
      categoryId,
      user: !!user,
      userMembershipType,
      mountPopup
    });

    // 只在弹窗打开时显示提示
    if (!mountPopup) return;

    // 如果用户已登录且不是普通用户，不显示提示
    if (user && userMembershipType !== 'common_user') {
      console.log('用户不是普通用户，不显示会员提示');
      return;
    }

    // 未登录用户或普通用户，显示提示
    const userStatus = user ? '普通用户' : '未登录用户';
    console.log(`${userStatus}，准备显示会员提示，将在3秒后显示`);

    // 设置3秒延迟，在用户打开弹窗后自动显示提示
    const timer = setTimeout(() => {
      console.log('执行显示会员提示');
      showMembershipLimitAlert();
    }, 3000); // 3秒后显示

    return () => clearTimeout(timer);
  }, [mountPopup, showMembershipLimitAlert, currentCategoryId, user, userMembershipType]);

  // 处理关闭弹窗
  const handleClose = () => {
    onClose();
  };

  // 处理展开/折叠招聘信息卡片
  const handleToggleExpand = (jobId: number, event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    setExpandedJobs(prev => {
      const isCurrentlyExpanded = prev[jobId];

      // 创建新状态对象，首先将所有卡片设为未展开
      const newState: Record<number, boolean> = {};

      // 如果当前卡片未展开，则只展开它，关闭所有其他卡片
      // 如果当前卡片已展开，则关闭它
      if (!isCurrentlyExpanded) {
        newState[jobId] = true;

        // 更新展开卡片的位置信息
        updateExpandedCardPosition(jobId);

        // 记录浏览次数
        const viewCountKey = `job_${jobId}_viewed`;
        if (!sessionStorage.getItem(viewCountKey)) {
          try {
            dataService.incrementJobViews(jobId);
            sessionStorage.setItem(viewCountKey, 'true');
            setJobs(prevJobs =>
              prevJobs.map(job =>
                job.id === jobId
                  ? { ...job, views_count: (job.views_count || 0) + 1 }
                  : job
              )
            );

            setTimeout(() => {
              sessionStorage.removeItem(viewCountKey);
            }, 5 * 60 * 1000);
          } catch (err) {
            console.error('增加浏览次数错误:', err);
          }
        }

        // 展开后滚动到卡片位置，确保用户能看到展开的内容
        setTimeout(() => {
          const cardElement = document.getElementById(`job-card-${jobId}`);
          if (cardElement) {
            // 获取弹窗内容区域
            const popupContent = document.querySelector('.popup-content');
            if (popupContent) {
              // 获取卡片位置信息
              const cardRect = cardElement.getBoundingClientRect();
              const popupRect = popupContent.getBoundingClientRect();

              // 判断卡片是否在弹窗底部区域
              const isNearBottom = cardRect.bottom > (popupRect.bottom - 300);

              if (isNearBottom) {
                // 如果在底部区域，滚动到合适位置，确保卡片及展开内容可见
                const scrollOffset = cardRect.top - popupRect.top - 150; // 预留足够顶部空间
                popupContent.scrollTo({
                  top: popupContent.scrollTop + scrollOffset,
                  behavior: 'smooth'
                });
              } else {
                // 如果不是底部区域，只需滚动到卡片中间位置
                const scrollOffset = cardRect.top - popupRect.top - popupRect.height/3;
                popupContent.scrollTo({
                  top: popupContent.scrollTop + scrollOffset,
                  behavior: 'smooth'
                });
              }
            }
          }
        }, 50);
      }

      return newState;
    });
  };

  // 处理滚动时更新展开卡片的位置
  useEffect(() => {
    const handleScroll = () => {
      // 如果有展开的卡片，更新其位置
      if (expandedCardPosition.id !== null) {
        updateExpandedCardPosition(expandedCardPosition.id);
      }
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [expandedCardPosition.id, updateExpandedCardPosition]);

  // 处理收藏/取消收藏
  const handleToggleFavorite = async (jobId: number, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (!user) {
      showAlert({
        title: '需要登录',
        message: '请先登录后再收藏职位',
        type: 'warning'
      });
      return;
    }

    const actionKey = `favorite_action_${jobId}`;
    if (sessionStorage.getItem(actionKey)) return;
    sessionStorage.setItem(actionKey, 'true');

    try {
      const isFavorite = !favoriteJobs[jobId];

      setFavoriteJobs(prev => ({ ...prev, [jobId]: isFavorite }));

      setJobs(prev =>
        prev.map(job =>
          job.id === jobId
            ? {
                ...job,
                favorites_count: isFavorite
                  ? (job.favorites_count || 0) + 1
                  : Math.max(0, (job.favorites_count || 0) - 1)
              }
            : job
        )
      );

      await dataService.toggleFavorite(user.id, jobId, isFavorite);
    } catch (err) {
      console.error('处理收藏错误:', err);
      setFavoriteJobs(prev => ({ ...prev, [jobId]: !prev[jobId] }));
      showAlert({
        title: '操作失败',
        message: '收藏操作失败，请稍后重试',
        type: 'error'
      });
    } finally {
      setTimeout(() => {
        sessionStorage.removeItem(actionKey);
      }, 1000);
    }
  };

  // 处理投递申请
  const handleApply = async (jobId: number, applicationLink: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    // 先检查用户是否登录
    if (!user) {
      showAlert({
        title: '需要登录',
        message: '请先登录后再投递申请',
        type: 'warning'
      });
      return; // 如果未登录，直接返回，不执行后续操作
    }

    try {
      // 记录投递行为
      await dataService.addApplication(user.id, jobId);

      // 更新本地状态
      setAppliedJobs(prev => ({ ...prev, [jobId]: true }));

      // 更新招聘信息统计
      setJobs(prev =>
        prev.map(job =>
          job.id === jobId
            ? { ...job, applications_count: (job.applications_count || 0) + 1 }
            : job
        )
      );

      // 如果有外部申请链接，在记录投递行为后直接打开链接
      if (applicationLink) {
        window.open(applicationLink, '_blank');
        showAlert({
          title: '投递成功',
          message: '已为您打开外部申请页面',
          type: 'success',
          autoClose: 2000 // 2秒后自动关闭
        });
      } else {
        showAlert({
          title: '投递成功',
          message: '您的申请已成功提交',
          type: 'success'
        });
      }
    } catch (err) {
      console.error('记录投递行为错误:', err);
      showAlert({
        title: '投递失败',
        message: '申请提交失败，请稍后重试',
        type: 'error'
      });
    }
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);

    // 如果年份大于2050，显示"招满为止"
    if (date.getFullYear() > 2050) {
      return "招满为止";
    }

    return date.toLocaleDateString('zh-CN');
  };

  // 格式化分类
  const formatCategories = (categoryIds: number[]) => {
    if (!categoryIds || !Array.isArray(categoryIds)) return '未分类';
    return categoryIds.map(id => CATEGORIES[id] || `未知分类(${id})`).join(', ');
  };

  // 修改handleCardClick函数，增加触摸反馈
  const handleCardClick = (jobId: number, event: React.MouseEvent) => {
    event.stopPropagation();

    // 添加触摸反馈
    handleCardTouch(jobId);

    if (expandedJobs[jobId]) {
      // 如果卡片已展开，松手后折叠
      handleToggleExpand(jobId, event);
    } else {
      // 如果卡片未展开，展开它
      handleToggleExpand(jobId, event);
    }
  };

  // 添加卡片的触摸事件处理
  const handleCardTouch = (jobId: number) => {
    // 如果卡片已展开，先添加触摸反馈效果，然后折叠
    if (expandedJobs[jobId]) {
      // 创建触感反馈
      if ('vibrate' in navigator) {
        try {
          navigator.vibrate(15); // 15毫秒的轻微振动反馈
        } catch (e) {
          // 忽略不支持振动的设备上的错误
        }
      }
    }
  };

  if (!mountPopup) return null;

  // 在渲染部分根据屏幕大小应用不同样式
  const footerStyle = isMobile
    ? {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        width: '100%',
        marginTop: '15px',
        paddingTop: '12px',
        borderTop: '1px solid #eee'
      }
    : {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        marginTop: '15px',
        paddingTop: '12px',
        borderTop: '1px solid #eee',
        justifyContent: 'space-between'
      };

  const toggleStyle = isMobile
    ? { width: '100%', marginBottom: '10px', textAlign: 'center' }
    : { flex: '0 0 auto', order: 1, marginRight: '15px' };

  const applicationStyle = isMobile
    ? { width: '100%', marginBottom: '10px', textAlign: 'center' }
    : { flex: '0 0 auto', order: 2 };

  const statsStyle = isMobile
    ? {
        width: '100%',
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '10px',
        flexWrap: 'nowrap',
        overflow: 'hidden',
        alignItems: 'center',
        paddingTop: '0', // 移除顶部内边距
        position: 'relative', // 添加相对定位
        top: '-3px', // 使用top属性向上移动
      }
    : {
        flex: '1',
        order: 3,
        display: 'flex',
        justifyContent: 'flex-end',
        marginLeft: 'auto',
        flexWrap: 'nowrap',
        alignItems: 'center',
        position: 'relative', // 添加相对定位
        top: '-1px', // 使用top属性细微调整
        minWidth: '130px', // 确保统计数据有足够空间
      };

  return (
    <div className={`popup-jobs-overlay ${animatePopup ? 'visible' : ''}`}>
      <div
        className={`popup-jobs-container ${animatePopup ? 'visible' : ''}`}
        ref={popupRef}
      >
        <div className="popup-banner" style={{
          backgroundColor: accentColor,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '16px 20px'
        }}>
          <div className="popup-banner-content" style={{
            flex: '1',
            display: 'flex',
            justifyContent: 'center',
            textAlign: 'center'
          }}>
            <h2 style={{
              fontSize: '26px',
              fontWeight: 700,
              color: 'white',
              margin: 0,
              padding: 0,
              textAlign: 'center'
            }}>{categoryName}</h2>
          </div>
          <button className="popup-close-button" onClick={handleClose}>×</button>
        </div>

        <div className="popup-content" ref={contentRef}>
          {error && (
            <div className="error-message">
              <p>{error}</p>
            </div>
          )}

          {loading ? (
            <div className="job-cards">
              {Array(9).fill(0).map((_, index) => (
                <SkeletonCard key={`skeleton-${index}`} />
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="no-data-message">
              <p>该分类下暂无招聘信息</p>
            </div>
          ) : (
            <div className="job-cards">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  id={`job-card-${job.id}`}
                  className={`job-card ${expandedJobs[job.id] ? 'expanded' : 'collapsed'}`}
                  style={{
                    position: 'relative',
                    zIndex: expandedJobs[job.id] ? 500 : (hoveredCard === job.id ? 10 : 1),
                    transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                    transform: expandedJobs[job.id]
                      ? 'scale(1.05)'
                      : (hoveredCard === job.id
                        ? (isMobile ? 'translateY(-3px)' : 'translateY(-6px)')
                        : 'scale(1)'),
                    boxShadow: expandedJobs[job.id]
                      ? '0 16px 32px rgba(0, 0, 0, 0.25), 0 8px 16px rgba(0, 0, 0, 0.1)'
                      : (hoveredCard === job.id
                        ? (isMobile
                          ? '0 8px 16px rgba(0, 0, 0, 0.15)'
                          : '0 12px 24px rgba(0, 0, 0, 0.2), 0 6px 12px rgba(0, 0, 0, 0.1)')
                        : '0 6px 16px rgba(0, 0, 0, 0.15), 0 3px 6px rgba(0, 0, 0, 0.1)'),
                    borderRadius: expandedJobs[job.id] ? '8px 8px 0 0' : '8px',
                    overflow: 'visible',
                    display: 'flex',
                    flexDirection: 'column',
                    borderColor: hoveredCard === job.id && !expandedJobs[job.id] ? '#d0d0d0' : undefined
                  }}
                  onClick={(e) => handleCardClick(job.id, e)}
                  onMouseEnter={() => setHoveredCard(job.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                  onTouchStart={() => handleCardTouch(job.id)}
                >
                  <div className="job-card-header">
                    <h3 className="job-title" style={{
                      color: '#000',
                      fontWeight: 'bold',
                      fontSize: '18px'
                    }}>{job.job_title}</h3>
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      marginTop: '6px',
                      gap: '6px',
                      marginBottom: '2px'
                    }}>
                      <div className="tag-container" style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '5px',
                        flex: '1 1 auto',
                        minWidth: '0'
                      }}>
                        {/* 先显示描述标签 */}
                        {job.description && (
                          <div className="company-desc-tag">
                            {job.description}
                          </div>
                        )}

                        {/* 再显示时间和行为标签 */}
                        <TagDisplay jobId={job.id} />
                      </div>
                    </div>

                    {/* 公司名称显示 */}
                    <span style={{
                      fontSize: '15px',
                      color: '#222',
                      fontWeight: 'bold',
                      display: 'block',
                      maxWidth: '100%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'normal',
                      lineHeight: '1.4',
                      marginTop: '8px',
                      borderTop: '1px solid #eee',
                      paddingTop: '8px'
                    }}>{job.company}</span>

                    <button
                      className={`favorite-button ${favoriteJobs[job.id] ? 'favorited' : ''}`}
                      onClick={(e) => handleToggleFavorite(job.id, e)}
                      title={favoriteJobs[job.id] ? "取消收藏" : "添加收藏"}
                      style={{
                        zIndex: 110,
                        opacity: favoriteJobs[job.id] ? 1 : 0.8 // 未收藏时也保持一定的可见度
                      }}
                    >
                      <i className={`favorite-icon ${favoriteJobs[job.id] ? 'active' : ''}`}></i>
                    </button>
                  </div>

                  {/* 基本信息 - 始终显示 */}
                  <div className="job-card-basic" style={{ position: 'relative' }}>
                    <div className="job-field">
                      <span className="field-label">分类:</span>
                      <span className="field-value">{formatCategories(job.category_id)}</span>
                    </div>

                    <div className="job-field">
                      <span className="field-label">工作地点:</span>
                      <span className="field-value">{job.job_location}</span>
                    </div>

                    {/* 已投递图片 */}
                    {appliedJobs[job.id] && (
                      <img
                        src="/Deliveried_px200.png"
                        alt="已投递"
                        style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%) rotate(-15deg)',
                          width: '150px',
                          height: 'auto',
                          opacity: 0.8,
                          pointerEvents: 'none',
                          zIndex: 10
                        }}
                      />
                    )}

                    <div className="job-field">
                      <span className="field-label">招聘对象:</span>
                      <span className="field-value">{job.job_graduation_year}</span>
                    </div>

                    <div className="job-field">
                      <span className="field-label">截止时间:</span>
                      <span className="field-value">{formatDate(job.deadline)}</span>
                    </div>
                  </div>

                  {/* 详细信息 - 使用绝对定位容器 */}
                  {expandedJobs[job.id] && (
                    <div
                      className="expanded-details-container"
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: '0',
                        width: '100%',
                        zIndex: 400
                      }}
                      onClick={(e) => {
                        // 允许点击详情部分也能折叠卡片
                        handleToggleExpand(job.id, e);
                      }}
                    >
                      <div className="job-card-details">
                        <div className="job-field">
                          <span className="field-label">招聘岗位:</span>
                          <span className="field-value">{job.job_position}</span>
                        </div>

                        <div className="job-field">
                          <span className="field-label">招聘专业:</span>
                          <span className="field-value">{job.job_major || '不限'}</span>
                        </div>

                        <div className="job-field">
                          <span className="field-label">学历要求:</span>
                          <span className="field-value">{job.job_education_requirement}</span>
                        </div>

                        <div className="job-field">
                          <span className="field-label">发布时间:</span>
                          <span className="field-value">{formatDate(job.post_time)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="job-card-footer" style={{
                    ...footerStyle,
                    alignItems: 'center',
                    position: 'relative',
                    zIndex: 3,
                    marginTop: 'auto', // 确保在Flexbox布局中推到底部
                    backgroundColor: 'transparent', // 确保没有背景色
                  }}>
                    <div className="toggle-expand" style={{
                      ...toggleStyle,
                      display: 'flex',
                      alignItems: 'center',
                      height: '30px',
                      backgroundColor: 'transparent', // 确保没有背景色
                    }} onClick={(e) => {
                      e.stopPropagation(); // 阻止冒泡
                      handleToggleExpand(job.id, e);
                    }}>
                      <span>{expandedJobs[job.id] ? '收起详情' : '查看详情'}</span>
                    </div>

                    <div className="job-application" style={{
                      ...applicationStyle,
                      display: 'flex',
                      alignItems: 'center',
                      height: '30px',
                      marginLeft: isMobile ? 0 : '5px', // 减小左侧间距
                      marginRight: isMobile ? 0 : 'auto', // 非移动端时，推向左侧
                      backgroundColor: 'transparent', // 确保没有背景色
                    }}>
                      <button
                        className={`apply-button ${appliedJobs[job.id] ? 'applied' : ''}`}
                        style={{ minWidth: isMobile ? '100%' : '90px', textAlign: 'center', whiteSpace: 'nowrap' }}
                        onClick={(e) => handleApply(job.id, job.application_link, e)}
                      >
                        {appliedJobs[job.id] ? '再次投递' : '投递申请'}
                      </button>
                    </div>

                    <div className="job-stats" style={{
                      ...statsStyle,
                      display: 'flex',
                      alignItems: 'center',
                      height: '30px',
                      justifyContent: 'flex-end',
                      marginLeft: '15px', // 增加与左侧组件的间距
                      backgroundColor: 'transparent', // 确保没有背景色
                    }}>
                      {/* 将三个统计数据合并为一个无间隔展示 */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        whiteSpace: 'nowrap',
                        fontSize: isMobile ? '12px' : '14px',
                        letterSpacing: '-0.5px',
                        transform: 'translateY(-4px)', // 增加向上偏移量从-1px到-4px
                        lineHeight: '1', // 降低行高从1.2到1
                        paddingTop: '0px', // 移除顶部内边距
                        position: 'relative', // 添加相对定位
                        top: '-2px', // 使用top属性进一步向上移动
                        backgroundColor: 'transparent', // 确保没有背景色
                      }}>
                        <span>{job.views_count || 0}浏览</span>
                        <span style={{padding: '0 1px'}}>/</span>
                        <span>{job.favorites_count || 0}收藏</span>
                        <span style={{padding: '0 1px'}}>/</span>
                        <span>{job.applications_count || 0}申请</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PopupJobsView;