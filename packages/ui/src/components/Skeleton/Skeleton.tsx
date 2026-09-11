// Styles are imported separately via @umbeli-com/ui/styles

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className = '', ...props }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`}
      {...props}
    />
  );
}

export default Skeleton;
