# Supabase 存储过程设置说明

本目录包含需要在Supabase数据库中执行的SQL文件，用于创建必要的存储过程和函数。

## 如何执行SQL文件

1. 登录您的Supabase项目
2. 点击左侧菜单的"SQL编辑器"
3. 点击"新查询"按钮
4. 将SQL文件中的内容复制粘贴到查询编辑器中
5. 点击"运行"按钮执行SQL脚本

## 部署顺序

请按照以下顺序执行SQL文件：

1. `migrations/update_all_category_counts.sql` - 创建基础函数
2. `migrations/initialize_category_counts.sql` - 初始化分类计数（仅需执行一次）

## 必需的存储过程

### 1. update_all_category_counts

此函数用于更新所有分类的有效招聘信息数量。每当添加、更新或删除招聘信息时，应调用此函数以保持分类计数的准确性。

文件位置：`migrations/update_all_category_counts.sql`

**注意事项：**
- 此函数使用PostgreSQL数组操作符`@>`来检查招聘信息的分类数组中是否包含特定分类ID
- 如果函数已存在，脚本会先删除再重新创建，以避免参数修改错误

### 2. count_active_jobs_by_category

此函数用于计算特定分类的有效招聘信息数量。它接受一个分类ID参数，并返回属于该分类的有效招聘信息数量。

文件位置：`migrations/update_all_category_counts.sql`（与上一个函数在同一文件中）

## 常见错误处理

### 参数修改错误

如果您遇到以下错误：
```
ERROR: 42P13: cannot change name of input parameter "category_id"
HINT: Use DROP FUNCTION count_active_jobs_by_category(integer) first.
```

解决方案：
- 使用我们提供的SQL脚本，其中已经包含了`DROP FUNCTION`语句
- 或者手动删除函数后重新创建：
```sql
DROP FUNCTION IF EXISTS public.count_active_jobs_by_category(integer);
-- 然后重新创建函数
```

### 数组操作符错误

如果您遇到以下错误：
```
ERROR: operator does not exist: integer = integer[]
```

解决方案：
- 使用正确的数组包含操作符`@>`而不是等号`=`：
```sql
-- 错误
WHERE category_id = cat_id

-- 正确
WHERE category_id @> ARRAY[cat_id]
```

## 如何在代码中调用存储过程

```javascript
// 更新所有分类计数
const { error } = await supabase.rpc('update_all_category_counts');
if (error) {
  console.error('更新分类计数错误:', error);
}

// 获取特定分类的招聘信息数量
const { data, error } = await supabase.rpc('count_active_jobs_by_category', { 
  category_id: 1 // 替换为您要查询的分类ID
});
if (error) {
  console.error('获取分类招聘数量错误:', error);
} else {
  console.log(`分类1的有效招聘信息数量: ${data}`);
}
```

## 数据库表结构变更说明

最近我们对 `job_recruitments` 表进行了结构变更：

1. 将 `category_id` 字段从 `text` 格式修改为 `int[]` 类型（整数数组）
2. 不再使用 `job_recruitment_categories` 中间表管理职位和分类的关系

这种变更简化了数据结构，使得分类可以直接存储在招聘信息记录中，减少了关联查询的复杂性。

## 手动添加记录测试

如果您需要手动添加测试记录，可以使用以下SQL语句：

```sql
INSERT INTO job_recruitments (
  job_title, 
  company, 
  description, 
  category_id, 
  post_time, 
  deadline, 
  job_location, 
  job_position, 
  job_graduation_year, 
  job_education_requirement,
  is_active
) VALUES (
  '测试职位',
  '测试公司',
  '公司描述',
  ARRAY[1, 5, 14],  -- 分类ID数组：国企, 互联网, 一线大厂
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP + INTERVAL '30 days',
  '北京',
  '软件工程师',
  '24届,25届',
  '本科',
  TRUE
);
``` 