import styles from './Filter.module.css';

export function Filter({ activeFilter, setActiveFilter }) {
  return (
    <div className={styles.filter}>
      <div
        className={`${styles.filter__btn} ${activeFilter === 'CPU2' ? styles.active : ''}`}
        onClick={() => setActiveFilter(prev => prev === 'CPU2' ? null : 'CPU2')}
      >
        HPE cерверы с 2 CPU
      </div>
      <div
        className={`${styles.filter__btn} ${activeFilter === 'CPU4' ? styles.active : ''}`}
        onClick={() => setActiveFilter(prev => prev === 'CPU4' ? null : 'CPU4')}
      >
        HPE cерверы с 4 CPU
      </div>
      <div
        className={`${styles.filter__btn} ${activeFilter === 'GPU' ? styles.active : ''}`}
        onClick={() => setActiveFilter(prev => prev === 'GPU' ? null : 'GPU')}
      >
        HPE cерверы с GPU
      </div>
      <div
        className={`${styles.filter__btn} ${activeFilter === 'MICROSERVERS' ? styles.active : ''}`}
        onClick={() => setActiveFilter(prev => prev === 'MICROSERVERS' ? null : 'MICROSERVERS')}
      >
        Микросерверы HPE
      </div>
      <div
        className={`${styles.filter__btn} ${activeFilter === 'STORAGE' ? styles.active : ''}`}
        onClick={() => setActiveFilter(prev => prev === 'STORAGE' ? null : 'STORAGE')}
      >
        HPE cерверы для хранения
      </div>
      <div
        className={`${styles.filter__btn} ${activeFilter === 'LUN_SHD' ? styles.active : ''}`}
        onClick={() => setActiveFilter(prev => prev === 'LUN_SHD' ? null : 'LUN_SHD')}
      >
        Луны на СХД HPE 3PAR
      </div>
    </div>
  );
}