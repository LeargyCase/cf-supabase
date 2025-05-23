-- 初始化所有分类的计数
-- 这个脚本只需要执行一次，用于设置所有分类的初始计数
DO $$ 
BEGIN
  -- 清空所有分类的计数
  UPDATE job_categories SET active_job_count = 0;
  
  -- 调用更新函数
  PERFORM update_all_category_counts();
  
  -- 输出更新结果
  RAISE NOTICE '所有分类计数已初始化完成';
END $$;

-- 查看更新结果
SELECT id, category, active_job_count FROM job_categories ORDER BY id; 