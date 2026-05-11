'use client'
import { useEffect, useState, useRef } from 'react'
import { getSupabase } from '@/lib/supabase'
import { normalizePrice, normalizeBeds, normalizeBaths, normalizeLease, normalizeConcessions } from '@/lib/normalize'

type Listing = {
  id?: string
  neighborhood: string
  full_address: string
  price: string
  beds: string
  baths: string
  lease_length: string
  concessions: string
  op_paid: boolean
  description: string
  amenities: string[]
  photos: string[]
  private_photos: string[]
  status: string
  badge: string
}

type Inquiry = {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  neighborhood: string
  budget: string
  message: string
  inquiry_type: string
  status: string
  notes: string
  created_at: string
}

const EMPTY: Listing = {
  neighborhood:'',full_address:'',price:'',beds:'',baths:'',
  lease_length:'',concessions:'',op_paid:false,description:'',
  amenities:[],photos:[],private_photos:[],status:'draft',badge:''
}

const AMENITIES = [
  'Basketball court','Bike storage','Central A/C','City views',
  'Co-working space','Communal lounge','Concierge','Dishwasher','Doorman',
  'Elevator','Full gym','Great natural light','Hardwood floors',
  'Heat included','High-speed WiFi','Hot water included','In-unit laundry',
  'Laundry in building','Package room','Parking available','Pet friendly',
  'Penthouse floor','Private balcony','Private elevator','Private terrace',
  'Renovated bathroom','Renovated kitchen','Resident lounge','Rooftop access',
  'Sauna','Storage unit','Theater room','Virtual doorman','Wine chiller'
].sort()

const G='#B8975A',INK='#111110',R='#E2E0DA',OFF='#F8F7F4',PAPER='#F2F1ED',BL='#1B3A6B',DNG='#C0392B'
const F="system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"
const SF="Georgia,serif"
const I={width:'100%',background:OFF,border:`1px solid ${R}`,color:INK,fontFamily:F,fontSize:'13px',padding:'8px 12px',outline:'none',boxSizing:'border-box'} as React.CSSProperties
const L={display:'block',fontSize:'10px',fontWeight:600,letterSpacing:'0.14em',textTransform:'uppercase' as const,color:'#9B9B98',marginBottom:'4px',fontFamily:F}
const PB={background:INK,color:'#fff',fontFamily:F,fontSize:'11px',fontWeight:600,letterSpacing:'0.12em',textTransform:'uppercase' as const,padding:'8px 16px',border:'none',cursor:'pointer'} as React.CSSProperties
const GB={background:'#fff',color:'#6B6B68',fontFamily:F,fontSize:'11px',padding:'8px 14px',border:`1px solid ${R}`,cursor:'pointer'} as React.CSSProperties

function SBI({label,active,click,badge,closeSidebar}:{label:string,active:boolean,click:()=>void,badge?:number,closeSidebar?:()=>void}){
  return <div onClick={()=>{click();closeSidebar&&closeSidebar()}} style={{padding:'10px 20px',fontSize:'13px',fontWeight:active?700:400,color:'#fff',borderLeft:active?`3px solid ${G}`:'3px solid transparent',background:active?'rgba(255,255,255,0.1)':'transparent',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',userSelect:'none',fontFamily:F}}>
    <span>{label}</span>
    {badge?<span style={{background:G,color:'#fff',fontSize:'11px',fontWeight:700,padding:'1px 7px',borderRadius:'10px'}}>{badge}</span>:null}
  </div>
}
function SBS({label}:{label:string}){
  return <div style={{padding:'14px 20px 4px',fontSize:'10px',fontWeight:700,letterSpacing:'0.2em',textTransform:'uppercase' as const,color:'rgba(255,255,255,0.35)',fontFamily:F}}>{label}</div>
}
function Card({children,style}:{children:React.ReactNode,style?:React.CSSProperties}){
  return <div style={{background:'#fff',border:`1px solid ${R}`,padding:'1.5rem',...style}}>{children}</div>
}
function CardTitle({title}:{title:string}){
  return <div style={{fontSize:'10px',fontWeight:600,letterSpacing:'0.16em',textTransform:'uppercase' as const,color:'#9B9B98',marginBottom:'1rem',fontFamily:F}}>{title}</div>
}
function Row({children}:{children:React.ReactNode}){
  return <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>{children}</div>
}
function Field({label,children}:{label:string,children:React.ReactNode}){
  return <div><label style={L}>{label}</label>{children}</div>
}

export default function Admin(){
  const [authed,setAuthed]=useState(false)
  const [sidebarOpen,setSidebarOpen]=useState(false)
  const [loginEmail,setLoginEmail]=useState('')
  const [loginPw,setLoginPw]=useState('')
  const [loginErr,setLoginErr]=useState('')
  const [loginLoad,setLoginLoad]=useState(false)
  const [tab,setTab]=useState('dashboard')
  const [tabHist,setTabHist]=useState<string[]>([])
  const [listings,setListings]=useState<Listing[]>([])
  const [inquiries,setInquiries]=useState<Inquiry[]>([])
  const [newInq,setNewInq]=useState(0)
  const [form,setForm]=useState<Listing>(EMPTY)
  const [editId,setEditId]=useState<string|null>(null)
  const [saveStatus,setSaveStatus]=useState('')
  const [mFilter,setMFilter]=useState('all')
  const [iFilter,setIFilter]=useState('all')
  const [bio,setBio]=useState('')
  const [pPhone,setPPhone]=useState('')
  const [pEmail,setPEmail]=useState('')
  const [photoUrl,setPhotoUrl]=useState('/leo-headshot.jpg')
  const [bQ1,setBQ1]=useState('')
  const [bQ2,setBQ2]=useState('')
  const [bQ3,setBQ3]=useState('')
  const [bioGen,setBioGen]=useState(false)
  const [profSaved,setProfSaved]=useState(false)
  const [photoUp,setPhotoUp]=useState(false)
  const [listingPhotoUp,setListingPhotoUp]=useState(false)
  const [photoOrder,setPhotoOrder]=useState<number[]>([])
  const [expandInq,setExpandInq]=useState<string|null>(null)
  const [inqNotes,setInqNotes]=useState<Record<string,string>>({})
  const [inqNotesList,setInqNotesList]=useState<Record<string,{id:string,text:string,created_at:string}[]>>({})
  const [noteSaved,setNoteSaved]=useState<Record<string,boolean>>({})
  const [editingNote,setEditingNote]=useState<Record<string,string|null>>({})
  const [editingNoteText,setEditingNoteText]=useState<Record<string,string>>({})
  const [descGen,setDescGen]=useState(false)
  const [hoodLoad,setHoodLoad]=useState(false)
  const [extraNotes,setExtraNotes]=useState('')
  const [customAm,setCustomAm]=useState('')
  const [compose,setCompose]=useState<Record<string,{type:string,text:string,load:boolean}>>({})
  const photoRef=useRef<HTMLInputElement>(null)
  const phoneRef=useRef<HTMLInputElement>(null)
  const emailRef=useRef<HTMLInputElement>(null)

  useEffect(()=>{getSupabase().auth.getSession().then(({data})=>{if(data.session){setAuthed(true);loadAll()}})},[])

  function nav(t:string){setTabHist(p=>[...p,tab]);setTab(t)}
  function back(){setTabHist(p=>{const h=[...p];const l=h.pop();if(l)setTab(l);return h})}

  async function doLogin(e:React.FormEvent){
    e.preventDefault();setLoginLoad(true);setLoginErr('')
    const{error}=await getSupabase().auth.signInWithPassword({email:loginEmail,password:loginPw})
    setLoginLoad(false)
    if(error){setLoginErr('Incorrect email or password.');return}
    setAuthed(true);loadAll()
  }

  async function loadAll(){
    const[{data:l},{data:i},{data:p}]=await Promise.all([
      getSupabase().from('listings').select('*').order('created_at',{ascending:false}),
      getSupabase().from('inquiries').select('*').order('created_at',{ascending:false}),
      getSupabase().from('profile').select('*').limit(1).single()
    ])
    setListings(l||[]);setInquiries(i||[])
    setNewInq((i||[]).filter((x:Inquiry)=>x.status==='new').length)
    const n:Record<string,string>={}
    const nl:Record<string,{id:string,text:string,created_at:string}[]>={}
    ;(i||[]).forEach((x:Inquiry)=>{
      n[x.id]=''
      try{ nl[x.id]=JSON.parse(x.notes||'[]') }catch(e){ 
        if(x.notes&&x.notes.trim()) nl[x.id]=[{id:'legacy',text:x.notes,created_at:x.created_at}]
        else nl[x.id]=[]
      }
    })
    setInqNotes(n)
    setInqNotesList(nl)
    if(p){setBio(p.bio_text||'');setPPhone(p.phone||'');setPEmail(p.email||'');setPhotoUrl(p.photo_url||'/leo-headshot.jpg')}
  }

  function toggleAm(a:string){setForm(p=>({...p,amenities:p.amenities.includes(a)?p.amenities.filter(x=>x!==a):[...p.amenities,a]}))}
  function addCustomAm(){if(!customAm.trim())return;setForm(p=>({...p,amenities:[...p.amenities,customAm.trim()]}));setCustomAm('')}

  function setF(key:string,val:string){setForm(p=>({...p,[key]:val}))}
  function normBlur(key:string,fn:(v:string)=>string){return{onBlur:(e:React.FocusEvent<HTMLInputElement>)=>setF(key,fn(e.target.value))};}

  async function deriveHood(address:string){
    if(!address)return;setHoodLoad(true)
    try{
      const res=await fetch('/api/derive-neighborhood',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({address})})
      const d=await res.json();if(d.neighborhood)setF('neighborhood',d.neighborhood)
    }catch(e){console.error(e)}
    setHoodLoad(false)
  }

  async function genDesc(){
    if(!form.neighborhood&&!form.full_address){alert('Add an address first.');return}
    setDescGen(true)
    try{
      const res=await fetch('/api/generate-description',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({neighborhood:form.neighborhood,beds:form.beds,baths:form.baths,price:form.price,lease:form.lease_length,concessions:form.concessions,op_paid:form.op_paid,amenities:form.amenities.join(', '),notes:extraNotes})})
      const d=await res.json();if(d.description)setF('description',d.description)
    }catch(e){console.error(e)}
    setDescGen(false)
  }

  async function doCompose(iid:string,type:string,inq:Inquiry){
    const key=`${iid}-${type}`
    setCompose(p=>({...p,[key]:{type,text:'',load:true}}))
    try{
      const res=await fetch('/api/compose-message',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type,inquiry:inq})})
      if(!res.ok){setCompose(p=>({...p,[key]:{type,text:`Error: ${res.status} ${res.statusText}`,load:false}}));return}
      const d=await res.json()
      console.log('compose response:',d)
      setCompose(p=>({...p,[key]:{type,text:d.message||'No message returned',load:false}}))
    }catch(e){
      console.error('compose error:',e)
      setCompose(p=>({...p,[key]:{type,text:'Network error. Check console.',load:false}}))
    }
  }

  async function toJpegBlob(file:File):Promise<Blob>{
    const isHeic=file.type==='image/heic'||file.type==='image/heif'||file.name.toLowerCase().endsWith('.heic')||file.name.toLowerCase().endsWith('.heif')
    if(isHeic){
      // Send to server for conversion
      const fd=new FormData();fd.append('file',file)
      const res=await fetch('/api/convert-image',{method:'POST',body:fd})
      if(!res.ok)throw new Error('server conversion failed')
      return await res.blob()
    }
    // Canvas conversion for JPG/PNG/WEBP
    return new Promise((res,rej)=>{
      const img=new Image(),url=URL.createObjectURL(file)
      img.onload=()=>{
        const c=document.createElement('canvas')
        c.width=img.naturalWidth;c.height=img.naturalHeight
        c.getContext('2d')!.drawImage(img,0,0)
        c.toBlob(b=>{URL.revokeObjectURL(url);b?res(b):rej(new Error('canvas fail'))},'image/jpeg',0.92)
      }
      img.onerror=()=>{URL.revokeObjectURL(url);rej(new Error('load fail'))}
      img.src=url
    })
  }

  async function uploadListingPhotos(e:React.ChangeEvent<HTMLInputElement>){
    const files=e.target.files;if(!files||files.length===0)return
    setListingPhotoUp(true)
    const uploaded:string[]=[]
    for(let i=0;i<files.length;i++){
      const file=files[i]
      try{
        const jpeg=await toJpegBlob(file)
        const path=`listings/${Date.now()}-${i}.jpg`
        const{error}=await getSupabase().storage.from('listing-photos').upload(path,jpeg,{upsert:true,contentType:'image/jpeg'})
        if(!error){
          const{data}=getSupabase().storage.from('listing-photos').getPublicUrl(path)
          uploaded.push(data.publicUrl)
        } else {
          console.error('upload error:',JSON.stringify(error))
        }
      }catch(err){console.error('photo error:',err)}
    }
    setForm(p=>({...p,photos:[...p.photos,...uploaded]}))
    setListingPhotoUp(false)
    e.target.value=''
  }

  async function saveListing(status:string){
    setSaveStatus('saving')
    // Apply photo order if set, otherwise keep current order
    let orderedPhotos = [...form.photos]
    if(photoOrder.length > 0){
      const ordered = photoOrder.filter(i=>i<form.photos.length).map(i=>form.photos[i])
      const unordered = form.photos.filter((_,i)=>!photoOrder.includes(i))
      orderedPhotos = [...ordered, ...unordered]
    }
    const payload={...form,photos:orderedPhotos,op_paid:true,status}
    const{error}=editId?await getSupabase().from('listings').update(payload).eq('id',editId):await getSupabase().from('listings').insert([payload])
    if(error){setSaveStatus('error');return}
    setSaveStatus('saved');loadAll()
    setTimeout(()=>{setSaveStatus('');setForm(EMPTY);setEditId(null);setExtraNotes('');setTab('manage')},1200)
  }

  async function delListing(id:string){
    if(!confirm('Delete this listing?'))return
    await getSupabase().from('listings').delete().eq('id',id);loadAll()
  }

  function editL(l:Listing){setForm({...l,amenities:Array.isArray(l.amenities)?l.amenities:[],private_photos:Array.isArray(l.private_photos)?l.private_photos:[]});setEditId(l.id||null);setPhotoOrder([]);nav('add')}

  async function updInqStatus(id:string,status:string){await getSupabase().from('inquiries').update({status}).eq('id',id);loadAll()}
  async function loadNotes(id:string, raw:string){
    try{ return JSON.parse(raw||'[]') }catch(e){ 
      // migrate old string notes to new format
      if(raw&&raw.trim()) return [{id:Date.now().toString(),text:raw,created_at:new Date().toISOString()}]
      return []
    }
  }

  async function addNote(inqId:string){
    const text=inqNotes[inqId]||''
    if(!text.trim())return
    const existing=inqNotesList[inqId]||[]
    const newNote={id:Date.now().toString(),text:text.trim(),created_at:new Date().toISOString()}
    const updated=[newNote,...existing]
    const{error}=await getSupabase().from('inquiries').update({notes:JSON.stringify(updated)}).eq('id',inqId)
    if(!error){
      setInqNotesList(p=>({...p,[inqId]:updated}))
      setInqNotes(p=>({...p,[inqId]:''}))
      setNoteSaved(p=>({...p,[inqId]:true}))
      setTimeout(()=>setNoteSaved(p=>({...p,[inqId]:false})),2000)
    }
  }

  async function deleteNote(inqId:string, noteId:string){
    const updated=(inqNotesList[inqId]||[]).filter(n=>n.id!==noteId)
    await getSupabase().from('inquiries').update({notes:JSON.stringify(updated)}).eq('id',inqId)
    setInqNotesList(p=>({...p,[inqId]:updated}))
  }

  async function updateNote(inqId:string, noteId:string, text:string){
    const updated=(inqNotesList[inqId]||[]).map(n=>n.id===noteId?{...n,text}:n)
    await getSupabase().from('inquiries').update({notes:JSON.stringify(updated)}).eq('id',inqId)
    setInqNotesList(p=>({...p,[inqId]:updated}))
    setEditingNote(p=>({...p,[inqId]:null}))
  }

  async function genBio(){
    if(!bQ1&&!bQ2&&!bQ3)return;setBioGen(true)
    try{const res=await fetch('/api/generate-bio',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({q1:bQ1,q2:bQ2,q3:bQ3})});const d=await res.json();setBio(d.bio)}catch(e){console.error(e)}
    setBioGen(false)
  }

  async function saveProf(phoneVal?:string,emailVal?:string){
    const phone=phoneVal??pPhone
    const email=emailVal??pEmail
    const{data:ex}=await getSupabase().from('profile').select('id').limit(1).single()
    const payload={bio_text:bio,phone,email,photo_url:photoUrl}
    let error
    if(ex){
      ({error}=await getSupabase().from('profile').update(payload).eq('id',ex.id))
    } else {
      ({error}=await getSupabase().from('profile').insert([payload]))
    }
    if(error){console.error('profile save error:',error);alert('Save failed: '+error.message);return}
    setProfSaved(true);setTimeout(()=>setProfSaved(false),2000)
  }

  async function uploadPhoto(e:React.ChangeEvent<HTMLInputElement>){
    const file=e.target.files?.[0];if(!file)return;setPhotoUp(true)
    const ext=file.name.split('.').pop()
    const{error}=await getSupabase().storage.from('listing-photos').upload(`profile/leo-photo.${ext}`,file,{upsert:true})
    if(error){console.error(error);setPhotoUp(false);return}
    const{data}=getSupabase().storage.from('listing-photos').getPublicUrl(`profile/leo-photo.${ext}`)
    setPhotoUrl(data.publicUrl);setPhotoUp(false)
  }

  const live=listings.filter(l=>l.status==='live').length
  const draft=listings.filter(l=>l.status==='draft').length
  const rented=listings.filter(l=>l.status==='rented').length
  const filtL=listings.filter(l=>mFilter==='all'||l.status===mFilter)
  const filtI=inquiries.filter(i=>iFilter==='all'||i.inquiry_type===iFilter)
  const tabLabel=tab==='dashboard'?'Overview':tab==='add'?editId?'Edit Listing':'Add New Listing':tab==='manage'?'Manage Listings':tab==='inquiries'?'Inquiries':'My Bio & Story'

  if(!authed) return(
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:INK,padding:'1rem',fontFamily:F}}>
      <div style={{background:'#fff',padding:'2.5rem',width:'100%',maxWidth:'380px'}}>
        <div style={{fontFamily:SF,fontSize:'21px',fontWeight:300,marginBottom:'4px'}}>Leo <em style={{fontStyle:'italic',color:G}}>Williams</em></div>
        <div style={{fontSize:'10px',fontWeight:500,letterSpacing:'0.16em',textTransform:'uppercase',color:'#9B9B98',marginBottom:'2rem',fontFamily:F}}>Admin Dashboard</div>
        <form onSubmit={doLogin}>
          <div style={{marginBottom:'1rem'}}><label style={L}>Email</label><input type="email" required placeholder="leo@leowilliamsnyc.com" value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} style={I}/></div>
          <div style={{marginBottom:'1rem'}}><label style={L}>Password</label><input type="password" required placeholder="••••••••" value={loginPw} onChange={e=>setLoginPw(e.target.value)} style={I}/></div>
          {loginErr&&<div style={{fontSize:'12px',color:DNG,marginBottom:'8px'}}>{loginErr}</div>}
          <button type="submit" disabled={loginLoad} style={{...PB,width:'100%',marginTop:'4px'}}>{loginLoad?'Signing in...':'Sign In'}</button>
        </form>
      </div>
    </div>
  )

  return(
    <div style={{display:'grid',gridTemplateColumns:'220px 1fr',minHeight:'100vh',fontFamily:F}} className="admin-shell">

      {/* MOBILE OVERLAY */}
      <div className={`admin-sidebar-overlay${sidebarOpen?' open':''}`} onClick={()=>setSidebarOpen(false)}/>

      {/* SIDEBAR */}
      <div style={{background:INK,display:'flex',flexDirection:'column',position:'sticky',top:0,height:'100vh',overflowY:'auto'}} className={`admin-sidebar${sidebarOpen?' open':''}`}>
        <div style={{padding:'20px',borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
          <div style={{fontFamily:SF,fontSize:'15px',fontWeight:400,color:'#fff',marginBottom:'3px'}}>Leo <em style={{fontStyle:'italic',color:G}}>Williams</em></div>
          <div style={{fontSize:'10px',letterSpacing:'0.16em',textTransform:'uppercase',color:'rgba(255,255,255,0.3)',fontFamily:F}}>Admin Dashboard</div>
        </div>
        <div style={{flex:1,paddingTop:'8px'}}>
          <SBI label="Overview" active={tab==='dashboard'} click={()=>nav('dashboard')} closeSidebar={()=>setSidebarOpen(false)}/>
          <SBS label="Listings"/>
          <SBI label="Add New Listing" active={tab==='add'} click={()=>{setForm(EMPTY);setEditId(null);setExtraNotes('');nav('add')}} closeSidebar={()=>setSidebarOpen(false)}/>
          <SBI label="Manage Listings" active={tab==='manage'} click={()=>{setMFilter('all');nav('manage')}} closeSidebar={()=>setSidebarOpen(false)}/>
          <SBS label="Inquiries"/>
          <SBI label="All Inquiries" active={tab==='inquiries'} click={()=>nav('inquiries')} badge={newInq||undefined} closeSidebar={()=>setSidebarOpen(false)}/>
          <SBS label="Profile"/>
          <SBI label="My Bio & Story" active={tab==='bio'} click={()=>nav('bio')} closeSidebar={()=>setSidebarOpen(false)}/>
        </div>
        <div style={{padding:'12px 20px',borderTop:'1px solid rgba(255,255,255,0.08)'}}>
          <a href="/" target="_blank" style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'6px',padding:'8px',background:'rgba(255,255,255,0.08)',color:'#fff',textDecoration:'none',fontSize:'12px',fontWeight:600,fontFamily:F,marginBottom:'8px',border:'1px solid rgba(255,255,255,0.12)'}}>
            View Live Site ↗
          </a>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontSize:'11px',color:'rgba(255,255,255,0.3)',fontFamily:F}}>Leo Williams</span>
            <button onClick={async()=>{await getSupabase().auth.signOut();setAuthed(false)}} style={{background:'none',border:'none',color:'rgba(255,255,255,0.3)',fontSize:'11px',cursor:'pointer',padding:0,fontFamily:F}}>Sign Out</button>
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div style={{background:PAPER,overflow:'auto'}}>
        <div style={{background:'#fff',borderBottom:`1px solid ${R}`,padding:'0 2rem',height:'56px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:10}}>
          <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
            <button className="admin-hamburger" onClick={()=>setSidebarOpen(p=>!p)}><span/><span/><span/></button>
            {tabHist.length>0&&<button onClick={back} style={{...GB,padding:'4px 12px',fontSize:'12px'}}>← Back</button>}
            <span style={{fontSize:'14px',fontWeight:600,color:INK,fontFamily:F}}>{tabLabel}</span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:'16px'}}>
            <span style={{fontSize:'12px',color:'#9B9B98',fontFamily:F}}>{live} live · {draft} draft · {rented} rented</span>
            <button onClick={()=>{setForm(EMPTY);setEditId(null);setExtraNotes('');nav('add')}} style={PB}>+ Add Listing</button>
          </div>
        </div>

        <div style={{padding:'2rem'}}>

          {/* DASHBOARD */}
          {tab==='dashboard'&&(
            <div>
              <div className="admin-stats-grid" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'1rem',marginBottom:'2rem'}}>
                {[
                  {label:'Live Listings',value:live,click:()=>{setMFilter('live');nav('manage')}},
                  {label:'Drafts',value:draft,click:()=>{setMFilter('draft');nav('manage')}},
                  {label:'New Inquiries',value:newInq,click:()=>nav('inquiries')},
                  {label:'Rented',value:rented,click:()=>{setMFilter('rented');nav('manage')}},
                ].map(s=>(
                  <div key={s.label} onClick={s.click} style={{background:'#fff',border:`1px solid ${R}`,padding:'1.5rem',cursor:'pointer'}}>
                    <div style={{fontFamily:SF,fontSize:'2.4rem',fontWeight:300,color:BL,lineHeight:1}}>{s.value}</div>
                    <div style={{fontSize:'10px',fontWeight:600,letterSpacing:'0.14em',textTransform:'uppercase',color:'#9B9B98',margin:'6px 0 12px',fontFamily:F}}>{s.label}</div>
                    <div style={{fontSize:'11px',fontWeight:600,color:G,fontFamily:F}}>Manage →</div>
                  </div>
                ))}
              </div>
              <Card>
                <CardTitle title="Recent Listings"/>
                {listings.slice(0,6).map(l=>(
                  <div key={l.id} onClick={()=>editL(l)} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',borderBottom:`1px solid ${R}`,cursor:'pointer'}}>
                    <div>
                      <div style={{fontSize:'13px',fontWeight:500,color:INK,fontFamily:F,marginBottom:'3px'}}>{l.neighborhood} · {l.price}</div>
                      <div style={{fontSize:'12px',color:'#9B9B98',fontFamily:F}}>{l.beds||'Studio'} bed · {l.baths} bath</div>
                    </div>
                    <span style={{fontSize:'10px',fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase',padding:'3px 8px',fontFamily:F,background:l.status==='live'?'#E8F5EE':l.status==='draft'?PAPER:'#F3EEFF',color:l.status==='live'?'#1A6B3A':l.status==='draft'?'#6B6B68':'#7B5EA7'}}>{l.status}</span>
                  </div>
                ))}
                {listings.length===0&&<div style={{textAlign:'center',padding:'2rem',color:'#9B9B98',fontSize:'13px',fontFamily:F}}>No listings yet.</div>}
              </Card>
            </div>
          )}

          {/* ADD / EDIT */}
          {tab==='add'&&(
            <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>

              {/* ADDRESS */}
              <Card>
                <CardTitle title="Address"/>
                <label style={L}>Full Address (private — only neighborhood shown on site)</label>
                <div style={{display:'flex',gap:'8px',marginBottom:'8px'}}>
                  <input value={form.full_address} onChange={e=>setF('full_address',e.target.value)} onBlur={e=>{if(e.target.value&&!form.neighborhood)deriveHood(e.target.value)}} placeholder="e.g. 245 W 75th St, New York, NY 10023" style={{...I,flex:1}}/>
                  <button onClick={()=>deriveHood(form.full_address)} disabled={hoodLoad||!form.full_address} style={{...PB,background:BL,whiteSpace:'nowrap'}}>{hoodLoad?'Detecting...':'Detect'}</button>
                </div>
                {form.neighborhood
                  ?<div style={{display:'flex',alignItems:'center',gap:'8px',padding:'8px 12px',background:'#EEF2F8',border:`1px solid rgba(27,58,107,0.2)`,fontSize:'13px',color:BL,fontWeight:500,fontFamily:F}}>
                    ✓ Neighborhood: <strong>{form.neighborhood}</strong>
                    <button onClick={()=>setF('neighborhood','')} style={{background:'none',border:'none',color:'#9B9B98',cursor:'pointer',fontSize:'11px',marginLeft:'auto',fontFamily:F}}>Edit</button>
                  </div>
                  :<input value={form.neighborhood} onChange={e=>setF('neighborhood',e.target.value)} placeholder="Or type neighborhood manually" style={I}/>
                }
              </Card>

              {/* BASICS */}
              <Card>
                <CardTitle title="Listing Basics"/>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:'1rem'}}>
                  <Field label="Monthly Rent">
                    <input value={form.price} onChange={e=>setF('price',e.target.value)} {...normBlur('price',normalizePrice)} placeholder="e.g. 3400 or $3,400" style={I}/>
                  </Field>
                  <Field label="Bedrooms (blank = Studio)">
                    <input value={form.beds} onChange={e=>setF('beds',e.target.value)} {...normBlur('beds',normalizeBeds)} placeholder="e.g. 2, 2br, 2 bedrooms" style={I}/>
                  </Field>
                  <Field label="Bathrooms">
                    <input value={form.baths} onChange={e=>setF('baths',e.target.value)} {...normBlur('baths',normalizeBaths)} placeholder="e.g. 1, 1.5, 2ba" style={I}/>
                  </Field>
                  <Field label="Lease Length">
                    <input value={form.lease_length} onChange={e=>setF('lease_length',e.target.value)} {...normBlur('lease_length',normalizeLease)} placeholder="e.g. 12, 18mos, flexible" style={I}/>
                  </Field>
                  <Field label="Concessions (optional)">
                    <input value={form.concessions} onChange={e=>setF('concessions',e.target.value)} {...normBlur('concessions',normalizeConcessions)} placeholder="e.g. 1 month free, 2mo" style={I}/>
                  </Field>
                  <Field label="Badge (optional)">
                    <input value={form.badge} onChange={e=>setF('badge',e.target.value)} placeholder="New, Featured, Just Listed..." style={I}/>
                  </Field>
                </div>
  
              </Card>

              {/* PHOTOS */}
              <Card>
                <CardTitle title="Photos"/>
                <label style={{display:'block',cursor:'pointer',border:`2px dashed ${R}`,padding:'2rem',textAlign:'center',background:OFF,marginBottom:'1rem'}}>
                  <input type="file" multiple accept="image/*" onChange={uploadListingPhotos} style={{display:'none'}}/>
                  <div style={{fontSize:'24px',marginBottom:'6px'}}>📷</div>
                  <div style={{fontSize:'13px',fontWeight:600,color:INK,fontFamily:F,marginBottom:'4px'}}>{listingPhotoUp?'Uploading...':'Tap to add photos'}</div>
                  <div style={{fontSize:'11px',color:'#9B9B98',fontFamily:F}}>JPEG · PNG · HEIC · No maximum</div>
                </label>

                {/* PUBLIC PHOTOS */}
                {form.photos.length>0&&(
                  <div style={{marginBottom:'1.5rem'}}>
                    <div style={{fontSize:'10px',fontWeight:700,letterSpacing:'0.14em',textTransform:'uppercase',color:'#9B9B98',marginBottom:'8px',fontFamily:F}}>
                      Public Photos — tap numbers to set order, tap again to remove from order
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(110px,1fr))',gap:'8px'}}>
                      {form.photos.map((photoUrl,photoIdx)=>{
                        const orderPos=photoOrder.indexOf(photoIdx)
                        const isCover=photoOrder[0]===photoIdx||(photoOrder.length===0&&photoIdx===0)
                        return(
                          <div key={photoIdx} style={{position:'relative',aspectRatio:'3/2',overflow:'hidden',background:PAPER,outline:isCover?`2px solid ${G}`:orderPos>=0?`2px solid ${BL}`:'none'}}>
                            <img src={photoUrl} style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>
                            {/* Order badge */}
                            <button onClick={()=>{
                              setPhotoOrder(prev=>{
                                if(prev.includes(photoIdx)) return prev.filter(i=>i!==photoIdx)
                                return [...prev,photoIdx]
                              })
                            }} style={{position:'absolute',top:'4px',left:'4px',background:isCover?G:orderPos>=0?BL:'rgba(0,0,0,0.55)',color:'#fff',border:'none',fontSize:'9px',fontWeight:700,padding:'2px 6px',cursor:'pointer',fontFamily:F,minWidth:'20px'}}>
                              {isCover?'COVER':orderPos>=0?orderPos+1:'#'}
                            </button>
                            {/* Make cover */}
                            {!isCover&&<button onClick={()=>setPhotoOrder(prev=>[photoIdx,...prev.filter(i=>i!==photoIdx)])} style={{position:'absolute',bottom:'4px',left:'4px',background:'rgba(0,0,0,0.55)',color:G,border:`1px solid ${G}`,fontSize:'8px',fontWeight:700,padding:'2px 5px',cursor:'pointer',fontFamily:F}}>Cover</button>}
                            {/* Move to private */}
                            <button onClick={()=>setForm(p=>({...p,photos:p.photos.filter((_,i)=>i!==photoIdx),private_photos:[...p.private_photos,photoUrl]}))} style={{position:'absolute',bottom:'4px',right:'4px',background:'rgba(0,0,0,0.55)',color:'#fff',border:'none',fontSize:'8px',padding:'2px 5px',cursor:'pointer',fontFamily:F}}>🔒</button>
                            {/* Delete */}
                            <button onClick={()=>{setForm(p=>({...p,photos:p.photos.filter((_,i)=>i!==photoIdx)}));setPhotoOrder(prev=>prev.filter(i=>i!==photoIdx).map(i=>i>photoIdx?i-1:i))}} style={{position:'absolute',top:'4px',right:'4px',background:'rgba(0,0,0,0.6)',color:'#fff',border:'none',width:'20px',height:'20px',borderRadius:'50%',cursor:'pointer',fontSize:'12px',lineHeight:'20px',textAlign:'center'}}>×</button>
                          </div>
                        )
                      })}
                    </div>
                    <div style={{fontSize:'11px',color:'#9B9B98',fontFamily:F,marginTop:'6px'}}>{form.photos.length} public photo{form.photos.length!==1?'s':''} · 🔒 moves to private · × deletes</div>
                  </div>
                )}

                {/* PRIVATE PHOTOS */}
                {(form.private_photos||[]).length>0&&(
                  <div>
                    <div style={{fontSize:'10px',fontWeight:700,letterSpacing:'0.14em',textTransform:'uppercase',color:'#9B9B98',marginBottom:'8px',fontFamily:F}}>
                      Private Photos — visible in admin only
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(110px,1fr))',gap:'8px'}}>
                      {(form.private_photos||[]).map((photoUrl,photoIdx)=>(
                        <div key={photoIdx} style={{position:'relative',aspectRatio:'3/2',overflow:'hidden',background:PAPER,border:`1px dashed ${R}`}}>
                          <img src={photoUrl} style={{width:'100%',height:'100%',objectFit:'cover',display:'block',opacity:0.7}}/>
                          <span style={{position:'absolute',top:'4px',left:'4px',background:'rgba(0,0,0,0.6)',color:'#fff',fontSize:'9px',padding:'2px 5px',fontFamily:F}}>🔒</span>
                          {/* Move to public */}
                          <button onClick={()=>setForm(p=>({...p,private_photos:p.private_photos.filter((_,i)=>i!==photoIdx),photos:[...p.photos,photoUrl]}))} style={{position:'absolute',bottom:'4px',left:'4px',background:'rgba(0,0,0,0.55)',color:'#fff',border:'none',fontSize:'8px',padding:'2px 5px',cursor:'pointer',fontFamily:F}}>Make Public</button>
                          {/* Delete */}
                          <button onClick={()=>setForm(p=>({...p,private_photos:p.private_photos.filter((_,i)=>i!==photoIdx)}))} style={{position:'absolute',top:'4px',right:'4px',background:'rgba(0,0,0,0.6)',color:'#fff',border:'none',width:'20px',height:'20px',borderRadius:'50%',cursor:'pointer',fontSize:'12px',lineHeight:'20px',textAlign:'center'}}>×</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>

              {/* AMENITIES */}
              <Card>
                <CardTitle title="Amenities — tap everything that applies"/>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:'8px',marginBottom:'1rem'}}>
                  {AMENITIES.map(a=>{
                    const on=form.amenities.includes(a)
                    return <button key={a} onClick={()=>toggleAm(a)} type="button" style={{padding:'8px 10px',border:`1px solid ${on?BL:R}`,background:on?'#EEF2F8':OFF,color:on?BL:INK,fontSize:'12px',fontWeight:on?600:400,fontFamily:F,cursor:'pointer',textAlign:'left',transition:'all 0.15s'}}>{a}</button>
                  })}
                </div>
                <div style={{borderTop:`1px solid ${R}`,paddingTop:'1rem'}}>
                  <div style={{fontSize:'10px',fontWeight:600,letterSpacing:'0.12em',textTransform:'uppercase',color:'#9B9B98',marginBottom:'8px',fontFamily:F}}>Other — type and add</div>
                  <div style={{display:'flex',gap:'8px'}}>
                    <input value={customAm} onChange={e=>setCustomAm(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addCustomAm()}}} placeholder="e.g. Private terrace, Wine cellar..." style={{...I,flex:1}}/>
                    <button onClick={addCustomAm} style={{...PB,whiteSpace:'nowrap'}}>+ Add</button>
                  </div>
                  {form.amenities.filter(a=>!AMENITIES.includes(a)).length>0&&(
                    <div style={{display:'flex',flexWrap:'wrap',gap:'6px',marginTop:'8px'}}>
                      {form.amenities.filter(a=>!AMENITIES.includes(a)).map(a=>(
                        <span key={a} style={{fontSize:'12px',background:'#EEF2F8',color:BL,border:`1px solid rgba(27,58,107,0.2)`,padding:'3px 8px',fontFamily:F,display:'flex',alignItems:'center',gap:'6px'}}>
                          {a}<button onClick={()=>toggleAm(a)} style={{background:'none',border:'none',color:BL,cursor:'pointer',padding:0,fontSize:'14px',lineHeight:1}}>×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Card>

              {/* DESCRIPTION */}
              <Card>
                <CardTitle title="Description — AI writes it from your details"/>
                <Field label="Anything extra to mention (optional)">
                  <input value={extraNotes} onChange={e=>setExtraNotes(e.target.value)} placeholder="e.g. Great light, renovated kitchen, quiet block, close to 2/3..." style={{...I,marginBottom:'12px'}}/>
                </Field>
                <button onClick={genDesc} disabled={descGen} style={{...PB,background:BL,marginBottom:'1rem'}}>{descGen?'Writing...':'✨ Generate Description with AI'}</button>
                <Field label="Final Description (editable)">
                  <textarea value={form.description} onChange={e=>setF('description',e.target.value)} placeholder="Description appears here after generating, or write your own..." rows={5} style={{...I,resize:'vertical'}}/>
                </Field>
              </Card>

              {/* ACTIONS */}
              <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                <button onClick={()=>saveListing('live')} style={PB}>{saveStatus==='saving'?'Saving...':saveStatus==='saved'?'✓ Published!':'Publish Live'}</button>
                <button onClick={()=>saveListing('draft')} style={GB}>Save Draft</button>
                {editId&&<button onClick={()=>saveListing('rented')} style={{...GB,color:'#7B5EA7',borderColor:'#D9CCF5',background:'#F3EEFF'}}>Mark Rented</button>}
                {editId&&<button onClick={()=>{setForm(EMPTY);setEditId(null);back()}} style={{...GB,color:DNG,borderColor:'#FDECEA'}}>Cancel</button>}
                {saveStatus==='error'&&<span style={{fontSize:'12px',color:DNG,alignSelf:'center',fontFamily:F}}>Something went wrong. Try again.</span>}
              </div>
            </div>
          )}

          {/* MANAGE */}
          {tab==='manage'&&(
            <div>
              <div style={{display:'flex',gap:'8px',marginBottom:'1.5rem',flexWrap:'wrap'}}>
                {(['all','live','draft','rented'] as string[]).map(f=>(
                  <button key={f} onClick={()=>setMFilter(f)} style={{...GB,background:mFilter===f?INK:'#fff',color:mFilter===f?'#fff':'#6B6B68',fontSize:'11px',fontWeight:600,letterSpacing:'0.12em',textTransform:'uppercase',padding:'6px 14px'}}>{f.charAt(0).toUpperCase()+f.slice(1)}</button>
                ))}
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                {filtL.map(l=>(
                  <div key={l.id} style={{background:'#fff',border:`1px solid ${R}`,padding:'1.25rem 1.5rem',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div>
                      <div style={{fontSize:'13px',fontWeight:500,color:INK,fontFamily:F,marginBottom:'3px'}}>{l.neighborhood} · {l.price}</div>
                      <div style={{fontSize:'12px',color:'#9B9B98',fontFamily:F}}>{l.beds||'Studio'} bed · {l.baths} bath · {l.lease_length}{l.op_paid?' · No Fee':''}</div>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                      <span style={{fontSize:'10px',fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase',padding:'3px 8px',fontFamily:F,background:l.status==='live'?'#E8F5EE':l.status==='draft'?PAPER:'#F3EEFF',color:l.status==='live'?'#1A6B3A':l.status==='draft'?'#6B6B68':'#7B5EA7'}}>{l.status}</span>
                      <button onClick={()=>editL(l)} style={{fontSize:'12px',fontWeight:500,color:BL,background:'none',border:'none',cursor:'pointer',fontFamily:F}}>Edit</button>
                      {l.status!=='rented'&&<button onClick={async()=>{await getSupabase().from('listings').update({status:'rented'}).eq('id',l.id!);loadAll()}} style={{fontSize:'12px',fontWeight:500,color:'#7B5EA7',background:'none',border:'none',cursor:'pointer',fontFamily:F}}>Mark Rented</button>}
                      {l.status==='rented'&&<button onClick={async()=>{await getSupabase().from('listings').update({status:'live'}).eq('id',l.id!);loadAll()}} style={{fontSize:'12px',fontWeight:500,color:'#1A6B3A',background:'none',border:'none',cursor:'pointer',fontFamily:F}}>Mark Live</button>}
                      <button onClick={()=>delListing(l.id!)} style={{fontSize:'12px',fontWeight:500,color:DNG,background:'none',border:'none',cursor:'pointer',fontFamily:F}}>Delete</button>
                    </div>
                  </div>
                ))}
                {filtL.length===0&&<div style={{textAlign:'center',padding:'3rem',color:'#9B9B98',fontSize:'13px',background:'#fff',border:`1px solid ${R}`,fontFamily:F}}>No listings found.</div>}
              </div>
            </div>
          )}

          {/* INQUIRIES */}
          {tab==='inquiries'&&(
            <div>
              <div style={{display:'flex',gap:'8px',marginBottom:'1.5rem',flexWrap:'wrap'}}>
                {[{k:'all',l:'All'},{k:'renter',l:'Renters'},{k:'landlord',l:'Landlords & Property Owners'}].map(f=>(
                  <button key={f.k} onClick={()=>setIFilter(f.k)} style={{...GB,background:iFilter===f.k?INK:'#fff',color:iFilter===f.k?'#fff':'#6B6B68',fontSize:'11px',fontWeight:600,letterSpacing:'0.12em',textTransform:'uppercase',padding:'6px 14px'}}>{f.l}</button>
                ))}
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                {filtI.map(inq=>{
                  const expanded=expandInq===inq.id
                  const ek=`${inq.id}-email`,sk=`${inq.id}-sms`
                  return(
                    <div key={inq.id} style={{background:'#fff',border:`1px solid ${expanded?G:R}`}}>
                      <div onClick={()=>setExpandInq(expanded?null:inq.id)} style={{padding:'1.25rem 1.5rem',display:'flex',justifyContent:'space-between',alignItems:'center',cursor:'pointer'}}>
                        <div>
                          <div style={{fontSize:'13px',fontWeight:600,color:INK,fontFamily:F,marginBottom:'3px'}}>{inq.first_name} {inq.last_name}</div>
                          <div style={{fontSize:'12px',color:'#9B9B98',fontFamily:F}}>{inq.inquiry_type==='landlord'?'Landlord / Property Owner':'Renter'} · {inq.neighborhood||'Any'} · {inq.budget||'Flexible'} · {new Date(inq.created_at).toLocaleDateString()}</div>
                        </div>
                        <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                          <span style={{fontSize:'10px',fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase',padding:'3px 8px',fontFamily:F,background:inq.status==='new'?'#EEF2F8':inq.status==='contacted'?'#E8F5EE':PAPER,color:inq.status==='new'?BL:inq.status==='contacted'?'#1A6B3A':'#6B6B68'}}>{inq.status}</span>
                          <span style={{color:'#9B9B98',fontSize:'12px'}}>{expanded?'▲':'▼'}</span>
                        </div>
                      </div>
                      {expanded&&(
                        <div style={{borderTop:`1px solid ${R}`,padding:'1.25rem 1.5rem'}}>
                          {/* CONTACT ACTIONS */}
                          <div style={{display:'flex',gap:'8px',marginBottom:'1.25rem',flexWrap:'wrap',alignItems:'center'}}>
                            {inq.email&&<a href={`mailto:${inq.email}`} style={{...PB,textDecoration:'none',display:'inline-block'}}>✉ Email</a>}
                            {inq.phone&&<a href={`tel:${inq.phone}`} style={{...PB,background:BL,textDecoration:'none',display:'inline-block'}}>📞 Call</a>}
                            {inq.phone&&<a href={`sms:${inq.phone}`} style={{...GB,textDecoration:'none',display:'inline-block'}}>💬 Text</a>}
                            <select value={inq.status} onChange={e=>updInqStatus(inq.id,e.target.value)} style={{marginLeft:'auto',fontSize:'12px',fontFamily:F,background:OFF,border:`1px solid ${R}`,padding:'6px 10px',color:INK,outline:'none'}}>
                              <option value="new">New</option>
                              <option value="contacted">Contacted</option>
                              <option value="closed">Closed</option>
                            </select>
                          </div>

                          {/* CONTACT DETAILS */}
                          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'1rem',fontSize:'13px',color:'#6B6B68',fontFamily:F}}>
                            <div><strong style={{color:INK}}>Email:</strong> {inq.email||'—'}</div>
                            <div><strong style={{color:INK}}>Phone:</strong> {inq.phone||'—'}</div>
                            <div><strong style={{color:INK}}>Neighborhood:</strong> {inq.neighborhood||'Any'}</div>
                            <div><strong style={{color:INK}}>Budget:</strong> {inq.budget||'Flexible'}</div>
                          </div>

                          {inq.message&&<div style={{background:OFF,border:`1px solid ${R}`,padding:'10px 14px',fontSize:'13px',color:'#6B6B68',lineHeight:1.7,marginBottom:'1rem',fontFamily:F}}>{inq.message}</div>}

                          {/* AI COMPOSE */}
                          <div style={{marginBottom:'1rem',background:'#EEF2F8',border:`1px solid rgba(27,58,107,0.15)`,padding:'1rem'}}>
                            <div style={{fontSize:'10px',fontWeight:700,letterSpacing:'0.16em',textTransform:'uppercase',color:BL,marginBottom:'10px',fontFamily:F}}>✨ AI Draft Response</div>
                            <div style={{display:'flex',gap:'8px',marginBottom:'12px'}}>
                              <button onClick={()=>doCompose(inq.id,'email',inq)} disabled={compose[ek]?.load} style={{...PB,background:BL,fontSize:'11px'}}>{compose[ek]?.load?'Writing email...':'Draft Email'}</button>
                              <button onClick={()=>doCompose(inq.id,'sms',inq)} disabled={compose[sk]?.load} style={{...PB,background:'#555',fontSize:'11px'}}>{compose[sk]?.load?'Writing text...':'Draft Text'}</button>
                            </div>
                            {compose[ek]?.text&&(
                              <div style={{marginBottom:'12px',background:'#fff',padding:'12px',border:`1px solid rgba(27,58,107,0.2)`}}>
                                <div style={{fontSize:'10px',fontWeight:700,color:BL,marginBottom:'8px',fontFamily:F,letterSpacing:'0.1em',textTransform:'uppercase'}}>Email Draft</div>
                                <textarea value={compose[ek].text} onChange={e=>setCompose(p=>({...p,[ek]:{...p[ek],text:e.target.value}}))} rows={5} style={{...I,fontSize:'13px',lineHeight:1.8,background:'#fff',marginBottom:'8px'}}/>
                                <a href={`mailto:${inq.email}?body=${encodeURIComponent(compose[ek].text)}`} style={{...PB,background:BL,textDecoration:'none',display:'inline-block',fontSize:'11px'}}>Open in Mail →</a>
                              </div>
                            )}
                            {compose[sk]?.text&&(
                              <div style={{background:'#fff',padding:'12px',border:`1px solid rgba(27,58,107,0.2)`}}>
                                <div style={{fontSize:'10px',fontWeight:700,color:BL,marginBottom:'8px',fontFamily:F,letterSpacing:'0.1em',textTransform:'uppercase'}}>Text Draft</div>
                                <textarea value={compose[sk].text} onChange={e=>setCompose(p=>({...p,[sk]:{...p[sk],text:e.target.value}}))} rows={3} style={{...I,fontSize:'13px',lineHeight:1.8,background:'#fff',marginBottom:'8px'}}/>
                                <a href={`sms:${inq.phone}?body=${encodeURIComponent(compose[sk].text)}`} style={{...PB,background:'#555',textDecoration:'none',display:'inline-block',fontSize:'11px'}}>Open in Messages →</a>
                              </div>
                            )}
                          </div>

                          {/* NOTES */}
                          <div style={{borderTop:`1px solid ${R}`,paddingTop:'1rem',marginTop:'0.5rem'}}>
                            <div style={{fontSize:'10px',fontWeight:700,letterSpacing:'0.16em',textTransform:'uppercase',color:'#9B9B98',marginBottom:'10px',fontFamily:F}}>Internal Notes</div>
                            
                            {/* Existing notes */}
                            {(inqNotesList[inq.id]||[]).length>0&&(
                              <div style={{display:'flex',flexDirection:'column',gap:'8px',marginBottom:'12px'}}>
                                {(inqNotesList[inq.id]||[]).map(note=>(
                                  <div key={note.id} style={{background:OFF,border:`1px solid ${R}`,padding:'10px 12px'}}>
                                    {editingNote[inq.id]===note.id
                                      ?<div>
                                        <textarea value={editingNoteText[note.id]||note.text} onChange={e=>setEditingNoteText(p=>({...p,[note.id]:e.target.value}))} rows={3} style={{...I,fontSize:'12px',marginBottom:'6px',resize:'vertical'}}/>
                                        <div style={{display:'flex',gap:'6px'}}>
                                          <button onClick={()=>updateNote(inq.id,note.id,editingNoteText[note.id]||note.text)} style={{...PB,fontSize:'10px',padding:'4px 10px'}}>Save</button>
                                          <button onClick={()=>setEditingNote(p=>({...p,[inq.id]:null}))} style={{...GB,fontSize:'10px',padding:'4px 10px'}}>Cancel</button>
                                        </div>
                                      </div>
                                      :<div>
                                        <div style={{fontSize:'13px',color:INK,fontFamily:F,lineHeight:1.6,marginBottom:'6px'}}>{note.text}</div>
                                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                                          <div style={{fontSize:'10px',color:'#9B9B98',fontFamily:F}}>{new Date(note.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
                                          <div style={{display:'flex',gap:'8px'}}>
                                            <button onClick={()=>{setEditingNote(p=>({...p,[inq.id]:note.id}));setEditingNoteText(p=>({...p,[note.id]:note.text}))}} style={{fontSize:'11px',color:BL,background:'none',border:'none',cursor:'pointer',fontFamily:F}}>Edit</button>
                                            <button onClick={()=>deleteNote(inq.id,note.id)} style={{fontSize:'11px',color:DNG,background:'none',border:'none',cursor:'pointer',fontFamily:F}}>Delete</button>
                                          </div>
                                        </div>
                                      </div>
                                    }
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Add new note */}
                            <textarea value={inqNotes[inq.id]||''} onChange={e=>setInqNotes(p=>({...p,[inq.id]:e.target.value}))} placeholder="Add a note..." rows={2} style={{...I,resize:'vertical',marginBottom:'6px',fontSize:'13px'}}/>
                            <button onClick={()=>addNote(inq.id)} style={{...PB,fontSize:'11px',padding:'6px 14px'}}>{noteSaved[inq.id]?'✓ Note Added':'Add Note'}</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
                {filtI.length===0&&<div style={{textAlign:'center',padding:'3rem',color:'#9B9B98',fontSize:'13px',background:'#fff',border:`1px solid ${R}`,fontFamily:F}}>No inquiries found.</div>}
              </div>
            </div>
          )}

          {/* BIO */}
          {tab==='bio'&&(
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:'1.5rem'}}>
              <div style={{display:'flex',flexDirection:'column',gap:'1.5rem'}}>
                <Card>
                  <CardTitle title="Profile Photo"/>
                  {photoUrl?<img src={photoUrl} alt="Profile" style={{width:'130px',height:'160px',objectFit:'cover',objectPosition:'center top',marginBottom:'1rem',display:'block',border:`1px solid ${R}`}}/>:<div style={{width:'130px',height:'160px',background:PAPER,border:`1px solid ${R}`,marginBottom:'1rem',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',color:'#9B9B98',fontFamily:F}}>No photo</div>}
                  <input ref={photoRef} type="file" accept="image/*" onChange={uploadPhoto} style={{display:'none'}}/>
                  <button onClick={()=>photoRef.current?.click()} disabled={photoUp} style={{...PB,fontSize:'11px',display:'block',marginBottom:'6px'}}>{photoUp?'Uploading...':photoUrl&&photoUrl!=='/leo-headshot.jpg'?'Replace Photo':'Upload Photo'}</button>
                  <div style={{fontSize:'11px',color:'#9B9B98',fontFamily:F}}>Appears on the public About section.</div>
                </Card>
                <Card>
                  <CardTitle title="Contact Details"/>
                  <div style={{marginBottom:'12px'}}><label style={L}>Phone</label>
                    <input type="tel" value={pPhone} onChange={e=>setPPhone(e.target.value)} placeholder="(212) 555-0100" style={{...I,background:'#fff'}}/>
                  </div>
                  <div style={{marginBottom:'16px'}}><label style={L}>Email</label>
                    <input type="email" value={pEmail} onChange={e=>setPEmail(e.target.value)} placeholder="leo@leowilliamsnyc.com" style={{...I,background:'#fff'}}/>
                  </div>
                  <button onClick={()=>saveProf(pPhone,pEmail)} style={PB}>{profSaved?'✓ Saved!':'Save Profile'}</button>
                </Card>
              </div>
              <Card>
                <CardTitle title="Generate Bio with AI"/>
                {[
                  {label:"What brought you to NYC real estate?",value:bQ1,set:setBQ1},
                  {label:"What makes you different from other agents?",value:bQ2,set:setBQ2},
                  {label:"What do your clients say about working with you?",value:bQ3,set:setBQ3},
                ].map((q,idx)=>(
                  <div key={idx} style={{marginBottom:'1rem'}}>
                    <label style={{...L,textTransform:'none',letterSpacing:0,fontSize:'12px',color:'#6B6B68'}}>{q.label}</label>
                    <textarea value={q.value} onChange={e=>q.set(e.target.value)} rows={2} style={{...I,resize:'vertical'}}/>
                  </div>
                ))}
                <button onClick={genBio} disabled={bioGen} style={{...PB,background:BL,marginBottom:'1.5rem'}}>{bioGen?'Generating...':'✨ Generate Bio'}</button>
                <label style={L}>Bio Text</label>
                <textarea value={bio} onChange={e=>setBio(e.target.value)} rows={8} placeholder="Your bio will appear here..." style={{...I,resize:'vertical',marginBottom:'1rem'}}/>
                <button onClick={()=>saveProf()} style={PB}>{profSaved?'✓ Saved!':'Save Bio'}</button>
              </Card>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
