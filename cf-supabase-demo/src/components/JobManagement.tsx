import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import JobForm from './JobForm';
import JobManagementTable from './JobManagementTable';
import CsvImport from './CsvImport';
import './JobManagement.css';
import { showAlert, showSuccess, showConfirm } from './AlertDialog';

type ViewMode = 'list' | 'add' | 'edit' | 'import';

// 定义Job类型
export interface Job {
  id: string;
  title: string;
  company: string;
  nature: string;
  category: string;
  location: string;
  salary_min: number;
  salary_max: number;
  description: string;
  requirements: string;
  post_date: string;
  deadline: string;
  contact_email: string;
  contact_phone: string;
  status: string;
  education: string;
  graduation_year: string[];
}

// 组件参数类型
interface JobManagementProps {
  onReturnToOverview?: () => void;
}

const JobManagement: React.FC<JobManagementProps> = ({ onReturnToOverview }) => {
  const { supabase } = useAuth();
  const { dataService, isReady } = useApp();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [jobs, setJobs] = useState<any[]>([]);
  const [editJob, setEditJob] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 使用数据服务加载招聘信息
  useEffect(() => {
    console.log('JobManagement组件加载');
    console.log('数据服务是否就绪:', isReady);

    if (isReady) {
      setLoading(true);

      const handleJobsLoaded = (data: any[]) => {
        setJobs(data || []);
        setLoading(false);
      };

      // 使用数据服务获取职位信息，并订阅更新
      dataService.getJobs(handleJobsLoaded);

      // 组件卸载时取消订阅
      return () => {
        dataService.unsubscribe(handleJobsLoaded);
      };
    }
  }, [isReady, dataService]);

  // 当需要强制刷新数据时调用此函数
  const refreshJobs = () => {
    if (isReady) {
      setLoading(true);
      dataService.refreshJobs();
      // 数据会通过之前注册的回调自动更新，不需要额外处理
    }
  };

  const handleAddJob = async (jobData: any) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // 确保category_id字段是int数组
      if (jobData.category_ids && Array.isArray(jobData.category_ids)) {
        // 将category_ids复制到category_id，作为整数数组
        jobData.category_id = jobData.category_ids.map((id: any) => parseInt(id, 10));
        // 删除category_ids，因为数据库中不存在此字段
        delete jobData.category_ids;
      }

      // 插入招聘信息
      const { data, error } = await supabase
        .from('job_recruitments')
        .insert([jobData])
        .select();

      if (error) {
        throw new Error('添加招聘信息失败: ' + error.message);
      }

      // 更新分类表中的有效招聘信息数量
      await updateCategoryCounts();

      // 显示系统提示框
      showSuccess('招聘信息添加成功！', {
        title: '操作成功',
        autoClose: 2000 // 2秒后自动关闭
      });

      // 刷新数据 - 数据变更会通过通知系统自动触发刷新
      // 但为了确保UI立即刷新，我们也可以主动刷新
      refreshJobs();

      setViewMode('list');
    } catch (err: any) {
      console.error('添加招聘信息错误:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditJob = async (jobData: any) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // 确保category_id字段是int数组
      if (jobData.category_ids && Array.isArray(jobData.category_ids)) {
        // 将category_ids复制到category_id，作为整数数组
        jobData.category_id = jobData.category_ids.map((id: any) => parseInt(id, 10));
        // 删除category_ids，因为数据库中不存在此字段
        delete jobData.category_ids;
      }

      // 更新招聘信息
      const { error } = await supabase
        .from('job_recruitments')
        .update({
          ...jobData,
          updated_at: new Date().toISOString(),
          last_update: new Date().toISOString() // 触发时间标签更新
        })
        .eq('id', editJob.id);

      if (error) {
        throw new Error('更新招聘信息失败: ' + error.message);
      }

      // 更新分类表中的有效招聘信息数量
      await updateCategoryCounts();

      // 显示系统提示框
      showSuccess('招聘信息更新成功！', {
        title: '操作成功',
        autoClose: 2000 // 2秒后自动关闭
      });

      // 刷新数据 - 数据变更会通过通知系统自动触发刷新
      refreshJobs();

      setViewMode('list');
      setEditJob(null);
    } catch (err: any) {
      console.error('更新招聘信息错误:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteJob = async (jobId: number) => {
    // 使用系统确认对话框替代原生的window.confirm
    showConfirm(
      '确定要删除这条招聘信息吗？此操作无法撤销。',
      async () => {
        // 用户点击确认后执行删除操作
        setLoading(true);
        setError(null);

        try {
          // 1. 删除职位标签关联
          const { error: tagError } = await supabase
            .from('job_tags')
            .delete()
            .eq('job_id', jobId);

          if (tagError) {
            throw new Error('删除标签关联失败: ' + tagError.message);
          }

          // 2. 删除招聘信息
          const { error } = await supabase
            .from('job_recruitments')
            .delete()
            .eq('id', jobId);

          if (error) {
            throw new Error('删除招聘信息失败: ' + error.message);
          }

          // 3. 更新分类表中的有效招聘信息数量
          await updateCategoryCounts();

          // 显示系统提示框
          showSuccess('招聘信息删除成功！', {
            title: '操作成功',
            autoClose: 2000 // 2秒后自动关闭
          });

          // 数据变更会通过通知系统自动触发刷新
          // 不需要手动刷新数据，通知服务会处理
        } catch (err: any) {
          console.error('删除招聘信息错误:', err);
          setError(err.message);
        } finally {
          setLoading(false);
        }
      }
    );

    // 原有的删除逻辑已移至确认回调中，这里不再需要执行后续代码
    return;
  };

  // 更新分类计数的函数
  const updateCategoryCounts = async () => {
    try {
      // 调用存储过程更新分类计数
      const { error } = await supabase.rpc('update_all_category_counts');
      if (error) {
        console.error('更新分类计数错误:', error);
        // 不要因为分类计数更新失败而中断整个操作流程
        // 只记录错误但不抛出异常
      }
    } catch (err) {
      console.error('执行更新分类计数存储过程时发生错误:', err);
      // 同样，不抛出异常，仅记录错误
    }
  };

  const handleImportJobs = async (jobsData: any[]) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // 数据已经在CsvImport组件中处理，此处不需要重新处理category_id
      // 整数数组已经准备好，直接使用

      // 批量插入招聘信息
      const { data, error } = await supabase
        .from('job_recruitments')
        .insert(jobsData)
        .select();

      if (error) {
        throw new Error('批量导入招聘信息失败: ' + error.message);
      }

      // 更新分类表中的有效招聘信息数量
      await updateCategoryCounts();

      // 触发时间标签更新
      for (const job of data) {
        const { error: updateError } = await supabase
          .from('job_recruitments')
          .update({ last_update: new Date().toISOString() })
          .eq('id', job.id);

        if (updateError) {
          console.error(`更新时间标签触发失败 (ID: ${job.id}):`, updateError);
        }
      }

      // 显示系统提示框
      showSuccess(`成功导入 ${data.length} 条招聘信息！`, {
        title: '批量导入成功',
        autoClose: 2000 // 2秒后自动关闭
      });

      // 刷新数据 - 数据变更会通过通知系统自动触发刷新
      refreshJobs();

      setViewMode('list');
    } catch (err: any) {
      console.error('导入招聘信息错误:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 定时刷新数据（可选，用于确保数据最新，尽管通知系统已经处理大部分情况）
  useEffect(() => {
    // 创建定时刷新任务，每5分钟刷新一次数据
    const intervalId = setInterval(() => {
      if (isReady) {
        console.log('定时刷新招聘信息数据');
        refreshJobs();
      }
    }, 5 * 60 * 1000);

    // 组件卸载时清理定时器
    return () => clearInterval(intervalId);
  }, [isReady]);

  return (
    <div className="job-management-container">

      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {viewMode === 'list' && (
        <JobManagementTable
          jobs={jobs}
          loading={loading}
          onEdit={(job) => {
            if (job === null) {
              setViewMode('add');
            } else {
              setEditJob(job);
              setViewMode('edit');
            }
          }}
          onDelete={handleDeleteJob}
          onImport={() => setViewMode('import')}
        />
      )}

      {viewMode === 'add' && (
        <JobForm
          onSubmit={handleAddJob}
          onCancel={() => setViewMode('list')}
          loading={loading}
        />
      )}

      {viewMode === 'edit' && editJob && (
        <JobForm
          initialData={editJob}
          onSubmit={handleEditJob}
          onCancel={() => {
            setEditJob(null);
            setViewMode('list');
          }}
          loading={loading}
        />
      )}

      {viewMode === 'import' && (
        <CsvImport
          onImport={handleImportJobs}
          onCancel={() => setViewMode('list')}
          loading={loading}
        />
      )}
    </div>
  );
};

export default JobManagement;