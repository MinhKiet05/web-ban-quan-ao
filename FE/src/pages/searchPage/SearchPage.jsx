import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductCard from '../../components/productCard/ProductCard';
import SearchFiltersPanel from '../../components/filter/SearchFiltersPanel';
import ProductGridSkeleton from '../../components/skeleton/ProductGridSkeleton';
import styles from './SearchPage.module.css';
import { useProducts } from '../../context/ProductContext';
import {
    DEFAULT_COLORS,
    DEFAULT_SIZES,
    SORT_OPTIONS,
    formatLabel,
    getColorKeysFromVariantColor,
    normalizeText,
} from '../../utils/searchFilters.utils';

export default function SearchPage() {
    const [searchParams] = useSearchParams();
    const { products, filtersMeta, productDetailsMap, loading, loadingDetails, fetchProductsList, fetchDetailsForFiltering } = useProducts();
    const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

    const [searchInput, setSearchInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [priceRange, setPriceRange] = useState({ min: '', max: '' });
    const [selectedColors, setSelectedColors] = useState([]);
    const [selectedShapes, setSelectedShapes] = useState([]);
    const [minRating, setMinRating] = useState(0);
    const [isSaleOnly, setIsSaleOnly] = useState(false);
    const [sort, setSort] = useState('newest');
    const [displayCount, setDisplayCount] = useState(12);

    // Lấy search query từ URL parameters
    useEffect(() => {
        const searchFromUrl = searchParams.get('search') || '';
        if (searchFromUrl) {
            setSearchInput(searchFromUrl);
        }
    }, [searchParams]);

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearchQuery(searchInput.trim());
        }, 300);
        return () => clearTimeout(timer);
    }, [searchInput]);

    // Fetch products khi filters thay đổi
    useEffect(() => {
        setDisplayCount(12);
        fetchProductsList({
            searchQuery,
            selectedCategories,
            selectedColors,
            selectedShapes,
            minPrice: priceRange.min,
            maxPrice: priceRange.max,
            minRating,
            isSaleOnly,
            sort,
            limit: 50,
        });
    }, [searchQuery, selectedCategories, selectedColors, selectedShapes, priceRange.min, priceRange.max, minRating, isSaleOnly, sort, fetchProductsList]);

    // Fetch details ngay khi filter color/size thay đổi (trước khi component render)
    useEffect(() => {
        const needVariantFilters = selectedColors.length > 0 || selectedShapes.length > 0;
        if (!needVariantFilters || products.length === 0) return;

        // Trigger fetch details immediately khi filter thay đổi
        fetchDetailsForFiltering(products);
    }, [selectedColors, selectedShapes, products, fetchDetailsForFiltering]);

    const clearAll = useCallback(() => {
        setSearchInput('');
        setSearchQuery('');
        setSelectedCategories([]);
        setPriceRange({ min: '', max: '' });
        setSelectedColors([]);
        setSelectedShapes([]);
        setMinRating(0);
        setIsSaleOnly(false);
        setSort('newest');
        setDisplayCount(12);
    }, []);

    const handleLoadMore = useCallback(() => {
        setDisplayCount((prev) => prev + 12);
    }, []);

    const activeChips = useMemo(() => {
        const chips = [];
        if (searchQuery.trim()) chips.push({ type: 'search', key: 'search', label: `Từ khóa: ${searchQuery}` });
        selectedCategories.forEach((id) => {
            const category = filtersMeta.categories.find((item) => item.id === id);
            chips.push({ type: 'category', key: `cat-${id}`, value: id, label: category?.name || id });
        });
        selectedColors.forEach((color) => chips.push({ type: 'color', key: `color-${color}`, value: color, label: `Màu: ${formatLabel(color)}` }));
        selectedShapes.forEach((size) => chips.push({ type: 'shape', key: `shape-${size}`, value: size, label: `Fit: ${size.toUpperCase()}` }));
        if (priceRange.min !== '' || priceRange.max !== '') {
            chips.push({
                type: 'price',
                key: 'price',
                label: `Giá: ${priceRange.min || 0} - ${priceRange.max || '∞'}`,
            });
        }
        if (minRating > 0) chips.push({ type: 'rating', key: 'rating', label: `Từ ${minRating}★` });
        if (isSaleOnly) chips.push({ type: 'sale', key: 'sale', label: 'Đang giảm giá' });
        return chips;
    }, [searchQuery, selectedCategories, selectedColors, selectedShapes, priceRange.min, priceRange.max, minRating, isSaleOnly, filtersMeta.categories]);

    const activeFilterCount = activeChips.length;

    const removeChip = useCallback((chip) => {
        if (chip.type === 'search') setSearchQuery('');
        if (chip.type === 'category') setSelectedCategories((prev) => prev.filter((item) => item !== chip.value));
        if (chip.type === 'color') setSelectedColors((prev) => prev.filter((item) => item !== chip.value));
        if (chip.type === 'shape') setSelectedShapes((prev) => prev.filter((item) => item !== chip.value));
        if (chip.type === 'price') setPriceRange({ min: '', max: '' });
        if (chip.type === 'rating') setMinRating(0);
        if (chip.type === 'sale') setIsSaleOnly(false);
    }, []);

    // Client-side filtering
    const filteredProducts = useMemo(() => {
        return products.filter((product) => {
            // Kiểm tra search query (không phân biệt hoa thường)
            if (searchQuery.trim()) {
                const productName = normalizeText(product.name || '');
                const productDesc = normalizeText(product.description || '');
                const searchTerm = normalizeText(searchQuery);
                if (!productName.includes(searchTerm) && !productDesc.includes(searchTerm)) {
                    return false;
                }
            }

            if (selectedCategories.length > 0 && !selectedCategories.includes(product.category_id)) {
                return false;
            }

            if (selectedColors.length === 0 && selectedShapes.length === 0) return true;

            const detail = productDetailsMap[product.slug];
            if (!detail || !Array.isArray(detail.variants)) return false;

            const variants = detail.variants || [];

            if (selectedShapes.length > 0) {
                const hasSize = variants.some((variant) =>
                    selectedShapes.includes(normalizeText(variant.size)),
                );
                if (!hasSize) return false;
            }

            if (selectedColors.length > 0) {
                const hasColor = variants.some((variant) =>
                    getColorKeysFromVariantColor(variant.color).some((colorKey) =>
                        selectedColors.includes(colorKey),
                    ),
                );
                if (!hasColor) return false;
            }

            return true;
        });
    }, [products, searchQuery, selectedCategories, selectedColors, selectedShapes, productDetailsMap]);

    return (
        <div className="bg-[linear-gradient(rgba(255,255,255,0.95),rgba(255,255,255,0.95)),url('/noise-bg.webp')] bg-cover bg-center min-h-screen">
            <div className="bg-[#ffffff] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-8">
                <div className="hidden lg:block lg:w-72 lg:flex-shrink-0">
                    <SearchFiltersPanel
                        filtersMeta={filtersMeta}
                        selectedShapes={selectedShapes}
                        selectedCategories={selectedCategories}
                        selectedColors={selectedColors}
                        priceRange={priceRange}
                        isSaleOnly={isSaleOnly}
                        minRating={minRating}
                        clearAll={clearAll}
                        setSelectedShapes={setSelectedShapes}
                        setSelectedCategories={setSelectedCategories}
                        setSelectedColors={setSelectedColors}
                        setPriceRange={setPriceRange}
                        setIsSaleOnly={setIsSaleOnly}
                        setMinRating={setMinRating}
                    />
                </div>
                <section className="flex-1">
                    <div className="sticky top-2 z-20 flex flex-wrap items-center gap-2 mb-4 bg-white/90 backdrop-blur border border-gray-100 rounded-xl px-3 py-2 shadow-sm">
                        <span className="text-sm text-gray-600 mr-1">Kết quả: <strong className="text-gray-900">{filteredProducts.length}</strong> sản phẩm</span>
                        {activeChips.length > 0 && <span className="text-xs text-gray-400">|</span>}
                        {activeChips.map((chip) => (
                            <button key={chip.key} type="button" className="inline-flex items-center gap-1 text-xs text-gray-700 border border-gray-300 rounded-full px-3 py-1.5 bg-white hover:bg-gray-100 transition-colors" onClick={() => removeChip(chip)}>
                                {chip.label} <span>×</span>
                            </button>
                        ))}
                        {activeChips.length > 0 && (
                            <button type="button" onClick={clearAll} className="text-sm font-semibold text-red-500 hover:text-red-600">Clear All</button>
                        )}
                    </div>

                    {/* Đồng bộ loading state: hiển thị Skeleton khi cả loading và loadingDetails đều false */}
                    {(loading || loadingDetails) && (
                        <ProductGridSkeleton />
                    )}

                    {/* Chỉ hiển thị kết quả khi xong cả 2 quá trình load */}
                    {!loading && !loadingDetails && (
                        <>
                            {filteredProducts.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center shadow-sm">
                                    <h3 className="text-lg font-semibold text-gray-900">Không tìm thấy sản phẩm phù hợp</h3>
                                    <p className="mt-2 text-sm text-gray-500">Thử thay đổi bộ lọc hoặc xóa tất cả để xem nhiều sản phẩm hơn.</p>
                                    <button type="button" onClick={clearAll} className="mt-4 inline-flex rounded-lg bg-gray-900 text-white px-4 py-2 text-sm font-medium">Clear All Filters</button>
                                </div>
                            ) : (
                                <div className="flex-1">
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-2 md:gap-6">
                                        {filteredProducts.slice(0, displayCount).map((product) => (
                                            <ProductCard key={product.id} product={product} />
                                        ))}
                                    </div>
                                    {displayCount < filteredProducts.length && (
                                        <div className="flex justify-center mt-8">
                                            <button
                                                type="button"
                                                onClick={handleLoadMore}
                                                className={styles.loadMoreButton}
                                            >
                                                Xem thêm
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </section>
            </div>

            {isMobileFilterOpen && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-end lg:hidden" onClick={() => setIsMobileFilterOpen(false)}>
                    <div className="bg-white w-full rounded-t-2xl max-h-[85vh] overflow-y-auto p-4" onClick={(event) => event.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-base font-semibold">Bộ lọc</h3>
                            <button type="button" className="text-sm text-gray-600" onClick={() => setIsMobileFilterOpen(false)}>Close</button>
                        </div>
                        <SearchFiltersPanel
                            isMobile
                            filtersMeta={filtersMeta}
                            selectedShapes={selectedShapes}
                            selectedCategories={selectedCategories}
                            selectedColors={selectedColors}
                            priceRange={priceRange}
                            isSaleOnly={isSaleOnly}
                            minRating={minRating}
                            clearAll={clearAll}
                            setSelectedShapes={setSelectedShapes}
                            setSelectedCategories={setSelectedCategories}
                            setSelectedColors={setSelectedColors}
                            setPriceRange={setPriceRange}
                            setIsSaleOnly={setIsSaleOnly}
                            setMinRating={setMinRating}
                        />
                        <button type="button" className="mt-4 w-full rounded-lg bg-gray-900 text-white py-2.5 text-sm font-medium" onClick={() => setIsMobileFilterOpen(false)}>
                            Apply
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
