-- 先删除已存在的函数
DROP FUNCTION IF EXISTS public.update_all_category_counts();
DROP FUNCTION IF EXISTS public.count_active_jobs_by_category(integer);

-- 创建或替换update_all_category_counts函数，用于更新所有分类的有效招聘信息数量
CREATE OR REPLACE FUNCTION public.update_all_category_counts()
RETURNS void AS $$
DECLARE
  cat_id integer;
  count_val integer;
BEGIN
  -- 遍历每个分类
  FOR cat_id IN SELECT id FROM job_categories LOOP
    -- 计算当前分类的有效招聘信息数量
    SELECT COUNT(*) INTO count_val
    FROM job_recruitments
    WHERE 
      is_active = TRUE 
      AND deadline >= CURRENT_DATE
      AND category_id @> ARRAY[cat_id];  -- 使用包含操作符检查数组中是否包含该分类ID
    
    -- 更新分类表中的有效招聘信息数量
    UPDATE job_categories
    SET active_job_count = count_val
    WHERE id = cat_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 创建一个针对特定分类的计数函数
CREATE OR REPLACE FUNCTION public.count_active_jobs_by_category(category_id integer)
RETURNS integer AS $$
DECLARE
  count_val integer;
BEGIN
  -- 计算指定分类的有效招聘信息数量
  SELECT COUNT(*) INTO count_val
  FROM job_recruitments
  WHERE 
    is_active = TRUE 
    AND deadline >= CURRENT_DATE
    AND category_id @> ARRAY[category_id];  -- 使用包含操作符检查数组中是否包含该分类ID
  
  RETURN count_val;
END;
$$ LANGUAGE plpgsql; 