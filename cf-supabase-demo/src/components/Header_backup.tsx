import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Header.css';

const Header = () => {
  const { user, admin, logout } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

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
    await logout();
    navigate('/');
  };

  const handleLoginClick = () => {
    setShowLoginModal(true);
  };

  const closeLoginModal = () => {
    setShowLoginModal(false);
  };

  const navigateToLogin = (path: string) => {
    setShowLoginModal(false);
    navigate(path);
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
                  <span className="welcome-text">欢迎，{user.username}</span>
                  <Link to="/user/dashboard" className="dashboard-link">个人中心</Link>
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