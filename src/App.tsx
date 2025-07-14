import React from 'react';
import MapContainer from './components/MapContainer';
import './App.css';

// Cache control setting - change this to true/false to control image cache reseting
export const FORCE_CACHE_REFRESH = false;

const App: React.FC = () => {
    return <MapContainer />;
};

export default App;
