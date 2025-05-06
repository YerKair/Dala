import React, { createContext, useState, useContext } from "react";

interface TaxiContextType {
  activeTaxiOrder: boolean;
  setActiveTaxiOrder: (value: boolean) => void;
}

const TaxiContext = createContext<TaxiContextType | undefined>(undefined);

export const TaxiProvider = ({ children }: { children: React.ReactNode }) => {
  const [activeTaxiOrder, setActiveTaxiOrder] = useState(false);

  return (
    <TaxiContext.Provider value={{ activeTaxiOrder, setActiveTaxiOrder }}>
      {children}
    </TaxiContext.Provider>
  );
};

export const useTaxi = () => {
  const context = useContext(TaxiContext);
  if (context === undefined) {
    throw new Error("useTaxi must be used within a TaxiProvider");
  }
  return context;
};
