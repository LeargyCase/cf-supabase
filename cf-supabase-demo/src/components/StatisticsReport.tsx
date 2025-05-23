import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './StatisticsReport.css';

interface StatData {
  id: number;
  stat_date: string;
  total_users: number;
  active_users: number;
  total_jobs: number;
  active_jobs: number;
  total_applications: number;
  total_favorites: number;
  created_at: string;
}

interface StatisticsReportProps {
  onReturnToOverview: () => void;
}

const StatisticsReport: React.FC<StatisticsReportProps> = ({ onReturnToOverview }) => {
  const { supabase } = useAuth();
  const [statistics, setStatistics] = useState<StatData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [currentStats, setCurrentStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalJobs: 0,
    activeJobs: 0,
    totalApplications: 0,
    totalFavorites: 0,
    popularCategories: [] as {id: number, category: string, count: number}[],
    userGrowth: 0,
    jobGrowth: 0
  });

  // 加载统计数据
  const loadStatistics = async () => {
    setLoading(true);
    try {
      // 获取今天的日期
      const today = new Date();

      // 根据选择的周期计算起始日期
      let startDate = new Date();
      if (period === 'week') {
        startDate.setDate(today.getDate() - 7);
      } else if (period === 'month') {
        startDate.setMonth(today.getMonth() - 1);
      } else if (period === 'year') {
        startDate.setFullYear(today.getFullYear() - 1);
      }

      // 格式化日期为 ISO 字符串
      const startDateStr = startDate.toISOString().split('T')[0];

      // 从数据库获取统计数据
      const { data, error } = await supabase
        .from('statistics')
        .select('*')
        .gte('stat_date', startDateStr)
        .order('stat_date', { ascending: false });

      if (error) {
        console.error('获取历史统计数据错误:', error);
        // 如果是因为表不存在，我们可以创建它
        if (error.code === '42P01') { // 表不存在的错误代码
          console.log('统计表可能不存在，将创建当前统计数据');
          setStatistics([]);
        } else {
          throw error;
        }
      } else {
        setStatistics(data || []);
      }

      // 获取当前统计数据
      await loadCurrentStats();

    } catch (error: any) {
      console.error('加载统计数据错误:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // 加载当前统计数据
  const loadCurrentStats = async () => {
    try {
      // 直接从各个表获取统计数据
      // 获取用户统计
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, is_active', { count: 'exact' });

      if (userError) {
        console.error('获取用户数据错误:', userError);
        throw userError;
      }

      const activeUsers = userData?.filter(user => user.is_active).length || 0;

      // 获取招聘信息统计
      const { data: jobData, error: jobError } = await supabase
        .from('job_recruitments')
        .select('id, is_active', { count: 'exact' });

      if (jobError) {
        console.error('获取招聘数据错误:', jobError);
        throw jobError;
      }

      const activeJobs = jobData?.filter(job => job.is_active).length || 0;

      // 获取用户行为数据
      const { data: actionData, error: actionError } = await supabase
        .from('user_actions')
        .select('favorite_job_ids, application_job_ids');

      if (actionError) {
        console.error('获取用户行为数据错误:', actionError);
        throw actionError;
      }

      // 计算收藏和投递总数
      let favoriteCount = 0;
      let applicationCount = 0;

      if (actionData && actionData.length > 0) {
        actionData.forEach(action => {
          if (action.favorite_job_ids) {
            favoriteCount += action.favorite_job_ids.length;
          }
          if (action.application_job_ids) {
            applicationCount += action.application_job_ids.length;
          }
        });
      }

      // 创建统计数据对象
      const stats = {
        user_count: userData?.length || 0,
        active_user_count: activeUsers,
        job_count: jobData?.length || 0,
        active_job_count: activeJobs,
        application_count: applicationCount,
        favorite_count: favoriteCount
      };

      // 获取热门分类
      const { data: categoriesData, error: catError } = await supabase
          .from('job_categories')
          .select('id, category, active_job_count')
          .order('active_job_count', { ascending: false })
          .limit(5);

        if (catError) throw catError;

        // 计算用户和职位增长率
        let userGrowth = 0;
        let jobGrowth = 0;

        if (statistics.length > 0) {
          const oldestStat = statistics[statistics.length - 1];
          const totalUsersBefore = oldestStat.total_users;
          const totalJobsBefore = oldestStat.total_jobs;

          if (totalUsersBefore > 0) {
            userGrowth = ((stats.user_count || 0) - totalUsersBefore) / totalUsersBefore * 100;
          }

          if (totalJobsBefore > 0) {
            jobGrowth = ((stats.job_count || 0) - totalJobsBefore) / totalJobsBefore * 100;
          }
        }

        // 更新当前统计数据
        setCurrentStats({
          totalUsers: stats.user_count || 0,
          activeUsers: stats.active_user_count || 0,
          totalJobs: stats.job_count || 0,
          activeJobs: stats.active_job_count || 0,
          totalApplications: stats.application_count || 0,
          totalFavorites: stats.favorite_count || 0,
          popularCategories: categoriesData || [],
          userGrowth,
          jobGrowth
        });

      // 检查今天的统计数据是否已存在，如果不存在则添加
      const today = new Date().toISOString().split('T')[0];

      // 先查询今天的数据是否已存在
      const { data: todayData, error: todayError } = await supabase
        .from('statistics')
        .select('id')
        .eq('stat_date', today);

      if (todayError) {
        console.error('查询今日统计数据错误:', todayError);
      } else if (!todayData || todayData.length === 0) {
        // 今天没有数据，添加新记录
        const { error: insertError } = await supabase.from('statistics').insert([
          {
            stat_date: today,
            total_users: stats.user_count || 0,
            active_users: stats.active_user_count || 0,
            total_jobs: stats.job_count || 0,
            active_jobs: stats.active_job_count || 0,
            total_applications: stats.application_count || 0,
            total_favorites: stats.favorite_count || 0
          }
        ]);

        if (insertError) {
          console.error('插入今日统计数据错误:', insertError);
        } else {
          console.log('成功添加今日统计数据');
        }
      } else {
        console.log('今日统计数据已存在，跳过添加');
      }

    } catch (error: any) {
      console.error('加载当前统计数据错误:', error);
    }
  };

  // 初始加载
  useEffect(() => {
    loadStatistics();
  }, [period]);

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN');
  };

  // 处理数据导出
  const handleExportData = () => {
    if (statistics.length === 0) {
      alert('没有可导出的数据');
      return;
    }

    // 准备CSV内容
    const headers = ['日期', '总用户数', '活跃用户数', '总招聘数', '有效招聘数', '总申请数', '总收藏数'];
    const csvContent = [
      headers.join(','),
      ...statistics.map(stat => [
        formatDate(stat.stat_date),
        stat.total_users,
        stat.active_users,
        stat.total_jobs,
        stat.active_jobs,
        stat.total_applications,
        stat.total_favorites
      ].join(','))
    ].join('\n');

    // 创建并下载CSV文件
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `统计数据_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="statistics-report-container">
      <button
        className="back-button"
        onClick={onReturnToOverview}
      >
        ← 返回统计报表
      </button>

      <h2>统计报表</h2>

      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => setError(null)}>关闭</button>
        </div>
      )}

      <div className="statistics-controls">
        <div className="period-selector">
          <label>选择时间段:</label>
          <div className="period-buttons">
            <button
              className={period === 'week' ? 'active' : ''}
              onClick={() => setPeriod('week')}
            >
              最近一周
            </button>
            <button
              className={period === 'month' ? 'active' : ''}
              onClick={() => setPeriod('month')}
            >
              最近一个月
            </button>
            <button
              className={period === 'year' ? 'active' : ''}
              onClick={() => setPeriod('year')}
            >
              最近一年
            </button>
          </div>
        </div>

        <button
          className="export-button"
          onClick={handleExportData}
          disabled={loading || statistics.length === 0}
        >
          导出数据
        </button>
      </div>

      <div className="current-statistics">
        <h3>系统概览</h3>
        <div className="stat-cards">
          <div className="stat-card">
            <h4>用户</h4>
            <div className="stat-value">{currentStats.totalUsers}</div>
            <div className="stat-detail">活跃: {currentStats.activeUsers}</div>
            <div className="stat-trend">
              {currentStats.userGrowth > 0
                ? `↑ ${currentStats.userGrowth.toFixed(1)}%`
                : currentStats.userGrowth < 0
                  ? `↓ ${Math.abs(currentStats.userGrowth).toFixed(1)}%`
                  : '—'}
            </div>
          </div>

          <div className="stat-card">
            <h4>招聘信息</h4>
            <div className="stat-value">{currentStats.totalJobs}</div>
            <div className="stat-detail">有效: {currentStats.activeJobs}</div>
            <div className="stat-trend">
              {currentStats.jobGrowth > 0
                ? `↑ ${currentStats.jobGrowth.toFixed(1)}%`
                : currentStats.jobGrowth < 0
                  ? `↓ ${Math.abs(currentStats.jobGrowth).toFixed(1)}%`
                  : '—'}
            </div>
          </div>

          <div className="stat-card">
            <h4>用户行为</h4>
            <div className="stat-value">{currentStats.totalApplications}</div>
            <div className="stat-detail">投递数</div>
            <div className="stat-detail">收藏数: {currentStats.totalFavorites}</div>
          </div>
        </div>
      </div>

      <div className="popular-categories">
        <h3>热门分类</h3>
        <div className="category-chart">
          {currentStats.popularCategories.map(cat => (
            <div key={cat.id} className="category-bar">
              <div className="category-name">{cat.category}</div>
              <div
                className="category-value-bar"
                style={{
                  width: `${Math.min(100, cat.count/Math.max(...currentStats.popularCategories.map(c => c.count))*100)}%`
                }}
              ></div>
              <div className="category-value">{cat.count}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="historical-data">
        <h3>历史数据</h3>

        {loading ? (
          <div className="loading-message">加载中...</div>
        ) : statistics.length === 0 ? (
          <div className="no-data-message">没有找到数据</div>
        ) : (
          <table className="statistics-table">
            <thead>
              <tr>
                <th>日期</th>
                <th>总用户数</th>
                <th>活跃用户数</th>
                <th>总招聘数</th>
                <th>有效招聘数</th>
                <th>总申请数</th>
                <th>总收藏数</th>
              </tr>
            </thead>
            <tbody>
              {statistics.map(stat => (
                <tr key={stat.id}>
                  <td>{formatDate(stat.stat_date)}</td>
                  <td>{stat.total_users}</td>
                  <td>{stat.active_users}</td>
                  <td>{stat.total_jobs}</td>
                  <td>{stat.active_jobs}</td>
                  <td>{stat.total_applications}</td>
                  <td>{stat.total_favorites}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default StatisticsReport;