数据库设计说明

---

# 校园信息招聘网站数据库设计与说明文档

## 1. 系统概述

本系统旨在提供校园信息招聘服务，支持用户注册、职位浏览、职位申请和收藏等功能，管理员可以管理职位信息、用户信息、激活码等数据。数据存储使用 Supabase 作为数据库，前端托管在 Cloudflare Pages。

## 2. 数据库表设计

### 2.1 系统数据表 (system\_data)

**描述：** 该表记录系统的版本和最后更新的时间，便于后期系统维护和版本控制。

| 字段名              | 类型          | 描述       |
| ---------------- | ----------- | -------- |
| id               | SERIAL      | 唯一标识     |
| current\_version | VARCHAR(50) | 系统当前版本   |
| last\_update     | TIMESTAMP   | 系统最后更新时间 |

### 2.2 管理员表 (admins)

**描述：** 该表记录管理员账号信息，用于后台管理系统的用户认证和权限管理。

| 字段名                | 类型           | 描述                  |
| ------------------ | ------------ | ------------------- |
| id                 | SERIAL       | 唯一标识                |
| admin\_username    | VARCHAR(100) | 管理员用户名              |
| admin\_password    | VARCHAR(255) | 管理员密码               |
| admin\_permissions | VARCHAR(100) | 管理员权限（例如：管理员、超级管理员） |
| is\_active         | BOOLEAN      | 是否有效（用于逻辑删除，默认为有效）  |
| created\_at        | TIMESTAMP    | 创建时间                |
| updated\_at        | TIMESTAMP    | 更新时间                |

### 2.3 用户表 (users)

**描述：** 该表记录注册用户的信息，包括用户名、账号、密码等基本信息。

| 字段名         | 类型           | 描述                 |
| ----------- | ------------ | ------------------ |
| id          | SERIAL       | 唯一标识               |
| username    | VARCHAR(100) | 用户名                |
| account     | VARCHAR(100) | 用户账号               |
| password    | VARCHAR(255) | 用户密码               |
| is\_active  | BOOLEAN      | 是否有效（用于逻辑删除，默认为有效） |
| created\_at | TIMESTAMP    | 创建时间               |
| updated\_at | TIMESTAMP    | 更新时间               |

### 2.4 用户信息表 (user\_info)

**描述：** 该表记录用户的详细信息，包括会员类型、激活码等信息。

| 字段名                         | 类型           | 描述                     |
| --------------------------- | ------------ | ---------------------- |
| id                          | SERIAL       | 唯一标识                   |
| user\_id                    | INT          | 用户ID，关联 `users` 表的 id  |
| membership\_type            | VARCHAR(50)  | 会员类型（如：普通用户、试用会员、正式会员） |
| membership\_code            | VARCHAR(100) | 绑定的会员激活码               |
| membership\_start\_date     | TIMESTAMP    | 会员开始日期                 |
| membership\_end\_date       | TIMESTAMP    | 会员结束日期                 |
| membership\_remaining\_days | INT          | 会员剩余天数                 |
| is\_active                  | BOOLEAN      | 是否有效（用于逻辑删除，默认为有效）     |
| created\_at                 | TIMESTAMP    | 创建时间                   |
| updated\_at                 | TIMESTAMP    | 更新时间                   |

### 2.5 用户行为表 (user\_actions)

**描述：** 该表记录用户的行为，如收藏的招聘信息和投递的招聘信息。

| 字段名          | 类型          | 描述                                 |
| ------------ | ----------- | ---------------------------------- |
| id           | SERIAL      | 唯一标识                               |
| user\_id     | INT         | 用户ID，关联 `users` 表的 id              |
| favorite_job_ids      | INT4[]       | 招聘信息ID，关联 `job_recruitments` 表的 id,记录用户收藏的招聘信息id |
| application_job_ids      | INT4[]       | 
| favorite_job_ids      | INT4[]       | 招聘信息ID，关联 `job_recruitments` 表的 id,记录用户投递的招聘信息id
| created\_at  | TIMESTAMP   | 行为发生时间                             |

### 2.6 激活码表 (activation\_codes)

**描述：** 该表用于存储系统生成的激活码，验证用户的激活状态。

| 字段名            | 类型           | 描述                       |
| -------------- | ------------ | ------------------------ |
| id             | SERIAL       | 唯一标识                     |
| code           | VARCHAR(100) | 激活码                      |
| is\_active     | BOOLEAN      | 是否有效（用于控制激活码是否有效）        |
| is\_used       | BOOLEAN      | 是否被启用（用于控制当前激活码是否已经被用户占用）        |
| validity\_days | INT          | 激活码有效期（单位：天）             |
| user\_id       | INT          | 绑定的用户ID，关联 `users` 表的 id |
| created\_at    | TIMESTAMP    | 激活码创建时间            |

### 2.7 招聘信息表 (job\_recruitments)

**描述：** 该表记录招聘信息的详细内容，包括职位名称、公司、发布时间等。

| 字段名                         | 类型           | 描述                |
| --------------------------- | ------------ | ----------------- |
| id                          | SERIAL       | 唯一标识              |
| job\_title                  | text         | 招聘信息标题            |
| company                     | text         | 招聘公司              |
| description                 | text         | 对招聘公司的描述       |
| category_id                 | int4[]        | 对应18个分类id中的一个或者多个数字，用空格隔开  |
| post\_time                  | TIMESTAMP    | 发布时间              |
| last\_update                | TIMESTAMP    | 最后更新时间           |
| deadline                    | TIMESTAMP    | 截止投递时间           |
| job\_location               | text         | 工作地点              |
| job\_position               | text         | 招聘岗位              |
| job\_major                  | text         | 招聘专业              |
| job\_graduation\_year       | text         | 招聘对象（如：24届、25届）   |
| job\_education\_requirement | text         | 招聘学历要求（如：本科、研究生）  |
| application\_link           | VARCHAR(255) | 投递链接              |
| views\_count                | INT          | 浏览人数              |
| favorites\_count            | INT          | 收藏人数              |
| applications\_count         | INT          | 投递人数              |
| is\_active                  | BOOLEAN      | 是否有效（用于记录该条目是否过期） |
| created\_at                 | TIMESTAMP    | 创建时间              |
| updated\_at                 | TIMESTAMP    | 更新时间              |
| is_24hnew                | boolean    | 判断是否属于“24h新开分类”              |
| is_pregraduation       | boolean   | 判断是否属于“往届可投”分类                 |

### 2.8 分类表 (job\_categories)

**描述：** 该表用于存储招聘信息的分类，并记录每个分类下的有效招聘信息数量。

| 字段名                | 类型          | 描述                 |
| ------------------ | ----------- | ------------------ |
| id                 | SERIAL      | 唯一标识               |
| category           | text        | 分类名称（如：国企、外企等）     |
| category_number    | int         | 用于对外标识索引该分类（该值与id字段的值相同，也可以用id索引|
| active\_job\_count | INT         | 当前分类下的有效招聘信息数量     |
| is\_active         | BOOLEAN     | 是否有效（用于逻辑删除，默认为有效） |
其中，该表为固定表，具体信息如下，分类为枚举字段
id	category	category_number	active_job_count	is_active
1	国企	1	0	TRUE
2	外企	2	0	TRUE
3	事业单位	3	0	TRUE
4	银行/金融	4	0	TRUE
5	互联网	5	0	TRUE
6	制造业	6	0	TRUE
7	游戏	7	0	TRUE
8	快消/品牌	8	0	TRUE
9	生物医药	9	0	TRUE
10	汽车/新能源	10	0	TRUE
11	科技	11	0	TRUE
12	美妆	12	0	TRUE
13	传媒	13	0	TRUE
14	一线大厂	14	0	TRUE
15	小而美	15	0	TRUE
16	教育	16	0	TRUE
17	地产/建筑	17	0	TRUE
18	其他	18	0	TRUE
19  24h新开 19  0   TRUR
20  往届可投 20 0   TRUR


### 2.9 招聘信息与分类的多对多关系表 (job\_recruitment\_categories)

**描述：** 该表用于建立招聘信息和分类之间的多对多关系。

| 字段名          | 类型  | 描述                                 |
| ------------ | --- | ---------------------------------- |
| job\_id      | INT | 招聘信息ID，关联 `job_recruitments` 表的 id |
| category\_id | INT | 分类ID，关联 `job_categories` 表的 id     |

### 2.10 标签表 (tags)

**描述：** 该表用于存储各种标签，包括时间相关标签如"24h更新"、"即将截止"等。

| 字段名       | 类型           | 描述                      |
| --------- | ------------ | ----------------------- |
| id        | SERIAL       | 唯一标识                    |
| tag_name  | VARCHAR(100) | 标签名称                    |
| tag_type  | VARCHAR(50)  | 标签类型（如：time_sensitive） |
| is_active | BOOLEAN      | 是否有效                    |
| created_at | TIMESTAMP   | 创建时间                    |
当前拥有2种类型的tag，第一种是时间类型的tag（今日更新、昨日更新、三日内更新、七日内更新、即将截止），第二种是投递情况的tag（多人浏览、多人收藏、多人投递）

### 2.11 招聘信息标签关联表 (job\_tags)

**描述：** 该表用于建立招聘信息和标签之间的多对多关系。

| 字段名    | 类型  | 描述                             |
| ------ | --- | ------------------------------ |
| job_id | INT | 招聘信息ID，关联 `job_recruitments` 表 |
| tag_id | INT | 标签ID，关联 `tags` 表              |

### 2.12 统计报表表 (statistics)

**描述：** 该表用于存储系统的统计数据，便于生成报表和分析系统使用情况。

| 字段名                | 类型        | 描述        |
| ------------------ | --------- | --------- |
| id                 | SERIAL    | 唯一标识      |
| stat_date          | DATE      | 统计日期      |
| total_users        | INT       | 总用户数      |
| active_users       | INT       | 活跃用户数     |
| total_jobs         | INT       | 总招聘信息数    |
| active_jobs        | INT       | 有效招聘信息数   |
| total_applications | INT       | 总申请数      |
| total_favorites    | INT       | 总收藏数      |
| created_at         | TIMESTAMP | 创建时间      |

### 2.13 系统当前设置数据表 (system_settings)
id int
setting_key varchar(目前存在current_graduation_year)
setting_value varchar(目前字段为24，代表24届)
description text
created_at timestamp
updated_at timestamp

## 3. 数据库函数与触发器

### 3.1 更新招聘信息时自动更新分类表的有效条目数量

在每次新增或更新招聘信息时，系统会自动更新对应分类的有效招聘信息数量。

```sql
CREATE OR REPLACE FUNCTION update_job_category_count() 
RETURNS TRIGGER AS $$
BEGIN
    -- 更新对应分类的有效招聘信息条目数量
    UPDATE job_categories 
    SET active_job_count = (
        SELECT COUNT(*)
        FROM job_recruitment_categories jrc
        WHERE jrc.category_id = NEW.category_id AND jrc.job_id IN (SELECT id FROM job_recruitments WHERE is_active = TRUE AND deadline >= CURRENT_DATE)
    )
    WHERE id = NEW.category_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_job_category_count
AFTER INSERT OR UPDATE ON job_recruitments
FOR EACH ROW EXECUTE FUNCTION update_job_category_count();
```

### 3.2 创建激活码的函数

该函数用于生成一个新的激活码。

```sql
DO $$ 
DECLARE
    i INT;
    num_codes INT := 30;  -- 生成 30 个激活码
    validity_days INT := 30;  -- 每个激活码的有效期为 30 天
BEGIN
    FOR i IN 1..num_codes LOOP
        -- 调用 create_activation_code 函数批量生成激活码
        PERFORM create_activation_code(validity_days);
    END LOOP;
END $$;

SELECT * FROM activation_codes;
```

### 3.3 会员过期检查函数

该函数用于自动检查会员的过期状态，并更新会员的剩余天数和激活状态。

```sql
CREATE OR REPLACE FUNCTION check_membership_expiration()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE user_info
    SET membership_remaining_days = 
        CASE 
            WHEN membership_end_date IS NOT NULL THEN 
                GREATEST(0, EXTRACT(DAY FROM (membership_end_date - CURRENT_DATE)))
            ELSE 0
        END,
        is_active = CASE WHEN membership_end_date >= CURRENT_DATE THEN TRUE ELSE FALSE END
    WHERE membership_end_date IS NOT NULL;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
CREATE TRIGGER daily_membership_check
AFTER INSERT OR UPDATE ON user_info
FOR EACH ROW
EXECUTE FUNCTION check_membership_expiration();
```

### 3.4 招聘信息过期检查函数

该函数用于自动检查招聘信息的过期状态，并更新其激活状态。

```sql
CREATE OR REPLACE FUNCTION check_job_expiration()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE job_recruitments
    SET is_active = FALSE
    WHERE deadline < CURRENT_DATE AND is_active = TRUE;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
CREATE TRIGGER daily_job_check
AFTER INSERT OR UPDATE ON job_recruitments
FOR EACH ROW
EXECUTE FUNCTION check_job_expiration();
```

### 3.5 自动更新招聘信息时间标签的函数

该函数用于根据招聘信息的更新时间和截止时间自动生成时间相关的标签，如"24h更新"、"即将截止"等。

```sql
CREATE OR REPLACE FUNCTION update_job_time_tags()
RETURNS TRIGGER AS $$
DECLARE
    tag_id_24h INT;
    tag_id_yesterday INT;
    tag_id_3days INT;
    tag_id_7days INT;
    tag_id_deadline INT;
    current_date_val DATE := CURRENT_DATE;
    last_update_date DATE;
    deadline_date DATE;
    days_diff INT;
    days_to_deadline INT;
BEGIN
    -- 获取标签ID
    SELECT id INTO tag_id_24h FROM tags WHERE tag_name = '24h更新' AND tag_type = 'time_sensitive';
    SELECT id INTO tag_id_yesterday FROM tags WHERE tag_name = '昨天更新' AND tag_type = 'time_sensitive';
    SELECT id INTO tag_id_3days FROM tags WHERE tag_name = '3日内更新' AND tag_type = 'time_sensitive';
    SELECT id INTO tag_id_7days FROM tags WHERE tag_name = '7日内更新' AND tag_type = 'time_sensitive';
    SELECT id INTO tag_id_deadline FROM tags WHERE tag_name = '即将截止' AND tag_type = 'time_sensitive';
    
    -- 转换日期格式
    last_update_date := DATE(NEW.last_update);
    deadline_date := DATE(NEW.deadline);
    
    -- 计算日期差异
    days_diff := current_date_val - last_update_date;
    days_to_deadline := deadline_date - current_date_val;
    
    -- 先删除该招聘信息的所有时间相关标签
    DELETE FROM job_tags 
    WHERE job_id = NEW.id 
    AND tag_id IN (tag_id_24h, tag_id_yesterday, tag_id_3days, tag_id_7days, tag_id_deadline);
    
    -- 根据更新时间添加相应标签
    IF days_diff = 0 THEN
        -- 24h更新：当天更新
        INSERT INTO job_tags (job_id, tag_id) VALUES (NEW.id, tag_id_24h);
    ELSIF days_diff = 1 THEN
        -- 昨天更新
        INSERT INTO job_tags (job_id, tag_id) VALUES (NEW.id, tag_id_yesterday);
    ELSIF days_diff BETWEEN 2 AND 3 THEN
        -- 3日内更新
        INSERT INTO job_tags (job_id, tag_id) VALUES (NEW.id, tag_id_3days);
    ELSIF days_diff BETWEEN 4 AND 7 THEN
        -- 7日内更新
        INSERT INTO job_tags (job_id, tag_id) VALUES (NEW.id, tag_id_7days);
    END IF;
    
    -- 检查是否即将截止（3天内含3天）
    IF days_to_deadline BETWEEN 0 AND 3 AND deadline_date >= current_date_val THEN
        -- 即将截止
        INSERT INTO job_tags (job_id, tag_id) VALUES (NEW.id, tag_id_deadline);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
CREATE TRIGGER trigger_update_job_time_tags
AFTER INSERT OR UPDATE ON job_recruitments
FOR EACH ROW
EXECUTE FUNCTION update_job_time_tags();

-- 创建每日自动更新所有招聘信息标签的函数
CREATE OR REPLACE FUNCTION daily_update_all_job_tags()
RETURNS VOID AS $$
BEGIN
    -- 通过更新last_update字段为其当前值来触发每个记录的tag更新触发器
    UPDATE job_recruitments
    SET last_update = last_update
    WHERE is_active = TRUE;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;
```

3.6临时查看数据库结构
---------以下内容提供给你查看，仅作为临时查看用途---------
以下是当前比较新的supabase的所有函数、所有触发器、定时任务（pgagent）、tags函数、标签表与关联表的结构
1、查询所有表
| table_schema | table_name                 | table_type |
| ------------ | -------------------------- | ---------- |
| public       | activation_codes           | BASE TABLE |
| public       | admins                     | BASE TABLE |
| public       | job_action_updates         | BASE TABLE |
| public       | job_categories             | BASE TABLE |
| public       | job_recruitment_categories | BASE TABLE |
| public       | job_recruitments           | BASE TABLE |
| public       | job_tags                   | BASE TABLE |
| public       | messages                   | BASE TABLE |
| public       | statistics                 | BASE TABLE |
| public       | system_data                | BASE TABLE |
| public       | system_settings            | BASE TABLE |
| public       | tags                       | BASE TABLE |
| public       | user_actions               | BASE TABLE |
| public       | user_info                  | BASE TABLE |
| public       | users                      | BASE TABLE |
2、查询表结构（列信息）
| table_name                 | column_name               | data_type                   | column_default                               | is_nullable |
| -------------------------- | ------------------------- | --------------------------- | -------------------------------------------- | ----------- |
| activation_codes           | id                        | integer                     | nextval('activation_codes_id_seq'::regclass) | NO          |
| activation_codes           | code                      | character varying           | null                                         | NO          |
| activation_codes           | is_active                 | boolean                     | true                                         | YES         |
| activation_codes           | validity_days             | integer                     | null                                         | YES         |
| activation_codes           | user_id                   | integer                     | null                                         | YES         |
| activation_codes           | created_at                | timestamp without time zone | CURRENT_TIMESTAMP                            | YES         |
| activation_codes           | is_used                   | boolean                     | false                                        | YES         |
| admins                     | id                        | integer                     | nextval('admins_id_seq'::regclass)           | NO          |
| admins                     | admin_username            | character varying           | null                                         | NO          |
| admins                     | admin_password            | character varying           | null                                         | NO          |
| admins                     | admin_permissions         | character varying           | null                                         | YES         |
| admins                     | is_active                 | boolean                     | true                                         | YES         |
| admins                     | created_at                | timestamp without time zone | CURRENT_TIMESTAMP                            | YES         |
| admins                     | updated_at                | timestamp without time zone | CURRENT_TIMESTAMP                            | YES         |
| job_action_updates         | id                        | integer                     | 1                                            | NO          |
| job_action_updates         | last_update               | timestamp with time zone    | CURRENT_TIMESTAMP                            | YES         |
| job_action_updates         | update_needed             | boolean                     | true                                         | YES         |
| job_action_updates         | last_processed            | timestamp with time zone    | null                                         | YES         |
| job_categories             | id                        | integer                     | nextval('job_categories_id_seq'::regclass)   | NO          |
| job_categories             | category                  | text                        | null                                         | YES         |
| job_categories             | active_job_count          | integer                     | 0                                            | YES         |
| job_categories             | is_active                 | boolean                     | true                                         | YES         |
| job_categories             | category_number           | integer                     | null                                         | NO          |
| job_recruitment_categories | job_id                    | integer                     | null                                         | NO          |
| job_recruitment_categories | category_id               | integer                     | null                                         | NO          |
| job_recruitments           | id                        | integer                     | nextval('job_recruitments_id_seq'::regclass) | NO          |
| job_recruitments           | job_title                 | character varying           | null                                         | YES         |
| job_recruitments           | company                   | character varying           | null                                         | YES         |
| job_recruitments           | post_time                 | timestamp without time zone | null                                         | YES         |
| job_recruitments           | last_update               | timestamp without time zone | null                                         | YES         |
| job_recruitments           | deadline                  | timestamp without time zone | null                                         | YES         |
| job_recruitments           | job_location              | character varying           | null                                         | YES         |
| job_recruitments           | job_position              | character varying           | null                                         | YES         |
| job_recruitments           | job_major                 | character varying           | null                                         | YES         |
| job_recruitments           | job_graduation_year       | character varying           | null                                         | YES         |
| job_recruitments           | job_education_requirement | character varying           | null                                         | YES         |
| job_recruitments           | application_link          | character varying           | null                                         | YES         |
| job_recruitments           | views_count               | integer                     | 0                                            | YES         |
| job_recruitments           | favorites_count           | integer                     | 0                                            | YES         |
| job_recruitments           | applications_count        | integer                     | 0                                            | YES         |
| job_recruitments           | is_active                 | boolean                     | true                                         | YES         |
| job_recruitments           | created_at                | timestamp without time zone | CURRENT_TIMESTAMP                            | YES         |
| job_recruitments           | updated_at                | timestamp without time zone | CURRENT_TIMESTAMP                            | YES         |
| job_recruitments           | description               | text                        | null                                         | YES         |
| job_recruitments           | category_id               | ARRAY                       | null                                         | YES         |
| job_recruitments           | is_24hnew                 | boolean                     | false                                        | YES         |
| job_recruitments           | is_pregraduation          | boolean                     | false                                        | YES         |
| job_tags                   | job_id                    | integer                     | null                                         | NO          |
| job_tags                   | time_tag_id               | integer                     | null                                         | NO          |
| job_tags                   | action_tag_id             | integer                     | null                                         | YES         |
| messages                   | id                        | bigint                      | null                                         | NO          |
| messages                   | content                   | text                        | null                                         | NO          |
| messages                   | created_at                | timestamp with time zone    | now()                                        | YES         |
| statistics                 | id                        | integer                     | nextval('statistics_id_seq'::regclass)       | NO          |
| statistics                 | stat_date                 | date                        | CURRENT_DATE                                 | YES         |
| statistics                 | total_users               | integer                     | null                                         | YES         |
| statistics                 | active_users              | integer                     | null                                         | YES         |
| statistics                 | total_jobs                | integer                     | null                                         | YES         |
| statistics                 | active_jobs               | integer                     | null                                         | YES         |
| statistics                 | total_applications        | integer                     | null                                         | YES         |
| statistics                 | total_favorites           | integer                     | null                                         | YES         |
| statistics                 | created_at                | timestamp without time zone | CURRENT_TIMESTAMP                            | YES         |
| system_data                | id                        | integer                     | nextval('system_data_id_seq'::regclass)      | NO          |
| system_data                | current_version           | character varying           | null                                         | YES         |
| system_data                | last_update               | timestamp without time zone | null                                         | YES         |
| system_settings            | id                        | integer                     | nextval('system_settings_id_seq'::regclass)  | NO          |
| system_settings            | setting_key               | character varying           | null                                         | NO          |
| system_settings            | setting_value             | character varying           | null                                         | NO          |
| system_settings            | description               | text                        | null                                         | YES         |
| system_settings            | created_at                | timestamp without time zone | CURRENT_TIMESTAMP                            | YES         |
| system_settings            | updated_at                | timestamp without time zone | CURRENT_TIMESTAMP                            | YES         |
| tags                       | id                        | integer                     | nextval('tags_id_seq'::regclass)             | NO          |
| tags                       | tag_name                  | character varying           | null                                         | NO          |
| tags                       | tag_type                  | character varying           | null                                         | NO          |
| tags                       | is_active                 | boolean                     | true                                         | YES         |
| tags                       | created_at                | timestamp without time zone | CURRENT_TIMESTAMP                            | YES         |
| user_actions               | id                        | integer                     | nextval('user_actions_id_seq'::regclass)     | NO          |
| user_actions               | user_id                   | integer                     | null                                         | NO          |
| user_actions               | favorite_job_ids          | ARRAY                       | '{}'::integer[]                              | YES         |
| user_actions               | application_job_ids       | ARRAY                       | '{}'::integer[]                              | YES         |
| user_actions               | updated_at                | timestamp without time zone | CURRENT_TIMESTAMP                            | YES         |
| user_actions               | created_at                | timestamp without time zone | CURRENT_TIMESTAMP                            | YES         |
| user_info                  | id                        | integer                     | nextval('user_info_id_seq'::regclass)        | NO          |
| user_info                  | user_id                   | integer                     | null                                         | YES         |
| user_info                  | membership_type           | character varying           | null                                         | YES         |
| user_info                  | membership_code           | character varying           | null                                         | YES         |
| user_info                  | membership_start_date     | timestamp without time zone | null                                         | YES         |
| user_info                  | membership_end_date       | timestamp without time zone | null                                         | YES         |
| user_info                  | membership_remaining_days | integer                     | null                                         | YES         |
| user_info                  | is_active                 | boolean                     | true                                         | YES         |
| user_info                  | created_at                | timestamp without time zone | CURRENT_TIMESTAMP                            | YES         |
| user_info                  | updated_at                | timestamp without time zone | CURRENT_TIMESTAMP                            | YES         |
| users                      | id                        | integer                     | nextval('users_id_seq'::regclass)            | NO          |
| users                      | username                  | character varying           | null                                         | NO          |
| users                      | account                   | character varying           | null                                         | NO          |
| users                      | password                  | character varying           | null                                         | NO          |
| users                      | is_active                 | boolean                     | true                                         | YES         |
| users                      | created_at                | timestamp without time zone | CURRENT_TIMESTAMP                            | YES         |
| users                      | updated_at                | timestamp without time zone | CURRENT_TIMESTAMP                            | YES         |
3、查询外键关联结构
| table_schema | constraint_name                             | table_name                 | column_name | foreign_table_schema | foreign_table_name | foreign_column_name |
| ------------ | ------------------------------------------- | -------------------------- | ----------- | -------------------- | ------------------ | ------------------- |
| public       | activation_codes_user_id_fkey               | activation_codes           | user_id     | public               | users              | id                  |
| public       | job_recruitment_categories_category_id_fkey | job_recruitment_categories | category_id | public               | job_categories     | id                  |
| public       | job_recruitment_categories_job_id_fkey      | job_recruitment_categories | job_id      | public               | job_recruitments   | id                  |
| public       | job_tags_job_id_fkey                        | job_tags                   | job_id      | public               | job_recruitments   | id                  |
| public       | job_tags_tag_id_fkey                        | job_tags                   | time_tag_id | public               | tags               | id                  |
| public       | fk_user_actions_user                        | user_actions               | user_id     | public               | users              | id                  |
| public       | user_info_user_id_fkey                      | user_info                  | user_id     | public               | users              | id                  |
4、索引结构
| table_name                 | index_name                         | column_name     | is_unique |
| -------------------------- | ---------------------------------- | --------------- | --------- |
| activation_codes           | activation_codes_code_key          | code            | true      |
| activation_codes           | activation_codes_pkey              | id              | true      |
| admins                     | admins_admin_username_key          | admin_username  | true      |
| admins                     | admins_pkey                        | id              | true      |
| job_action_updates         | job_action_updates_pkey            | id              | true      |
| job_categories             | job_categories_category_number_key | category_number | true      |
| job_categories             | job_categories_pkey                | id              | true      |
| job_recruitment_categories | job_recruitment_categories_pkey    | category_id     | true      |
| job_recruitment_categories | job_recruitment_categories_pkey    | job_id          | true      |
| job_recruitments           | job_recruitments_pkey              | id              | true      |
| job_tags                   | job_tags_pkey                      | job_id          | true      |
| job_tags                   | job_tags_pkey                      | time_tag_id     | true      |
| messages                   | messages_pkey                      | id              | true      |
| statistics                 | statistics_pkey                    | id              | true      |
| system_data                | system_data_pkey                   | id              | true      |
| system_settings            | system_settings_pkey               | id              | true      |
| system_settings            | system_settings_setting_key_key    | setting_key     | true      |
| tags                       | tags_pkey                          | id              | true      |
| user_actions               | idx_user_actions_user_id           | user_id         | false     |
| user_actions               | unique_user_action                 | user_id         | true      |
| user_actions               | user_actions_pkey                  | id              | true      |
| user_info                  | user_info_pkey                     | id              | true      |
| users                      | users_account_key                  | account         | true      |
| users                      | users_pkey                         | id              | true      |
| users                      | users_username_key                 | username        | true      |
5、查询所有触发器
| trigger_name                  | event_manipulation | action_timing | action_orientation | action_statement                                       | table_name       |
| ----------------------------- | ------------------ | ------------- | ------------------ | ------------------------------------------------------ | ---------------- |
| after_job_recruitment_change  | DELETE             | AFTER         | STATEMENT          | EXECUTE FUNCTION update_category_counts()              | job_recruitments |
| after_job_recruitment_change  | UPDATE             | AFTER         | STATEMENT          | EXECUTE FUNCTION update_category_counts()              | job_recruitments |
| after_job_recruitment_change  | INSERT             | AFTER         | STATEMENT          | EXECUTE FUNCTION update_category_counts()              | job_recruitments |
| after_job_recruitment_changes | DELETE             | AFTER         | STATEMENT          | EXECUTE FUNCTION trigger_update_dynamic_categories()   | job_recruitments |
| after_job_recruitment_changes | UPDATE             | AFTER         | STATEMENT          | EXECUTE FUNCTION trigger_update_dynamic_categories()   | job_recruitments |
| after_job_recruitment_changes | INSERT             | AFTER         | STATEMENT          | EXECUTE FUNCTION trigger_update_dynamic_categories()   | job_recruitments |
| before_job_recruitment_change | INSERT             | BEFORE        | ROW                | EXECUTE FUNCTION update_job_classification_on_change() | job_recruitments |
| before_job_recruitment_change | UPDATE             | BEFORE        | ROW                | EXECUTE FUNCTION update_job_classification_on_change() | job_recruitments |
| daily_job_check               | UPDATE             | AFTER         | ROW                | EXECUTE FUNCTION check_job_expiration()                | job_recruitments |
| daily_job_check               | INSERT             | AFTER         | ROW                | EXECUTE FUNCTION check_job_expiration()                | job_recruitments |
| trigger_job_counts_change     | UPDATE             | AFTER         | ROW                | EXECUTE FUNCTION trigger_update_job_action_tags()      | job_recruitments |
| trigger_update_job_time_tags  | UPDATE             | AFTER         | ROW                | EXECUTE FUNCTION update_job_time_tags()                | job_recruitments |
| trigger_update_job_time_tags  | INSERT             | AFTER         | ROW                | EXECUTE FUNCTION update_job_time_tags()                | job_recruitments |
| update_all_categories_trigger | UPDATE             | AFTER         | STATEMENT          | EXECUTE FUNCTION update_all_category_counts_trigger()  | job_recruitments |
| update_all_categories_trigger | INSERT             | AFTER         | STATEMENT          | EXECUTE FUNCTION update_all_category_counts_trigger()  | job_recruitments |
| update_all_categories_trigger | DELETE             | AFTER         | STATEMENT          | EXECUTE FUNCTION update_all_category_counts_trigger()  | job_recruitments |
| daily_membership_check        | UPDATE             | AFTER         | ROW                | EXECUTE FUNCTION check_membership_expiration()         | user_info        |
| daily_membership_check        | INSERT             | AFTER         | ROW                | EXECUTE FUNCTION check_membership_expiration()         | user_info        |
6、查询触发器信息
| trigger_name                  | table_name       | trigger_definition                                                                                                                                                                                  |
| ----------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| after_job_recruitment_change  | job_recruitments | CREATE TRIGGER after_job_recruitment_change AFTER INSERT OR DELETE OR UPDATE ON public.job_recruitments FOR EACH STATEMENT EXECUTE FUNCTION update_category_counts()                                |
| after_job_recruitment_changes | job_recruitments | CREATE TRIGGER after_job_recruitment_changes AFTER INSERT OR DELETE OR UPDATE ON public.job_recruitments FOR EACH STATEMENT EXECUTE FUNCTION trigger_update_dynamic_categories()                    |
| before_job_recruitment_change | job_recruitments | CREATE TRIGGER before_job_recruitment_change BEFORE INSERT OR UPDATE ON public.job_recruitments FOR EACH ROW EXECUTE FUNCTION update_job_classification_on_change()                                 |
| daily_job_check               | job_recruitments | CREATE TRIGGER daily_job_check AFTER INSERT OR UPDATE ON public.job_recruitments FOR EACH ROW EXECUTE FUNCTION check_job_expiration()                                                               |
| trigger_job_counts_change     | job_recruitments | CREATE TRIGGER trigger_job_counts_change AFTER UPDATE OF views_count, favorites_count, applications_count ON public.job_recruitments FOR EACH ROW EXECUTE FUNCTION trigger_update_job_action_tags() |
| trigger_update_job_time_tags  | job_recruitments | CREATE TRIGGER trigger_update_job_time_tags AFTER INSERT OR UPDATE ON public.job_recruitments FOR EACH ROW EXECUTE FUNCTION update_job_time_tags()                                                  |
| update_all_categories_trigger | job_recruitments | CREATE TRIGGER update_all_categories_trigger AFTER INSERT OR DELETE OR UPDATE ON public.job_recruitments FOR EACH STATEMENT EXECUTE FUNCTION update_all_category_counts_trigger()                   |
| daily_membership_check        | user_info        | CREATE TRIGGER daily_membership_check AFTER INSERT OR UPDATE ON public.user_info FOR EACH ROW EXECUTE FUNCTION check_membership_expiration()                                                        |
7、查询所有函数
| schema_name | function_name                       | function_definition                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ----------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| public      | add_application_job                 | CREATE OR REPLACE FUNCTION public.add_application_job(user_id_param integer, job_id_param integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
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
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| public      | add_favorite_job                    | CREATE OR REPLACE FUNCTION public.add_favorite_job(user_id_param integer, job_id_param integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
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
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| public      | check_job_expiration                | CREATE OR REPLACE FUNCTION public.check_job_expiration()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE job_recruitments
    SET is_active = FALSE
    WHERE deadline < CURRENT_DATE AND is_active = TRUE;

    RETURN NULL;
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| public      | check_membership_expiration         | CREATE OR REPLACE FUNCTION public.check_membership_expiration()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE user_info
    SET membership_remaining_days = 
        CASE 
            WHEN membership_end_date IS NOT NULL THEN 
                GREATEST(0, EXTRACT(DAY FROM (membership_end_date - CURRENT_DATE)))
            ELSE 0
        END,
        is_active = CASE WHEN membership_end_date >= CURRENT_DATE THEN TRUE ELSE FALSE END
    WHERE membership_end_date IS NOT NULL;

    RETURN NULL;
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| public      | count_active_jobs_by_category       | CREATE OR REPLACE FUNCTION public.count_active_jobs_by_category(category_id integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
  count_val integer;
BEGIN
  -- 计算指定分类的有效招聘信息数量
  SELECT COUNT(*) INTO count_val
  FROM job_recruitments
  WHERE 
    is_active = TRUE 
    AND deadline >= CURRENT_DATE
    AND category_id @> ARRAY[category_id]; 
  
  RETURN count_val;
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| public      | create_activation_code              | CREATE OR REPLACE FUNCTION public.create_activation_code(validity_days integer)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    new_code VARCHAR(100);
BEGIN
    -- 生成随机激活码
    new_code := 'ACT' || substring(md5(random()::text), 1, 8);  -- 生成一个随机激活码
    RAISE NOTICE 'Generated code: %', new_code;  -- 输出生成的激活码

    -- 将激活码插入到 activation_codes 表（不绑定用户）
    INSERT INTO activation_codes (code, validity_days, is_active) 
    VALUES (new_code, validity_days, TRUE);

    RAISE NOTICE 'Code inserted into the table';  -- 输出插入成功信息

    -- 返回生成的激活码
    RETURN new_code;
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| public      | create_activation_code              | CREATE OR REPLACE FUNCTION public.create_activation_code(user_id integer, validity_days integer)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    new_code VARCHAR(100);
BEGIN
    -- 生成随机激活码
    new_code := 'ACT' || substring(md5(random()::text), 1, 8);  -- 生成一个随机激活码
    -- 将激活码插入到 activation_codes 表
    INSERT INTO activation_codes (code, validity_days, user_id) 
    VALUES (new_code, validity_days, user_id);
    
    -- 返回生成的激活码
    RETURN new_code;
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| public      | daily_update_all_job_tags           | CREATE OR REPLACE FUNCTION public.daily_update_all_job_tags()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- 通过更新last_update字段为其当前值来触发每个记录的tag更新触发器
    UPDATE job_recruitments
    SET last_update = last_update
    WHERE is_active = TRUE;
    
    RETURN;
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| public      | daily_update_dynamic_categories     | CREATE OR REPLACE FUNCTION public.daily_update_dynamic_categories()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- 更新动态分类计数
    PERFORM update_dynamic_category_count();
    RETURN;
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| public      | daily_update_job_classifications    | CREATE OR REPLACE FUNCTION public.daily_update_job_classifications()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- 执行更新函数
    PERFORM update_job_classification_flags();
    RETURN;
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| public      | has_previous_graduate               | CREATE OR REPLACE FUNCTION public.has_previous_graduate(graduation_year text, current_year integer)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
    text_parts TEXT[];
    part TEXT;
    num_part TEXT;
    year_num INT;
    has_previous BOOLEAN := FALSE;
BEGIN
    -- 空值检查
    IF graduation_year IS NULL OR graduation_year = '' THEN
        RETURN FALSE;
    END IF;
    
    -- 关键词检查
    IF graduation_year ILIKE '%往届%' OR graduation_year ILIKE '%不限%' THEN
        RETURN TRUE;
    END IF;
    
    -- 将文本分割为多个部分（按空格、逗号、斜杠等分隔符）
    text_parts := regexp_split_to_array(graduation_year, '[,\s/、]+');
    
    -- 遍历每个部分
    FOREACH part IN ARRAY text_parts LOOP
        -- 提取数字部分
        num_part := regexp_replace(part, '[^0-9]', '', 'g');
        
        -- 如果提取到数字
        IF num_part <> '' THEN
            BEGIN
                year_num := CAST(num_part AS INT);
                
                -- 检查是否小于当前应届届数
                IF year_num < current_year THEN
                    has_previous := TRUE;
                    EXIT;
                END IF;
            EXCEPTION WHEN OTHERS THEN
                -- 忽略转换错误
                CONTINUE;
            END;
        END IF;
    END LOOP;
    
    RETURN has_previous;
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| public      | hourly_update_action_tags           | CREATE OR REPLACE FUNCTION public.hourly_update_action_tags()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- 执行行为标签更新函数
    PERFORM update_job_action_tags();
    RETURN;
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| public      | increment_job_views                 | CREATE OR REPLACE FUNCTION public.increment_job_views(job_id_param integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE job_recruitments
  SET views_count = views_count + 1
  WHERE id = job_id_param;
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| public      | is_job_applied                      | CREATE OR REPLACE FUNCTION public.is_job_applied(user_id_param integer, job_id_param integer)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
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
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| public      | is_job_favorited                    | CREATE OR REPLACE FUNCTION public.is_job_favorited(user_id_param integer, job_id_param integer)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
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
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| public      | is_previous_graduate                | CREATE OR REPLACE FUNCTION public.is_previous_graduate(graduation_year text, current_year integer)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
    years TEXT[];
    year_str TEXT;
    year_num INT;
    contains_previous BOOLEAN := FALSE;
BEGIN
    -- 如果包含明显的往届关键词，直接返回true
    IF graduation_year ILIKE '%往届%' OR graduation_year ILIKE '%不限%' THEN
        RETURN TRUE;
    END IF;
    
    -- 尝试从字符串中提取所有可能的届数
    -- 假设届数可能用逗号、空格、斜杠等分隔
    years := regexp_split_to_array(graduation_year, '[,\s/、]+');
    
    -- 遍历提取的届数
    FOREACH year_str IN ARRAY years LOOP
        -- 尝试提取数字
        year_num := NULL;
        BEGIN
            -- 提取数字部分
            year_str := regexp_replace(year_str, '[^0-9]', '', 'g');
            IF year_str <> '' THEN
                year_num := year_str::INT;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            -- 如果转换失败，忽略此部分
            year_num := NULL;
        END;
        
        -- 如果成功提取到数字且小于当前届数，标记为往届可投
        IF year_num IS NOT NULL AND year_num < current_year THEN
            contains_previous := TRUE;
            EXIT; -- 找到一个就可以退出循环
        END IF;
    END LOOP;
    
    RETURN contains_previous;
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| public      | process_pending_job_action_updates  | CREATE OR REPLACE FUNCTION public.process_pending_job_action_updates()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    needs_update BOOLEAN;
    last_update TIMESTAMP;
    min_interval INTERVAL := '5 minutes'::INTERVAL;
BEGIN
    -- 检查是否有待处理的更新
    SELECT 
        update_needed,
        last_update
    INTO 
        needs_update,
        last_update
    FROM job_action_updates
    WHERE id = 1;
    
    -- 如果需要更新并且距离上次处理间隔超过最小阈值
    IF needs_update = TRUE AND (
        last_processed IS NULL OR 
        CURRENT_TIMESTAMP - last_processed > min_interval
    ) THEN
        -- 调用更新函数
        PERFORM update_job_action_tags();
        
        RAISE NOTICE '检测到待处理的行为标签更新，已执行更新。';
    ELSE
        RAISE NOTICE '没有需要处理的行为标签更新，或者距离上次处理时间过短。';
    END IF;
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| public      | refresh_all_category_counts         | CREATE OR REPLACE FUNCTION public.refresh_all_category_counts()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    PERFORM update_category_counts_core();
    RETURN;
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| public      | remove_application_job              | CREATE OR REPLACE FUNCTION public.remove_application_job(user_id_param integer, job_id_param integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
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
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| public      | remove_favorite_job                 | CREATE OR REPLACE FUNCTION public.remove_favorite_job(user_id_param integer, job_id_param integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
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
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| public      | trigger_update_dynamic_categories   | CREATE OR REPLACE FUNCTION public.trigger_update_dynamic_categories()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- 调用更新函数
    PERFORM update_dynamic_category_count();
    RETURN NEW;
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| public      | trigger_update_job_action_tags      | CREATE OR REPLACE FUNCTION public.trigger_update_job_action_tags()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- 如果views_count、favorites_count或applications_count发生变化，直接调用更新函数
    IF (OLD.views_count <> NEW.views_count) OR 
       (OLD.favorites_count <> NEW.favorites_count) OR 
       (OLD.applications_count <> NEW.applications_count) THEN
        
        RAISE NOTICE '检测到招聘信息计数变更: job_id=%, views=%->%, favorites=%->%, applications=%->%', 
            NEW.id, OLD.views_count, NEW.views_count, 
            OLD.favorites_count, NEW.favorites_count, 
            OLD.applications_count, NEW.applications_count;
        
        -- 直接调用更新函数，不再通过job_action_updates表
        PERFORM update_job_action_tags();
    END IF;
    
    RETURN NEW;
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| public      | update_all_category_counts_trigger  | CREATE OR REPLACE FUNCTION public.update_all_category_counts_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    PERFORM update_category_counts_core();
    RETURN NULL;
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| public      | update_category_counts              | CREATE OR REPLACE FUNCTION public.update_category_counts()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- 调用内部函数进行实际工作
    PERFORM update_category_counts_internal();
    RETURN NULL; -- 对于AFTER触发器，返回NULL
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| public      | update_category_counts_core         | CREATE OR REPLACE FUNCTION public.update_category_counts_core()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    cat_id INT;
    current_grad_year INT;
BEGIN
    -- 获取当前应届届数设置
    SELECT CAST(setting_value AS INT) INTO current_grad_year
    FROM system_settings
    WHERE setting_key = 'current_graduation_year';
    
    -- 如果没有设置，默认为25届
    IF current_grad_year IS NULL THEN
        current_grad_year := 25;
    END IF;

    -- 先更新普通分类计数（id 1-18）
    FOR cat_id IN 1..18 LOOP
        UPDATE job_categories
        SET active_job_count = (
            SELECT COUNT(*)
            FROM job_recruitments jr
            WHERE jr.is_active = TRUE 
            AND cat_id = ANY(jr.category_id)
        )
        WHERE id = cat_id;
    END LOOP;
    
    -- 更新"24h新开"分类的计数（id=19）
    UPDATE job_categories
    SET active_job_count = (
        SELECT COUNT(*)
        FROM job_recruitments
        WHERE is_active = TRUE 
        AND DATE(last_update) = CURRENT_DATE
    )
    WHERE id = 19;
    
    -- 更新"往届可投"分类的计数（id=20），使用改进的判定逻辑
    UPDATE job_categories
    SET active_job_count = (
        SELECT COUNT(*)
        FROM job_recruitments
        WHERE is_active = TRUE
        AND has_previous_graduate(job_graduation_year, current_grad_year)
    )
    WHERE id = 20;
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| public      | update_category_counts_internal     | CREATE OR REPLACE FUNCTION public.update_category_counts_internal()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- 更新普通分类的计数(1-18)
    FOR i IN 1..18 LOOP
        UPDATE job_categories
        SET active_job_count = (
            SELECT COUNT(*)
            FROM job_recruitments
            WHERE is_active = TRUE AND i = ANY(category_id)
        )
        WHERE id = i;
    END LOOP;
    
    -- 更新"24h新开"分类的计数(19)
    UPDATE job_categories
    SET active_job_count = (
        SELECT COUNT(*)
        FROM job_recruitments
        WHERE is_active = TRUE AND is_24hnew = TRUE
    )
    WHERE id = 19;
    
    -- 更新"往届可投"分类的计数(20)
    UPDATE job_categories
    SET active_job_count = (
        SELECT COUNT(*)
        FROM job_recruitments
        WHERE is_active = TRUE AND is_pregraduation = TRUE
    )
    WHERE id = 20;
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| public      | update_current_graduation_year      | CREATE OR REPLACE FUNCTION public.update_current_graduation_year(new_year integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- 更新设置表中的应届届数
    UPDATE system_settings
    SET setting_value = new_year::TEXT,
        updated_at = CURRENT_TIMESTAMP
    WHERE setting_key = 'current_graduation_year';
    
    -- 如果设置不存在，则插入
    IF NOT FOUND THEN
        INSERT INTO system_settings (setting_key, setting_value, description)
        VALUES ('current_graduation_year', new_year::TEXT, '当前应届毕业届数，用于判断往届可投');
    END IF;
    
    -- 立即更新分类计数
    PERFORM update_dynamic_category_count();
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| public      | update_dynamic_category_count       | CREATE OR REPLACE FUNCTION public.update_dynamic_category_count()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    current_grad_year INT;
    job_record RECORD;
    previous_grad_count INT := 0;
BEGIN
    -- 获取当前应届届数设置
    SELECT CAST(setting_value AS INT) INTO current_grad_year
    FROM system_settings
    WHERE setting_key = 'current_graduation_year';
    
    -- 如果没有设置，默认为25届
    IF current_grad_year IS NULL THEN
        current_grad_year := 25;
    END IF;

    -- 更新"24h新开"分类的计数（id=19）
    UPDATE job_categories
    SET active_job_count = (
        SELECT COUNT(*)
        FROM job_recruitments
        WHERE is_active = TRUE 
        AND DATE(last_update) = CURRENT_DATE
    )
    WHERE id = 19;
    
    -- 使用改进的逻辑计算"往届可投"的数量
    FOR job_record IN 
        SELECT id, job_graduation_year 
        FROM job_recruitments 
        WHERE is_active = TRUE
    LOOP
        IF is_previous_graduate(job_record.job_graduation_year, current_grad_year) THEN
            previous_grad_count := previous_grad_count + 1;
        END IF;
    END LOOP;
    
    -- 更新"往届可投"分类的计数
    UPDATE job_categories
    SET active_job_count = previous_grad_count
    WHERE id = 20;
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| public      | update_job_action_tags              | CREATE OR REPLACE FUNCTION public.update_job_action_tags()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    tag_id_views INT := 7;   -- 多人浏览
    tag_id_favs INT := 8;    -- 多人收藏
    tag_id_apps INT := 9;    -- 多人投递
    total_jobs INT;
    target_count INT;        -- 每类标签目标数量
    apps_count INT := 0;
    favs_count INT := 0;
    views_count INT := 0;
BEGIN
    -- 获取有效招聘信息总数
    SELECT COUNT(*) INTO total_jobs 
    FROM job_recruitments
    WHERE is_active = TRUE;
    
    -- 计算每种标签数量（20%）
    target_count := GREATEST(FLOOR(total_jobs * 0.2), 1);
    
    RAISE NOTICE '总职位数: %，每类标签目标数: %', total_jobs, target_count;
    
    -- 清空当前的行为标签
    UPDATE job_tags
    SET action_tag_id = NULL
    WHERE action_tag_id IS NOT NULL;
    
    -- 创建临时表存储标签分配结果
    DROP TABLE IF EXISTS temp_action_tags;
    CREATE TEMP TABLE temp_action_tags (
        job_id INT PRIMARY KEY,  -- 确保一个职位只有一个标签
        action_tag_id INT
    );
    
    -- 1. 先分配"多人投递"标签
    INSERT INTO temp_action_tags (job_id, action_tag_id)
    SELECT jr.id, tag_id_apps
    FROM job_recruitments jr
    WHERE jr.is_active = TRUE AND jr.applications_count > 0
    ORDER BY jr.applications_count DESC, jr.id
    LIMIT target_count;
    
    -- 2. 再分配"多人收藏"标签（排除已有标签的）
    INSERT INTO temp_action_tags (job_id, action_tag_id)
    SELECT jr.id, tag_id_favs
    FROM job_recruitments jr
    WHERE jr.is_active = TRUE 
      AND jr.favorites_count > 0
      AND NOT EXISTS (SELECT 1 FROM temp_action_tags t WHERE t.job_id = jr.id)
    ORDER BY jr.favorites_count DESC, jr.id
    LIMIT target_count;
    
    -- 3. 最后分配"多人浏览"标签（排除已有标签的）
    INSERT INTO temp_action_tags (job_id, action_tag_id)
    SELECT jr.id, tag_id_views
    FROM job_recruitments jr
    WHERE jr.is_active = TRUE 
      AND jr.views_count > 0
      AND NOT EXISTS (SELECT 1 FROM temp_action_tags t WHERE t.job_id = jr.id)
    ORDER BY jr.views_count DESC, jr.id
    LIMIT target_count;
    
    -- 统计各类型标签数量
    SELECT COUNT(*) INTO apps_count FROM temp_action_tags WHERE action_tag_id = tag_id_apps;
    SELECT COUNT(*) INTO favs_count FROM temp_action_tags WHERE action_tag_id = tag_id_favs;
    SELECT COUNT(*) INTO views_count FROM temp_action_tags WHERE action_tag_id = tag_id_views;
    
    -- 更新到job_tags表
    UPDATE job_tags jt
    SET action_tag_id = t.action_tag_id
    FROM temp_action_tags t
    WHERE jt.job_id = t.job_id;
    
    -- 插入不存在的记录
    INSERT INTO job_tags (job_id, time_tag_id, action_tag_id)
    SELECT t.job_id, 1, t.action_tag_id
    FROM temp_action_tags t
    WHERE NOT EXISTS (
        SELECT 1 FROM job_tags jt WHERE jt.job_id = t.job_id
    );
    
    RAISE NOTICE '行为标签更新完成: 多人投递=%, 多人收藏=%, 多人浏览=%', 
        apps_count, favs_count, views_count;
    
    -- 清理临时表
    DROP TABLE IF EXISTS temp_action_tags;
END;
$function$
 |
| public      | update_job_classification_flags     | CREATE OR REPLACE FUNCTION public.update_job_classification_flags()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    current_grad_year INT;
    r RECORD;
    matched_years TEXT[];
    year_text TEXT;
    year_num INT;
BEGIN
    -- 获取当前应届届数设置
    SELECT CAST(setting_value AS INT) INTO current_grad_year
    FROM system_settings
    WHERE setting_key = 'current_graduation_year';
    
    -- 如果没有设置，默认为25届
    IF current_grad_year IS NULL THEN
        current_grad_year := 25;
    END IF;

    -- 更新24h新开标记
    UPDATE job_recruitments 
    SET is_24hnew = (DATE(last_update) = CURRENT_DATE)
    WHERE is_active = TRUE;
    
    -- 更新往届可投标记
    -- 先将所有招聘信息的is_pregraduation字段重置为false
    UPDATE job_recruitments 
    SET is_pregraduation = FALSE
    WHERE is_active = TRUE;
    
    -- 先处理包含明确关键词的情况
    UPDATE job_recruitments
    SET is_pregraduation = TRUE
    WHERE is_active = TRUE 
    AND (job_graduation_year ILIKE '%往届%' OR job_graduation_year ILIKE '%不限%');
    
    -- 处理包含数字的情况，需要逐条检查
    FOR r IN (SELECT id, job_graduation_year FROM job_recruitments 
              WHERE is_active = TRUE AND is_pregraduation = FALSE) LOOP
        -- 查找所有符合条件的数字
        FOR matched_years IN 
            SELECT regexp_matches(r.job_graduation_year, '(\d+)', 'g')
        LOOP
            BEGIN
                year_num := CAST(matched_years[1] AS INT);
                IF year_num < current_grad_year THEN
                    UPDATE job_recruitments SET is_pregraduation = TRUE WHERE id = r.id;
                    EXIT; -- 找到一个符合条件的就退出内循环
                END IF;
            EXCEPTION WHEN OTHERS THEN
                -- 转换失败，继续检查下一个
                CONTINUE;
            END;
        END LOOP;
    END LOOP;
    
    -- 更新分类计数
    PERFORM update_category_counts_internal();
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| public      | update_job_classification_on_change | CREATE OR REPLACE FUNCTION public.update_job_classification_on_change()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    current_grad_year INT;
    matched_years TEXT[];
    year_text TEXT;
    year_num INT;
    has_prev_year BOOLEAN := FALSE;
BEGIN
    -- 获取当前应届届数设置
    SELECT CAST(setting_value AS INT) INTO current_grad_year
    FROM system_settings
    WHERE setting_key = 'current_graduation_year';
    
    -- 如果没有设置，默认为25届
    IF current_grad_year IS NULL THEN
        current_grad_year := 25;
    END IF;
    
    -- 更新24h新开标记
    NEW.is_24hnew := (DATE(NEW.last_update) = CURRENT_DATE);
    
    -- 更新往届可投标记，先默认为false
    NEW.is_pregraduation := FALSE;
    
    -- 检查是否包含往届或不限关键词
    IF NEW.job_graduation_year ILIKE '%往届%' OR NEW.job_graduation_year ILIKE '%不限%' THEN
        NEW.is_pregraduation := TRUE;
        RETURN NEW;
    END IF;
    
    -- 查找所有数字并检查是否有比当前应届小的届数
    -- 使用regexp_matches函数获取所有匹配的数字
    FOR matched_years IN 
        SELECT regexp_matches(NEW.job_graduation_year, '(\d+)', 'g')
    LOOP
        -- 获取匹配的数字
        year_text := matched_years[1];
        BEGIN
            year_num := CAST(year_text AS INT);
            -- 检查是否小于当前应届届数
            IF year_num < current_grad_year THEN
                NEW.is_pregraduation := TRUE;
                EXIT; -- 找到一个往届就退出循环
            END IF;
        EXCEPTION WHEN OTHERS THEN
            -- 转换失败，继续检查下一个
            CONTINUE;
        END;
    END LOOP;
    
    RETURN NEW;
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| public      | update_job_time_tags                | CREATE OR REPLACE FUNCTION public.update_job_time_tags()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    tag_id_24h INT := 1;
    tag_id_yesterday INT := 2;
    tag_id_3days INT := 3;
    tag_id_7days INT := 4;
    tag_id_deadline INT := 5;
    tag_id_active INT := 6;  -- 新增的"有效可投递"标签
    current_date_val DATE := CURRENT_DATE;
    last_update_date DATE;
    deadline_date DATE;
    days_diff INT;
    days_to_deadline INT;
    tag_exists BOOLEAN;
BEGIN
    -- 转换日期格式
    last_update_date := DATE(NEW.last_update);
    deadline_date := DATE(NEW.deadline);
    
    -- 计算日期差异
    days_diff := current_date_val - last_update_date;
    days_to_deadline := deadline_date - current_date_val;
    
    -- 检查该招聘信息是否已有标签记录
    SELECT EXISTS(SELECT 1 FROM job_tags WHERE job_id = NEW.id) INTO tag_exists;
    
    -- 确定应该设置的时间标签
    DECLARE
        new_time_tag_id INT;
    BEGIN
        -- 根据更新时间和截止时间确定标签优先级
        IF days_to_deadline BETWEEN 0 AND 3 AND deadline_date >= current_date_val THEN
            -- 即将截止（最高优先级）
            new_time_tag_id := tag_id_deadline;
        ELSIF days_diff = 0 THEN
            -- 24h更新
            new_time_tag_id := tag_id_24h;
        ELSIF days_diff = 1 THEN
            -- 昨天更新
            new_time_tag_id := tag_id_yesterday;
        ELSIF days_diff BETWEEN 2 AND 3 THEN
            -- 3日内更新
            new_time_tag_id := tag_id_3days;
        ELSIF days_diff BETWEEN 4 AND 7 THEN
            -- 7日内更新
            new_time_tag_id := tag_id_7days;
        ELSIF deadline_date >= current_date_val THEN
            -- 有效可投递（超过7天更新且非即将截止）
            new_time_tag_id := tag_id_active;
        END IF;
        
        -- 如果记录已存在，则更新time_tag_id字段
        IF tag_exists THEN
            UPDATE job_tags 
            SET time_tag_id = new_time_tag_id
            WHERE job_id = NEW.id;
        ELSE
            -- 如果记录不存在，则插入新记录
            INSERT INTO job_tags (job_id, time_tag_id) 
            VALUES (NEW.id, new_time_tag_id);
        END IF;
    END;
    
    RETURN NEW;
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| public      | update_updated_at_column            | CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
end
$function$

8、查询定时任务
| datname  | pid    | usename  | application_name              | backend_start                | query_start                   | state  | query                                                                                                                                                                                                                                                                                                                                                                                                                     |
| -------- | ------ | -------- | ----------------------------- | ---------------------------- | ----------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| postgres | 298459 | postgres | postgres-meta 0.0.0-automated | 2025-05-05 01:08:38.60376+00 | 2025-05-05 01:08:39.060259+00 | active | SELECT 
    datname,
    pid,
    usename,
    application_name,
    backend_start,
    query_start,
    state,
    query
FROM 
    pg_stat_activity
WHERE 
    query LIKE '%daily_update%' 
    OR query LIKE '%schedule%' 
    OR query LIKE '%cron%'
ORDER BY 
    backend_start DESC limit 100;

-- source: dashboard
-- user: 683e5f0f-e685-4355-9acb-c5e9528bd9c6
-- date: 2025-05-05T01:08:38.488Z |
9、查询所有视图
Success. No rows returned
10、查询所有序列
| sequence_name           | data_type | start_value | minimum_value | maximum_value | increment |
| ----------------------- | --------- | ----------- | ------------- | ------------- | --------- |
| activation_codes_id_seq | integer   | 1           | 1             | 2147483647    | 1         |
| admins_id_seq           | integer   | 1           | 1             | 2147483647    | 1         |
| job_categories_id_seq   | integer   | 1           | 1             | 2147483647    | 1         |
| job_recruitments_id_seq | integer   | 1           | 1             | 2147483647    | 1         |
| statistics_id_seq       | integer   | 1           | 1             | 2147483647    | 1         |
| system_data_id_seq      | integer   | 1           | 1             | 2147483647    | 1         |
| system_settings_id_seq  | integer   | 1           | 1             | 2147483647    | 1         |
| tags_id_seq             | integer   | 1           | 1             | 2147483647    | 1         |
| user_actions_id_seq     | integer   | 1           | 1             | 2147483647    | 1         |
| user_info_id_seq        | integer   | 1           | 1             | 2147483647    | 1         |
| users_id_seq            | integer   | 1           | 1             | 2147483647    | 1         |
11、查询数据库统计信息
| table_name                 | row_count |
| -------------------------- | --------- |
| job_categories             | 20        |
| messages                   | 17        |
| activation_codes           | 15        |
| job_recruitments           | 10        |
| job_tags                   | 10        |
| tags                       | 9         |
| user_actions               | 1         |
| system_settings            | 1         |
| users                      | 1         |
| statistics                 | 1         |
| admins                     | 1         |
| job_action_updates         | 1         |
| job_recruitment_categories | 0         |
| user_info                  | 0         |
| system_data                | 0         |

## 4. 结语

此文档概述了数据库设计的核心部分，包括表结构、字段含义和相关逻辑。为确保系统的高可维护性和扩展性，建议根据实际需求逐步完善系统功能，及时更新数据库结构。
