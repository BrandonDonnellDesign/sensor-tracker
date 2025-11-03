'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase-client';

interface Tag {
  id: string;
  name: string;
  category: string;
  description?: string | null;
  color: string;
  created_at?: string;
  createdAt?: Date;
}

interface TagSelectorProps {
  selectedTagIds: string[];
  onTagsChange: (tagIds: string[]) => void;
  className?: string;
}

interface TagsByCategory {
  [category: string]: Tag[];
}

export function TagSelector({ selectedTagIds, onTagsChange, className = '' }: TagSelectorProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagsByCategory, setTagsByCategory] = useState<TagsByCategory>({});
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const fetchTags = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: tags, error } = await supabase
        .from('tags')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        console.error('Failed to fetch tags:', error);
        return;
      }

      const fetchedTags: Tag[] = (tags || []).map((tag: any) => ({
        ...tag,
        color: tag.color || '#6B7280'
      }));
      setTags(fetchedTags);
      
      // Group tags by category
      const grouped = fetchedTags.reduce((acc: TagsByCategory, tag: Tag) => {
        if (!acc[tag.category]) {
          acc[tag.category] = [];
        }
        acc[tag.category].push(tag);
        return acc;
      }, {} as TagsByCategory);
      
      setTagsByCategory(grouped);
      
      // Expand categories that have selected tags
      const categoriesToExpand = new Set<string>();
      fetchedTags.forEach((tag: Tag) => {
        if (selectedTagIds.includes(tag.id)) {
          categoriesToExpand.add(tag.category);
        }
      });
      setExpandedCategories(categoriesToExpand);
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedTagIds]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const handleTagToggle = (tagId: string) => {
    const newSelectedIds = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter(id => id !== tagId)
      : [...selectedTagIds, tagId];
    
    onTagsChange(newSelectedIds);
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const getCategoryDisplayName = (category: string) => {
    const displayNames: { [key: string]: string } = {
      adhesive: 'Adhesive Issues',
      device_error: 'Device Errors',
      replacement: 'Replacement Requests',
      physical: 'Physical Issues',
      usage: 'Usage Issues',
      positive: 'Positive Experience',
      lifecycle: 'Lifecycle',
      general: 'General'
    };
    return displayNames[category] || category.charAt(0).toUpperCase() + category.slice(1);
  };

  if (loading) {
    return (
      <div className={`${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-8 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-white mb-2">
        Tags
        {selectedTagIds.length > 0 && (
          <span className="ml-2 text-xs text-gray-300">
            ({selectedTagIds.length} selected)
          </span>
        )}
      </label>
      
      <div className="space-y-3 max-h-64 overflow-y-auto border border-gray-600 rounded-md p-3 bg-gray-800/50">
        {Object.entries(tagsByCategory).map(([category, categoryTags]) => (
          <div key={category} className="space-y-2">
            <button
              type="button"
              onClick={() => toggleCategory(category)}
              className="flex items-center justify-between w-full text-sm font-medium text-white hover:text-gray-200"
            >
              <span>{getCategoryDisplayName(category)}</span>
              <svg
                className={`w-4 h-4 transition-transform ${
                  expandedCategories.has(category) ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {expandedCategories.has(category) && (
              <div className="ml-4 space-y-1">
                {categoryTags.map(tag => (
                  <label key={tag.id} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedTagIds.includes(tag.id)}
                      onChange={() => handleTagToggle(tag.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="text-sm text-white font-medium">{tag.name}</span>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      
      {selectedTagIds.length > 0 && (
        <div className="mt-3">
          <div className="text-xs text-gray-300 font-medium mb-1">Selected tags:</div>
          <div className="flex flex-wrap gap-1">
            {selectedTagIds.map(tagId => {
              const tag = tags.find(t => t.id === tagId);
              if (!tag) return null;
              
              return (
                <span
                  key={tagId}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white"
                  style={{ backgroundColor: tag.color }}
                >
                  {tag.name}
                  <button
                    type="button"
                    onClick={() => handleTagToggle(tagId)}
                    className="ml-1 w-3 h-3 rounded-full bg-white bg-opacity-20 flex items-center justify-center hover:bg-opacity-30"
                  >
                    <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}