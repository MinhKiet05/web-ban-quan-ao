export default function ProductGridSkeleton({ count = 8, variant = 'grid' }) {
    // variant: 'grid' cho SearchPage (3 columns), 'grid-4' cho HomePage (4 columns)
    const containerClass = variant === 'grid-4' 
        ? 'grid grid-cols-4 gap-6'
        : 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-2 md:gap-6';

    const itemClass = 'animate-pulse border rounded-xl overflow-hidden bg-white';

    return (
        <div className={containerClass}>
            {Array.from({ length: count }).map((_, index) => (
                <div key={index} className={itemClass}>
                    <div className="w-full aspect-[3/4] bg-gray-200" />
                    <div className="p-3">
                        <div className="h-3 bg-gray-200 rounded w-1/2 mb-2" />
                        <div className="h-4 bg-gray-200 rounded w-full mb-2" />
                        <div className="h-4 bg-gray-200 rounded w-2/3" />
                    </div>
                </div>
            ))}
        </div>
    );
}
