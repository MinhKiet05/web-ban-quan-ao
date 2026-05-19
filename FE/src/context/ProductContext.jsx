import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
    DEFAULT_COLORS,
    DEFAULT_SIZES,
    buildQuery,
    getColorKeysFromVariantColor,
    normalizeText,
} from '../utils/searchFilters.utils';

/**
 * ProductContext - Quản lý state products toàn ứng dụng
 * Centralized data management cho products, filters metadata, và product details
 */
const ProductContext = createContext();

const API_BASE_URL = 'https://web-ban-quan-ao-9s0d.onrender.com/api/products';

export function ProductProvider({ children }) {
    const [products, setProducts] = useState([]);
    const [filtersMeta, setFiltersMeta] = useState({
        categories: [],
        colors: [],
        sizes: [],
        min_price: 0,
        max_price: 0,
    });
    const [productDetailsMap, setProductDetailsMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [error, setError] = useState(null);

    // Fetch filter metadata
    const fetchFilterMeta = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/filters`);
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error('Không tải được metadata filter');
            
            setFiltersMeta({
                categories: json.data?.categories || [],
                colors: (json.data?.colors || []).length ? json.data.colors : DEFAULT_COLORS,
                sizes: (json.data?.sizes || []).length ? json.data.sizes : DEFAULT_SIZES,
                min_price: json.data?.min_price || 0,
                max_price: json.data?.max_price || 0,
            });
        } catch {
            // Fallback: fetch từ product list để extract metadata
            try {
                const fallbackRes = await fetch(`${API_BASE_URL}/list?limit=100&sort=newest`);
                const fallbackJson = await fallbackRes.json();
                const fallbackProducts = fallbackJson?.data?.products || [];

                const categoryMap = new Map();
                let minPrice = Number.POSITIVE_INFINITY;
                let maxPrice = 0;
                const sizeSet = new Set();
                const colorSet = new Set();

                fallbackProducts.forEach((product) => {
                    if (product.category_id && product.category_name) {
                        categoryMap.set(product.category_id, {
                            id: product.category_id,
                            name: product.category_name,
                            slug: product.category_slug || '',
                        });
                    }
                    const price = Number(product.display_price || 0);
                    if (!Number.isNaN(price) && price > 0) {
                        minPrice = Math.min(minPrice, price);
                        maxPrice = Math.max(maxPrice, price);
                    }
                });

                // Fetch chi tiết để extract variant values
                const detailSamples = fallbackProducts.slice(0, 24);
                const detailResponses = await Promise.all(
                    detailSamples.map(async (product) => {
                        try {
                            const res = await fetch(`${API_BASE_URL}/${product.slug}`);
                            const json = await res.json();
                            if (res.ok && json.success && json.data?.product) return json.data.product;
                        } catch {
                            return null;
                        }
                        return null;
                    }),
                );

                detailResponses.forEach((detail) => {
                    if (!detail?.variants) return;
                    detail.variants.forEach((variant) => {
                        const size = normalizeText(variant.size);
                        const colorKeys = getColorKeysFromVariantColor(variant.color);
                        if (size) sizeSet.add(size);
                        colorKeys.forEach((key) => colorSet.add(key));
                    });
                });

                setFiltersMeta({
                    categories: Array.from(categoryMap.values()),
                    colors: colorSet.size > 0 ? Array.from(colorSet).sort() : DEFAULT_COLORS,
                    sizes: sizeSet.size > 0 ? Array.from(sizeSet).sort() : DEFAULT_SIZES,
                    min_price: Number.isFinite(minPrice) ? minPrice : 0,
                    max_price: maxPrice || 0,
                });
            } catch {
                setFiltersMeta({
                    categories: [],
                    colors: DEFAULT_COLORS,
                    sizes: DEFAULT_SIZES,
                    min_price: 0,
                    max_price: 0,
                });
            }
        }
    }, []);

    // Fetch products list với filters
    const fetchProductsList = useCallback(async (filterParams) => {
        setLoading(true);
        setError(null);
        try {
            const query = buildQuery(filterParams);
            const res = await fetch(`${API_BASE_URL}/list?${query}`);
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error('Không tải được danh sách sản phẩm');
            
            setProducts(json.data?.products || []);
            setError(null);
        } catch (err) {
            setProducts([]);
            setError(err.message || 'Đã có lỗi xảy ra');
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch chi tiết variants cho products cần lọc
    const fetchDetailsForFiltering = useCallback(async (productsToFetch) => {
        const missing = productsToFetch.filter((product) => !productDetailsMap[product.slug]);
        if (missing.length === 0) return;

        setLoadingDetails(true);
        try {
            const responses = await Promise.all(
                missing.map(async (product) => {
                    try {
                        const res = await fetch(`${API_BASE_URL}/${product.slug}`);
                        const json = await res.json();
                        if (res.ok && json.success && json.data?.product) {
                            return [product.slug, json.data.product];
                        }
                    } catch {
                        return null;
                    }
                    return null;
                }),
            );

            setProductDetailsMap((prev) => {
                const next = { ...prev };
                responses.forEach((entry) => {
                    if (entry) next[entry[0]] = entry[1];
                });
                return next;
            });
        } catch (err) {
            setError(err.message || 'Lỗi khi fetch chi tiết sản phẩm');
        } finally {
            setLoadingDetails(false);
        }
    }, [productDetailsMap]);

    // Fetch metadata khi component mount
    useEffect(() => {
        fetchFilterMeta();
    }, [fetchFilterMeta]);

    // Fetch initial products list khi component mount
    useEffect(() => {
        fetchProductsList({
            searchQuery: '',
            selectedCategories: [],
            selectedColors: [],
            selectedShapes: [],
            minPrice: '',
            maxPrice: '',
            minRating: 0,
            isSaleOnly: false,
            sort: 'newest',
            limit: 50,
        });
    }, [fetchProductsList]);

    const value = {
        products,
        filtersMeta,
        productDetailsMap,
        loading,
        loadingDetails,
        error,
        fetchProductsList,
        fetchDetailsForFiltering,
        refetch: fetchFilterMeta,
    };

    return (
        <ProductContext.Provider value={value}>
            {children}
        </ProductContext.Provider>
    );
}

/**
 * Custom Hook: useProducts
 * Sử dụng để lấy dữ liệu products và các hàm fetch từ Context
 * @returns {Object} { products, filtersMeta, productDetailsMap, loading, loadingDetails, error, fetchProductsList, fetchDetailsForFiltering, refetch }
 */
export function useProducts() {
    const context = useContext(ProductContext);
    
    if (!context) {
        throw new Error('useProducts must be used within ProductProvider');
    }
    
    return context;
}
