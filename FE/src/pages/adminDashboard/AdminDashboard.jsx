import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import styles from './AdminDashboard.module.css';

const BASE_URL = 'http://localhost:3000/api';

/* ── Constants ─────────────────────────────────────────────── */
const STATUS_CONFIG = {
    pending:    { text: 'Chờ xử lý',      color: '#f59e0b' },
    confirmed:  { text: 'Đã xác nhận',    color: '#3b82f6' },
    packing:    { text: 'Đang đóng gói',  color: '#8b5cf6' },
    shipped:    { text: 'Đang giao hàng', color: '#06b6d4' },
    delivered:  { text: 'Đã giao hàng',   color: '#10b981' },
    completed:  { text: 'Hoàn thành',     color: '#059669' },
    cancelled:  { text: 'Đã huỷ',         color: '#ef4444' },
    refunded:   { text: 'Đã hoàn tiền',   color: '#f97316' },
};

const STATUS_FLOW = ['pending', 'confirmed', 'packing', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded'];

function fmt(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount ?? 0);
}

function fmtDate(d) {
    return d ? new Date(d).toLocaleDateString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    }) : '—';
}

function initials(name) {
    return (name || 'U').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

/* ── Sub-components ────────────────────────────────────────── */
function StatusBadge({ status }) {
    const s = STATUS_CONFIG[status] || { text: status, color: '#888', icon: '•' };
    return (
        <span className={styles.badge} style={{ '--badge-color': s.color }}>
            {s.text}
        </span>
    );
}

function Toast({ msg, type, onDone }) {
    useEffect(() => {
        const t = setTimeout(onDone, 3000);
        return () => clearTimeout(t);
    }, [onDone]);
    return (
        <div className={`${styles.toast} ${type === 'success' ? styles.toastSuccess : styles.toastError}`}>
            {type === 'success' ? '✓ ' : '✕ '}{msg}
        </div>
    );
}

/* ── Revenue Bar Chart (SVG) ─────────────────────────────────── */
function RevenueBarChart({ data }) {
    if (!data || data.length === 0) {
        return (
            <div className={styles.chartEmpty}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>📊</div>
                <div>Chưa có dữ liệu doanh thu</div>
            </div>
        );
    }
    const W = 600, H = 220, PAD = { top: 20, right: 20, bottom: 40, left: 60 };
    const innerW = W - PAD.left - PAD.right;
    const innerH = H - PAD.top - PAD.bottom;
    const maxRev = Math.max(...data.map(d => Number(d.revenue)), 1);
    const barW = Math.floor(innerW / data.length * 0.55);
    const gap  = innerW / data.length;
    const yTicks = 4;

    const fmtShort = v => {
        if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'tr';
        if (v >= 1_000)     return (v / 1_000).toFixed(0) + 'k';
        return v;
    };

    return (
        <svg viewBox={`0 0 ${W} ${H}`} className={styles.chartSvg} preserveAspectRatio="xMidYMid meet">
            <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"  stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.7" />
                </linearGradient>
                <filter id="barGlow">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
            </defs>

            {/* Y-axis gridlines + labels */}
            {Array.from({ length: yTicks + 1 }, (_, i) => {
                const val = (maxRev / yTicks) * i;
                const y   = PAD.top + innerH - (val / maxRev) * innerH;
                return (
                    <g key={i}>
                        <line x1={PAD.left} x2={PAD.left + innerW} y1={y} y2={y}
                            stroke="#1e2130" strokeWidth="1" />
                        <text x={PAD.left - 6} y={y + 4} textAnchor="end"
                            fontSize="10" fill="#475569">{fmtShort(val)}</text>
                    </g>
                );
            })}

            {/* Bars */}
            {data.map((d, i) => {
                const rev  = Number(d.revenue);
                const barH = Math.max((rev / maxRev) * innerH, 2);
                const x    = PAD.left + gap * i + (gap - barW) / 2;
                const y    = PAD.top + innerH - barH;
                return (
                    <g key={i}>
                        {/* Glow shadow bar */}
                        <rect x={x} y={y} width={barW} height={barH}
                            rx="4" fill="url(#barGrad)" opacity="0.25" filter="url(#barGlow)" />
                        {/* Main bar */}
                        <rect x={x} y={y} width={barW} height={barH}
                            rx="4" fill="url(#barGrad)" />
                        {/* Revenue label on top */}
                        {barH > 16 && (
                            <text x={x + barW / 2} y={y - 5} textAnchor="middle"
                                fontSize="9" fill="#a5b4fc">{fmtShort(rev)}</text>
                        )}
                        {/* Orders count inside bar */}
                        {barH > 28 && (
                            <text x={x + barW / 2} y={y + barH - 6} textAnchor="middle"
                                fontSize="8" fill="rgba(255,255,255,0.6)">{d.orders}</text>
                        )}
                        {/* X-axis label */}
                        <text x={x + barW / 2} y={PAD.top + innerH + 16} textAnchor="middle"
                            fontSize="10" fill="#64748b">{d.label}</text>
                    </g>
                );
            })}

            {/* Y axis line */}
            <line x1={PAD.left} x2={PAD.left} y1={PAD.top} y2={PAD.top + innerH}
                stroke="#334155" strokeWidth="1" />
        </svg>
    );
}

/* ── Order Donut Chart (SVG) ──────────────────────────────────── */
function OrderDonutChart({ stats }) {
    const KEYS = ['pending','confirmed','packing','shipped','delivered','completed','cancelled','refunded'];
    const slices = KEYS.map(k => ({
        key: k,
        label: STATUS_CONFIG[k].text,
        color: STATUS_CONFIG[k].color,
        value: stats[`${k}_orders`] ?? 0,
    })).filter(s => s.value > 0);

    const total = slices.reduce((s, d) => s + d.value, 0);

    if (total === 0) {
        return (
            <div className={styles.chartEmpty}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>🍩</div>
                <div>Chưa có đơn hàng nào</div>
            </div>
        );
    }

    const R = 70, cx = 110, cy = 110, stroke = 44;
    const circ = 2 * Math.PI * R;
    let offset = 0;

    const segments = slices.map(s => {
        const pct  = s.value / total;
        const dash = pct * circ;
        const seg  = { ...s, pct, dash, offset };
        offset += dash;
        return seg;
    });

    return (
        <div className={styles.donutWrap}>
            <svg viewBox="0 0 220 220" className={styles.donutSvg}>
                <defs>
                    {segments.map((s, i) => (
                        <filter key={i} id={`glow-${i}`}>
                            <feGaussianBlur stdDeviation="2" result="blur" />
                            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                        </filter>
                    ))}
                </defs>
                {/* Background circle */}
                <circle cx={cx} cy={cy} r={R} fill="none"
                    stroke="#1e2130" strokeWidth={stroke} />
                {/* Segments */}
                {segments.map((s, i) => (
                    <circle key={i} cx={cx} cy={cy} r={R} fill="none"
                        stroke={s.color} strokeWidth={stroke - 2}
                        strokeDasharray={`${s.dash} ${circ - s.dash}`}
                        strokeDashoffset={-(s.offset - circ / 4)}
                        strokeLinecap="butt"
                        style={{ transition: 'stroke-dasharray 0.6s ease' }}
                    />
                ))}
                {/* Center text */}
                <text x={cx} y={cy - 8} textAnchor="middle" fontSize="22"
                    fontWeight="700" fill="#f1f5f9">{total}</text>
                <text x={cx} y={cy + 12} textAnchor="middle" fontSize="10"
                    fill="#64748b">đơn hàng</text>
            </svg>
            {/* Legend */}
            <div className={styles.donutLegend}>
                {segments.map((s, i) => (
                    <div key={i} className={styles.legendItem}>
                        <span className={styles.legendDot} style={{ background: s.color }} />
                        <span className={styles.legendLabel}>{s.label}</span>
                        <span className={styles.legendVal}>{s.value}</span>
                        <span className={styles.legendPct}>{(s.pct * 100).toFixed(1)}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ── Stats View ──────────────────────────────────────────────── */
function StatsView({ stats }) {
    if (!stats) return (
        <div className={styles.statsLoading}>
            <div className={styles.spinner} />
            <p>Đang tải thống kê...</p>
        </div>
    );

    const chart = stats.revenue_chart || [];
    const totalRevenue  = Number(stats.total_revenue  ?? 0);
    const monthRevenue  = Number(stats.monthly_revenue ?? 0);
    const prevMonthPct  = totalRevenue > 0 ? ((monthRevenue / totalRevenue) * 100).toFixed(1) : 0;
    const completedRate = stats.total_orders > 0
        ? (((stats.completed_orders ?? 0) + (stats.delivered_orders ?? 0)) / stats.total_orders * 100).toFixed(1)
        : 0;
    const cancelRate = stats.total_orders > 0
        ? ((stats.cancelled_orders ?? 0) / stats.total_orders * 100).toFixed(1)
        : 0;

    const fmtVND = v => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);

    return (
        <div className={styles.statsView}>
            {/* KPI row */}
            <div className={styles.kpiRow}>
                {[
                    { label: 'Tổng đơn hàng', value: stats.total_orders?.toLocaleString() ?? '0', sub: `${completedRate}% hoàn thành`, color: '#6366f1' },
                    { label: 'Tổng doanh thu', value: fmtVND(totalRevenue), sub: `${prevMonthPct}% từ tháng này`, color: '#10b981' },
                    { label: 'Doanh thu tháng', value: fmtVND(monthRevenue), sub: 'Tháng hiện tại', color: '#3b82f6' },
                    { label: 'Người dùng', value: stats.total_users?.toLocaleString() ?? '0', sub: 'Tổng tài khoản', color: '#f59e0b' },
                    { label: 'Tỉ lệ huỷ', value: `${cancelRate}%`, sub: `${stats.cancelled_orders ?? 0} đơn bị huỷ`, color: '#ef4444' },
                ].map((k, i) => (
                    <div key={i} className={styles.kpiCard} style={{ '--kc': k.color }}>
                        <div className={styles.kpiIcon}>{k.icon}</div>
                        <div className={styles.kpiValue}>{k.value}</div>
                        <div className={styles.kpiLabel}>{k.label}</div>
                        <div className={styles.kpiSub}>{k.sub}</div>
                    </div>
                ))}
            </div>

            {/* Charts row */}
            <div className={styles.chartsRow}>
                {/* Revenue bar chart */}
                <div className={styles.chartCard}>
                    <div className={styles.chartTitle}>📈 Doanh thu 7 ngày gần nhất</div>
                    <div className={styles.chartSubtitle}>Đơn vị: VNĐ · Số hiển thị trong cột là số đơn hàng</div>
                    <RevenueBarChart data={chart} />
                </div>

                {/* Donut chart */}
                <div className={styles.chartCard}>
                    <div className={styles.chartTitle}>🍩 Phân bố trạng thái đơn</div>
                    <div className={styles.chartSubtitle}>Tổng tất cả đơn hàng theo trạng thái</div>
                    <OrderDonutChart stats={stats} />
                </div>
            </div>

            {/* Status breakdown table */}
            <div className={styles.chartCard} style={{ marginTop: 0 }}>
                <div className={styles.chartTitle}>📋 Chi tiết từng trạng thái</div>
                <div className={styles.statusTable}>
                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                        const count = stats[`${key}_orders`] ?? 0;
                        const pct   = stats.total_orders > 0 ? (count / stats.total_orders * 100) : 0;
                        return (
                            <div key={key} className={styles.statusRow}>
                                <div className={styles.statusRowLeft}>
                                    <span className={styles.statusDot} style={{ background: cfg.color }} />
                                    <span className={styles.statusRowLabel}>{cfg.icon} {cfg.text}</span>
                                </div>
                                <div className={styles.statusBar}>
                                    <div className={styles.statusBarFill}
                                        style={{ width: `${pct}%`, background: cfg.color }} />
                                </div>
                                <div className={styles.statusRowCount}>{count.toLocaleString()}</div>
                                <div className={styles.statusRowPct}>{pct.toFixed(1)}%</div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

/* ── Order Detail Modal ─────────────────────────────────────── */
function OrderDetailModal({ orderId, token, onClose, onStatusUpdated }) {
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState('');
    const [toast, setToast] = useState(null);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`${BASE_URL}/admin/orders/${orderId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                    credentials: 'include',
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.message || 'Lỗi tải chi tiết đơn');
                setOrder(data.data);
                setSelectedStatus(data.data.status);
            } catch (e) {
                setToast({ msg: e.message, type: 'error' });
            } finally {
                setLoading(false);
            }
        })();
    }, [orderId, token]);

    const handleSaveStatus = async () => {
        if (!selectedStatus || selectedStatus === order?.status) return;
        setSaving(true);
        try {
            const res = await fetch(`${BASE_URL}/admin/orders/${orderId}/status`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ status: selectedStatus }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Lỗi cập nhật');
            setOrder(prev => ({ ...prev, status: selectedStatus }));
            setToast({ msg: 'Cập nhật trạng thái thành công!', type: 'success' });
            onStatusUpdated(orderId, selectedStatus);
        } catch (e) {
            setToast({ msg: e.message, type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <button className={styles.modalClose} onClick={onClose}>✕</button>

                {loading && <p style={{ color: '#64748b', textAlign: 'center', padding: '40px 0' }}>Đang tải...</p>}

                {order && (
                    <>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
                            <div>
                                <div className={styles.modalTitle}>Chi tiết đơn hàng</div>
                                <div className={styles.modalMeta}>
                                    <span className={styles.orderCode}>{order.order_code}</span>
                                    {' · '}{fmtDate(order.created_at)}
                                </div>
                            </div>
                            <StatusBadge status={order.status} />
                        </div>

                        {/* User info */}
                        <div className={styles.modalSection}>
                            <div className={styles.modalSectionTitle}>Thông tin khách hàng</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div className={styles.userAvatar}>{initials(order.user_name)}</div>
                                <div>
                                    <div className={styles.userName}>{order.user_name || 'Khách vãng lai'}</div>
                                    <div className={styles.userEmail}>{order.user_email || '—'}</div>
                                </div>
                            </div>
                        </div>

                        {/* Shipping */}
                        <div className={styles.modalSection}>
                            <div className={styles.modalSectionTitle}>Địa chỉ giao hàng</div>
                            <div className={styles.infoGrid}>
                                <div className={styles.infoItem}>
                                    <div className={styles.infoKey}>Người nhận</div>
                                    <div className={styles.infoVal}>{order.shipping_name}</div>
                                </div>
                                <div className={styles.infoItem}>
                                    <div className={styles.infoKey}>Số điện thoại</div>
                                    <div className={styles.infoVal}>{order.shipping_phone}</div>
                                </div>
                                <div className={styles.infoItem} style={{ gridColumn: '1/-1' }}>
                                    <div className={styles.infoKey}>Địa chỉ</div>
                                    <div className={styles.infoVal}>
                                        {[order.shipping_street, order.shipping_ward, order.shipping_district, order.shipping_province].filter(Boolean).join(', ')}
                                    </div>
                                </div>
                                {order.payment_method && (
                                    <div className={styles.infoItem}>
                                        <div className={styles.infoKey}>Thanh toán</div>
                                        <div className={styles.infoVal}>{order.payment_method.toUpperCase()} · {order.payment_status}</div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Items */}
                        <div className={styles.modalSection}>
                            <div className={styles.modalSectionTitle}>Sản phẩm ({(order.items || []).length})</div>
                            {(order.items || []).map(item => (
                                <div key={item.id} className={styles.itemRow}>
                                    {item.image_url
                                        ? <img src={item.image_url} alt={item.product_name} className={styles.itemImg} />
                                        : <div className={styles.itemImgPlaceholder}>👕</div>
                                    }
                                    <div style={{ flex: 1 }}>
                                        <div className={styles.itemName}>{item.product_name}</div>
                                        <div className={styles.itemMeta}>
                                            {[item.size && `Size: ${item.size}`, item.color && `Màu: ${item.color}`].filter(Boolean).join(' · ')}
                                        </div>
                                    </div>
                                    <div className={styles.itemQty}>x{item.quantity}</div>
                                    <div className={styles.itemTotal}>{fmt(item.line_total)}</div>
                                </div>
                            ))}
                        </div>

                        {/* Summary */}
                        <div className={styles.modalSection}>
                            <div className={styles.summaryRow}><span>Tạm tính</span><span>{fmt(order.subtotal)}</span></div>
                            <div className={styles.summaryRow}><span>Phí ship</span><span>{fmt(order.shipping_fee)}</span></div>
                            {order.discount_amount > 0 && (
                                <div className={styles.summaryRow}><span>Giảm giá</span><span>-{fmt(order.discount_amount)}</span></div>
                            )}
                            <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
                                <span>Tổng cộng</span><span>{fmt(order.total)}</span>
                            </div>
                        </div>

                        {/* Status update */}
                        <div className={styles.statusUpdateBar}>
                            <div className={styles.statusUpdateLabel}>Cập nhật trạng thái</div>
                            {STATUS_FLOW.map(s => {
                                const cfg = STATUS_CONFIG[s];
                                return (
                                    <button
                                        key={s}
                                        className={`${styles.statusBtn} ${selectedStatus === s ? styles.statusBtnActive : ''}`}
                                        style={{ '--sc': cfg.color }}
                                        onClick={() => setSelectedStatus(s)}
                                    >
                                        {cfg.icon} {cfg.text}
                                    </button>
                                );
                            })}
                            <button
                                className={styles.saveBtn}
                                onClick={handleSaveStatus}
                                disabled={saving || selectedStatus === order.status}
                            >
                                {saving ? 'Đang lưu...' : 'Lưu trạng thái'}
                            </button>
                        </div>
                    </>
                )}

                {toast && (
                    <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />
                )}
            </div>
        </div>
    );
}

/* ── Main Dashboard ─────────────────────────────────────────── */
export default function AdminDashboard() {
    const navigate = useNavigate();
    const { user, accessToken } = useAuth();

    const [stats, setStats] = useState(null);
    const [orders, setOrders] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
    const [loading, setLoading] = useState(false);
    const [filterStatus, setFilterStatus] = useState('all');
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [selectedOrderId, setSelectedOrderId] = useState(null);
    const [activeView, setActiveView] = useState('orders');
    const [toast, setToast] = useState(null);

    /* Guard: redirect if not admin */
    useEffect(() => {
        if (!accessToken) { navigate('/login'); return; }
        if (user && user.role !== 'admin' && user.role !== 'super_admin') {
            navigate('/');
        }
    }, [accessToken, user, navigate]);

    /* Load dashboard stats */
    useEffect(() => {
        if (!accessToken) return;
        (async () => {
            try {
                const res = await fetch(`${BASE_URL}/admin/dashboard`, {
                    headers: { Authorization: `Bearer ${accessToken}` },
                    credentials: 'include',
                });
                const data = await res.json();
                if (res.ok) setStats(data.data);
            } catch (_) {}
        })();
    }, [accessToken]);

    /* Load orders */
    const fetchOrders = useCallback(async (page = 1) => {
        if (!accessToken) return;
        setLoading(true);
        try {
            const params = new URLSearchParams({ page, limit: 20 });
            if (filterStatus && filterStatus !== 'all') params.set('status', filterStatus);
            if (search) params.set('search', search);

            const res = await fetch(`${BASE_URL}/admin/orders?${params}`, {
                headers: { Authorization: `Bearer ${accessToken}` },
                credentials: 'include',
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            setOrders(data.data || []);
            setPagination(data.pagination || { page, limit: 20, total: 0, totalPages: 1 });
        } catch (e) {
            setToast({ msg: e.message, type: 'error' });
        } finally {
            setLoading(false);
        }
    }, [accessToken, filterStatus, search]);

    useEffect(() => { fetchOrders(1); }, [fetchOrders]);

    const handleSearch = (e) => {
        e.preventDefault();
        setSearch(searchInput);
    };

    const handleStatusUpdated = (orderId, newStatus) => {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
        if (stats) {
            setStats(prev => {
                const old = orders.find(o => o.id === orderId)?.status;
                if (!old || old === newStatus) return prev;
                return {
                    ...prev,
                    [`${old}_orders`]: Math.max(0, (prev[`${old}_orders`] || 0) - 1),
                    [`${newStatus}_orders`]: (prev[`${newStatus}_orders`] || 0) + 1,
                };
            });
        }
    };

    /* ── Render ── */
    const STAT_CARDS = stats ? [
        { label: 'Tổng đơn hàng', value: stats.total_orders?.toLocaleString(), accent: 'linear-gradient(90deg,#6366f1,#8b5cf6)' },
        { label: 'Tổng doanh thu', value: fmt(stats.total_revenue), accent: 'linear-gradient(90deg,#10b981,#059669)' },
        { label: 'Doanh thu tháng', value: fmt(stats.monthly_revenue), accent: 'linear-gradient(90deg,#3b82f6,#2563eb)' },
        { label: 'Tổng users', value: stats.total_users?.toLocaleString(), accent: 'linear-gradient(90deg,#f59e0b,#d97706)' },
    ] : [];

    const STATUS_MINI = stats ? [
        { key: 'pending',   statKey: 'pending_orders',   count: stats.pending_orders },
        { key: 'confirmed', statKey: 'confirmed_orders',  count: stats.confirmed_orders },
        { key: 'packing',   statKey: 'packing_orders',   count: stats.packing_orders },
        { key: 'shipped',   statKey: 'shipped_orders',   count: stats.shipped_orders },
        { key: 'delivered', statKey: 'delivered_orders', count: stats.delivered_orders },
        { key: 'completed', statKey: 'completed_orders', count: stats.completed_orders },
        { key: 'cancelled', statKey: 'cancelled_orders', count: stats.cancelled_orders },
        { key: 'refunded',  statKey: 'refunded_orders',  count: stats.refunded_orders },
    ] : [];

    return (
        <div className={styles.page}>
            {/* Sidebar */}
            <aside className={styles.sidebar}>
                <div className={styles.sidebarLogo}>
                    <div className={styles.sidebarLogoIcon}></div>
                    <div>
                        <div className={styles.sidebarLogoText}>Admin Panel</div>
                        <div className={styles.sidebarLogoSub}>Quản trị hệ thống</div>
                    </div>
                </div>

                <nav className={styles.sidebarNav}>
                    {[
                        { id: 'orders', label: 'Đơn hàng' },
                        { id: 'stats', label: 'Thống kê' },
                    ].map(item => (
                        <button
                            key={item.id}
                            className={`${styles.navItem} ${activeView === item.id ? styles.navItemActive : ''}`}
                            onClick={() => setActiveView(item.id)}
                        >
                            <span className={styles.navIcon}>{item.icon}</span>
                            {item.label}
                        </button>
                    ))}
                    <button
                        className={styles.navItem}
                        onClick={() => navigate('/')}
                        style={{ marginTop: 8 }}
                    >
                        <span className={styles.navIcon}></span>
                        Về trang chủ
                    </button>
                </nav>

                <div className={styles.sidebarFooter}>
                    <div style={{ marginBottom: 4 }}>👤 {user?.full_name || 'Admin'}</div>
                    <div style={{ color: '#6366f1' }}>{user?.role || 'admin'}</div>
                </div>
            </aside>

            {/* Main */}
            <main className={styles.main}>
                {/* Top bar */}
                <div className={styles.topBar}>
                    <div>
                        <div className={styles.pageTitle}>
                            {activeView === 'orders' ? 'Quản lý đơn hàng' : 'Thống kê tổng quan'}
                        </div>
                        <div className={styles.pageSubtitle}>
                            {pagination.total ? `${pagination.total} đơn hàng` : 'Đang tải...'}
                        </div>
                    </div>
                    <div className={styles.adminBadge}>
                        <div className={styles.adminAvatar}>{initials(user?.full_name)}</div>
                        {user?.full_name || 'Admin'}
                    </div>
                </div>

                {/* ── Stats View ── */}
                {activeView === 'stats' && <StatsView stats={stats} />}

                {/* ── Orders View ── */}
                {activeView === 'orders' && (
                <>
                {/* Status filter mini */}
                <div className={styles.statusGrid}>
                    {STATUS_MINI.map(({ key, count }) => {
                        const cfg = STATUS_CONFIG[key];
                        return (
                            <div
                                key={key}
                                className={`${styles.statusMini} ${filterStatus === key ? styles.statusMiniActive : ''}`}
                                style={{ '--sc': cfg.color }}
                                onClick={() => setFilterStatus(filterStatus === key ? 'all' : key)}
                            >
                                <div className={styles.statusMiniCount}>{count ?? 0}</div>
                                <div className={styles.statusMiniLabel}>{cfg.text}</div>
                            </div>
                        );
                    })}
                    {!stats && [1,2,3,4,5,6,7,8].map(i => (
                        <div key={i} className={styles.statusMini}>
                            <div style={{ height: 50, background: '#1a1d27', borderRadius: 8 }} />
                        </div>
                    ))}
                </div>

                {/* Orders table */}
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <div className={styles.sectionTitle}>
                            Danh sách đơn hàng
                            {filterStatus !== 'all' && (
                                <span style={{ marginLeft: 8, color: STATUS_CONFIG[filterStatus]?.color, fontSize: 13 }}>
                                    · {STATUS_CONFIG[filterStatus]?.text}
                                </span>
                            )}
                        </div>
                        <div className={styles.sectionActions}>
                            <form onSubmit={handleSearch}>
                                <div className={styles.searchBox}>
                                    <span style={{ color: '#475569' }}>🔍</span>
                                    <input
                                        id="admin-search"
                                        type="text"
                                        className={styles.searchInput}
                                        placeholder="Tìm mã đơn, tên, email..."
                                        value={searchInput}
                                        onChange={e => setSearchInput(e.target.value)}
                                    />
                                </div>
                            </form>
                            <select
                                id="admin-filter-status"
                                className={styles.filterSelect}
                                value={filterStatus}
                                onChange={e => setFilterStatus(e.target.value)}
                            >
                                <option value="all">Tất cả trạng thái</option>
                                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                                    <option key={k} value={k}>{v.text}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Mã đơn</th>
                                    <th>Khách hàng</th>
                                    <th>Ngày đặt</th>
                                    <th>SP</th>
                                    <th>Tổng tiền</th>
                                    <th>Thanh toán</th>
                                    <th>Trạng thái</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && (
                                    <tr className={styles.loadingRow}>
                                        <td colSpan={8}>⏳ Đang tải dữ liệu...</td>
                                    </tr>
                                )}
                                {!loading && orders.length === 0 && (
                                    <tr>
                                        <td colSpan={8}>
                                            <div className={styles.emptyState}>
                                                <div className={styles.emptyIcon}>📭</div>
                                                <div className={styles.emptyText}>Không có đơn hàng nào</div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                                {!loading && orders.map(order => (
                                    <tr key={order.id} onClick={() => setSelectedOrderId(order.id)}>
                                        <td>
                                            <span className={styles.orderCode}>{order.order_code || order.id.slice(0, 8)}</span>
                                        </td>
                                        <td>
                                            <div className={styles.userCell}>
                                                <div className={styles.userAvatar}>{initials(order.user_name)}</div>
                                                <div>
                                                    <div className={styles.userName}>{order.user_name || 'Khách vãng lai'}</div>
                                                    <div className={styles.userEmail}>{order.user_email || '—'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ color: '#94a3b8', fontSize: 12 }}>{fmtDate(order.created_at)}</td>
                                        <td style={{ color: '#94a3b8', textAlign: 'center' }}>{order.item_count}</td>
                                        <td><span className={styles.amount}>{fmt(order.total)}</span></td>
                                        <td>
                                            {order.payment_method ? (
                                                <span style={{ fontSize: 11, color: '#64748b', background: '#1a1d27', padding: '2px 8px', borderRadius: 6 }}>
                                                    {order.payment_method.toUpperCase()}
                                                </span>
                                            ) : '—'}
                                        </td>
                                        <td><StatusBadge status={order.status} /></td>
                                        <td onClick={e => e.stopPropagation()}>
                                            <button
                                                id={`order-detail-${order.id}`}
                                                className={styles.actionBtn}
                                                onClick={() => setSelectedOrderId(order.id)}
                                            >
                                                Chi tiết
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                        <div className={styles.pagination}>
                            <div className={styles.pageInfo}>
                                Trang {pagination.page}/{pagination.totalPages} · {pagination.total} đơn hàng
                            </div>
                            <div className={styles.pageButtons}>
                                <button
                                    className={styles.pageBtn}
                                    disabled={pagination.page <= 1}
                                    onClick={() => fetchOrders(pagination.page - 1)}
                                >‹</button>
                                {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
                                    const p = i + 1;
                                    return (
                                        <button
                                            key={p}
                                            className={`${styles.pageBtn} ${pagination.page === p ? styles.pageBtnActive : ''}`}
                                            onClick={() => fetchOrders(p)}
                                        >{p}</button>
                                    );
                                })}
                                <button
                                    className={styles.pageBtn}
                                    disabled={pagination.page >= pagination.totalPages}
                                    onClick={() => fetchOrders(pagination.page + 1)}
                                >›</button>
                            </div>
                        </div>
                    )}
                </div>
                </>)}
            </main>

            {/* Order detail modal */}
            {selectedOrderId && (
                <OrderDetailModal
                    orderId={selectedOrderId}
                    token={accessToken}
                    onClose={() => setSelectedOrderId(null)}
                    onStatusUpdated={handleStatusUpdated}
                />
            )}

            {/* Global toast */}
            {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
        </div>
    );
}
