import React from 'react';
import { cn } from '~/lib/utils';

const Skeleton = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn(
        'rounded-md bg-gray-200 animate-pulse',
        className
      )}
      {...props}
    />
  );
};

export { Skeleton };
