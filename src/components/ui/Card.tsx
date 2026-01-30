import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  title?: React.ReactNode;
  description?: string;
  footer?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  padding = 'md',
  title,
  description,
  footer,
}) => {
  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${className}`}>
      {(title || description) && (
        <div className={`border-b border-gray-200 ${paddings[padding]}`}>
          {title && (
            typeof title === 'string' ? (
              <h3 className="text-lg font-medium leading-6 text-gray-900">{title}</h3>
            ) : (
              title
            )
          )}
          {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
        </div>
      )}
      <div className={paddings[padding]}>{children}</div>
      {footer && (
        <div className={`bg-gray-50 border-t border-gray-200 ${paddings[padding]}`}>
          {footer}
        </div>
      )}
    </div>
  );
};
