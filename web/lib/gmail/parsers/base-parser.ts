import { ParsedEmailMetadata } from '@/lib/gmail/gmail-service';

export interface ParsedOrder {
    orderNumber?: string | undefined;
    orderDate?: Date | undefined;
    quantity?: number | undefined;
    supplier: string;
    totalCost?: number | undefined;
    trackingNumber?: string | undefined;
    status: 'ordered' | 'shipped' | 'delivered';
    confidence: number; // 0-1 score
    items: string[];
}

export interface EmailParser {
    name: string;
    canParse(email: ParsedEmailMetadata): boolean;
    parse(email: ParsedEmailMetadata): ParsedOrder | null;
}

/**
 * Base class for regex-based parsers
 */
export abstract class RegexParser implements EmailParser {
    abstract name: string;
    abstract supplierName: string;

    abstract subjectPatterns: RegExp[];
    abstract fromPatterns: RegExp[];

    canParse(email: ParsedEmailMetadata): boolean {
        const subjectMatch = this.subjectPatterns.some(p => p.test(email.subject));
        const fromMatch = this.fromPatterns.some(p => p.test(email.from));
        return subjectMatch || fromMatch;
    }

    abstract parse(email: ParsedEmailMetadata): ParsedOrder | null;

    protected extractValue(text: string, pattern: RegExp): string | null {
        const match = text.match(pattern);
        return match ? match[1] : null;
    }
}
