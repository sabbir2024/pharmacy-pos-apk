export function formatDate(iso: string): string {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

export function formatDateTime(iso: string): string {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${formatDate(iso)} ${hh}:${mm}`;
}

export function formatTk(n: number): string {
    return `৳ ${Number(n || 0).toFixed(0)}`;
}

export function formatTkDecimal(n: number): string {
    return `৳ ${Number(n || 0).toFixed(2)}`;
}