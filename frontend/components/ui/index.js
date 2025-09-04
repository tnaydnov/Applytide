// Card Component
export function Card({ children, className = '', ...props }) {
  return (
    <div 
      className={`glass-card rounded-xl border border-white/10 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

// Button Component
export function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  disabled = false,
  className = '',
  ...props 
}) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 cursor-pointer';
  
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
    outline: 'border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 focus:ring-blue-500',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500',
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };
  
  const disabledStyles = disabled ? 'opacity-50 cursor-not-allowed' : '';
  
  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${disabledStyles} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

// Input Component
export function Input({ className = '', ...props }) {
  return (
    <input
      className={`block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${className}`}
      {...props}
    />
  );
}

// Select Component
export function Select({ children, className = '', ...props }) {
  return (
    <select
      className={`block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

// Textarea Component
export function Textarea({ className = '', ...props }) {
  return (
    <textarea
      className={`block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${className}`}
      {...props}
    />
  );
}

// Modal Component - Fully Inline Version
export function Modal({ open, onClose, children }) {
  if (!open) return null;
  
  return (
    <>
      {/* Backdrop overlay */}
      <div 
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          zIndex: 10000,
          cursor: 'pointer'
        }}
      />
      
      {/* Modal content */}
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        zIndex: 10001,
        maxWidth: '90vw',
        maxHeight: '90vh',
        overflow: 'auto',
        border: '1px solid #e5e7eb'
      }}>
        {children}
      </div>
    </>
  );
}

// File Upload Component
export function FileUpload({ 
  accept, 
  multiple = false, 
  onFileSelect, 
  className = '',
  ...props 
}) {
  const handleChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelect(multiple ? Array.from(files) : files[0]);
    }
  };
  
  return (
    <Input
      type="file"
      accept={accept}
      multiple={multiple}
      onChange={handleChange}
      className={className}
      {...props}
    />
  );
}
