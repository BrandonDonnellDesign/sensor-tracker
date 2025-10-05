'use client';

import { useState } from 'react';
import Link from 'next/link';

interface FAQItem {
  question: string;
  answer: string;
  category: 'getting-started' | 'sensors' | 'features' | 'notifications' | 'troubleshooting' | 'data' | 'account';
}

const faqData: FAQItem[] = [
  // Getting Started
  {
    category: 'getting-started',
    question: 'How do I add my first sensor?',
    answer: 'Go to the Sensors page and click "Add New Sensor". Enter your sensor\'s serial number and lot number (for Dexcom sensors), select the sensor type, and set the date you applied it. You can also take a photo of the sensor packaging for your records.'
  },
  {
    category: 'getting-started',
    question: 'What sensor types are supported?',
    answer: 'We currently support Dexcom G6, Dexcom G7, and Abbott FreeStyle Libre sensors. Each sensor type has different wear durations: Dexcom sensors typically last 10 days, while FreeStyle Libre sensors last 14 days.'
  },
  {
    category: 'getting-started',
    question: 'How do I set up notifications?',
    answer: 'Go to Settings > Notifications to configure when you want to receive expiration warnings. You can set both warning notifications (e.g., 2 days before expiration) and critical notifications (e.g., day of expiration). Make sure to enable notifications in your browser or device settings.'
  },

  // Sensors
  {
    category: 'sensors',
    question: 'What should I do if a sensor fails early?',
    answer: 'Mark the sensor as problematic by editing it and checking the "Problematic" checkbox. Add notes about what went wrong (adhesive failure, sensor error, etc.). This helps track failure patterns and improve your sensor management.'
  },
  {
    category: 'sensors',
    question: 'Can I edit sensor information after adding it?',
    answer: 'Yes! Click on any sensor in your list to view its details, then click "Edit Sensor" to modify the date applied, serial number, or mark it as problematic. You can also add or update photos.'
  },
  {
    category: 'sensors',
    question: 'How do I track when I remove a sensor?',
    answer: 'The app automatically calculates wear duration based on when you add your next sensor. For your most recent sensor, it will show as active until it expires or you add a replacement.'
  },
  {
    category: 'sensors',
    question: 'Why do I need to enter lot numbers for Dexcom sensors?',
    answer: 'Lot numbers help track sensor batches and can be useful if there are manufacturing issues or recalls. For FreeStyle Libre sensors, lot numbers are optional as they\'re not typically required for troubleshooting.'
  },

  // Notifications
  {
    category: 'notifications',
    question: 'I\'m not receiving notifications. What should I check?',
    answer: 'First, ensure notifications are enabled in Settings > Notifications. Then check your browser/device notification permissions for this website. Make sure you\'re not in Do Not Disturb mode, and verify that the app is open or has permission to send background notifications.'
  },
  {
    category: 'notifications',
    question: 'Can I customize notification timing?',
    answer: 'Yes! In Settings > Notifications, you can set custom warning periods (e.g., 3 days before expiration) and critical alerts (e.g., day of expiration). You can also choose between in-app notifications and push notifications.'
  },
  {
    category: 'notifications',
    question: 'What timezone are notifications based on?',
    answer: 'Notifications use the timezone you\'ve set in Settings > Preferences. Make sure this matches your location for accurate timing. The app will calculate expiration times based on when you applied the sensor in your local timezone.'
  },

  // Data & Analytics
  {
    category: 'data',
    question: 'How is average wear duration calculated?',
    answer: 'Average wear duration is calculated only for completed sensors (those that have been replaced). The app uses the start date of your next sensor as the end date of the previous sensor, giving you accurate real-world wear times rather than theoretical maximums.'
  },
  {
    category: 'data',
    question: 'What does the failure rate mean?',
    answer: 'Failure rate shows the percentage of your completed sensors that were marked as problematic or wore for less than 80% of their expected duration. This helps identify patterns in sensor performance.'
  },
  {
    category: 'data',
    question: 'Can I export my sensor data?',
    answer: 'Yes! Go to Settings > Export Data to download your sensor history as a CSV file. This includes all sensor details, dates, and any notes you\'ve added.'
  },
  {
    category: 'data',
    question: 'How can I view my sensor history?',
    answer: 'The Sensors page shows all your sensors with their status. Use the Analytics page to see trends, average wear duration, and performance patterns over time.'
  },

  // Troubleshooting
  {
    category: 'troubleshooting',
    question: 'The app isn\'t loading properly. What should I do?',
    answer: 'Try refreshing the page (Ctrl+R or Cmd+R). If issues persist, clear your browser cache and cookies for this site. Make sure you have a stable internet connection. If problems continue, try using a different browser or device.'
  },
  {
    category: 'troubleshooting',
    question: 'My sensor dates look wrong. How do I fix this?',
    answer: 'Check your timezone setting in Settings > Preferences. If your timezone is incorrect, update it and your sensor times should display correctly. You can also edit individual sensors to correct their application dates.'
  },
  {
    category: 'troubleshooting',
    question: 'Photos aren\'t uploading. What\'s wrong?',
    answer: 'Ensure your images are in a supported format (JPEG, PNG, WebP) and under 10MB. Check your internet connection and try uploading again. If using a mobile device, make sure the app has camera/photo permissions.'
  },
  {
    category: 'troubleshooting',
    question: 'How does sensor deletion work?',
    answer: 'Sensors use a "soft delete" system for data safety. When you delete a sensor, it\'s hidden from your main view but preserved in case you need to recover it. To permanently delete a sensor: 1) Delete it normally from your sensors list, 2) Go to "Show Deleted" to view deleted sensors, 3) Use the permanent delete option there. This two-step process prevents accidental data loss.'
  },
  {
    category: 'troubleshooting',
    question: 'Can I recover a deleted sensor?',
    answer: 'Yes! Deleted sensors can be recovered. Go to your Sensors page and click "Show Deleted" to view all soft-deleted sensors. From there, you can restore any sensor back to your active list. Only permanently deleted sensors cannot be recovered.'
  },

  // Account
  {
    category: 'account',
    question: 'How do I change my password?',
    answer: 'Currently, password changes are handled through the authentication system. Log out and use the "Forgot Password" link on the login page to reset your password via email.'
  },
  {
    category: 'account',
    question: 'Can I change my email address?',
    answer: 'Email changes are handled through your account profile. Contact support if you need assistance changing your email address.'
  },
  {
    category: 'account',
    question: 'Is my data secure and private?',
    answer: 'Yes! Your sensor data is stored securely and is only accessible to you. We use industry-standard encryption and security practices. Your data is never shared with third parties without your explicit consent.'
  },
  {
    category: 'account',
    question: 'Can I use the app on multiple devices?',
    answer: 'Yes! Log in with the same account on any device to access your sensor data. Your information syncs automatically across all your devices.'
  },

  // Tags & Notes (New Feature)
  {
    category: 'features',
    question: 'How do I add tags and notes to my sensors?',
    answer: 'Click on any sensor to view its details, then use the "Tags" and "Notes" sections. Tags help categorize issues (like "Adhesive Problem" or "Device Error"), while notes let you add detailed observations. This helps track patterns and improve your sensor experience.'
  },
  {
    category: 'features',
    question: 'What are the different tag categories?',
    answer: 'Tags are organized into categories: Adhesive (peeling, irritation), Performance (accuracy, readings), Physical (comfort, placement), Device (hardware issues), Lifecycle (expired, replacement), Environmental (weather, activity), Positive (good performance), and General (other issues).'
  },
  {
    category: 'features',
    question: 'Do expired sensors get tagged automatically?',
    answer: 'Yes! The app automatically detects when sensors expire based on their expected duration and adds an "Expired" tag. This helps you identify which sensors naturally reached their end-of-life versus those that had issues.'
  },

  // Archived Sensors (New Feature)
  {
    category: 'features',
    question: 'What happens to old sensor data?',
    answer: 'Sensors that expired more than 6 months ago are automatically archived to keep your main dashboard fast. Archived sensors are still preserved and can be viewed by clicking the "Archived" button on your Sensors page. Your historical data is never lost!'
  },
  {
    category: 'features',
    question: 'Can I access my archived sensors?',
    answer: 'Absolutely! Click the "Archived" button on your Sensors page to view all sensors that have been archived. You can see their full history, wear duration, and why they were archived. This is perfect for long-term tracking and analysis.'
  },

  // Photo Gallery Enhancements
  {
    category: 'sensors',
    question: 'How do sensor photos load faster now?',
    answer: 'The photo gallery has been optimized with priority loading for images that appear first, making your sensor photos load much faster. The first few photos you see will load immediately while others load in the background.'
  },

  // Performance & Analytics Enhancements
  {
    category: 'data',
    question: 'How accurate are my analytics now?',
    answer: 'Analytics have been enhanced with automatic expiration detection and tag-based filtering. The system now accurately identifies completed vs. ongoing sensors and calculates failure rates based on both duration and tagged issues for more precise insights.'
  },
  {
    category: 'data',
    question: 'Can I filter analytics by tag categories?',
    answer: 'Yes! The analytics page shows breakdowns by tag categories, helping you identify patterns like "most common adhesive issues" or "environmental factors affecting sensors." This makes it easier to discuss patterns with your healthcare provider.'
  }
];

const categories = [
  { id: 'getting-started', name: 'Getting Started', icon: '🚀' },
  { id: 'sensors', name: 'Managing Sensors', icon: '📱' },
  { id: 'features', name: 'New Features', icon: '✨' },
  { id: 'notifications', name: 'Notifications', icon: '🔔' },
  { id: 'data', name: 'Data & Analytics', icon: '📊' },
  { id: 'troubleshooting', name: 'Troubleshooting', icon: '🔧' },
  { id: 'account', name: 'Account & Privacy', icon: '👤' }
];

export default function HelpPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('getting-started');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

  const filteredFAQs = faqData.filter(faq => {
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const toggleFAQ = (index: number) => {
    setExpandedFAQ(expandedFAQ === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Link 
              href="/dashboard" 
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </Link>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-2">
            Help & FAQ
          </h1>
          <p className="text-gray-600 dark:text-slate-400 max-w-2xl">
            Find answers to common questions about using the Sensor Tracker app, managing your CGM sensors, and troubleshooting issues.
          </p>
        </div>

        {/* Search */}
        <div className="mb-8">
          <div className="relative max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search help articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md leading-5 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Categories Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-slate-700 sticky top-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">Categories</h2>
              <nav className="space-y-2">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`w-full text-left px-3 py-2 rounded-lg flex items-center transition-colors ${
                    selectedCategory === 'all'
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <span className="mr-3">📚</span>
                  All Topics
                </button>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg flex items-center transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span className="mr-3">{category.icon}</span>
                    {category.name}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* FAQ Content */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700">
              <div className="p-6 border-b border-gray-200 dark:border-slate-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
                  {selectedCategory === 'all' 
                    ? 'All Topics' 
                    : categories.find(c => c.id === selectedCategory)?.name
                  }
                </h2>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                  {filteredFAQs.length} article{filteredFAQs.length !== 1 ? 's' : ''} found
                </p>
              </div>

              <div className="divide-y divide-gray-200 dark:divide-slate-700">
                {filteredFAQs.length > 0 ? (
                  filteredFAQs.map((faq, index) => (
                    <div key={index} className="p-6">
                      <button
                        onClick={() => toggleFAQ(index)}
                        className="w-full text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg p-2 -m-2"
                      >
                        <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 pr-4">
                          {faq.question}
                        </h3>
                        <svg
                          className={`w-5 h-5 text-gray-400 transform transition-transform ${
                            expandedFAQ === index ? 'rotate-180' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      {expandedFAQ === index && (
                        <div className="mt-4 text-gray-600 dark:text-slate-300 leading-relaxed">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center">
                    <div className="text-gray-400 dark:text-slate-500 mb-4">
                      <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">
                      No articles found
                    </h3>
                    <p className="text-gray-500 dark:text-slate-400">
                      Try adjusting your search terms or selecting a different category.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Links */}
            <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800">
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4">
                Quick Actions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link
                  href="/dashboard/sensors"
                  className="flex items-center p-3 bg-white dark:bg-slate-700 rounded-lg border border-blue-200 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-slate-600 transition-colors"
                >
                  <span className="text-2xl mr-3">📱</span>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-slate-100">Add New Sensor</div>
                    <div className="text-sm text-gray-500 dark:text-slate-400">Track your latest CGM sensor</div>
                  </div>
                </Link>
                
                <Link
                  href="/dashboard/settings"
                  className="flex items-center p-3 bg-white dark:bg-slate-700 rounded-lg border border-blue-200 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-slate-600 transition-colors"
                >
                  <span className="text-2xl mr-3">⚙️</span>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-slate-100">Configure Settings</div>
                    <div className="text-sm text-gray-500 dark:text-slate-400">Set up notifications & preferences</div>
                  </div>
                </Link>
                
                <Link
                  href="/dashboard/analytics"
                  className="flex items-center p-3 bg-white dark:bg-slate-700 rounded-lg border border-blue-200 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-slate-600 transition-colors"
                >
                  <span className="text-2xl mr-3">📊</span>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-slate-100">View Analytics</div>
                    <div className="text-sm text-gray-500 dark:text-slate-400">Check your sensor performance</div>
                  </div>
                </Link>
                
                <div className="flex items-center p-3 bg-white dark:bg-slate-700 rounded-lg border border-blue-200 dark:border-blue-700">
                  <span className="text-2xl mr-3">💬</span>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-slate-100">Need More Help?</div>
                    <div className="text-sm text-gray-500 dark:text-slate-400">Contact support for assistance</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}