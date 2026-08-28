import { useEffect, useState } from 'react';
import splashBg from '../assets/splash-bg.jpg';
import styles from './Splash.module.css';

export default function Splash({ onDone }) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const holdTimer = setTimeout(() => setFading(true), 850);
    const doneTimer = setTimeout(onDone, 1400);
    return () => { clearTimeout(holdTimer); clearTimeout(doneTimer); };
  }, [onDone]);

  return (
    <div className={`${styles.splash} ${fading ? styles.fadeOut : ''}`}>
      <img src={splashBg} className={styles.bg} alt="" />
      <div className={styles.overlay} />
      <div className={styles.logo}>
        <span className={styles.logoGym}>GYM</span>
        <span className={styles.logoLog}>LOG</span>
      </div>
    </div>
  );
}
