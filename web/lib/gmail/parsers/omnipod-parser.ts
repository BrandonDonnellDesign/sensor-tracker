import { ParsedEmailMetadata } from '@/lib/gmail/gmail-service';
import { RegexParser, ParsedOrder } from './base-parser';

export class OmnipodParser extends RegexParser {
    name = 'Omnipod Parser';
    supplierName = 'Omnipod';

    subjectPatterns = [
        /Order Confirmation/i,
        /Your Omnipod Order/i,
        /Insulet.*Order/i,
        /Shipping Update/i,
        /Shipment Notification/i,
        /Replacement Request/i,
        /Replacement Summary/i
    ];

    fromPatterns = [
        /omnipod\.com/i,
        /insulet\.com/i,
        /myomnipod\.com/i,
        /theomnipodteam\.com/i,
        /@omnipod/i,
        /@insulet/i
    ];
    parse(email: ParsedEmailMetadata): ParsedOrder | null {
        const body = email.body;

        // Extract Order Number or Replacement ID
        // Pattern: "Order Number: 12345678" or "Order #: 12345678" or "#09000978" (replacement)
        // We use a more flexible regex to handle potential HTML spacing or newlines
        const orderNumPattern = /Order\s*(?:Number|#)\s*:\s*([A-Z0-9-]+)/i;

        // Replacement ID: Looks for # followed by 8 digits, often on its own line or in a header
        // We look for the specific format #12345678
        const replacementPattern = /#(\d{8})\b/;

        const sequencePattern = /Sequence\s*#\s*:\s*(\d+)/i;

        let orderNumber = this.extractValue(body, orderNumPattern);

        // If no standard order number, try to extract replacement ID
        if (!orderNumber) {
            const replacementId = this.extractValue(body, replacementPattern);

            // Prioritize Replacement ID as the unique order number
            if (replacementId) {
                orderNumber = replacementId;
            } else {
                // Fallback to sequence number if no replacement ID found
                const sequenceNum = this.extractValue(body, sequencePattern);
                orderNumber = sequenceNum;
            }
        }

        if (!orderNumber) return null;

        // Determine status
        let status: 'ordered' | 'shipped' | 'delivered' = 'ordered';
        if (/delivered/i.test(email.subject) || /delivered/i.test(body)) {
            status = 'delivered';
        } else if (/shipped|shipping|shipment/i.test(email.subject) || /shipped|shipping|shipment/i.test(body)) {
            status = 'shipped';
        }

        // Extract Tracking Number
        const trackingPattern = /Tracking (?:Number|#):\s?([A-Z0-9]+)/i;
        const trackingNumber = this.extractValue(body, trackingPattern);

        // Extract Quantity
        // For replacements: "Replacements: 1"
        // For orders: "Quantity: 5"
        const replacementQtyPattern = /Replacements?:\s?(\d+)/i;
        const quantityPattern = /Quantity:\s?(\d+)/i;

        const replacementQty = this.extractValue(body, replacementQtyPattern);
        const orderQty = this.extractValue(body, quantityPattern);

        const quantity = replacementQty ? parseInt(replacementQty) :
            orderQty ? parseInt(orderQty) :
                1; // Default to 5 pods

        // Determine product type
        let items = ['Omnipod DASH Pod'];
        if (/omnipod®?\s*5/i.test(body) || /omnipod5/i.test(body)) {
            items = ['Omnipod 5 Pod'];
        } else if (/dash/i.test(body)) {
            items = ['Omnipod DASH Pod'];
        }

        return {
            orderNumber,
            orderDate: email.date,
            quantity: 1,
            supplier: 'Omnipod',
            status,
            trackingNumber: trackingNumber || undefined,
            confidence: 0.9,
            items,
        };
    }
}
