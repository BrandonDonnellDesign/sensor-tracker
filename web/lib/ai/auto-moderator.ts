/**
 * Auto-Moderation System
 * Automatically moderates content when it's created
 */

import { contentModerator, ContentToAnalyze, ContentAnalysis } from './content-moderator';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface ModerationResult {
  action: 'approved' | 'flagged' | 'rejected';
  analysis: ContentAnalysis;
  requiresReview: boolean;
}

class AutoModerator {
  /**
   * Auto-moderate a tip when it's created
   */
  async moderateTip(tipData: {
    id: string;
    title: string;
    content: string;
    category: string;
    authorId: string;
    authorName: string;
  }): Promise<ModerationResult> {
    
    const contentToAnalyze: ContentToAnalyze = {
      title: tipData.title,
      content: tipData.content,
      category: tipData.category,
      author: tipData.authorName,
      type: 'tip'
    };

    const analysis = await contentModerator.analyzeContent(contentToAnalyze);
    
    // Determine action based on analysis
    let action: 'approved' | 'flagged' | 'rejected' = 'approved';
    let requiresReview = false;

    if (analysis.recommendation === 'reject') {
      action = 'rejected';
      requiresReview = true;
    } else if (analysis.recommendation === 'review') {
      action = 'flagged';
      requiresReview = true;
    } else {
      action = 'approved';
    }

    // Store moderation result in database
    await this.storeModerationResult({
      contentId: tipData.id,
      contentType: 'tip',
      analysis: analysis,
      action: action,
      authorId: tipData.authorId
    });

    // Update tip status if needed
    if (action === 'flagged' || action === 'rejected') {
      await supabase
        .from('community_tips')
        .update({
          is_flagged: true,
          moderation_status: action,
          moderation_reason: analysis.reasoning,
          moderated_at: new Date().toISOString()
        })
        .eq('id', tipData.id);
    }

    return {
      action,
      analysis,
      requiresReview
    };
  }

  /**
   * Auto-moderate a comment when it's created
   */
  async moderateComment(commentData: {
    id: string;
    content: string;
    tipId: string;
    authorId: string;
    authorName: string;
  }): Promise<ModerationResult> {
    
    const contentToAnalyze: ContentToAnalyze = {
      content: commentData.content,
      author: commentData.authorName,
      type: 'comment'
    };

    const analysis = await contentModerator.analyzeContent(contentToAnalyze);
    
    // Determine action based on analysis
    let action: 'approved' | 'flagged' | 'rejected' = 'approved';
    let requiresReview = false;

    if (analysis.recommendation === 'reject') {
      action = 'rejected';
      requiresReview = true;
    } else if (analysis.recommendation === 'review') {
      action = 'flagged';
      requiresReview = true;
    } else {
      action = 'approved';
    }

    // Store moderation result in database
    await this.storeModerationResult({
      contentId: commentData.id,
      contentType: 'comment',
      analysis: analysis,
      action: action,
      authorId: commentData.authorId
    });

    // Update comment status if needed
    if (action === 'flagged') {
      await supabase
        .from('community_tip_comments')
        .update({
          is_approved: null, // Pending review
          is_rejected: false,
          moderation_status: action,
          moderation_reason: analysis.reasoning,
          moderated_at: new Date().toISOString()
        })
        .eq('id', commentData.id);
    } else if (action === 'rejected') {
      await supabase
        .from('community_tip_comments')
        .update({
          is_approved: false,
          is_rejected: true,
          moderation_status: action,
          moderation_reason: analysis.reasoning,
          moderated_at: new Date().toISOString()
        })
        .eq('id', commentData.id);
    } else {
      // Auto-approve
      await supabase
        .from('community_tip_comments')
        .update({
          is_approved: true,
          is_rejected: false,
          moderation_status: action,
          moderated_at: new Date().toISOString()
        })
        .eq('id', commentData.id);
    }

    return {
      action,
      analysis,
      requiresReview
    };
  }

  /**
   * Store moderation result for tracking and analytics
   */
  private async storeModerationResult(data: {
    contentId: string;
    contentType: 'tip' | 'comment';
    analysis: ContentAnalysis;
    action: string;
    authorId: string;
  }) {
    try {
      const { error } = await supabase
        .from('ai_moderation_log')
        .insert({
          content_id: data.contentId,
          content_type: data.contentType,
          author_id: data.authorId,
          action: data.action,
          confidence_score: data.analysis.confidenceScore,
          quality_score: data.analysis.qualityScore,
          flags: data.analysis.flags,
          reasoning: data.analysis.reasoning,
          is_spam: data.analysis.isSpam,
          is_inappropriate: data.analysis.isInappropriate,
          is_off_topic: data.analysis.isOffTopic,
          is_medical_misinformation: data.analysis.isMedicalMisinformation,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Database error storing moderation result:', error);
      }
    } catch (error) {
      console.error('Failed to store moderation result:', error);
      // Don't throw - moderation should still work even if logging fails
    }
  }

  /**
   * Get moderation statistics for admin dashboard
   */
  async getModerationStats(days: number = 7) {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const { data: stats } = await supabase
        .from('ai_moderation_log')
        .select('*')
        .gte('created_at', since.toISOString());

      if (!stats) return null;

      const totalModerated = stats.length;
      const approved = stats.filter(s => s.action === 'approved').length;
      const flagged = stats.filter(s => s.action === 'flagged').length;
      const rejected = stats.filter(s => s.action === 'rejected').length;
      
      const avgConfidence = stats.reduce((sum, s) => sum + (s.confidence_score || 0), 0) / totalModerated;
      const avgQuality = stats.reduce((sum, s) => sum + (s.quality_score || 0), 0) / totalModerated;

      const spamDetected = stats.filter(s => s.is_spam).length;
      const inappropriateDetected = stats.filter(s => s.is_inappropriate).length;
      const offTopicDetected = stats.filter(s => s.is_off_topic).length;
      const misinfoDetected = stats.filter(s => s.is_medical_misinformation).length;

      return {
        totalModerated,
        approved,
        flagged,
        rejected,
        avgConfidence: Math.round(avgConfidence),
        avgQuality: Math.round(avgQuality),
        detectionStats: {
          spam: spamDetected,
          inappropriate: inappropriateDetected,
          offTopic: offTopicDetected,
          misinformation: misinfoDetected
        }
      };
    } catch (error) {
      console.error('Error getting moderation stats:', error);
      return null;
    }
  }
}

// Export singleton instance
export const autoModerator = new AutoModerator();