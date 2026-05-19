import { useAuth } from '../../context/AuthContext.jsx';
import StatsView from './components/StatsView.jsx';
import OrdersView from './components/OrdersView.jsx';
import ProductsView from './components/ProductsView.jsx';
import UsersView from './components/UsersView.jsx';
import InventoryView from './components/InventoryView.jsx';

export function StatsViewWrapper() {
    const { accessToken } = useAuth();
    return <StatsView token={accessToken} />;
}

export function OrdersViewWrapper() {
    const { accessToken } = useAuth();
    return <OrdersView token={accessToken} />;
}

export function ProductsViewWrapper() {
    const { accessToken } = useAuth();
    return <ProductsView token={accessToken} />;
}

export function UsersViewWrapper() {
    const { accessToken } = useAuth();
    return <UsersView token={accessToken} />;
}

export function InventoryViewWrapper() {
    const { accessToken } = useAuth();
    return <InventoryView token={accessToken} />;
}
