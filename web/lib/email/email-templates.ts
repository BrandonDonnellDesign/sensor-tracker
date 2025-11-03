/**
 * Email Templates for Community Notifications
 * Beautiful, responsive HTML email templates
 */

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface CommentReplyData {
  recipientName: string;
  commenterName: string;
  tipTitle: string;
  commentContent: string;
  replyContent: string;
  tipUrl: string;
  unsubscribeUrl: string;
}

export interface WeeklyDigestData {
  recipientName: string;
  weeklyStats: {
    newTips: number;
    newComments: number;
    topTips: Array<{
      title: string;
      author: string;
      votes: number;
      url: string;
    }>;
  };
  unsubscribeUrl: string;
}

export interface AdminAlertData {
  adminName: string;
  alertType: 'flagged_content' | 'spam_detected' | 'inappropriate_content';
  contentType: 'tip' | 'comment';
  contentTitle?: string;
  contentPreview: string;
  authorName: string;
  flagReason: string;
  moderationUrl: string;
}

class EmailTemplates {
  private getBaseTemplate(content: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CGM Tracker Community</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8fafc;
        }
        .container {
            background: white;
            border-radius: 12px;
            padding: 32px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }
        .header {
            text-align: center;
            margin-bottom: 32px;
            padding-bottom: 24px;
            border-bottom: 2px solid #e2e8f0;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #3b82f6;
            margin-bottom: 8px;
        }
        .tagline {
            color: #64748b;
            font-size: 14px;
        }
        .content {
            margin-bottom: 32px;
        }
        .button {
            display: inline-block;
            background: #3b82f6;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 500;
            margin: 16px 0;
        }
        .button:hover {
            background: #2563eb;
        }
        .quote {
            background: #f1f5f9;
            border-left: 4px solid #3b82f6;
            padding: 16px;
            margin: 16px 0;
            border-radius: 0 8px 8px 0;
        }
        .stats {
            display: flex;
            justify-content: space-around;
            background: #f8fafc;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .stat {
            text-align: center;
        }
        .stat-number {
            font-size: 24px;
            font-weight: bold;
            color: #3b82f6;
        }
        .stat-label {
            font-size: 12px;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .footer {
            text-align: center;
            padding-top: 24px;
            border-top: 1px solid #e2e8f0;
            color: #64748b;
            font-size: 12px;
        }
        .unsubscribe {
            color: #64748b;
            text-decoration: none;
            font-size: 12px;
        }
        .tip-card {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 16px;
            margin: 12px 0;
        }
        .tip-title {
            font-weight: 600;
            color: #1e293b;
            margin-bottom: 8px;
        }
        .tip-meta {
            font-size: 12px;
            color: #64748b;
            display: flex;
            justify-content: space-between;
        }
        .alert {
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 8px;
            padding: 16px;
            margin: 16px 0;
        }
        .alert-title {
            font-weight: 600;
            color: #dc2626;
            margin-bottom: 8px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🩺 CGM Tracker</div>
            <div class="tagline">Your Diabetes Management Community</div>
        </div>
        ${content}
        <div class="footer">
            <p>This email was sent by CGM Tracker Community</p>
            <p>© 2024 CGM Tracker. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  /**
   * Comment Reply Notification
   */
  commentReply(data: CommentReplyData): EmailTemplate {
    const content = `
        <div class="content">
            <h2>💬 Someone replied to your comment!</h2>
            <p>Hi ${data.recipientName},</p>
            <p><strong>${data.commenterName}</strong> replied to your comment on "<strong>${data.tipTitle}</strong>"</p>
            
            <div class="quote">
                <strong>Your comment:</strong><br>
                ${data.commentContent}
            </div>
            
            <div class="quote">
                <strong>${data.commenterName} replied:</strong><br>
                ${data.replyContent}
            </div>
            
            <a href="${data.tipUrl}" class="button">View Conversation</a>
            
            <p>Keep the conversation going and help fellow CGM users!</p>
        </div>
        
        <div class="footer">
            <a href="${data.unsubscribeUrl}" class="unsubscribe">Unsubscribe from reply notifications</a>
        </div>
    `;

    return {
      subject: `💬 ${data.commenterName} replied to your comment`,
      html: this.getBaseTemplate(content),
      text: `Hi ${data.recipientName},\n\n${data.commenterName} replied to your comment on "${data.tipTitle}"\n\nYour comment: ${data.commentContent}\n\n${data.commenterName} replied: ${data.replyContent}\n\nView the conversation: ${data.tipUrl}\n\nUnsubscribe: ${data.unsubscribeUrl}`
    };
  }

  /**
   * Weekly Community Digest
   */
  weeklyDigest(data: WeeklyDigestData): EmailTemplate {
    const topTipsHtml = data.weeklyStats.topTips.map(tip => `
        <div class="tip-card">
            <div class="tip-title">${tip.title}</div>
            <div class="tip-meta">
                <span>by ${tip.author}</span>
                <span>👍 ${tip.votes} votes</span>
            </div>
        </div>
    `).join('');

    const content = `
        <div class="content">
            <h2>📊 Your Weekly CGM Community Digest</h2>
            <p>Hi ${data.recipientName},</p>
            <p>Here's what happened in the CGM Tracker community this week:</p>
            
            <div class="stats">
                <div class="stat">
                    <div class="stat-number">${data.weeklyStats.newTips}</div>
                    <div class="stat-label">New Tips</div>
                </div>
                <div class="stat">
                    <div class="stat-number">${data.weeklyStats.newComments}</div>
                    <div class="stat-label">New Comments</div>
                </div>
            </div>
            
            <h3>🔥 Top Tips This Week</h3>
            ${topTipsHtml}
            
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/community" class="button">Explore Community</a>
            
            <p>Thanks for being part of our growing community!</p>
        </div>
        
        <div class="footer">
            <a href="${data.unsubscribeUrl}" class="unsubscribe">Unsubscribe from weekly digest</a>
        </div>
    `;

    return {
      subject: `📊 Your Weekly CGM Community Digest - ${data.weeklyStats.newTips} new tips!`,
      html: this.getBaseTemplate(content),
      text: `Hi ${data.recipientName},\n\nHere's your weekly CGM community digest:\n\n- ${data.weeklyStats.newTips} new tips\n- ${data.weeklyStats.newComments} new comments\n\nTop tips this week:\n${data.weeklyStats.topTips.map(tip => `- ${tip.title} by ${tip.author} (${tip.votes} votes)`).join('\n')}\n\nExplore: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard/community\n\nUnsubscribe: ${data.unsubscribeUrl}`
    };
  }

  /**
   * Admin Alert for Flagged Content
   */
  adminAlert(data: AdminAlertData): EmailTemplate {
    const alertTypeMap = {
      'flagged_content': '🚩 Content Flagged for Review',
      'spam_detected': '🚫 Spam Content Detected',
      'inappropriate_content': '⚠️ Inappropriate Content Detected'
    };

    const content = `
        <div class="content">
            <h2>${alertTypeMap[data.alertType]}</h2>
            <p>Hi ${data.adminName},</p>
            <p>Our AI moderation system has flagged ${data.contentType === 'tip' ? 'a tip' : 'a comment'} that requires your attention.</p>
            
            <div class="alert">
                <div class="alert-title">Flagged Content Details</div>
                ${data.contentTitle ? `<strong>Title:</strong> ${data.contentTitle}<br>` : ''}
                <strong>Author:</strong> ${data.authorName}<br>
                <strong>Reason:</strong> ${data.flagReason}<br><br>
                <strong>Content Preview:</strong><br>
                ${data.contentPreview}
            </div>
            
            <a href="${data.moderationUrl}" class="button">Review & Moderate</a>
            
            <p>Please review this content and take appropriate action.</p>
        </div>
    `;

    return {
      subject: `🚩 Admin Alert: ${data.contentType === 'tip' ? 'Tip' : 'Comment'} flagged for review`,
      html: this.getBaseTemplate(content),
      text: `Hi ${data.adminName},\n\nA ${data.contentType} has been flagged for review:\n\nAuthor: ${data.authorName}\nReason: ${data.flagReason}\n\nContent: ${data.contentPreview}\n\nReview at: ${data.moderationUrl}`
    };
  }

  /**
   * Welcome Email for New Community Members
   */
  welcomeEmail(userName: string, unsubscribeUrl: string): EmailTemplate {
    const content = `
        <div class="content">
            <h2>🎉 Welcome to the CGM Tracker Community!</h2>
            <p>Hi ${userName},</p>
            <p>Welcome to our supportive community of CGM users! We're excited to have you join us.</p>
            
            <h3>🚀 Get Started:</h3>
            <ul>
                <li><strong>Share Your Tips:</strong> Help others with your CGM experiences</li>
                <li><strong>Ask Questions:</strong> Our community is here to help</li>
                <li><strong>Vote & Comment:</strong> Engage with helpful content</li>
                <li><strong>Bookmark Favorites:</strong> Save tips for later reference</li>
            </ul>
            
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/community" class="button">Explore Community</a>
            
            <p>Together, we're making CGM management easier for everyone! 💪</p>
        </div>
        
        <div class="footer">
            <a href="${unsubscribeUrl}" class="unsubscribe">Manage email preferences</a>
        </div>
    `;

    return {
      subject: '🎉 Welcome to the CGM Tracker Community!',
      html: this.getBaseTemplate(content),
      text: `Hi ${userName},\n\nWelcome to the CGM Tracker Community!\n\nGet started by:\n- Sharing your CGM tips\n- Asking questions\n- Voting on helpful content\n- Bookmarking favorites\n\nExplore: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard/community\n\nManage preferences: ${unsubscribeUrl}`
    };
  }
}

// Export singleton instance
export const emailTemplates = new EmailTemplates();