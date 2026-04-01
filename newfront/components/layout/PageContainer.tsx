import { ReactNode } from "react";
import { PageBackground } from "../background/PageBackground";
import { ContextualHelp } from "../onboarding/ContextualHelp";

interface PageContainerProps {
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  showHelp?: boolean;
}

export function PageContainer({ children, size = "lg", showHelp = true }: PageContainerProps) {
  const maxWidthClasses = {
    sm: "max-w-4xl",       // Wide for small content
    md: "max-w-6xl",       // Wide for medium content  
    lg: "max-w-[1600px]",  // VERY wide for legal/company pages
    xl: "max-w-[1800px]",  // EXTRA wide for large layouts
    full: "max-w-full",
  };

  return (
    <>
      <PageBackground />
      <div className="relative w-full">
        <div className={`mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-8 md:py-12 ${maxWidthClasses[size]}`}>
          {showHelp && <ContextualHelp />}
          {children}
        </div>
      </div>
    </>
  );
}