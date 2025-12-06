import { WalgreensParser } from '../walgreens-parser';
import { ParsedEmailMetadata } from '@/lib/gmail/gmail-service';

describe('WalgreensParser', () => {
  const parser = new WalgreensParser();

  it('should identify Walgreens emails', () => {
    const email: ParsedEmailMetadata = {
      from: 'orders@walgreens.com',
      subject: 'Your Walgreens order is on the way',
      body: 'Your order has shipped',
      date: new Date(),
      snippet: 'Your order is on the way',
    };

    expect(parser.canParse(email)).toBe(true);
  });

  it('should parse Walgreens shipping email', () => {
    const email: ParsedEmailMetadata = {
      from: 'orders@walgreens.com',
      subject: 'Your Walgreens order is on the way',
      body: `
        Your order WAG123456789 is on the way!
        
        Tracking Number: 9400111899562537840123
        
        Items:
        - Contour Next Test Strips 100 ct.
        - Lancets 200 ct.
        
        Expected Delivery: December 12, 2025
      `,
      date: new Date('2025-12-05'),
      snippet: 'Your order is on the way',
    };

    const result = parser.parse(email);

    expect(result).not.toBeNull();
    expect(result?.supplier).toBe('Walgreens');
    expect(result?.orderNumber).toBe('WAG123456789');
    expect(result?.status).toBe('shipped');
    expect(result?.trackingNumber).toBe('9400111899562537840123');
    expect(result?.items.length).toBeGreaterThan(0);
  });

  it('should parse Walgreens order confirmation', () => {
    const email: ParsedEmailMetadata = {
      from: 'orders@walgreens.com',
      subject: 'Order Confirmation - Walgreens',
      body: `
        Thank you for your order!
        
        Order Number: WAG987654321
        Order Date: December 5, 2025
        
        Items:
        - Insulin Humalog
        - Infusion Set
      `,
      date: new Date('2025-12-05'),
      snippet: 'Thank you for your order',
    };

    const result = parser.parse(email);

    expect(result).not.toBeNull();
    expect(result?.status).toBe('ordered');
    expect(result?.orderNumber).toBe('WAG987654321');
  });

  it('should not parse non-Walgreens emails', () => {
    const email: ParsedEmailMetadata = {
      from: 'orders@cvs.com',
      subject: 'Your CVS order',
      body: 'Your CVS order has shipped',
      date: new Date(),
      snippet: 'Your order has shipped',
    };

    expect(parser.canParse(email)).toBe(false);
  });
});
