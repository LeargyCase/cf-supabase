import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './JobForm.css';
import { showAlert, showWarning } from './AlertDialog';

interface JobFormProps {
  initialData?: any; // 用于编辑模式
  onSubmit: (data: any) => void;
  onCancel: () => void;
  loading: boolean;
}

// 分类枚举
const NATURE_CATEGORIES = [1, 2, 3]; // 国企、外企、事业单位
const OTHER_CATEGORIES = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

// 招聘对象枚举（届别）
const GRADUATION_YEARS = ['22届', '23届', '24届', '25届', '26届', '27届', '28届', '海外往届'];

// 学历要求枚举
const EDUCATION_REQUIREMENTS = ['本科', '研究生', '本科及研究生以上', '研究生及以上'];

const JobForm: React.FC<JobFormProps> = ({ initialData, onSubmit, onCancel, loading }) => {
  const { supabase } = useAuth();
  console.log('JobForm组件加载', { hasInitialData: !!initialData, hasSupabase: !!supabase });

  const [formData, setFormData] = useState({
    job_title: '',
    company: '',
    description: '',
    category_ids: [] as number[], // 用于表单处理
    post_time: new Date().toISOString().split('T')[0],
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 默认30天后
    job_location: '',
    job_position: '',
    job_major: '',
    job_graduation_year: [] as string[],
    job_education_requirement: EDUCATION_REQUIREMENTS[0],
    application_link: '',
    is_active: true
  });

  const [categories, setCategories] = useState<any[]>([]);
  const [formErrors, setFormErrors] = useState<any>({});

  // 加载分类数据
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('job_categories')
          .select('*')
          .order('id');

        if (error) {
          console.error('获取分类数据失败:', error);
          return;
        }

        setCategories(data || []);
      } catch (err) {
        console.error('获取分类错误:', err);
      }
    };

    fetchCategories();
  }, [supabase]);

  // 如果是编辑模式，加载现有数据
  useEffect(() => {
    if (initialData) {
      try {
        console.log('加载编辑数据:', initialData);
        // 如果已有category_id字段（数组格式）
        const categoryIds = initialData.category_id || [];

        // 更新表单数据
        setFormData({
          ...initialData,
          category_ids: categoryIds, // 将数据库的category_id复制到表单的category_ids
          post_time: initialData.post_time ? new Date(initialData.post_time).toISOString().split('T')[0] : '',
          deadline: initialData.deadline ? new Date(initialData.deadline).toISOString().split('T')[0] : '',
          job_graduation_year: initialData.job_graduation_year ? initialData.job_graduation_year.split(',') : [],
        });
      } catch (err) {
        console.error('加载招聘信息分类错误:', err);
      }
    }
  }, [initialData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    // 清除该字段的错误
    if (formErrors[name]) {
      setFormErrors({ ...formErrors, [name]: undefined });
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    // 清除该字段的错误
    if (formErrors[name]) {
      setFormErrors({ ...formErrors, [name]: undefined });
    }
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const categoryId = parseInt(e.target.value, 10);
    const isChecked = e.target.checked;

    // 当前选中的分类
    let newCategoryIds = [...formData.category_ids];

    if (isChecked) {
      // 要添加的是企业性质分类（1-3）
      if (NATURE_CATEGORIES.includes(categoryId)) {
        // 移除其他已选的企业性质分类
        newCategoryIds = newCategoryIds.filter(id => !NATURE_CATEGORIES.includes(id));
      } else {
        // 是其他类别，检查是否已经有两个其他类别被选中
        const otherCategoriesSelected = newCategoryIds.filter(id => OTHER_CATEGORIES.includes(id));
        if (otherCategoriesSelected.length >= 2) {
          // 已经有两个其他类别被选中，移除最早选择的那个
          const oldestOtherCategory = otherCategoriesSelected[0];
          newCategoryIds = newCategoryIds.filter(id => id !== oldestOtherCategory);
        }
      }

      // 添加新选中的分类
      newCategoryIds.push(categoryId);
    } else {
      // 移除取消选中的分类
      newCategoryIds = newCategoryIds.filter(id => id !== categoryId);
    }

    // 清除错误
    if (formErrors.category_ids) {
      setFormErrors({ ...formErrors, category_ids: undefined });
    }

    setFormData({ ...formData, category_ids: newCategoryIds });
  };

  const handleGraduationYearChange = (year: string) => {
    let newYears;
    if (formData.job_graduation_year.includes(year)) {
      // 如果已选中，则移除
      newYears = formData.job_graduation_year.filter(y => y !== year);
    } else {
      // 否则添加
      newYears = [...formData.job_graduation_year, year];
    }

    setFormData({ ...formData, job_graduation_year: newYears });

    // 清除该字段的错误
    if (formErrors.job_graduation_year) {
      setFormErrors({ ...formErrors, job_graduation_year: undefined });
    }
  };

  const handleEducationRequirementChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData({ ...formData, job_education_requirement: e.target.value });

    // 清除该字段的错误
    if (formErrors.job_education_requirement) {
      setFormErrors({ ...formErrors, job_education_requirement: undefined });
    }
  };

  const validateForm = () => {
    const errors: any = {};
    let errorMessages: string[] = [];

    // 必填字段验证
    if (!formData.job_title.trim()) {
      errors.job_title = '请输入招聘信息标题';
      errorMessages.push('请输入招聘信息标题');
    }
    if (!formData.company.trim()) {
      errors.company = '请输入招聘公司名称';
      errorMessages.push('请输入招聘公司名称');
    }
    if (!formData.job_location.trim()) {
      errors.job_location = '请输入工作地点';
      errorMessages.push('请输入工作地点');
    }
    if (!formData.job_position.trim()) {
      errors.job_position = '请输入招聘岗位';
      errorMessages.push('请输入招聘岗位');
    }

    // 分类验证
    if (formData.category_ids.length === 0) {
      errors.category_ids = '请至少选择一个分类';
      errorMessages.push('请至少选择一个分类');
    }

    // 企业性质验证（必须选择一个）
    const hasNatureCategory = formData.category_ids.some(id => NATURE_CATEGORIES.includes(id));
    if (!hasNatureCategory) {
      errors.category_ids = '请选择一个企业性质';
      errorMessages.push('请选择一个企业性质');
    }

    // 日期验证
    if (!formData.post_time) {
      errors.post_time = '请选择发布时间';
      errorMessages.push('请选择发布时间');
    }
    if (!formData.deadline) {
      errors.deadline = '请选择截止时间';
      errorMessages.push('请选择截止时间');
    }

    // 检查截止时间是否早于发布时间
    if (formData.post_time && formData.deadline) {
      const postTime = new Date(formData.post_time);
      const deadline = new Date(formData.deadline);
      if (deadline < postTime) {
        errors.deadline = '截止时间不能早于发布时间';
        errorMessages.push('截止时间不能早于发布时间');
      }
    }

    // 招聘对象验证
    if (formData.job_graduation_year.length === 0) {
      errors.job_graduation_year = '请至少选择一个招聘对象';
      errorMessages.push('请至少选择一个招聘对象');
    }

    // 学历要求验证
    if (!formData.job_education_requirement) {
      errors.job_education_requirement = '请选择学历要求';
      errorMessages.push('请选择学历要求');
    }

    // 设置表单错误状态，用于显示红色边框
    setFormErrors(errors);

    // 如果有错误，显示系统提示框
    if (errorMessages.length > 0) {
      showWarning('请完善表单', {
        message: '请完善以下信息：<br/>' + errorMessages.map(msg => `• ${msg}`).join('<br/>'),
        title: '表单验证失败'
      });
      return false;
    }

    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // 准备提交数据
    const submitData = {
      ...formData,
      // 将表单的category_ids复制到category_id字段
      category_id: formData.category_ids,
      // 转换日期字段为ISO字符串
      post_time: new Date(formData.post_time).toISOString(),
      deadline: new Date(formData.deadline).toISOString(),
      // 转换招聘对象数组为逗号分隔的字符串
      job_graduation_year: formData.job_graduation_year.join(','),
      // 初始化计数器字段
      views_count: initialData ? formData.views_count : 0,
      favorites_count: initialData ? formData.favorites_count : 0,
      applications_count: initialData ? formData.applications_count : 0,
      // 添加时间戳
      created_at: initialData ? formData.created_at : new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_update: new Date().toISOString()
    };

    onSubmit(submitData);
  };

  return (
    <div className="job-form-container">
      <button
        type="button"
        className="back-button"
        onClick={onCancel}
        disabled={loading}
      >
        <span>←</span> 返回上一级
      </button>

      <div className="form-header">
        <h3 className="form-title">{initialData ? '编辑招聘信息' : '添加新招聘信息'}</h3>
      </div>

      <form className="job-form" onSubmit={handleSubmit}>
        <div className="form-row top-row">
          <div className="form-group title-group">
            <label htmlFor="job_title">招聘信息标题 <span className="required">*</span></label>
            <div className="input-wrapper">
              <input
                type="text"
                id="job_title"
                name="job_title"
                value={formData.job_title}
                onChange={handleInputChange}
                disabled={loading}
                className={formErrors.job_title ? 'error' : ''}
              />
            </div>
          </div>

          <div className="form-group company-group">
            <label htmlFor="company">招聘公司 <span className="required">*</span></label>
            <div className="input-wrapper">
              <input
                type="text"
                id="company"
                name="company"
                value={formData.company}
                onChange={handleInputChange}
                disabled={loading}
                className={formErrors.company ? 'error' : ''}
              />
            </div>
          </div>

          <div className="form-group description-group">
            <label htmlFor="description">公司描述</label>
            <div className="input-wrapper">
              <input
                type="text"
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                disabled={loading}
                className={formErrors.description ? 'error' : ''}
              />
            </div>
          </div>
        </div>

        <div className="form-group full-width">
          <label>分类 <span className="required">*</span></label>
          <div className="categories-section">
            <div className="category-group">
              <h4>企业性质（只能选择一个）</h4>
              <div className="checkboxes">
                {categories
                  .filter(cat => NATURE_CATEGORIES.includes(cat.id))
                  .map(category => (
                    <div
                      key={category.id}
                      className={`checkbox-item ${formData.category_ids.includes(category.id) ? 'selected' : ''}`}
                      onClick={() => {
                        if (!loading) {
                          const checkbox = document.getElementById(`category-${category.id}`) as HTMLInputElement;
                          checkbox.click();
                        }
                      }}
                    >
                      <input
                        type="checkbox"
                        id={`category-${category.id}`}
                        value={category.id}
                        checked={formData.category_ids.includes(category.id)}
                        onChange={handleCategoryChange}
                        disabled={loading}
                      />
                      <span className="checkbox-text">{category.category}</span>
                    </div>
                  ))
                }
              </div>
            </div>

            <div className="category-group">
              <h4>其他类别（最多选择2个）</h4>
              <div className="checkboxes other-categories">
                {categories
                  .filter(cat => OTHER_CATEGORIES.includes(cat.id))
                  .map(category => (
                    <div
                      key={category.id}
                      className={`checkbox-item ${formData.category_ids.includes(category.id) ? 'selected' : ''}`}
                      onClick={() => {
                        if (!loading) {
                          const checkbox = document.getElementById(`category-${category.id}`) as HTMLInputElement;
                          checkbox.click();
                        }
                      }}
                    >
                      <input
                        type="checkbox"
                        id={`category-${category.id}`}
                        value={category.id}
                        checked={formData.category_ids.includes(category.id)}
                        onChange={handleCategoryChange}
                        disabled={loading}
                      />
                      <span className="checkbox-text">{category.category}</span>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        </div>

        <div className="form-row date-location-row">
          {/* 发布时间 */}
          <div className="form-group date-group">
            <label htmlFor="post_time">发布时间 <span className="required">*</span></label>
            <input
              type="date"
              id="post_time"
              name="post_time"
              value={formData.post_time}
              onChange={handleDateChange}
              disabled={loading}
              className={`date-input ${formErrors.post_time ? 'error' : ''}`}
            />
          </div>

          {/* 截止时间 */}
          <div className="form-group date-group">
            <label htmlFor="deadline">截止时间 <span className="required">*</span></label>
            <input
              type="date"
              id="deadline"
              name="deadline"
              value={formData.deadline}
              onChange={handleDateChange}
              disabled={loading}
              className={`date-input ${formErrors.deadline ? 'error' : ''}`}
            />
          </div>

          {/* 工作地点 */}
          <div className="form-group location-group">
            <label htmlFor="job_location">工作地点 <span className="required">*</span></label>
            <input
              type="text"
              id="job_location"
              name="job_location"
              value={formData.job_location}
              onChange={handleInputChange}
              disabled={loading}
              className={formErrors.job_location ? 'error' : ''}
            />
          </div>
        </div>

        <div className="form-row position-major-row">
          {/* 招聘岗位 */}
          <div className="form-group position-group">
            <label htmlFor="job_position">招聘岗位 <span className="required">*</span></label>
            <input
              type="text"
              id="job_position"
              name="job_position"
              value={formData.job_position}
              onChange={handleInputChange}
              disabled={loading}
              className={formErrors.job_position ? 'error' : ''}
            />
          </div>

          {/* 招聘专业 */}
          <div className="form-group major-group">
            <label htmlFor="job_major">招聘专业</label>
            <input
              type="text"
              id="job_major"
              name="job_major"
              value={formData.job_major}
              onChange={handleInputChange}
              disabled={loading}
              className={formErrors.job_major ? 'error' : ''}
            />
          </div>
        </div>

        <div className="form-group full-width">
          <label>招聘对象（届别）<span className="required">*</span></label>
          <div className="checkboxes graduation-year-checkboxes">
            {GRADUATION_YEARS.map(year => (
              <div
                key={year}
                className={`checkbox-item ${formData.job_graduation_year.includes(year) ? 'selected' : ''}`}
                onClick={() => {
                  if (!loading) {
                    const checkbox = document.getElementById(`graduation-${year}`) as HTMLInputElement;
                    checkbox.click();
                  }
                }}
              >
                <input
                  type="checkbox"
                  id={`graduation-${year}`}
                  checked={formData.job_graduation_year.includes(year)}
                  onChange={() => handleGraduationYearChange(year)}
                  disabled={loading}
                />
                <span className="checkbox-text">{year}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="form-row">
          {/* 学历要求 */}
          <div className="form-group">
            <label htmlFor="job_education_requirement">学历要求 <span className="required">*</span></label>
            <select
              id="job_education_requirement"
              name="job_education_requirement"
              value={formData.job_education_requirement}
              onChange={handleEducationRequirementChange}
              disabled={loading}
              className={formErrors.job_education_requirement ? 'error' : ''}
            >
              {EDUCATION_REQUIREMENTS.map(edu => (
                <option key={edu} value={edu}>{edu}</option>
              ))}
            </select>
          </div>

          {/* 投递链接 */}
          <div className="form-group">
            <label htmlFor="application_link">投递链接</label>
            <input
              type="url"
              id="application_link"
              name="application_link"
              value={formData.application_link}
              onChange={handleInputChange}
              disabled={loading}
              className={formErrors.application_link ? 'error' : ''}
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="is_active">状态</label>
          <div className="status-wrapper">
            <div className="checkbox-item status-checkbox">
              <input
                type="checkbox"
                id="is_active"
                name="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                disabled={loading}
              />
              <span className="checkbox-text">有效（可见）</span>
            </div>
          </div>
        </div>

        <div className="form-actions full-width">
          <button
            type="submit"
            className="submit-button"
            disabled={loading}
          >
            {loading ? '提交中...' : (initialData ? '保存更改' : '添加招聘信息')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default JobForm;