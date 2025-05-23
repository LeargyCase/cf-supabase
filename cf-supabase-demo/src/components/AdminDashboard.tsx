import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AdminDashboard.css';
import JobManagement from './JobManagement';

const AdminDashboard: React.FC = () => {
  const { user, signOut, supabase } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [userCount, setUserCount] = useState<number>(0);
  const [jobCount, setJobCount] = useState<number>(0);
  const [categoryCount, setCategoryCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/admin/login');
      return;
    }

    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch user count
        const { count: userCountResult, error: userCountError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        if (userCountError) throw userCountError;
        
        // Fetch job count
        const { count: jobCountResult, error: jobCountError } = await supabase
          .from('job_recruitments')
          .select('*', { count: 'exact', head: true });

        if (jobCountError) throw jobCountError;
        
        // Fetch category count
        const { count: categoryCountResult, error: categoryCountError } = await supabase
          .from('job_categories')
          .select('*', { count: 'exact', head: true });

        if (categoryCountError) throw categoryCountError;

        setUserCount(userCountResult || 0);
        setJobCount(jobCountResult || 0);
        setCategoryCount(categoryCountResult || 0);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('加载数据时出错，请稍后再试。');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, navigate]);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/admin/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="dashboard-overview">
            <h2>仪表盘概览</h2>
            {loading ? (
              <div className="loading-indicator">加载中...</div>
            ) : error ? (
              <div className="error-message">{error}</div>
            ) : (
              <>
                <div className="dashboard-actions">
                  <button 
                    className="dashboard-action-button"
                    onClick={() => setActiveTab('jobs')}
                  >
                    转到招聘信息管理 →
                  </button>
                </div>
                <div className="stats-container">
                  <div className="stat-card">
                    <div className="stat-icon">👤</div>
                    <div className="stat-value">{userCount}</div>
                    <div className="stat-label">用户总数</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">📋</div>
                    <div className="stat-value">{jobCount}</div>
                    <div className="stat-label">招聘信息</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">🏷️</div>
                    <div className="stat-value">{categoryCount}</div>
                    <div className="stat-label">招聘分类</div>
                  </div>
                </div>
              </>
            )}
          </div>
        );
      case 'jobs':
        return <JobManagement />;
      case 'users':
        return (
          <div className="users-management">
            <h2>用户管理</h2>
            <p>用户管理功能开发中...</p>
          </div>
        );
      case 'settings':
        return (
          <div className="admin-settings">
            <h2>管理员设置</h2>
            <p>管理员设置功能开发中...</p>
          </div>
        );
      default:
        return <div>未知选项卡</div>;
    }
  };

  if (!user) {
    return null; // 等待重定向到登录页面
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-sidebar">
        <div className="admin-logo">管理控制台</div>
        <nav className="admin-nav">
          <button
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            仪表盘
          </button>
          <button
            className={`nav-item ${activeTab === 'jobs' ? 'active' : ''}`}
            onClick={() => setActiveTab('jobs')}
          >
            招聘信息管理
          </button>
          <button
            className={`nav-item ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            用户管理
          </button>
          <button
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            系统设置
          </button>
        </nav>
        <div className="admin-user-info">
          <div className="user-email">{user.email}</div>
          <button className="sign-out-button" onClick={handleSignOut}>
            退出登录
          </button>
        </div>
      </div>
      <div className="admin-content">
        <div className="admin-header">
          <h1 className="admin-title">管理控制台</h1>
          <div className="admin-actions">
            <span className="welcome-message">
              欢迎，{user.email}
            </span>
          </div>
        </div>
        <div className="admin-main">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard; 