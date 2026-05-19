import { useState, useEffect, useCallback } from 'react';
import {
    ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
    AreaChart, Area,
    PieChart, Pie, Legend,
} from 'recharts';
import styles from '../AdminDashboard.module.css';
import { BASE_URL, fmt, STATUS_CONFIG } from './Shared.jsx';

// ── Custom Tooltip: Doanh thu ──────────────────────────────────────────────────
function RevenueTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.10)', fontSize: '0.82rem' }}>
            <div style={{ fontWeight: 700, color: '#333', marginBottom: 4 }}>{label}</div>
            {payload.map((p, i) => (
                <div key={i} style={{ color: p.color }}>
                    {p.name}: <strong>{fmt(p.value)}</strong>
                </div>
            ))}
            {payload[0]?.payload?.orders != null && (
                <div style={{ color: '#888', marginTop: 2 }}>{payload[0].payload.orders} đơn</div>
            )}
        </div>
    );
}

// ── Custom Tooltip: Đơn giản ───────────────────────────────────────────────────
function SimpleTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    const val = payload[0]?.value ?? 0;
    return (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.10)', fontSize: '0.82rem' }}>
            <div style={{ fontWeight: 700, color: '#333', marginBottom: 4 }}>{label}</div>
            <div style={{ color: payload[0]?.color || '#555' }}>
                <strong>{val.toLocaleString('vi-VN')}</strong> người dùng mới
            </div>
        </div>
    );
}

// ── Custom Tooltip: Donut ──────────────────────────────────────────────────────
function DonutTooltip({ active, payload }) {
    if (!active || !payload?.length) return null;
    const d = payload[0];
    return (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.10)', fontSize: '0.82rem' }}>
            <div style={{ color: d.payload.color, fontWeight: 700 }}>{d.name}</div>
            <div>{d.value} đơn &nbsp;<span style={{ color: '#888' }}>({Math.round((d.payload.percent ?? 0) * 100)}%)</span></div>
        </div>
    );
}

// ── Revenue Bar Chart ──────────────────────────────────────────────────────────
function RevenueBarChart({ data, color = '#3b82f6' }) {
    if (!data?.length) return <EmptyChart />;
    return (
        <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data} margin={{ top: 16, right: 16, left: 8, bottom: 4 }} barCategoryGap="35%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#888' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => v >= 1e6 ? `${(v / 1e6).toFixed(1)}tr` : `${(v / 1e3).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#aaa' }} axisLine={false} tickLine={false} width={52} />
                <Tooltip content={<RevenueTooltip />} cursor={{ fill: 'rgba(59,130,246,0.06)' }} />
                <Bar dataKey="revenue" name="Doanh thu" radius={[6, 6, 0, 0]} maxBarSize={64}>
                    {data.map((_, i) => <Cell key={i} fill={color} fillOpacity={0.85} />)}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}

// ── User Growth Bar Chart ──────────────────────────────────────────────────────
function UserBarChart({ data, color = '#8b5cf6' }) {
    if (!data?.length) return <EmptyChart />;
    return (
        <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data} margin={{ top: 16, right: 16, left: 8, bottom: 4 }} barCategoryGap="35%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#888' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#aaa' }} axisLine={false} tickLine={false} width={32} allowDecimals={false} />
                <Tooltip content={<SimpleTooltip />} cursor={{ fill: 'rgba(139,92,246,0.06)' }} />
                <Bar dataKey="new_users" name="Người dùng mới" radius={[6, 6, 0, 0]} maxBarSize={64}>
                    {data.map((_, i) => <Cell key={i} fill={color} fillOpacity={0.85} />)}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}

// ── Revenue Area Chart (7 ngày) ────────────────────────────────────────────────
function RevenueAreaChart({ data, color = '#10b981' }) {
    if (!data?.length) return <EmptyChart />;
    return (
        <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data} margin={{ top: 16, right: 16, left: 8, bottom: 4 }}>
                <defs>
                    <linearGradient id="areaGreen" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#888' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => v >= 1e6 ? `${(v / 1e6).toFixed(1)}tr` : `${(v / 1e3).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#aaa' }} axisLine={false} tickLine={false} width={52} />
                <Tooltip content={<RevenueTooltip />} cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: '4 2' }} />
                <Area type="monotone" dataKey="revenue" name="Doanh thu" stroke={color} strokeWidth={2.5} fill="url(#areaGreen)" dot={{ r: 4, fill: color, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
            </AreaChart>
        </ResponsiveContainer>
    );
}

// ── Donut Chart (order status) ─────────────────────────────────────────────────
function DonutChart({ slices }) {
    const total = slices.reduce((s, d) => s + d.value, 0);
    if (total === 0) return <EmptyChart />;

    const RADIAN = Math.PI / 180;
    const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
        if (percent < 0.05) return null;
        const r = innerRadius + (outerRadius - innerRadius) * 0.55;
        const x = cx + r * Math.cos(-midAngle * RADIAN);
        const y = cy + r * Math.sin(-midAngle * RADIAN);
        return <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={700}>{`${Math.round(percent * 100)}%`}</text>;
    };

    return (
        <ResponsiveContainer width="100%" height={210}>
            <PieChart>
                <Pie data={slices} cx="42%" cy="50%" innerRadius={52} outerRadius={82} dataKey="value" nameKey="label" labelLine={false} label={renderLabel} paddingAngle={2}>
                    {slices.map((s, i) => <Cell key={i} fill={s.color} opacity={0.9} />)}
                </Pie>
                <Tooltip content={<DonutTooltip />} />
                <Legend layout="vertical" align="right" verticalAlign="middle" iconType="square" iconSize={9}
                    formatter={(value, entry) => (
                        <span style={{ fontSize: '0.78rem', color: '#555' }}>
                            {value} <strong style={{ color: '#111' }}>{entry.payload.value}</strong>
                        </span>
                    )}
                />
            </PieChart>
        </ResponsiveContainer>
    );
}

function EmptyChart() {
    return (
        <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: '0.85rem' }}>
            Chưa có dữ liệu
        </div>
    );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent }) {
    return (
        <div className={styles.statCard} style={{ borderTop: `3px solid ${accent}` }}>
            <div className={styles.statLabel}>{label}</div>
            <div className={styles.statValue}>{value}</div>
            {sub && <div style={{ fontSize: '0.72rem', color: '#999', marginTop: 4 }}>{sub}</div>}
        </div>
    );
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function ChartSection({ title, children }) {
    return (
        <div className={styles.section}>
            <div className={styles.sectionHeader}>
                <div className={styles.sectionTitle}>{title}</div>
            </div>
            <div style={{ padding: '1.25rem 1.5rem' }}>{children}</div>
        </div>
    );
}

// ── Main StatsView ─────────────────────────────────────────────────────────────
export default function StatsView({ token }) {
    const [dash, setDash] = useState(null);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const authHeader = useCallback(() => ({ Authorization: `Bearer ${token}` }), [token]);

    useEffect(() => {
        setLoading(true);
        setError(null);
        Promise.all([
            fetch(`${BASE_URL}/admin/dashboard`, { headers: authHeader() }).then(r => r.json()),
            fetch(`${BASE_URL}/admin/stats`,     { headers: authHeader() }).then(r => r.json()),
        ]).then(([d, s]) => {
            if (d.data)  setDash(d.data);
            if (s.data)  setStats(s.data);
        }).catch(err => {
            setError('Không thể tải dữ liệu thống kê');
            console.error('Stats load error:', err);
        }).finally(() => setLoading(false));
    }, [authHeader]);

    if (loading) {
        return <div style={{ padding: '3rem', textAlign: 'center', color: '#aaa' }}>Đang tải thống kê...</div>;
    }
    if (error || !dash) {
        return <div style={{ padding: '3rem', textAlign: 'center', color: '#ef4444' }}>{error || 'Không có dữ liệu'}</div>;
    }

    const ps = stats?.product_stats || {};

    // Donut slices for order status
    const donutSlices = Object.entries(STATUS_CONFIG).map(([key, cfg]) => ({
        label: cfg.text,
        value: dash[`${key}_orders`] || 0,
        color: cfg.color,
    })).filter(s => s.value > 0);

    return (
        <div>
            {/* ── Stat cards ─────────────────────────────────────────── */}
            <div className={styles.statsGrid} style={{ marginBottom: '1.5rem' }}>
                <StatCard
                    label="Tổng đơn hàng"
                    value={dash.total_orders?.toLocaleString('vi-VN') ?? '—'}
                    sub={`Hoàn thành: ${dash.completed_orders ?? 0} · Huỷ: ${dash.cancelled_orders ?? 0}`}
                    accent="#3b82f6"
                />
                <StatCard
                    label="Doanh thu tích luỹ"
                    value={fmt(dash.total_revenue)}
                    sub={`Tháng này: ${fmt(dash.monthly_revenue)}`}
                    accent="#10b981"
                />
                <StatCard
                    label="Tổng người dùng"
                    value={dash.total_users?.toLocaleString('vi-VN') ?? '—'}
                    sub={`Tháng này: +${stats?.user_growth?.at(-1)?.new_users ?? 0}`}
                    accent="#8b5cf6"
                />
                <StatCard
                    label="Sản phẩm"
                    value={ps.total_products?.toLocaleString('vi-VN') ?? '—'}
                    sub={`Đang bán: ${ps.active ?? 0} · Sắp hết hàng: ${ps.low_stock ?? 0}`}
                    accent="#f59e0b"
                />
            </div>

            {/* ── Row: Revenue by month + Order status ───────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <ChartSection title="Doanh thu theo tháng (6 tháng gần nhất)">
                    <RevenueBarChart data={stats?.monthly_revenue ?? []} color="#3b82f6" />
                </ChartSection>

                <ChartSection title="Trạng thái đơn hàng">
                    <DonutChart slices={donutSlices} />
                </ChartSection>
            </div>

            {/* ── Row: Daily trend + User growth ─────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <ChartSection title="Doanh thu 7 ngày gần nhất">
                    <RevenueAreaChart data={dash.revenue_chart ?? []} color="#10b981" />
                </ChartSection>

                <ChartSection title="Người dùng mới theo tháng">
                    <UserBarChart data={stats?.user_growth ?? []} color="#8b5cf6" />
                </ChartSection>
            </div>

            {/* ── Row: Top products + Product status ─────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <ChartSection title="Top 10 sản phẩm bán chạy">
                    {stats?.top_products?.length > 0 ? (
                        <table className={styles.table} style={{ marginTop: 0 }}>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Sản phẩm</th>
                                    <th style={{ textAlign: 'right' }}>Đã bán</th>
                                    <th style={{ textAlign: 'right' }}>Doanh thu</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.top_products.map((p, i) => (
                                    <tr key={p.id}>
                                        <td style={{ color: i < 3 ? '#f59e0b' : '#aaa', fontWeight: 800 }}>{i + 1}</td>
                                        <td style={{ fontWeight: 600, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {p.product_name}
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{p.sold_count?.toLocaleString('vi-VN')}</td>
                                        <td style={{ textAlign: 'right', color: '#10b981', fontWeight: 700 }}>{fmt(p.revenue)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : <EmptyChart />}
                </ChartSection>

                <ChartSection title="Phân loại sản phẩm">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.5rem 0' }}>
                        {[
                            { label: 'Đang bán',  key: 'active',   color: '#10b981' },
                            { label: 'Nháp',       key: 'draft',    color: '#f59e0b' },
                            { label: 'Lưu trữ',   key: 'archived', color: '#9ca3af' },
                            { label: 'Sắp hết hàng', key: 'low_stock', color: '#ef4444' },
                        ].map(item => {
                            const val = ps[item.key] ?? 0;
                            const total = (ps.total_products || 1);
                            const pct = item.key === 'low_stock' ? null : Math.round((val / total) * 100);
                            return (
                                <div key={item.key}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 4 }}>
                                        <span style={{ color: '#555' }}>{item.label}</span>
                                        <span style={{ fontWeight: 700 }}>{val}{pct !== null ? ` (${pct}%)` : ' variants'}</span>
                                    </div>
                                    {pct !== null && (
                                        <div style={{ height: 6, background: '#f0f0f0', borderRadius: 3, overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${pct}%`, background: item.color, borderRadius: 3, transition: 'width 0.5s' }} />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </ChartSection>
            </div>
        </div>
    );
}

