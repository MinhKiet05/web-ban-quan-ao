import { useEffect } from 'react';
import styles from '../AdminDashboard.module.css';

export const BASE_URL = 'http://localhost:3000/api';

export const STATUS_CONFIG = {
    pending:    { text: 'Chờ xử lý',      color: '#f59e0b' },
    confirmed:  { text: 'Đã xác nhận',    color: '#3b82f6' },
    packing:    { text: 'Đang đóng gói',  color: '#8b5cf6' },
    shipped:    { text: 'Đang giao hàng', color: '#06b6d4' },
    delivered:  { text: 'Đã giao hàng',   color: '#10b981' },
    completed:  { text: 'Hoàn thành',     color: '#059669' },
    cancelled:  { text: 'Đã huỷ',         color: '#ef4444' },
    refunded:   { text: 'Đã hoàn tiền',   color: '#f97316' },
};

export function fmt(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount ?? 0);
}

export function fmtDate(d) {
    return d ? new Date(d).toLocaleDateString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    }) : '—';
}

export function StatusBadge({ status }) {
    const s = STATUS_CONFIG[status] || { text: status, color: '#888' };
    return (
        <span className={styles.badge} style={{ '--badge-color': s.color }}>
            {s.text}
        </span>
    );
}

export function Toast({ msg, type, onDone }) {
    useEffect(() => {
        const t = setTimeout(onDone, 3000);
        return () => clearTimeout(t);
    }, [onDone]);
    return (
        <div style={{
            position: 'fixed', bottom: 20, right: 20, padding: '10px 20px',
            background: type === 'success' ? '#10b981' : '#ef4444', color: '#fff',
            borderRadius: 4, zIndex: 9999, fontWeight: 600, fontSize: '0.85rem'
        }}>
            {msg}
        </div>
    );
}
