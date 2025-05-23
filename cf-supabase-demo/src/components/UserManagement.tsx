import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './UserManagement.css';

interface User {
  id: number;
  username: string;
  account: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface UserManagementProps {
  onReturnToOverview: () => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ onReturnToOverview }) => {
  const { supabase } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    account: '',
    password: '',
    is_active: true
  });

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // 加载用户数据
  const loadUsers = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('users')
        .select('*');

      // 如果有搜索词，添加搜索条件
      if (searchTerm) {
        // 使用ilike进行不区分大小写的模糊搜索
        query = query
          .or(`username.ilike.%${searchTerm}%,account.ilike.%${searchTerm}%`);
      }

      // 先获取符合条件的总数
      const { data: countData, error: countError } = await query
        .select('*', { count: 'exact', head: true });

      if (countError) throw countError;
      setTotalCount(countData?.length || 0);

      // 然后获取当前页的数据
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error('加载用户数据错误:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // 当页码变化或搜索词变化时重新加载数据
  useEffect(() => {
    loadUsers();
    // 当搜索词变化时，重置为第一页
    if (currentPage !== 1 && searchTerm) {
      setCurrentPage(1);
    }
  }, [currentPage, searchTerm]);

  // 处理页码变化
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  // 处理搜索输入变化
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
  };

  // 表单处理
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  // 处理新增用户
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.username || !formData.account || !formData.password) {
      setError('请填写完整的用户信息');
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .insert([
          {
            username: formData.username,
            account: formData.account,
            password: formData.password,
            is_active: formData.is_active
          }
        ])
        .select();

      if (error) throw error;

      setUsers([...(data || []), ...users]);
      setFormData({
        username: '',
        account: '',
        password: '',
        is_active: true
      });
      setError(null);

      // 重新加载用户列表
      loadUsers();
    } catch (error: any) {
      console.error('添加用户错误:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // 处理编辑用户
  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      account: user.account,
      password: '', // 密码不回显
      is_active: user.is_active
    });
  };

  // 处理更新用户
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingUser) return;

    if (!formData.username || !formData.account) {
      setError('请填写完整的用户信息');
      return;
    }

    try {
      setLoading(true);

      const updateData: any = {
        username: formData.username,
        account: formData.account,
        is_active: formData.is_active
      };

      // 只有当用户输入了新密码时才更新密码
      if (formData.password) {
        updateData.password = formData.password;
      }

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', editingUser.id);

      if (error) throw error;

      setEditingUser(null);
      setFormData({
        username: '',
        account: '',
        password: '',
        is_active: true
      });
      setError(null);

      // 重新加载用户列表
      loadUsers();
    } catch (error: any) {
      console.error('更新用户错误:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // 处理取消编辑
  const handleCancelEdit = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      account: '',
      password: '',
      is_active: true
    });
  };

  // 处理删除用户
  const handleDeleteUser = async (userId: number) => {
    if (!window.confirm('确定要删除该用户吗？此操作不可恢复。')) {
      return;
    }

    try {
      setLoading(true);

      // 实际上是将用户标记为非活跃状态，而非真正删除
      const { error } = await supabase
        .from('users')
        .update({ is_active: false })
        .eq('id', userId);

      if (error) throw error;

      // 重新加载用户列表
      loadUsers();
    } catch (error: any) {
      console.error('删除用户错误:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="user-management-container">
      <button
        className="back-button"
        onClick={onReturnToOverview}
      >
        ← 返回用户管理
      </button>

      <h2>用户管理</h2>

      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => setError(null)}>关闭</button>
        </div>
      )}

      <div className="user-management-form">
        <h3>{editingUser ? '编辑用户' : '添加新用户'}</h3>
        <form onSubmit={editingUser ? handleUpdateUser : handleAddUser}>
          <div className="user-form-row">
            <div className="form-group">
              <label htmlFor="username">用户名</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleFormChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="account">账号</label>
              <input
                type="text"
                id="account"
                name="account"
                value={formData.account}
                onChange={handleFormChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">
                {editingUser ? '密码 (留空则不修改)' : '密码'}
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleFormChange}
                required={!editingUser}
              />
            </div>
          </div>

          <div className="form-group checkbox-group">
            <input
              type="checkbox"
              id="is_active"
              name="is_active"
              checked={formData.is_active}
              onChange={handleFormChange}
            />
            <label htmlFor="is_active">启用账号</label>
          </div>

          <div className="form-buttons">
            <button
              type="submit"
              className="submit-button"
              disabled={loading}
            >
              {editingUser ? '更新用户' : '添加用户'}
            </button>

            {editingUser && (
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

      <div className="user-management-list">
        <div className="search-bar">
          <input
            type="text"
            placeholder="搜索用户名或账号..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>

        {loading && users.length === 0 ? (
          <div className="loading-message">加载中...</div>
        ) : users.length === 0 ? (
          <div className="no-data-message">没有找到用户</div>
        ) : (
          <>
            <table className="user-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>用户名</th>
                  <th>账号</th>
                  <th>状态</th>
                  <th>创建时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} className={!user.is_active ? 'inactive-user' : ''}>
                    <td>{user.id}</td>
                    <td>{user.username}</td>
                    <td>{user.account}</td>
                    <td>{user.is_active ? '启用' : '禁用'}</td>
                    <td>{new Date(user.created_at).toLocaleString('zh-CN')}</td>
                    <td>
                      <button
                        className="edit-button"
                        onClick={() => handleEditUser(user)}
                        disabled={loading}
                      >
                        编辑
                      </button>
                      <button
                        className="delete-button"
                        onClick={() => handleDeleteUser(user.id)}
                        disabled={loading}
                      >
                        {user.is_active ? '禁用' : '启用'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* 分页控件 */}
            <div className="pagination">
              <button
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
                className="pagination-button"
              >
                首页
              </button>
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="pagination-button"
              >
                上一页
              </button>
              <span className="pagination-info">
                {currentPage} / {Math.ceil(totalCount / itemsPerPage)} 页 (共 {totalCount} 条)
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === Math.ceil(totalCount / itemsPerPage)}
                className="pagination-button"
              >
                下一页
              </button>
              <button
                onClick={() => handlePageChange(Math.ceil(totalCount / itemsPerPage))}
                disabled={currentPage === Math.ceil(totalCount / itemsPerPage)}
                className="pagination-button"
              >
                末页
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UserManagement;