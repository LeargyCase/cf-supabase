import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './CategoryManagement.css';

interface Category {
  id: number;
  category: string;
  category_number: number;
  active_job_count: number;
  is_active: boolean;
}

interface CategoryManagementProps {
  onReturnToOverview: () => void;
}

const CategoryManagement: React.FC<CategoryManagementProps> = ({ onReturnToOverview }) => {
  const { supabase } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    category: '',
    is_active: true
  });

  // 加载分类数据
  const loadCategories = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('job_categories')
        .select('*')
        .order('id');

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      console.error('加载分类数据错误:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    loadCategories();
  }, []);

  // 表单处理
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  // 处理编辑分类
  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      category: category.category,
      is_active: category.is_active
    });
  };

  // 处理更新分类
  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingCategory) return;
    
    if (!formData.category) {
      setError('请填写分类名称');
      return;
    }

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('job_categories')
        .update({
          category: formData.category,
          is_active: formData.is_active
        })
        .eq('id', editingCategory.id);

      if (error) throw error;
      
      setEditingCategory(null);
      setFormData({
        category: '',
        is_active: true
      });
      setError(null);
      
      // 重新加载分类列表
      loadCategories();
    } catch (error: any) {
      console.error('更新分类错误:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // 处理取消编辑
  const handleCancelEdit = () => {
    setEditingCategory(null);
    setFormData({
      category: '',
      is_active: true
    });
  };

  // 处理改变分类状态
  const handleToggleCategoryStatus = async (categoryId: number, currentStatus: boolean) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('job_categories')
        .update({ is_active: !currentStatus })
        .eq('id', categoryId);

      if (error) throw error;
      
      // 重新加载分类列表
      loadCategories();
    } catch (error: any) {
      console.error('更新分类状态错误:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // 手动更新分类计数
  const handleUpdateCategoryCounts = async () => {
    try {
      setLoading(true);
      
      // 这里调用数据库函数来更新分类计数
      const { error } = await supabase.rpc('update_category_counts_internal');

      if (error) throw error;
      
      alert('分类计数更新成功');
      
      // 重新加载分类列表
      loadCategories();
    } catch (error: any) {
      console.error('更新分类计数错误:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="category-management-container">
      <button 
        className="back-button" 
        onClick={onReturnToOverview}
      >
        ← 返回分类管理
      </button>
      
      <h2>分类管理</h2>
      
      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => setError(null)}>关闭</button>
        </div>
      )}
      
      {editingCategory && (
        <div className="category-edit-form">
          <h3>编辑分类</h3>
          <form onSubmit={handleUpdateCategory}>
            <div className="form-group">
              <label htmlFor="category">分类名称</label>
              <input
                type="text"
                id="category"
                name="category"
                value={formData.category}
                onChange={handleFormChange}
                required
              />
            </div>
            
            <div className="form-group checkbox-group">
              <input
                type="checkbox"
                id="is_active"
                name="is_active"
                checked={formData.is_active}
                onChange={handleFormChange}
              />
              <label htmlFor="is_active">启用分类</label>
            </div>
            
            <div className="form-buttons">
              <button 
                type="submit" 
                className="submit-button"
                disabled={loading}
              >
                更新分类
              </button>
              
              <button 
                type="button" 
                className="cancel-button"
                onClick={handleCancelEdit}
              >
                取消
              </button>
            </div>
          </form>
        </div>
      )}
      
      <div className="category-action-buttons">
        <button 
          className="update-counts-button"
          onClick={handleUpdateCategoryCounts}
          disabled={loading}
        >
          更新分类计数
        </button>
      </div>
      
      <div className="category-list">
        {loading && categories.length === 0 ? (
          <div className="loading-message">加载中...</div>
        ) : categories.length === 0 ? (
          <div className="no-data-message">没有找到分类</div>
        ) : (
          <table className="category-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>分类号</th>
                <th>分类名称</th>
                <th>有效招聘数量</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {categories.map(category => (
                <tr 
                  key={category.id}
                  className={!category.is_active ? 'inactive-category' : ''}
                >
                  <td>{category.id}</td>
                  <td>{category.category_number}</td>
                  <td>{category.category}</td>
                  <td>{category.active_job_count}</td>
                  <td>{category.is_active ? '启用' : '禁用'}</td>
                  <td>
                    <button 
                      className="edit-button"
                      onClick={() => handleEditCategory(category)}
                      disabled={loading}
                    >
                      编辑
                    </button>
                    <button 
                      className="status-button"
                      onClick={() => handleToggleCategoryStatus(category.id, category.is_active)}
                      disabled={loading}
                    >
                      {category.is_active ? '禁用' : '启用'}
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

export default CategoryManagement; 