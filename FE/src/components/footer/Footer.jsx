import styles from './Footer.module.css';
import logo from '/logo-KHK.webp';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faYoutube,
    faDiscord,
    faInstagram,
} from '@fortawesome/free-brands-svg-icons';
import { Link } from 'react-router-dom';
export default function Footer() {
    return (
        <>
            <footer className={styles.footer}>
                <div className={styles.footerContent}>
                    <div className={styles.brand}><img src={logo} style={{ height: '100px', width: 'auto' }} alt="KHK Fashion Logo" />
                        <p>Cửa hàng thời trang KHK chuyên cung cấp các sản phẩm thời trang chất lượng cao với thiết kế hiện đại. </p>
                    </div>
                    <div className={styles.info}>
                        <div className={styles.columnInfo}><h2>Liên kết</h2>
                            <ul>
                                <li><Link to="/">Trang chủ</Link></li>
                                <li><Link to="/products">Sản phẩm</Link></li>
                                <li><Link to="/about-us">Về chúng tôi</Link></li>
                            </ul>
                        </div>
                        <div className={styles.columnInfo}><h2>Đội ngũ</h2>
                            <ul>
                                <li>
                                    <a href="https://github.com/MinhKiet05" target="_blank" rel="noopener noreferrer">
                                        Trần Huỳnh Minh Kiệt
                                    </a>
                                </li>
                                <li>
                                    <a href="https://github.com/NguyennHoangg" target="_blank" rel="noopener noreferrer">
                                        Nguyễn Huy Hoàng
                                    </a>
                                </li>
                                <li>
                                    <a href="https://github.com/dinhtankhiem" target="_blank" rel="noopener noreferrer">
                                        Đinh Tấn Khiêm
                                    </a>
                                </li>
                            </ul>
                        </div>
                        <div className={styles.columnInfo}><h2>Liên hệ</h2>
                            <ul>
                                <li><a href="tel:0123456789">0987654321</a></li>
                                <li><a href="mailto:info@khkfashion.com">info@khkfashion.com</a></li>
                                <li>
                                    <FontAwesomeIcon icon={faYoutube} size="2x" />
                                    <FontAwesomeIcon icon={faDiscord} size="2x" />
                                    <FontAwesomeIcon icon={faInstagram} size="2x" />
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

            </footer>
            <div className={styles.copyright}>
                <p>&copy; 2023 KHK Fashion. All rights reserved.</p>
                <p>Disclaimer: This website is for educational purposes only. All product information and images are used for demonstration. No commercial transactions are processed.</p>
            </div>
        </>

    )
}
