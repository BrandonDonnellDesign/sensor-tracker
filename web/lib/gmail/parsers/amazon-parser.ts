import { ParsedEmailMetadata } from '@/lib/gmail/gmail-service';
import { RegexParser, ParsedOrder } from './base-parser';

export class AmazonParser extends RegexParser {
    name = 'Amazon Parser';
    supplierName = 'Amazon Pharmacy';

    subjectPatterns = [
        /Your Amazon\.com order/i,
        /Your Amazon Pharmacy order/i,
        /Order Confirmation/i,
        /Your Order/i,
        /Your Amazon Order/i,
        /You've successfully placed your order/i,
        /Your order has shipped/i
    ];

    fromPatterns = [
        /amazon\.com/i,
        /amazonpharmacy\.com/i,
        /pharmacy\.amazon\.com/i
    ];

    parse(email: ParsedEmailMetadata): ParsedOrder | null {
        const body = email.body;

        // Extract Order Number
        // Pattern: "Order # 123-4567890-1234567" or "Purchase # 106-9597854-2052221"
        const orderNumPattern = /(?:Order|Purchase)\s?[#:]?\s?(\d{3}-\d{7}-\d{7})/;
        const orderNumber = this.extractValue(body, orderNumPattern) ||
            this.extractValue(email.subject, orderNumPattern);

        // If no order number found, but it's from Amazon Pharmacy and has sensor keywords,
        // we should still return it so the matcher can try to link it by date/content.
        if (!orderNumber && this.supplierName !== 'Amazon Pharmacy') {
            return null;
        }

        // Extract Quantity
        // Dexcom G7 sensors typically come in packs of 3
        let quantity = 3; // Default to 3 (standard pack size)

        // Look for explicit quantity mentions
        if (body.match(/Qty:\s?(\d+)/i)) {
            quantity = parseInt(this.extractValue(body, /Qty:\s?(\d+)/i) || '3');
        } else if (body.match(/Quantity:\s?(\d+)/i)) {
            quantity = parseInt(this.extractValue(body, /Quantity:\s?(\d+)/i) || '3');
        } else if (body.match(/(\d+)\s+pack/i)) {
            quantity = parseInt(this.extractValue(body, /(\d+)\s+pack/i) || '3');
        }

        // Check for sensor keywords
        const isSensor = /dexcom|sensor|g6|g7|libre/i.test(body) ||
            /dexcom|sensor|g6|g7|libre/i.test(email.subject);

        if (!isSensor) return null;

        // Detect status from subject/body
        let status: 'ordered' | 'shipped' | 'delivered' = 'ordered';

        const subjectLower = email.subject.toLowerCase();
        const bodyLower = body.toLowerCase();

        if (subjectLower.includes('shipped') || bodyLower.includes('has shipped')) {
            status = 'shipped';
        } else if (subjectLower.includes('delivered') || bodyLower.includes('has been delivered')) {
            status = 'delivered';
        } else if (subjectLower.includes('placed') || subjectLower.includes('confirmation')) {
            status = 'ordered';
        }

        return {
            ...(orderNumber && { orderNumber }),
            orderDate: email.date,
            quantity,
            supplier: 'Amazon Pharmacy',
            status,
            confidence: 0.8,
            items: ['Dexcom Sensor'], // Placeholder
        };
    }
}
