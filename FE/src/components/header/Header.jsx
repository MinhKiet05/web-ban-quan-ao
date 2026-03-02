import styles from './Header.module.css';
import logo from '../../../public/logo-KHK.webp';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagnifyingGlass, faCartShopping, faUser, faRightFromBracket } from '@fortawesome/free-solid-svg-icons';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function Header() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const dropdownRef = useRef(null);
    const cartRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchTerm.trim()) {
            navigate(`/products?search=${encodeURIComponent(searchTerm.trim())}`);
        }
    };

    const handleProductClick = (value) => {
        if (value === 'all') {
            navigate('/products');
        } else {
            navigate(`/products?category=${value}`);
        }
        setIsDropdownOpen(false);
    };

    return (
        <header className={styles.header}>
            <div className={styles.headerContent}>
                <div className={styles.logo}>
                    <Link to="/">
                        <img src={logo} alt="Logo" />
                    </Link>
                </div>
                <form className={styles.searchBar} onSubmit={handleSearch}>
                    <FontAwesomeIcon icon={faMagnifyingGlass} />
                    <input 
                        type="text" 
                        placeholder="Search Items, Fashion, Collection and Users" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </form>
                <div className={styles.navLinks}>
                    <Link 
                        to="/" 
                        className={location.pathname === '/' ? styles.active : ''}
                    >
                        Home
                    </Link>
                    <div className={styles.dropdownContainer} ref={dropdownRef}>
                        <button 
                            className={`${styles.dropdownButton} ${location.pathname === '/products' ? styles.active : ''} ${isDropdownOpen ? styles.open : ''}`}
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        >
                            Product
                            <span className={styles.arrow}>▼</span>
                        </button>
                        {isDropdownOpen && (
                            <div className={styles.dropdownMenu}>
                                <div className={styles.dropdownItem} onClick={() => handleProductClick('all')}>
                                    All
                                </div>
                                <div className={styles.dropdownItem} onClick={() => handleProductClick('tops')}>
                                    Tops
                                </div>
                                <div className={styles.dropdownItem} onClick={() => handleProductClick('bottoms')}>
                                    Bottoms
                                </div>
                                <div className={styles.dropdownItem} onClick={() => handleProductClick('outerwear')}>
                                    Outerwear
                                </div>
                                <div className={styles.dropdownItem} onClick={() => handleProductClick('sale')}>
                                    Sale
                                </div>
                            </div>
                        )}
                    </div>
                    <Link 
                        to="/about-us" 
                        className={location.pathname === '/about-us' ? styles.active : ''}
                    >
                        About Us
                    </Link>
                </div>
                <div className={styles.userActions}>
                    <div 
                        className={styles.cartContainer} 
                        ref={cartRef}
                        onMouseEnter={() => setIsCartOpen(true)}
                        onMouseLeave={() => setIsCartOpen(false)}
                    >
                        <Link to="/cart" className={styles.cartIcon}>
                            <FontAwesomeIcon icon={faCartShopping} />
                        </Link>
                        {isCartOpen && (
                            <div className={styles.cartPopup}>
                                <div className={styles.cartHeader}>
                                    Giỏ hàng
                                </div>
                                <div className={styles.cartItems}>
                                    {/* Cart items will go here */}
                                    <div className={styles.emptyCart}>
                                        Giỏ hàng trống
                                    </div>
                                </div>
                                <div className={styles.cartFooter}>
                                    <div className={styles.cartTotal}>
                                        <span>Tổng tiền:</span>
                                        <span className={styles.totalAmount}>0đ</span>
                                    </div>
                                    <button className={styles.checkoutButton}>
                                        Tiến hành thanh toán
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    {user ? (
                        <div className={styles.userMenu}>
                            <FontAwesomeIcon icon={faUser} />
                            <span className={styles.userName}>{user.fullName || user.email}</span>
                            <button className={styles.logoutBtn} onClick={logout} title="Đăng xuất">
                                <FontAwesomeIcon icon={faRightFromBracket} />
                            </button>
                        </div>
                    ) : (
                        <div className={styles.loginButton} onClick={() => navigate('/login')}>
                            <FontAwesomeIcon icon={faUser} /><span>Đăng nhập</span>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}