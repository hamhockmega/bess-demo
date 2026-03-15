import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import SpotMarketBoard from "./pages/SpotMarketBoard";
import MediumAndLongTermTradingInfo from "./pages/MediumAndLongTermTradingInfo";
import CustomBoard from "./pages/CustomBoard";
import ShortTermPriceForecast from "./pages/ShortTermPriceForecast";
import IntelligentQuoteStrategy from "./pages/IntelligentQuoteStrategy";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/spotMarketBoard" replace />} />
          <Route path="/tradingBoard" element={<Navigate to="/spotMarketBoard" replace />} />
          <Route path="/customBoard" element={<CustomBoard />} />
          <Route path="/dataComparison" element={<Navigate to="/spotMarketBoard" replace />} />
          <Route path="/shortTermPriceForecast" element={<ShortTermPriceForecast />} />
          <Route path="/priceReview" element={<Navigate to="/spotMarketBoard" replace />} />
          <Route path="/priceBenchmark" element={<Navigate to="/spotMarketBoard" replace />} />
          <Route path="/spotMarketBoard" element={<SpotMarketBoard />} />
          <Route path="/mediumAndLongTermTradingInfo" element={<MediumAndLongTermTradingInfo />} />
          {/* 现货交易 */}
          <Route path="/spotTrading/intelligentQuoteStrategy" element={<IntelligentQuoteStrategy />} />
          <Route path="/spotTrading/intelligentSelfDispatch" element={<Navigate to="/spotTrading/intelligentQuoteStrategy" replace />} />
          <Route path="/spotTrading/simulationSelfDispatch" element={<Navigate to="/spotTrading/intelligentQuoteStrategy" replace />} />
          <Route path="/spotTrading/simulationQuoteStrategy" element={<Navigate to="/spotTrading/intelligentQuoteStrategy" replace />} />
          <Route path="/spotTrading/reviewSelfDispatch" element={<Navigate to="/spotTrading/intelligentQuoteStrategy" replace />} />
          <Route path="/spotTrading/reviewQuoteStrategy" element={<Navigate to="/spotTrading/intelligentQuoteStrategy" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
