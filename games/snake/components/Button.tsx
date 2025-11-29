import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'icon';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  className = '', 
  ...props 
}) => {
  const baseStyles = "relative overflow-hidden transition-all duration-200 active:scale-95 font-semibold tracking-wide disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-[#2ECC71] text-[#0E1B3E] hover:bg-[#27AE60] shadow-[0_0_15px_rgba(46,204,113,0.3)] rounded-lg py-3 px-6 text-lg uppercase",
    secondary: "bg-white/10 text-white hover:bg-white/20 border border-white/10 backdrop-blur-sm rounded-lg py-3 px-6 text-lg",
    icon: "p-3 rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors",
  };

  return (
    <button 
      className={`
        ${baseStyles} 
        ${variants[variant]} 
        ${fullWidth ? 'w-full' : ''} 
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
};