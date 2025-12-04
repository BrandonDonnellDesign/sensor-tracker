import { ParsedEmailMetadata } from '@/lib/gmail/gmail-service';
import { RegexParser, ParsedOrder } from './base-parser';

export class DexcomParser extends RegexParser {
    name = 'Dexcom Parser';
    supplierName = 'Dexcom';

    subjectPatterns = [
        /Order Confirmation/i,
        /Your Dexcom Order/i,
        /Shipping Update/i
    ];

    fromPatterns = [
        /dexcom\.com/i,
        /notification@dexcom\.com/i
    ];

    parse(email: ParsedEmailMetadata): ParsedOrder | null {
        const body = email.body;

        // Extract Order Number
        // Pattern: "Order Number: SO-1234567" or similar
        const orderNumPattern = /Order (?:Number|#):\s?([A-Z0-9-]+)/i;
        const orderNumber = this.extractValue(body, orderNumPattern);

        if (!orderNumber) return null;

        // Determine status
        let status: 'ordered' | 'shipped' = 'ordered';
        if (/shipped|shipping/i.test(email.subject) || /shipped|shipping/i.test(body)) {
            status = 'shipped';
        }

        // Extract Tracking
        const trackingPattern = /Tracking (?:Number|#):\s?([A-Z0-9]+)/i;
        const trackingNumber = this.extractValue(body, trackingPattern);

        return {
            orderNumber,
            orderDate: email.date,
            quantity: 3, // Default for Dexcom box (usually 3 sensors)
            supplier: 'Dexcom',
            status,
            trackingNumber: trackingNumber || undefined,
            confidence: 0.9,
            items: ['Dexcom G7 Sensor'],
        };
    }
}
