export const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  disabled = false,
  loading = false,
  icon = null,
  ...props 
}) => {
  const baseClasses = 'flex items-center justify-center font-semibold rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed btn-hover';
  
  const variants = {
    primary: 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 focus:ring-indigo-500 shadow-lg hover:shadow-xl border border-indigo-500/20',
    secondary: 'bg-white/10 text-white hover:bg-white/20 focus:ring-white/50 backdrop-blur-sm border border-white/20',
    success: 'bg-gradient-to-r from-emerald-600 to-green-600 text-white hover:from-emerald-700 hover:to-green-700 focus:ring-emerald-500 shadow-lg hover:shadow-xl border border-emerald-500/20',
    danger: 'bg-gradient-to-r from-red-600 to-rose-600 text-white hover:from-red-700 hover:to-rose-700 focus:ring-red-500 shadow-lg hover:shadow-xl border border-red-500/20',
    outline: 'border-2 border-indigo-300 bg-transparent text-indigo-200 hover:bg-indigo-300/10 focus:ring-indigo-400',
    ghost: 'text-gray-300 hover:text-white hover:bg-white/5 focus:ring-gray-500'
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
    xl: 'px-8 py-4 text-lg'
  };
  
  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {icon && !loading && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  );
};

export const Card = ({ children, className = '', padding = true, shadow = true, hover = true }) => {
  const baseClasses = 'rounded-2xl border border-white/15 bg-white/7 backdrop-blur-xl';
  const paddingClass = padding ? 'p-6 sm:p-8' : '';
  const shadowClass = shadow ? 'shadow-[0_8px_30px_rgba(2,8,23,0.35)] hover:shadow-[0_12px_40px_rgba(80,56,237,0.35)] transition-all' : '';
  const hoverClass = hover ? 'hover:border-white/20 hover:bg-white/8' : '';
  
  return (
    <div className={`${baseClasses} ${paddingClass} ${shadowClass} ${hoverClass} ${className}`}>
      {children}
    </div>
  );
};

export const Input = ({ 
  label, 
  error, 
  helperText, 
  className = '', 
  icon = null,
  style = {},
  ...props 
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-sm font-semibold text-gray-200">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <span className="text-gray-400">{icon}</span>
          </div>
        )}
        <input
          className={`block w-full rounded-xl bg-slate-900/60 border border-white/10 text-slate-100 placeholder-slate-400 
  focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/60 transition-all duration-300 
  ${icon ? 'pl-12' : 'px-4'} py-3 ${error ? 'border-red-400 focus:ring-red-500/60 focus:border-red-500/60' : ''}`}
          style={style}
          {...props}
        />
      </div>
      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
      {helperText && !error && (
        <p className="text-sm text-gray-400">{helperText}</p>
      )}
    </div>
  );
};

export const Textarea = ({ 
  label, 
  error, 
  helperText, 
  className = '', 
  ...props 
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-sm font-semibold text-gray-200">
          {label}
        </label>
      )}
      <textarea
        className={`block w-full rounded-xl bg-slate-900/60 border border-white/10 text-slate-100 placeholder-slate-400 
  focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/60 transition-all duration-300 px-4 py-3
  ${error ? 'border-red-400 focus:ring-red-500/60 focus:border-red-500/60' : ''}`}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
      {helperText && !error && (
        <p className="text-sm text-gray-400">{helperText}</p>
      )}
    </div>
  );
};

export const Select = ({ 
  label, 
  error, 
  helperText, 
  className = '', 
  children,
  ...props 
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-sm font-semibold text-gray-200">
          {label}
        </label>
      )}
      <select
        className={`block w-full rounded-xl bg-slate-900/60 border border-white/10 text-slate-100 
  focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/60 transition-all duration-300 px-4 py-3
  ${error ? 'border-red-400 focus:ring-red-500/60 focus:border-red-500/60' : ''}`}
        {...props}
      >
        {children}
      </select>
      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
      {helperText && !error && (
        <p className="text-sm text-gray-400">{helperText}</p>
      )}
    </div>
  );
};

export const Badge = ({ children, variant = 'default', size = 'md' }) => {
  const variants = {
    default: 'bg-white/12 text-white border border-white/25',
    primary: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30',
    success: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    warning: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
    danger: 'bg-red-500/20 text-red-300 border border-red-500/30',
    info: 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
  };
  
  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base'
  };
  
  return (
    <span className={`inline-flex items-center rounded-full font-semibold backdrop-blur-sm ${variants[variant]} ${sizes[size]}`}>
      {children}
    </span>
  );
};

import { useEffect } from "react";

export const Modal = ({ isOpen, onClose, title, children, footer, size = 'md' }) => {
  if (!isOpen) return null;

  // keep your size map
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-7xl'
  };

  // ESC to close + scroll lock
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return !isOpen ? null : (
    <div className="fixed inset-0 z-50">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className={`relative w-full ${sizes[size]} modal-glass max-h-[85vh] flex flex-col`} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
          {title && (
            <div className="flex items-center justify-between p-6 border-b border-white/10 flex-shrink-0">
              <h3 className="text-xl font-semibold text-slate-100">{title}</h3>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/5 transition"
                aria-label="Close"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-6 space-y-5 min-h-0">{children}</div>

          {footer && (
            <div className="border-t border-white/10 p-6 flex-shrink-0">
              <div className="flex flex-col sm:flex-row justify-end gap-2">{footer}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


// Mobile-optimized components
export const MobileCard = ({ children, className = '', onClick, title, subtitle, actions }) => {
  return (
    <Card 
      className={`${onClick ? 'cursor-pointer active:scale-95' : ''} ${className}`}
      onClick={onClick}
    >
      {title && (
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
            {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
          </div>
          {actions && (
            <div className="flex items-center space-x-2">
              {actions}
            </div>
          )}
        </div>
      )}
      {children}
    </Card>
  );
};

export const MobileGrid = ({ children, cols = 1, className = '' }) => {
  const colClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'
  };
  
  return (
    <div className={`grid ${colClasses[cols]} gap-4 ${className}`}>
      {children}
    </div>
  );
};

export const MobileActionButton = ({ children, icon, onClick, variant = 'primary' }) => {
  return (
    <Button
      onClick={onClick}
      variant={variant}
      size="sm"
      className="w-full flex items-center justify-center space-x-2 text-xs py-2"
    >
      {icon && <span className="text-base">{icon}</span>}
      <span>{children}</span>
    </Button>
  );
};

export const ResponsiveContainer = ({ children, maxWidth = '7xl', className = '' }) => {
  const widthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl'
  };
  
  return (
    <div className={`w-full ${widthClasses[maxWidth]} mx-auto px-4 sm:px-6 lg:px-8 ${className}`}>
      {children}
    </div>
  );
};

export const MobileDrawer = ({ isOpen, onClose, title, children, position = 'bottom' }) => {
  if (!isOpen) return null;
  
  const positions = {
    bottom: 'bottom-0 left-0 right-0 rounded-t-2xl',
    top: 'top-0 left-0 right-0 rounded-b-2xl',
    left: 'left-0 top-0 bottom-0 w-80 rounded-r-2xl',
    right: 'right-0 top-0 bottom-0 w-80 rounded-l-2xl'
  };
  
  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div 
        className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
        onClick={onClose}
      ></div>
      
      <div className={`fixed ${positions[position]} bg-white shadow-xl transform transition-transform duration-300 ease-in-out`}>
        {title && (
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        
        <div className="p-4 overflow-y-auto max-h-96">
          {children}
        </div>
      </div>
    </div>
  );
};
