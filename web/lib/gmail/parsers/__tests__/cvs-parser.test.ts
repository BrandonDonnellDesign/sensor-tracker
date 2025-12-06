import { CVSParser } from '../cvs-parser';
import { ParsedEmailMetadata } from '@/lib/gmail/gmail-service';

describe('CVSParser', () => {
  const parser = new CVSParser();

  it('should identify CVS emails', () => {
    const email: ParsedEmailMetadata = {
      from: 'orders@cvs.com',
      subject: 'Your CVS order has shipped',
      body: 'Your order #12345678 has been shipped',
      date: new Date(),
      snippet: 'Your order has shipped',
    };

    expect(parser.canParse(email)).toBe(true);
  });

  it('should parse CVS shipping email', () => {
    const email: ParsedEmailMetadata = {
      from: 'orders@cvs.com',
      subject: 'Your CVS order has shipped',
      body: `
        Your order #12345678 has been shipped!
        
        Tracking Number: 1Z999AA10123456784
        
        Items:
        - Dexcom G6 Sensor (3-pack)
        - Test Strips 100 count
        
        Estimated Delivery: December 10, 2025
      `,
      date: new Date('2025-12-05'),
      snippet: 'Your order has shipped',
    };

    const result = parser.parse(email);

    expect(result).not.toBeNull();
    expect(result?.supplier).toBe('CVS');
    expect(result?.orderNumber).toBe('12345678');
    expect(result?.status).toBe('shipped');
    expect(result?.trackingNumber).toBe('1Z999AA10123456784');
    expect(result?.items.length).toBeGreaterThan(0);
  });

  it('should parse CVS delivery confirmation', () => {
    const email: ParsedEmailMetadata = {
      from: 'orders@cvs.com',
      subject: 'Your CVS order has been delivered',
      body: `
        Your order #87654321 has been delivered!
        
        Order Number: 87654321
        Delivered on: December 5, 2025
      `,
      date: new Date('2025-12-05'),
      snippet: 'Your order has been delivered',
    };

    const result = parser.parse(email);

    expect(result).not.toBeNull();
    expect(result?.status).toBe('delivered');
    expect(result?.orderNumber).toBe('87654321');
  });

  it('should not parse non-CVS emails', () => {
    const email: ParsedEmailMetadata = {
      from: 'orders@amazon.com',
      subject: 'Your Amazon order',
      body: 'Your Amazon order has shipped',
      date: new Date(),
      snippet: 'Your order has shipped',
    };

    expect(parser.canParse(email)).toBe(false);
  });
});
