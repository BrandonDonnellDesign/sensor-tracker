/**
 * Debug endpoint to test AI moderation
 * POST /api/debug/test-ai-moderation
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { content, title } = await request.json();

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    console.log('🧪 Testing AI Moderation for:', { title, content });

    // Test the content moderator directly
    const { contentModerator } = await import('@/lib/ai/content-moderator');
    
    const analysis = await contentModerator.analyzeContent({
      title: title || '',
      content: content,
      category: 'general',
      author: 'Test User',
      type: 'tip'
    });

    console.log('🤖 AI Analysis Result:', analysis);

    // Test the auto-moderator decision
    const testTipData = {
      id: 'test-tip-' + Date.now(),
      title: title || 'Test Title',
      content: content,
      category: 'general',
      authorId: 'test-user',
      authorName: 'Test User'
    };

    const { autoModerator } = await import('@/lib/ai/auto-moderator');
    
    // Don't actually store to database, just get the decision
    const mockStoreModerationResult = autoModerator['storeModerationResult'];
    autoModerator['storeModerationResult'] = async () => {
      console.log('🗄️ Would store moderation result (skipped for test)');
    };

    const moderationResult = await autoModerator.moderateTip(testTipData);
    
    // Restore original function
    autoModerator['storeModerationResult'] = mockStoreModerationResult;

    console.log('⚖️ Moderation Decision:', moderationResult);

    return NextResponse.json({
      success: true,
      testInput: { title, content },
      analysis: {
        isSpam: analysis.isSpam,
        isInappropriate: analysis.isInappropriate,
        isOffTopic: analysis.isOffTopic,
        isMedicalMisinformation: analysis.isMedicalMisinformation,
        qualityScore: analysis.qualityScore,
        confidenceScore: analysis.confidenceScore,
        flags: analysis.flags,
        recommendation: analysis.recommendation,
        reasoning: analysis.reasoning
      },
      moderationResult: {
        action: moderationResult.action,
        requiresReview: moderationResult.requiresReview
      },
      debug: {
        spamKeywordsFound: analysis.flags.filter(f => f.includes('spam')),
        wouldBeRejected: moderationResult.action === 'rejected',
        wouldBeVisible: moderationResult.action === 'approved'
      }
    });

  } catch (error) {
    console.error('Error testing AI moderation:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}