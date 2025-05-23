import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './TagManagement.css';

interface Tag {
  id: number;
  tag_name: string;
  tag_type: string;
  is_active: boolean;
  created_at: string;
}

interface TagManagementProps {
  onReturnToOverview: () => void;
}

const TagManagement: React.FC<TagManagementProps> = ({ onReturnToOverview }) => {
  const { supabase } = useAuth();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [formData, setFormData] = useState({
    tag_name: '',
    tag_type: 'general',
    is_active: true
  });

  // 标签类型选项
  const tagTypes = [
    { value: 'general', label: '一般' },
    { value: 'time_sensitive', label: '时间相关' },
    { value: 'feature', label: '特点' },
    { value: 'location', label: '地点' },
    { value: 'education', label: '学历' },
    { value: 'company_size', label: '公司规模' },
    { value: 'company_type', label: '公司类型' }
  ];

  // 加载标签数据
  const loadTags = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('tag_type')
        .order('tag_name');

      if (error) throw error;
      setTags(data || []);
    } catch (error: any) {
      console.error('加载标签数据错误:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    loadTags();
  }, []);

  // 搜索过滤
  const filteredTags = tags.filter(tag => 
    tag.tag_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tag.tag_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 表单处理
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  // 处理新增标签
  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.tag_name || !formData.tag_type) {
      setError('请填写完整的标签信息');
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tags')
        .insert([
          {
            tag_name: formData.tag_name,
            tag_type: formData.tag_type,
            is_active: formData.is_active
          }
        ])
        .select();

      if (error) throw error;
      
      setFormData({
        tag_name: '',
        tag_type: 'general',
        is_active: true
      });
      setError(null);
      
      // 重新加载标签列表
      loadTags();
    } catch (error: any) {
      console.error('添加标签错误:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // 处理编辑标签
  const handleEditTag = (tag: Tag) => {
    setEditingTag(tag);
    setFormData({
      tag_name: tag.tag_name,
      tag_type: tag.tag_type,
      is_active: tag.is_active
    });
  };

  // 处理更新标签
  const handleUpdateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingTag) return;
    
    if (!formData.tag_name || !formData.tag_type) {
      setError('请填写完整的标签信息');
      return;
    }

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('tags')
        .update({
          tag_name: formData.tag_name,
          tag_type: formData.tag_type,
          is_active: formData.is_active
        })
        .eq('id', editingTag.id);

      if (error) throw error;
      
      setEditingTag(null);
      setFormData({
        tag_name: '',
        tag_type: 'general',
        is_active: true
      });
      setError(null);
      
      // 重新加载标签列表
      loadTags();
    } catch (error: any) {
      console.error('更新标签错误:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // 处理取消编辑
  const handleCancelEdit = () => {
    setEditingTag(null);
    setFormData({
      tag_name: '',
      tag_type: 'general',
      is_active: true
    });
  };

  // 处理删除标签
  const handleDeleteTag = async (tagId: number) => {
    if (!window.confirm('确定要删除该标签吗？此操作不可恢复。')) {
      return;
    }

    try {
      setLoading(true);
      
      // 先检查该标签是否被使用
      const { count, error: countError } = await supabase
        .from('job_tags')
        .select('*', { count: 'exact' })
        .eq('tag_id', tagId);

      if (countError) throw countError;
      
      if (count && count > 0) {
        // 如果标签已被使用，则仅标记为非活跃状态
        const { error } = await supabase
          .from('tags')
          .update({ is_active: false })
          .eq('id', tagId);
          
        if (error) throw error;
        
        alert('该标签已被使用，已将其标记为非活跃状态');
      } else {
        // 如果标签未被使用，则可以物理删除
        const { error } = await supabase
          .from('tags')
          .delete()
          .eq('id', tagId);
          
        if (error) throw error;
      }
      
      // 重新加载标签列表
      loadTags();
    } catch (error: any) {
      console.error('删除标签错误:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // 获取标签类型显示名称
  const getTagTypeLabel = (type: string) => {
    const tagType = tagTypes.find(t => t.value === type);
    return tagType ? tagType.label : type;
  };

  return (
    <div className="tag-management-container">
      <button 
        className="back-button" 
        onClick={onReturnToOverview}
      >
        ← 返回标签管理
      </button>
      
      <h2>标签管理</h2>
      
      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => setError(null)}>关闭</button>
        </div>
      )}
      
      <div className="tag-management-form">
        <h3>{editingTag ? '编辑标签' : '添加新标签'}</h3>
        <form onSubmit={editingTag ? handleUpdateTag : handleAddTag}>
          <div className="form-group">
            <label htmlFor="tag_name">标签名称</label>
            <input
              type="text"
              id="tag_name"
              name="tag_name"
              value={formData.tag_name}
              onChange={handleFormChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="tag_type">标签类型</label>
            <select
              id="tag_type"
              name="tag_type"
              value={formData.tag_type}
              onChange={handleFormChange}
              required
            >
              {tagTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className="form-group checkbox-group">
            <input
              type="checkbox"
              id="is_active"
              name="is_active"
              checked={formData.is_active}
              onChange={handleFormChange}
            />
            <label htmlFor="is_active">启用标签</label>
          </div>
          
          <div className="form-buttons">
            <button 
              type="submit" 
              className="submit-button"
              disabled={loading}
            >
              {editingTag ? '更新标签' : '添加标签'}
            </button>
            
            {editingTag && (
              <button 
                type="button" 
                className="cancel-button"
                onClick={handleCancelEdit}
              >
                取消
              </button>
            )}
          </div>
        </form>
      </div>
      
      <div className="tag-list">
        <div className="search-bar">
          <input
            type="text"
            placeholder="搜索标签名称或类型..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        
        {loading && tags.length === 0 ? (
          <div className="loading-message">加载中...</div>
        ) : filteredTags.length === 0 ? (
          <div className="no-data-message">没有找到标签</div>
        ) : (
          <table className="tag-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>标签名称</th>
                <th>类型</th>
                <th>状态</th>
                <th>创建时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredTags.map(tag => (
                <tr key={tag.id} className={!tag.is_active ? 'inactive-tag' : ''}>
                  <td>{tag.id}</td>
                  <td>{tag.tag_name}</td>
                  <td>{getTagTypeLabel(tag.tag_type)}</td>
                  <td>{tag.is_active ? '启用' : '禁用'}</td>
                  <td>{new Date(tag.created_at).toLocaleString('zh-CN')}</td>
                  <td>
                    <button 
                      className="edit-button"
                      onClick={() => handleEditTag(tag)}
                      disabled={loading}
                    >
                      编辑
                    </button>
                    <button 
                      className="delete-button"
                      onClick={() => handleDeleteTag(tag.id)}
                      disabled={loading}
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default TagManagement; 