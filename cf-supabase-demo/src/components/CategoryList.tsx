import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import CategoryCard from './CategoryCard';
import PopupJobsView from './PopupJobsView';
import './CategoryList.css';

// 分类图标映射
const CATEGORY_ICONS: Record<number, string> = {
  1: 'icon-enterprise',     // 国企
  2: 'icon-foreign',        // 外企
  3: 'icon-institution',    // 事业单位
  4: 'icon-finance',        // 银行/金融
  5: 'icon-internet',       // 互联网
  6: 'icon-manufacture',    // 制造业
  7: 'icon-game',           // 游戏
  8: 'icon-fmcg',           // 快消/品牌
  9: 'icon-biomedical',     // 生物医药
  10: 'icon-automotive',    // 汽车/新能源
  11: 'icon-tech',          // 科技
  12: 'icon-beauty',        // 美妆
  13: 'icon-media',         // 传媒
  14: 'icon-top-company',   // 一线大厂
  15: 'icon-small-beauty',  // 小而美
  16: 'icon-education',     // 教育
  17: 'icon-real-estate',   // 地产/建筑
  18: 'icon-other',         // 其他
  19: 'icon-new',           // 24h新开
  20: 'icon-previous'       // 往届可投
};

interface Category {
  id: number;
  category: string;
  category_number: number;
  active_job_count: number;
  is_active: boolean;
}

const CategoryList: React.FC = () => {
  const { supabase } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [orderedCategories, setOrderedCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [animatingItem, setAnimatingItem] = useState<{id: number, state: string, targetIndex?: number} | null>(null);
  const itemsRef = useRef<{[key: string]: HTMLDivElement}>({});

  // 弹出窗口相关状态
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<{
    id: number;
    name: string;
    count: number;
    color: string;
  } | null>(null);

  // 加载分类数据
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from('job_categories')
          .select('*')
          .eq('is_active', true)
          .order('id');

        if (error) {
          throw new Error('加载分类信息失败: ' + error.message);
        }

        setCategories(data || []);
      } catch (err: any) {
        console.error('获取分类信息错误:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [supabase]);

  // 加载用户收藏 - 这个useEffect只在初始化时执行一次
  useEffect(() => {
    // 加载收藏
    const savedFavorites = localStorage.getItem('favoriteCategoryIds');

    if (savedFavorites) {
      try {
        const favoriteIds = JSON.parse(savedFavorites);
        setFavorites(favoriteIds);
      } catch (e) {
        console.error('解析收藏数据失败', e);
        setFavorites([]);
      }
    }
  }, []); // 空依赖数组，只在组件挂载时执行一次

  // 当categories或favorites变化时，重新排序
  useEffect(() => {
    if (categories.length === 0) return;

    // 加载保存的顺序
    const savedOrder = localStorage.getItem('categoryOrder');

    // 排序逻辑
    const specialCategories = categories.filter(cat => cat.id === 19 || cat.id === 20);
    let normalCategories = categories.filter(cat => cat.id !== 19 && cat.id !== 20);

    // 如果有保存的顺序，按照保存的顺序排序
    if (savedOrder) {
      try {
        const orderArray = JSON.parse(savedOrder);
        normalCategories.sort((a, b) => {
          const indexA = orderArray.indexOf(a.id);
          const indexB = orderArray.indexOf(b.id);

          // 如果不在保存的顺序中，则保持原有顺序
          if (indexA === -1 && indexB === -1) return a.id - b.id;
          if (indexA === -1) return 1;
          if (indexB === -1) return -1;

          return indexA - indexB;
        });
      } catch (e) {
        console.error('解析顺序数据失败', e);
      }
    }

    // 收藏的放在前面
    normalCategories.sort((a, b) => {
      const isAFavorite = favorites.includes(a.id);
      const isBFavorite = favorites.includes(b.id);

      if (isAFavorite && !isBFavorite) return -1;
      if (!isAFavorite && isBFavorite) return 1;
      return 0;
    });

    // 特殊分类放在最前面
    setOrderedCategories([...specialCategories, ...normalCategories]);
  }, [categories, favorites]);

  // 处理收藏切换的动画
  const handleFavoriteToggle = (id: number, isFavorite: boolean) => {
    // 记录当前收藏卡片的索引位置
    const currentIndex = orderedCategories.findIndex(cat => cat.id === id);
    if (currentIndex === -1) return;

    // 设置正在动画的项目
    setAnimatingItem({ id, state: 'start' });

    // 第一步：执行放大动画
    setTimeout(() => {
      setAnimatingItem({ id, state: 'enlarge' });

      // 第二步：计算新的收藏列表，但暂不更新视图
      let newFavorites = [...favorites];

      if (isFavorite) {
        // 添加到收藏
        if (!newFavorites.includes(id)) {
          newFavorites.push(id);
        }
      } else {
        // 从收藏中移除
        newFavorites = newFavorites.filter(favId => favId !== id);
      }

      // 保存到localStorage (但UI暂不更新)
      localStorage.setItem('favoriteCategoryIds', JSON.stringify(newFavorites));

      // 计算收藏后的新位置
      // 特殊分类数量（24h新开和往届可投）
      const specialCategoriesCount = categories.filter(cat => cat.id === 19 || cat.id === 20).length;

      // 计算目标位置 - 需要找到实际应该插入的位置
      let newPosition = -1; // -1表示不需要处理

      if (isFavorite) {
        // 根据卡片编号确定在收藏队列中的合适位置
        // 计算要插入的位置：应该在所有特殊卡片后，并根据id大小排序
        const favoriteCards = orderedCategories.filter(
          cat => favorites.includes(cat.id) && cat.id !== id
        );

        // 根据id查找此卡片应该插入的位置
        let insertIndex = specialCategoriesCount;
        // 找到第一个id大于当前卡片id的位置
        for (let i = 0; i < favoriteCards.length; i++) {
          if (favoriteCards[i].id > id) {
            // 找到了正确的插入位置
            insertIndex = orderedCategories.findIndex(cat => cat.id === favoriteCards[i].id);
            break;
          }
          // 如果没找到更大的id，则放在收藏队列末尾
          if (i === favoriteCards.length - 1) {
            insertIndex = specialCategoriesCount + favoriteCards.length;
          }
        }

        // 如果收藏队列为空，则放在特殊卡片后面
        if (favoriteCards.length === 0) {
          insertIndex = specialCategoriesCount;
        }

        newPosition = insertIndex;
      } else {
        // 取消收藏的情况：需要找到卡片应该放到哪个位置
        // 它应该放在所有特殊卡片和收藏卡片之后，并在非收藏卡片中按id排序
        const specialAndFavoriteCount = specialCategoriesCount +
          favorites.filter(favId => favId !== id).length;

        // 计算在非收藏卡片中的位置
        const nonFavoriteCards = orderedCategories.filter(
          cat => !favorites.includes(cat.id) && cat.id !== 19 && cat.id !== 20 && cat.id !== id
        );

        // 从特殊卡片和收藏卡片数量开始，找到第一个id大于当前卡片id的非收藏卡片
        let insertIndex = specialAndFavoriteCount;
        let foundPosition = false;

        for (let i = 0; i < nonFavoriteCards.length; i++) {
          if (nonFavoriteCards[i].id > id) {
            // 找到了正确的插入位置
            foundPosition = true;
            insertIndex = orderedCategories.findIndex(cat => cat.id === nonFavoriteCards[i].id);
            break;
          }
        }

        // 如果没找到更大id的卡片，则放在非收藏队列末尾
        if (!foundPosition && nonFavoriteCards.length > 0) {
          insertIndex = specialAndFavoriteCount; // 默认放在非收藏队列的开始位置
        }

        newPosition = insertIndex;
      }

      // 第三步：准备其他卡片的移动 - 让前面的卡片开始移动
      setTimeout(() => {
        // 标记当前卡片进入准备移动状态
        setAnimatingItem({ id, state: 'prepare-move' });

        // 记录要移动到的位置
        if (isFavorite && newPosition !== -1) {
          setAnimatingItem({ id, state: 'prepare-move', targetIndex: newPosition });
        } else if (!isFavorite && newPosition !== -1) {
          // 取消收藏时也记录目标位置
          setAnimatingItem({ id, state: 'prepare-move', targetIndex: newPosition });
        } else {
          setAnimatingItem({ id, state: 'prepare-move' });
        }

        // 第四步：等待前面的卡片移动完成，然后更新收藏状态
        setTimeout(() => {
          // 更新收藏列表，触发重排
          setFavorites(newFavorites);

          // 标记当前卡片进入移动前状态 - 准备移动到新位置
          setAnimatingItem({ id, state: 'pre-move' });

          // 第五步：当其他卡片已经腾出位置，收藏的卡片开始移动
          setTimeout(() => {
            setAnimatingItem({ id, state: 'move' });

            // 第六步：完成动画
            setTimeout(() => {
              setAnimatingItem(null);
            }, 650); // 收藏卡片的移动时间 - 稍微延长一点
          }, 100); // 给空位准备的时间
        }, 450); // 前面卡片移动的时间
      }, 400); // 放大后的暂停时间
    }, 50); // 启动时的短暂延迟
  };

  // 获取地点筛选和不看已投递设置
  const [filterLocations, setFilterLocations] = useState<string[]>([]);
  const [hideApplied, setHideApplied] = useState(false);

  // 从localStorage加载设置
  useEffect(() => {
    // 加载地点筛选设置
    const savedLocations = localStorage.getItem('filterLocations');
    if (savedLocations) {
      try {
        setFilterLocations(JSON.parse(savedLocations));
      } catch (e) {
        console.error('解析地点数据失败', e);
        setFilterLocations([]);
      }
    }

    // 加载不看已投递设置
    const savedHideApplied = localStorage.getItem('hideAppliedJobs');
    if (savedHideApplied) {
      setHideApplied(savedHideApplied === 'true');
    }

    // 监听localStorage变化
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'filterLocations' && e.newValue) {
        try {
          setFilterLocations(JSON.parse(e.newValue));
        } catch (error) {
          console.error('解析地点数据失败', error);
        }
      } else if (e.key === 'hideAppliedJobs') {
        setHideApplied(e.newValue === 'true');
      }
    };

    // 监听自定义事件
    const handleFilterLocationsChanged = (e: CustomEvent) => {
      setFilterLocations(e.detail.locations);
    };

    const handleHideAppliedChanged = (e: CustomEvent) => {
      setHideApplied(e.detail.hideApplied);
    };

    // 添加事件监听器
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('filterLocationsChanged', handleFilterLocationsChanged as EventListener);
    window.addEventListener('hideAppliedChanged', handleHideAppliedChanged as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('filterLocationsChanged', handleFilterLocationsChanged as EventListener);
      window.removeEventListener('hideAppliedChanged', handleHideAppliedChanged as EventListener);
    };
  }, []);

  // 处理卡片点击，显示弹出窗口
  const handleCardClick = (id: number, name: string, count: number) => {
    // 准备显示弹窗前先执行一些清理工作
    if (isPopupVisible) {
      setIsPopupVisible(false);

      // 给关闭动画留出时间
      setTimeout(() => {
        setSelectedCategory({
          id,
          name,
          count,
          color: getCategoryColor(id)
        });
        setIsPopupVisible(true);
      }, 350);
    } else {
      // 首次打开时直接显示
      setSelectedCategory({
        id,
        name,
        count,
        color: getCategoryColor(id)
      });
      setIsPopupVisible(true);
    }
  };

  // 通过ID获取分类颜色 - 更可靠的方式，避免DOM依赖
  const getCategoryColor = (id: number): string => {
    const categoryColorMap: Record<number, string> = {
      1: '#0055d4', // 国企
      2: '#0077cc', // 外企
      3: '#5c5c6d', // 事业单位
      4: '#26a826', // 银行/金融
      5: '#0066cc', // 互联网
      6: '#5840cb', // 制造业
      7: '#e67700', // 游戏
      8: '#8000cc', // 快消/品牌
      9: '#009e9e', // 生物医药
      10: '#445e69', // 汽车/新能源
      11: '#0066cc', // 科技
      12: '#e6194b', // 美妆
      13: '#cc7700', // 传媒
      14: '#00994d', // 一线大厂
      15: '#8800cc', // 小而美
      16: '#cc7700', // 教育
      17: '#737a22', // 地产/建筑
      18: '#666666', // 其他
      19: '#0055d4', // 24h新开
      20: '#8800cc', // 往届可投
    };

    return categoryColorMap[id] || '#666666'; // 默认颜色
  };

  // 关闭弹出窗口
  const handleClosePopup = () => {
    // 不直接设置为false，让动画有时间完成
    setIsPopupVisible(false);
  };

  return (
    <div className="category-list-container">
      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="loading-indicator">
          <p>加载中...</p>
        </div>
      ) : orderedCategories.length === 0 ? (
        <div className="no-data-message">
          <p>暂无分类信息</p>
        </div>
      ) : (
        <div className="category-grid">
          {orderedCategories.map((category, index) => {
            const isSpecialCategory = category.id === 19 || category.id === 20;
            const isAnimating = animatingItem?.id === category.id;
            const isFavorite = favorites.includes(category.id);

            // 判断卡片位置变化
            const getAnimatingState = () => {
              if (!animatingItem) return null;

              // 判断是否是正在收藏的卡片
              if (isAnimating) {
                return animatingItem.state;
              }

              // 只在准备移动和预移动阶段处理其他卡片的移动
              if (animatingItem.state !== 'prepare-move' && animatingItem.state !== 'pre-move') {
                return null;
              }

              // 当前卡片索引
              const cardIndex = index;

              // 被收藏卡片当前的索引
              const animatingCardIndex = orderedCategories.findIndex(c => c.id === animatingItem.id);

              // 特殊分类不参与移动（但已收藏卡片可以参与）
              if (isSpecialCategory) return null;

              // 计算卡片需要如何移动
              // 如果是添加收藏:
              if (favorites.includes(animatingItem.id) === false && animatingItem.targetIndex !== undefined) {
                // 目标位置就是卡片实际要插入的位置
                const targetIndex = animatingItem.targetIndex;

                // 1. 如果是正在被收藏的卡片前面且在目标位置及之后的卡片（包括收藏和非收藏），都需要右移
                if (cardIndex >= targetIndex && cardIndex < animatingCardIndex) {
                  return 'shift-right';
                }

                // 2. 如果是正在被收藏的卡片后面的卡片，不需要移动
                if (cardIndex > animatingCardIndex) {
                  return null;
                }

                // 3. 如果是目标位置前面的卡片，也不需要移动
                if (cardIndex < targetIndex) {
                  return null;
                }
              }
              // 如果是取消收藏
              else if (favorites.includes(animatingItem.id) === true && animatingItem.targetIndex !== undefined) {
                // 目标位置就是卡片实际要插入的位置
                const targetIndex = animatingItem.targetIndex;

                // 1. 如果是正在被取消收藏的卡片之间，且在原位置之后、目标位置之前的卡片
                // 这些卡片需要向左移动以填补取消收藏留下的空位
                if (cardIndex > animatingCardIndex && cardIndex < targetIndex) {
                  // 当卡片进入move状态时，需要防止二次动画冲击
                  if (animatingItem.state === 'move') {
                    return 'shift-left-end';
                  }
                  return 'shift-left'; // 这些卡片需要向左移动
                }

                // 2. 如果是正在被取消收藏的卡片后面且在目标位置及之后的卡片，不需要移动
                if (cardIndex >= targetIndex) {
                  return null;
                }

                // 3. 如果是正在被取消收藏的卡片前面或就是卡片本身，也不需要移动
                if (cardIndex <= animatingCardIndex) {
                  return null;
                }
              }

              return null;
            };

            // 确定当前卡片的移动状态
            const movingState = getAnimatingState();

            // 确定是否需要移动位置以及移动方向
            const needsShiftRight = movingState === 'shift-right';
            const needsShiftLeft = movingState === 'shift-left';
            const needsShiftLeftEnd = movingState === 'shift-left-end';

            let animationClass = '';

            if (isAnimating) {
              if (animatingItem?.state === 'enlarge') {
                animationClass = 'favorite-animation';
              } else if (animatingItem?.state === 'prepare-move') {
                animationClass = 'favorite-animation favorite-prepare-move';
              } else if (animatingItem?.state === 'pre-move') {
                animationClass = 'favorite-pre-move';
              } else if (animatingItem?.state === 'move') {
                animationClass = 'favorite-move';
              }
            }

            return (
              <div
                key={category.id}
                className={`category-item
                  ${animationClass === 'favorite-move' ? 'favorite-move' : ''}
                  ${needsShiftRight ? 'make-space' : ''}
                  ${needsShiftLeft ? 'close-space' : ''}
                  ${needsShiftLeftEnd ? 'close-space-end' : ''}
                  category-card-transition`}
                data-category-id={category.id}
                ref={(el) => {
                  if (el) {
                    itemsRef.current[`category-${category.id}`] = el;
                  }
                }}
              >
                <CategoryCard
                  id={category.id}
                  name={category.category}
                  count={category.active_job_count}
                  index={index}
                  isDraggable={!isSpecialCategory}
                  onFavoriteToggle={handleFavoriteToggle}
                  onCardClick={handleCardClick}
                  animationClass={
                    animationClass === 'favorite-animation' ? 'favorite-animation' :
                    animationClass === 'favorite-animation favorite-prepare-move' ? 'favorite-animation favorite-prepare-move' :
                    animationClass === 'favorite-pre-move' ? 'favorite-pre-move' : ''
                  }
                />
              </div>
            );
          })}
        </div>
      )}

      {/* 弹出窗口 */}
      {selectedCategory && (
        <PopupJobsView
          categoryId={selectedCategory.id}
          categoryName={selectedCategory.name}
          jobCount={selectedCategory.count}
          accentColor={selectedCategory.color}
          isVisible={isPopupVisible}
          onClose={handleClosePopup}
          filterLocations={filterLocations}
          hideApplied={hideApplied}
        />
      )}
    </div>
  );
};

export default CategoryList;