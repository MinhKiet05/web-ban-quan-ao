import styles from './HomePage.module.css';
import sampleImage1 from '../../assets/images/sample1.webp';
import sampleImage2 from '../../assets/images/sample2.webp';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAngleLeft, faAngleRight, faArrowRight} from '@fortawesome/free-solid-svg-icons';

export default function HomePage() {
    return (
        <div className={styles.homePage}>
            <section className={styles.heroSection}>
                <div className={styles.heroContent}>
                    <div className={styles.left}>
                        <div className={styles.leftTop}>
                            <div className={styles.leftTopHeading}>
                                <div className={styles.row}>NEW</div>
                                <div className={styles.row}>COLLECTION</div>
                            </div>
                            <div className={styles.leftTopTime}>
                                <div>SUMMER</div>
                                <div>2026</div>
                            </div>
                        </div>
                        <div className={styles.leftBottom}>
                            <button onClick={() => alert("Shop Now clicked!")} className={styles.shopNowButton}>Go To Shop <FontAwesomeIcon icon={faArrowRight} /></button>
                            <div className={styles.navigationButtons}>
                                <button onClick={() => alert("Next clicked!")} className={styles.moveButton}><FontAwesomeIcon icon={faAngleLeft} /></button>
                            <button onClick={() => alert("Previous clicked!")} className={styles.moveButton}><FontAwesomeIcon icon={faAngleRight} /></button>
                            </div>
                            
                        </div>
                    </div>
                    <div className={styles.right}>
                        <img src={sampleImage1} alt="Sample 1" />
                        <img src={sampleImage2} alt="Sample 2" />
                    </div>
                </div>
            </section>


        </div>
    );
}