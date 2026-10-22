import { ReactNode } from "react";
import AppSidebar from "./AppSidebar";
import { useIsMobile } from "@/hooks/use-mobile";

const AppLayout = ({ children }: { children: ReactNode }) => {
  const isMobile = useIsMobile();

  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <main className={`flex-1 ${isMobile ? "pt-14 p-4" : "ml-64 p-6"}`}>
        {children}
      </main>
    </div>
  );
};

export default AppLayout;
