import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { showAlert } from '../components/AlertDialog';
import './Login.css';

const UserRegister = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const { registerUser, loginUser, loading, error: authError, user } = useAuth();

  // 合并本地错误和认证错误
  const error = localError || authError;
  const navigate = useNavigate();

  // 注册页面不需要自动重定向，因为我们会在注册成功后手动处理重定向
  useEffect(() => {
    // 如果用户已登录并且是从其他页面进入注册页面，则重定向到首页
    if (user && document.referrer && !document.referrer.includes('/register')) {
      navigate('/');
    }
  }, [user, navigate]);

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const validateEmail = (email: string) => {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    // 表单验证
    if (!username.trim()) {
      setLocalError('请输入用户名');
      return;
    }

    if (!email.trim()) {
      setLocalError('请输入邮箱');
      return;
    }

    if (!validateEmail(email)) {
      setLocalError('请输入有效的邮箱地址');
      return;
    }

    if (!password.trim()) {
      setLocalError('请输入密码');
      return;
    }

    if (password.length < 6) {
      setLocalError('密码长度至少为6位');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('两次输入的密码不一致');
      return;
    }

    try {
      // 使用AuthContext中的registerUser方法
      await registerUser(username, email, password);

      // 注册成功，显示提示信息，重要内容加粗标红，并且分行显示
      showAlert({
        title: '注册成功',
        message: '您已自动获得<strong style="color: #ff3b30; font-weight: 700;">3天试用会员</strong>资格。<br><br>请牢记您的<strong style="color: #ff3b30; font-weight: 700;">邮箱和密码</strong>，<strong style="color: #ff3b30; font-weight: 700;">密码一旦忘记将无法找回</strong>。',
        type: 'success'
      });

      // 注册成功后直接登录
      await loginUser(email, password);

      // 登录成功后直接跳转到首页
      navigate('/');
    } catch (err: any) {
      console.error('注册错误:', err);
      setLocalError(err.message || '注册失败，请稍后重试');
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
        }}>用户注册</h2>
        <p style={{
          fontSize: '15px',
          color: '#8e8e93',
          textAlign: 'center',
          marginBottom: '20px'
        }}>请填写以下信息完成注册</p>
        <div style={{
          width: '85%',
          margin: '0 auto 20px auto',
          display: 'flex',
          alignItems: 'center',
          backgroundColor: 'rgba(255, 204, 0, 0.1)',
          color: '#ff9500',
          padding: '12px 15px',
          borderRadius: '12px',
          fontSize: '14px'
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: '18px', height: '18px', marginRight: '10px', flexShrink: 0 }}>
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>请牢记密码，忘记将无法找回</span>
        </div>

        {error && (
          <div style={{
            width: '85%',
            margin: '0 auto 20px auto',
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'rgba(255, 59, 48, 0.1)',
            color: '#ff3b30',
            padding: '12px 15px',
            borderRadius: '12px',
            fontSize: '14px'
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: '18px', height: '18px', marginRight: '10px', flexShrink: 0 }}>
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            width: '85%',
            margin: '0 auto 15px auto'
          }}>
            <label htmlFor="username" style={{
              width: '60px',
              textAlign: 'right',
              marginRight: '12px',
              flexShrink: 0,
              fontSize: '15px',
              color: '#3a3a3c'
            }}>用户名</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
              placeholder="请输入您的用户名"
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
            />
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            width: '85%',
            margin: '0 auto 15px auto'
          }}>
            <label htmlFor="email" style={{
              width: '60px',
              textAlign: 'right',
              marginRight: '12px',
              flexShrink: 0,
              fontSize: '15px',
              color: '#3a3a3c'
            }}>邮 箱</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              placeholder="请输入您的邮箱"
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
              width: '60px',
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
                placeholder="请输入密码（至少6位）"
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

          <div style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            width: '85%',
            margin: '0 auto 15px auto'
          }}>
            <label htmlFor="confirmPassword" style={{
              width: '60px',
              textAlign: 'right',
              marginRight: '12px',
              flexShrink: 0,
              fontSize: '15px',
              color: '#3a3a3c'
            }}>确认密码</label>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                type={showPassword ? "text" : "password"}
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                placeholder="请再次输入密码"
                style={{
                  width: '100%',
                  padding: '10px 15px',
                  fontSize: '16px',
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(142, 142, 147, 0.06)',
                  outline: 'none',
                  transition: 'all 0.3s ease'
                }}
              />
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
              {loading ? '正在注册...' : '注册'}
            </button>
          </div>
        </form>

        <div style={{ width: '85%', margin: '25px auto 0', textAlign: 'center' }}>
          <p style={{
            fontSize: '14px',
            color: '#8e8e93',
            marginBottom: '15px'
          }}>
            已有账号？ <Link
              to="/login/user"
              style={{
                color: '#007aff',
                textDecoration: 'none',
                fontWeight: '500'
              }}
            >立即登录</Link>
          </p>
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

export default UserRegister;
