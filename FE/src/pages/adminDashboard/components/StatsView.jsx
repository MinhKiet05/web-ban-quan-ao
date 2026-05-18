import { useState, useEffect, useCallback } from 'react';
import styles from '../AdminDashboard.module.css';
import { BASE_URL, fmt, STATUS_CONFIG } from './Shared.jsx';

// ── SVG Bar Chart ──────────────────────────────────────────────────────────────
function BarChart({ data, valueKey, labelKey, color = '#3b82f6', height = 160, formatVal }) {
    if (!data || data.length === 0) return <EmptyChart />;
    const max = Math.max(...data.map(d => +d[valueKey] || 0), 1);
    const total = data.length;
    const BAR_W = 28;
    const GAP = total > 8 ? 8 : 16;
    const svgW = total * (BAR_W + GAP) + 20;

    return (
        <div style={{ width: '100%', overflowX: 'auto' }}>
            <svg width="100%" viewBox={`0 0 ${svgW} ${height + 44}`} preserveAspectRatio="xMidYMid meet" style={{ display: 'block' }}>
                {[0.25, 0.5, 0.75, 1].map(t => (
                    <line key={t} x1={10} x2={svgW - 10}
                        y1={height * (1 - t)} y2={height * (1 - t)}
                        stroke="#f0f0f0" strokeWidth={1} />
                ))}
                {data.map((d, i) => {
                    const val = +d[valueKey] || 0;
                    const barH = Math.max((val / max) * height, val > 0 ? 2 : 0);
                    const x = 10 + i * (BAR_W + GAP);
                    const y = height - barH;
                    const displayVal = formatVal ? formatVal(val) : val.toLocaleString('vi-VN');
                    return (
                        <g key={i}>
                            <rect x={x} y={y} width={BAR_W} height={barH} fill={color} rx={3} opacity={0.85} />
                            <text x={x + BAR_W / 2} y={height + 16} textAnchor="middle" fontSize={9.5} fill="#888">{d[labelKey]}</text>
                            {val > 0 && (
                                <text x={x + BAR_W / 2} y={y - 5} textAnchor="middle" fontSize={8.5} fill="#444" fontWeight="700">
                                    {displayVal}
                                </text>
                            )}
                        </g>
                    );
                })}
            </svg>
        </div>
    );
}

// ── SVG Line/Area Chart ───────────────────────────────────────────────────────
function LineChart({ data, valueKey, labelKey, color = '#10b981', height = 140, formatVal }) {
    if (!data || data.length === 0) return <EmptyChart />;
    const max = Math.max(...data.map(d => +d[valueKey] || 0), 1);
    const W = 480;
    const padL = 8, padR = 8, padT = 24, padB = 28;
    const cW = W - padL - padR;
    const cH = height - padT - padB;
    const step = data.length > 1 ? cW / (data.length - 1) : cW;

    const pts = data.map((d, i) => ({
        x: padL + i * step,
        y: padT + cH - ((+d[valueKey] || 0) / max) * cH,
        val: +d[valueKey] || 0,
        label: d[labelKey],
    }));

    const polyline = pts.map(p => `${p.x},${p.y}`).join(' ');
    const area = `${pts[0].x},${padT + cH} ${polyline} ${pts[pts.length - 1].x},${padT + cH}`;

    return (
        <div style={{ width: '100%' }}>
            <svg viewBox={`0 0 ${W} ${height}`} width="100%" preserveAspectRatio="xMidYMid meet" style={{ display: 'block' }}>
                <defs>
                    <linearGradient id={`grad-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity={0.22} />
                        <stop offset="100%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                </defs>
                {[0.25, 0.5, 0.75, 1].map(t => (
                    <line key={t} x1={padL} x2={W - padR}
                        y1={padT + cH * (1 - t)} y2={padT + cH * (1 - t)}
                        stroke="#f0f0f0" strokeWidth={1} />
                ))}
                <polygon points={area} fill={`url(#grad-${color.replace('#','')})`} />
                <polyline points={polyline} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
                {pts.map((p, i) => (
                    <g key={i}>
                        <circle cx={p.x} cy={p.y} r={4} fill={color} stroke="#fff" strokeWidth={2} />
                        <text x={p.x} y={height - 4} textAnchor="middle" fontSize={9.5} fill="#888">{p.label}</text>
                    </g>
                ))}
            </svg>
        </div>
    );
}

// ── SVG Donut Chart (order status) ────────────────────────────────────────────
function DonutChart({ slices }) {
    const total = slices.reduce((s, d) => s + d.value, 0);
    if (total === 0) return <EmptyChart />;
    const R = 58, ri = 30, cx = 75, cy = 75;
    let angle = -Math.PI / 2;

    const paths = slices.filter(s => s.value > 0).map((s) => {
        const ratio = s.value / total;
        const sa = angle;
        const ea = angle + ratio * 2 * Math.PI;
        angle = ea;
        const lg = ratio > 0.5 ? 1 : 0;
        const x1 = cx + R * Math.cos(sa), y1 = cy + R * Math.sin(sa);
        const x2 = cx + R * Math.cos(ea), y2 = cy + R * Math.sin(ea);
        const xi1 = cx + ri * Math.cos(sa), yi1 = cy + ri * Math.sin(sa);
        const xi2 = cx + ri * Math.cos(ea), yi2 = cy + ri * Math.sin(ea);
        return {
            d: `M${x1} ${y1} A${R} ${R} 0 ${lg} 1 ${x2} ${y2} L${xi2} ${yi2} A${ri} ${ri} 0 ${lg} 0 ${xi1} ${yi1}Z`,
            color: s.color, label: s.label, value: s.value,
            pct: Math.round(ratio * 100),
        };
    });

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            <svg width={150} height={150} viewBox="0 0 150 150" style={{ flexShrink: 0 }}>
                {paths.map((p, i) => <path key={i} d={p.d} fill={p.color} opacity={0.88} />)}
                <text x={cx} y={cy + 4} textAnchor="middle" fontSize={13} fontWeight="800" fill="#111">{total}</text>
                <text x={cx} y={cy + 17} textAnchor="middle" fontSize={9} fill="#888">đơn hàng</text>
            </svg>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                {paths.map((p, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem' }}>
                        <span style={{ width: 9, height: 9, borderRadius: 2, background: p.color, flexShrink: 0 }} />
                        <span style={{ color: '#555', flex: 1 }}>{p.label}</span>
                        <span style={{ fontWeight: 700, color: '#111' }}>{p.value}</span>
                        <span style={{ color: '#aaa', minWidth: 32, textAlign: 'right' }}>{p.pct}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function EmptyChart() {
    return (
        <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: '0.85rem' }}>
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

    const authHeader = useCallback(() => ({ Authorization: `Bearer ${token}` }), [token]);

    useEffect(() => {
        setLoading(true);
        Promise.all([
            fetch(`${BASE_URL}/admin/dashboard`, { headers: authHeader() }).then(r => r.json()),
            fetch(`${BASE_URL}/admin/stats`,     { headers: authHeader() }).then(r => r.json()),
        ]).then(([d, s]) => {
            if (d.data)  setDash(d.data);
            if (s.data)  setStats(s.data);
        }).finally(() => setLoading(false));
    }, [authHeader]);

    if (loading || !dash) {
        return (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#aaa' }}>
                Đang tải thống kê...
            </div>
        );
    }

    const ps = stats?.product_stats || {};

    // Donut slices for order status
    const donutSlices = Object.entries(STATUS_CONFIG).map(([key, cfg]) => ({
        label: cfg.text,
        value: dash[`${key}_orders`] || 0,
        color: cfg.color,
    }));

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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <ChartSection title="Doanh thu theo tháng (6 tháng gần nhất)">
                    <BarChart
                        data={stats?.monthly_revenue ?? []}
                        valueKey="revenue"
                        labelKey="label"
                        color="#3b82f6"
                        height={170}
                        formatVal={v => v >= 1e6 ? `${(v / 1e6).toFixed(1)}tr` : `${(v / 1e3).toFixed(0)}k`}
                    />
                    {stats?.monthly_revenue?.length > 0 && (
                        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem', fontSize: '0.78rem', color: '#888' }}>
                            {stats.monthly_revenue.map((m, i) => (
                                <div key={i}>
                                    <span style={{ fontWeight: 700, color: '#333' }}>{m.label}: </span>
                                    <span>{fmt(m.revenue)}</span>
                                    <span style={{ color: '#aaa' }}> ({m.orders} đơn)</span>
                                </div>
                            ))}
                        </div>
                    )}
                </ChartSection>

                <ChartSection title="Trạng thái đơn hàng">
                    <DonutChart slices={donutSlices} />
                </ChartSection>
            </div>

            {/* ── Row: Daily trend + User growth ─────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <ChartSection title="Doanh thu 7 ngày gần nhất">
                    <LineChart
                        data={dash.revenue_chart ?? []}
                        valueKey="revenue"
                        labelKey="label"
                        color="#10b981"
                        height={150}
                        formatVal={v => v >= 1e6 ? `${(v / 1e6).toFixed(1)}tr` : `${(v / 1e3).toFixed(0)}k`}
                    />
                </ChartSection>

                <ChartSection title="Người dùng mới theo tháng">
                    <BarChart
                        data={stats?.user_growth ?? []}
                        valueKey="new_users"
                        labelKey="label"
                        color="#8b5cf6"
                        height={150}
                    />
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

