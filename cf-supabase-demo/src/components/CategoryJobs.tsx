import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DataService from '../services/DataService';
import './CategoryJobs.css';
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

const CategoryJobs: React.FC = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const { supabase, user } = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [categoryName, setCategoryName] = useState('');
  const observer = useRef<IntersectionObserver | null>(null);
  const lastJobElementRef = useRef<HTMLDivElement | null>(null);

  // 新增状态
  const [expandedJobs, setExpandedJobs] = useState<Record<number, boolean>>({});
  const [favoriteJobs, setFavoriteJobs] = useState<Record<number, boolean>>({});
  const [appliedJobs, setAppliedJobs] = useState<Record<number, boolean>>({});
  const dataService = DataService.getInstance();

  const ITEMS_PER_PAGE = 20;

  // 获取分类名称
  useEffect(() => {
    const id = parseInt(categoryId || '0', 10);
    setCategoryName(CATEGORIES[id] || '未知分类');
  }, [categoryId]);

  // 获取用户会员信息
  const getUserMembershipInfo = useCallback(async (userId: number) => {
    try {
      const { data, error } = await supabase
        .from('user_info')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('获取会员信息错误:', error);
        return null;
      }

      return data;
    } catch (err) {
      console.error('获取会员信息出错:', err);
      return null;
    }
  }, [supabase]);

  // 加载招聘信息
  const loadJobs = useCallback(async (pageNum: number) => {
    if (!categoryId) return;

    const id = parseInt(categoryId, 10);
    if (isNaN(id)) {
      setError('无效的分类ID');
      setLoading(false);
      return;
    }

    try {
      const isFirstPage = pageNum === 0;

      if (isFirstPage) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      // 检查用户会员类型
      let membershipType = 'common_user'; // 默认为普通用户
      let isLimitedView = true; // 默认限制查看

      if (user) {
        const userInfo = await getUserMembershipInfo(user.id);
        if (userInfo) {
          membershipType = userInfo.membership_type;

          // 如果是试用会员或正式会员，则不限制查看
          if (membershipType === 'temp_user' || membershipType === 'official_user') {
            isLimitedView = false;
          }
        }
      }

      // 普通用户每个分类最多查看20条
      const startRange = pageNum * ITEMS_PER_PAGE;
      const endRange = isLimitedView
        ? Math.min(startRange + ITEMS_PER_PAGE, 19) // 限制最多查看20条（索引0-19）
        : startRange + ITEMS_PER_PAGE - 1;

      // 如果是普通用户且已经加载了20条，则不再加载更多
      if (isLimitedView && startRange >= 20) {
        setHasMore(false);
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      let query = supabase
        .from('job_recruitments')
        .select('*')
        .eq('is_active', true)
        .order('post_time', { ascending: false })
        .range(startRange, endRange);

      // 根据分类ID过滤
      if (id <= 18) {
        // 常规分类 (1-18)
        query = query.contains('category_id', [id]);
      } else if (id === 19) {
        // 24h新开分类 - 直接使用数据库字段
        query = query.eq('is_24hnew', true);
      } else if (id === 20) {
        // 往届可投分类 - 直接使用数据库字段
        query = query.eq('is_pregraduation', true);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error('加载招聘信息失败: ' + error.message);
      }

      if (isFirstPage) {
        setJobs(data || []);
      } else {
        setJobs(prevJobs => [...prevJobs, ...data || []]);
      }

      // 如果是普通用户且已经加载了接近20条，则不再加载更多
      if (isLimitedView && (jobs.length + (data?.length || 0) >= 20)) {
        setHasMore(false);
      } else {
        setHasMore((data || []).length === ITEMS_PER_PAGE);
      }

      setPage(pageNum);
    } catch (err: any) {
      console.error('获取招聘信息错误:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [categoryId, supabase, user, getUserMembershipInfo, jobs.length]);

  // 初始加载
  useEffect(() => {
    setJobs([]);
    setPage(0);
    setHasMore(true);
    loadJobs(0);
  }, [categoryId, loadJobs]);

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

  // 会员限制提示
  const [showedMembershipAlert, setShowedMembershipAlert] = useState(false);

  // 显示会员限制提示弹窗
  const showMembershipLimitAlert = useCallback(() => {
    if (showedMembershipAlert) return; // 避免重复显示

    setShowedMembershipAlert(true);

    showAlert({
      title: '会员权限提示',
      message: '普通用户每个分类最多查看20条招聘信息<br>升级为会员可查看全部招聘信息',
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
          text: '立即激活',
          primary: true,
          onClick: (_, activationCode) => {
            closeAlert();
            if (activationCode && activationCode.trim()) {
              // 如果用户输入了激活码，跳转到会员页面并传递激活码
              window.location.href = `/user/dashboard?menu=membership&code=${encodeURIComponent(activationCode.trim())}`;
            } else {
              // 如果没有输入激活码，直接跳转到会员页面
              window.location.href = '/user/dashboard?menu=membership';
            }
          }
        }
      ]
    });
  }, [showedMembershipAlert]);

  // 设置无限滚动
  useEffect(() => {
    if (loading) return;

    // 断开之前的观察器连接
    if (observer.current) {
      observer.current.disconnect();
    }

    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingMore) {
        loadJobs(page + 1);
      } else if (entries[0].isIntersecting && !hasMore && jobs.length >= 20 && !showedMembershipAlert) {
        // 当用户滚动到底部，且已加载20条数据，且没有更多数据时，显示会员限制提示
        showMembershipLimitAlert();
      }
    }, { threshold: 0.5 });

    if (lastJobElementRef.current) {
      observer.current.observe(lastJobElementRef.current);
    }

    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [loading, hasMore, loadingMore, page, loadJobs, jobs.length, showedMembershipAlert, showMembershipLimitAlert]);

  // 处理展开/折叠招聘信息卡片
  const handleToggleExpand = useCallback(async (jobId: number, event?: React.MouseEvent) => {
    // 如果是通过事件触发的，阻止可能的事件冒泡
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    setExpandedJobs(prev => {
      const isCurrentlyExpanded = prev[jobId];

      // 如果当前是折叠状态，展开时增加浏览次数
      if (!isCurrentlyExpanded) {
        // 设置节流，避免多次调用
        const viewCountKey = `job_${jobId}_viewed`;
        if (!sessionStorage.getItem(viewCountKey)) {
          try {
            dataService.incrementJobViews(jobId);
            // 在会话存储中标记该职位已计数，防止短时间内重复计数
            sessionStorage.setItem(viewCountKey, 'true');
            // 更新本地状态
            setJobs(prevJobs =>
              prevJobs.map(job =>
                job.id === jobId
                  ? { ...job, views_count: (job.views_count || 0) + 1 }
                  : job
              )
            );
            // 5分钟后清除标记，允许再次计数
            setTimeout(() => {
              sessionStorage.removeItem(viewCountKey);
            }, 5 * 60 * 1000);
          } catch (err) {
            console.error('增加浏览次数错误:', err);
          }
        }
      }

      return { ...prev, [jobId]: !isCurrentlyExpanded };
    });
  }, [dataService, setJobs]);

  // 处理收藏/取消收藏
  const handleToggleFavorite = useCallback(async (jobId: number, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation(); // 阻止事件冒泡，避免触发卡片展开

    if (!user) {
      showAlert({
        title: '需要登录',
        message: '请先登录后再收藏职位',
        type: 'warning'
      });
      return;
    }

    // 防抖，避免重复点击
    const actionKey = `favorite_action_${jobId}`;
    if (sessionStorage.getItem(actionKey)) return;
    sessionStorage.setItem(actionKey, 'true');

    try {
      // 立即更新UI状态，提供即时反馈
      const isFavorite = !favoriteJobs[jobId];

      // 先更新本地状态
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

      // 然后执行API调用
      await dataService.toggleFavorite(user.id, jobId, isFavorite);

    } catch (err) {
      console.error('处理收藏错误:', err);
      // 发生错误时恢复原状态
      setFavoriteJobs(prev => ({ ...prev, [jobId]: !prev[jobId] }));
      showAlert({
        title: '操作失败',
        message: '收藏操作失败，请稍后重试',
        type: 'error'
      });
    } finally {
      // 1秒后清除操作锁，允许再次操作
      setTimeout(() => {
        sessionStorage.removeItem(actionKey);
      }, 1000);
    }
  }, [dataService, user, favoriteJobs, setJobs]);

  // 处理投递申请
  const handleApply = useCallback(async (jobId: number, applicationLink: string, event: React.MouseEvent) => {
    event.preventDefault();
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
  }, [dataService, user, setJobs]);

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

  // 处理会员升级
  const handleUpgradeMembership = () => {
    // 跳转到会员信息页面
    window.location.href = '/user/dashboard?menu=membership';
  };

  return (
    <div className="category-jobs-container">
      <div className="category-header">
        <Link to="/" className="back-button">返回分类</Link>
        <h2>{categoryName}招聘信息</h2>
      </div>

      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}

      {loading && jobs.length === 0 ? (
        <div className="loading-indicator">
          <p>加载中...</p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="no-data-message">
          <p>该分类下暂无招聘信息</p>
        </div>
      ) : (
        <div className="job-cards">
          {jobs.map((job, index) => (
            <div
              key={job.id}
              className={`job-card ${expandedJobs[job.id] ? 'expanded' : 'collapsed'}`}
              onClick={(e) => handleToggleExpand(job.id, e)}
              ref={index === jobs.length - 1 ? lastJobElementRef : null}
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
                <div className="toggle-expand" onClick={(e) => handleToggleExpand(job.id, e)}>
                  <span>{expandedJobs[job.id] ? '收起详情' : '查看详情'}</span>
                </div>

                {/* 申请按钮 */}
                <div className="job-application">
                  <button
                    className={`apply-button ${appliedJobs[job.id] ? 'applied' : ''}`}
                    onClick={(e) => handleApply(job.id, job.application_link, e)}
                  >
                    {appliedJobs[job.id] ? '再次投递' : '投递申请'}
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

      {loadingMore && (
        <div className="loading-more">
          <p>加载更多...</p>
        </div>
      )}

      {!loading && !loadingMore && !hasMore && jobs.length > 0 && (
        <div className="no-more-jobs">
          {jobs.length >= 20 && (
            <div className="membership-limit-notice">
              <div className="limit-notice-content">
                <h3>查看更多招聘信息</h3>
                <p>普通用户每个分类最多查看20条招聘信息</p>
                <p>升级为会员可查看全部招聘信息</p>
                <button className="upgrade-btn" onClick={handleUpgradeMembership}>
                  立即升级
                </button>
              </div>
            </div>
          )}
          <p>已加载全部招聘信息</p>
        </div>
      )}
    </div>
  );
};

export default CategoryJobs;