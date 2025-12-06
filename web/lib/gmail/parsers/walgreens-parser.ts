import { EmailParser, ParsedOrder } from './base-parser';
import { ParsedEmailMetadata } from '@/lib/gmail/gmail-service';

/**
 * Parser for Walgreens Pharmacy order and shipping emails
 */
export class WalgreensParser implements EmailParser {
    name = 'Walgreens';

    canParse(email: ParsedEmailMetadata): boolean {
        const from = email.from.toLowerCase();
        const subject = email.subject.toLowerCase();
        const body = email.body.toLowerCase();

        return (
            (from.includes('walgreens.com') || from.includes('walgreens')) &&
            (subject.includes('order') || 
             subject.includes('shipped') || 
             subject.includes('delivery') ||
             subject.includes('prescription') ||
             body.includes('walgreens'))
        );
    }

    parse(email: ParsedEmailMetadata): ParsedOrder | null {
        try {
            const body = email.body;
            const subject = email.subject;

            // Determine order type
            const isShipped = subject.toLowerCase().includes('shipped') || 
                            subject.toLowerCase().includes('on the way') ||
                            body.toLowerCase().includes('has shipped');
            const isDelivered = subject.toLowerCase().includes('delivered') ||
                              body.toLowerCase().includes('has been delivered');
            const isConfirmation = subject.toLowerCase().includes('confirmation') ||
                                 subject.toLowerCase().includes('order placed');

            // Extract order number
            const orderNumberPatterns = [
                /order\s*#?\s*:?\s*([A-Z0-9]{8,15})/i,
                /order\s*number\s*:?\s*([A-Z0-9]{8,15})/i,
                /confirmation\s*#?\s*:?\s*([A-Z0-9]{8,15})/i,
                /rx\s*#?\s*:?\s*(\d{7,10})/i,
            ];

            let orderNumber = null;
            for (const pattern of orderNumberPatterns) {
                const match = body.match(pattern) || subject.match(pattern);
                if (match) {
                    orderNumber = match[1];
                    break;
                }
            }

            // Extract tracking number
            const trackingPatterns = [
                /tracking\s*#?\s*:?\s*([A-Z0-9]{12,30})/i,
                /tracking\s*number\s*:?\s*([A-Z0-9]{12,30})/i,
                /track\s*package\s*:?\s*([A-Z0-9]{12,30})/i,
            ];

            let trackingNumber = null;
            for (const pattern of trackingPatterns) {
                const match = body.match(pattern);
                if (match) {
                    trackingNumber = match[1];
                    break;
                }
            }

            // Extract product information
            const products = this.extractProducts(body);

            // Extract delivery date
            const deliveryDate = this.extractDeliveryDate(body);

            // Determine status
            let status: 'ordered' | 'shipped' | 'delivered' = 'ordered';
            if (isDelivered) {
                status = 'delivered';
            } else if (isShipped) {
                status = 'shipped';
            } else if (isConfirmation) {
                status = 'ordered';
            }

            // Calculate confidence
            let confidence = 0.5;
            if (orderNumber) confidence += 0.3;
            if (products.length > 0) confidence += 0.2;
            if (trackingNumber && isShipped) confidence += 0.1;

            return {
                supplier: 'Walgreens',
                orderNumber: orderNumber || `WAG-${email.date.getTime()}`,
                orderDate: email.date,
                status,
                trackingNumber,
                quantity: products.reduce((sum, p) => sum + p.quantity, 0),
                items: products.map(p => p.name),
                confidence,
            };
        } catch (error) {
            console.error('Walgreens parser error:', error);
            return null;
        }
    }

    private extractProducts(body: string): Array<{ name: string; quantity: number; type: string }> {
        const products: Array<{ name: string; quantity: number; type: string }> = [];

        // Common diabetes supply patterns
        const patterns = [
            // Dexcom sensors
            { regex: /dexcom\s+g[67]\s+sensor/i, name: 'Dexcom G6 Sensor', type: 'cgm_sensor' },
            { regex: /dexcom.*sensor/i, name: 'Dexcom Sensor', type: 'cgm_sensor' },
            
            // Test strips
            { regex: /(\d+)\s*(?:ct\.?\s+)?test\s+strips?/i, name: 'Test Strips', type: 'test_strips', quantityGroup: 1 },
            { regex: /glucose\s+test\s+strips?/i, name: 'Glucose Test Strips', type: 'test_strips' },
            { regex: /contour\s+next/i, name: 'Contour Next Test Strips', type: 'test_strips' },
            { regex: /one\s+touch/i, name: 'OneTouch Test Strips', type: 'test_strips' },
            
            // Insulin
            { regex: /(humalog|novolog|lantus|basaglar|tresiba|levemir|apidra|fiasp)/i, name: 'Insulin', type: 'insulin', nameGroup: 1 },
            
            // Lancets
            { regex: /(\d+)\s*(?:ct\.?\s+)?lancets?/i, name: 'Lancets', type: 'lancets', quantityGroup: 1 },
            
            // Pump supplies
            { regex: /infusion\s+set/i, name: 'Infusion Set', type: 'pump_supply' },
            { regex: /reservoir/i, name: 'Insulin Reservoir', type: 'pump_supply' },
            { regex: /omnipod/i, name: 'Omnipod', type: 'pump_supply' },
        ];

        for (const pattern of patterns) {
            const match = body.match(pattern.regex);
            if (match) {
                const name = pattern.nameGroup ? match[pattern.nameGroup] : pattern.name;
                const quantity = pattern.quantityGroup ? parseInt(match[pattern.quantityGroup]) : 1;
                
                products.push({
                    name,
                    quantity: isNaN(quantity) ? 1 : quantity,
                    type: pattern.type,
                });
            }
        }

        return products;
    }

    private extractDeliveryDate(body: string): Date | null {
        const patterns = [
            /delivery\s+(?:date|by)\s*:?\s*(\w+\s+\d{1,2},?\s+\d{4})/i,
            /estimated\s+delivery\s*:?\s*(\w+\s+\d{1,2},?\s+\d{4})/i,
            /arrive\s+(?:by|on)\s*:?\s*(\w+\s+\d{1,2},?\s+\d{4})/i,
            /expected\s+delivery\s*:?\s*(\w+\s+\d{1,2},?\s+\d{4})/i,
        ];

        for (const pattern of patterns) {
            const match = body.match(pattern);
            if (match) {
                try {
                    return new Date(match[1]);
                } catch {
                    continue;
                }
            }
        }

        return null;
    }
}
