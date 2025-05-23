import React, { useState, useEffect } from 'react';
import './JobManagementTable.css';

interface JobManagementTableProps {
  jobs: any[];
  onEdit: (job: any) => void;
  onDelete: (jobId: number) => void;
  loading: boolean;
  onImport?: () => void;
}

const JobManagementTable: React.FC<JobManagementTableProps> = ({ jobs, onEdit, onDelete, loading, onImport }) => {
  const [filteredJobs, setFilteredJobs] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<string>('post_time');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [isSearching, setIsSearching] = useState(false);

  const ITEMS_PER_PAGE = 10;

  // 处理搜索、排序和分页
  useEffect(() => {
    let result = [...jobs];

    // 搜索
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      result = result.filter(job =>
        job.job_title?.toLowerCase().includes(lowerSearchTerm) ||
        job.company?.toLowerCase().includes(lowerSearchTerm) ||
        job.job_position?.toLowerCase().includes(lowerSearchTerm) ||
        job.job_location?.toLowerCase().includes(lowerSearchTerm) ||
        job.job_major?.toLowerCase().includes(lowerSearchTerm)
      );
    }

    // 排序
    result.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // 处理日期字段
      if (sortField === 'post_time' || sortField === 'deadline' || sortField === 'created_at' || sortField === 'updated_at') {
        aValue = aValue ? new Date(aValue).getTime() : 0;
        bValue = bValue ? new Date(bValue).getTime() : 0;
      }

      // 处理数值字段
      if (sortField === 'views_count' || sortField === 'favorites_count' || sortField === 'applications_count') {
        aValue = aValue || 0;
        bValue = bValue || 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredJobs(result);
    setCurrentPage(1); // 重置到第一页
  }, [jobs, searchTerm, sortField, sortDirection]);

  // 获取当前页的数据
  const getCurrentPageData = () => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredJobs.slice(startIndex, endIndex);
  };

  // 处理排序
  const handleSort = (field: string) => {
    if (field === sortField) {
      // 如果点击的是当前排序字段，则切换排序方向
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // 否则，更改排序字段，并设置默认排序方向
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // 渲染排序指示器
  const renderSortIndicator = (field: string) => {
    if (field !== sortField) return null;
    return sortDirection === 'asc' ? ' ↑' : ' ↓';
  };

  // 处理搜索
  const handleSearch = () => {
    setIsSearching(!!searchTerm);
  };

  // 清除搜索
  const clearSearch = () => {
    setSearchTerm('');
    setIsSearching(false);
  };

  // 计算总页数
  const totalPages = Math.ceil(filteredJobs.length / ITEMS_PER_PAGE);

  // 格式化日期
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN');
  };

  return (
    <div className="job-management-table-container">
      <div className="table-actions">
        <div className="actions-container">
          <div className="all-buttons-container">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索招聘信息..."
              className="search-input"
            />
            <button
              type="button"
              className="search-button action-button"
              onClick={handleSearch}
            >
              搜索
            </button>
            {isSearching && (
              <button type="button" className="clear-search-button action-button" onClick={clearSearch}>
                清除搜索
              </button>
            )}
            <button
              className="add-button action-button"
              onClick={() => onEdit(null)}
              disabled={loading}
            >
              添加招聘信息
            </button>
            <button
              className="import-button action-button"
              onClick={onImport}
              disabled={loading}
            >
              批量导入
            </button>
            <button
              className="refresh-button action-button"
              onClick={() => {
                // 重新加载数据，不刷新整个页面
                window.location.reload();
              }}
              disabled={loading}
            >
              {loading ? '刷新中...' : '刷新数据'}
            </button>
          </div>
        </div>

        <div className="table-info">
          共 {filteredJobs.length} 条记录
        </div>
      </div>

      {loading ? (
        <div className="loading-indicator">加载中...</div>
      ) : filteredJobs.length === 0 ? (
        <div className="no-data-message">
          {isSearching ? '没有找到匹配的招聘信息' : '暂无招聘信息数据'}
        </div>
      ) : (
        <>
          <div className="job-management-table-responsive">
            <table className="job-management-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('job_title')}>
                    标题{renderSortIndicator('job_title')}
                  </th>
                  <th onClick={() => handleSort('company')}>
                    公司{renderSortIndicator('company')}
                  </th>
                  <th onClick={() => handleSort('job_position')}>
                    招聘对象{renderSortIndicator('job_position')}
                  </th>
                  <th onClick={() => handleSort('job_location')}>
                    地点{renderSortIndicator('job_location')}
                  </th>
                  <th onClick={() => handleSort('post_time')}>
                    发布时间{renderSortIndicator('post_time')}
                  </th>
                  <th onClick={() => handleSort('deadline')}>
                    截止时间{renderSortIndicator('deadline')}
                  </th>
                  <th onClick={() => handleSort('is_active')}>
                    状态{renderSortIndicator('is_active')}
                  </th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {getCurrentPageData().map(job => (
                  <tr key={job.id} className={job.is_active ? '' : 'inactive-row'}>
                    <td className="title-cell">{job.job_title}</td>
                    <td>{job.company}</td>
                    <td>{job.job_position}</td>
                    <td>{job.job_location}</td>
                    <td>{formatDate(job.post_time)}</td>
                    <td>{formatDate(job.deadline)}</td>
                    <td>
                      <span className={`status-indicator ${job.is_active ? 'active' : 'inactive'}`}>
                        {job.is_active ? '有效' : '无效'}
                      </span>
                    </td>
                    <td className="actions-cell">
                      <button
                        className="edit-button"
                        onClick={() => onEdit(job)}
                        title="编辑"
                      >
                        编辑
                      </button>
                      <button
                        className="delete-button"
                        onClick={() => onDelete(job.id)}
                        title="删除"
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="pagination-button"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                &laquo;
              </button>

              <button
                className="pagination-button"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                &lt;
              </button>

              <span className="pagination-info">
                {currentPage} / {totalPages}
              </span>

              <button
                className="pagination-button"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                &gt;
              </button>

              <button
                className="pagination-button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                &raquo;
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default JobManagementTable;
