import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { showError } from '../components/AlertDialog';
import './Login.css';

const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { loginAdmin, loading, error, clearError, admin } = useAuth();
  const navigate = useNavigate();

  // 如果已登录，重定向到管理员面板
  useEffect(() => {
    if (admin) {
      navigate('/admin/dashboard');
    }
  }, [admin, navigate]);

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    // 简单的表单验证
    if (!username.trim() || !password.trim()) {
      showError('请输入管理员账号和密码');
      return;
    }

    try {
      await loginAdmin(username, password);
      // 登录成功后会通过useEffect自动重定向
    } catch (err: any) {
      // 使用系统提示框显示错误
      showError(err.message || '登录失败，请重试');
    }
  };

  return (
    <div className="login-page">
      <div className="login-form-container" style={{
        borderRadius: '16px',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08)',
        padding: '30px 25px',
        maxWidth: '450px'
      }}>
        <h2 style={{
          fontSize: '24px',
          fontWeight: '600',
          color: '#1c1c1e',
          textAlign: 'center',
          marginBottom: '8px'
        }}>管理员登录</h2>
        <p style={{
          fontSize: '15px',
          color: '#8e8e93',
          textAlign: 'center',
          marginBottom: '20px'
        }}>请输入您的管理员账号和密码</p>

        {/* 错误提示已改为使用系统提示框 */}

        <form onSubmit={handleSubmit} className="login-form">
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            width: '85%',
            margin: '0 auto 15px auto'
          }}>
            <label htmlFor="username" style={{
              width: '90px',
              textAlign: 'right',
              marginRight: '12px',
              flexShrink: 0,
              fontSize: '15px',
              color: '#3a3a3c'
            }}>管理员账号</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
              style={{
                flex: 1,
                padding: '10px 15px',
                fontSize: '16px',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                borderRadius: '12px',
                backgroundColor: 'rgba(142, 142, 147, 0.06)',
                outline: 'none',
                transition: 'all 0.3s ease'
              }}
              placeholder="请输入管理员账号"
            />
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            width: '85%',
            margin: '0 auto 15px auto'
          }}>
            <label htmlFor="password" style={{
              width: '90px',
              textAlign: 'right',
              marginRight: '12px',
              flexShrink: 0,
              fontSize: '15px',
              color: '#3a3a3c'
            }}>密 码</label>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '10px 15px',
                  fontSize: '16px',
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(142, 142, 147, 0.06)',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  paddingRight: '60px'
                }}
                placeholder="请输入密码"
              />
              <button
                type="button"
                onClick={toggleShowPassword}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#007aff',
                  fontSize: '14px',
                  cursor: 'pointer',
                  padding: '5px'
                }}
              >
                {showPassword ? "隐藏" : "显示"}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '15px', width: '100%' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '85%',
                margin: '0 auto',
                backgroundColor: '#007aff',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '12px 0',
                fontSize: '16px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 2px 10px rgba(0, 122, 255, 0.3)'
              }}
            >
              {loading ? '正在登录...' : '登录管理控制台'}
            </button>
          </div>
        </form>

        <div style={{ width: '85%', margin: '25px auto 0', textAlign: 'center' }}>
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'none',
              border: 'none',
              color: '#8e8e93',
              fontSize: '14px',
              padding: '8px 15px',
              cursor: 'pointer',
              borderRadius: '8px',
              transition: 'all 0.2s ease'
            }}
          >
            返回首页
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;