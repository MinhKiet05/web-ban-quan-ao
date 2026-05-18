import { useState, useEffect, useCallback } from 'react';
import styles from '../AdminDashboard.module.css';
import { BASE_URL, Toast } from './Shared.jsx';

export default function InventoryView({ token }) {
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [toast, setToast] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [newStock, setNewStock] = useState(0);
    const [saving, setSaving] = useState(false);

    const fetchInventory = useCallback(() => {
        setLoading(true);
        const params = new URLSearchParams({ limit: 50, page });
        if (search) params.set('search', search);
        fetch(`${BASE_URL}/admin/inventory?${params}`, {
            headers: { Authorization: `Bearer ${token}` }
        }).then(r => r.json()).then(d => {
            if (d.data) setInventory(d.data);
            if (d.pagination) setTotalPages(d.pagination.totalPages);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [token, search, page]);

    useEffect(() => { fetchInventory(); }, [fetchInventory]);
    useEffect(() => { setPage(1); }, [search]);

    const openModal = (item) => {
        setSelectedItem(item);
        setNewStock(item.stock_qty ?? 0);
        setModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch(`${BASE_URL}/admin/inventory/variants/${selectedItem.variant_id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ stock_qty: newStock }),
            });
            const d = await res.json();
            if (d.success) {
                setInventory(prev => prev.map(it =>
                    it.variant_id === selectedItem.variant_id ? { ...it, stock_qty: d.data.stock_qty } : it
                ));
                setToast({ msg: 'Đã cập nhật tồn kho', type: 'success' });
                setModalOpen(false);
            } else {
                setToast({ msg: d.message || 'Lỗi cập nhật', type: 'error' });
            }
        } catch {
            setToast({ msg: 'Lỗi kết nối', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const stockStatus = (qty) => {
        if (qty > 10) return { t: 'Còn hàng', c: '#10b981' };
        if (qty > 0)  return { t: 'Sắp hết',  c: '#f59e0b' };
        return              { t: 'Hết hàng',  c: '#ef4444' };
    };

    return (
        <div>
            {toast && <Toast {...toast} onDone={() => setToast(null)} />}

            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div className={styles.searchBox}>
                    <input
                        className={styles.searchInput}
                        placeholder="Tìm tên sản phẩm, SKU..."
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') setSearch(searchInput); }}
                    />
                    <button className={styles.actionBtn} style={{ padding: '0.3rem 0.7rem', fontSize: '0.75rem' }} onClick={() => setSearch(searchInput)}>Tìm</button>
                </div>
            </div>

            <div className={styles.section}>
                <div className={styles.sectionHeader}>
                    <div className={styles.sectionTitle}>Quản lý Kho hàng (theo variant)</div>
                </div>
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Sản phẩm</th>
                                <th>SKU</th>
                                <th>Màu sắc</th>
                                <th>Kích thước</th>
                                <th>Giá bán</th>
                                <th>Tồn kho</th>
                                <th>Đã bán</th>
                                <th>Trạng thái</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="9" style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>Đang tải...</td></tr>
                            ) : inventory.length === 0 ? (
                                <tr><td colSpan="9" style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>Không có dữ liệu</td></tr>
                            ) : inventory.map(item => {
                                const stock = item.stock_qty ?? 0;
                                const st = stockStatus(stock);
                                return (
                                    <tr key={item.variant_id}>
                                        <td style={{ fontWeight: 600, maxWidth: 200 }}>
                                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.product_name}</div>
                                        </td>
                                        <td style={{ fontFamily: 'monospace', color: '#555', fontSize: '0.78rem' }}>{item.sku || '—'}</td>
                                        <td>{item.color || '—'}</td>
                                        <td style={{ fontWeight: 600 }}>{item.size || '—'}</td>
                                        <td style={{ fontSize: '0.82rem' }}>
                                            {item.sale_price
                                                ? <><span style={{ fontWeight: 700 }}>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.sale_price)}</span><br /><span style={{ textDecoration: 'line-through', color: '#aaa', fontSize: '0.75rem' }}>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.price)}</span></>
                                                : <span style={{ fontWeight: 700 }}>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.price)}</span>
                                            }
                                        </td>
                                        <td style={{ fontWeight: 800, color: st.c, fontSize: '1rem' }}>{stock}</td>
                                        <td style={{ color: '#555' }}>{item.sold_qty ?? 0}</td>
                                        <td>
                                            <span className={styles.badge} style={{ '--badge-color': st.c }}>{st.t}</span>
                                        </td>
                                        <td>
                                            <button className={styles.actionBtnSecondary} style={{ padding: '0.3rem 0.7rem', fontSize: '0.78rem' }} onClick={() => openModal(item)}>
                                                Cập nhật
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '1rem', borderTop: '1px solid #e0e0e0' }}>
                        <button className={styles.actionBtnSecondary} style={{ padding: '0.35rem 0.8rem' }} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Trước</button>
                        <span style={{ fontSize: '0.85rem', color: '#555' }}>Trang {page} / {totalPages}</span>
                        <button className={styles.actionBtnSecondary} style={{ padding: '0.35rem 0.8rem' }} disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Tiếp →</button>
                    </div>
                )}
            </div>

            {modalOpen && selectedItem && (
                <div className={styles.modalOverlay} onClick={() => setModalOpen(false)}>
                    <div className={styles.modal} style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
                        <button className={styles.modalClose} onClick={() => setModalOpen(false)}>✕</button>
                        <h2 className={styles.sectionTitle} style={{ marginBottom: '1.5rem' }}>Cập nhật Tồn kho</h2>
                        <form onSubmit={handleSave}>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Sản phẩm</label>
                                <input disabled value={selectedItem.product_name} className={styles.formInput} style={{ background: '#f5f5f3' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Màu sắc</label>
                                    <input disabled value={selectedItem.color || '—'} className={styles.formInput} style={{ background: '#f5f5f3' }} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Kích thước</label>
                                    <input disabled value={selectedItem.size || '—'} className={styles.formInput} style={{ background: '#f5f5f3' }} />
                                </div>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Số lượng tồn kho</label>
                                <input
                                    required type="number" min="0" step="1"
                                    value={newStock}
                                    onChange={e => setNewStock(Number(e.target.value))}
                                    className={styles.formInput}
                                    autoFocus
                                />
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '1rem' }}>
                                Tồn kho hiện tại: <strong>{selectedItem.stock_qty ?? 0}</strong>
                            </div>
                            <div className={styles.modalActions}>
                                <button type="button" className={styles.actionBtnSecondary} onClick={() => setModalOpen(false)}>Hủy</button>
                                <button type="submit" className={styles.actionBtn} disabled={saving}>{saving ? 'Đang lưu...' : 'Cập nhật'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

