import { ParsedEmailMetadata } from '@/lib/gmail/gmail-service';
import { ParsedOrder, EmailParser } from './base-parser';
import { AmazonParser } from './amazon-parser';
import { DexcomParser } from './dexcom-parser';
import { OmnipodParser } from './omnipod-parser';

export class ParserRegistry {
    private parsers: EmailParser[] = [];

    constructor() {
        this.register(new AmazonParser());
        this.register(new DexcomParser());
        this.register(new OmnipodParser());
    }

    register(parser: EmailParser) {
        this.parsers.push(parser);
    }

    /**
     * Try to parse an email with all registered parsers
     */
    parse(email: ParsedEmailMetadata): ParsedOrder | null {
        for (const parser of this.parsers) {
            if (parser.canParse(email)) {
                const result = parser.parse(email);
                if (result) {
                    console.log(`Parsed email with ${parser.name}:`, result);
                    return result;
                }
            }
        }
        return null;
    }
}

// Singleton instance
export const parserRegistry = new ParserRegistry();
