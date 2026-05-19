export default function FilterSection({ title, children }) {
    return (
        <div className="flex flex-col border-b pb-4 last:border-0">
            <h4 className="font-semibold text-gray-900 mb-3">{title}</h4>
            {children}
        </div>
    );
}
