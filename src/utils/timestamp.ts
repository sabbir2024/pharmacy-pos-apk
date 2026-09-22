export function nowISO(): string {
    return new Date().toISOString();
}

export function parseISO(iso: string): Date {
    return new Date(iso);
}

export function isNewer(a: string | null, b: string | null): boolean {
    if (!a) return false;
    if (!b) return true;
    return new Date(a).getTime() > new Date(b).getTime();
}

export function formatRelative(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const sec = Math.floor(diff / 1000);
    const min = Math.floor(sec / 60);
    const hr = Math.floor(min / 60);
    const day = Math.floor(hr / 24);

    if (sec < 60) return `${sec} সেকেন্ড আগে`;
    if (min < 60) return `${min} মিনিট আগে`;
    if (hr < 24) return `${hr} ঘন্টা আগে`;
    return `${day} দিন আগে`;
}