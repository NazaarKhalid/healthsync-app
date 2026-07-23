import React, { useState, useEffect, useRef, useContext } from "react";
import ChatPanel from "./ChatPanel";
import MacroWidget from "./MacroWidget";
import FoodHistoryList from "./FoodHistoryList";
import OnboardingModal from "./OnboardingModal";
import EditProfileModal from "./EditProfileModal";
import api from "../api";
import { AuthContext } from "../context/AuthContext";

function AmbientParticleBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const particleCount = 45;
    const particles = [];

    const colors = [
      'rgba(245, 158, 11, ',   // Amber
      'rgba(251, 191, 36, ',   // Yellow/Gold
      'rgba(253, 230, 138, ',  // Soft Gold
      'rgba(16, 185, 129, ',   // Emerald hint
    ];

    class Particle {
      constructor() {
        this.reset(true);
      }

      reset(init = false) {
        this.x = Math.random() * canvas.width;
        this.y = init ? Math.random() * canvas.height : canvas.height + Math.random() * 20;
        this.radius = Math.random() * 3.5 + 0.5; 
        this.colorBase = colors[Math.floor(Math.random() * colors.length)];
        
        this.vx = Math.random() * 0.2 - 0.1; 
        this.vy = -(Math.random() * 0.3 + 0.1); 
        
        this.angle = Math.random() * Math.PI * 2;
        this.angleSpeed = Math.random() * 0.005 + 0.001;
        this.driftStrength = Math.random() * 0.2 + 0.05;

        this.alpha = 0;
        this.maxAlpha = Math.random() * 0.4 + 0.1; 
        this.fadeSpeed = Math.random() * 0.003 + 0.001;
        this.isFadingIn = true;
      }

      update() {
        this.y += this.vy;
        this.angle += this.angleSpeed;
        this.x += this.vx + Math.sin(this.angle) * this.driftStrength;

        if (this.isFadingIn) {
          this.alpha += this.fadeSpeed;
          if (this.alpha >= this.maxAlpha) {
            this.isFadingIn = false;
          }
        } else {
          if (this.y < -10 || this.x < -10 || this.x > canvas.width + 10) {
            this.alpha -= this.fadeSpeed;
            if (this.alpha <= 0) {
              this.reset();
            }
          }
        }
      }

      draw() {
        ctx.beginPath();
        const gradient = ctx.createRadialGradient(
          this.x, this.y, 0,
          this.x, this.y, this.radius * 2.5
        );
        gradient.addColorStop(0, `${this.colorBase}${this.alpha})`);
        gradient.addColorStop(0.4, `${this.colorBase}${this.alpha * 0.4})`);
        gradient.addColorStop(1, `${this.colorBase}0)`);

        ctx.fillStyle = gradient;
        ctx.arc(this.x, this.y, this.radius * 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    const render = () => {
      ctx.fillStyle = 'rgba(10, 13, 16, 0.25)'; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.update();
        p.draw();
      });

      animationFrameId = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block z-0" />;
}

export default function Dashboard() {
  const [macroRefreshTrigger, setMacroRefreshTrigger] = useState(0);
  const [isMobileLedgerOpen, setIsMobileLedgerOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false); // <-- NEW STATE
  const [userProfile, setUserProfile] = useState(null);
  const { logout } = useContext(AuthContext);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const fetchProfile = async () => {
    try {
      const response = await api.get("/users/profile/");
      const data = response.data;
      setUserProfile(data);

      const now = new Date();
      const lastCheckin = data.last_checkin ? new Date(data.last_checkin) : null;
      const daysSinceCheckin = lastCheckin ? (now - lastCheckin) / (1000 * 60 * 60 * 24) : Infinity;

      if (!data.age || !data.gender || !data.height_cm || !data.weight_kg || !data.activity_level || !data.primary_goal || daysSinceCheckin >= 7) {
        setShowOnboarding(true);
      }
    } catch (error) {
      console.error("Failed to fetch user profile", error);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleLogSuccess = () => setMacroRefreshTrigger((prev) => prev + 1);

  const handleEditProfileSuccess = async () => {
    setShowEditProfile(false);
    await fetchProfile();
    setMacroRefreshTrigger((prev) => prev + 1);
  };

  const ledgerContent = (
    <div className="p-4 md:p-6 flex flex-col h-full overflow-hidden relative z-10">
      <div className="shrink-0">
        <MacroWidget refreshTrigger={macroRefreshTrigger} userProfile={userProfile} />
      </div>

      <hr className="my-5 border-white/[0.08] shrink-0" />

      <div className="flex-1 overflow-y-auto min-h-0 pr-1 custom-scrollbar">
        <h3 className="text-[10px] md:text-xs font-bold text-slate-400/80 uppercase tracking-wider mb-3">
          Recent Logs
        </h3>
        <FoodHistoryList 
          refreshTrigger={macroRefreshTrigger} 
          onDeleteSuccess={handleLogSuccess} 
        />
      </div>
    </div>
  );

  return (
    <div className="relative h-screen bg-[#0a0d10] flex flex-col md:p-6 overflow-hidden font-sans">
      
      <AmbientParticleBackground />

      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-amber-500/5 to-transparent blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-teal-500/5 to-transparent blur-[120px] pointer-events-none z-0" />

      <OnboardingModal
        isOpen={showOnboarding}
        initialData={userProfile}
        onComplete={() => {
          setShowOnboarding(false);
          fetchProfile();
          setMacroRefreshTrigger(prev => prev + 1);
        }}
      />

      <EditProfileModal
        isOpen={showEditProfile}
        onClose={() => setShowEditProfile(false)}
        onSuccess={handleEditProfileSuccess}
        userProfile={userProfile}
      />

      <div className="relative z-40 flex justify-between items-center px-5 py-4 bg-white/[0.03] backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] shrink-0 md:rounded-2xl md:mb-6 max-w-7xl mx-auto w-full border border-white/[0.08]">
        <h1 className="text-2xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-emerald-400 to-emerald-500">
          HealthSync
        </h1>
        
        <div className="relative">
          <button 
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className="w-9 h-9 rounded-full bg-white/[0.05] border border-white/[0.1] shadow-sm hover:ring-2 hover:ring-amber-500/50 transition-all focus:outline-none flex items-center justify-center overflow-hidden"
          >
            <span className="text-amber-400 font-black text-sm uppercase">
              {userProfile?.username ? userProfile.username.charAt(0) : 'U'}
            </span>
          </button>

          {isProfileMenuOpen && (
            <div className="absolute right-0 mt-3 w-56 bg-[#13171c]/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/[0.08] overflow-hidden transform origin-top-right transition-all">
              <div className="p-4 bg-white/[0.02] border-b border-white/[0.05]">
                <p className="text-sm font-bold text-slate-200 truncate">
                  {userProfile?.username || 'HealthSync User'}
                </p>
                <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                  {userProfile?.email || 'Logged In'}
                </p>
              </div>
              
              <div className="p-2 space-y-1">
                <button
                  onClick={() => {
                    setShowEditProfile(true);
                    setIsProfileMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-300 hover:text-white hover:bg-white/[0.05] rounded-xl transition-colors flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Edit Profile
                </button>

                <button
                  onClick={logout}
                  className="w-full text-left px-4 py-2.5 text-sm font-bold text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors flex items-center"
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

      <div className="relative z-20 flex-1 flex flex-col min-h-0 max-w-7xl mx-auto w-full md:grid md:grid-cols-3 md:gap-6 bg-transparent">
        
        <div
          className={`md:hidden absolute inset-x-0 top-0 z-30 bg-[#0a0d10]/95 backdrop-blur-2xl shadow-[0_25px_50px_rgba(0,0,0,0.8)] border-b border-white/[0.08] transition-transform duration-300 ease-out flex flex-col max-h-[70vh] rounded-b-3xl ${isMobileLedgerOpen ? "translate-y-0" : "-translate-y-full"}`}
        >
          {ledgerContent}
          <div className="flex justify-center pb-3 pt-2 shrink-0">
            <button
              onClick={() => setIsMobileLedgerOpen(false)}
              className="p-2 bg-white/[0.05] border border-white/[0.1] rounded-full text-slate-300 active:scale-90 transition-transform"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 11l7-7 7 7M5 19l7-7 7 7" />
              </svg>
            </button>
          </div>
        </div>

        <div className="hidden md:flex flex-col col-span-1 order-2 h-full bg-white/[0.03] backdrop-blur-xl rounded-2xl shadow-lg shadow-black/50 border border-white/[0.08] overflow-hidden">
          {ledgerContent}
        </div>

        <div className="flex flex-col flex-1 h-full w-full min-h-0 md:col-span-2 md:order-1 bg-transparent md:bg-white/[0.03] md:backdrop-blur-xl md:rounded-2xl md:shadow-lg shadow-black/50 md:border border-white/[0.08] relative z-20 overflow-hidden">
          
          <div className="md:hidden absolute top-3 inset-x-0 z-20 flex justify-center pointer-events-none">
            <button
              onClick={() => setIsMobileLedgerOpen(true)}
              className={`pointer-events-auto bg-[#13171c]/80 backdrop-blur-md shadow-lg border border-white/[0.1] rounded-full p-2 text-amber-400 transition-opacity ${isMobileLedgerOpen ? "opacity-0 pointer-events-none" : "opacity-100"}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 13l-7 7-7-7m14-8l-7 7-7-7" />
              </svg>
            </button>
          </div>
          
          <ChatPanel
            onInputFocus={() => setIsMobileLedgerOpen(false)}
            refreshTrigger={macroRefreshTrigger}
            onLogSuccess={handleLogSuccess}
          />
        </div>
      </div>
    </div>
  );
}