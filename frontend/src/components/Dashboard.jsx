import React, { useState, useEffect, useContext } from "react";
import ChatPanel from "./ChatPanel";
import MacroWidget from "./MacroWidget";
import FoodHistoryList from "./FoodHistoryList";
import MealUploaderModal from "./MealUploaderModal";
import OnboardingModal from "./OnboardingModal";
import api from "../api";
import { AuthContext } from "../context/AuthContext";

export default function Dashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [macroRefreshTrigger, setMacroRefreshTrigger] = useState(0);
  const [isMobileLedgerOpen, setIsMobileLedgerOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const { logout } = useContext(AuthContext);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  useEffect(() => {
    const checkProfile = async () => {
      try {
        const response = await api.get("/users/profile/");
        const data = response.data;
        setUserProfile(data);

        const now = new Date();
        const lastCheckin = data.last_checkin
          ? new Date(data.last_checkin)
          : null;

        const daysSinceCheckin = lastCheckin
          ? (now - lastCheckin) / (1000 * 60 * 60 * 24)
          : Infinity;

        if (
          !data.age ||
          !data.gender ||
          !data.height_cm ||
          !data.weight_kg ||
          daysSinceCheckin >= 7
        ) {
          setShowOnboarding(true);
        }
      } catch (error) {
        console.error("Failed to fetch user profile", error);
      }
    };
    checkProfile();
  }, []);

  const handleLogSuccess = () => setMacroRefreshTrigger((prev) => prev + 1);

  // Unified Ledger Content with strict Flex/Scroll boundaries
  const ledgerContent = (
    <div className="p-4 md:p-6 flex flex-col h-full overflow-hidden">
      {/* Header & Log Button Area */}
      <div className="flex justify-between items-center mb-6 shrink-0">
        <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">
          Ledger
        </h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg shadow-sm transition-transform active:scale-95 flex items-center"
        >
          <svg
            className="w-4 h-4 mr-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
              d="M12 4v16m8-8H4"
            />
          </svg>
          Log Meal
        </button>
      </div>

      <div className="shrink-0">
        <MacroWidget refreshTrigger={macroRefreshTrigger} />
      </div>

      <hr className="my-5 border-slate-100 shrink-0" />

      {/* Accordion List locked in a scrollable wrapper */}
      <div className="flex-1 overflow-y-auto min-h-0 pr-1">
        <h3 className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
          Recent Logs
        </h3>
        <FoodHistoryList refreshTrigger={macroRefreshTrigger} />
      </div>
    </div>
  );

  return (
    <div className="h-screen bg-slate-100 flex flex-col md:p-6 overflow-hidden font-sans">
      {/* --- MODAL COMPONENT --- */}
      <OnboardingModal
        isOpen={showOnboarding}
        initialData={userProfile}
        onComplete={() => setShowOnboarding(false)}
      />

      {/* Navbar with Modern Gradient Logo */}
      {/* Navbar with Modern Gradient Logo */}
      <div className="flex justify-between items-center px-5 py-4 bg-white shadow-sm z-40 shrink-0 md:rounded-2xl md:mb-6 max-w-7xl mx-auto w-full border border-slate-100">
        <h1 className="text-2xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 to-teal-700">
          HealthSync
        </h1>
        
        {/* Profile Dropdown Container */}
        <div className="relative z-50">
          <button 
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className="w-9 h-9 rounded-full bg-slate-100 border-2 border-emerald-50 shadow-sm hover:ring-2 hover:ring-emerald-500 transition-all focus:outline-none flex items-center justify-center overflow-hidden"
          >
            {/* Show the first letter of their username, or a default 'U' */}
            <span className="text-emerald-700 font-black text-sm uppercase">
              {userProfile?.username ? userProfile.username.charAt(0) : 'U'}
            </span>
          </button>

          {/* The Dropdown Menu */}
          {isProfileMenuOpen && (
            <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden transform origin-top-right transition-all">
              
              {/* User Info Section */}
              <div className="p-4 bg-slate-50 border-b border-slate-100">
                <p className="text-sm font-bold text-slate-800 truncate">
                  {/* Assumes your Django backend sends 'username' and 'email' in the profile response */}
                  {userProfile?.username || 'HealthSync User'}
                </p>
                <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                  {userProfile?.email || 'Logged In'}
                </p>
              </div>

              {/* Logout Button */}
              <div className="p-2">
                <button
                  onClick={logout}
                  className="w-full text-left px-4 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="relative flex-1 flex flex-col min-h-0 max-w-7xl mx-auto w-full md:grid md:grid-cols-3 md:gap-6 bg-white md:bg-transparent">
        {/* MOBILE FLOATING LEDGER */}
        <div
          className={`md:hidden absolute inset-x-0 top-0 z-30 bg-white/95 backdrop-blur-xl shadow-2xl border-b border-slate-200 transition-transform duration-300 ease-out flex flex-col max-h-[70vh] rounded-b-3xl ${isMobileLedgerOpen ? "translate-y-0" : "-translate-y-full"}`}
        >
          {ledgerContent}
          <div className="flex justify-center pb-3 pt-2 shrink-0">
            <button
              onClick={() => setIsMobileLedgerOpen(false)}
              className="p-2 bg-slate-100 rounded-full text-slate-500 active:scale-90 transition-transform"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M5 11l7-7 7 7M5 19l7-7 7 7"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* DESKTOP SIDEBAR */}
        <div className="hidden md:flex flex-col col-span-1 order-2 h-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {ledgerContent}
        </div>

        {/* CHAT PANEL */}
        <div className="flex flex-col flex-1 h-full w-full min-h-0 md:col-span-2 md:order-1 md:bg-white md:rounded-2xl md:shadow-sm md:border border-slate-200 relative z-20 overflow-hidden">
          <div className="md:hidden absolute top-3 inset-x-0 z-20 flex justify-center pointer-events-none">
            <button
              onClick={() => setIsMobileLedgerOpen(true)}
              className={`pointer-events-auto bg-white/90 backdrop-blur shadow-md border border-slate-100 rounded-full p-2 text-emerald-600 transition-opacity ${isMobileLedgerOpen ? "opacity-0 pointer-events-none" : "opacity-100"}`}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M19 13l-7 7-7-7m14-8l-7 7-7-7"
                />
              </svg>
            </button>
          </div>
          <ChatPanel
            onInputFocus={() => setIsMobileLedgerOpen(false)}
            refreshTrigger={macroRefreshTrigger}
          />
        </div>
      </div>

      <MealUploaderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onLogSuccess={handleLogSuccess}
      />
    </div>
  );
}
