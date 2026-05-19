import { useEffect } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartBar, faShoppingBag, faShirt, faUsers, faBox, faHome } from '@fortawesome/free-solid-svg-icons';
import styles from './AdminDashboard.module.css';

export default function AdminLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, accessToken, loading: authLoading } = useAuth();

    useEffect(() => {
        if (authLoading) return;
        if (!accessToken) { navigate('/login'); return; }
        if (user && user.role !== 'admin' && user.role !== 'super_admin') {
            navigate('/');
        }
    }, [accessToken, user, navigate, authLoading]);

    if (authLoading) return <div className={styles.page}>Đang tải...</div>;

    const VIEWS = [
        { id: 'stats', path: '/admin/stats', label: 'Thống kê', icon: faChartBar },
        { id: 'orders', path: '/admin/orders', label: 'Đơn hàng', icon: faShoppingBag },
        { id: 'products', path: '/admin/products', label: 'Sản phẩm', icon: faShirt },
        { id: 'users', path: '/admin/users', label: 'Người dùng', icon: faUsers },
        { id: 'inventory', path: '/admin/inventory', label: 'Kho hàng', icon: faBox },
    ];

    const currentView = VIEWS.find(v => location.pathname === v.path);
    const currentLabel = currentView?.label || 'Admin Dashboard';

    return (
        <div className={styles.page}>
            <aside className={styles.sidebar}>
                <div className={styles.sidebarLogo}>
                    <div className={styles.sidebarLogoText}>ADMIN PANEL</div>
                </div>
                <nav className={styles.sidebarNav}>
                    {VIEWS.map(item => (
                        <button
                            key={item.id}
                            className={`${styles.navItem} ${location.pathname === item.path ? styles.navItemActive : ''}`}
                            onClick={() => navigate(item.path)}
                        >
                            <span className={styles.navIcon}><FontAwesomeIcon icon={item.icon} /></span>
                            {item.label}
                        </button>
                    ))}
                    <div style={{marginTop: '2rem', borderTop: '1px solid #e0e0e0', paddingTop: '1rem'}}>
                        <button className={styles.navItem} onClick={() => navigate('/')}>
                            <span className={styles.navIcon}><FontAwesomeIcon icon={faHome} /></span> Về trang chủ
                        </button>
                    </div>
                </nav>
                <div className={styles.sidebarFooter}>
                    <div>{user?.full_name || 'Admin'}</div>
                    <div style={{ opacity: 0.6 }}>{user?.role || 'admin'}</div>
                </div>
            </aside>
            <main className={styles.main}>
                <div className={styles.topBar}>
                    <h1 className={styles.pageTitle}>{currentLabel}</h1>
                </div>
                <Outlet />
            </main>
        </div>
    );
}
