import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Login from "./pages/Login";
import SpotMarketBoard from "./pages/SpotMarketBoard";
import MediumAndLongTermTradingInfo from "./pages/MediumAndLongTermTradingInfo";
import CustomBoard from "./pages/CustomBoard";
import ShortTermPriceForecast from "./pages/ShortTermPriceForecast";
import IntelligentQuoteStrategy from "./pages/IntelligentQuoteStrategy";
import ReviewQuoteStrategy from "./pages/ReviewQuoteStrategy";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const P: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute>{children}</ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/spotMarketBoard" replace />} />
            <Route path="/tradingBoard" element={<Navigate to="/spotMarketBoard" replace />} />
            <Route path="/customBoard" element={<P><CustomBoard /></P>} />
            <Route path="/dataComparison" element={<Navigate to="/spotMarketBoard" replace />} />
            <Route path="/shortTermPriceForecast" element={<P><ShortTermPriceForecast /></P>} />
            <Route path="/priceReview" element={<Navigate to="/spotMarketBoard" replace />} />
            <Route path="/priceBenchmark" element={<Navigate to="/spotMarketBoard" replace />} />
            <Route path="/spotMarketBoard" element={<P><SpotMarketBoard /></P>} />
            <Route path="/mediumAndLongTermTradingInfo" element={<P><MediumAndLongTermTradingInfo /></P>} />
            <Route path="/spotTrading/intelligentQuoteStrategy" element={<P><IntelligentQuoteStrategy /></P>} />
            <Route path="/spotTrading/reviewQuoteStrategy" element={<P><ReviewQuoteStrategy /></P>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
