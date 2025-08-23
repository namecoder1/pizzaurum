import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import Loader from "@/components/ui/Loader";

interface LoaderContextType {
  showLoader: (text?: string) => void;
  hideLoader: () => void;
  isLoading: boolean;
  loaderText: string;
}

const LoaderContext = createContext<LoaderContextType | undefined>(undefined);

export const LoaderProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loaderText, setLoaderText] = useState("Caricamento...");

  const showLoader = useCallback((text: string = "Caricamento...") => {
    setLoaderText(text);
    setIsLoading(true);
  }, []);

  const hideLoader = useCallback(() => {
    setIsLoading(false);
  }, []);

  return (
    <LoaderContext.Provider value={{ showLoader, hideLoader, isLoading, loaderText }}>
      {children}
      {isLoading && <Loader size="fullscreen" text={loaderText} />}
    </LoaderContext.Provider>
  );
};

export const useLoader = () => {
  const context = useContext(LoaderContext);
  if (context === undefined) {
    throw new Error("useLoader must be used within a LoaderProvider");
  }
  return context;
};
