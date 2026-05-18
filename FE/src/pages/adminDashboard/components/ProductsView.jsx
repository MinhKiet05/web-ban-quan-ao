import { useState, useEffect, useCallback, useRef } from 'react';
import styles from '../AdminDashboard.module.css';
import { BASE_URL, fmt, Toast } from './Shared.jsx';

const STATUS_OPTIONS = [
    { value: 'active', label: 'Đang bán' },
    { value: 'draft', label: 'Nháp' },
    { value: 'archived', label: 'Lưu trữ' },
];

const STATUS_COLOR = { active: '#10b981', draft: '#f59e0b', archived: '#888' };

export default function ProductsView({ token }) {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [toast, setToast] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [editProduct, setEditProduct] = useState(null);
    const [saving, setSaving] = useState(false);
    const formRef = useRef(null);

    const fetchProducts = useCallback(() => {
        setLoading(true);
        const params = new URLSearchParams({ limit: 30, page });
        if (search) params.set('search', search);
        if (statusFilter) params.set('status', statusFilter);
        fetch(`${BASE_URL}/admin/products?${params}`, {
            headers: { Authorization: `Bearer ${token}` }
        }).then(r => r.json()).then(d => {
            if (d.data) setProducts(d.data);
            if (d.pagination) setTotalPages(d.pagination.totalPages);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [token, search, statusFilter, page]);

    useEffect(() => { fetchProducts(); }, [fetchProducts]);
    useEffect(() => { setPage(1); }, [search, statusFilter]);

    const openEdit = (p) => {
        setEditProduct(p);
        setModalOpen(true);
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Xóa sản phẩm "${name}"? Hành động này không thể hoàn tác.`)) return;
        try {
            const res = await fetch(`${BASE_URL}/products/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                setProducts(prev => prev.filter(p => p.id !== id));
                setToast({ msg: 'Đã xóa sản phẩm', type: 'success' });
            } else {
                const d = await res.json();
                setToast({ msg: d.message || 'Lỗi xóa', type: 'error' });
            }
        } catch {
            setToast({ msg: 'Lỗi kết nối', type: 'error' });
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!editProduct) return;
        setSaving(true);
        const fd = new FormData(formRef.current);
        const body = {
            name:              fd.get('name'),
            base_price:        Number(fd.get('base_price')),
            original_price:    fd.get('original_price') ? Number(fd.get('original_price')) : undefined,
            short_description: fd.get('short_description'),
            brand:             fd.get('brand'),
            status:            fd.get('status'),
            is_featured:       fd.get('is_featured') === 'on',
            is_sale:           fd.get('is_sale') === 'on',
            discount_percent:  fd.get('discount_percent') ? Number(fd.get('discount_percent')) : undefined,
        };
        // Remove undefined fields
        Object.keys(body).forEach(k => body[k] === undefined && delete body[k]);
        try {
            const res = await fetch(`${BASE_URL}/admin/products/${editProduct.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(body),
            });
            const d = await res.json();
            if (d.success) {
                setProducts(prev => prev.map(p => p.id === editProduct.id ? { ...p, ...d.data, base_price: d.data.base_price } : p));
                setToast({ msg: 'Đã lưu sản phẩm', type: 'success' });
                setModalOpen(false);
            } else {
                setToast({ msg: d.message || 'Lỗi lưu', type: 'error' });
            }
        } catch {
            setToast({ msg: 'Lỗi kết nối', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            {toast && <Toast {...toast} onDone={() => setToast(null)} />}

            {/* Filters */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem', alignItems: 'center' }}>
                <div className={styles.filterTabs} style={{ margin: 0 }}>
                    <button className={`${styles.filterTab} ${!statusFilter ? styles.filterTabActive : ''}`} onClick={() => setStatusFilter('')}>Tất cả</button>
                    {STATUS_OPTIONS.map(s => (
                        <button key={s.value} className={`${styles.filterTab} ${statusFilter === s.value ? styles.filterTabActive : ''}`} onClick={() => setStatusFilter(s.value)}>{s.label}</button>
                    ))}
                </div>
                <div className={styles.searchBox}>
                    <input
                        className={styles.searchInput}
                        placeholder="Tìm tên SP, SKU, thương hiệu..."
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') setSearch(searchInput); }}
                    />
                    <button className={styles.actionBtn} style={{ padding: '0.3rem 0.7rem', fontSize: '0.75rem' }} onClick={() => setSearch(searchInput)}>Tìm</button>
                </div>
            </div>

            <div className={styles.section}>
                <div className={styles.sectionHeader}>
                    <div className={styles.sectionTitle}>Danh sách sản phẩm</div>
                </div>
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Sản phẩm</th>
                                <th>SKU</th>
                                <th>Thương hiệu</th>
                                <th>Danh mục</th>
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
                            ) : products.length === 0 ? (
                                <tr><td colSpan="9" style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>Không tìm thấy sản phẩm</td></tr>
                            ) : products.map(p => (
                                <tr key={p.id}>
                                    <td style={{ fontWeight: 600, maxWidth: 200 }}>
                                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                                        {p.is_featured && <span style={{ fontSize: '0.68rem', color: '#f59e0b', fontWeight: 700 }}>★ Nổi bật</span>}
                                    </td>
                                    <td style={{ fontFamily: 'monospace', color: '#555', fontSize: '0.78rem' }}>{p.sku || '—'}</td>
                                    <td style={{ color: '#555' }}>{p.brand || '—'}</td>
                                    <td style={{ fontSize: '0.8rem', color: '#555' }}>{p.category_name || '—'}</td>
                                    <td className={styles.amount} style={{ fontSize: '0.85rem' }}>{fmt(p.base_price)}</td>
                                    <td style={{ fontWeight: 700, color: (p.total_stock ?? 0) > 10 ? '#10b981' : (p.total_stock ?? 0) > 0 ? '#f59e0b' : '#ef4444' }}>
                                        {p.total_stock ?? 0}
                                    </td>
                                    <td style={{ color: '#555' }}>{p.sold_count ?? 0}</td>
                                    <td>
                                        <span className={styles.badge} style={{ '--badge-color': STATUS_COLOR[p.status] || '#888' }}>
                                            {STATUS_OPTIONS.find(s => s.value === p.status)?.label || p.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button className={styles.actionBtnSecondary} style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={() => openEdit(p)}>Sửa</button>
                                            <button className={styles.actionBtnDanger} style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={() => handleDelete(p.id, p.name)}>Xóa</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
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

            {/* Edit Modal */}
            {modalOpen && editProduct && (
                <div className={styles.modalOverlay} onClick={() => setModalOpen(false)}>
                    <div className={styles.modal} style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
                        <button className={styles.modalClose} onClick={() => setModalOpen(false)}>✕</button>
                        <h2 className={styles.sectionTitle} style={{ marginBottom: '1.5rem' }}>Chỉnh sửa sản phẩm</h2>
                        <form ref={formRef} onSubmit={handleSave}>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Tên sản phẩm *</label>
                                <input required name="name" defaultValue={editProduct.name} className={styles.formInput} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Giá bán (VND) *</label>
                                    <input required name="base_price" type="number" min="0" step="1000" defaultValue={editProduct.base_price} className={styles.formInput} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Giá gốc (VND)</label>
                                    <input name="original_price" type="number" min="0" step="1000" defaultValue={editProduct.original_price || ''} className={styles.formInput} />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Thương hiệu</label>
                                    <input name="brand" defaultValue={editProduct.brand || ''} className={styles.formInput} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Trạng thái</label>
                                    <select name="status" defaultValue={editProduct.status} className={styles.formInput}>
                                        {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Mô tả ngắn</label>
                                <textarea name="short_description" rows="3" defaultValue={editProduct.short_description || ''} className={styles.formInput} style={{ resize: 'vertical' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                                <div className={styles.formGroup} style={{ margin: 0 }}>
                                    <label className={styles.formLabel}>% giảm giá</label>
                                    <input name="discount_percent" type="number" min="0" max="100" defaultValue={editProduct.discount_percent || ''} className={styles.formInput} />
                                </div>
                                <div className={styles.formGroup} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, paddingTop: 22 }}>
                                    <input type="checkbox" name="is_featured" id="is_featured" defaultChecked={editProduct.is_featured} style={{ width: 16, height: 16 }} />
                                    <label htmlFor="is_featured" className={styles.formLabel} style={{ margin: 0 }}>Nổi bật</label>
                                </div>
                                <div className={styles.formGroup} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, paddingTop: 22 }}>
                                    <input type="checkbox" name="is_sale" id="is_sale" defaultChecked={editProduct.is_sale} style={{ width: 16, height: 16 }} />
                                    <label htmlFor="is_sale" className={styles.formLabel} style={{ margin: 0 }}>Đang sale</label>
                                </div>
                            </div>
                            <div className={styles.modalActions}>
                                <button type="button" className={styles.actionBtnSecondary} onClick={() => setModalOpen(false)}>Hủy</button>
                                <button type="submit" className={styles.actionBtn} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

