import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import './JobDisplay.css';
import DataService from '../services/DataService';
import { showAlert } from './AlertDialog';

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

const JobDisplay: React.FC = () => {
  const { supabase, user } = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedJobs, setExpandedJobs] = useState<Record<number, boolean>>({});
  const [favoriteJobs, setFavoriteJobs] = useState<Record<number, boolean>>({});
  const [appliedJobs, setAppliedJobs] = useState<Record<number, boolean>>({});
  const dataService = DataService.getInstance();

  // 加载招聘信息
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from('job_recruitments')
          .select('*')
          .eq('is_active', true)
          .order('post_time', { ascending: false });

        if (error) {
          throw new Error('加载招聘信息失败: ' + error.message);
        }

        setJobs(data || []);
      } catch (err: any) {
        console.error('获取招聘信息错误:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, [supabase]);

  // 加载用户的收藏和投递状态
  useEffect(() => {
    if (!user) return;

    const loadUserFavorites = async () => {
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
      } catch (err) {
        console.error('加载用户行为状态错误:', err);
      }
    };

    loadUserFavorites();
  }, [user, dataService]);

  // 处理展开/折叠招聘信息卡片
  const handleToggleExpand = useCallback(async (jobId: number) => {
    setExpandedJobs(prev => {
      const isCurrentlyExpanded = prev[jobId];

      // 如果当前是折叠状态，展开时增加浏览次数
      if (!isCurrentlyExpanded) {
        try {
          dataService.incrementJobViews(jobId);
        } catch (err) {
          console.error('增加浏览次数错误:', err);
        }
      }

      return { ...prev, [jobId]: !isCurrentlyExpanded };
    });
  }, [dataService]);

  // 处理收藏/取消收藏
  const handleToggleFavorite = useCallback(async (jobId: number, event: React.MouseEvent) => {
    event.stopPropagation(); // 阻止事件冒泡，避免触发卡片展开

    if (!user) {
      showAlert({
        title: '需要登录',
        message: '请先登录后再收藏职位',
        type: 'warning'
      });
      return;
    }

    try {
      const isFavorite = !favoriteJobs[jobId];
      await dataService.toggleFavorite(user.id, jobId, isFavorite);

      // 更新本地状态
      setFavoriteJobs(prev => ({ ...prev, [jobId]: isFavorite }));

      // 更新招聘信息统计
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
    } catch (err) {
      console.error('处理收藏错误:', err);
      showAlert({
        title: '操作失败',
        message: '收藏操作失败，请稍后重试',
        type: 'error'
      });
    }
  }, [dataService, user, favoriteJobs]);

  // 处理投递申请
  const handleApply = useCallback(async (jobId: number, applicationLink: string, event: React.MouseEvent) => {
    event.stopPropagation(); // 阻止事件冒泡，避免触发卡片展开

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
  }, [dataService, user]);

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN');
  };

  // 格式化分类
  const formatCategories = (categoryIds: number[]) => {
    if (!categoryIds || !Array.isArray(categoryIds)) return '未分类';
    return categoryIds.map(id => CATEGORIES[id] || `未知分类(${id})`).join(', ');
  };

  return (
    <div className="job-display-container">
      <h2>招聘信息一览</h2>

      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="loading-indicator">
          <p>加载中...</p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="no-data-message">
          <p>暂无招聘信息</p>
        </div>
      ) : (
        <div className="job-cards">
          {jobs.map(job => (
            <div
              key={job.id}
              className={`job-card ${expandedJobs[job.id] ? 'expanded' : 'collapsed'}`}
              onClick={() => handleToggleExpand(job.id)}
            >
              <div className="job-card-header">
                <h3 className="job-title">{job.job_title}</h3>
                <span className="job-company">{job.company}</span>

                <button
                  className={`favorite-button ${favoriteJobs[job.id] ? 'favorited' : ''}`}
                  onClick={(e) => handleToggleFavorite(job.id, e)}
                  title={favoriteJobs[job.id] ? "取消收藏" : "添加收藏"}
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

              {/* 详细信息 - 仅在展开时显示 */}
              {expandedJobs[job.id] && (
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

                  {job.description && (
                    <div className="job-description">
                      <h4>公司描述</h4>
                      <p>{job.description}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="job-card-footer">
                {/* 展开/折叠按钮 */}
                <div className="toggle-expand">
                  <span>{expandedJobs[job.id] ? '收起详情' : '查看详情'}</span>
                </div>

                {/* 申请按钮 */}
                <div className="job-application">
                  <button
                    className={`apply-button ${appliedJobs[job.id] ? 'applied' : ''}`}
                    onClick={(e) => handleApply(job.id, job.application_link, e)}
                    disabled={appliedJobs[job.id]}
                  >
                    {appliedJobs[job.id] ? '已投递' : '投递申请'}
                  </button>
                </div>

                {/* 统计数据 */}
                <div className="job-stats">
                  <span className="job-stat">
                    <i className="stat-icon views-icon"></i> {job.views_count || 0} 浏览
                  </span>
                  <span className="job-stat">
                    <i className="stat-icon favs-icon"></i> {job.favorites_count || 0} 收藏
                  </span>
                  <span className="job-stat">
                    <i className="stat-icon apps-icon"></i> {job.applications_count || 0} 申请
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 仅在开发环境中显示调试信息 */}
      {process.env.NODE_ENV === 'development' && (
        <div className="debug-section">
          <h3>调试信息</h3>
          <pre className="debug-info">
            {JSON.stringify(jobs.slice(0, 1), null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default JobDisplay;