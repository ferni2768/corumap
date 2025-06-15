import React from 'react';
import '../styles/Logo.css';

const Logo: React.FC = () => {
    const handleClick = () => {
        window.open('https://github.com/ferni2768/corumap', '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="logo" onClick={handleClick}>
            <img
                src="/corumap_logo_long.svg"
                alt="CoruMap Logo"
                className="logo-image"
            />
        </div>
    );
};

export default Logo;