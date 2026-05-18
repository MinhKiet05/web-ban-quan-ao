import styles from './Header.module.css';
import logo from '/logo-KHK.webp';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagnifyingGlass, faCartShopping, faUser, faRightFromBracket, faCircleUser, faBox } from '@fortawesome/free-solid-svg-icons';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useAuth } from '../../context/AuthContext';
import { getAvatarInitial } from '../../utils/avatarUtils';

export default function Header() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const cartItems = useSelector((state) => state.cart.items);
    const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const [searchTerm, setSearchTerm] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const cartRef = useRef(null);
    const userDropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
            if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
                setIsUserDropdownOpen(false);
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
            navigate(`/search?search=${encodeURIComponent(searchTerm.trim())}`);
            setSearchTerm('');
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
                        placeholder="Tìm kiếm sản phẩm..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </form>
                <div className={styles.navLinks}>
                    <Link 
                        to="/" 
                        className={location.pathname === '/' ? styles.active : ''}
                    >
                        Trang chủ
                    </Link>
                    <div className={styles.dropdownContainer} ref={dropdownRef}>
                        <button 
                            className={`${styles.dropdownButton} ${location.pathname === '/products' && !isDropdownOpen ? styles.active : ''} ${isDropdownOpen ? styles.open : ''}`}
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        >
                            Sản phẩm
                            <span className={styles.arrow}>▼</span>
                        </button>
                        {isDropdownOpen && (
                            <div className={styles.dropdownMenu}>
                                <div className={styles.dropdownItem} onClick={() => handleProductClick('all')}>
                                    Tất cả
                                </div>
                                <div className={styles.dropdownItem} onClick={() => handleProductClick('tops')}>
                                    Áo
                                </div>
                                <div className={styles.dropdownItem} onClick={() => handleProductClick('bottoms')}>
                                    Quần
                                </div>
                                <div className={styles.dropdownItem} onClick={() => handleProductClick('outerwear')}>
                                    Áo khoác
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
                        Về chúng tôi
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
                            {cartCount > 0 && (
                                <span className={styles.cartBadge}>{cartCount}</span>
                            )}
                        </Link>
                        {isCartOpen && (
                            <div className={styles.cartPopup}>
                                <div className={styles.cartHeader}>
                                    Giỏ hàng
                                </div>
                                <div className={styles.cartItems}>
                                    {cartItems.length === 0 ? (
                                        <div className={styles.emptyCart}>Giỏ hàng trống</div>
                                    ) : (
                                        cartItems.map(item => (
                                            <div key={item.id} className={styles.cartPopupItem}>
                                                <img src={item.image} alt={item.name} className={styles.cartPopupImg} />
                                                <div className={styles.cartPopupInfo}>
                                                    <p className={styles.cartPopupName}>{item.name}</p>
                                                    <p className={styles.cartPopupPrice}>{item.quantity} x {parseFloat(item.price).toLocaleString('vi-VN')}đ</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <div className={styles.cartFooter}>
                                    <div className={styles.cartTotal}>
                                        <span>Tổng tiền:</span>
                                        <span className={styles.totalAmount}>{cartItems.reduce((s, i) => s + i.price * i.quantity, 0).toLocaleString('vi-VN')}đ</span>
                                    </div>
                                    <button className={styles.checkoutButton} onClick={() => navigate('/cart')}>
                                        Tiến hành thanh toán
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    {user ? (
                        <div className={styles.userDropdownContainer} ref={userDropdownRef}>
                            <button 
                                className={`${styles.userButton} ${isUserDropdownOpen ? styles.open : ''}`}
                                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                            >
                                {user?.avatar_url ? (
                                    <img 
                                        src={user.avatar_url}
                                        alt="User Avatar"
                                        className={styles.userAvatar}
                                        title={user.fullName || user.email}
                                    />
                                ) : (
                                    <div className={styles.userAvatarPlaceholder}>
                                        <span>{getAvatarInitial(user)}</span>
                                    </div>
                                )}
                                <span className={styles.userName}>{user.fullName || user.email}</span>
                                <span className={styles.arrow}>▼</span>
                            </button>
                            {isUserDropdownOpen && (
                                <div className={styles.userDropdownMenu}>
                                    <div className={styles.dropdownItem} onClick={() => {
                                        navigate('/my');
                                        setIsUserDropdownOpen(false);
                                    }}>
                                        <FontAwesomeIcon icon={faCircleUser} />
                                        Thông tin cá nhân
                                    </div>
                                    <div className={styles.dropdownItem} onClick={() => {
                                        navigate('/orders');
                                        setIsUserDropdownOpen(false);
                                    }}>
                                        <FontAwesomeIcon icon={faBox} />
                                        Đơn hàng
                                    </div>
                                    <div className={styles.dropdownItem} onClick={() => {
                                        logout();
                                        setIsUserDropdownOpen(false);
                                    }}>
                                        <FontAwesomeIcon icon={faRightFromBracket} />
                                        Đăng xuất
                                    </div>
                                </div>
                            )}
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