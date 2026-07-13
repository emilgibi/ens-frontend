import { LoginForm } from '@/components/login/login-form';
import { SettingsProvider } from '@/contexts/settings-context';

export default function Login() {
    return (
        <>
            <style>{`
                @keyframes fadeUp {
                    from { opacity: 0; transform: translateY(24px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to   { opacity: 1; }
                }
                @keyframes slideRight {
                    from { transform: scaleX(0); opacity: 0; }
                    to   { transform: scaleX(1); opacity: 1; }
                }
                @keyframes pulse-dot {
                    0%, 100% { opacity: 0.4; transform: scale(1); }
                    50%       { opacity: 1;   transform: scale(1.15); }
                }
                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50%       { transform: translateY(-10px); }
                }
                @keyframes gridDraw {
                    from { opacity: 0; }
                    to   { opacity: 1; }
                }
                @keyframes countUp {
                    from { opacity: 0; transform: translateY(8px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes barGrow {
                    from { transform: scaleX(0); }
                    to   { transform: scaleX(1); }
                }
                @keyframes accentDrop {
                    from { height: 0; opacity: 0; }
                    to   { height: 100%; opacity: 1; }
                }

                .anim-fade-up-1 { animation: fadeUp 0.7s cubic-bezier(.22,1,.36,1) 0.1s both; }
                .anim-fade-up-2 { animation: fadeUp 0.7s cubic-bezier(.22,1,.36,1) 0.25s both; }
                .anim-fade-up-3 { animation: fadeUp 0.7s cubic-bezier(.22,1,.36,1) 0.4s both; }
                .anim-fade-up-4 { animation: fadeUp 0.7s cubic-bezier(.22,1,.36,1) 0.55s both; }
                .anim-fade-up-5 { animation: fadeUp 0.7s cubic-bezier(.22,1,.36,1) 0.7s both; }
                .anim-fade-in   { animation: fadeIn 1.2s ease 0.05s both; }
                .anim-accent    { animation: accentDrop 1.2s cubic-bezier(.22,1,.36,1) 0.2s both; }
                .anim-bar-1 { animation: barGrow 0.9s cubic-bezier(.22,1,.36,1) 0.8s both; transform-origin: left; }
                .anim-bar-2 { animation: barGrow 0.9s cubic-bezier(.22,1,.36,1) 0.95s both; transform-origin: left; }
                .anim-bar-3 { animation: barGrow 0.9s cubic-bezier(.22,1,.36,1) 1.1s both; transform-origin: left; }
                .anim-stat-1 { animation: countUp 0.6s cubic-bezier(.22,1,.36,1) 0.9s both; }
                .anim-stat-2 { animation: countUp 0.6s cubic-bezier(.22,1,.36,1) 1.0s both; }
                .anim-stat-3 { animation: countUp 0.6s cubic-bezier(.22,1,.36,1) 1.1s both; }
                .float-card  { animation: float 5s ease-in-out infinite; }

                .dot-1 { animation: pulse-dot 2.4s ease-in-out 0s infinite; }
                .dot-2 { animation: pulse-dot 2.4s ease-in-out 0.4s infinite; }
                .dot-3 { animation: pulse-dot 2.4s ease-in-out 0.8s infinite; }

                .form-panel-enter { animation: fadeUp 0.8s cubic-bezier(.22,1,.36,1) 0.15s both; }
            `}</style>

            <div style={{ minHeight: '100vh', display: 'flex', background: '#111' }}>

                {/* ── LEFT PANEL ── */}
                <div className="hidden lg:flex" style={{
                    width: '58%', position: 'relative', overflow: 'hidden',
                    flexDirection: 'column', justifyContent: 'flex-end', padding: '64px',
                    background: 'linear-gradient(145deg, #0d0d0d 0%, #161616 50%, #1a1a1a 100%)'
                }}>
                    {/* Animated grid */}
                    <div className="anim-fade-in" style={{
                        position: 'absolute', inset: 0, pointerEvents: 'none',
                        backgroundImage: `
                            repeating-linear-gradient(0deg, transparent, transparent 59px, rgba(255,255,255,0.028) 59px, rgba(255,255,255,0.028) 60px),
                            repeating-linear-gradient(90deg, transparent, transparent 59px, rgba(255,255,255,0.028) 59px, rgba(255,255,255,0.028) 60px)
                        `
                    }} />

                    {/* Yellow accent bar */}
                    <div className="anim-accent" style={{
                        position: 'absolute', top: 0, left: 0, width: '3px',
                        background: 'linear-gradient(to bottom, #FFE600 0%, rgba(255,230,0,0.3) 60%, transparent 100%)'
                    }} />

                    {/* Glow blobs */}
                    <div style={{
                        position: 'absolute', top: '-80px', right: '-80px',
                        width: '400px', height: '400px', borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(255,230,0,0.07) 0%, transparent 70%)',
                        pointerEvents: 'none'
                    }} />
                    <div style={{
                        position: 'absolute', bottom: '10%', left: '40%',
                        width: '300px', height: '300px', borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(255,230,0,0.04) 0%, transparent 70%)',
                        pointerEvents: 'none'
                    }} />

                    {/* Floating mini-card */}
                    <div className="float-card anim-fade-up-3" style={{
                        position: 'absolute', top: '15%', right: '10%',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '12px', padding: '16px 20px',
                        backdropFilter: 'blur(8px)', minWidth: '180px'
                    }}>
                        <div style={{ fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,230,0,0.7)', marginBottom: '10px' }}>Risk Summary</div>
                        {[
                            { label: 'High Risk', pct: '100%', color: '#ef4444' },
                            { label: 'Medium',    pct: '0%',   color: '#f59e0b' },
                            { label: 'Low Risk',  pct: '0%',   color: '#22c55e' },
                        ].map(({ label, pct, color }, i) => (
                            <div key={label} style={{ marginBottom: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>
                                    <span>{label}</span><span style={{ color }}>{pct}</span>
                                </div>
                                <div style={{ height: '3px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                                    <div className={`anim-bar-${i+1}`} style={{ height: '100%', width: pct, background: color, borderRadius: '2px' }} />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Live dots indicator */}
                    <div className="anim-fade-up-2" style={{
                        position: 'absolute', top: '12%', left: '64px',
                        display: 'flex', alignItems: 'center', gap: '8px'
                    }}>
                        {['dot-1','dot-2','dot-3'].map(cls => (
                            <div key={cls} className={cls} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#FFE600' }} />
                        ))}
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', marginLeft: '4px' }}>LIVE SCREENING</span>
                    </div>

                    {/* Main brand content */}
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <div className="anim-fade-up-1" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '44px' }}>
                            {/* Icon mark */}
                            <div style={{
                                width: '42px', height: '42px', borderRadius: '10px',
                                background: '#FFE600',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                            }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                                </svg>
                            </div>
                            {/* Wordmark */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                                <span style={{ fontSize: '22px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.5px', lineHeight: 1 }}>
                                    Risk<span style={{ color: '#FFE600' }}>Lens</span>
                                </span>
                                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 400 }}>
                                    Vendor Intelligence
                                </span>
                            </div>
                        </div>

                        <h1 className="anim-fade-up-2" style={{
                            fontSize: 'clamp(36px,3.5vw,52px)', fontWeight: 700, color: '#fff',
                            lineHeight: 1.15, marginBottom: '20px',
                            fontFamily: 'Georgia, "Times New Roman", serif'
                        }}>
                            Supplier risk,<br />
                            <span style={{ color: '#FFE600' }}>assessed</span><br />
                            with precision.
                        </h1>

                        <p className="anim-fade-up-3" style={{
                            fontSize: '14px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.75,
                            maxWidth: '400px', marginBottom: '52px', fontWeight: 300
                        }}>
                            Automated due diligence across legal, financial, cyber, and
                            adverse-media dimensions — so your team can act with confidence.
                        </p>

                    </div>
                </div>

                {/* ── RIGHT FORM PANEL ── */}
                <div style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '48px 40px', background: '#1a1a1a', position: 'relative'
                }}>
                    {/* Yellow top strip */}
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: '#FFE600' }} />

                    <div className="form-panel-enter" style={{ width: '100%', maxWidth: '380px' }}>
                        <SettingsProvider>
                            <LoginForm />
                        </SettingsProvider>
                    </div>
                </div>
            </div>
        </>
    );
}