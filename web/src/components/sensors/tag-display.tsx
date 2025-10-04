'use client';

interface Tag {
  id: string;
  name: string;
  category: string;
  description?: string;
  color: string;
  created_at?: string;
  createdAt?: Date;
}

interface TagDisplayProps {
  tags: Tag[];
  size?: 'sm' | 'md' | 'lg';
  removable?: boolean;
  onRemove?: (tagId: string) => void;
  className?: string;
}

// Function to determine if we should use light or dark text based on background color
function getContrastTextColor(hexColor: string): string {
  // Remove # if present
  const hex = hexColor.replace('#', '');
  
  // Parse RGB values
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return white text for dark backgrounds, black text for light backgrounds
  return luminance > 0.5 ? 'text-gray-900' : 'text-white';
}

export function TagDisplay({ 
  tags, 
  size = 'md', 
  removable = false, 
  onRemove, 
  className = '' 
}: TagDisplayProps) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base'
  };

  const removeButtonClasses = {
    sm: 'w-3 h-3 ml-1',
    md: 'w-4 h-4 ml-1.5',
    lg: 'w-5 h-5 ml-2'
  };

  if (tags.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {tags.map(tag => {
        const textColor = getContrastTextColor(tag.color);
        return (
          <span
            key={tag.id}
            className={`inline-flex items-center rounded-full font-medium ${textColor} ${sizeClasses[size]}`}
            style={{ backgroundColor: tag.color }}
            title={tag.description}
          >
            {tag.name}
            {removable && onRemove && (
              <button
                type="button"
                onClick={() => onRemove(tag.id)}
                className={`rounded-full bg-black bg-opacity-20 flex items-center justify-center hover:bg-opacity-30 transition-colors ${removeButtonClasses[size]}`}
                aria-label={`Remove ${tag.name} tag`}
              >
                <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </span>
        );
      })}
    </div>
  );
}

interface TagBadgeProps {
  tag: Tag;
  size?: 'sm' | 'md' | 'lg';
  removable?: boolean;
  onRemove?: () => void;
  className?: string;
}

export function TagBadge({ 
  tag, 
  size = 'md', 
  removable = false, 
  onRemove, 
  className = '' 
}: TagBadgeProps) {
  return (
    <TagDisplay 
      tags={[tag]} 
      size={size} 
      removable={removable} 
      onRemove={onRemove ? () => onRemove() : undefined}
      className={className}
    />
  );
}