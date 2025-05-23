import React, { useState } from 'react';
import './Footer.css';
import DisclaimerModal from './DisclaimerModal';
import FeedbackModal from './FeedbackModal';

const Footer: React.FC = () => {
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  const handleDisclaimerClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowDisclaimer(true);
  };

  const handleFeedbackClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowFeedback(true);
  };

  return (
    <footer className="site-footer">
      <div className="footer-content">
        <p className="footer-text">
          本站点收录的信息均来自于公开可查询的渠道，本站点不对其内容可靠性与真实性负责，用户在使用时需自行核实并承担相应风险。
          <a href="#" className="footer-link" onClick={handleDisclaimerClick}>免责申明</a>
        </p>
        <p className="footer-text">
          如果您有好的建议或者您发现信息有误，您可以点击
          <a href="#" className="footer-link" onClick={handleFeedbackClick}>反馈</a>。
        </p>
      </div>

      {showDisclaimer && (
        <DisclaimerModal onClose={() => setShowDisclaimer(false)} />
      )}

      {showFeedback && (
        <FeedbackModal onClose={() => setShowFeedback(false)} />
      )}
    </footer>
  );
};

export default Footer;
