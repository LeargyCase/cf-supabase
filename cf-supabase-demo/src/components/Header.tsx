import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { showAlert, closeAlert } from './AlertDialog';
import './Header.css';
import './NavButton.css';
import './MembershipBadge.css';

const Header = () => {
  const { user, admin, logout, supabase } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [locations, setLocations] = useState<string[]>([]);
  const [hideApplied, setHideApplied] = useState(false);
  const [animateLocationBtn, setAnimateLocationBtn] = useState(false);
  const [animateHideBtn, setAnimateHideBtn] = useState(false);
  const [userMembershipInfo, setUserMembershipInfo] = useState<any>(null);
  const [membershipType, setMembershipType] = useState<string>('common_user');
  const [membershipRemaining, setMembershipRemaining] = useState<number>(0);
  const navigate = useNavigate();
  const location = useLocation();

  // 从localStorage加载设置
  useEffect(() => {
    const savedLocations = localStorage.getItem('filterLocations');
    if (savedLocations) {
      try {
        setLocations(JSON.parse(savedLocations));
      } catch (e) {
        console.error('解析地点数据失败', e);
        setLocations([]);
      }
    }

    const savedHideApplied = localStorage.getItem('hideAppliedJobs');
    if (savedHideApplied) {
      setHideApplied(savedHideApplied === 'true');
    }
  }, []);

  // 加载用户会员信息
  useEffect(() => {
    const loadUserMembershipInfo = async () => {
      if (!user || !supabase) return;

      try {
        // 查询用户会员信息
        const { data, error } = await supabase
          .from('user_info')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('获取用户会员信息错误:', error);
          return;
        }

        setUserMembershipInfo(data);

        // 如果有会员信息，计算剩余天数
        if (data && data.membership_end_date) {
          const today = new Date();
          const endDate = new Date(data.membership_end_date);

          // 计算剩余天数
          const remainingDays = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          // 更新会员类型和剩余天数
          setMembershipType(data.membership_type);
          setMembershipRemaining(Math.max(0, remainingDays));
        } else {
          setMembershipType('common_user');
          setMembershipRemaining(0);
        }
      } catch (err) {
        console.error('加载用户会员信息出错:', err);
      }
    };

    loadUserMembershipInfo();
  }, [user, supabase]);

  // 监听用户资料更新事件，实时更新头像和用户名
  useEffect(() => {
    const handleProfileUpdate = (event: CustomEvent) => {
      if (user && event.detail) {
        // 创建一个新的用户对象，以触发重新渲染
        const updatedUser = {
          ...user,
          username: event.detail.username || user.username,
          icon: event.detail.icon || user.icon
        };

        // 更新全局用户信息
        Object.assign(user, updatedUser);

        // 强制组件重新渲染
        setLocations([...locations]);
      }
    };

    // 添加事件监听器
    window.addEventListener('userProfileUpdated', handleProfileUpdate as EventListener);

    // 清理函数
    return () => {
      window.removeEventListener('userProfileUpdated', handleProfileUpdate as EventListener);
    };
  }, [user, locations]);

  // 检查当前路径是否匹配指定的菜单
  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }

    // 对于用户中心的子菜单，检查URL参数
    if (path.includes('?menu=')) {
      const menuParam = path.split('?menu=')[1];
      return location.pathname === '/user/dashboard' && location.search === `?menu=${menuParam}`;
    }

    return location.pathname === path;
  };

  const handleLogout = async () => {
    // 使用系统提示框确认是否退出登录
    showAlert({
      title: '退出登录',
      message: '确定要退出登录吗？',
      type: 'warning',
      buttons: [
        {
          text: '取消',
          onClick: () => {
            closeAlert();
          }
        },
        {
          text: '确定',
          primary: true,
          onClick: async () => {
            closeAlert();
            await logout();
            navigate('/');
          }
        }
      ]
    });
  };

  const handleLoginClick = () => {
    setShowLoginModal(true);
  };

  // 添加全局事件监听，允许其他组件触发登录模态框
  useEffect(() => {
    const handleShowLoginModal = () => {
      setShowLoginModal(true);
    };

    // 添加事件监听器
    window.addEventListener('showLoginModal', handleShowLoginModal);

    // 清理函数
    return () => {
      window.removeEventListener('showLoginModal', handleShowLoginModal);
    };
  }, []);

  const closeLoginModal = () => {
    setShowLoginModal(false);
  };

  const navigateToLogin = (path: string) => {
    setShowLoginModal(false);
    navigate(path);
  };

  // 获取会员状态标签
  const getMembershipBadge = () => {
    // 如果会员类型是正式会员或试用会员，且剩余天数大于0，显示对应标签
    if (membershipType === 'official_user' && membershipRemaining > 0) {
      return (
        <Link
          to="/user/dashboard?menu=membership"
          className="membership-badge official-member"
        >
          正式会员
        </Link>
      );
    } else if (membershipType === 'temp_user' && membershipRemaining > 0) {
      return (
        <Link
          to="/user/dashboard?menu=membership"
          className="membership-badge temp-member"
        >
          试用会员
        </Link>
      );
    } else if ((membershipType === 'official_user' || membershipType === 'temp_user') && membershipRemaining <= 0) {
      return (
        <Link
          to="/user/dashboard?menu=membership"
          className="membership-badge expired-member"
        >
          已过期
        </Link>
      );
    } else {
      return (
        <Link
          to="/user/dashboard?menu=membership"
          className="membership-badge common-member"
        >
          普通用户
        </Link>
      );
    }
  };

  // 处理设置地点
  const handleSetLocations = () => {
    // 获取当前地点列表作为默认值
    const currentLocations = locations.join(' ');

    showAlert({
      title: '设置地点筛选',
      message: `可以输入多个省份以及地级市名字，使用空格隔开，如："广东 浙江 杭州 上海"${locations.length > 0 ? `\n\n当前已选地点：${locations.join(' ')}` : ''}`,
      type: 'info',
      buttons: [
        {
          text: '取消',
          onClick: () => {
            // 调用closeAlert函数关闭对话框
            closeAlert();
          }
        },
        {
          text: '清除筛选',
          onClick: () => {
            setLocations([]);
            localStorage.removeItem('filterLocations');

            // 触发自定义事件，通知其他组件
            window.dispatchEvent(new CustomEvent('filterLocationsChanged', {
              detail: { locations: [] }
            }));

            // 添加动画效果
            setAnimateLocationBtn(true);
            setTimeout(() => setAnimateLocationBtn(false), 500);

            // 关闭对话框
            closeAlert();
          }
        },
        {
          text: '确定',
          primary: true,
          onClick: (e, inputValue) => {
            if (!inputValue || inputValue.trim() === '') {
              // 如果输入为空，仍然关闭对话框
              closeAlert();
              return;
            }

            // 解析输入的地点
            const newLocations = inputValue.trim().split(/\s+/).filter(Boolean);

            // 保存到状态和localStorage
            setLocations(newLocations);
            localStorage.setItem('filterLocations', JSON.stringify(newLocations));

            // 触发自定义事件，通知其他组件
            window.dispatchEvent(new CustomEvent('filterLocationsChanged', {
              detail: { locations: newLocations }
            }));

            // 添加动画效果
            setAnimateLocationBtn(true);
            setTimeout(() => setAnimateLocationBtn(false), 500);

            // 关闭对话框
            closeAlert();
          }
        }
      ],
      inputField: {
        placeholder: '输入地点，空格分隔',
        defaultValue: currentLocations
      }
    });
  };

  // 处理不看已投递
  const handleToggleHideApplied = () => {
    const newValue = !hideApplied;
    setHideApplied(newValue);
    localStorage.setItem('hideAppliedJobs', String(newValue));

    // 触发自定义事件，通知其他组件
    window.dispatchEvent(new CustomEvent('hideAppliedChanged', {
      detail: { hideApplied: newValue }
    }));

    // 添加动画效果
    setAnimateHideBtn(true);
    setTimeout(() => setAnimateHideBtn(false), 500);
  };

  return (
    <header className="app-header">
      <div className="header-container">
        <h1 className="site-title">
          <Link to="/">校园招聘信息平台</Link>
        </h1>

        <nav className="main-nav">
          <ul className="nav-links">
            <li>
              <Link to="/" className={isActive('/') ? "highlight-link active" : "highlight-link"}>首页</Link>
            </li>
            {user && (
              <>
                <li>
                  <Link
                    to="/user/dashboard?menu=my-favorites"
                    className={isActive("?menu=my-favorites") ? "nav-link active" : "nav-link"}
                  >
                    我的收藏
                  </Link>
                </li>
                <li>
                  <Link
                    to="/user/dashboard?menu=my-applications"
                    className={isActive("?menu=my-applications") ? "nav-link active" : "nav-link"}
                  >
                    我的投递
                  </Link>
                </li>
                <li>
                  <Link
                    to="/user/dashboard?menu=membership"
                    className={isActive("?menu=membership") ? "nav-link active" : "nav-link"}
                  >
                    会员信息
                  </Link>
                </li>
                <li>
                  <Link
                    to="/user/dashboard?menu=settings"
                    className={isActive("?menu=settings") ? "nav-link active" : "nav-link"}
                  >
                    账户设置
                  </Link>
                </li>
                <li>
                  <button
                    className={`nav-button hide-applied-button ${hideApplied ? 'active' : ''} ${animateHideBtn ? 'animate' : ''}`}
                    onClick={handleToggleHideApplied}
                  >
                    不看已投递
                  </button>
                </li>
                <li>
                  <button
                    className={`nav-button location-button ${locations.length > 0 ? 'has-locations' : ''} ${animateLocationBtn ? 'animate' : ''}`}
                    onClick={handleSetLocations}
                  >
                    {locations.length > 0
                      ? `地点：${locations.slice(0, 2).join(' ')}${locations.length > 2 ? '等' : ''}`
                      : '设置地点'
                    }
                  </button>
                </li>
              </>
            )}
          </ul>
        </nav>

        <div className="header-right">
          {!user && !admin ? (
            <div className="login-container">
              <button onClick={handleLoginClick} className="login-button">
                登录
              </button>
            </div>
          ) : (
            <div className="user-info">
              {user && (
                <>
                  <div className="user-avatar">
                    <img src={`/icon/${user.icon || 1}.png`} alt="用户头像" />
                  </div>
                  <span className="welcome-text">欢迎，{user.username}</span>
                  {getMembershipBadge()}
                </>
              )}

              {admin && (
                <>
                  <span className="welcome-text">管理员：{admin.admin_username}</span>
                  <Link to="/admin/dashboard" className="dashboard-link">管理控制台</Link>
                </>
              )}

              <button onClick={handleLogout} className="logout-button">
                退出登录
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 登录模态框 */}
      {showLoginModal && (
        <div className="login-modal-overlay" onClick={closeLoginModal}>
          <div className="login-modal" onClick={e => e.stopPropagation()}>
            <h3>选择登录方式</h3>
            <div className="login-modal-options">
              <button
                className="login-modal-option user-login"
                onClick={() => navigateToLogin('/login/user')}
              >
                用户登录
              </button>
              <button
                className="login-modal-option admin-login"
                onClick={() => navigateToLogin('/login/admin')}
              >
                管理员登录
              </button>
              <button
                className="login-modal-option user-register"
                onClick={() => navigateToLogin('/register')}
              >
                用户注册
              </button>
            </div>
            <button className="login-modal-close" onClick={closeLoginModal}>
              关闭
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;