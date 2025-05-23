import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './Modal.css';
import { showAlert } from './AlertDialog';

interface FeedbackModalProps {
  onClose: () => void;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ onClose }) => {
  const { supabase } = useAuth();
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscKey);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!feedback.trim()) {
      showAlert({
        title: '提交失败',
        message: '请输入反馈内容',
        type: 'error'
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      // 将反馈内容提交到数据库
      const { error } = await supabase
        .from('messages')
        .insert([{ content: feedback }]);

      if (error) {
        throw new Error('提交反馈失败: ' + error.message);
      }

      showAlert({
        title: '提交成功',
        message: '感谢您的反馈，我们会认真考虑您的建议',
        type: 'success'
      });
      
      setFeedback('');
      onClose();
    } catch (err: any) {
      console.error('提交反馈错误:', err);
      showAlert({
        title: '提交失败',
        message: err.message || '提交反馈时发生错误，请稍后重试',
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container" ref={modalRef}>
        <div className="modal-header">
          <h3>反馈建议</h3>
          <button className="modal-close-button" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-content">
            <p className="modal-description">
              请填写您的建议或发现的问题，我们会认真考虑您的反馈。
            </p>
            <textarea
              className="feedback-textarea"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="请输入您的反馈内容..."
              rows={6}
              required
            />
          </div>
          <div className="modal-footer">
            <button 
              type="button" 
              className="modal-button modal-button-secondary" 
              onClick={onClose}
              disabled={isSubmitting}
            >
              取消
            </button>
            <button 
              type="submit" 
              className="modal-button" 
              disabled={isSubmitting}
            >
              {isSubmitting ? '提交中...' : '提交反馈'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FeedbackModal;
