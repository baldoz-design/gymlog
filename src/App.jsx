import { useState } from 'react';
import Home from './screens/Home';
import Session from './screens/Session';
import Stats from './screens/Stats';
import Program from './screens/Program';

export default function App() {
  const [screen, setScreen] = useState('home');
  const [sessionParams, setSessionParams] = useState(null);

  function navigate(target, params = null) {
    setSessionParams(params);
    setScreen(target);
  }

  if (screen === 'session') {
    return <Session params={sessionParams} onBack={() => navigate('home')} />;
  }
  if (screen === 'stats') {
    return <Stats onBack={() => navigate('home')} />;
  }
  if (screen === 'program') {
    return <Program onBack={() => navigate('home')} />;
  }
  return <Home onNavigate={navigate} />;
}
