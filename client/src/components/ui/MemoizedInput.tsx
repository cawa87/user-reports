import React, { memo, forwardRef } from 'react';

interface MemoizedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

const MemoizedInput = memo(forwardRef<HTMLInputElement, MemoizedInputProps>(
  ({ className = 'form-input', ...props }, ref) => {
    return (
      <input
        ref={ref}
        {...props}
        className={className}
      />
    );
  }
));

MemoizedInput.displayName = 'MemoizedInput';

export default MemoizedInput;
