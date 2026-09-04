import {useEffect,useState} from 'react';
import {createClient} from '@supabase/supabase-js';
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const supabase = url && key ? createClient(url,key) : null;
const input = {display:'block',boxSizing:'border-box',width:'100%',padding:12,margin:'8px 0 18px',fontSize:16,border:'1px solid #A8C5B0',borderRadius:8};
export function AuthGate({children}) {
  const [session,setSession]=useState(null), [checking,setChecking]=useState(true), [allowed,setAllowed]=useState(false);
  const [email,setEmail]=useState(''), [password,setPassword]=useState(''), [error,setError]=useState(''), [busy,setBusy]=useState(false);
  useEffect(()=>{
    if(!supabase){setChecking(false);return;}
    let stopped=false;
    supabase.auth.getSession().then(({data,error})=>{if(!stopped){if(error)setError(error.message);setSession(data.session);setChecking(false);}});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,next)=>{setSession(next);setChecking(false);});
    return ()=>{stopped=true;subscription.unsubscribe();};
  },[]);
  useEffect(()=>{
    setAllowed(false);
    if(!session || !supabase)return;
    let stopped=false; setChecking(true);
    supabase.from('cv_staff').select('active').eq('user_id',session.user.id).maybeSingle().then(({data,error})=>{
      if(stopped)return;
      setAllowed(data?.active===true);setChecking(false);
      setError(error?'No se pudo verificar tu acceso. Intentá ingresar nuevamente.':data?.active?'':'Tu cuenta todavía no tiene acceso al servicio. Contactá a coordinación.');
    });
    return ()=>{stopped=true;};
  },[session?.user.id]);
  async function signIn(e){
    e.preventDefault();setBusy(true);setError('');
    try{const {error}=await supabase.auth.signInWithPassword({email:email.trim(),password});if(error)setError('No se pudo iniciar sesión. Revisá el correo y la contraseña.');else setPassword('');}
    catch{setError('No se pudo conectar. Volvé a intentar.');}
    finally{setBusy(false);}
  }
  if(session && allowed && !checking)return children;
  return <main style={{fontFamily:'system-ui',background:'#F4F0EB',minHeight:'100vh',display:'grid',placeItems:'center',padding:20,boxSizing:'border-box'}}>
    <section style={{maxWidth:420,width:'100%',background:'white',padding:28,borderRadius:16,boxSizing:'border-box',color:'#1E3A2F'}}>
      <h1>Casa Verde — TO</h1><p>Coordinación de Terapia Ocupacional</p>
      {!supabase?<p role="alert">Falta configurar la conexión de esta instalación.</p>:checking?<p role="status">Verificando acceso…</p>:session?<>
        <p role="alert">{error || 'Verificando autorización…'}</p><button onClick={()=>supabase.auth.signOut()}>Volver al inicio de sesión</button>
      </>:<form onSubmit={signIn}>
        <label>Correo del equipo<input style={input} type="email" required autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)}/></label>
        <label>Contraseña<input style={input} type="password" required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}/></label>
        {error && <p role="alert">{error}</p>}
        <button disabled={busy} style={{...input,background:'#2F5741',color:'white',cursor:'pointer'}}>{busy?'Ingresando…':'Ingresar'}</button>
        <p>Si necesitás acceso o restablecer tu contraseña, contactá a coordinación.</p>
      </form>}
    </section>
  </main>;
}
