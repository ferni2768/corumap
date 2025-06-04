import React, { ReactNode } from 'react';
import Superellipse from 'react-superellipse';
import { Preset } from "react-superellipse";
import '../styles/RoundedCard.css';

interface RoundedCardProps {
    children: ReactNode;
    className?: string;
}

const RoundedCard: React.FC<RoundedCardProps> = ({
    children,
    className = ''
}) => {
    return (
        <Superellipse
            className={`rounded-card ${className}`}
            r1={Preset.iOS.r1} r2={Preset.iOS.r2}
        >
            {children}
        </Superellipse>
    );
};

export default RoundedCard;