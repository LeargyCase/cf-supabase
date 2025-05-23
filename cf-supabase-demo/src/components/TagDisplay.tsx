import React, { useState, useEffect } from 'react';
import DataService from '../services/DataService';
import './TagDisplay.css';

// 标签颜色映射
const TIME_TAG_STYLES: Record<number, { bg: string; text: string; name: string }> = {
  1: { bg: '#4caf50', text: 'white', name: '24h更新' },   // 24h更新-绿色
  2: { bg: '#2196f3', text: 'white', name: '昨天更新' },   // 昨天更新-蓝色
  3: { bg: '#ffc107', text: 'black', name: '3日内更新' },  // 3日内更新-黄色
  4: { bg: '#9e9e9e', text: 'white', name: '7日内更新' },  // 7日内更新-灰色
  5: { bg: '#f44336', text: 'white', name: '即将截止' },   // 即将截止-红色
  6: { bg: '#8bc34a', text: 'white', name: '有效可投递' }  // 有效可投递-浅绿色
};

// 行为标签样式
const ACTION_TAG_STYLES: Record<number, { bg: string; text: string; name: string; icon: string }> = {
  7: { 
    bg: 'linear-gradient(135deg, #FF9A8B 0%, #FF6A88 100%)', 
    text: 'white', 
    name: '多人浏览', 
    icon: '👁️' 
  },
  8: { 
    bg: 'linear-gradient(135deg, #FDEB71 0%, #F8D800 100%)', 
    text: 'black', 
    name: '多人收藏', 
    icon: '⭐' 
  },
  9: { 
    bg: 'linear-gradient(135deg, #81FFEF 0%, #F067B4 100%)', 
    text: 'white', 
    name: '多人投递', 
    icon: '🔥' 
  }
};

interface TagDisplayProps {
  jobId: number;
}

const TagDisplay: React.FC<TagDisplayProps> = ({ jobId }) => {
  console.log('TagDisplay组件被调用，jobId:', jobId);
  
  const [timeTag, setTimeTag] = useState<number | null>(null);
  const [actionTag, setActionTag] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dataService = DataService.getInstance();

  useEffect(() => {
    const loadTags = async () => {
      console.log('开始加载标签数据，jobId:', jobId);
      try {
        setLoading(true);
        const jobTags = await dataService.getJobTags(jobId);
        console.log('获取到的标签数据:', jobTags);
        
        if (jobTags) {
          setTimeTag(jobTags.time_tag_id || null);
          setActionTag(jobTags.action_tag_id || null);
          console.log('设置标签数据:', {
            timeTag: jobTags.time_tag_id,
            actionTag: jobTags.action_tag_id
          });
        } else {
          console.log('没有找到标签数据');
          setTimeTag(null);
          setActionTag(null);
        }
      } catch (error) {
        console.error('加载标签失败:', error);
        setError(String(error));
      } finally {
        setLoading(false);
      }
    };

    loadTags();
  }, [jobId, dataService]);

  // 返回所有标签
  return (
    <>
      {loading && (
        <div className="tag-loading" style={{ fontSize: '12px', color: '#999' }}>
          加载中...
        </div>
      )}
      
      {error && (
        <div className="tag-error" style={{ fontSize: '12px', color: 'red' }}>
          {error}
        </div>
      )}
      
      {!loading && !error && timeTag && TIME_TAG_STYLES[timeTag] && (
        <div 
          className="time-tag" 
          style={{ 
            backgroundColor: TIME_TAG_STYLES[timeTag].bg,
            color: TIME_TAG_STYLES[timeTag].text
          }}
        >
          {TIME_TAG_STYLES[timeTag].name}
        </div>
      )}
      
      {!loading && !error && actionTag && ACTION_TAG_STYLES[actionTag] && (
        <div 
          className="action-tag" 
          style={{ 
            background: ACTION_TAG_STYLES[actionTag].bg,
            color: ACTION_TAG_STYLES[actionTag].text
          }}
        >
          <span style={{ marginRight: '4px' }}>{ACTION_TAG_STYLES[actionTag].icon}</span>
          {ACTION_TAG_STYLES[actionTag].name}
        </div>
      )}
    </>
  );
};

export default TagDisplay; 