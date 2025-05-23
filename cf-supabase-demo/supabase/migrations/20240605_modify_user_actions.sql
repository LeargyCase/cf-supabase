-- 修改用户行为表结构
-- 首先删除旧的user_actions表如果存在
DROP TABLE IF EXISTS user_actions;

-- 创建新的user_actions表，使用数组字段存储职位ID
CREATE TABLE user_actions (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  favorite_job_ids INT[] DEFAULT '{}',  -- 用户收藏的招聘信息ID数组
  application_job_ids INT[] DEFAULT '{}',  -- 用户投递的招聘信息ID数组
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 添加外键约束
ALTER TABLE user_actions 
  ADD CONSTRAINT fk_user_actions_user 
  FOREIGN KEY (user_id) 
  REFERENCES users(id) 
  ON DELETE CASCADE;

-- 创建索引以提高查询效率
CREATE INDEX idx_user_actions_user_id ON user_actions(user_id);

-- 添加唯一约束确保每个用户只有一条记录
ALTER TABLE user_actions ADD CONSTRAINT unique_user_action UNIQUE (user_id);

-- 创建函数：添加收藏
CREATE OR REPLACE FUNCTION add_favorite_job(user_id_param INT, job_id_param INT)
RETURNS VOID AS $$
DECLARE
  record_exists BOOLEAN;
BEGIN
  -- 检查用户记录是否存在
  SELECT EXISTS(SELECT 1 FROM user_actions WHERE user_id = user_id_param) INTO record_exists;
  
  IF record_exists THEN
    -- 如果记录存在且job_id不在数组中，则添加
    UPDATE user_actions
    SET favorite_job_ids = array_append(favorite_job_ids, job_id_param),
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = user_id_param 
    AND NOT (job_id_param = ANY(favorite_job_ids));
  ELSE
    -- 如果记录不存在，则创建新记录
    INSERT INTO user_actions (user_id, favorite_job_ids)
    VALUES (user_id_param, ARRAY[job_id_param]);
  END IF;
  
  -- 更新job_recruitments表中的收藏计数
  UPDATE job_recruitments
  SET favorites_count = favorites_count + 1
  WHERE id = job_id_param;
END;
$$ LANGUAGE plpgsql;

-- 创建函数：移除收藏
CREATE OR REPLACE FUNCTION remove_favorite_job(user_id_param INT, job_id_param INT)
RETURNS VOID AS $$
BEGIN
  -- 从用户收藏数组中移除指定job_id
  UPDATE user_actions
  SET favorite_job_ids = array_remove(favorite_job_ids, job_id_param),
      updated_at = CURRENT_TIMESTAMP
  WHERE user_id = user_id_param;
  
  -- 更新job_recruitments表中的收藏计数
  UPDATE job_recruitments
  SET favorites_count = GREATEST(0, favorites_count - 1)
  WHERE id = job_id_param;
END;
$$ LANGUAGE plpgsql;

-- 创建函数：添加投递
CREATE OR REPLACE FUNCTION add_application_job(user_id_param INT, job_id_param INT)
RETURNS VOID AS $$
DECLARE
  record_exists BOOLEAN;
BEGIN
  -- 检查用户记录是否存在
  SELECT EXISTS(SELECT 1 FROM user_actions WHERE user_id = user_id_param) INTO record_exists;
  
  IF record_exists THEN
    -- 如果记录存在且job_id不在数组中，则添加
    UPDATE user_actions
    SET application_job_ids = array_append(application_job_ids, job_id_param),
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = user_id_param 
    AND NOT (job_id_param = ANY(application_job_ids));
  ELSE
    -- 如果记录不存在，则创建新记录
    INSERT INTO user_actions (user_id, application_job_ids)
    VALUES (user_id_param, ARRAY[job_id_param]);
  END IF;
  
  -- 更新job_recruitments表中的投递计数
  UPDATE job_recruitments
  SET applications_count = applications_count + 1
  WHERE id = job_id_param;
END;
$$ LANGUAGE plpgsql;

-- 创建函数：移除投递
CREATE OR REPLACE FUNCTION remove_application_job(user_id_param INT, job_id_param INT)
RETURNS VOID AS $$
BEGIN
  -- 从用户投递数组中移除指定job_id
  UPDATE user_actions
  SET application_job_ids = array_remove(application_job_ids, job_id_param),
      updated_at = CURRENT_TIMESTAMP
  WHERE user_id = user_id_param;
  
  -- 更新job_recruitments表中的投递计数
  UPDATE job_recruitments
  SET applications_count = GREATEST(0, applications_count - 1)
  WHERE id = job_id_param;
END;
$$ LANGUAGE plpgsql;

-- 创建函数：更新浏览次数
CREATE OR REPLACE FUNCTION increment_job_views(job_id_param INT)
RETURNS VOID AS $$
BEGIN
  UPDATE job_recruitments
  SET views_count = views_count + 1
  WHERE id = job_id_param;
END;
$$ LANGUAGE plpgsql;

-- 创建函数：检查职位是否已收藏
CREATE OR REPLACE FUNCTION is_job_favorited(user_id_param INT, job_id_param INT)
RETURNS BOOLEAN AS $$
DECLARE
  is_favorited BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM user_actions 
    WHERE user_id = user_id_param 
    AND job_id_param = ANY(favorite_job_ids)
  ) INTO is_favorited;
  
  RETURN is_favorited;
END;
$$ LANGUAGE plpgsql;

-- 创建函数：检查职位是否已投递
CREATE OR REPLACE FUNCTION is_job_applied(user_id_param INT, job_id_param INT)
RETURNS BOOLEAN AS $$
DECLARE
  is_applied BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM user_actions 
    WHERE user_id = user_id_param 
    AND job_id_param = ANY(application_job_ids)
  ) INTO is_applied;
  
  RETURN is_applied;
END;
$$ LANGUAGE plpgsql;

-- 注释
COMMENT ON TABLE user_actions IS '用户行为表，记录用户的收藏和投递行为';
COMMENT ON COLUMN user_actions.favorite_job_ids IS '用户收藏的招聘信息ID数组';
COMMENT ON COLUMN user_actions.application_job_ids IS '用户投递的招聘信息ID数组';
COMMENT ON FUNCTION add_favorite_job(INT, INT) IS '添加收藏记录和更新统计数据';
COMMENT ON FUNCTION remove_favorite_job(INT, INT) IS '移除收藏记录和更新统计数据';
COMMENT ON FUNCTION add_application_job(INT, INT) IS '添加投递记录和更新统计数据';
COMMENT ON FUNCTION remove_application_job(INT, INT) IS '移除投递记录和更新统计数据';
COMMENT ON FUNCTION increment_job_views(INT) IS '增加招聘信息的浏览次数';
COMMENT ON FUNCTION is_job_favorited(INT, INT) IS '检查职位是否已被用户收藏';
COMMENT ON FUNCTION is_job_applied(INT, INT) IS '检查职位是否已被用户投递'; 