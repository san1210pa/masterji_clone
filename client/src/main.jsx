import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Atom, BookOpen, Bookmark, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Clock3, Command, Compass, Flame, FlaskConical, GraduationCap, LayoutDashboard, Leaf, LogOut, Menu, Moon, MoreHorizontal, Plus, Search, Settings2, ShieldCheck, ShoppingBag, Sparkles, Sun, Target, Trophy, Users, X, Zap, Youtube } from 'lucide-react';
import * as THREE from 'three';
import './styles.css';

const exams = ['JEE', 'NEET', 'UPSC', 'SSC'];
const seed = {
  JEE: { full: 'Joint Entrance Examination', target: 'JEE Main 2027', rank: 'Top 8%', progress: 68, subjects: [{ name: 'Physics', done: 18, total: 24, color: 'blue', icon: Atom }, { name: 'Chemistry', done: 14, total: 20, color: 'orange', icon: FlaskConical }, { name: 'Mathematics', done: 16, total: 26, color: 'purple', icon: Activity }], tasks: [{ time: '09:00', title: 'Electrostatics · Practice set', tag: 'Physics', done: true }, { time: '11:30', title: 'Chemical bonding · Revision', tag: 'Chemistry', done: false }, { time: '16:00', title: 'Limits & continuity · 25 Qs', tag: 'Mathematics', done: false }] },
  NEET: { full: 'National Eligibility cum Entrance Test', target: 'NEET UG 2027', rank: 'Top 12%', progress: 61, subjects: [{ name: 'Physics', done: 15, total: 24, color: 'blue', icon: Atom }, { name: 'Chemistry', done: 16, total: 22, color: 'orange', icon: FlaskConical }, { name: 'Biology', done: 22, total: 30, color: 'green', icon: Leaf }], tasks: [{ time: '09:00', title: 'Human physiology · NCERT read', tag: 'Biology', done: true }, { time: '11:30', title: 'Chemical bonding · Revision', tag: 'Chemistry', done: false }, { time: '16:00', title: 'Ray optics · 25 Qs', tag: 'Physics', done: false }] },
  UPSC: { full: 'Union Public Service Commission', target: 'UPSC CSE 2027', rank: 'On track', progress: 47, subjects: [{ name: 'Polity', done: 12, total: 20, color: 'blue', icon: ShieldCheck }, { name: 'History', done: 14, total: 24, color: 'orange', icon: BookOpen }, { name: 'Geography', done: 10, total: 22, color: 'green', icon: Compass }], tasks: [{ time: '09:00', title: 'Fundamental rights · Revision', tag: 'Polity', done: true }, { time: '11:30', title: 'Modern India · Spectrum notes', tag: 'History', done: false }, { time: '16:00', title: 'Monsoon system · Map work', tag: 'Geography', done: false }] },
  SSC: { full: 'Staff Selection Commission', target: 'SSC CGL 2027', rank: 'Top 15%', progress: 56, subjects: [{ name: 'Quantitative Aptitude', done: 17, total: 28, color: 'blue', icon: Activity }, { name: 'Reasoning', done: 19, total: 26, color: 'purple', icon: Zap }, { name: 'English', done: 14, total: 20, color: 'orange', icon: BookOpen }], tasks: [{ time: '09:00', title: 'Percentage · Timed practice', tag: 'Quant', done: true }, { time: '11:30', title: 'Coding-decoding · 20 Qs', tag: 'Reasoning', done: false }, { time: '16:00', title: 'Spot the error · Revision', tag: 'English', done: false }] }
};
const resources = [
  { title: 'Previous year questions', desc: 'Practice papers, organised chapter by chapter', icon: BookOpen, tone: 'blue', type: 'Practice' },
  { title: 'Mock test series', desc: 'Full length tests with detailed solutions', icon: Target, tone: 'purple', type: 'Tests' },
  { title: 'Short notes', desc: 'Quick revision, made for the last mile', icon: Bookmark, tone: 'orange', type: 'Revision' },
  { title: 'Important questions', desc: 'The questions worth another look', icon: Sparkles, tone: 'green', type: 'Practice' },
  { title: 'Chapter weightage', desc: 'Know where your next hour matters most', icon: Activity, tone: 'rose', type: 'Insights' },
  { title: 'Formula sheet', desc: 'Every essential formula, in one place', icon: Command, tone: 'gold', type: 'Revision' }
];
const navItems = [{ label: 'Overview', icon: LayoutDashboard }, { label: 'Practice', icon: BookOpen }, { label: 'Tests', icon: Target }, { label: 'Study plan', icon: CalendarDays }, { label: 'YouTube planner', icon: Youtube }, { label: 'My purchases', icon: ShoppingBag }];
const appRoutes = ['/app', '/app/practice', '/app/tests', '/app/study-plan', '/app/youtube', '/app/purchases'];

function App() {
  const [theme, setTheme] = useState(localStorage.getItem('mj-theme') || 'light');
  const [exam, setExam] = useState('');
  const [selectedExam, setSelectedExam] = useState('');
  const [user, setUser] = useState(null);
  const [route, setRoute] = useState(window.location.pathname || '/');
  const [sessionReady, setSessionReady] = useState(false);
  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [apiStatus, setApiStatus] = useState('loading');
  const [tasks, setTasks] = useState([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [notice, setNotice] = useState('');
  const navigate = useCallback((path, replace = false) => {
    if (window.location.pathname !== path) {
      if (replace) window.history.replaceState({}, '', path);
      else window.history.pushState({}, '', path);
    }
    setRoute(path);
    window.scrollTo(0, 0);
  }, []);
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('mj-theme', theme); }, [theme]);
  useEffect(() => {
    const onPopState = () => setRoute(window.location.pathname || '/');
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
  useEffect(() => {
    let active = true;
    fetch('/api/auth/me', { credentials: 'include' }).then(async response => {
      if (!response.ok) throw new Error('No active session');
      return response.json();
    }).then(data => {
      if (!active) return;
      setUser(data.user);
      setExam(data.user.exam || '');
    }).catch(() => {
      if (!active) return;
      setUser(null);
      setExam('');
    }).finally(() => { if (active) setSessionReady(true); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!sessionReady) return;
    if (user) {
      if (route === '/' || route === '/login' || route === '/register') navigate(user.exam ? '/app' : '/onboarding', true);
      else if (route === '/onboarding' && user.exam) navigate('/app', true);
      else if (route.startsWith('/app') && !user.exam) navigate('/onboarding', true);
      else if (route.startsWith('/app') && !appRoutes.includes(route)) navigate('/app', true);
      else if (!route.startsWith('/app') && route !== '/onboarding') navigate(user.exam ? '/app' : '/onboarding', true);
    } else if (route === '/app' || route.startsWith('/app/') || route === '/onboarding') navigate('/login', true);
    else if (!['/', '/login', '/register'].includes(route)) navigate('/', true);
  }, [sessionReady, user, route, navigate]);
  useEffect(() => {
    if (!exam) return;
    let active = true;
    fetch('/api/dashboard', { credentials: 'include' }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load your study data.');
      return data;
    }).then(data => { if (active) { setTasks(data.tasks || []); setApiStatus('connected'); } }).catch(error => {
      if (!active) return;
      if (error.message.includes('sign in') || error.message.includes('session')) { setUser(null); setExam(''); navigate('/login'); return; }
      setTasks(seed[exam]?.tasks.map((task,index)=>({...task,id:`seed-${index}`})) || []);
      setApiStatus('offline');
    });
    return () => { active = false; };
  }, [exam, navigate]);
  const onAuthenticated = profile => { setUser(profile); setExam(profile.exam || ''); navigate(profile.exam ? '/app' : '/onboarding'); };
  const chooseExam = value => setSelectedExam(value);
  const finishSetup = async () => {
    if (!selectedExam) return;
    try {
      const response = await fetch('/api/profile/exam', { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ exam: selectedExam }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save your exam.');
      const dashboardResponse = await fetch('/api/dashboard', { credentials: 'include' });
      const dashboard = await dashboardResponse.json();
      if (!dashboardResponse.ok) throw new Error(dashboard.error || 'Could not load your study space.');
      setTasks(dashboard.tasks || []); setApiStatus('connected'); setUser(data.user); setExam(data.user.exam); navigate('/app');
    } catch (error) { setNotice(error.message || 'Could not save your exam. Please try again.'); }
  };
  const toggleTask = async taskId => {
    const task = tasks.find(item => item.id === taskId);
    if (!task) return;
    const done = !task.done;
    setTasks(previous => previous.map(item => item.id === taskId ? { ...item, done } : item));
    try {
      const response = await fetch(`/api/tasks/${encodeURIComponent(taskId)}`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ done }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not update this task.');
    } catch (error) { setTasks(previous => previous.map(item => item.id === taskId ? { ...item, done: task.done } : item)); setNotice(error.message); }
  };
  const addTask = async e => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    try {
      const response = await fetch('/api/tasks', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: taskTitle, time: '18:00', tag: 'Personal' }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not add this task.');
      setTasks(previous => [...previous, data]); setTaskTitle(''); setShowTaskForm(false);
    } catch (error) { setNotice(error.message); }
  };
  const leave = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }); } catch {}
    setUser(null); setExam(''); setTasks([]); navigate('/');
  };
  const pages = { '/app':'Overview', '/app/practice':'Practice', '/app/tests':'Tests', '/app/study-plan':'Study plan', '/app/youtube':'YouTube planner', '/app/purchases':'My purchases' };
  const page = pages[route] || 'Overview';
  const setPage = label => navigate(label === 'Overview' ? '/app' : label === 'My purchases' ? '/app/purchases' : label === 'YouTube planner' ? '/app/youtube' : `/app/${label.toLowerCase().replaceAll(' ','-')}`);
  if (!sessionReady || (user && (route === '/' || route === '/login' || route === '/register' || (route === '/onboarding' && user.exam) || (route.startsWith('/app') && !user.exam)))) return <div className="auth-loading">Loading your study space…</div>;
  if (!user && route === '/') return <Landing theme={theme} setTheme={setTheme} onStart={() => navigate('/register')} />;
  if (!user && (route === '/login' || route === '/register')) return <Auth key={route} theme={theme} setTheme={setTheme} initialMode={route.slice(1)} onNavigate={navigate} onSuccess={onAuthenticated} onBack={() => navigate('/')} />;
  if (user && route === '/onboarding' && !user.exam) return <Onboarding theme={theme} setTheme={setTheme} selected={selectedExam} onSelect={chooseExam} onContinue={finishSetup} user={user} />;
  if (!user || !exam) return <div className="auth-loading">Loading your study space…</div>;
  const current = seed[exam];
  const filtered = resources.filter(r => (filter === 'All' || r.type === filter) && r.title.toLowerCase().includes(query.toLowerCase()));
  return <div className="app-shell">
    <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
      <button className="brand dashboard-brand" onClick={() => setPage('Overview')}><span className="brand-mark">m.</span><span className="brand-name">masterji</span><span className="mobile-close"><X size={18}/></span></button>
      <div className="sidebar-label">WORKSPACE</div>
      <nav>{navItems.map(n => <button key={n.label} className={`nav-link ${page === n.label ? 'active' : ''}`} onClick={() => { setPage(n.label); setMenuOpen(false); }}><n.icon size={18}/><span>{n.label}</span>{n.label === 'Tests' && <span className="nav-count">3</span>}</button>)}</nav>
      <div className="sidebar-label resource-label">YOUR RESOURCES</div>
      <button className="nav-link" onClick={() => setPage('Practice')}><Bookmark size={18}/><span>Saved for later</span></button>
      <button className="nav-link" onClick={() => setNotice('Your progress report is up to date.')}><Activity size={18}/><span>My progress</span></button>
      <div className="sidebar-bottom"><button className="nav-link help-link" onClick={() => setNotice('Help centre coming soon.')}><CircleHelp size={18}/><span>Help centre</span></button><button className="nav-link settings-link" onClick={() => setNotice('Settings are coming soon.')}><Settings2 size={18}/><span>Settings</span></button><div className="profile-mini"><div className="avatar">{user.name.slice(0,1).toUpperCase()}</div><div className="profile-copy"><strong>{user.name}</strong><span>{current.target}</span></div><button className="icon-btn" onClick={leave} aria-label="Log out"><LogOut size={16}/></button></div></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><button className="icon-btn mobile-menu" onClick={() => setMenuOpen(true)}><Menu size={20}/></button><div className="breadcrumb"><span>Workspace</span><ChevronRight size={14}/><strong>{page}</strong></div><div className="top-actions"><div className="exam-pill"><span className="exam-dot"/>{exam}<ChevronDown size={14}/></div><button className="icon-btn theme-toggle" title="Toggle theme" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? <Moon size={18}/> : <Sun size={18}/>}</button><div className="top-avatar">{user.name.slice(0,1).toUpperCase()}</div></div></header>
      <div className="content">
        {notice && <div className="toast"><Check size={16}/>{notice}<button onClick={() => setNotice('')}><X size={15}/></button></div>}
        {route === '/app/purchases' ? <PurchasesPage /> : route === '/app/youtube' ? <YoutubePlanner /> : <>
        <section className="welcome-row"><div><div className="eyebrow"><span className="status-dot"/> {current.target.toUpperCase()}</div><h1>Good {greeting().split(' ')[1].toLowerCase()}, {user.name.split(' ')[0]}<span className="wave">✳</span></h1></div><button className="date-chip"><CalendarDays size={16}/>{new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</button></section>
        <section className="hero-card"><div className="hero-grid-lines"/><div className="hero-copy"><div className="hero-kicker"><span className="hero-kicker-dot"/> YOUR DAILY PRACTICE</div><h2>A little every day.<br/><span>A lot closer.</span></h2><p>{current.target} <span className="hero-divider">·</span> {current.progress}% complete</p><button className="hero-button" onClick={() => setPage('Study plan')}>Continue studying <ArrowRight size={16}/></button><div className="hero-foot"><span><Flame size={15}/> <b>12 day streak</b></span><i/><span>{current.rank}</span></div></div><StudyOrb/><div className="hero-badge"><span><Flame size={14}/></span><strong>12 days</strong><small>on a roll</small></div><div className="hero-blob"/></section>
        <section className="stats-grid"><Stat icon={Clock3} label="Study time" value="4.2h" sub="this week" change="+18%" positive/><Stat icon={Check} label="Questions solved" value="128" sub="this week" change="+24" positive/><Stat icon={Target} label="Mock test score" value="76%" sub="latest test" change="+6.4%" positive/><Stat icon={Flame} label="Current streak" value="12 days" sub="personal best 18" change=""/></section>
        <section className="section-head"><div><div className="section-eyebrow">STUDY TOOLS</div><h2>Pick up where you left off</h2></div><button className="text-link" onClick={() => setPage('Practice')}>All tools <ArrowRight size={15}/></button></section>
        <div className="tool-filter">{['All','Practice','Tests','Revision','Insights'].map(f=><button key={f} className={filter===f?'selected':''} onClick={()=>setFilter(f)}>{f}</button>)}<div className="search-box"><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Find a resource"/></div></div>
        <section className="tool-grid">{filtered.map(item=><button className="tool-card" key={item.title} onClick={()=>setNotice(`${item.title} for ${exam} will be available in your library soon.`)}><div className={`tool-icon ${item.tone}`}><item.icon size={19}/></div><ArrowUpRight className="tool-arrow" size={17}/><strong>{item.title}</strong><span className="tool-type">{item.type}</span></button>)}</section>
        <div className="lower-grid"><section className="panel progress-panel"><div className="panel-header"><div><div className="section-eyebrow">THE BIG PICTURE</div><h3>Subject progress</h3></div><button className="icon-btn" onClick={()=>setNotice(`Showing ${exam} subject progress.`)}><MoreHorizontal size={19}/></button></div>{current.subjects.map(s=><div className="subject-row" key={s.name}><div className={`subject-icon ${s.color}`}><s.icon size={16}/></div><div className="subject-info"><div className="subject-label"><strong>{s.name}</strong><span>{s.done}/{s.total} chapters</span></div><div className="progress-track"><div className={`progress-fill ${s.color}`} style={{width:`${Math.round(s.done/s.total*100)}%`}}/></div></div><b className="subject-percent">{Math.round(s.done/s.total*100)}%</b></div>)}<button className="panel-link" onClick={()=>setPage('Practice')}>View chapter breakdown <ArrowRight size={14}/></button></section>
        <section className="panel planner-panel"><div className="panel-header"><div><div className="section-eyebrow">YOUR NEXT FEW HOURS</div><h3>Today’s plan <span className="task-count">{tasks.filter(t=>t.done).length}/{tasks.length}</span></h3></div><button className="add-task" onClick={()=>setShowTaskForm(!showTaskForm)}><Plus size={15}/> Add</button></div>{showTaskForm&&<form className="task-form" onSubmit={addTask}><input autoFocus value={taskTitle} onChange={e=>setTaskTitle(e.target.value)} placeholder="What will you work on?"/><button type="submit"><ArrowRight size={15}/></button></form>}<div className="task-list">{tasks.map((t,i)=><div className={`task-row ${t.done?'task-done':''}`} key={t.id}><button className={`task-check ${t.done?'checked':''}`} onClick={()=>toggleTask(t.id)}>{t.done&&<Check size={12}/>}</button><span className="task-time">{t.time}</span><span className="task-title">{t.title}</span><span className="task-tag">{t.tag}</span></div>)}</div><button className="panel-link" onClick={()=>setPage('Study plan')}>Open full planner <ArrowRight size={14}/></button></section></div>
        </>}
        <footer><span>Made for your next big thing.</span><span>© 2025 Masterji · <button onClick={()=>setNotice(apiStatus==='connected'?'Connected to your local API.':'Showing seed data. Start the server to sync your progress.')}>{apiStatus==='connected'?'Connected':'Seed data'}</button></span></footer>
      </div>
    </main>
  </div>;
}
function PurchasesPage(){
  return <section className="purchases-page"><div className="purchases-heading"><div><div className="section-eyebrow">YOUR ACCOUNT</div><h1>My purchases</h1><p>Courses and packages linked to your account.</p></div><span className="purchases-count">0 items</span></div><div className="purchases-empty"><div className="purchases-empty-art"><ShoppingBag size={27}/></div><span className="section-eyebrow">YOUR LIBRARY</span><h2>No purchases yet</h2><p>When you purchase a course or package, it will appear here.</p></div></section>;
}
function formatWatchTime(seconds){
  const minutes=Math.ceil(seconds/60);const hours=Math.floor(minutes/60);const rest=minutes%60;
  return hours?`${hours}h ${rest}m`:`${minutes}m`;
}
function localDateValue(){const now=new Date();return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;}
function YoutubePlanner(){
  const [playlists,setPlaylists]=useState([]);const [configs,setConfigs]=useState({});const [goal,setGoal]=useState(null);const [goalInput,setGoalInput]=useState('2');const [url,setUrl]=useState('');const [playlistName,setPlaylistName]=useState('');const [fallbackCount,setFallbackCount]=useState('');const [fallbackDuration,setFallbackDuration]=useState('30');const [studyDate,setStudyDate]=useState(localDateValue());const [lecturesPerDay,setLecturesPerDay]=useState(2);const [activeVideo,setActiveVideo]=useState(null);const [focusPlanOnAdd,setFocusPlanOnAdd]=useState(false);const todoRef=useRef(null);const [loading,setLoading]=useState(true);const [saving,setSaving]=useState(false);const [configured,setConfigured]=useState(false);const [error,setError]=useState('');const [message,setMessage]=useState('');
  const refreshGoal=useCallback(async()=>{const date=localDateValue();const response=await fetch(`/api/youtube-playlists/goal?date=${date}`,{credentials:'include'});const data=await response.json();if(!response.ok)throw new Error(data.error||'Could not load today’s goal.');setGoal(data);setGoalInput(String(data.target));return data;},[]);
  const load=useCallback(async()=>{try{const [response]=await Promise.all([fetch('/api/youtube-playlists',{credentials:'include'}),refreshGoal()]);const data=await response.json();if(!response.ok)throw new Error(data.error||'Could not load playlists.');setPlaylists(data.playlists||[]);setConfigured(data.youtubeConfigured);setConfigs(Object.fromEntries((data.playlists||[]).map(p=>[p.id,{startLecture:p.startLecture,endLecture:p.endLecture,speed:p.speed,lecturesPerDay:p.lecturesPerDay}])));}catch(e){setError(e.message);}finally{setLoading(false);}},[refreshGoal]);
  useEffect(()=>{load();},[load]);
  useEffect(()=>{if(focusPlanOnAdd&&playlists.length){todoRef.current?.scrollIntoView({behavior:'smooth',block:'start'});setFocusPlanOnAdd(false);}},[focusPlanOnAdd,playlists.length]);
  useEffect(()=>{if(!activeVideo)return;const closeOnEscape=e=>{if(e.key==='Escape')setActiveVideo(null);};window.addEventListener('keydown',closeOnEscape);return()=>window.removeEventListener('keydown',closeOnEscape);},[activeVideo]);
  const addPlaylist=async e=>{e.preventDefault();setError('');setMessage('');setSaving(true);try{const response=await fetch('/api/youtube-playlists',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({url,title:playlistName,lectureCount:Number(fallbackCount),averageDurationMinutes:Number(fallbackDuration),studyDate,lecturesPerDay:Number(lecturesPerDay)})});const data=await response.json();if(!response.ok)throw new Error(data.error||'Could not create the playlist plan.');setFocusPlanOnAdd(true);setPlaylists(old=>[...old,data.playlist]);setConfigs(old=>({...old,[data.playlist.id]:{startLecture:data.playlist.startLecture,endLecture:data.playlist.endLecture,speed:data.playlist.speed,lecturesPerDay:data.playlist.lecturesPerDay}}));setUrl('');setPlaylistName('');setFallbackCount('');await refreshGoal();setMessage('Your playlist tasks are ready, grouped by study date.');}catch(e){setError(e.message);}finally{setSaving(false);}};
  const saveGoal=async e=>{e.preventDefault();setError('');try{const response=await fetch('/api/youtube-playlists/goal',{method:'PUT',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({date:localDateValue(),target:Number(goalInput)})});const data=await response.json();if(!response.ok)throw new Error(data.error||'Could not save today’s goal.');setGoal(data);setGoalInput(String(data.target));setMessage('Today’s lecture goal saved.');}catch(e){setError(e.message);}};
  const updateConfig=(id,key,value)=>setConfigs(old=>({...old,[id]:{...old[id],[key]:value}}));
  const savePlan=async playlist=>{const config=configs[playlist.id];setError('');try{const response=await fetch(`/api/youtube-playlists/${playlist.id}`,{method:'PATCH',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({...config,startLecture:Number(config.startLecture),endLecture:Number(config.endLecture),speed:Number(config.speed),lecturesPerDay:Number(config.lecturesPerDay),studyDate:playlist.studyDate,today:localDateValue()})});const data=await response.json();if(!response.ok)throw new Error(data.error||'Could not update the playlist settings.');setPlaylists(old=>old.map(p=>p.id===playlist.id?data.playlist:p));setConfigs(old=>({...old,[playlist.id]:{...config,lecturesPerDay:data.playlist.lecturesPerDay}}));await refreshGoal();setMessage('Playlist settings saved.');}catch(e){setError(e.message);}};
  const changePlanStatus=async playlist=>{try{const response=await fetch(`/api/youtube-playlists/${playlist.id}/status`,{method:'PATCH',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({isPaused:!playlist.isPaused,today:localDateValue()})});const data=await response.json();if(!response.ok)throw new Error(data.error||'Could not update plan status.');setPlaylists(old=>old.map(p=>p.id===playlist.id?data.playlist:p));await refreshGoal();setMessage(data.playlist.isPaused?'Plan paused. Resume to shift unfinished lectures forward.':'Plan resumed and unfinished lectures rescheduled.');}catch(e){setError(e.message);}};
  const rescheduleMissed=async playlist=>{try{const response=await fetch(`/api/youtube-playlists/${playlist.id}/reschedule-missed`,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({today:localDateValue()})});const data=await response.json();if(!response.ok)throw new Error(data.error||'Could not reschedule missed lectures.');setPlaylists(old=>old.map(p=>p.id===playlist.id?data.playlist:p));await refreshGoal();setMessage(`${data.rescheduledLectures} missed lecture${data.rescheduledLectures===1?'':'s'} moved into your plan.`);}catch(e){setError(e.message);}};
  const removePlaylist=async playlist=>{try{const response=await fetch(`/api/youtube-playlists/${playlist.id}`,{method:'DELETE',credentials:'include'});if(!response.ok){const data=await response.json();throw new Error(data.error||'Could not remove playlist.');}setPlaylists(old=>old.filter(p=>p.id!==playlist.id));await refreshGoal();setMessage('Playlist removed.');}catch(e){setError(e.message);}};
  const updateLecture=async(playlist,video,changes)=>{setError('');try{const response=await fetch(`/api/youtube-playlists/${playlist.id}/lectures/${video.videoId}`,{method:'PATCH',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(changes)});const data=await response.json();if(!response.ok)throw new Error(data.error||'Could not update this lecture.');setPlaylists(old=>old.map(p=>p.id===playlist.id?data.playlist:p));if(changes.done!==undefined||changes.studyDate!==undefined)await refreshGoal();}catch(e){setError(e.message);}};
  const totalSeconds=p=>p.videos.reduce((sum,v)=>sum+v.durationSeconds,0);const chosenSeconds=(p,c)=>p.videos.slice(Math.max(0,Number(c?.startLecture||1)-1),Number(c?.endLecture||p.videos.length)).reduce((sum,v)=>sum+v.durationSeconds,0);
  const todoByDate=playlists.flatMap(p=>p.videos.map((video,index)=>({playlist:p,video,lecture:index+1,date:video.studyDate||p.studyDate}))).sort((a,b)=>a.date.localeCompare(b.date)||a.lecture-b.lecture).reduce((groups,item)=>{(groups[item.date]??=[]).push(item);return groups;},{});
  const dateLabel=value=>{const date=new Date(`${value}T12:00:00`);const label=date.toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'short',year:'numeric'});const today=localDateValue();const tomorrowDate=new Date(`${today}T12:00:00`);tomorrowDate.setDate(tomorrowDate.getDate()+1);const tomorrow=`${tomorrowDate.getFullYear()}-${String(tomorrowDate.getMonth()+1).padStart(2,'0')}-${String(tomorrowDate.getDate()).padStart(2,'0')}`;return value===today?`Today · ${label}`:value===tomorrow?`Tomorrow · ${label}`:label;};
  return <section className="youtube-page"><div className="youtube-heading"><div><div className="section-eyebrow">LECTURE SCHEDULER</div><h1>YouTube study planner</h1><p>Split playlists into daily lecture goals, track what you finish, and study in the in-app player.</p></div><div className="youtube-total"><Youtube size={17}/><strong>{playlists.length}</strong><span>playlists</span></div></div>
    {error&&<div className="youtube-alert error"><CircleHelp size={16}/>{error}<button onClick={()=>setError('')} aria-label="Dismiss">×</button></div>}{message&&<div className="youtube-alert success"><Check size={16}/>{message}<button onClick={()=>setMessage('')} aria-label="Dismiss">×</button></div>}
    <form className={`youtube-goal-card ${goal?.completedTodayGoal?'goal-complete':''}`} onSubmit={saveGoal}><div className="goal-streak"><span className="goal-flame"><Flame size={19}/></span><div><strong>{goal?.streak||0} day streak</strong><small>{goal?.completedTodayGoal?'Goal complete — streak extended!':'Keep your daily study streak alive'}</small><small className="youtube-xp-line"><Trophy size={12}/> {goal?.totalXp||0} XP · Level {goal?.level||1} · {goal?.xpToNextLevel??100} XP to next</small></div></div><div className="goal-progress"><div className="goal-progress-copy"><span>Today’s lecture goal</span><strong>{goal?.completed||0} / {goal?.target||2} lectures</strong></div><div className="goal-progress-track"><i style={{width:`${Math.min(100,((goal?.completed||0)/Math.max(1,goal?.target||2))*100)}%`}}/></div><small>{goal?.completedTodayGoal?'Nice work! Daily bonus earned.':`${Math.max(0,(goal?.target||2)-(goal?.completed||0))} more ${Math.max(0,(goal?.target||2)-(goal?.completed||0))===1?'lecture':'lectures'} to reach your goal`}</small></div><label className="goal-target-input">Set today’s goal<input type="number" min="1" max="50" required value={goalInput} onChange={e=>setGoalInput(e.target.value)}/></label><button type="submit" className="youtube-submit">Save goal <Target size={15}/></button></form>
    {goal&&<YoutubeAnalytics data={goal}/>}
    <form className="youtube-add panel" onSubmit={addPlaylist}>
      <div className="youtube-form-intro"><div className="youtube-icon"><Youtube size={20}/></div><div><h2>Add a playlist</h2><p>{configured?'Paste a public playlist and choose how many lectures you want each day.':'YouTube API key not set. You can still build a plan by entering the playlist title, lecture count, and average duration.'}</p></div></div>
      <label className="youtube-url-field">YouTube playlist URL<input type="url" required value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://www.youtube.com/playlist?list=…"/></label>
      {!configured&&<div className="youtube-fallback-fields"><label>Playlist name<input type="text" maxLength="120" value={playlistName} onChange={e=>setPlaylistName(e.target.value)} placeholder="e.g. GATE DBMS complete course"/></label><label>Number of lectures<input type="number" min="1" max="500" required value={fallbackCount} onChange={e=>setFallbackCount(e.target.value)} placeholder="e.g. 80"/></label><label>Average minutes per lecture<input type="number" min="1" max="360" value={fallbackDuration} onChange={e=>setFallbackDuration(e.target.value)}/></label><small>Fallback mode creates a real dated checklist and estimated study time. Video titles, durations, and thumbnails require the YouTube API key.</small></div>}
      <div className="youtube-add-row"><label>First study date<input type="date" required value={studyDate} onChange={e=>setStudyDate(e.target.value)}/></label><label>Lectures per day<input type="number" min="1" max="50" required value={lecturesPerDay} onChange={e=>setLecturesPerDay(e.target.value)}/></label><button type="submit" className="youtube-submit" disabled={saving}>{saving?'Building plan…':<>Create study plan <ArrowRight size={16}/></>}</button></div>
    </form>
    <div className="youtube-list-heading"><div><div className="section-eyebrow">YOUR LIBRARY</div><h2>Scheduled playlists</h2></div></div>
    {loading?<div className="youtube-empty">Loading your playlists…</div>:playlists.length===0?<div className="youtube-empty"><div className="youtube-empty-art"><CalendarDays size={24}/></div><h3>Your lecture plan starts here</h3><p>Add a playlist and set how many lectures you want to study each day.</p></div>:<div className="youtube-playlist-grid">{playlists.map(p=>{const c=configs[p.id]||{startLecture:p.startLecture,endLecture:p.endLecture,speed:p.speed,lecturesPerDay:p.lecturesPerDay};const duration=chosenSeconds(p,c);const missed=p.videos.filter(v=>!v.done&&v.studyDate<localDateValue()).length;return <article className="youtube-playlist panel" key={p.id}>
      <div className="youtube-card-head"><div><div className="section-eyebrow">{p.channelTitle||'YOUTUBE PLAYLIST'} · {p.sourceMode==='manual-fallback'?'ESTIMATED PLAN':'YOUTUBE DATA'}</div><h3>{p.title}</h3><span className="youtube-lecture-count">{p.remainingLectures} remaining of {p.videos.length} · {p.lecturesPerDay} per day · Complete by {p.remainingLectures?dateLabel(p.expectedCompletionDate):'Finished'}</span></div><button className="youtube-remove" onClick={()=>removePlaylist(p)} type="button" aria-label={`Remove ${p.title}`}><X size={17}/></button></div>
      <div className="youtube-plan-status"><span className={p.isPaused?'paused':''}>{p.isPaused?'Plan paused':'Plan active'}</span>{missed>0&&<b>{missed} missed lecture{missed===1?'':'s'}</b>}</div>
      <div className="youtube-controls"><label>From lecture<input type="number" min="1" max={p.videos.length} value={c.startLecture} onChange={e=>updateConfig(p.id,'startLecture',Math.min(p.videos.length,Math.max(1,Number(e.target.value))))}/></label><span className="range-separator">to</span><label>To lecture<input type="number" min={c.startLecture} max={p.videos.length} value={c.endLecture} onChange={e=>updateConfig(p.id,'endLecture',Math.min(p.videos.length,Math.max(Number(c.startLecture),Number(e.target.value))))}/></label><label>Playback speed<select value={c.speed} onChange={e=>updateConfig(p.id,'speed',e.target.value)}>{[1,1.25,1.5,1.75,2].map(speed=><option key={speed} value={speed}>{speed}×</option>)}</select></label><label>Lectures / day<input type="number" min="1" max="50" value={c.lecturesPerDay} onChange={e=>updateConfig(p.id,'lecturesPerDay',e.target.value)}/></label></div>
      <div className="youtube-time-estimate"><div><span>Selected range</span><strong>{Math.max(0,Number(c.endLecture)-Number(c.startLecture)+1)} of {p.videos.length}</strong></div><div><span>Estimated watch time</span><strong>{formatWatchTime(duration/Number(c.speed||1))}</strong></div><small>{p.sourceMode==='manual-fallback'?'Uses the average lecture length you entered.':`Actual video durations at ${c.speed}×. Changing lectures per day replans unfinished lessons.`}</small></div>
      <div className="youtube-plan-actions"><button type="button" className="youtube-save-settings" onClick={()=>savePlan(p)}>Apply plan changes <Check size={15}/></button><button type="button" className="youtube-plan-toggle" onClick={()=>changePlanStatus(p)}>{p.isPaused?'Resume plan':'Pause plan'}</button>{missed>0&&!p.isPaused&&<button type="button" className="youtube-plan-reschedule" onClick={()=>rescheduleMissed(p)}>Reschedule {missed} missed</button>}</div>
    </article>;})}</div>}
    {playlists.length>0&&<section className="youtube-todo" ref={todoRef}><div className="youtube-list-heading"><div><div className="section-eyebrow">FULL DAY-BY-DAY PLAN</div><h2>Your lecture to-do list</h2><p>Every playlist lecture is assigned a study date. Start with today’s tasks, then keep going day by day.</p></div><span>{playlists.reduce((sum,p)=>sum+p.videos.filter(v=>v.done).length,0)} / {playlists.reduce((sum,p)=>sum+p.videos.length,0)} completed</span></div>{Object.entries(todoByDate).map(([date,items])=><section className="youtube-day-group" key={date}><header><CalendarDays size={17}/><h3>{dateLabel(date)}</h3><span>{items.filter(item=>item.video.done).length}/{items.length} done</span></header><div className="youtube-day-items">{items.map(({playlist:p,video,lecture})=><article className={`youtube-todo-item ${video.done?'is-done':''}`} key={`${p.id}-${video.videoId}`}><button className={`youtube-done-check ${video.done?'checked':''}`} aria-label={video.done?'Mark lecture incomplete':'Mark lecture complete'} onClick={()=>updateLecture(p,video,{done:!video.done})}>{video.done&&<Check size={15}/>}</button>{video.thumbnail?<img src={video.thumbnail} alt=""/>:<div className="youtube-thumb-placeholder"><Youtube size={21}/><span>LECTURE {lecture}</span></div>}<div className="youtube-todo-copy"><span>{p.title} · Lecture {lecture}</span><strong>{video.title}</strong><small>{formatWatchTime(video.durationSeconds)}</small></div><label className="youtube-move-date" title="Move this lecture to another date"><CalendarDays size={15}/><input type="date" value={video.studyDate||p.studyDate} onChange={e=>updateLecture(p,video,{studyDate:e.target.value})}/></label><button className="youtube-watch" onClick={()=>setActiveVideo({playlist:p,video,lecture})}><Youtube size={15}/> Watch lecture</button></article>)}</div></section>)}</section>}
    {activeVideo&&<div className="youtube-player-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setActiveVideo(null);}}><section className="youtube-player-modal" role="dialog" aria-modal="true" aria-label={`Watch ${activeVideo.video.title}`}><header><div><span className="section-eyebrow">{activeVideo.playlist.title} · LECTURE {activeVideo.lecture}</span><h2>{activeVideo.video.title}</h2></div><button className="youtube-remove" onClick={()=>setActiveVideo(null)} aria-label="Close player"><X size={19}/></button></header><div className="youtube-player-frame"><iframe src={activeVideo.playlist.sourceMode==='manual-fallback'?`https://www.youtube-nocookie.com/embed/videoseries?list=${activeVideo.playlist.playlistId}&index=${activeVideo.lecture-1}&autoplay=1&playsinline=1&controls=1&rel=0`:`https://www.youtube-nocookie.com/embed/${activeVideo.video.videoId}?autoplay=1&playsinline=1&controls=1&rel=0&iv_load_policy=3`} title={activeVideo.video.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/></div><footer><span>When you finish, mark this lecture complete in your checklist.</span><button onClick={()=>{updateLecture(activeVideo.playlist,activeVideo.video,{done:true});setActiveVideo(null);}}>Mark complete <Check size={15}/></button></footer></section></div>}
  </section>;
}
function YoutubeAnalytics({data}){
  const diff=data.comparison.difference;
  const diffLabel=diff>0?`+${diff}%`:diff<0?`${diff}%`:'No change';
  return <section className="youtube-analytics"><article className="youtube-analytics-card"><div className="section-eyebrow">DAY-TO-DAY</div><h3>Today vs yesterday</h3><div className="youtube-compare"><div><span>Yesterday</span><strong>{data.comparison.yesterday}/{data.comparison.yesterdayGoal}</strong><small>{data.comparison.yesterdayPercentage}%</small></div><ArrowRight size={17}/><div><span>Today</span><strong>{data.completed}/{data.target}</strong><small>{data.comparison.todayPercentage}%</small></div></div><b className={diff>0?'positive':diff<0?'negative':''}>{diffLabel} completion change</b><small>{data.todayXp} XP earned today</small></article>
    <article className="youtube-analytics-card"><div className="section-eyebrow">THIS WEEK</div><h3>Weekly progress</h3><div className="youtube-analytics-kpis"><strong>{data.weekly.completed}<small> done</small></strong><span>of {data.weekly.goal} goal</span><b>{data.weekly.percentage}%</b></div><div className="youtube-week-chart">{data.weekly.days.map(day=>{const height=Math.min(100,day.goal?day.completed/day.goal*100:0);return <div className="youtube-week-bar" key={day.date} title={`${day.date}: ${day.completed}/${day.goal}`}><div><i style={{height:`${height}%`}}/></div><span>{new Date(`${day.date}T12:00:00`).toLocaleDateString('en',{weekday:'short'}).slice(0,1)}</span></div>;})}</div><small>{data.weekly.missed} missed · {data.weekly.xp} XP · {data.weekly.averagePerDay} lectures/day</small></article>
    <article className="youtube-analytics-card"><div className="section-eyebrow">THIS MONTH</div><h3>Monthly progress</h3><div className="youtube-analytics-kpis"><strong>{data.monthly.completed}<small> done</small></strong><span>of {data.monthly.goal} goal</span><b>{data.monthly.percentage}%</b></div><div className="youtube-month-weeks">{data.monthly.weeks.map(week=><div key={week.label}><span>{week.label}</span><div><i style={{width:`${Math.min(100,week.percentage)}%`}}/></div><b>{week.percentage}%</b></div>)}</div><small>{data.monthly.studyDays} study days · {data.monthly.missedDays} missed · {data.monthly.xp} XP · {data.monthly.averagePerDay} lectures/day</small></article>
    <article className="youtube-analytics-card youtube-achievements"><div className="section-eyebrow">MILESTONES</div><h3>Achievements</h3><div>{data.badges.map(badge=><span key={badge.id} className={badge.earned?'earned':''}>{badge.earned?'✦':'◇'} {badge.label}</span>)}</div><small>Longest streak: {data.longestStreak} days · {data.overall.completed}/{data.overall.planned} playlist lectures completed ({data.overall.percentage}%)</small></article>
  </section>;
}
function Landing({theme,setTheme,onStart}){
  const [compactNav,setCompactNav]=useState(false);
  const [routineStatsOn,setRoutineStatsOn]=useState(false);
  const [focusMinutes,setFocusMinutes]=useState(0);
  const routineRef=useRef(null);
  useEffect(()=>{
    const onScroll=()=>setCompactNav(window.scrollY>42);
    onScroll();
    window.addEventListener('scroll',onScroll,{passive:true});
    return()=>window.removeEventListener('scroll',onScroll);
  },[]);
  useEffect(()=>{
    const section=routineRef.current;
    if(!section||routineStatsOn) return;
    const observer=new IntersectionObserver(([entry])=>{
      if(entry.isIntersecting){setRoutineStatsOn(true);observer.disconnect();}
    },{threshold:.28});
    observer.observe(section);
    return()=>observer.disconnect();
  },[routineStatsOn]);
  useEffect(()=>{
    if(!routineStatsOn) return;
    const start=performance.now(),duration=1450,target=18*60+24;
    let frame;
    const tick=now=>{
      const progress=Math.min((now-start)/duration,1);
      const eased=1-Math.pow(1-progress,3);
      setFocusMinutes(Math.round(target*eased));
      if(progress<1) frame=requestAnimationFrame(tick);
    };
    frame=requestAnimationFrame(tick);
    return()=>cancelAnimationFrame(frame);
  },[routineStatsOn]);
  const weeklyHours=Math.floor(focusMinutes/60);
  const weeklyMins=focusMinutes%60;
  const goalHours=Math.round((focusMinutes/(18*60+24))*18);
  return <main className="landing-page">
    <header className={`landing-nav ${compactNav?'is-compact':''}`}><button className="brand landing-brand" onClick={()=>window.scrollTo({top:0,behavior:'smooth'})}><span className="brand-mark">m.</span><span className="brand-name">masterji</span></button><nav><a href="#tools">Study tools</a><a href="#routine">Your routine</a><a href="#exams">Exams</a></nav><div className="landing-actions"><ThemeButton theme={theme} setTheme={setTheme}/><button className="nav-start" onClick={onStart}>Start <ArrowRight size={16}/></button></div></header>
    <section className="landing-hero"><div className="landing-hero-grid"/><div className="landing-copy"><div className="landing-kicker"><span/> PREP FOR YOUR NEXT BIG THING</div><h1>Big goals feel<br/>closer <em>together.</em></h1><p>PYQs, mock tests and a plan that keeps you moving.</p><div className="landing-cta"><button className="landing-primary" onClick={onStart}>Start learning <ArrowRight size={17}/></button><a className="landing-secondary" href="#tools">Explore study tools <ChevronDown size={15}/></a></div><div className="landing-exam-list"><span>MADE FOR</span><i/> JEE <i/> NEET <i/> UPSC <i/> SSC</div></div>
      <div className="landing-stage"><div className="landing-glow"/><div className="orb-frame"><StudyOrb/></div><div className="float-card streak-float"><span className="float-icon"><Flame size={18}/></span><span><small>Current streak</small><strong>12 <small>days</small></strong></span></div><div className="float-card rank-float"><div className="leader-title">THIS WEEK <ArrowUpRight size={13}/></div><div className="leader-line"><b className="medal gold">1</b><span>Aarav</span><strong>4,820</strong></div><div className="leader-line"><b className="medal silver">2</b><span>Meera</span><strong>4,210</strong></div><div className="leader-line"><b className="medal lime">3</b><span>You</span><strong>3,985</strong></div></div><div className="float-card solved-float"><span className="solved-ring"><Check size={15}/></span><span><strong>128 solved</strong><small>questions this week</small></span><ArrowUpRight size={15}/></div><span className="stage-star stage-star-one">✳</span><span className="stage-star stage-star-two">✦</span></div>
      <a className="hero-scroll" href="#tools"><span/> SCROLL TO EXPLORE</a>
    </section>
    <div className="landing-marquee"><span>YOUR EXAM</span><i/><strong>JEE</strong><i/><strong>NEET</strong><i/><strong>UPSC</strong><i/><strong>SSC</strong><i/><span>YOUR PACE</span></div>
    <section className="landing-section tools-section" id="tools"><div className="landing-section-head"><div><div className="section-eyebrow">ONE STUDY SPACE</div><h2>Everything for<br/>your next attempt.</h2></div><p>Good prep starts with the right tools<br/>and a plan you can stick to.</p></div><div className="landing-tools-grid">{resources.map((item,i)=><article className="landing-tool" key={item.title}><div className={`tool-icon ${item.tone}`}><item.icon size={20}/></div><span className="landing-tool-number">0{i+1}</span><h3>{item.title}</h3><p>{item.desc}</p><button onClick={onStart} aria-label={`Explore ${item.title}`}><ArrowUpRight size={16}/></button></article>)}</div></section>
    <section className="routine-section" id="routine" ref={routineRef}><div className="routine-copy"><div className="section-eyebrow">YOUR DAILY RHYTHM</div><h2>A plan that<br/>moves with you.</h2><p>Set a target. Build a streak. See your progress add up.</p><button className="text-link" onClick={onStart}>Build your study plan <ArrowRight size={15}/></button><div className="routine-points"><div><span>01</span><strong>Plan your day</strong><small>Set a goal that fits.</small></div><div><span>02</span><strong>Practice daily</strong><small>Keep your momentum.</small></div><div><span>03</span><strong>Track progress</strong><small>Know what’s next.</small></div></div></div><div className="planner-preview"><div className="preview-top"><div><small>YOUR WEEK</small><strong>Study rhythm</strong></div><span className="preview-badge"><Flame size={13}/> 12 day streak</span></div><div className="week-chart">{[{d:'M',v:42},{d:'T',v:70},{d:'W',v:56},{d:'T',v:88},{d:'F',v:62},{d:'S',v:96,active:true},{d:'S',v:35}].map((x,i)=><div className="week-column" key={i}><div className="week-bar-wrap"><div className={`week-bar ${x.active?'active':''}`} style={{height:routineStatsOn?`${x.v}%`:'0%'}}/></div><span>{x.d}</span></div>)}</div><div className="preview-bottom"><div><strong>{weeklyHours}h {weeklyMins}m</strong><small>focus this week</small></div><div className="preview-goal"><span>WEEKLY GOAL</span><strong>{goalHours} / 22 hrs</strong><div><i style={{width:`${(goalHours/22)*100}%`}}/></div></div></div><div className="preview-task"><span className="preview-check"><Check size={12}/></span><span><small>NEXT UP · PHYSICS</small><strong>Electrostatics practice</strong></span><ArrowRight size={15}/></div></div></section>
    <section className="exam-band" id="exams"><div className="exam-band-orbit">✳</div><div><div className="section-eyebrow">ONE GOAL AT A TIME</div><h2>Your exam.<br/><span>Your study space.</span></h2><p>Choose your focus and we’ll shape your dashboard around it.</p></div><div className="exam-band-options">{exams.map((exam,i)=><button key={exam} onClick={onStart}><span>0{i+1}</span><strong>{exam}</strong><ArrowUpRight size={16}/></button>)}</div></section>
    <section className="landing-cta-band"><div className="cta-flower">✳</div><div><div className="section-eyebrow">START WHERE YOU ARE</div><h2>Your next step starts today.</h2></div><button onClick={onStart}>Build my study space <ArrowRight size={16}/></button></section>
    <footer className="landing-footer"><button className="brand landing-brand" onClick={()=>window.scrollTo({top:0,behavior:'smooth'})}><span className="brand-mark">m.</span><span className="brand-name">masterji</span></button><span>Made for the long game. ✳</span><div><a href="#tools">Study tools</a><a href="#routine">Your routine</a><a href="#exams">Exams</a><button onClick={()=>window.scrollTo({top:0,behavior:'smooth'})}>Back to top ↑</button></div><small>© 2025 Masterji</small></footer>
  </main>;
}
function greeting(){ const h=new Date().getHours(); return h<12?'Good morning':h<17?'Good afternoon':'Good evening'; }
function StudyOrb(){
  const host = useRef(null);
  useEffect(()=>{
    const el=host.current;
    if(!el) return;
    let renderer, frame;
    try{
      const scene=new THREE.Scene();
      const camera=new THREE.PerspectiveCamera(38,1,.1,100);
      camera.position.set(0,0,5.4);
      renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});
      renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
      renderer.setClearColor(0x000000,0);
      el.appendChild(renderer.domElement);
      const group=new THREE.Group(); scene.add(group);
      const core=new THREE.Mesh(new THREE.IcosahedronGeometry(1.05,3),new THREE.MeshStandardMaterial({color:0xef654e,roughness:.48,metalness:.08,flatShading:true}));
      group.add(core);
      const ring=new THREE.Mesh(new THREE.TorusGeometry(1.58,.012,8,160),new THREE.MeshBasicMaterial({color:0xe9bd62,transparent:true,opacity:.7}));
      ring.rotation.set(.78,.28,-.3); group.add(ring);
      const ring2=new THREE.Mesh(new THREE.TorusGeometry(1.9,.006,6,160),new THREE.MeshBasicMaterial({color:0xf2f2e8,transparent:true,opacity:.28}));
      ring2.rotation.set(1.14,-.4,.52); group.add(ring2);
      const bead=new THREE.Mesh(new THREE.SphereGeometry(.12,20,20),new THREE.MeshStandardMaterial({color:0xf5f5e9,roughness:.3}));
      bead.position.set(1.23,.92,.12); group.add(bead);
      const light=new THREE.PointLight(0xffc17a,24,12); light.position.set(2,2,4); scene.add(light);
      scene.add(new THREE.AmbientLight(0xffffff,1.8));
      const resize=()=>{const w=el.clientWidth||300,h=el.clientHeight||230;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};
      resize(); const observer=new ResizeObserver(resize); observer.observe(el);
      const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const animate=()=>{frame=requestAnimationFrame(animate);if(!reduced){group.rotation.y+=.0025;group.rotation.z=Math.sin(Date.now()*.00035)*.04;core.rotation.x+=.0012;}renderer.render(scene,camera);};
      animate();
      return()=>{cancelAnimationFrame(frame);observer.disconnect();core.geometry.dispose();core.material.dispose();ring.geometry.dispose();ring.material.dispose();ring2.geometry.dispose();ring2.material.dispose();bead.geometry.dispose();bead.material.dispose();renderer.dispose();renderer.domElement.remove();};
    }catch{ if(renderer){renderer.dispose();} }
  },[]);
  return <div ref={host} className="study-orb" aria-hidden="true"/>;
}
function Stat({icon:Icon,label,value,sub,change,positive}){return <div className="stat-card"><div className="stat-top"><span>{label}</span><span className="stat-icon"><Icon size={16}/></span></div><div className="stat-value">{value}</div><div className="stat-bottom"><span>{sub}</span>{change&&<span className={`stat-change ${positive?'positive':''}`}>{positive&&<ArrowUpRight size={12}/>} {change}</span>}</div></div>}
function ThemeButton({theme,setTheme}){return <button className="theme-toggle icon-btn" onClick={()=>setTheme(theme==='light'?'dark':'light')} title="Toggle theme">{theme==='light'?<Moon size={18}/>:<Sun size={18}/>}</button>}
function Auth({theme,setTheme,initialMode,onNavigate,onSuccess,onBack}) {
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const register=initialMode==='register';
  const submit=async event=>{
    event.preventDefault();setBusy(true);setError('');
    const values=new FormData(event.currentTarget);
    const payload={email:String(values.get('email')||'').trim().toLowerCase(),password:String(values.get('password')||'')};
    if(register) payload.name=String(values.get('name')||'').trim();
    try{
      const response=await fetch(`/api/auth/${register?'register':'login'}`,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const data=await response.json();
      if(!response.ok) throw new Error(data.error||'Unable to continue.');
      onSuccess(data.user);
    }catch(requestError){setError(requestError.message||'Could not reach the server. Check the backend and try again.');}
    finally{setBusy(false);}
  };
  return <main className="auth-page"><section className="auth-left"><div className="auth-top"><button className="brand auth-brand auth-home-link" onClick={onBack}><span className="brand-mark">m.</span><span className="brand-name">masterji</span></button><ThemeButton theme={theme} setTheme={setTheme}/></div><div className="auth-content"><div className="auth-tag"><span/> MADE FOR YOUR NEXT BIG THING</div><h1>Show up.<br/>Move <span>forward.</span></h1><div className="auth-features"><div><span className="feature-icon feature-a"><BookOpen size={17}/></span><div><strong>Practice</strong></div></div><div><span className="feature-icon feature-b"><Flame size={17}/></span><div><strong>Keep your streak</strong></div></div><div><span className="feature-icon feature-c"><Target size={17}/></span><div><strong>Own your goal</strong></div></div></div><div className="auth-quote"><div className="quote-avatars"><span>A</span><span>R</span><span>M</span><span>+</span></div><span>Thousands learning, one day at a time.</span></div></div><div className="auth-foot"><span>© 2025 Masterji</span><span>Keep showing up <span className="foot-flower">✳</span></span></div><div className="auth-decoration auth-d1">✳</div><div className="auth-decoration auth-d2">✦</div></section><section className="auth-right"><div className="auth-right-top"><span>JEE · NEET · UPSC · SSC</span><span className="auth-time"><span/> YOUR STUDY SPACE</span></div><div className="auth-box"><div className="welcome-label"><Sparkles size={15}/> {register?'GET STARTED':'WELCOME BACK'}</div><h2>{register?'Create your account':'Welcome back.'}</h2><p>{register?'Start building your study space.':'Sign in to continue.'}</p><form className="auth-form" onSubmit={submit}>{register&&<><label htmlFor="auth-name">Name</label><input id="auth-name" name="name" placeholder="Your name" required minLength={2} maxLength={80} autoComplete="name"/></>}<label htmlFor="auth-email">Email</label><input id="auth-email" type="email" name="email" placeholder="you@example.com" required maxLength={254} autoComplete="email"/><label htmlFor="auth-password">Password</label><input id="auth-password" type="password" name="password" placeholder={register?'At least 8 characters':'Your password'} required minLength={register?8:1} maxLength={128} autoComplete={register?'new-password':'current-password'}/>{error&&<div className="auth-error" role="alert">{error}</div>}<button type="submit" disabled={busy}>{busy?'Please wait…':register?'Create account':'Sign in'} {!busy&&<ArrowRight size={17}/>}</button></form><div className="auth-note"><ShieldCheck size={16}/> Passwords are stored securely. Your progress is private to your account.</div><div className="auth-toggle-line">{register?'Already have an account?':'New to Masterji?'} <button onClick={()=>onNavigate(register?'/login':'/register')}>{register?'Sign in':'Create an account'}</button></div></div><div className="auth-right-bottom"><span>Find your focus. Keep your pace.</span><span>✳</span></div></section></main>;
}function Onboarding({theme,setTheme,selected,onSelect,onContinue,user}) {return <main className="setup-page"><div className="setup-top"><a className="brand"><span className="brand-mark">m.</span><span className="brand-name">masterji</span></a><ThemeButton theme={theme} setTheme={setTheme}/></div><div className="setup-wrap"><div className="setup-progress"><span className="setup-step active">01 <i/> GOAL</span><span className="progress-line"/><span className="setup-step">02 <i/> PLAN</span></div><div className="setup-spark">✳</div><div className="setup-eyebrow"><span/> HI {user.name.split(' ')[0].toUpperCase()}</div><h1>What are you<br/>preparing <span>for?</span></h1><p className="setup-sub">Choose one exam to shape your study space.</p><div className="exam-options">{exams.map((e,i)=><button key={e} className={`exam-option ${selected===e?'chosen':''}`} onClick={()=>onSelect(e)}><span className="exam-option-number">0{i+1}</span><span className="exam-option-copy"><strong>{e}</strong><small>{seed[e].full}</small></span><span className="exam-radio">{selected===e&&<span/>}</span></button>)}</div><div className="setup-bottom"><span><ShieldCheck size={15}/> One focus at a time</span><button onClick={onContinue} disabled={!selected}>Continue <ArrowRight size={16}/></button></div></div><div className="setup-footer"><span>© 2025 Masterji</span><span>✳</span></div><div className="setup-decoration">✦</div></main>}

createRoot(document.getElementById('root')).render(<App/>);
