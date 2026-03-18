import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function formatDate(dateString: string | null | undefined): string {
    if (!dateString) return '-';

    // Parse date - handles both ISO strings and YYYY-MM-DD
    const date = new Date(dateString);

    // Validate date
    if (isNaN(date.getTime())) return '-';

    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

export function getInitials(name: string | null | undefined): string {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function parseTimeToHours(timeStr: string | undefined): number {
    if (!timeStr) return 0;
    let hours = 0;
    const matches = timeStr.match(/(\d*\.?\d+)\s*(w|d|h|m)/g);
    if (matches) {
        matches.forEach(match => {
            const val = parseFloat(match);
            if (match.includes('w')) hours += val * 40; // 1 week = 40 hours
            if (match.includes('d')) hours += val * 8;  // 1 day = 8 hours
            if (match.includes('h')) hours += val;
            if (match.includes('m')) hours += val / 60;
        });
    } else if (!isNaN(Number(timeStr))) {
        hours = Number(timeStr);
    }
    return hours;
}

export function formatHoursToTime(totalHours: number | undefined): string {
    if (totalHours === undefined || totalHours <= 0) return '';
    const d = Math.floor(totalHours / 8);
    const h = Math.floor(totalHours % 8);
    const m = Math.round((totalHours % 1) * 60);

    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);

    return parts.join(' ');
}
