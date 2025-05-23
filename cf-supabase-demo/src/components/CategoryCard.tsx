import React, { useState, useEffect } from 'react';
import './CategoryCard.css';

interface CategoryCardProps {
  id: number;
  name: string;
  count: number;
  index: number;
  isDraggable: boolean;
  animationClass?: string;
  onFavoriteToggle?: (id: number, isFavorite: boolean) => void;
  onCardClick?: (id: number, name: string, count: number) => void;
}

const CategoryCard: React.FC<CategoryCardProps> = ({ 
  id, 
  name, 
  count, 
  index,
  isDraggable,
  animationClass = '',
  onFavoriteToggle,
  onCardClick 
}) => {
  const [isFavorite, setIsFavorite] = useState(false);

  // 初始化时从localStorage加载收藏状态
  useEffect(() => {
    const favoritesStr = localStorage.getItem('favoriteCategoryIds');
    if (favoritesStr) {
      const favorites = JSON.parse(favoritesStr);
      setIsFavorite(favorites.includes(id));
    }
  }, [id]);

  // 切换收藏状态
  const handleFavoriteToggle = (e: React.MouseEvent) => {
    e.preventDefault(); // 阻止链接跳转
    e.stopPropagation(); // 阻止事件冒泡
    
    const newState = !isFavorite;
    setIsFavorite(newState);
    
    // 更新localStorage
    const favoritesStr = localStorage.getItem('favoriteCategoryIds');
    let favorites: number[] = [];
    
    if (favoritesStr) {
      favorites = JSON.parse(favoritesStr);
    }
    
    if (newState) {
      if (!favorites.includes(id)) {
        favorites.push(id);
      }
    } else {
      favorites = favorites.filter(favId => favId !== id);
    }
    
    localStorage.setItem('favoriteCategoryIds', JSON.stringify(favorites));
    
    // 调用父组件的回调
    if (onFavoriteToggle) {
      onFavoriteToggle(id, newState);
    }
  };

  // 处理卡片点击
  const handleCardClick = () => {
    if (onCardClick) {
      onCardClick(id, name, count);
    }
  };

  // 确定卡片的固定类
  const isSpecialCategory = id === 19 || id === 20; // 24h新开或往届可投
  const cardClassName = `category-card ${isSpecialCategory ? 'special-category' : ''} category-${id} ${animationClass}`;

  // 确定数字显示的文本颜色，用于弹窗标题栏背景
  const getColorForCategory = (): string => {
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

  return (
    <div 
      className={cardClassName}
      data-id={id}
      data-index={index}
      data-color={getColorForCategory()}
      onClick={handleCardClick}
    >
      <div className="category-card-inner">
        <div className="card-content">
          <div className="count-number">{count}</div>
          <h3 className="category-name">{name}</h3>
        </div>
        
        {!isSpecialCategory && isDraggable && (
          <button 
            className={`favorite-button ${isFavorite ? 'favorited' : ''}`} 
            onClick={handleFavoriteToggle}
            aria-label={isFavorite ? "取消收藏" : "收藏"}
          >
            {isFavorite ? '★' : '☆'}
          </button>
        )}
      </div>
    </div>
  );
};

export default CategoryCard; 