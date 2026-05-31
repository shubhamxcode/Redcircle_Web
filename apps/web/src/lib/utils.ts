import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function tokenSlug(symbol?: string | null, mintAddress?: string | null): string {
	if (symbol && mintAddress) {
		return `${symbol.toLowerCase()}-${mintAddress.slice(0, 6).toLowerCase()}`;
	}
	return ""; // always fall back to UUID when either is missing
}
