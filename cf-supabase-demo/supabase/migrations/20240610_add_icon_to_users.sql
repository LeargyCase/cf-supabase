-- 添加 icon 字段到 users 表
ALTER TABLE users ADD COLUMN icon INT DEFAULT floor(random() * 9) + 1;

-- 为现有用户随机分配头像
UPDATE users SET icon = floor(random() * 9) + 1 WHERE icon IS NULL;

-- 添加注释
COMMENT ON COLUMN users.icon IS '用户头像图标ID，范围1-9，对应public/icon目录下的头像图片';

-- 创建触发器，在新用户注册时自动分配随机头像
CREATE OR REPLACE FUNCTION set_default_icon()
RETURNS TRIGGER AS $$
BEGIN
    -- 如果没有设置icon，则随机分配一个1-9之间的整数
    IF NEW.icon IS NULL THEN
        NEW.icon := floor(random() * 9) + 1;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS set_user_icon ON users;
CREATE TRIGGER set_user_icon
BEFORE INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION set_default_icon();
