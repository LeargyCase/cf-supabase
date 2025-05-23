import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AdminDashboard.css';
import JobManagement from '../components/JobManagement';
import JobForm from '../components/JobForm';
import JobTable from '../components/JobTable';
import UserManagement from '../components/UserManagement';
import ActivationCodeManagement from '../components/ActivationCodeManagement';
import CategoryManagement from '../components/CategoryManagement';
import TagManagement from '../components/TagManagement';
import StatisticsReport from '../components/StatisticsReport';

// 定义管理菜单项
const menuItems = [
  { id: 'job-management', title: '招聘信息管理' },
  { id: 'user-management', title: '用户管理' },
  { id: 'activation-code', title: '激活码管理' },
  { id: 'category-management', title: '分类管理' },
  { id: 'tag-management', title: '标签管理' },
  { id: 'statistics', title: '统计报表' },
];

const AdminDashboard = () => {
  const { admin, supabase } = useAuth();
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState('job-management');
  const [jobView, setJobView] = useState<'management' | 'form' | 'table'>('management');
  const [userView, setUserView] = useState<'management'>('management');
  const [codeView, setCodeView] = useState<'management'>('management');
  const [categoryView, setCategoryView] = useState<'management'>('management');
  const [tagView, setTagView] = useState<'management'>('management');
  const [statisticsView, setStatisticsView] = useState<'report'>('report');
  const [statistics, setStatistics] = useState({
    totalJobs: 0,
    activeJobs: 0,
    totalUsers: 0,
    activeUsers: 0,
    totalActivationCodes: 0,
    usedActivationCodes: 0,
  });
  const [loading, setLoading] = useState(true);

  // 检查是否已登录为管理员
  useEffect(() => {
    if (!admin) {
      navigate('/login/admin');
    } else {
      loadStatistics();
    }
  }, [admin, navigate]);

  // 加载统计数据
  const loadStatistics = async () => {
    setLoading(true);
    try {
      // 获取招聘信息统计
      const { data: jobsData, error: jobsError } = await supabase
        .from('job_recruitments')
        .select('id, is_active', { count: 'exact' });

      if (jobsError) throw jobsError;

      const activeJobs = jobsData?.filter(job => job.is_active).length || 0;

      // 获取用户统计
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, is_active', { count: 'exact' });

      if (usersError) throw usersError;

      const activeUsers = usersData?.filter(user => user.is_active).length || 0;

      // 获取激活码统计
      const { data: codesData, error: codesError } = await supabase
        .from('activation_codes')
        .select('id, is_used', { count: 'exact' });

      if (codesError) throw codesError;

      const usedCodes = codesData?.filter(code => code.is_used).length || 0;

      setStatistics({
        totalJobs: jobsData?.length || 0,
        activeJobs,
        totalUsers: usersData?.length || 0,
        activeUsers,
        totalActivationCodes: codesData?.length || 0,
        usedActivationCodes: usedCodes,
      });
    } catch (error) {
      console.error('加载统计数据出错:', error);
    } finally {
      setLoading(false);
    }
  };

  // 根据选中的菜单项渲染不同的内容
  const renderContent = () => {
    // 这里根据activeMenu渲染不同的管理内容
    switch (activeMenu) {
      case 'job-management':
        return <JobManagement />;

      case 'user-management':
        return <UserManagement />;

      case 'activation-code':
        return <ActivationCodeManagement />;

      case 'category-management':
        return <CategoryManagement />;

      case 'tag-management':
        return <TagManagement />;

      case 'statistics':
        return <StatisticsReport />;

      default:
        return (
          <div className="dashboard-content-section">
            <h3>欢迎使用管理控制台</h3>
            <p>请从左侧菜单选择要管理的内容。</p>
          </div>
        );
    }
  };

  if (!admin) {
    return <div className="loading-container">正在检查登录状态...</div>;
  }

  return (
    <div className="admin-dashboard">
      <header className="dashboard-header">
        <h1>招聘信息管理系统</h1>
        <div className="admin-info">
          <span>管理员: {admin?.admin_username}</span>
          <button
            className="logout-button"
            onClick={() => {
              supabase.auth.signOut();
              navigate('/login/admin');
            }}
          >
            退出登录
          </button>
        </div>
      </header>

      <div className="dashboard-container">
        <aside className="dashboard-sidebar">
          <nav className="dashboard-menu">
            <ul>
              {menuItems.map(item => (
                <li
                  key={item.id}
                  className={activeMenu === item.id ? 'active' : ''}
                  onClick={() => {
                    setActiveMenu(item.id);
                  }}
                >
                  {item.title}
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <main className="dashboard-content">

          {loading ? (
            <div className="loading-container">
              <p>加载数据中...</p>
            </div>
          ) : (
            renderContent()
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;