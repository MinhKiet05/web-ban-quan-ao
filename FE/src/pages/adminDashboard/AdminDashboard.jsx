import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartBar, faShoppingBag, faShirt, faUsers, faBox, faHome } from '@fortawesome/free-solid-svg-icons';
import styles from './AdminDashboard.module.css';

import StatsView from './components/StatsView.jsx';
import OrdersView from './components/OrdersView.jsx';
import ProductsView from './components/ProductsView.jsx';
import UsersView from './components/UsersView.jsx';
import InventoryView from './components/InventoryView.jsx';

export default function AdminDashboard() {
    const navigate = useNavigate();
    const { user, accessToken, loading: authLoading } = useAuth();
    const [activeView, setActiveView] = useState('orders');

    useEffect(() => {
        if (authLoading) return;
        if (!accessToken) { navigate('/login'); return; }
        if (user && user.role !== 'admin' && user.role !== 'super_admin') {
            navigate('/');
        }
    }, [accessToken, user, navigate, authLoading]);

    if (authLoading) return <div className={styles.page}>Đang tải...</div>;

    const VIEWS = [
        { id: 'stats', label: 'Thống kê', icon: faChartBar },
        { id: 'orders', label: 'Đơn hàng', icon: faShoppingBag },
        { id: 'products', label: 'Sản phẩm', icon: faShirt },
        { id: 'users', label: 'Người dùng', icon: faUsers },
        { id: 'inventory', label: 'Kho hàng', icon: faBox },
    ];

    const renderView = () => {
        switch (activeView) {
            case 'stats': return <StatsView token={accessToken} />;
            case 'orders': return <OrdersView token={accessToken} />;
            case 'products': return <ProductsView token={accessToken} />;
            case 'users': return <UsersView token={accessToken} />;
            case 'inventory': return <InventoryView token={accessToken} />;
            default: return null;
        }
    };

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
                            className={`${styles.navItem} ${activeView === item.id ? styles.navItemActive : ''}`}
                            onClick={() => setActiveView(item.id)}
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
                    <h1 className={styles.pageTitle}>{VIEWS.find(v => v.id === activeView)?.label}</h1>
                </div>
                {renderView()}
            </main>
        </div>
    );
}
