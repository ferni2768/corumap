import React from 'react';
import '../styles/InfoButton.css';

interface InfoButtonProps {
    onClick: () => void;
}

const InfoButton: React.FC<InfoButtonProps> = ({ onClick }) => {
    const handleClick = () => {
        console.log('InfoButton handleClick called');
        onClick();
    };

    return (
        <button
            className="info-button"
            onClick={handleClick}
            aria-label="Show welcome information"
        >
            <span className="info-icon">i</span>
        </button>
    );
};

export default InfoButton;
