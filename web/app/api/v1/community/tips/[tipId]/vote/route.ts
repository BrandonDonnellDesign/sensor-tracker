import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { apiAuthMiddleware } from '@/lib/middleware/api-auth-middleware';

/**
 * @swagger
 * /api/v1/community/tips/{tipId}/vote:
 *   post:
 *     tags: [Community]
 *     summary: Vote on a community tip
 *     description: Cast an upvote or downvote on a community tip
 *     parameters:
 *       - in: path
 *         name: tipId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The tip ID to vote on
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - vote_type
 *             properties:
 *               vote_type:
 *                 type: string
 *                 enum: [upvote, downvote]
 *                 description: Type of vote to cast
 *     responses:
 *       200:
 *         description: Vote cast successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     vote_id:
 *                       type: string
 *                       format: uuid
 *                     vote_type:
 *                       type: string
 *                     tip_votes:
 *                       type: object
 *                       properties:
 *                         upvotes:
 *                           type: integer
 *                         downvotes:
 *                           type: integer
 *       400:
 *         description: Invalid vote type or tip not found
 *       401:
 *         description: Authentication required
 *       409:
 *         description: User has already voted on this tip
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { tipId: string } }
) {
  try {
    // Authenticate request
    const authResult = await apiAuthMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { tipId } = params;
    const { vote_type } = await request.json();

    // Validate vote type
    if (!vote_type || !['upvote', 'downvote'].includes(vote_type)) {
      return NextResponse.json(
        { error: 'Invalid vote type. Must be "upvote" or "downvote"' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check if tip exists
    const { data: tip, error: tipError } = await supabase
      .from('community_tips')
      .select('id, title')
      .eq('id', tipId)
      .single();

    if (tipError || !tip) {
      return NextResponse.json(
        { error: 'Tip not found' },
        { status: 404 }
      );
    }

    // Check if user has already voted
    const { data: existingVote } = await supabase
      .from('community_tip_votes')
      .select('id, vote_type')
      .eq('tip_id', tipId)
      .eq('user_id', authResult.userId)
      .single();

    if (existingVote) {
      if (existingVote.vote_type === vote_type) {
        return NextResponse.json(
          { error: 'You have already cast this vote on this tip' },
          { status: 409 }
        );
      }

      // Update existing vote
      const { data: updatedVote, error: updateError } = await supabase
        .from('community_tip_votes')
        .update({ vote_type, updated_at: new Date().toISOString() })
        .eq('id', existingVote.id)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json(
          { error: 'Failed to update vote' },
          { status: 500 }
        );
      }

      // Get updated vote counts
      const { data: voteCounts } = await supabase
        .rpc('get_tip_vote_counts', { tip_id: tipId });

      return NextResponse.json({
        success: true,
        message: 'Vote updated successfully',
        data: {
          vote_id: updatedVote.id,
          vote_type: updatedVote.vote_type,
          tip_votes: voteCounts || { upvotes: 0, downvotes: 0 }
        }
      });
    }

    // Create new vote
    const { data: newVote, error: voteError } = await supabase
      .from('community_tip_votes')
      .insert({
        tip_id: tipId,
        user_id: authResult.userId,
        vote_type
      })
      .select()
      .single();

    if (voteError) {
      return NextResponse.json(
        { error: 'Failed to cast vote' },
        { status: 500 }
      );
    }

    // Get updated vote counts
    const { data: voteCounts } = await supabase
      .rpc('get_tip_vote_counts', { tip_id: tipId });

    return NextResponse.json({
      success: true,
      message: 'Vote cast successfully',
      data: {
        vote_id: newVote.id,
        vote_type: newVote.vote_type,
        tip_votes: voteCounts || { upvotes: 0, downvotes: 0 }
      }
    });

  } catch (error) {
    console.error('Error in community tip vote:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/v1/community/tips/{tipId}/vote:
 *   delete:
 *     tags: [Community]
 *     summary: Remove vote from a community tip
 *     description: Remove your vote from a community tip
 *     parameters:
 *       - in: path
 *         name: tipId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The tip ID to remove vote from
 *     responses:
 *       200:
 *         description: Vote removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     tip_votes:
 *                       type: object
 *                       properties:
 *                         upvotes:
 *                           type: integer
 *                         downvotes:
 *                           type: integer
 *       404:
 *         description: Vote not found
 *       401:
 *         description: Authentication required
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { tipId: string } }
) {
  try {
    // Authenticate request
    const authResult = await apiAuthMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { tipId } = params;
    const supabase = await createClient();

    // Find and delete the vote
    const { error: deleteError } = await supabase
      .from('community_tip_votes')
      .delete()
      .eq('tip_id', tipId)
      .eq('user_id', authResult.userId);

    if (deleteError) {
      return NextResponse.json(
        { error: 'Vote not found or failed to remove' },
        { status: 404 }
      );
    }

    // Get updated vote counts
    const { data: voteCounts } = await supabase
      .rpc('get_tip_vote_counts', { tip_id: tipId });

    return NextResponse.json({
      success: true,
      message: 'Vote removed successfully',
      data: {
        tip_votes: voteCounts || { upvotes: 0, downvotes: 0 }
      }
    });

  } catch (error) {
    console.error('Error removing community tip vote:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}