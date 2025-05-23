/**
 * 【备份文件】- 已弃用
 * 此组件已被 UserDashboard.tsx 替代
 * 仅作为参考保留，不再使用
 * 
 * 如需个人中心功能，请访问 /user/dashboard 路径
 * 对应组件为 UserDashboard.tsx
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import DataService from '../services/DataService';
import './UserProfile.css';

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

const UserProfile: React.FC = () => {
  const { user, logout } = useAuth();
  const [favoriteJobs, setFavoriteJobs] = useState<any[]>([]);
  const [appliedJobs, setAppliedJobs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'favorite' | 'application'>('favorite');
  const [loading, setLoading] = useState(true);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [expandedJobs, setExpandedJobs] = useState<Record<number, boolean>>({});
  const dataService = DataService.getInstance();

  // 加载用户的收藏和投递记录
  useEffect(() => {
    if (!user) return;

    setLoading(true);
    
    // 加载收藏的招聘信息
    loadFavoriteJobs();
    
    // 加载投递的招聘信息
    loadApplicationJobs();
    
    setLoading(false);
  }, [user]);

  // 加载收藏的职位
  const loadFavoriteJobs = useCallback(async () => {
    if (!user) return;
    
    setLoadingFavorites(true);
    
    dataService.getUserFavoriteJobs(
      user.id, 
      (jobsData) => {
        setFavoriteJobs(jobsData);
        setLoadingFavorites(false);
      },
      true // 强制刷新
    );
  }, [user, dataService]);

  // 加载投递的职位
  const loadApplicationJobs = useCallback(async () => {
    if (!user) return;
    
    setLoadingApplications(true);
    
    dataService.getUserApplicationJobs(
      user.id, 
      (jobsData) => {
        setAppliedJobs(jobsData);
        setLoadingApplications(false);
      },
      true // 强制刷新
    );
  }, [user, dataService]);

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

  // 取消收藏
  const handleCancelFavorite = async (jobId: number) => {
    if (!user) return;
    
    try {
      await dataService.toggleFavorite(user.id, jobId, false);
      // 直接重新加载收藏列表
      loadFavoriteJobs();
    } catch (err) {
      console.error('取消收藏错误:', err);
      alert('操作失败，请重试');
    }
  };

  // 处理展开/折叠招聘信息卡片
  const handleToggleExpand = useCallback((jobId: number) => {
    setExpandedJobs(prev => {
      const isCurrentlyExpanded = prev[jobId];
      return { ...prev, [jobId]: !isCurrentlyExpanded };
    });
  }, []);

  if (!user) {
    return (
      <div className="user-profile-container">
        <div className="login-message">
          <h2>请先登录</h2>
          <p>您需要登录后才能查看个人中心</p>
        </div>
      </div>
    );
  }

  return (
    <div className="user-profile-container">
      <div className="user-profile-header">
        <h2>个人中心</h2>
        <div className="user-info">
          <p className="welcome-text">欢迎，{user.username}</p>
          <button className="logout-button" onClick={logout}>退出登录</button>
        </div>
      </div>

      <div className="user-actions-tabs">
        <div 
          className={`tab ${activeTab === 'favorite' ? 'active' : ''}`}
          onClick={() => setActiveTab('favorite')}
        >
          我的收藏 ({favoriteJobs.length})
        </div>
        <div 
          className={`tab ${activeTab === 'application' ? 'active' : ''}`}
          onClick={() => setActiveTab('application')}
        >
          我的投递 ({appliedJobs.length})
        </div>
      </div>

      <div className="user-actions-content">
        {loading ? (
          <div className="loading-indicator">
            <p>加载中...</p>
          </div>
        ) : (
          <>
            {activeTab === 'favorite' && (
              <div className="user-favorites">
                {loadingFavorites ? (
                  <div className="loading-indicator">
                    <p>加载收藏中...</p>
                  </div>
                ) : favoriteJobs.length === 0 ? (
                  <div className="empty-list">
                    <p>暂无收藏的招聘信息</p>
                  </div>
                ) : (
                  <div className="job-list">
                    {favoriteJobs.map(job => (
                      <div key={job.id} className={`job-item ${expandedJobs[job.id] ? 'expanded' : 'collapsed'}`}>
                        <div className="job-header">
                          <h3 className="job-title">{job.job_title}</h3>
                          <span className="job-company">{job.company}</span>
                          <button
                            className="cancel-button"
                            onClick={() => handleCancelFavorite(job.id)}
                            title="取消收藏"
                          >
                            ×
                          </button>
                        </div>
                        
                        <div className="job-details">
                          <div className="job-field">
                            <span className="field-label">分类:</span>
                            <span className="field-value">{formatCategories(job.category_id)}</span>
                          </div>
                          
                          <div className="job-field">
                            <span className="field-label">工作地点:</span>
                            <span className="field-value">{job.job_location}</span>
                          </div>
                          
                          <div className="job-field">
                            <span className="field-label">招聘岗位:</span>
                            <span className="field-value">{job.job_position}</span>
                          </div>
                          
                          <div className="job-field">
                            <span className="field-label">截止时间:</span>
                            <span className="field-value">{formatDate(job.deadline)}</span>
                          </div>
                          
                          {expandedJobs[job.id] && (
                            <>
                              <div className="job-field">
                                <span className="field-label">学历要求:</span>
                                <span className="field-value">{job.job_education_requirement}</span>
                              </div>
                              
                              <div className="job-field">
                                <span className="field-label">专业要求:</span>
                                <span className="field-value">{job.job_major}</span>
                              </div>
                              
                              <div className="job-field full-width">
                                <span className="field-label">职位描述:</span>
                                <div className="field-value description">{job.description}</div>
                              </div>
                            </>
                          )}
                        </div>
                        
                        <div className="job-actions">
                          <a 
                            href={job.application_link} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="apply-button"
                          >
                            前往投递
                          </a>
                          <button 
                            className="detail-button"
                            onClick={() => handleToggleExpand(job.id)}
                          >
                            {expandedJobs[job.id] ? '收起详情' : '查看详情'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'application' && (
              <div className="user-applications">
                {loadingApplications ? (
                  <div className="loading-indicator">
                    <p>加载投递记录中...</p>
                  </div>
                ) : appliedJobs.length === 0 ? (
                  <div className="empty-list">
                    <p>暂无投递的招聘信息</p>
                  </div>
                ) : (
                  <div className="job-list">
                    {appliedJobs.map(job => (
                      <div key={job.id} className={`job-item ${expandedJobs[job.id] ? 'expanded' : 'collapsed'}`}>
                        <div className="job-header">
                          <h3 className="job-title">{job.job_title}</h3>
                          <span className="job-company">{job.company}</span>
                          <span className="applied-tag">已投递</span>
                        </div>
                        
                        <div className="job-details">
                          <div className="job-field">
                            <span className="field-label">分类:</span>
                            <span className="field-value">{formatCategories(job.category_id)}</span>
                          </div>
                          
                          <div className="job-field">
                            <span className="field-label">工作地点:</span>
                            <span className="field-value">{job.job_location}</span>
                          </div>
                          
                          <div className="job-field">
                            <span className="field-label">招聘岗位:</span>
                            <span className="field-value">{job.job_position}</span>
                          </div>
                          
                          <div className="job-field">
                            <span className="field-label">截止时间:</span>
                            <span className="field-value">{formatDate(job.deadline)}</span>
                          </div>
                          
                          {expandedJobs[job.id] && (
                            <>
                              <div className="job-field">
                                <span className="field-label">学历要求:</span>
                                <span className="field-value">{job.job_education_requirement}</span>
                              </div>
                              
                              <div className="job-field">
                                <span className="field-label">专业要求:</span>
                                <span className="field-value">{job.job_major}</span>
                              </div>
                              
                              <div className="job-field full-width">
                                <span className="field-label">职位描述:</span>
                                <div className="field-value description">{job.description}</div>
                              </div>
                            </>
                          )}
                        </div>
                        
                        <div className="job-actions">
                          <a 
                            href={job.application_link} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="view-button"
                          >
                            前往投递
                          </a>
                          <button 
                            className="detail-button"
                            onClick={() => handleToggleExpand(job.id)}
                          >
                            {expandedJobs[job.id] ? '收起详情' : '查看详情'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default UserProfile; 