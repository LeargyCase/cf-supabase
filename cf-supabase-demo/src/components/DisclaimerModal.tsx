import React, { useEffect, useRef } from 'react';
import './Modal.css';

interface DisclaimerModalProps {
  onClose: () => void;
}

const DisclaimerModal: React.FC<DisclaimerModalProps> = ({ onClose }) => {
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

  return (
    <div className="modal-overlay">
      <div className="modal-container" ref={modalRef}>
        <div className="modal-header">
          <h3>免责声明</h3>
          <button className="modal-close-button" onClick={onClose}>×</button>
        </div>
        <div className="modal-content">
          <h4>信息来源</h4>
          <p>本站点所收录的校招信息均来自于公开可查询的渠道，包括但不限于企业官方网站、招聘平台、高校就业网站等。我们致力于提供及时、全面的校招信息，但无法保证所有信息的准确性、完整性和及时性。</p>
          
          <h4>信息可靠性与真实性</h4>
          <p>本站点不对所收录信息的可靠性与真实性负责。我们会尽力核实信息的来源和准确性，但无法完全排除错误或虚假信息的可能性。用户在使用本站点信息时，应自行判断其可靠性，并承担相应的风险。</p>
          
          <h4>信息更新与变更</h4>
          <p>校招信息可能会随时发生变化，包括但不限于招聘岗位、招聘条件、招聘流程等。本站点会尽力及时更新信息，但无法保证所有信息的实时性。用户在使用本站点信息时，应以企业官方发布的最新信息为准。</p>
          
          <h4>用户行为</h4>
          <p>用户在使用本站点信息时，应遵守法律法规和道德规范，不得利用本站点信息进行任何非法或不正当的行为。用户应自行承担因使用本站点信息而产生的一切后果。</p>
          
          <h4>第三方链接</h4>
          <p>本站点可能包含指向第三方网站的链接。我们不对这些第三方网站的内容、隐私政策或安全性负责。用户在访问这些第三方网站时，应自行判断其可靠性，并承担相应的风险。</p>
          
          <h4>免责范围</h4>
          <p>本站点不对因使用本站点信息而产生的任何直接或间接的损失、损害或责任负责，包括但不限于经济损失、名誉损失、数据丢失等。</p>
          
          <h4>法律适用与争议解决</h4>
          <p>本免责声明受中华人民共和国法律管辖。因使用本站点信息而产生的任何争议，应友好协商解决；协商不成的，可向有管辖权的人民法院提起诉讼。</p>
        </div>
        <div className="modal-footer">
          <button className="modal-button" onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  );
};

export default DisclaimerModal;
