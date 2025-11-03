'use client';

import { useState, useEffect } from 'react';
import {
  Edit3,
  Save,
  Eye,
  Mail,
  Loader2
} from 'lucide-react';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  variables: string[];
  lastModified: string;
}

export default function EmailTemplateEditor() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Mock templates for now - in production these would come from database
  const mockTemplates: EmailTemplate[] = [
    {
      id: 'welcome',
      name: 'Welcome Email',
      subject: '🎉 Welcome to the CGM Tracker Community!',
      htmlContent: `
        <h2>🎉 Welcome to the CGM Tracker Community!</h2>
        <p>Hi {{recipientName}},</p>
        <p>Welcome to our supportive community of CGM users! We're excited to have you join us.</p>
        
        <h3>🚀 Get Started:</h3>
        <ul>
            <li><strong>Share Your Tips:</strong> Help others with your CGM experiences</li>
            <li><strong>Ask Questions:</strong> Our community is here to help</li>
            <li><strong>Vote & Comment:</strong> Engage with helpful content</li>
            <li><strong>Bookmark Favorites:</strong> Save tips for later reference</li>
        </ul>
        
        <a href="{{communityUrl}}" class="button">Explore Community</a>
        
        <p>Together, we're making CGM management easier for everyone! 💪</p>
      `,
      textContent: `Welcome to the CGM Tracker Community!\\n\\nHi {{recipientName}},\\n\\nWelcome to our supportive community of CGM users!\\n\\nGet started by:\\n- Sharing your CGM tips\\n- Asking questions\\n- Voting on helpful content\\n- Bookmarking favorites\\n\\nExplore: {{communityUrl}}`,
      variables: ['recipientName', 'communityUrl', 'unsubscribeUrl'],
      lastModified: new Date().toISOString()
    },
    {
      id: 'comment_reply',
      name: 'Comment Reply Notification',
      subject: '💬 {{commenterName}} replied to your comment',
      htmlContent: `
        <h2>💬 Someone replied to your comment!</h2>
        <p>Hi {{recipientName}},</p>
        <p><strong>{{commenterName}}</strong> replied to your comment on "<strong>{{tipTitle}}</strong>"</p>
        
        <div class="quote">
            <strong>Your comment:</strong><br>
            {{commentContent}}
        </div>
        
        <div class="quote">
            <strong>{{commenterName}} replied:</strong><br>
            {{replyContent}}
        </div>
        
        <a href="{{tipUrl}}" class="button">View Conversation</a>
        
        <p>Keep the conversation going and help fellow CGM users!</p>
      `,
      textContent: `Hi {{recipientName}},\\n\\n{{commenterName}} replied to your comment on "{{tipTitle}}"\\n\\nYour comment: {{commentContent}}\\n\\n{{commenterName}} replied: {{replyContent}}\\n\\nView: {{tipUrl}}`,
      variables: ['recipientName', 'commenterName', 'tipTitle', 'commentContent', 'replyContent', 'tipUrl', 'unsubscribeUrl'],
      lastModified: new Date().toISOString()
    },
    {
      id: 'weekly_digest',
      name: 'Weekly Digest',
      subject: '📊 Your Weekly CGM Community Digest - {{newTips}} new tips!',
      htmlContent: `
        <h2>📊 Your Weekly CGM Community Digest</h2>
        <p>Hi {{recipientName}},</p>
        <p>Here's what happened in the CGM Tracker community this week:</p>
        
        <div class="stats">
            <div class="stat">
                <div class="stat-number">{{newTips}}</div>
                <div class="stat-label">New Tips</div>
            </div>
            <div class="stat">
                <div class="stat-number">{{newComments}}</div>
                <div class="stat-label">New Comments</div>
            </div>
        </div>
        
        <h3>🔥 Top Tips This Week</h3>
        {{#topTips}}
        <div class="tip-card">
            <div class="tip-title">{{title}}</div>
            <div class="tip-meta">
                <span>by {{author}}</span>
                <span>👍 {{votes}} votes</span>
            </div>
        </div>
        {{/topTips}}
        
        <a href="{{communityUrl}}" class="button">Explore Community</a>
        
        <p>Thanks for being part of our growing community!</p>
      `,
      textContent: `Hi {{recipientName}},\\n\\nYour weekly CGM community digest:\\n\\n- {{newTips}} new tips\\n- {{newComments}} new comments\\n\\nTop tips:\\n{{#topTips}}- {{title}} by {{author}} ({{votes}} votes)\\n{{/topTips}}\\n\\nExplore: {{communityUrl}}`,
      variables: ['recipientName', 'newTips', 'newComments', 'topTips', 'communityUrl', 'unsubscribeUrl'],
      lastModified: new Date().toISOString()
    }
  ];

  useEffect(() => {
    // Simulate loading templates
    setTimeout(() => {
      setTemplates(mockTemplates);
      setSelectedTemplate(mockTemplates[0]);
      setLoading(false);
    }, 1000);
  }, []);

  const handleSave = async () => {
    if (!selectedTemplate) return;

    setSaving(true);
    try {
      // In production, this would save to database
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update local state
      setTemplates(prev => 
        prev.map(t => 
          t.id === selectedTemplate.id 
            ? { ...selectedTemplate, lastModified: new Date().toISOString() }
            : t
        )
      );
      
      setEditMode(false);
      alert('✅ Template saved successfully!');
    } catch (error) {
      alert('❌ Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = () => {
    setPreviewMode(!previewMode);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading email templates...</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Template List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
              <Mail className="h-5 w-5 text-blue-600 mr-2" />
              Email Templates
            </h3>
            <div className="space-y-2">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => {
                    setSelectedTemplate(template);
                    setEditMode(false);
                    setPreviewMode(false);
                  }}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedTemplate?.id === template.id
                      ? 'bg-blue-50 border-blue-200 text-blue-900'
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="font-medium">{template.name}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Modified: {new Date(template.lastModified).toLocaleDateString()}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Template Editor */}
        <div className="lg:col-span-3">
          {selectedTemplate && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              {/* Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {selectedTemplate.name}
                    </h2>
                    <p className="text-gray-600">
                      Last modified: {new Date(selectedTemplate.lastModified).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handlePreview}
                      className={`px-3 py-2 rounded-lg border ${
                        previewMode 
                          ? 'bg-green-50 border-green-200 text-green-700' 
                          : 'bg-gray-50 border-gray-200 text-gray-700'
                      }`}
                    >
                      <Eye className="h-4 w-4 mr-1 inline" />
                      Preview
                    </button>
                    <button
                      onClick={() => setEditMode(!editMode)}
                      className={`px-3 py-2 rounded-lg border ${
                        editMode 
                          ? 'bg-blue-50 border-blue-200 text-blue-700' 
                          : 'bg-gray-50 border-gray-200 text-gray-700'
                      }`}
                    >
                      <Edit3 className="h-4 w-4 mr-1 inline" />
                      Edit
                    </button>
                    {editMode && (
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        {saving ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1 inline" />
                        ) : (
                          <Save className="h-4 w-4 mr-1 inline" />
                        )}
                        Save
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Subject Line */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject Line
                  </label>
                  {editMode ? (
                    <input
                      type="text"
                      value={selectedTemplate.subject}
                      onChange={(e) => setSelectedTemplate({
                        ...selectedTemplate,
                        subject: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-md border">
                      {selectedTemplate.subject}
                    </div>
                  )}
                </div>

                {/* HTML Content */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    HTML Content
                  </label>
                  {editMode ? (
                    <textarea
                      value={selectedTemplate.htmlContent}
                      onChange={(e) => setSelectedTemplate({
                        ...selectedTemplate,
                        htmlContent: e.target.value
                      })}
                      rows={15}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    />
                  ) : previewMode ? (
                    <div 
                      className="p-4 border border-gray-300 rounded-md bg-white"
                      dangerouslySetInnerHTML={{ __html: selectedTemplate.htmlContent }}
                    />
                  ) : (
                    <pre className="p-4 bg-gray-50 rounded-md border text-sm overflow-x-auto">
                      {selectedTemplate.htmlContent}
                    </pre>
                  )}
                </div>

                {/* Text Content */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Text Content (Fallback)
                  </label>
                  {editMode ? (
                    <textarea
                      value={selectedTemplate.textContent}
                      onChange={(e) => setSelectedTemplate({
                        ...selectedTemplate,
                        textContent: e.target.value
                      })}
                      rows={8}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    />
                  ) : (
                    <pre className="p-4 bg-gray-50 rounded-md border text-sm">
                      {selectedTemplate.textContent}
                    </pre>
                  )}
                </div>

                {/* Variables */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Available Variables
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {selectedTemplate.variables.map((variable) => (
                      <span
                        key={variable}
                        className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm font-mono"
                      >
                        {`{{${variable}}}`}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Help Section */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">📝 Template Editing Guide</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
          <div>
            <h4 className="font-medium mb-2">Variables:</h4>
            <ul className="space-y-1">
              <li>• Use <code>{`{{variableName}}`}</code> for simple variables</li>
              <li>• Use <code>{`{{#array}}...{{/array}}`}</code> for loops</li>
              <li>• Variables are automatically escaped for security</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">Styling:</h4>
            <ul className="space-y-1">
              <li>• Use CSS classes defined in base template</li>
              <li>• <code>.button</code> for call-to-action buttons</li>
              <li>• <code>.quote</code> for highlighted content</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}