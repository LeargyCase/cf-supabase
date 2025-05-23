import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './ActivationCodeManagement.css';

interface ActivationCode {
  id: number;
  code: string;
  is_active: boolean;
  is_used: boolean;
  validity_days: number;
  user_id: number | null;
  created_at: string;
}

interface User {
  id: number;
  username: string;
  account: string;
}

interface ActivationCodeManagementProps {
  onReturnToOverview: () => void;
}

const ActivationCodeManagement: React.FC<ActivationCodeManagementProps> = ({ onReturnToOverview }) => {
  const { supabase } = useAuth();
  const [codes, setCodes] = useState<ActivationCode[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    codePrefix: 'CAMPUS',
    codeCount: 10,
    validityDays: 365,
  });
  const [generatingCodes, setGeneratingCodes] = useState(false);

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // 加载激活码数据
  const loadCodes = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('activation_codes')
        .select('*');

      // 如果有搜索词，添加搜索条件
      if (searchTerm) {
        // 使用ilike进行不区分大小写的模糊搜索
        query = query.ilike('code', `%${searchTerm}%`);
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
      setCodes(data || []);
    } catch (error: any) {
      console.error('加载激活码数据错误:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // 加载用户数据
  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, account')
        .eq('is_active', true);

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error('加载用户数据错误:', error);
    }
  };

  // 当页码变化或搜索词变化时重新加载数据
  useEffect(() => {
    loadCodes();
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

  // 生成随机激活码
  const generateRandomCode = (prefix: string, length: number = 8) => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = prefix + '-';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  };

  // 处理生成激活码
  const handleGenerateCodes = async (e: React.FormEvent) => {
    e.preventDefault();

    const { codePrefix, codeCount, validityDays } = formData;
    const count = parseInt(codeCount.toString(), 10);
    const days = parseInt(validityDays.toString(), 10);

    if (isNaN(count) || count <= 0 || count > 100) {
      setError('生成数量应在1-100之间');
      return;
    }

    if (isNaN(days) || days <= 0) {
      setError('有效期天数必须大于0');
      return;
    }

    try {
      setGeneratingCodes(true);

      // 准备要插入的激活码数据
      const newCodes = Array.from({ length: count }, () => ({
        code: generateRandomCode(codePrefix),
        is_active: true,
        is_used: false,
        validity_days: days,
        user_id: null
      }));

      // 批量插入激活码
      const { data, error } = await supabase
        .from('activation_codes')
        .insert(newCodes)
        .select();

      if (error) throw error;

      setError(null);
      alert(`成功生成了 ${newCodes.length} 个激活码`);

      // 重新加载激活码列表
      loadCodes();
    } catch (error: any) {
      console.error('生成激活码错误:', error);
      setError(error.message);
    } finally {
      setGeneratingCodes(false);
    }
  };

  // 处理改变激活码状态
  const handleToggleCodeStatus = async (codeId: number, currentStatus: boolean) => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('activation_codes')
        .update({ is_active: !currentStatus })
        .eq('id', codeId);

      if (error) throw error;

      // 重新加载激活码列表
      loadCodes();
    } catch (error: any) {
      console.error('更新激活码状态错误:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // 处理删除激活码
  const handleDeleteCode = async (codeId: number) => {
    if (!window.confirm('确定要删除该激活码吗？此操作不可恢复。')) {
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase
        .from('activation_codes')
        .delete()
        .eq('id', codeId);

      if (error) throw error;

      // 重新加载激活码列表
      loadCodes();
    } catch (error: any) {
      console.error('删除激活码错误:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // 处理导出激活码
  const handleExportCodes = () => {
    // 筛选未使用的激活码
    const activeCodes = codes.filter(code => code.is_active && !code.is_used);

    if (activeCodes.length === 0) {
      alert('没有可导出的未使用激活码');
      return;
    }

    // 准备CSV内容
    const headers = ['激活码', '有效期(天)', '创建时间'];
    const csvContent = [
      headers.join(','),
      ...activeCodes.map(code => [
        code.code,
        code.validity_days,
        new Date(code.created_at).toLocaleString('zh-CN')
      ].join(','))
    ].join('\n');

    // 创建并下载CSV文件
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `激活码导出_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 表单处理
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // 不再需要前端过滤，因为已经在服务器端进行了过滤

  // 获取用户名
  const getUserName = (userId: number | null) => {
    if (!userId) return '未分配';
    const user = users.find(u => u.id === userId);
    return user ? `${user.username} (${user.account})` : `用户ID: ${userId}`;
  };

  return (
    <div className="activation-code-management-container">
      <button
        className="back-button"
        onClick={onReturnToOverview}
      >
        ← 返回激活码管理
      </button>

      <h2>激活码管理</h2>

      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => setError(null)}>关闭</button>
        </div>
      )}

      <div className="activation-code-form">
        <h3>生成新激活码</h3>
        <form onSubmit={handleGenerateCodes}>
          <div className="form-group">
            <label htmlFor="codePrefix">前缀</label>
            <input
              type="text"
              id="codePrefix"
              name="codePrefix"
              value={formData.codePrefix}
              onChange={handleFormChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="codeCount">生成数量 (1-100)</label>
            <input
              type="number"
              id="codeCount"
              name="codeCount"
              min="1"
              max="100"
              value={formData.codeCount}
              onChange={handleFormChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="validityDays">有效期 (天)</label>
            <input
              type="number"
              id="validityDays"
              name="validityDays"
              min="1"
              value={formData.validityDays}
              onChange={handleFormChange}
              required
            />
          </div>

          <div className="form-buttons">
            <button
              type="submit"
              className="submit-button"
              disabled={generatingCodes}
            >
              {generatingCodes ? '生成中...' : '生成激活码'}
            </button>
          </div>
        </form>
      </div>

      <div className="code-action-buttons">
        <button
          className="export-button"
          onClick={handleExportCodes}
          disabled={loading}
        >
          导出未使用激活码
        </button>
      </div>

      <div className="activation-code-list">
        <div className="search-bar">
          <input
            type="text"
            placeholder="搜索激活码..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>

        {loading && codes.length === 0 ? (
          <div className="loading-message">加载中...</div>
        ) : codes.length === 0 ? (
          <div className="no-data-message">没有找到激活码</div>
        ) : (
          <>
            <table className="code-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>激活码</th>
                  <th>状态</th>
                  <th>使用状态</th>
                  <th>有效期(天)</th>
                  <th>用户</th>
                  <th>创建时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {codes.map(code => (
                  <tr
                    key={code.id}
                    className={!code.is_active ? 'inactive-code' : (code.is_used ? 'used-code' : '')}
                  >
                    <td>{code.id}</td>
                    <td>{code.code}</td>
                    <td>{code.is_active ? '激活' : '停用'}</td>
                    <td>{code.is_used ? '已使用' : '未使用'}</td>
                    <td>{code.validity_days}</td>
                    <td>{getUserName(code.user_id)}</td>
                    <td>{new Date(code.created_at).toLocaleString('zh-CN')}</td>
                    <td>
                      <button
                        className="status-button"
                        onClick={() => handleToggleCodeStatus(code.id, code.is_active)}
                        disabled={loading || code.is_used}
                      >
                        {code.is_active ? '停用' : '激活'}
                      </button>
                      {!code.is_used && (
                        <button
                          className="delete-button"
                          onClick={() => handleDeleteCode(code.id)}
                          disabled={loading}
                        >
                          删除
                        </button>
                      )}
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

export default ActivationCodeManagement;