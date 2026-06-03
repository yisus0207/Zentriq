import { Skeleton } from '@/components/ui/Skeleton/Skeleton';
import styles from './loading.module.css';

export default function MenuLoading() {
  return (
    <div className={styles.loading}>
      {/* Cover skeleton */}
      <Skeleton variant="card" width="100%" height="200px" />

      {/* Restaurant info skeleton */}
      <div className={styles.info}>
        <Skeleton variant="title" width="60%" height="24px" />
        <Skeleton variant="text" width="40%" height="14px" />
      </div>

      {/* Category tabs skeleton */}
      <div className={styles.tabs}>
        <Skeleton variant="text" width="80px" height="32px" />
        <Skeleton variant="text" width="80px" height="32px" />
        <Skeleton variant="text" width="80px" height="32px" />
        <Skeleton variant="text" width="80px" height="32px" />
      </div>

      {/* Product cards skeleton */}
      <div className={styles.items}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={styles.itemCard}>
            <Skeleton variant="card" width="100%" height="160px" />
            <div className={styles.itemInfo}>
              <Skeleton variant="title" width="70%" height="16px" />
              <Skeleton variant="text" width="100%" height="12px" />
              <Skeleton variant="text" width="30%" height="16px" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
