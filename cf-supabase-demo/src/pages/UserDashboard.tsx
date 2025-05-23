import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DataService from '../services/DataService';
import './UserDashboard.css';
import '../components/JobCard.css';
import '../components/JobTable.css';
import { formatDistance } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { showAlert, showConfirm } from '../components/AlertDialog';
import { setupTableWithResizableColumns } from '../columnResizer';
import ReactDOM from 'react-dom';

// 定义用户菜单项
const menuItems = [
  { id: 'my-favorites', title: '我的收藏' },
  { id: 'my-applications', title: '我的投递' },
  { id: 'membership', title: '会员信息' },
  { id: 'settings', title: '账户设置' }
];

// 投递状态定义
const APPLICATION_STATES = [
  { id: 1, name: '已投递', color: '#3b82f6' }, // 蓝色
  { id: 2, name: '笔试', color: '#8b5cf6' },   // 紫色
  { id: 3, name: '初试', color: '#f59e0b' },   // 橙色
  { id: 4, name: '复试', color: '#ec4899' },   // 粉色
  { id: 5, name: '终面', color: '#ef4444' },   // 红色
  { id: 6, name: 'Offer', color: '#10b981' } // 绿色
];

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
  18: '其他'
};

// 状态下拉组件
const StateDropdown = ({ jobId, currentState, onStateChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownRect, setDropdownRect] = useState({ top: 0, left: 0, width: 0 });

  // 获取当前状态对象，确保使用数字类型
  const currentStateId = Number(currentState) || 1;
  const currentStateObj = APPLICATION_STATES.find(state => state.id === currentStateId) || APPLICATION_STATES[0];

  // 使用ref标记下拉按钮
  const dropdownRef = useRef(null);

  // 计算下拉菜单位置的函数
  const updateDropdownPosition = () => {
    if (dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      setDropdownRect({
        top: rect.bottom + window.scrollY, // 使用页面滚动位置修正
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  };

  const toggleDropdown = (e) => {
    e.stopPropagation();
    if (!isOpen) {
      // 打开时更新位置
      updateDropdownPosition();
    }
    setIsOpen(!isOpen);
  };

  // 屏幕滚动时更新下拉菜单位置
  useEffect(() => {
    if (isOpen) {
      const handleScroll = () => updateDropdownPosition();
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, [isOpen]);

  const handleStateSelect = (stateId, e) => {
    e.stopPropagation();
    setIsOpen(false);

    // 确保都使用数字类型比较
    const numericCurrentState = Number(currentState) || 1;
    const numericNewState = Number(stateId);

    // 只有状态发生变化时才调用更新函数
    if (numericNewState !== numericCurrentState) {
      if (typeof onStateChange === 'function') {
        onStateChange(Number(jobId), numericNewState);
      } else {
        console.error('onStateChange 不是一个函数!', onStateChange);
      }
    }
  };

  // 使用useEffect添加全局点击事件，点击外部时关闭下拉菜单
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        const dropdownElements = document.querySelectorAll('.dropdown-menu-portal');
        for (let i = 0; i < dropdownElements.length; i++) {
          if (dropdownElements[i].contains(event.target)) return;
        }
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // 渲染下拉菜单的Portal
  const renderDropdownMenu = () => {
    if (!isOpen) return null;

    return ReactDOM.createPortal(
      <div
        className="dropdown-menu-portal"
        style={{
          position: 'absolute',
          top: `${dropdownRect.top}px`,
          left: `${dropdownRect.left}px`,
          width: `${dropdownRect.width}px`,
          zIndex: 9999
        }}
      >
        <div className="status-dropdown-content">
          {APPLICATION_STATES.map(state => (
            <div
              key={state.id}
              className={`status-dropdown-item status-item-${state.id} ${state.id === currentStateId ? 'selected' : ''}`}
              onClick={(e) => handleStateSelect(state.id, e)}
            >
              {state.name}
            </div>
          ))}
        </div>
      </div>,
      document.body
    );
  };

  return (
    <div
      className={`status-dropdown-container ${isOpen ? 'active' : ''}`}
      ref={dropdownRef}
    >
      <button
        className={`status-dropdown-button status-${currentStateObj.id}`}
        onClick={toggleDropdown}
      >
        {currentStateObj.name}
      </button>

      {renderDropdownMenu()}
    </div>
  );
};

const UserDashboard = () => {
  const { user, supabase } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // 从URL参数中获取初始菜单和激活码
  const getInitialMenu = () => {
    const searchParams = new URLSearchParams(location.search);
    const menuParam = searchParams.get('menu');
    // 检查菜单参数是否有效
    if (menuParam && menuItems.some(item => item.id === menuParam)) {
      return menuParam;
    }
    return 'my-favorites'; // 默认菜单
  };

  // 获取URL中的激活码参数
  const getActivationCodeFromUrl = () => {
    const searchParams = new URLSearchParams(location.search);
    return searchParams.get('code') || '';
  };

  const [activeMenu, setActiveMenu] = useState(getInitialMenu());
  const initialCode = getActivationCodeFromUrl();
  const [userInfo, setUserInfo] = useState<any>(null);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [activationCode, setActivationCode] = useState(getActivationCodeFromUrl());
  const [activating, setActivating] = useState(false);
  const [activationError, setActivationError] = useState<string | null>(null);
  const [activationSuccess, setActivationSuccess] = useState<string | null>(null);
  const [activationAttempts, setActivationAttempts] = useState<number>(0);
  const [lastActivationTime, setLastActivationTime] = useState<number>(0);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [usernameInput, setUsernameInput] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<number>(1);
  const [savingProfile, setSavingProfile] = useState(false);
  const dataServiceRef = useRef<DataService | null>(null);
  // 添加展开/折叠状态
  const [expandedJobs, setExpandedJobs] = useState<Record<number, boolean>>({});
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // 控制是否显示行内删除按钮
  const [showRowDeleteButtons, setShowRowDeleteButtons] = useState(false);

  // 添加投递状态管理
  const [jobStates, setJobStates] = useState<Record<number, number>>({});

  // 初始化数据服务和加载用户数据
  useEffect(() => {
    if (!dataServiceRef.current) {
      dataServiceRef.current = DataService.getInstance();
    }

    if (user) {
      loadUserData();
    }
  }, [user]);

  // 监听URL参数变化，更新菜单选择
  useEffect(() => {
    const newMenu = getInitialMenu();
    if (newMenu !== activeMenu) {
      setActiveMenu(newMenu);
    }
  }, [location.search]);

  // 自动激活会员（当URL中包含激活码时）
  useEffect(() => {
    const code = getActivationCodeFromUrl();
    if (code && activeMenu === 'membership' && !activating && !activationSuccess) {
      // 延迟一点时间再触发激活，确保组件已完全加载
      const timer = setTimeout(() => {
        // 确保激活码已设置
        if (activationCode) {
          handleActivateCode();
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, activeMenu, activating, activationSuccess, activationCode]);

  // 监听菜单切换，加载相应数据
  useEffect(() => {
    if (!user || !dataServiceRef.current) return;

    const loadMenuData = async () => {
      if (activeMenu === 'my-favorites') {
        await loadFavorites();
      } else if (activeMenu === 'my-applications') {
        await loadApplications();
      }
    };

    loadMenuData();

    // 表格渲染后初始化列宽调整功能
    if (activeMenu === 'my-favorites' || activeMenu === 'my-applications') {
      // 延迟执行以确保表格已渲染
      const initTable = () => {
        setupTableWithResizableColumns('.job-table');
      };

      // 多次触发确保初始化成功
      setTimeout(initTable, 100);
      setTimeout(initTable, 500);
      setTimeout(initTable, 1000);

      // 监听窗口大小变化，重新应用冻结列
      window.addEventListener('resize', initTable);

      return () => {
        window.removeEventListener('resize', initTable);
      };
    }
  }, [activeMenu, user]);

  // 加载用户数据和投递状态
  const loadUserData = async () => {
    if (!user || !dataServiceRef.current) return;

    setLoading(true);

    try {
      // 设置用户名输入框默认值
      setUsernameInput(user.username || '');

      // 设置当前用户头像
      setSelectedIcon(user.icon || 1);

      // 查询用户会员信息
      const { data: userInfoData, error: userInfoError } = await supabase
        .from('user_info')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!userInfoError) {
        // 如果有会员信息，计算剩余天数
        if (userInfoData) {
          // 确保会员结束日期存在
          if (userInfoData.membership_end_date) {
            const today = new Date();
            const endDate = new Date(userInfoData.membership_end_date);

            // 计算剩余天数
            const remainingDays = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

            // 更新剩余天数
            userInfoData.membership_remaining_days = Math.max(0, remainingDays);
          } else {
            userInfoData.membership_remaining_days = 0;
          }
        }

        setUserInfo(userInfoData);
      } else {
        console.log('获取用户信息错误:', userInfoError);
      }

      // 直接从user_actions表获取job_state数据
      try {
        const { data: userActionData, error: userActionError } = await supabase
          .from('user_actions')
          .select('job_state')
          .eq('user_id', user.id)
          .single();

        if (!userActionError && userActionData && Array.isArray(userActionData.job_state)) {
          console.log('获取到原始job_state数据:', userActionData.job_state);

          // 将数组格式转换为对象格式
          const stateObj = {};
          userActionData.job_state.forEach(item => {
            if (Array.isArray(item) && item.length >= 2) {
              // 确保job_id是数字
              const jobId = Number(item[0]);
              const stateId = Number(item[1]);
              stateObj[jobId] = stateId;
            }
          });

          console.log('转换后的状态数据:', stateObj);
          setJobStates(stateObj);
        } else {
          console.log('无法获取用户状态数据或格式不正确:', userActionError);
        }
      } catch (stateError) {
        console.error('加载状态数据出错:', stateError);
      }

      // 根据当前选中的菜单加载对应数据
      if (activeMenu === 'my-favorites') {
        await loadFavorites();
      } else if (activeMenu === 'my-applications') {
        await loadApplications();
      } else {
        // 对于其他菜单，直接结束加载状态
        setLoading(false);
      }

    } catch (error) {
      console.error('加载用户数据出错:', error);
      setLoading(false);
    }
  };

  // 加载收藏数据
  const loadFavorites = async (forceRefresh = false) => {
    if (!user || !user.id || !dataServiceRef.current) return;

    setLoadingFavorites(true);

    try {
      // 获取用户的投递记录
      const applicationIds = await dataServiceRef.current.getApplicationJobIds(user.id);
      const applicationMap: Record<number, boolean> = {};
      applicationIds.forEach(id => {
        applicationMap[id] = true;
      });

      // 使用Promise包装回调式API
      return new Promise<void>((resolve) => {
        dataServiceRef.current?.getUserFavoriteJobs(
          user.id,
          (jobsData) => {
            console.log('获取到收藏职位:', jobsData.length);
            // 为每个职位添加is_favorite和is_applied标记
            const enhancedJobsData = jobsData.map(job => ({
              ...job,
              is_favorite: true, // 在收藏列表中的职位默认都是已收藏的
              is_applied: applicationMap[job.id] || false // 根据投递记录设置投递状态
            }));
            setFavorites(enhancedJobsData || []);
            setLoadingFavorites(false);
            setLoading(false);
            resolve();
          },
          forceRefresh // 修改为使用强制刷新，确保拿到最新数据
        );
      });
    } catch (error) {
      console.error('加载收藏数据出错:', error);
      setLoadingFavorites(false);
      setLoading(false);
      return Promise.resolve();
    }
  };

  // 加载投递数据
  const loadApplications = async (forceRefresh = false) => {
    if (!user || !user.id || !dataServiceRef.current) return;

    setLoadingApplications(true);

    try {
      // 获取用户的收藏记录
      const favoriteIds = await dataServiceRef.current.getFavoriteJobIds(user.id);
      const favoriteMap: Record<number, boolean> = {};
      favoriteIds.forEach(id => {
        favoriteMap[id] = true;
      });

      // 使用Promise包装回调式API
      return new Promise<void>((resolve) => {
        dataServiceRef.current?.getUserApplicationJobs(
          user.id,
          async (jobsData) => {
            console.log('获取到投递职位:', jobsData.length);
            // 为每个职位添加is_favorite和is_applied标记
            const enhancedJobsData = jobsData.map(job => ({
              ...job,
              is_applied: true, // 在投递列表中的职位默认都是已投递的
              is_favorite: favoriteMap[job.id] || false // 根据收藏记录设置收藏状态
            }));
            setApplications(enhancedJobsData || []);

            // 不再在这里获取状态数据，避免覆盖loadUserData中获取的数据
            setLoadingApplications(false);
            setLoading(false);
            resolve();
          },
          forceRefresh // 修改为使用强制刷新
        );
      });
    } catch (error) {
      console.error('加载投递数据出错:', error);
      setLoadingApplications(false);
      setLoading(false);
      return Promise.resolve();
    }
  };

  // 激活会员
  const handleActivateCode = async () => {
    if (!activationCode.trim()) {
      showAlert({
        title: '激活失败',
        message: '请输入激活码',
        type: 'error'
      });
      return;
    }

    // 检查激活码尝试次数限制（1小时内最多10次）
    const currentTime = Date.now();
    const oneHourInMs = 60 * 60 * 1000;

    // 如果上次尝试时间在1小时内，且已经尝试了10次，则拒绝请求
    if (currentTime - lastActivationTime < oneHourInMs && activationAttempts >= 10) {
      showAlert({
        title: '激活失败',
        message: '您的尝试次数过多，请1小时后再试',
        type: 'error'
      });
      return;
    }

    // 如果已经过了1小时，重置尝试次数
    if (currentTime - lastActivationTime >= oneHourInMs) {
      setActivationAttempts(1);
    } else {
      // 否则增加尝试次数
      setActivationAttempts(prev => prev + 1);
    }

    // 更新最后尝试时间
    setLastActivationTime(currentTime);

    setActivating(true);
    setActivationError(null);
    setActivationSuccess(null);

    // 显示处理中提示
    showAlert({
      title: '处理中',
      message: '正在验证激活码，请稍候...',
      type: 'info'
    });

    try {
      if (!user || !user.id) {
        throw new Error('用户未登录');
      }

      // 检查数据库表结构
      console.log('检查数据库表结构...');
      try {
        // 检查user_info表结构
        const { data: userInfoColumns, error: userInfoError } = await supabase
          .from('user_info')
          .select('*')
          .limit(1);

        if (userInfoError) {
          console.error('获取user_info表结构失败:', userInfoError);
        } else {
          console.log('user_info表结构:', userInfoColumns);
        }

        // 检查activation_codes表结构
        const { data: codesColumns, error: codesError } = await supabase
          .from('activation_codes')
          .select('*')
          .limit(1);

        if (codesError) {
          console.error('获取activation_codes表结构失败:', codesError);
        } else {
          console.log('activation_codes表结构:', codesColumns);
        }
      } catch (err) {
        console.error('检查表结构出错:', err);
      }

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

      // 计算新的会员到期日期
      const today = new Date();
      let newEndDate;
      let membershipType;

      // 根据激活码前缀确定会员类型
      if (activationCode.startsWith('TEMP')) {
        membershipType = 'temp_user'; // 试用会员
      } else {
        membershipType = 'official_user'; // 正式会员
      }

      if (userInfo && userInfo.membership_end_date && new Date(userInfo.membership_end_date) > today) {
        // 如果用户已有会员且未过期，则延长期限
        console.log('用户已有会员且未过期，延长期限');
        newEndDate = new Date(userInfo.membership_end_date);
        newEndDate.setDate(newEndDate.getDate() + codeData.validity_days);

        // 如果当前是试用会员，但激活的是正式会员，则升级会员类型
        if (userInfo.membership_type === 'temp_user' && membershipType === 'official_user') {
          console.log('用户从试用会员升级为正式会员');
          membershipType = 'official_user';
        }
      } else {
        // 如果用户没有会员或会员已过期，则从今天开始计算
        console.log('用户没有会员或已过期，从当前日期开始计算');
        newEndDate = new Date();
        newEndDate.setDate(newEndDate.getDate() + codeData.validity_days);
      }

      // 格式化日期为ISO字符串（兼容数据库）
      const formattedStartDate = today.toISOString();
      const formattedEndDate = newEndDate.toISOString();
      const remainingDays = Math.ceil((newEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

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

      // 根据会员类型显示不同的成功消息
      if (membershipType === 'temp_user') {
        // 使用系统提示框显示成功消息
        showAlert({
          title: '激活成功',
          message: `试用会员激活成功！您可以免费使用3天。`,
          type: 'success'
        });
        setActivationSuccess('试用会员激活成功！您可以免费使用3天。');
      } else {
        // 使用系统提示框显示成功消息
        showAlert({
          title: '激活成功',
          message: `正式会员激活成功！有效期至${newEndDate.toLocaleDateString('zh-CN')}`,
          type: 'success'
        });
        setActivationSuccess('正式会员激活成功！');
      }

      setActivationCode('');

      // 重新加载用户数据
      loadUserData();

    } catch (error: any) {
      console.error('激活会员出错:', error);
      // 使用系统提示框显示错误消息
      showAlert({
        title: '激活失败',
        message: error.message || '激活会员失败，请检查激活码是否正确',
        type: 'error'
      });
      setActivationError(error.message || '激活会员失败，请检查激活码是否正确');
    } finally {
      setActivating(false);
    }
  };

  // 更新用户个人资料
  const handleUpdateProfile = async () => {
    if (!usernameInput.trim()) {
      showAlert({
        title: '输入错误',
        message: '用户名不能为空',
        type: 'error'
      });
      return;
    }

    setSavingProfile(true);

    try {
      if (!user || !user.id) {
        throw new Error('用户未登录');
      }

      // 使用存储过程更新用户名和头像，避免触发器问题
      const { data, error } = await supabase.rpc(
        'direct_update_user',
        {
          p_user_id: user.id,
          p_username: usernameInput,
          p_icon: selectedIcon
        }
      );

      if (error) throw error;

      // 使用系统提示框显示成功消息
      showAlert({
        title: '更新成功',
        message: '用户资料更新成功',
        type: 'success',
        autoClose: 2000
      });

      // 更新全局用户信息
      if (user) {
        user.username = usernameInput;
        user.icon = selectedIcon;
      }

      // 更新本地存储中的用户信息
      const authData = localStorage.getItem('authData');
      if (authData) {
        try {
          const parsedData = JSON.parse(authData);
          parsedData.username = usernameInput;
          parsedData.icon = selectedIcon;
          localStorage.setItem('authData', JSON.stringify(parsedData));
        } catch (err) {
          console.error('更新本地存储用户信息出错:', err);
        }
      }

      // 触发自定义事件，通知Header组件更新头像
      window.dispatchEvent(new CustomEvent('userProfileUpdated', {
        detail: { username: usernameInput, icon: selectedIcon }
      }));

    } catch (error: any) {
      console.error('更新用户资料出错:', error);
      showAlert({
        title: '更新失败',
        message: error.message || '更新用户资料失败',
        type: 'error'
      });
    } finally {
      setSavingProfile(false);
    }
  };

  // 更新用户密码
  const handleUpdatePassword = async () => {
    const { currentPassword, newPassword, confirmPassword } = passwordData;

    if (!currentPassword || !newPassword || !confirmPassword) {
      showAlert({
        title: '输入错误',
        message: '请填写所有密码字段',
        type: 'error'
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      showAlert({
        title: '输入错误',
        message: '新密码和确认密码不匹配',
        type: 'error'
      });
      return;
    }

    if (newPassword.length < 6) {
      showAlert({
        title: '输入错误',
        message: '新密码长度不应少于6个字符',
        type: 'error'
      });
      return;
    }

    setSavingProfile(true);

    try {
      if (!user || !user.id) {
        throw new Error('用户未登录');
      }

      // 验证当前密码
      const { data, error } = await supabase
        .from('users')
        .select('password')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data.password !== currentPassword) {
        throw new Error('当前密码不正确');
      }

      // 使用存储过程更新密码，避免触发器问题
      const { data: updateData, error: updateError } = await supabase.rpc(
        'direct_update_user_password',
        {
          p_user_id: user.id,
          p_password: newPassword
        }
      );

      if (updateError) throw updateError;

      // 使用系统提示框显示成功消息
      showAlert({
        title: '更新成功',
        message: '密码更新成功',
        type: 'success',
        autoClose: 2000
      });

      // 清空密码输入框
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

    } catch (error: any) {
      console.error('更新密码出错:', error);
      showAlert({
        title: '更新失败',
        message: error.message || '更新密码失败',
        type: 'error'
      });
    } finally {
      setSavingProfile(false);
    }
  };

  // 处理密码输入框变更
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 格式化日期显示
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);

      // 判断是否是2999年开始的日期，如果是则显示"招满为止"
      if (date.getFullYear() >= 2999) {
        return '招满为止';
      }

      // 直接返回具体日期，不使用相对时间
      return date.toLocaleDateString('zh-CN');
    } catch (e) {
      return '-';
    }
  };

  // 格式化分类
  const formatCategories = (categoryIds: number[]) => {
    if (!categoryIds || !Array.isArray(categoryIds)) return '未分类';
    return categoryIds.map(id => CATEGORIES[id] || `未知分类(${id})`).join(', ');
  };

  // 添加展开/折叠切换函数
  const handleToggleExpand = (jobId: string, event?: React.MouseEvent) => {
    // 如果事件来源于下拉菜单区域，不处理展开/折叠
    if (event && (
      event.target instanceof Element &&
      (
        event.target.closest('.status-dropdown-container') ||
        event.target.closest('.status-dropdown-button') ||
        event.target.closest('.status-dropdown-content')
      )
    )) {
      console.log('点击来自下拉菜单区域，不处理展开/折叠');
      return;
    }

    setExpandedJobId(expandedJobId === jobId ? null : jobId);
  };

  // 获取当前页的数据
  const getCurrentPageData = (data: any[]) => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return data.slice(indexOfFirstItem, indexOfLastItem);
  };

  // 处理页码变化
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  // 处理投递状态变更
  const handleJobStateChange = async (jobId, newStateId) => {
    if (!user || !user.id) return;

    // 确保jobId是数字类型
    const numericJobId = Number(jobId);
    const numericStateId = Number(newStateId);

    console.log(`===== 开始更新状态 [${new Date().toLocaleTimeString()}] =====`);
    console.log(`用户ID: ${user.id}, 类型: ${typeof user.id}`);
    console.log(`职位ID: ${numericJobId}, 类型: ${typeof numericJobId}`);
    console.log(`新状态ID: ${numericStateId}, 类型: ${typeof numericStateId}`);

    try {
      // 先更新本地状态以提供即时反馈
      setJobStates(prev => ({
        ...prev,
        [numericJobId]: numericStateId
      }));

      // 显示正在处理的提示
      showAlert({
        title: '处理中',
        message: '正在更新状态...',
        type: 'info',
        autoClose: 1000
      });

      // 获取当前用户数据
      console.log('获取当前用户数据...');
      const { data: userData, error: userError } = await supabase
        .from('user_actions')
        .select('job_state')
        .eq('user_id', user.id)
        .single();

      console.log('获取用户数据结果:', userData);

      if (userError) {
        console.error('获取用户数据错误:', userError);

        // 如果是找不到记录，则创建新记录
        if (userError.code === 'PGRST116') {
          console.log('用户记录不存在，创建新记录');

          const { data: insertData, error: insertError } = await supabase
            .from('user_actions')
            .insert({
              user_id: user.id,
              job_state: [[numericJobId, numericStateId]],
              favorite_job_ids: [],
              application_job_ids: [],
              updated_at: new Date().toISOString(),
              created_at: new Date().toISOString()
            });

          if (insertError) {
            console.error('创建用户记录失败:', insertError);
            throw insertError;
          }

          console.log('创建用户记录成功');
        } else {
          throw userError;
        }
      } else {
        // 准备新的job_state数据
        let jobState = userData?.job_state || [];
        console.log('当前job_state:', jobState);

        // 确保jobState是数组
        if (!Array.isArray(jobState)) {
          console.log('job_state不是数组，初始化为空数组');
          jobState = [];
        }

        // 查找现有记录索引
        const existingIndex = jobState.findIndex(item =>
          Array.isArray(item) && Number(item[0]) === numericJobId
        );

        if (existingIndex >= 0) {
          // 更新现有记录
          console.log(`更新索引 ${existingIndex} 处的状态: ${jobState[existingIndex][1]} -> ${numericStateId}`);
          jobState[existingIndex][1] = numericStateId;
        } else {
          // 添加新记录
          console.log(`添加新状态记录: [${numericJobId}, ${numericStateId}]`);
          jobState.push([numericJobId, numericStateId]);
        }

        console.log('更新后的job_state:', jobState);

        // 更新数据库
        console.log('执行UPDATE操作...');
        const { data: updateData, error: updateError } = await supabase
          .from('user_actions')
          .update({
            job_state: jobState,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);

        if (updateError) {
          console.error('UPDATE错误:', updateError);
          throw updateError;
        }

        console.log('UPDATE成功');
      }

      // 显示成功消息
      showAlert({
        title: '状态已更新',
        message: `招聘状态已更新为：${APPLICATION_STATES.find(s => s.id === numericStateId)?.name}`,
        type: 'success',
        autoClose: 2000
      });

      console.log(`===== 状态更新完成 [${new Date().toLocaleTimeString()}] =====`);

    } catch (error) {
      console.error('更新投递状态最终错误:', error);

      if (error.response) {
        console.error('HTTP响应状态:', error.response.status);
        console.error('HTTP响应数据:', error.response.data);
      }

      // 恢复原状态
      setJobStates(prev => {
        const newState = { ...prev };
        delete newState[numericJobId]; // 移除失败的更新
        return newState;
      });

      showAlert({
        title: '更新失败',
        message: `投递状态更新失败: ${error.message || '请重试'}`,
        type: 'error'
      });

      console.log(`===== 状态更新失败 [${new Date().toLocaleTimeString()}] =====`);
    }
  };

  // 刷新投递状态数据
  const refreshJobStates = async () => {
    if (!user || !user.id) return;

    try {
      console.log(`===== 开始刷新状态数据 =====`);
      console.log(`用户ID: ${user.id}`);

      showAlert({
        title: '正在刷新',
        message: '正在获取最新状态数据...',
        type: 'info',
        autoClose: 1000
      });

      const { data, error } = await supabase
        .from('user_actions')
        .select('job_state')
        .eq('user_id', user.id)
        .single();

      console.log('获取数据结果:', data);
      console.log('获取数据错误:', error);

      if (error) {
        console.error('刷新状态数据失败:', error);
        showAlert({
          title: '刷新失败',
          message: `无法获取最新状态数据: ${error.message || '请稍后再试'}`,
          type: 'error'
        });
        return;
      }

      if (data && Array.isArray(data.job_state)) {
        console.log('获取到最新job_state数据:', data.job_state);

        // 将数组格式转换为对象格式
        const stateObj = {};
        data.job_state.forEach(item => {
          if (Array.isArray(item) && item.length >= 2) {
            const jobId = Number(item[0]);
            const stateId = Number(item[1]);
            stateObj[jobId] = stateId;
            console.log(`职位 ${jobId} 的状态: ${stateId} (${APPLICATION_STATES.find(s => s.id === stateId)?.name || '未知'})`);
          }
        });

        console.log('转换后的状态数据:', stateObj);
        setJobStates(stateObj);

        showAlert({
          title: '刷新成功',
          message: '状态数据已更新',
          type: 'success',
          autoClose: 1500
        });

        console.log(`===== 状态刷新完成 =====`);
      } else {
        console.warn('job_state数据格式不正确:', data?.job_state);
        showAlert({
          title: '刷新提示',
          message: '未找到状态数据或格式不正确',
          type: 'warning'
        });
      }
    } catch (error) {
      console.error('刷新状态数据出错:', error);
      showAlert({
        title: '刷新失败',
        message: `出现错误: ${error.message || '未知错误'}`,
        type: 'error'
      });
    }
  };

  // 处理删除投递记录
  const handleDeleteApplication = async (jobId: number, event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (!user || !user.id || !dataServiceRef.current) return;

    // 显示确认对话框
    showConfirm(
      '确定要删除此投递记录吗？',
      async () => {
        try {
          // 添加防抖处理
          const actionKey = `delete_application_${jobId}`;
          if (sessionStorage.getItem(actionKey)) return;
          sessionStorage.setItem(actionKey, 'true');

          try {
            // 调用服务删除投递记录
            await dataServiceRef.current.removeApplication(user.id, jobId);

            // 更新本地状态，从列表中移除该记录
            setApplications(prev => prev.filter(job => job.id !== jobId));

            // 显示成功消息
            showAlert({
              title: '操作成功',
              message: '已删除投递记录',
              type: 'success',
              autoClose: 2000
            });
          } catch (error) {
            console.error('删除投递记录失败:', error);

            showAlert({
              title: '操作失败',
              message: '删除投递记录失败，请重试',
              type: 'error'
            });
          } finally {
            setTimeout(() => {
              sessionStorage.removeItem(actionKey);
            }, 1000);
          }
        } catch (error) {
          console.error('删除投递记录处理出错:', error);
        }
      }
    );
  };

  // 处理批量删除投递记录
  const handleBatchDeleteApplications = () => {
    if (!user || !user.id || !dataServiceRef.current) return;

    // 显示确认对话框
    showConfirm(
      '确定要删除所有显示的投递记录吗？',
      async () => {
        try {
          // 获取当前页的数据
          const currentApplications = getCurrentPageData(applications);
          const jobIds = currentApplications.map(job => job.id);

          if (jobIds.length === 0) {
            showAlert({
              title: '提示',
              message: '没有可删除的投递记录',
              type: 'info'
            });
            return;
          }

          // 显示处理中提示
          showAlert({
            title: '处理中',
            message: '正在删除投递记录，请稍候...',
            type: 'info'
          });

          // 逐个删除投递记录
          let successCount = 0;
          let failCount = 0;

          for (const jobId of jobIds) {
            try {
              await dataServiceRef.current.removeApplication(user.id, jobId);
              successCount++;
            } catch (error) {
              console.error(`删除投递记录 ${jobId} 失败:`, error);
              failCount++;
            }
          }

          // 更新本地状态，从列表中移除已删除的记录
          setApplications(prev => prev.filter(job => !jobIds.includes(job.id)));

          // 显示结果消息
          if (failCount === 0) {
            showAlert({
              title: '操作成功',
              message: `已成功删除 ${successCount} 条投递记录`,
              type: 'success'
            });
          } else {
            showAlert({
              title: '操作部分成功',
              message: `成功删除 ${successCount} 条记录，失败 ${failCount} 条`,
              type: 'warning'
            });
          }
        } catch (error) {
          console.error('批量删除投递记录处理出错:', error);
          showAlert({
            title: '操作失败',
            message: '批量删除投递记录失败，请重试',
            type: 'error'
          });
        }
      }
    );
  };

  // 根据选中的菜单项渲染不同的内容
  const renderContent = () => {
    // 计算总页数
    const totalPages = Math.ceil(
      activeMenu === 'my-favorites'
        ? favorites.length / itemsPerPage
        : activeMenu === 'my-applications'
          ? applications.length / itemsPerPage
          : 0
    );

    switch (activeMenu) {
      case 'my-favorites':
        // 获取当前页的数据
        const currentFavorites = getCurrentPageData(favorites);

        return (
          <div className="dashboard-content-section">
            {loadingFavorites ? (
              <div className="loading-indicator">加载中...</div>
            ) : favorites.length === 0 ? (
              <p className="empty-message">暂无收藏的招聘信息</p>
            ) : (
              <>
                <div className="job-table-container">
                  <div className="table-responsive">
                    <table className="job-table">
                      <thead>
                        <tr>
                          <th data-width="180px">操作</th>
                          <th data-width="20%">招聘信息标题</th>
                          <th data-width="8%">招聘对象</th>
                          <th data-width="8%">截止时间</th>
                          <th data-width="10%">工作地点</th>
                          <th data-width="12%">招聘岗位</th>
                          <th data-width="12%">招聘专业</th>
                          <th data-width="8%">招聘学历</th>
                          <th data-width="7%">浏览人数</th>
                          <th data-width="7%">收藏人数</th>
                          <th data-width="7%">投递人数</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentFavorites.map((job) => {
                          // 判断是否已投递
                          const isApplied = job.is_applied || false;
                          // 判断是否已收藏（在收藏页面中，默认都是已收藏的）
                          const isFavorite = job.is_favorite !== false; // 默认为true，除非明确设置为false

                          return (
                            <React.Fragment key={job.id}>
                              <tr
                                className={expandedJobId === job.id ? 'expanded' : ''}
                                onClick={(e) => handleToggleExpand(job.id.toString(), e)}
                              >
                                <td className="action-column">
                                  <div style={{ display: 'flex', flexDirection: 'row', width: '100%', position: 'relative', height: '40px' }}>
                                    {/* 收藏按钮放在第一个 - 使用绝对定位，向右移动 */}
                                    <button
                                      className={`favorite-button ${isFavorite ? 'active' : ''}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleFavorite(job.id, e);
                                      }}
                                      style={{
                                        position: 'absolute',
                                        left: '50px', /* 调整：从10px移到50px，向右移动 */
                                        top: '-3px',
                                        zIndex: 10
                                      }}
                                    >
                                      <i className={`favorite-icon ${isFavorite ? 'active' : ''}`}></i>
                                    </button>

                                    {/* 投递按钮放在第二个 - 使用绝对定位并固定位置，向左移动 */}
                                    <a
                                      href={job.application_link || "#"}
                                      className={`apply-button orange-apply-button ${isApplied ? 'applied' : ''}`}
                                      onClick={(e) => {
                                        if (!job.application_link) {
                                          e.preventDefault();
                                        }
                                        handleApply(job.id, job.application_link, e);
                                      }}
                                      style={{
                                        position: 'absolute',
                                        left: '100px', /* 调整：从120px移到100px，向左移动 */
                                        top: '0px',
                                        width: '90px',
                                        textAlign: 'center',
                                        backgroundColor: '#ff9800',
                                        borderRadius: '8px',
                                        zIndex: 9
                                      }}
                                    >
                                      {isApplied ? '再次投递' : '投递申请'}
                                    </a>
                                  </div>
                                </td>
                                <td>{job.job_title}</td>
                                <td>{job.job_graduation_year || '不限'}</td>
                                <td>{formatDate(job.deadline)}</td>
                                <td>
                                  {job.job_location}
                                </td>
                                <td>{job.job_position}</td>
                                <td>{job.job_major}</td>
                                <td>{job.job_education_requirement}</td>
                                <td>
                                  {job.views_count || 0}
                                </td>
                                <td>
                                  {job.favorites_count || 0}
                                </td>
                                <td>
                                  {job.applications_count || 0}
                                </td>
                              </tr>
                              {expandedJobId === job.id && (
                                <tr className="job-details-row">
                                  <td colSpan={11} className="job-details-cell">
                                    <div className="job-details-content">
                                      <h3 className="job-details-header">{job.job_title} - 详细信息</h3>

                                      <div className="job-detail-item">
                                        <span className="job-detail-label">公司名称</span>
                                        <span className="job-detail-value">{job.company_name || '未知'}</span>
                                      </div>

                                      <div className="job-detail-item">
                                        <span className="job-detail-label">工作地点</span>
                                        <span className="job-detail-value">{job.job_location || '未指定'}</span>
                                      </div>

                                      <div className="job-detail-item">
                                        <span className="job-detail-label">薪资范围</span>
                                        <span className="job-detail-value">{job.salary_range || '未指定'}</span>
                                      </div>

                                      <div className="job-detail-item">
                                        <span className="job-detail-label">职位类型</span>
                                        <span className="job-detail-value">{job.job_type || '全职'}</span>
                                      </div>

                                      <div className="job-detail-item">
                                        <span className="job-detail-label">发布日期</span>
                                        <span className="job-detail-value">
                                          {job.created_at ? new Date(job.created_at).toLocaleDateString() : '未知'}
                                        </span>
                                      </div>

                                      <div className="job-detail-item">
                                        <span className="job-detail-label">截止日期</span>
                                        <span className="job-detail-value">
                                          {job.deadline ? new Date(job.deadline).toLocaleDateString() : '未指定'}
                                        </span>
                                      </div>

                                      <div className="job-description-section">
                                        <div className="job-detail-item">
                                          <span className="job-detail-label">职位描述</span>
                                          <span className="job-detail-value">{job.job_description || '暂无描述'}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 分页控件 */}
                {totalPages > 1 && (
                  <div className="pagination">
                    <button
                      onClick={() => handlePageChange(1)}
                      disabled={currentPage === 1}
                      className="pagination-button"
                    >
                      首页
                    </button>
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="pagination-button"
                    >
                      上一页
                    </button>
                    <span className="pagination-info">
                      第 {currentPage} 页，共 {totalPages} 页
                    </span>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="pagination-button"
                    >
                      下一页
                    </button>
                    <button
                      onClick={() => handlePageChange(totalPages)}
                      disabled={currentPage === totalPages}
                      className="pagination-button"
                    >
                      末页
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        );

      case 'my-applications':
        // 获取当前页的数据
        const currentApplications = getCurrentPageData(applications);

        return (
          <div className="dashboard-content-section applications-page">
            {loadingApplications ? (
              <div className="loading-indicator">加载中...</div>
            ) : applications.length === 0 ? (
              <p className="empty-message">暂无投递的招聘信息</p>
            ) : (
              <>
                {/* 添加调试按钮 - 仅用于开发调试 */}
                <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px', display: 'none', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    style={{
                      padding: '8px 12px',
                      backgroundColor: '#2196F3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                    onClick={refreshJobStates}
                  >
                    刷新状态数据
                  </button>

                  <button
                    style={{
                      padding: '8px 12px',
                      backgroundColor: '#4CAF50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                    onClick={async () => {
                      if (!user || !user.id) return;

                      try {
                        // 查询用户的投递状态数据
                        const { data, error } = await supabase
                          .from('user_actions')
                          .select('job_state')
                          .eq('user_id', user.id)
                          .single();

                        if (error) {
                          console.error('获取用户行为记录失败:', error);
                          alert(`获取用户行为记录失败: ${error.message}`);
                          return;
                        }

                        console.log('当前用户job_state数据:', data?.job_state);
                        alert(`当前用户job_state数据:\n${JSON.stringify(data?.job_state || [], null, 2)}`);
                      } catch (err) {
                        console.error('检查数据出错:', err);
                        alert(`检查数据出错: ${err.message}`);
                      }
                    }}
                  >
                    调试: 检查当前job_state数据
                  </button>

                  <button
                    style={{
                      padding: '8px 12px',
                      backgroundColor: '#FF5722',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                    onClick={async () => {
                      if (!user || !user.id) return;

                      try {
                        // 测试直接更新job_state
                        const testJobId = prompt('请输入要测试的职位ID:', '16');
                        const testStateId = prompt('请输入要设置的状态ID (1-6):', '2');

                        if (!testJobId || !testStateId) {
                          alert('取消测试');
                          return;
                        }

                        const numericJobId = Number(testJobId);
                        const numericStateId = Number(testStateId);

                        // 先显示准备测试的信息
                        alert(`准备测试更新:\n职位ID: ${numericJobId}\n状态ID: ${numericStateId}`);

                        // 简化更新方式，直接使用原始SQL
                        const { data, error } = await supabase.rpc(
                          'direct_update_job_state',
                          {
                            p_user_id: user.id,
                            p_job_id: numericJobId,
                            p_state_id: numericStateId
                          }
                        );

                        if (error) {
                          console.error('直接更新测试失败:', error);
                          alert(`测试失败: ${error.message}`);
                          return;
                        }

                        alert(`测试成功! 返回值: ${data}`);

                        // 刷新状态
                        await refreshJobStates();

                      } catch (err) {
                        console.error('测试更新出错:', err);
                        alert(`测试出错: ${err.message}`);
                      }
                    }}
                  >
                    诊断: 使用RPC测试更新
                  </button>

                  <button
                    style={{
                      padding: '8px 12px',
                      backgroundColor: '#9C27B0',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                    onClick={async () => {
                      if (!user || !user.id) return;

                      try {
                        // 测试直接更新job_state通过UPSERT
                        const testJobId = prompt('请输入要测试的职位ID:', '16');
                        const testStateId = prompt('请输入要设置的状态ID (1-6):', '2');

                        if (!testJobId || !testStateId) {
                          alert('取消测试');
                          return;
                        }

                        const numericJobId = Number(testJobId);
                        const numericStateId = Number(testStateId);

                        // 先显示准备测试的信息
                        alert(`准备通过UPSERT测试更新:\n职位ID: ${numericJobId}\n状态ID: ${numericStateId}`);

                        // 先获取当前job_state
                        const { data: currentData, error: fetchError } = await supabase
                          .from('user_actions')
                          .select('job_state')
                          .eq('user_id', user.id)
                          .single();

                        if (fetchError && fetchError.code !== 'PGRST116') {
                          console.error('获取当前数据失败:', fetchError);
                          alert(`获取当前数据失败: ${fetchError.message}`);
                          return;
                        }

                        // 准备新的job_state
                        let jobState = currentData?.job_state || [];
                        console.log('当前job_state:', jobState);

                        // 查找现有记录索引
                        const existingIndex = jobState.findIndex(item =>
                          Array.isArray(item) && Number(item[0]) === numericJobId
                        );

                        if (existingIndex >= 0) {
                          // 更新现有记录
                          jobState[existingIndex][1] = numericStateId;
                        } else {
                          // 添加新记录
                          jobState.push([numericJobId, numericStateId]);
                        }

                        console.log('更新后的job_state:', jobState);

                        // 使用UPSERT更新
                        const { data, error } = await supabase
                          .from('user_actions')
                          .upsert({
                            user_id: user.id,
                            job_state: jobState
                          });

                        if (error) {
                          console.error('UPSERT测试失败:', error);
                          alert(`UPSERT测试失败: ${error.message}`);
                          return;
                        }

                        alert(`UPSERT测试成功!`);

                        // 刷新状态
                        await refreshJobStates();

                      } catch (err) {
                        console.error('UPSERT测试出错:', err);
                        alert(`UPSERT测试出错: ${err.message}`);
                      }
                    }}
                  >
                    诊断: 使用UPSERT测试
                  </button>

                  <button
                    style={{
                      padding: '8px 12px',
                      backgroundColor: '#607D8B',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                    onClick={async () => {
                      if (!user || !user.id) return;

                      // 显示Supabase连接信息
                      const connectionInfo = {
                        supabaseUrl: supabase.supabaseUrl,
                        supabaseKey: supabase.supabaseKey ? '存在(已隐藏)' : '不存在',
                        auth: {
                          session: supabase.auth.session() ? '存在' : '不存在',
                          user: supabase.auth.user() ? '存在' : '不存在'
                        }
                      };

                      console.log('Supabase连接信息:', connectionInfo);
                      alert(`Supabase连接信息:\n${JSON.stringify(connectionInfo, null, 2)}`);
                    }}
                  >
                    诊断: 检查连接状态
                  </button>

                  <button
                    style={{
                      padding: '8px 12px',
                      backgroundColor: '#673AB7',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      if (!user || !user.id) return;

                      // 测试直接调用函数
                      const testJobId = prompt('请输入要测试的职位ID:', '16');
                      const testStateId = prompt('请输入要设置的状态ID (1-6):', '2');

                      if (!testJobId || !testStateId) {
                        alert('取消测试');
                        return;
                      }

                      // 直接调用handleJobStateChange
                      alert(`直接调用函数 handleJobStateChange(${testJobId}, ${testStateId})`);
                      handleJobStateChange(Number(testJobId), Number(testStateId));
                    }}
                  >
                    诊断: 直接调用函数
                  </button>
                </div>

                <div className="job-table-container">
                  <div className="table-responsive">
                    <table className="job-table">
                      <thead>
                        <tr>
                          <th data-width="400px">
                            操作
                            <button
                              className="batch-delete-button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (showRowDeleteButtons) {
                                  // 如果已经在删除模式，点击"完成"按钮时切换回正常模式
                                  setShowRowDeleteButtons(false);
                                } else {
                                  // 如果不在删除模式，点击"删除"按钮时切换到删除模式
                                  setShowRowDeleteButtons(true);

                                  // 显示提示信息
                                  showAlert({
                                    title: '删除模式已启用',
                                    message: '点击各行的删除按钮可删除单条记录，或点击"批量删除"按钮删除所有显示的记录',
                                    type: 'info',
                                    autoClose: 3000
                                  });
                                }
                              }}
                              title={showRowDeleteButtons ? "退出删除模式" : "进入删除模式"}
                              style={{
                                marginLeft: '10px',
                                padding: '2px 5px',
                                fontSize: '12px',
                                backgroundColor: showRowDeleteButtons ? '#1890ff' : '#ff4d4f',
                                color: 'white',
                                border: 'none',
                                borderRadius: '3px',
                                cursor: 'pointer'
                              }}
                            >
                              {showRowDeleteButtons ? "完成" : "删除"}
                            </button>

                            {/* 批量删除按钮 - 只在删除模式下显示 */}
                            {showRowDeleteButtons && (
                              <button
                                className="batch-delete-button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleBatchDeleteApplications();
                                }}
                                title="删除所有显示的投递记录"
                                style={{
                                  marginLeft: '5px',
                                  padding: '2px 5px',
                                  fontSize: '12px',
                                  backgroundColor: '#ff7875',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '3px',
                                  cursor: 'pointer'
                                }}
                              >
                                批量删除
                              </button>
                            )}
                          </th>
                          <th data-width="20%">招聘信息标题</th>
                          <th data-width="8%">招聘对象</th>
                          <th data-width="8%">截止时间</th>
                          <th data-width="10%">工作地点</th>
                          <th data-width="12%">招聘岗位</th>
                          <th data-width="12%">招聘专业</th>
                          <th data-width="8%">招聘学历</th>
                          <th data-width="7%">浏览人数</th>
                          <th data-width="7%">收藏人数</th>
                          <th data-width="7%">投递人数</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentApplications.map((job) => {
                          // 判断是否已投递
                          const isApplied = job.is_applied !== false; // 默认为true，除非明确设置为false
                          // 判断是否已收藏
                          const isFavorite = job.is_favorite || false;
                          // 获取当前职位的投递状态，默认为1（已投递）
                          const currentJobState = jobStates[job.id] || 1;

                          return (
                            <React.Fragment key={job.id}>
                              <tr
                                className={expandedJobId === job.id ? 'expanded' : ''}
                                onClick={(e) => handleToggleExpand(job.id.toString(), e)}
                              >
                                <td className="action-column">
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    width: '100%',
                                    justifyContent: 'flex-start',
                                    paddingLeft: '8px', /* 稍微增加左内边距 */
                                    gap: '12px' /* 增加组件之间的间距 */
                                  }}>
                                    {/* 投递状态下拉菜单 */}
                                    <StateDropdown
                                      jobId={Number(job.id)}
                                      currentState={currentJobState}
                                      onStateChange={handleJobStateChange}
                                    />

                                    {/* 根据模式显示投递按钮或删除按钮 */}
                                    {showRowDeleteButtons ? (
                                      /* 删除模式下显示删除按钮 */
                                      <a
                                        href="#"
                                        className="application-action-button delete-mode"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          handleDeleteApplication(job.id, e);
                                        }}
                                        title="删除此投递记录"
                                        style={{
                                          backgroundColor: '#ff4d4f',
                                          color: 'white'
                                        }}
                                      >
                                        删除
                                      </a>
                                    ) : (
                                      /* 正常模式下显示投递按钮 */
                                      <a
                                        href={job.application_link || "#"}
                                        className={`application-action-button ${isApplied ? 'applied' : ''}`}
                                        onClick={(e) => {
                                          if (!job.application_link) {
                                            e.preventDefault();
                                          }
                                          handleApply(job.id, job.application_link, e);
                                        }}
                                      >
                                        {isApplied ? '再次投递' : '投递申请'}
                                      </a>
                                    )}

                                    {/* 调试信息 */}
                                    <div style={{ fontSize: '10px', color: '#666', display: 'none' }}>
                                      JobID: {job.id}, State: {currentJobState}
                                    </div>
                                  </div>
                                </td>
                                <td>{job.job_title}</td>
                                <td>{job.job_graduation_year || '不限'}</td>
                                <td>{formatDate(job.deadline)}</td>
                                <td>
                                  {job.job_location}
                                </td>
                                <td>{job.job_position}</td>
                                <td>{job.job_major}</td>
                                <td>{job.job_education_requirement}</td>
                                <td>{job.views_count || 0}</td>
                                <td>{job.favorites_count || 0}</td>
                                <td>{job.applications_count || 0}</td>
                              </tr>
                              {expandedJobId === job.id && (
                                <tr className="job-details-row">
                                  <td colSpan={11} className="job-details-cell">
                                    <div className="job-details-content">
                                      <h3 className="job-details-header">{job.job_title} - 详细信息</h3>

                                      <div className="job-detail-item">
                                        <span className="job-detail-label">公司名称</span>
                                        <span className="job-detail-value">{job.company_name || '未知'}</span>
                                      </div>

                                      <div className="job-detail-item">
                                        <span className="job-detail-label">工作地点</span>
                                        <span className="job-detail-value">{job.job_location || '未指定'}</span>
                                      </div>

                                      <div className="job-detail-item">
                                        <span className="job-detail-label">投递状态</span>
                                        <span className="job-detail-value">
                                          <span className={`status-${currentJobState}`} style={{padding: '2px 8px', borderRadius: '4px'}}>
                                            <span className="status-indicator"></span>
                                            {APPLICATION_STATES.find(s => s.id === currentJobState)?.name || '已投递'}
                                          </span>
                                        </span>
                                      </div>

                                      <div className="job-detail-item">
                                        <span className="job-detail-label">薪资范围</span>
                                        <span className="job-detail-value">{job.salary_range || '未指定'}</span>
                                      </div>

                                      <div className="job-detail-item">
                                        <span className="job-detail-label">职位类型</span>
                                        <span className="job-detail-value">{job.job_type || '全职'}</span>
                                      </div>

                                      <div className="job-detail-item">
                                        <span className="job-detail-label">发布日期</span>
                                        <span className="job-detail-value">
                                          {job.created_at ? new Date(job.created_at).toLocaleDateString() : '未知'}
                                        </span>
                                      </div>

                                      <div className="job-detail-item">
                                        <span className="job-detail-label">截止日期</span>
                                        <span className="job-detail-value">
                                          {job.deadline ? new Date(job.deadline).toLocaleDateString() : '未指定'}
                                        </span>
                                      </div>

                                      <div className="job-description-section">
                                        <div className="job-detail-item">
                                          <span className="job-detail-label">职位描述</span>
                                          <span className="job-detail-value">{job.job_description || '暂无描述'}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 分页控件 */}
                {totalPages > 1 && (
                  <div className="pagination">
                    <button
                      onClick={() => handlePageChange(1)}
                      disabled={currentPage === 1}
                      className="pagination-button"
                    >
                      首页
                    </button>
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="pagination-button"
                    >
                      上一页
                    </button>
                    <span className="pagination-info">
                      第 {currentPage} 页，共 {totalPages} 页
                    </span>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="pagination-button"
                    >
                      下一页
                    </button>
                    <button
                      onClick={() => handlePageChange(totalPages)}
                      disabled={currentPage === totalPages}
                      className="pagination-button"
                    >
                      末页
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        );

      case 'membership':
        return (
          <div className="dashboard-content-section">
            {loading ? (
              <div className="loading-indicator">加载中...</div>
            ) : (
              <div className="membership-info">
                <div className="membership-flex-container">
                  <div className="membership-status">
                    <h4>会员状态</h4>
                    <div className="info-item">
                      <span className="info-label">会员类型:</span>
                      <span className={`info-value ${
                        userInfo?.membership_type === 'official_user' && userInfo?.membership_remaining_days > 0
                          ? 'official-member'
                          : userInfo?.membership_type === 'temp_user' && userInfo?.membership_remaining_days > 0
                            ? 'temp-member'
                            : 'common-member'
                      }`}>
                        {userInfo?.membership_type === 'official_user' && userInfo?.membership_remaining_days > 0
                          ? '正式会员'
                          : userInfo?.membership_type === 'temp_user' && userInfo?.membership_remaining_days > 0
                            ? '试用会员'
                            : '普通用户'}
                      </span>
                    </div>

                    {((userInfo?.membership_type === 'official_user' || userInfo?.membership_type === 'temp_user') &&
                      userInfo?.membership_remaining_days > 0) && (
                      <>
                        <div className="info-item">
                          <span className="info-label">会员结束日期:</span>
                          <span className="info-value">
                            {formatDate(userInfo.membership_end_date)}
                          </span>
                        </div>

                        <div className="info-item">
                          <span className="info-label">剩余天数:</span>
                          <span className="info-value">{userInfo.membership_remaining_days || 0} 天</span>
                        </div>
                      </>
                    )}

                    {((userInfo?.membership_type === 'official_user' || userInfo?.membership_type === 'temp_user') &&
                      userInfo?.membership_remaining_days <= 0) && (
                      <div className="info-item">
                        <span className="info-label">会员状态:</span>
                        <span className="info-value expired-member">已过期</span>
                      </div>
                    )}
                  </div>

                  <div className="membership-benefits">
                    <h4>会员权益</h4>
                    <div className="benefits-table">
                      <div className="benefit-row header">
                        <div className="benefit-cell">功能</div>
                        <div className="benefit-cell">普通用户</div>
                        <div className="benefit-cell">试用会员</div>
                        <div className="benefit-cell">正式会员</div>
                      </div>
                      <div className="benefit-row">
                        <div className="benefit-cell">招聘信息查看</div>
                        <div className="benefit-cell">每个分类最多20条</div>
                        <div className="benefit-cell">无限制</div>
                        <div className="benefit-cell">无限制</div>
                      </div>
                      <div className="benefit-row">
                        <div className="benefit-cell">会员有效期</div>
                        <div className="benefit-cell">-</div>
                        <div className="benefit-cell">3天</div>
                        <div className="benefit-cell">180天</div>
                      </div>
                      <div className="benefit-row">
                        <div className="benefit-cell">无offer延长至入职</div>
                        <div className="benefit-cell">-</div>
                        <div className="benefit-cell">不支持</div>
                        <div className="benefit-cell">支持</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="activate-section">
                  <div className="activate-flex-container">
                    <div className="activate-input-section">
                      <h4>激活会员</h4>
                      <p>输入激活码即可开通或延长会员期限</p>

                      <div className="activation-form">
                        <input
                          type="text"
                          placeholder="请输入激活码"
                          value={activationCode}
                          onChange={(e) => setActivationCode(e.target.value)}
                          disabled={activating}
                        />
                        <button
                          className="activate-btn"
                          onClick={handleActivateCode}
                          disabled={activating || !activationCode.trim()}
                        >
                          {activating ? '激活中...' : '激活'}
                        </button>
                      </div>
                    </div>

                    <div className="activation-notes">
                      <h4>激活说明</h4>
                      <ul>
                        <li>正式会员可以查看所有招聘详情，有效期180天</li>
                        <li>试用会员有效期为3天，无查看限制</li>
                        <li>每个激活码只能使用一次</li>
                        <li>激活码将会绑定到您的账户</li>
                        <li>正式会员激活后有效期可叠加</li>
                        <li>激活码输入限制：1小时内最多尝试10次</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'settings':
        return (
          <div className="dashboard-content-section">


            <div className="settings-form">
              <h4>个人资料</h4>

              {/* 头像选择器 */}
              <div className="avatar-selector">
                <div className="avatar-selector-title">选择头像</div>
                <div className="avatar-options">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((iconId) => (
                    <div
                      key={iconId}
                      className={`avatar-option ${selectedIcon === iconId ? 'selected' : ''}`}
                      onClick={() => setSelectedIcon(iconId)}
                    >
                      <img src={`/icon/${iconId}.png`} alt={`头像 ${iconId}`} />
                    </div>
                  ))}
                </div>
                <div className="avatar-preview">
                  <div className="avatar-preview-image">
                    <img src={`/icon/${selectedIcon}.png`} alt="当前头像" />
                  </div>
                  <div className="avatar-preview-text">
                    这是您当前选择的头像，保存后将显示在个人中心和导航栏中。
                  </div>
                </div>
              </div>

              {/* 账号和用户名信息 */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '1.5rem',
                gap: '10px',
                height: '42px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  height: '100%'
                }}>
                  <span style={{
                    fontWeight: 500,
                    color: '#3a3a3c',
                    marginRight: '8px',
                    fontSize: '0.95rem',
                    width: '60px',
                    display: 'inline-block',
                    textAlign: 'right',
                    whiteSpace: 'nowrap'
                  }}>账号</span>
                  <span style={{
                    color: '#636366',
                    fontSize: '0.95rem',
                    display: 'flex',
                    alignItems: 'center',
                    height: '100%'
                  }}>{user?.account || ''}</span>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  height: '100%',
                  marginLeft: '10px',
                  marginTop: '0'
                }}>
                  <label htmlFor="username" style={{
                    fontWeight: 500,
                    color: '#3a3a3c',
                    marginRight: '8px',
                    fontSize: '0.95rem',
                    width: '60px',
                    display: 'inline-block',
                    textAlign: 'right',
                    whiteSpace: 'nowrap'
                  }}>用户名</label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    disabled={savingProfile}
                    maxLength={30}
                    style={{
                      height: '42px',
                      width: '200px',
                      padding: '0 0.75rem',
                      border: '1px solid #d1d1d6',
                      borderRadius: '8px',
                      fontSize: '0.95rem',
                      backgroundColor: '#ffffff'
                    }}
                  />
                </div>

                <button
                  className="save-profile-btn"
                  onClick={handleUpdateProfile}
                  disabled={savingProfile || !usernameInput.trim()}
                  style={{
                    height: '42px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 1.5rem',
                    marginLeft: '10px',
                    marginTop: '0'
                  }}
                >
                  {savingProfile ? '保存中...' : '保存'}
                </button>
              </div>

              {/* 密码修改部分 */}
              <div className="password-section">
                <div className="password-title">
                  <h4>修改密码</h4>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', height: '42px' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontWeight: 500, color: '#3a3a3c', marginRight: '10px', fontSize: '0.95rem', width: '70px', textAlign: 'right', whiteSpace: 'nowrap' }}>当前密码</span>
                    <input
                      type="password"
                      id="currentPassword"
                      name="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      disabled={savingProfile}
                      style={{
                        height: '42px',
                        width: '150px',
                        padding: '0 0.75rem',
                        border: '1px solid #d1d1d6',
                        borderRadius: '8px',
                        fontSize: '0.95rem',
                        backgroundColor: '#ffffff'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontWeight: 500, color: '#3a3a3c', marginRight: '10px', fontSize: '0.95rem', width: '70px', textAlign: 'right', whiteSpace: 'nowrap' }}>新密码</span>
                    <input
                      type="password"
                      id="newPassword"
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      disabled={savingProfile}
                      style={{
                        height: '42px',
                        width: '150px',
                        padding: '0 0.75rem',
                        border: '1px solid #d1d1d6',
                        borderRadius: '8px',
                        fontSize: '0.95rem',
                        backgroundColor: '#ffffff'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontWeight: 500, color: '#3a3a3c', marginRight: '10px', fontSize: '0.95rem', width: '70px', textAlign: 'right', whiteSpace: 'nowrap' }}>确认密码</span>
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      disabled={savingProfile}
                      style={{
                        height: '42px',
                        width: '150px',
                        padding: '0 0.75rem',
                        border: '1px solid #d1d1d6',
                        borderRadius: '8px',
                        fontSize: '0.95rem',
                        backgroundColor: '#ffffff'
                      }}
                    />
                  </div>

                  <button
                    className="save-password-btn"
                    onClick={handleUpdatePassword}
                    disabled={savingProfile || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                    style={{
                      height: '42px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 1.5rem',
                      marginLeft: '10px',
                      marginTop: '0'
                    }}
                  >
                    {savingProfile ? '更新中...' : '更新'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // 处理收藏/取消收藏
  const handleToggleFavorite = async (jobId: number, event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (!user || !user.id || !dataServiceRef.current) return;

    // 获取当前收藏状态
    const isFavorite = favorites.some(job => job.id === jobId && job.is_favorite !== false);

    if (isFavorite) {
      // 如果当前是收藏状态，则提示用户确认取消收藏
      showConfirm(
        '确定要取消收藏此招聘信息吗？',
        async () => {
          try {
            // 添加防抖处理，避免重复点击
            const actionKey = `favorite_action_${jobId}`;
            if (sessionStorage.getItem(actionKey)) return;
            sessionStorage.setItem(actionKey, 'true');

            try {
              // 更新本地状态，将is_favorite标记为false，但不从列表中移除
              const updatedFavorites = favorites.map(job =>
                job.id === jobId ? { ...job, is_favorite: false } : job
              );
              setFavorites(updatedFavorites);

              // 调用服务取消收藏
              await dataServiceRef.current?.toggleFavorite(user.id, jobId, false);

              // 更新收藏计数
              setFavorites(prevFavorites =>
                prevFavorites.map(job =>
                  job.id === jobId
                    ? { ...job, favorites_count: Math.max(0, (job.favorites_count || 0) - 1) }
                    : job
                )
              );

              // 显示成功消息
              showAlert({
                title: '操作成功',
                message: '已取消收藏',
                type: 'success',
                autoClose: 2000
              });
            } catch (error) {
              console.error('取消收藏失败:', error);

              // 恢复原状态
              const restoredFavorites = favorites.map(job =>
                job.id === jobId ? { ...job, is_favorite: true } : job
              );
              setFavorites(restoredFavorites);

              showAlert({
                title: '操作失败',
                message: '取消收藏失败，请重试',
                type: 'error'
              });
            } finally {
              setTimeout(() => {
                sessionStorage.removeItem(actionKey);
              }, 1000);
            }
          } catch (error) {
            console.error('取消收藏处理出错:', error);
          }
        }
      );
    } else {
      // 如果当前是未收藏状态，则直接添加收藏
      try {
        // 添加防抖处理
        const actionKey = `favorite_action_${jobId}`;
        if (sessionStorage.getItem(actionKey)) return;
        sessionStorage.setItem(actionKey, 'true');

        try {
          // 更新本地状态
          const updatedFavorites = favorites.map(job =>
            job.id === jobId ? { ...job, is_favorite: true } : job
          );
          setFavorites(updatedFavorites);

          // 调用服务添加收藏
          await dataServiceRef.current.toggleFavorite(user.id, jobId, true);

          // 更新收藏计数
          setFavorites(prevFavorites =>
            prevFavorites.map(job =>
              job.id === jobId
                ? { ...job, favorites_count: (job.favorites_count || 0) + 1 }
                : job
            )
          );

          // 显示成功消息
          showAlert({
            title: '操作成功',
            message: '已添加收藏',
            type: 'success',
            autoClose: 2000
          });
        } catch (error) {
          console.error('添加收藏失败:', error);

          // 恢复原状态
          const restoredFavorites = favorites.map(job =>
            job.id === jobId ? { ...job, is_favorite: false } : job
          );
          setFavorites(restoredFavorites);

          showAlert({
            title: '操作失败',
            message: '添加收藏失败，请重试',
            type: 'error'
          });
        } finally {
          setTimeout(() => {
            sessionStorage.removeItem(actionKey);
          }, 1000);
        }
      } catch (error) {
        console.error('添加收藏处理出错:', error);
      }
    }
  };

  // 注意：原handleCancelFavorite函数已被handleToggleFavorite替代

  // 处理投递申请
  const handleApply = async (jobId: number, applicationLink: string, event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    // 先检查用户是否登录
    if (!user || !user.id || !dataServiceRef.current) {
      showAlert({
        title: '需要登录',
        message: '请先登录后再投递申请',
        type: 'warning'
      });
      return;
    }

    try {
      // 防抖处理
      const actionKey = `apply_action_${jobId}`;
      if (sessionStorage.getItem(actionKey)) return;
      sessionStorage.setItem(actionKey, 'true');

      try {
        // 记录投递行为
        await dataServiceRef.current.addApplication(user.id, jobId);

        // 更新本地状态
        const updatedFavorites = favorites.map(job =>
          job.id === jobId ? { ...job, is_applied: true } : job
        );
        setFavorites(updatedFavorites);

        const updatedApplications = applications.map(job =>
          job.id === jobId ? { ...job, is_applied: true } : job
        );
        setApplications(updatedApplications);

        // 更新投递计数
        setFavorites(prevFavorites =>
          prevFavorites.map(job =>
            job.id === jobId
              ? { ...job, applications_count: (job.applications_count || 0) + 1 }
              : job
          )
        );

        // 设置默认投递状态为"已投递"(状态1)
        setJobStates(prev => ({
          ...prev,
          [jobId]: 1
        }));

        // 更新数据库中的job_state字段
        try {
          const { data: userActionData, error: fetchError } = await supabase
            .from('user_actions')
            .select('job_state')
            .eq('user_id', user.id)
            .single();

          if (fetchError && fetchError.code !== 'PGRST116') {
            throw fetchError;
          }

          let currentJobState = userActionData?.job_state || [];

          // 检查当前job是否已有状态
          const existingIndex = currentJobState.findIndex(item => item && item[0] === jobId);

          if (existingIndex === -1) {
            // 添加新状态
            currentJobState.push([jobId, 1]); // 状态1: 已投递

            // 更新数据库
            await supabase
              .from('user_actions')
              .update({
                job_state: currentJobState,
                updated_at: new Date().toISOString()
              })
              .eq('user_id', user.id);
          }
        } catch (stateErr) {
          console.error('更新投递状态出错:', stateErr);
          // 不影响主流程，继续执行
        }

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
            type: 'success',
            autoClose: 2000
          });
        }
      } catch (err) {
        console.error('记录投递行为错误:', err);
        showAlert({
          title: '投递失败',
          message: '申请提交失败，请稍后重试',
          type: 'error'
        });
      } finally {
        // 1秒后清除操作标记
        setTimeout(() => {
          sessionStorage.removeItem(actionKey);
        }, 1000);
      }
    } catch (error) {
      console.error('投递处理出错:', error);
    }
  };

  if (!user) {
    return <div className="loading-container">正在检查登录状态...</div>;
  }

  return (
    <div className="user-dashboard full-width">
      <div className="dashboard-content">
        {renderContent()}
      </div>
    </div>
  );
};

export default UserDashboard;