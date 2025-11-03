/**
 * AI Content Moderation System
 * Analyzes community content for spam, inappropriate content, and quality
 */

export interface ContentAnalysis {
  isSpam: boolean;
  isInappropriate: boolean;
  isOffTopic: boolean;
  isMedicalMisinformation: boolean;
  qualityScore: number; // 0-100
  confidenceScore: number; // 0-100
  flags: string[];
  recommendation: 'approve' | 'review' | 'reject';
  reasoning: string;
}

export interface ContentToAnalyze {
  title?: string;
  content: string;
  category?: string;
  author?: string;
  type: 'tip' | 'comment';
}

class ContentModerator {
  private spamKeywords = [
    'buy now', 'click here', 'free money', 'guaranteed', 'limited time',
    'make money fast', 'no risk', 'urgent', 'act now', 'special offer',
    'miracle cure', 'amazing results', 'doctors hate', 'secret method',
    'lose weight fast', 'get rich', 'work from home', 'earn money',
    'discount', 'sale', 'promo', 'deal', 'offer expires', 'hurry',
    'call now', 'order today', 'free trial', 'no obligation'
  ];

  private inappropriateKeywords = [
    'hate', 'stupid', 'idiot', 'moron', 'dumb', 'retard',
    // Add more as needed, but keep medical terms allowed
  ];

  private medicalKeywords = [
    'cure', 'miracle', 'guaranteed fix', 'doctor says', 'medical advice',
    'diagnose', 'treatment', 'prescription', 'medication dosage'
  ];

  private cgmRelatedKeywords = [
    'sensor', 'glucose', 'blood sugar', 'cgm', 'dexcom', 'freestyle',
    'adhesive', 'insertion', 'calibration', 'accuracy', 'diabetes',
    'insulin', 'bg', 'readings', 'compression', 'skin prep'
  ];

  /**
   * Analyze content for moderation
   */
  async analyzeContent(content: ContentToAnalyze): Promise<ContentAnalysis> {
    const text = `${content.title || ''} ${content.content}`.toLowerCase();
    
    // Initialize analysis
    const analysis: ContentAnalysis = {
      isSpam: false,
      isInappropriate: false,
      isOffTopic: false,
      isMedicalMisinformation: false,
      qualityScore: 50,
      confidenceScore: 0,
      flags: [],
      recommendation: 'approve',
      reasoning: ''
    };

    // Spam detection
    const spamScore = this.detectSpam(text);
    if (spamScore > 0.5) { // Lowered from 0.7 to be more aggressive
      analysis.isSpam = true;
      analysis.flags.push('Potential spam detected');
    }

    // Inappropriate content detection
    const inappropriateScore = this.detectInappropriate(text);
    if (inappropriateScore > 0.6) {
      analysis.isInappropriate = true;
      analysis.flags.push('Inappropriate language detected');
    }

    // Off-topic detection
    const topicScore = this.detectOffTopic(text, content.category);
    if (topicScore < 0.3) {
      analysis.isOffTopic = true;
      analysis.flags.push('Content may be off-topic');
    }

    // Medical misinformation detection
    const medicalScore = this.detectMedicalMisinformation(text);
    if (medicalScore > 0.8) {
      analysis.isMedicalMisinformation = true;
      analysis.flags.push('Potential medical misinformation');
    }

    // Quality assessment
    analysis.qualityScore = this.assessQuality(content);

    // Overall confidence
    analysis.confidenceScore = Math.min(
      (spamScore + inappropriateScore + topicScore + medicalScore) / 4 * 100,
      95
    );

    // Generate recommendation
    analysis.recommendation = this.generateRecommendation(analysis);
    analysis.reasoning = this.generateReasoning(analysis);

    return analysis;
  }

  private detectSpam(text: string): number {
    let spamScore = 0;
    let matches = 0;

    // Check for spam keywords
    this.spamKeywords.forEach(keyword => {
      if (text.includes(keyword)) {
        matches++;
        spamScore += 0.2;
      }
    });

    // Check for excessive capitalization
    const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
    if (capsRatio > 0.3) {
      spamScore += 0.3;
    }

    // Check for excessive punctuation
    const punctRatio = (text.match(/[!?]{2,}/g) || []).length;
    if (punctRatio > 2) {
      spamScore += 0.2;
    }

    // Check for URLs (suspicious in tips/comments)
    const urlCount = (text.match(/https?:\/\/[^\s]+/g) || []).length;
    if (urlCount > 1) {
      spamScore += 0.4;
    }

    return Math.min(spamScore, 1);
  }

  private detectInappropriate(text: string): number {
    let inappropriateScore = 0;

    this.inappropriateKeywords.forEach(keyword => {
      if (text.includes(keyword)) {
        inappropriateScore += 0.3;
      }
    });

    // Check for aggressive language patterns
    if (text.includes('you are') && (text.includes('stupid') || text.includes('wrong'))) {
      inappropriateScore += 0.4;
    }

    return Math.min(inappropriateScore, 1);
  }

  private detectOffTopic(text: string, category?: string): number {
    let topicScore = 0;

    // Check for CGM-related keywords
    this.cgmRelatedKeywords.forEach(keyword => {
      if (text.includes(keyword)) {
        topicScore += 0.1;
      }
    });

    // Category-specific checks
    if (category) {
      const categoryKeywords = this.getCategoryKeywords(category);
      categoryKeywords.forEach(keyword => {
        if (text.includes(keyword)) {
          topicScore += 0.15;
        }
      });
    }

    // Penalize completely unrelated content
    const unrelatedKeywords = ['politics', 'sports', 'entertainment', 'celebrity'];
    unrelatedKeywords.forEach(keyword => {
      if (text.includes(keyword)) {
        topicScore -= 0.3;
      }
    });

    return Math.max(Math.min(topicScore, 1), 0);
  }

  private detectMedicalMisinformation(text: string): number {
    let misinfoScore = 0;

    // Check for dangerous medical claims
    const dangerousPhrases = [
      'cure diabetes', 'stop taking insulin', 'doctors are wrong',
      'big pharma conspiracy', 'natural cure', 'miracle cure'
    ];

    dangerousPhrases.forEach(phrase => {
      if (text.includes(phrase)) {
        misinfoScore += 0.4;
      }
    });

    // Check for medical advice without disclaimers
    this.medicalKeywords.forEach(keyword => {
      if (text.includes(keyword) && !text.includes('consult') && !text.includes('doctor')) {
        misinfoScore += 0.2;
      }
    });

    return Math.min(misinfoScore, 1);
  }

  private assessQuality(content: ContentToAnalyze): number {
    const text = content.content;
    let qualityScore = 50; // Start at neutral

    // Length assessment
    if (text.length < 20) {
      qualityScore -= 20; // Too short
    } else if (text.length > 50 && text.length < 500) {
      qualityScore += 15; // Good length
    } else if (text.length > 1000) {
      qualityScore -= 10; // Might be too long
    }

    // Grammar and structure (basic checks)
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length > 1) {
      qualityScore += 10; // Multiple sentences = better structure
    }

    // Helpful indicators
    const helpfulPhrases = ['i found', 'this works', 'try this', 'helped me', 'experience'];
    helpfulPhrases.forEach(phrase => {
      if (text.toLowerCase().includes(phrase)) {
        qualityScore += 5;
      }
    });

    // Specific details (numbers, measurements, etc.)
    if (text.match(/\d+/g)) {
      qualityScore += 10; // Contains specific numbers/measurements
    }

    return Math.max(Math.min(qualityScore, 100), 0);
  }

  private getCategoryKeywords(category: string): string[] {
    const categoryMap: Record<string, string[]> = {
      'insertion': ['insert', 'place', 'apply', 'site', 'location', 'arm', 'abdomen'],
      'adhesion': ['stick', 'adhesive', 'patch', 'tape', 'skin prep', 'fall off'],
      'troubleshooting': ['problem', 'issue', 'error', 'fix', 'solution', 'help'],
      'longevity': ['last', 'duration', 'extend', 'longer', 'days', 'wear time'],
      'general': ['tip', 'advice', 'suggestion', 'recommend', 'experience']
    };

    return categoryMap[category] || [];
  }

  private generateRecommendation(analysis: ContentAnalysis): 'approve' | 'review' | 'reject' {
    // Auto-reject dangerous content immediately
    if (analysis.isMedicalMisinformation) {
      return 'reject';
    }

    // Auto-reject obvious spam (high confidence)
    if (analysis.isSpam && analysis.confidenceScore > 80) {
      return 'reject';
    }

    // Auto-reject multiple serious issues
    if ((analysis.isSpam && analysis.isInappropriate) || 
        (analysis.isSpam && analysis.isOffTopic) ||
        (analysis.isInappropriate && analysis.qualityScore < 20)) {
      return 'reject';
    }

    // Flag for review if any issues detected
    if (analysis.isSpam || analysis.isInappropriate || analysis.isOffTopic || analysis.qualityScore < 30) {
      return 'review';
    }

    // Auto-approve if high quality and no issues
    if (analysis.qualityScore > 70 && analysis.flags.length === 0) {
      return 'approve';
    }

    // Default to review for borderline cases
    return 'review';
  }

  private generateReasoning(analysis: ContentAnalysis): string {
    const reasons = [];

    if (analysis.isSpam) reasons.push('spam indicators detected');
    if (analysis.isInappropriate) reasons.push('inappropriate language found');
    if (analysis.isOffTopic) reasons.push('content appears off-topic');
    if (analysis.isMedicalMisinformation) reasons.push('potential medical misinformation');
    
    if (analysis.qualityScore > 80) reasons.push('high quality content');
    else if (analysis.qualityScore < 40) reasons.push('low quality content');

    if (reasons.length === 0) {
      return 'Content appears normal with no significant issues detected';
    }

    return `Flagged due to: ${reasons.join(', ')}`;
  }
}

// Export singleton instance
export const contentModerator = new ContentModerator();