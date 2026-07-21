import React, { useState, useEffect, useRef, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

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

    const particleCount = 65;
    const particles = [];

    const colors = [
      'rgba(245, 158, 11, ',   // Amber
      'rgba(251, 191, 36, ',   // Yellow/Gold
      'rgba(253, 230, 138, ',  // Soft Gold
      'rgba(217, 119, 6, ',    // Darker Amber
    ];

    class Particle {
      constructor() {
        this.reset(true);
      }

      reset(init = false) {
        this.x = Math.random() * canvas.width;
        this.y = init ? Math.random() * canvas.height : canvas.height + Math.random() * 20;
        this.radius = Math.random() * 4.5 + 0.5; 
        this.colorBase = colors[Math.floor(Math.random() * colors.length)];
        
        this.vx = Math.random() * 0.4 - 0.2; 
        this.vy = -(Math.random() * 0.5 + 0.2); 
        
        this.angle = Math.random() * Math.PI * 2;
        this.angleSpeed = Math.random() * 0.01 + 0.002;
        this.driftStrength = Math.random() * 0.3 + 0.1;

        this.alpha = 0;
        this.maxAlpha = Math.random() * 0.6 + 0.15; 
        this.fadeSpeed = Math.random() * 0.005 + 0.002;
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
      ctx.fillStyle = 'rgba(10, 13, 16, 0.2)'; 
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

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />;
}

export default function AuthPage() {
  const { login, register } = useContext(AuthContext);
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(formData.username, formData.password);
      } else {
        await register(formData.username, formData.email, formData.password);
      }
    } catch (err) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-[#0a0d10] font-sans">
      <AmbientParticleBackground />

      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-amber-500/5 to-transparent blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-teal-500/5 to-transparent blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-[28px] p-8 md:p-10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]">
          
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-emerald-400 to-emerald-500">
              HealthSync
            </h1>
            <p className="text-slate-400 text-sm font-medium mt-2">
              {isLogin ? 'Step into absolute health control.' : 'Start your health journey today.'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/25 rounded-2xl text-rose-300 text-xs font-semibold text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Username
              </label>
              <input
                type="text"
                name="username"
                required
                value={formData.username}
                onChange={handleChange}
                placeholder="Enter your username"
                className="w-full px-5 py-3.5 bg-white/[0.04] border border-white/[0.08] focus:border-amber-500/50 rounded-2xl text-white outline-none text-sm transition-all focus:ring-4 focus:ring-amber-500/10 placeholder-slate-600 font-medium"
              />
            </div>

            {!isLogin && (
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@example.com"
                  className="w-full px-5 py-3.5 bg-white/[0.04] border border-white/[0.08] focus:border-amber-500/50 rounded-2xl text-white outline-none text-sm transition-all focus:ring-4 focus:ring-amber-500/10 placeholder-slate-600 font-medium"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Password
              </label>
              <input
                type="password"
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full px-5 py-3.5 bg-white/[0.04] border border-white/[0.08] focus:border-amber-500/50 rounded-2xl text-white outline-none text-sm transition-all focus:ring-4 focus:ring-amber-500/10 placeholder-slate-600 font-medium"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-amber-500 via-amber-600 to-emerald-600 hover:brightness-110 active:scale-[0.98] text-white rounded-2xl font-bold text-sm tracking-wide transition-all shadow-lg shadow-amber-500/10 flex items-center justify-center mt-8 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                isLogin ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="text-xs font-medium text-slate-500 hover:text-amber-400 transition-colors"
            >
              {isLogin ? (
                <>Don't have an account? <span className="font-bold underline decoration-amber-400/30">Create One</span></>
              ) : (
                <>Already have an account? <span className="font-bold underline decoration-amber-400/30">Sign in</span></>
              )}
            </button>
          </div>
          
        </div>
      </div>
    </div>
  );
}