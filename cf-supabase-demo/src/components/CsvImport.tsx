import React, { useState, useRef } from 'react';
import './CsvImport.css';

// 导入类型定义和枚举
const NATURE_CATEGORIES = [1, 2, 3]; // 国企、外企、事业单位
const OTHER_CATEGORIES = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
const GRADUATION_YEARS = ['22届', '23届', '24届', '25届', '26届', '27届', '28届', '海外往届'];
const EDUCATION_REQUIREMENTS = ['本科', '研究生', '本科及研究生以上', '研究生及以上'];

interface CsvImportProps {
  onImport: (data: any[]) => void;
  onCancel: () => void;
  loading: boolean;
}

const CsvImport: React.FC<CsvImportProps> = ({ onImport, onCancel, loading }) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [uploadStep, setUploadStep] = useState<'select' | 'validate' | 'ready'>('select');
  const [fileEncoding, setFileEncoding] = useState<'GBK' | 'UTF-8'>('GBK'); // 默认使用GBK编码

  const fileInputRef = useRef<HTMLInputElement>(null);

  // CSV文件必须包含的必填字段
  const requiredFields = [
    'job_title', 'company', 'job_location', 'job_position',
    'category_id', 'post_time', 'deadline',
    'job_graduation_year', 'job_education_requirement'
  ];

  // 列的预期顺序（用于显示参考）
  const expectedColumns = [
    'job_title', 'company', 'description', 'category_id',
    'post_time', 'deadline', 'job_location', 'job_position',
    'job_major', 'job_graduation_year', 'job_education_requirement', 'application_link'
  ];

  // 当选择文件时
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) {
      return;
    }

    console.log("文件选择事件触发，选择的文件:", selectedFile.name);

    // 验证文件类型
    if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
      setErrors(['请选择CSV文件']);
      setFile(null);
      setPreview([]);
      setUploadStep('select');
      return;
    }

    setFile(selectedFile);
    setErrors([]);
    setPreview([]); // 清空之前的预览数据

    // 先设置状态，然后在下一个事件循环中验证文件
    console.log("设置上传步骤为 validate");
    setUploadStep('validate');

    // 使用更长的延迟确保状态已更新
    console.log("计划在300ms后自动验证文件");
    setTimeout(() => {
      console.log("开始自动验证文件");
      validateCsv();
    }, 300);
  };

  // 更改文件编码
  const handleEncodingChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newEncoding = e.target.value as 'GBK' | 'UTF-8';
    console.log("更改文件编码为:", newEncoding);
    setFileEncoding(newEncoding);

    // 编码改变后自动重新验证
    setTimeout(() => {
      console.log("编码更改后自动重新验证");
      validateCsv();
    }, 300);
  };

  // 验证CSV文件
  const validateCsv = () => {
    if (!file) {
      console.error("验证失败：没有选择文件");
      return;
    }

    console.log("开始验证文件:", file.name, "编码:", fileEncoding);
    setIsValidating(true);
    setErrors([]);

    try {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          if (!e.target?.result) {
            console.error("文件读取结果为空");
            setErrors(['文件读取结果为空']);
            setIsValidating(false);
            return;
          }

          const text = e.target.result as string;
          console.log("CSV内容前100个字符:", text.substring(0, 100)); // 调试信息
          const result = parseCSV(text);

          if (result.errors.length > 0) {
            console.log("验证失败，发现错误:", result.errors);
            setErrors(result.errors);
            setPreview([]);
            setUploadStep('validate'); // 保持在验证步骤，允许用户更改编码重试
          } else {
            console.log("验证成功，找到", result.data.length, "条记录");

            // 先设置预览数据
            setPreview(result.data);

            // 确保在状态更新后切换到预览状态
            console.log("准备切换到预览状态");
            setTimeout(() => {
              console.log("切换到预览状态，数据条数:", result.data.length);
              setUploadStep('ready'); // 切换到预览状态
            }, 300);
          }
        } catch (err: any) {
          console.error("CSV解析错误:", err);
          setErrors([`CSV解析错误: ${err.message}`]);
          setPreview([]);
          setUploadStep('validate'); // 保持在验证步骤，允许用户更改编码重试
        } finally {
          setIsValidating(false);
        }
      };

      reader.onerror = (e) => {
        console.error("文件读取错误", e);
        setErrors(['文件读取错误']);
        setIsValidating(false);
        setUploadStep('validate'); // 保持在验证步骤，允许用户更改编码重试
      };

      console.log("开始读取文件内容，使用编码:", fileEncoding);
      reader.readAsText(file, fileEncoding); // 使用选择的编码读取文件
    } catch (err: any) {
      console.error("文件读取过程中发生错误:", err);
      setErrors([`文件读取过程中发生错误: ${err.message}`]);
      setIsValidating(false);
    }
  };

  // 智能匹配招聘对象届别
  const matchGraduationYears = (input: string): string[] => {
    const result: string[] = [];
    const inputLower = input.toLowerCase().replace(/\s+/g, '');

    // 匹配届别模式，例如"22届"、"22、23届"、"22,23届"等
    for (const year of GRADUATION_YEARS) {
      // 如果直接包含，则添加
      if (inputLower.includes(year.toLowerCase())) {
        if (!result.includes(year)) {
          result.push(year);
        }
        continue;
      }

      // 处理数字部分，例如从"22届"提取"22"
      if (year !== '海外往届') {
        const numPart = year.replace('届', '');
        if (inputLower.includes(numPart) &&
            (inputLower.includes('届') || inputLower.includes('毕业生'))) {
          if (!result.includes(year)) {
            result.push(year);
          }
        }
      } else if (inputLower.includes('海外') &&
                (inputLower.includes('往届') || inputLower.includes('毕业生'))) {
        if (!result.includes('海外往届')) {
          result.push('海外往届');
        }
      }
    }

    return result;
  };

  // 智能匹配学历要求
  const matchEducationRequirement = (input: string): string | null => {
    const inputLower = input.toLowerCase().replace(/\s+/g, '');

    // 直接匹配
    for (const edu of EDUCATION_REQUIREMENTS) {
      if (inputLower === edu.toLowerCase()) {
        return edu;
      }
    }

    // 包含关键词匹配
    if (inputLower.includes('研究生') && inputLower.includes('以上')) {
      return '研究生及以上';
    }

    if (inputLower.includes('本科') && inputLower.includes('研究生') &&
        (inputLower.includes('以上') || inputLower.includes('及'))) {
      return '本科及研究生以上';
    }

    if (inputLower.includes('本科') && !inputLower.includes('研究生')) {
      return '本科';
    }

    if (inputLower.includes('研究生') && !inputLower.includes('本科')) {
      return '研究生';
    }

    return null;
  };

  // 解析CSV文件 - 增强版
  const parseCSV = (csv: string) => {
    // 删除BOM标记（如果存在）
    const cleanedCsv = csv.replace(/^\uFEFF/, '');

    // 分割行，但要尊重引号内的换行
    const rows: string[] = [];
    let currentRow = '';
    let insideQuotes = false;

    for (let i = 0; i < cleanedCsv.length; i++) {
      const char = cleanedCsv[i];
      const nextChar = i < cleanedCsv.length - 1 ? cleanedCsv[i + 1] : '';

      if (char === '"') {
        insideQuotes = !insideQuotes;
      }

      if ((char === '\r' && nextChar === '\n') || char === '\n') {
        if (!insideQuotes) {
          rows.push(currentRow);
          currentRow = '';
          if (char === '\r') i++; // 跳过\n
        } else {
          currentRow += char === '\r' && nextChar === '\n' ? '\n' : char;
          if (char === '\r') i++; // 跳过\n
        }
      } else {
        currentRow += char;
      }
    }

    if (currentRow) {
      rows.push(currentRow);
    }

    if (rows.length < 2) {
      return { data: [], errors: ['CSV文件不包含有效数据行'] };
    }

    // 解析列标题
    const headerRow = rows[0];
    const headers = parseCSVRow(headerRow);
    console.log("解析到的标题:", headers); // 调试信息

    const result: any[] = [];
    const errors: string[] = [];

    // 验证标题行
    for (const field of requiredFields) {
      if (!headers.includes(field)) {
        errors.push(`CSV文件缺少必要的列: ${field}`);
      }
    }

    if (errors.length > 0) {
      return { data: [], errors };
    }

    // 解析数据行
    for (let i = 1; i < rows.length; i++) {
      if (!rows[i].trim()) continue; // 跳过空行

      const values = parseCSVRow(rows[i]);

      if (values.length !== headers.length) {
        errors.push(`第${i}行的列数(${values.length})与标题行(${headers.length})不匹配`);
        console.log(`第${i}行内容:`, rows[i]); // 调试信息
        console.log(`第${i}行解析结果:`, values); // 调试信息
        continue;
      }

      const rowData: any = {};

      // 构建行数据对象
      headers.forEach((header, index) => {
        rowData[header] = values[index];
      });

      // 验证必填字段
      let rowHasError = false;
      for (const field of requiredFields) {
        if (!rowData[field]) {
          errors.push(`第${i}行缺少必填字段: ${field}`);
          rowHasError = true;
          break;
        }
      }

      if (rowHasError) continue;

      // 验证和转换分类ID
      try {
        const categoryIds = rowData.category_id.split(' ').map((id: string) => parseInt(id, 10));

        // 验证分类ID是否在有效范围内
        for (const id of categoryIds) {
          if (isNaN(id) || ![...NATURE_CATEGORIES, ...OTHER_CATEGORIES].includes(id)) {
            errors.push(`第${i}行包含无效的分类ID: ${id}`);
            rowHasError = true;
            break;
          }
        }

        // 验证企业性质分类（1-3）最多只能选择一个
        const natureCategories = categoryIds.filter(id => NATURE_CATEGORIES.includes(id));
        if (natureCategories.length > 1) {
          errors.push(`第${i}行: 企业性质分类(1-3)最多只能选择一个`);
          rowHasError = true;
        }

        // 验证其他分类最多只能选择两个
        const otherCategories = categoryIds.filter(id => OTHER_CATEGORIES.includes(id));
        if (otherCategories.length > 2) {
          errors.push(`第${i}行: 其他分类最多只能选择两个`);
          rowHasError = true;
        }

        rowData.category_id = categoryIds;
      } catch (err) {
        errors.push(`第${i}行的分类ID格式无效`);
        rowHasError = true;
      }

      // 验证日期格式
      try {
        if (rowData.post_time) {
          const postDate = new Date(rowData.post_time);
          if (isNaN(postDate.getTime())) {
            errors.push(`第${i}行的发布日期格式无效`);
            rowHasError = true;
          }
        }

        if (rowData.deadline) {
          const deadlineDate = new Date(rowData.deadline);
          if (isNaN(deadlineDate.getTime())) {
            errors.push(`第${i}行的截止日期格式无效`);
            rowHasError = true;
          }
        }
      } catch (err) {
        errors.push(`第${i}行的日期格式无效`);
        rowHasError = true;
      }

      // 智能匹配招聘对象
      const matchedYears = matchGraduationYears(rowData.job_graduation_year);
      if (matchedYears.length === 0) {
        errors.push(`第${i}行无法识别有效的招聘对象: ${rowData.job_graduation_year}`);
        rowHasError = true;
      } else {
        // 使用匹配到的结果替换原来的值
        rowData.job_graduation_year = matchedYears.join(',');
      }

      // 智能匹配学历要求
      const matchedEducation = matchEducationRequirement(rowData.job_education_requirement);
      if (!matchedEducation) {
        errors.push(`第${i}行无法识别有效的学历要求: ${rowData.job_education_requirement}`);
        rowHasError = true;
      } else {
        // 使用匹配到的结果替换原来的值
        rowData.job_education_requirement = matchedEducation;
      }

      if (!rowHasError) {
        // 添加默认字段
        rowData.is_active = true;
        rowData.views_count = 0;
        rowData.favorites_count = 0;
        rowData.applications_count = 0;

        result.push(rowData);
      }
    }

    return { data: result, errors };
  };

  // 解析CSV行，正确处理引号
  const parseCSVRow = (row: string): string[] => {
    const result: string[] = [];
    let currentValue = '';
    let insideQuotes = false;

    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      const nextChar = i < row.length - 1 ? row[i + 1] : '';

      if (char === '"') {
        if (!insideQuotes) {
          // 开始引号
          insideQuotes = true;
        } else if (nextChar === '"') {
          // 转义的引号
          currentValue += '"';
          i++; // 跳过下一个引号
        } else {
          // 结束引号
          insideQuotes = false;
        }
      } else if (char === ',' && !insideQuotes) {
        // 字段分隔符
        result.push(currentValue);
        currentValue = '';
      } else {
        // 普通字符
        currentValue += char;
      }
    }

    // 添加最后一个字段
    result.push(currentValue);

    return result.map(value => value.trim());
  };

  // 提交导入
  const handleImport = () => {
    if (preview.length === 0) {
      setErrors(['没有有效数据可以导入']);
      return;
    }

    onImport(preview);
  };

  // 重置表单
  const resetForm = (openFileDialog = false) => {
    console.log("重置表单，是否打开文件选择对话框:", openFileDialog);

    // 清空状态
    setFile(null);
    setPreview([]);
    setErrors([]);

    // 重置文件输入框
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // 设置上传步骤为选择文件
    setUploadStep('select');

    // 如果需要，打开文件选择对话框
    if (openFileDialog && fileInputRef.current) {
      // 使用更长的延迟确保状态已更新
      setTimeout(() => {
        console.log("打开文件选择对话框");
        try {
          // 确保文件输入框存在并且可以点击
          if (fileInputRef.current) {
            console.log("触发文件选择对话框点击");
            fileInputRef.current.click();
          } else {
            console.error("文件输入引用不存在");
          }
        } catch (err) {
          console.error("触发文件选择对话框失败:", err);
        }
      }, 300); // 增加延迟时间
    }
  };

  // 重新选择文件 - 直接调用resetForm并打开文件选择对话框
  const handleReselect = () => {
    console.log("触发重新选择文件 - 直接调用resetForm");
    resetForm(true); // 传入true表示重置后打开文件选择对话框
  };

  // 渲染CSV模板说明
  const renderTemplateHelp = () => (
    <div className="csv-template-help">
      <h4>CSV文件格式说明</h4>
      <p>CSV文件应包含以下列（顺序不限）：</p>
      <ul className="csv-columns-list">
        {expectedColumns.map((col, index) => (
          <li key={col}>
            <strong>{col}</strong>
            {requiredFields.includes(col) && <span className="required-indicator">*</span>}
            {col === 'category_id' && <span className="hint">（分类ID，用空格分隔，例如: "1 5 7"）</span>}
            {col === 'job_graduation_year' && <span className="hint">（招聘对象，例如: "24届,25届"或"24、25届毕业生"）</span>}
          </li>
        ))}
      </ul>
      <p><span className="required-indicator">*</span> 表示必填字段</p>

      <div className="csv-validation-rules">
        <h5>数据验证规则：</h5>
        <ul>
          <li>category_id: 企业性质分类(1-3)只能选择一个，其他分类最多选择两个</li>
          <li>post_time/deadline: 日期格式为YYYY-MM-DD</li>
          <li>job_graduation_year: 系统会自动识别包含的届别（22届-28届, 海外往届）</li>
          <li>job_education_requirement: 系统会自动识别包含的学历要求（本科、研究生等）</li>
        </ul>
      </div>

      <div className="csv-format-tips">
        <h5>CSV格式注意事项：</h5>
        <ul>
          <li>如果字段内容包含<strong>逗号</strong>，请用<strong>双引号</strong>将整个内容包裹起来</li>
          <li>例如：<code>"这是一段包含,逗号的文本"</code></li>
          <li>如果字段内容本身包含引号，请使用两个引号表示一个引号：<code>"这是""引号""示例"</code></li>
          <li>如遇中文乱码问题，请在验证步骤选择合适的文件编码（GBK或UTF-8）</li>
          <li>建议保存CSV文件时选择<strong>GBK编码</strong>，这是中文Windows系统的常用编码</li>
        </ul>
      </div>

      <div className="csv-example">
        <h5>示例行：</h5>
        <pre>
          后端开发工程师,阿里巴巴,"负责系统后端开发,需要扎实的编程功底",1 5,2023-06-01,2023-07-31,杭州,后端开发,计算机科学,24届/25届毕业生,本科及以上学历,https://example.com/apply
        </pre>
      </div>
    </div>
  );

  // 使用 useEffect 监听状态变化
  React.useEffect(() => {
    console.log("状态变化 - 上传步骤:", uploadStep, "预览数据条数:", preview.length, "错误数:", errors.length);

    // 如果有文件并且处于验证步骤，但没有错误也没有预览数据，可能需要自动验证
    if (file && uploadStep === 'validate' && errors.length === 0 && preview.length === 0 && !isValidating) {
      console.log("检测到需要自动验证的情况，准备验证文件");
      setTimeout(() => validateCsv(), 300);
    }
  }, [uploadStep, preview.length, errors.length, file, isValidating]);

  // 每次渲染时记录当前状态
  console.log("当前渲染 - 上传步骤:", uploadStep, "预览数据条数:", preview.length, "错误数:", errors.length, "文件:", file?.name);

  return (
    <div className="csv-import-container">
      <button
        type="button"
        className="back-button"
        onClick={onCancel}
        disabled={loading}
      >
        <span>←</span> 返回上一级
      </button>
      <h3>批量导入招聘信息</h3>

      {errors.length > 0 && (
        <div className="error-list">
          <h4>错误信息:</h4>
          <ul>
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="upload-steps">
        <div className={`upload-step ${uploadStep === 'select' ? 'active' : uploadStep === 'validate' || uploadStep === 'ready' ? 'completed' : ''}`}>
          1. 选择CSV文件
        </div>
        <div className={`upload-step ${uploadStep === 'validate' ? 'active' : uploadStep === 'ready' ? 'completed' : ''}`}>
          2. 验证数据
        </div>
        <div className={`upload-step ${uploadStep === 'ready' ? 'active' : ''}`}>
          3. 导入数据
        </div>
      </div>

      <div className="upload-container">
        {/* 文件输入框始终存在，但隐藏 */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".csv"
          className="file-input"
          style={{ display: 'none' }}
          disabled={loading}
        />

        {uploadStep === 'select' && (
          <>
            <div className="upload-actions">
              <button
                type="button"
                className="upload-button primary-button"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
              >
                选择CSV文件
              </button>
            </div>
            {renderTemplateHelp()}
          </>
        )}

        {uploadStep === 'validate' && (
          <div className="validation-container">
            <p>已选择文件: <strong>{file?.name}</strong></p>

            <div className="encoding-selection">
              <label htmlFor="file-encoding">文件编码:</label>
              <select
                id="file-encoding"
                value={fileEncoding}
                onChange={handleEncodingChange}
                disabled={isValidating || loading}
              >
                <option value="GBK">GBK (推荐中文Windows)</option>
                <option value="UTF-8">UTF-8</option>
              </select>
              <p className="hint">如果中文显示乱码，请尝试更换编码，系统会自动重新验证</p>
            </div>

            <div className="validation-status">
              {isValidating && <p className="validating-message">正在验证文件，请稍候...</p>}
              {!isValidating && (
                <div className="validation-actions">
                  <button
                    className="validate-button"
                    onClick={validateCsv}
                    disabled={loading}
                  >
                    {errors.length > 0 ? '重新验证文件' : '手动验证文件'}
                  </button>
                  <button
                    className="reset-button"
                    onClick={handleReselect}
                    disabled={loading}
                  >
                    重新选择文件
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {uploadStep === 'ready' && (
          <div className="preview-container">
            <div className="preview-header">
              <h4>预览数据 ({preview.length} 条记录)</h4>
              <p>请检查数据是否正确，然后点击"导入数据"按钮。</p>
            </div>

            <div className="preview-table-container">
              <table className="preview-table">
                <thead>
                  <tr>
                    <th>标题</th>
                    <th>公司</th>
                    <th>岗位</th>
                    <th>地点</th>
                    <th>分类</th>
                    <th>招聘对象</th>
                    <th>学历要求</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 5).map((item, index) => (
                    <tr key={index}>
                      <td>{item.job_title}</td>
                      <td>{item.company}</td>
                      <td>{item.job_position}</td>
                      <td>{item.job_location}</td>
                      <td>{Array.isArray(item.category_id) ? item.category_id.join(', ') : item.category_id}</td>
                      <td>{item.job_graduation_year}</td>
                      <td>{item.job_education_requirement}</td>
                    </tr>
                  ))}
                  {preview.length > 5 && (
                    <tr>
                      <td colSpan={7} className="more-records">
                        ... 还有 {preview.length - 5} 条记录
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="import-actions">
              <button
                className="import-button"
                onClick={handleImport}
                disabled={loading}
              >
                {loading ? '导入中...' : '导入数据'}
              </button>
              <button
                className="reset-button"
                onClick={handleReselect}
                disabled={loading}
              >
                重新选择文件
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CsvImport;