import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import './AlertDialog.css';

// 提示框类型
export type AlertType = 'success' | 'error' | 'warning' | 'info';

// 按钮配置
export interface AlertButton {
  text: string;
  onClick?: (e?: React.MouseEvent, inputValue?: string) => void;
  primary?: boolean;
}

// 输入字段配置
export interface InputFieldOptions {
  placeholder?: string;
  defaultValue?: string;
}

// 提示框配置
export interface AlertOptions {
  title?: string;
  message: string;
  type?: AlertType;
  buttons?: AlertButton[];
  onClose?: () => void;
  autoClose?: number; // 自动关闭时间（毫秒），0或不设置表示不自动关闭
  inputField?: InputFieldOptions; // 输入字段配置
}

// 提示框组件
const AlertDialog: React.FC<AlertOptions & { isOpen: boolean; onClose: () => void }> = ({
  title,
  message,
  type = 'info',
  buttons,
  isOpen,
  onClose,
  autoClose,
  inputField,
}) => {
  // 添加关闭动画状态
  const [isClosing, setIsClosing] = useState(false);
  // 输入字段的值
  const [inputValue, setInputValue] = useState(inputField?.defaultValue || '');

  // 当inputField变化时更新输入值
  useEffect(() => {
    if (inputField) {
      setInputValue(inputField.defaultValue || '');
    }
  }, [inputField]);

  // 处理关闭动画
  useEffect(() => {
    if (!isOpen && !isClosing) {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setIsClosing(false);
      }, 300); // 300ms与CSS过渡时间保持一致
      return () => clearTimeout(timer);
    }
  }, [isOpen]);
  useEffect(() => {
    if (isOpen && autoClose && autoClose > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, autoClose);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoClose, onClose]);

  if (!isOpen) return null;

  // 根据类型设置样式
  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: '#27ae60', // 绿色，匹配项目中的成功按钮颜色
          color: 'white',
          icon: '✓',
        };
      case 'error':
        return {
          backgroundColor: '#e53e3e', // 红色，匹配项目中的错误提示颜色
          color: 'white',
          icon: '✕',
        };
      case 'warning':
        return {
          backgroundColor: '#FF9800', // 橙色，保持警告色
          color: 'white',
          icon: '⚠',
        };
      case 'info':
      default:
        return {
          backgroundColor: '#3b82f6', // 蓝色，匹配项目中的主要按钮颜色
          color: 'white',
          icon: 'ℹ',
        };
    }
  };

  const typeStyles = getTypeStyles();

  // 默认按钮
  const defaultButtons: AlertButton[] = [
    {
      text: '确定',
      primary: true,
      onClick: onClose,
    },
  ];

  const finalButtons = buttons || defaultButtons;

  // 直接渲染弹窗，不使用createPortal
  return (
    <div
      className={`alert-dialog-overlay ${isClosing ? 'closing' : ''}`}
      onMouseDown={(e) => {
        // 阻止点击背景关闭弹窗时的事件冒泡
        e.stopPropagation();
      }}
      onClick={(e) => {
        // 阻止点击背景关闭弹窗时的事件冒泡
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        className={`alert-dialog-container ${isClosing ? 'closing' : ''}`}
        onMouseDown={(e) => {
          // 阻止事件冒泡，避免触发外层的关闭事件
          e.stopPropagation();
        }}
        onClick={(e) => {
          // 阻止事件冒泡，避免触发外层的关闭事件
          e.stopPropagation();
        }}
      >
        {/* 标题栏 */}
        <div
          className="alert-dialog-header"
          style={{
            backgroundColor: typeStyles.backgroundColor,
            color: typeStyles.color
          }}
        >
          <span className="alert-dialog-icon">{typeStyles.icon}</span>
          <span className="alert-dialog-title">
            {title || type.charAt(0).toUpperCase() + type.slice(1)}
          </span>
        </div>

        {/* 消息内容 */}
        <div
          className="alert-dialog-content"
          dangerouslySetInnerHTML={{ __html: message }}
        >
          {/* 使用dangerouslySetInnerHTML渲染HTML内容 */}

          {/* 输入字段 - 需要在外部渲染，因为dangerouslySetInnerHTML会覆盖子元素 */}
        </div>

        {/* 输入字段 */}
        {inputField && (
          <div className="alert-dialog-input-container">
            <input
              type="text"
              className="alert-dialog-input"
              placeholder={inputField.placeholder || ''}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              style={{ textAlign: 'center' }} /* 使输入的文字居中 */
            />
          </div>
        )}

        {/* 按钮区域 */}
        <div className="alert-dialog-footer">
          {finalButtons.map((button, index) => (
            <button
              key={index}
              className={`alert-dialog-button ${button.primary ? 'alert-dialog-button-primary' : 'alert-dialog-button-secondary'}`}
              style={button.primary ? { backgroundColor: typeStyles.backgroundColor } : {}}
              onMouseDown={(e) => {
                // 阻止事件冒泡，避免触发外层的关闭事件
                e.stopPropagation();
              }}
              onClick={(e) => {
                // 阻止事件冒泡，避免触发外层的关闭事件
                e.stopPropagation();
                if (button.onClick) {
                  button.onClick(e, inputValue);
                } else {
                  onClose();
                }
              }}
            >
              {button.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// 全局状态管理
let alertContainer: HTMLDivElement | null = null;
let setAlertState: React.Dispatch<React.SetStateAction<AlertOptions & { isOpen: boolean }>> | null = null;

// 创建全局提示框容器和状态管理
const createAlertContainer = () => {
  if (!alertContainer) {
    // 创建一个容器元素
    alertContainer = document.createElement('div');
    alertContainer.id = 'alert-container';
    document.body.appendChild(alertContainer);

    // 创建一个React组件来管理弹窗状态
    const AlertManager: React.FC = () => {
      const [alertState, setAlertStateInternal] = useState<AlertOptions & { isOpen: boolean }>({
        message: '',
        isOpen: false,
      });

      // 保存状态更新函数的引用，以便外部可以调用
      setAlertState = setAlertStateInternal;

      // 处理关闭弹窗
      const handleClose = useCallback(() => {
        console.log('Closing alert');
        setAlertStateInternal(prev => ({ ...prev, isOpen: false }));
        if (alertState.onClose) {
          alertState.onClose();
        }
      }, [alertState.onClose]);

      // 只有当弹窗打开时才渲染AlertDialog组件
      return alertState.isOpen ? (
        <AlertDialog {...alertState} onClose={handleClose} />
      ) : null;
    };

    // 渲染AlertManager到容器中
    ReactDOM.render(<AlertManager />, alertContainer);
  }
};

// 显示提示框
export const showAlert = (options: AlertOptions) => {
  console.log('showAlert被调用，参数:', options);

  // 确保容器已创建
  if (!alertContainer) {
    console.log('创建alert容器');
    createAlertContainer();
  }

  // 使用setTimeout确保React已完成渲染
  setTimeout(() => {
    if (setAlertState) {
      console.log('设置alert状态为显示');
      setAlertState({
        ...options,
        isOpen: true,
      });
    } else {
      console.error('setAlertState未初始化，使用原生alert作为备选');
      // 如果setAlertState未初始化，使用原生alert作为备选
      alert(options.message);
    }
  }, 0);
};

// 关闭提示框
export const closeAlert = () => {
  if (setAlertState) {
    setAlertState((prev) => ({ ...prev, isOpen: false }));
  }
};

// 快捷方法
export const showSuccess = (message: string, options?: Omit<AlertOptions, 'message' | 'type'>) => {
  showAlert({ ...options, message, type: 'success' });
};

export const showError = (message: string, options?: Omit<AlertOptions, 'message' | 'type'>) => {
  showAlert({ ...options, message, type: 'error' });
};

export const showWarning = (message: string, options?: Omit<AlertOptions, 'message' | 'type'>) => {
  showAlert({ ...options, message, type: 'warning' });
};

export const showInfo = (message: string, options?: Omit<AlertOptions, 'message' | 'type'>) => {
  showAlert({ ...options, message, type: 'info' });
};

// 确认对话框
export const showConfirm = (
  message: string,
  onConfirm: () => void,
  onCancel?: () => void,
  options?: Omit<AlertOptions, 'message' | 'buttons'>
) => {
  showAlert({
    ...options,
    message,
    type: 'warning',
    buttons: [
      {
        text: '取消',
        onClick: () => {
          closeAlert();
          if (onCancel) onCancel();
        },
      },
      {
        text: '确定',
        primary: true,
        onClick: () => {
          closeAlert();
          onConfirm();
        },
      },
    ],
  });
};

export default AlertDialog;
