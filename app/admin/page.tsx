'use client'
import { useEffect, useState, useRef } from 'react'
import { getSupabase } from '@/lib/supabase'

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
  amenities: string | string[]
  photos: string[]
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
  amenities:'',photos:[],status:'draft',badge:''
}

const GOLD='#B8975A', INK='#111110', RULE='#E2E0DA', OFF='#F8F7F4'
const PAPER='#F2F1ED', BLUE='#1B3A6B', DANGER='#C0392B'
const FONT = "'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif"
const SERIF = "'Cormorant Garamond', Georgia, serif"

const s = {
  inp: {width:'100%',background:OFF,border:`1px solid ${RULE}`,color:INK,fontFamily:FONT,fontSize:'0.8rem',padding:'0.6rem 0.85rem',outline:'none',boxSizing:'border-box'} as React.CSSProperties,
  label: {display:'block',fontSize:'0.52rem',fontWeight:600,letterSpacing:'0.14em',textTransform:'uppercase',color:'#9B9B98',marginBottom:'0.3rem',fontFamily:FONT} as React.CSSProperties,
  btn: {background:INK,color:'#fff',fontFamily:FONT,fontSize:'0.6rem',fontWeight:600,letterSpacing:'0.16em',textTransform:'uppercase',padding:'0.7rem 1.4rem',border:'none',cursor:'pointer'} as React.CSSProperties,
  btnGhost: {background:'#fff',color:'#6B6B68',fontFamily:FONT,fontSize:'0.6rem',padding:'0.7rem 1.2rem',border:`1px solid ${RULE}`,cursor:'pointer'} as React.CSSProperties,
}

export default function Admin() {
  const [authed, setAuthed] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [tab, setTab] = useState('dashboard')
  const [tabHistory, setTabHistory] = useState<string[]>([])
  const [listings, setListings] = useState<Listing[]>([])
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [newInquiries, setNewInquiries] = useState(0)
  const [form, setForm] = useState<Listing>(EMPTY)
  const [editId, setEditId] = useState<string|null>(null)
  const [saveStatus, setSaveStatus] = useState('')
  const [manageFilter, setManageFilter] = useState('all')
  const [inquiryFilter, setInquiryFilter] = useState('all')
  const [bio, setBio] = useState('')
  const [phone, setPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [photoUrl, setPhotoUrl] = useState('/leo-headshot.jpg')
  const [bioQ1, setBioQ1] = useState('')
  const [bioQ2, setBioQ2] = useState('')
  const [bioQ3, setBioQ3] = useState('')
  const [bioGenerating, setBioGenerating] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [expandedInquiry, setExpandedInquiry] = useState<string|null>(null)
  const [inquiryNotes, setInquiryNotes] = useState<Record<string,string>>({})
  const photoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getSupabase().auth.getSession().then(({ data }) => {
      if (data.session) { setAuthed(true); loadAll() }
    })
  }, [])

  function navTo(t: string) {
    setTabHistory(prev => [...prev, tab])
    setTab(t)
  }

  function goBack() {
    setTabHistory(prev => {
      const h = [...prev]
      const last = h.pop()
      if (last) setTab(last)
      return h
    })
  }

  async function doLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoginLoading(true); setLoginError('')
    const { error } = await getSupabase().auth.signInWithPassword({ email, password })
    setLoginLoading(false)
    if (error) { setLoginError('Incorrect email or password.'); return }
    setAuthed(true); loadAll()
  }

  async function loadAll() {
    const [{ data: l }, { data: i }, { data: p }] = await Promise.all([
      getSupabase().from('listings').select('*').order('created_at', { ascending: false }),
      getSupabase().from('inquiries').select('*').order('created_at', { ascending: false }),
      getSupabase().from('profile').select('*').limit(1).single()
    ])
    setListings(l || [])
    setInquiries(i || [])
    setNewInquiries((i||[]).filter((x:Inquiry) => x.status === 'new').length)
    const notes: Record<string,string> = {}
    ;(i||[]).forEach((x:Inquiry) => { notes[x.id] = x.notes || '' })
    setInquiryNotes(notes)
    if (p) { setBio(p.bio_text||''); setPhone(p.phone||''); setContactEmail(p.email||''); setPhotoUrl(p.photo_url||'') }
  }

  async function saveListing(status: string) {
    setSaveStatus('saving')
    const payload = { ...form, status, amenities: typeof form.amenities==='string' ? form.amenities.split(',').map(a=>a.trim()).filter(Boolean) : form.amenities }
    const { error } = editId
      ? await getSupabase().from('listings').update(payload).eq('id', editId)
      : await getSupabase().from('listings').insert([payload])
    if (error) { setSaveStatus('error'); return }
    setSaveStatus('saved')
    setTimeout(() => { setSaveStatus(''); setForm(EMPTY); setEditId(null); setTab('manage') }, 1200)
    loadAll()
  }

  async function deleteListing(id: string) {
    if (!confirm('Delete this listing?')) return
    await getSupabase().from('listings').delete().eq('id', id)
    loadAll()
  }

  function editListing(l: Listing) {
    setForm({ ...l, amenities: Array.isArray(l.amenities) ? l.amenities.join(', ') : l.amenities||'' })
    setEditId(l.id||null)
    navTo('add')
  }

  async function updateInquiryStatus(id: string, status: string) {
    await getSupabase().from('inquiries').update({ status }).eq('id', id)
    loadAll()
  }

  async function saveNotes(id: string) {
    await getSupabase().from('inquiries').update({ notes: inquiryNotes[id]||'' }).eq('id', id)
  }

  async function generateBio() {
    if (!bioQ1 && !bioQ2 && !bioQ3) return
    setBioGenerating(true)
    try {
      const res = await fetch('/api/generate-bio', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({q1:bioQ1,q2:bioQ2,q3:bioQ3}) })
      const data = await res.json()
      setBio(data.bio)
    } catch(e) { console.error(e) }
    setBioGenerating(false)
  }

  async function saveProfile() {
    const { data: existing } = await getSupabase().from('profile').select('id').limit(1).single()
    const payload = { bio_text:bio, phone, email:contactEmail, photo_url:photoUrl }
    existing ? await getSupabase().from('profile').update(payload).eq('id', existing.id) : await getSupabase().from('profile').insert([payload])
    setProfileSaved(true); setTimeout(()=>setProfileSaved(false), 2000)
  }

  async function uploadPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setPhotoUploading(true)
    const ext = file.name.split('.').pop()
    const { error } = await getSupabase().storage.from('listing-photos').upload(`profile/leo-photo.${ext}`, file, { upsert:true })
    if (error) { console.error(error); setPhotoUploading(false); return }
    const { data } = getSupabase().storage.from('listing-photos').getPublicUrl(`profile/leo-photo.${ext}`)
    setPhotoUrl(data.publicUrl); setPhotoUploading(false)
  }

  const filteredListings = listings.filter(l => manageFilter==='all'||l.status===manageFilter)
  const filteredInquiries = inquiries.filter(i => inquiryFilter==='all'||i.inquiry_type===inquiryFilter)
  const live=listings.filter(l=>l.status==='live').length
  const draft=listings.filter(l=>l.status==='draft').length
  const rented=listings.filter(l=>l.status==='rented').length

  const tabLabel = tab==='dashboard'?'Overview':tab==='add'?editId?'Edit Listing':'Add New Listing':tab==='manage'?'Manage Listings':tab==='inquiries'?'Inquiries':'My Bio & Story'

  if (!authed) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:INK,padding:'1rem',fontFamily:FONT}}>
      <div style={{background:'#fff',padding:'2.5rem',width:'100%',maxWidth:'380px'}}>
        <div style={{fontFamily:SERIF,fontSize:'1.3rem',fontWeight:300,marginBottom:'0.3rem'}}>Leo <em style={{fontStyle:'italic',color:GOLD}}>Williams</em></div>
        <div style={{fontSize:'0.6rem',fontWeight:500,letterSpacing:'0.16em',textTransform:'uppercase',color:'#9B9B98',marginBottom:'2rem',fontFamily:FONT}}>Admin Dashboard</div>
        <form onSubmit={doLogin}>
          <div style={{marginBottom:'1rem'}}><label style={s.label}>Email</label><input type="email" required placeholder="leo@leowilliamsnyc.com" value={email} onChange={e=>setEmail(e.target.value)} style={s.inp} /></div>
          <div style={{marginBottom:'1rem'}}><label style={s.label}>Password</label><input type="password" required placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} style={s.inp} /></div>
          {loginError && <div style={{fontSize:'0.68rem',color:DANGER,marginBottom:'0.5rem',fontFamily:FONT}}>{loginError}</div>}
          <button type="submit" disabled={loginLoading} style={{...s.btn,width:'100%',marginTop:'0.25rem'}}>{loginLoading?'Signing in...':'Sign In'}</button>
        </form>
      </div>
    </div>
  )

  return (
    <div style={{display:'grid',gridTemplateColumns:'220px 1fr',minHeight:'100vh',fontFamily:FONT}}>
      {/* SIDEBAR */}
      <aside style={{background:INK,display:'flex',flexDirection:'column',position:'sticky',top:0,height:'100vh',overflowY:'auto'}}>
        {/* LOGO */}
        <div style={{padding:'1.25rem',borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
          <div style={{fontFamily:SERIF,fontSize:'1.05rem',fontWeight:300,color:'#fff',marginBottom:'3px'}}>Leo <em style={{fontStyle:'italic',color:GOLD}}>Williams</em></div>
          <div style={{fontSize:'0.52rem',letterSpacing:'0.16em',textTransform:'uppercase',color:'rgba(255,255,255,0.28)',fontFamily:FONT}}>Admin Dashboard</div>
        </div>

        {/* NAV */}
        <nav style={{flex:1,paddingTop:'0.5rem'}}>
          <div onClick={()=>navTo('dashboard')} style={{padding:'0.72rem 1.25rem',fontSize:'0.72rem',fontWeight:tab==='dashboard'?700:400,color:'#ffffff',textDecoration:'none',borderLeft:tab==='dashboard'?`3px solid ${GOLD}`:'3px solid transparent',background:tab==='dashboard'?'rgba(255,255,255,0.1)':'transparent',cursor:'pointer',userSelect:'none'}}>Overview</div>

          <div style={{padding:'0.85rem 1.25rem 0.25rem',fontSize:'0.5rem',fontWeight:700,letterSpacing:'0.2em',textTransform:'uppercase',color:'rgba(255,255,255,0.3)'}}>Listings</div>
          <div onClick={()=>{setForm(EMPTY);setEditId(null);navTo('add')}} style={{padding:'0.72rem 1.25rem',fontSize:'0.72rem',fontWeight:tab==='add'?700:400,color:'#ffffff',borderLeft:tab==='add'?`3px solid ${GOLD}`:'3px solid transparent',background:tab==='add'?'rgba(255,255,255,0.1)':'transparent',cursor:'pointer',userSelect:'none'}}>Add New Listing</div>
          <div onClick={()=>{setManageFilter('all');navTo('manage')}} style={{padding:'0.72rem 1.25rem',fontSize:'0.72rem',fontWeight:tab==='manage'?700:400,color:'#ffffff',borderLeft:tab==='manage'?`3px solid ${GOLD}`:'3px solid transparent',background:tab==='manage'?'rgba(255,255,255,0.1)':'transparent',cursor:'pointer',userSelect:'none'}}>Manage Listings</div>

          <div style={{padding:'0.85rem 1.25rem 0.25rem',fontSize:'0.5rem',fontWeight:700,letterSpacing:'0.2em',textTransform:'uppercase',color:'rgba(255,255,255,0.3)'}}>Inquiries</div>
          <div onClick={()=>navTo('inquiries')} style={{padding:'0.72rem 1.25rem',fontSize:'0.72rem',fontWeight:tab==='inquiries'?700:400,color:'#ffffff',borderLeft:tab==='inquiries'?`3px solid ${GOLD}`:'3px solid transparent',background:tab==='inquiries'?'rgba(255,255,255,0.1)':'transparent',cursor:'pointer',userSelect:'none',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span>All Inquiries</span>
            {newInquiries>0 && <span style={{background:GOLD,color:'#fff',fontSize:'0.52rem',fontWeight:700,padding:'0.1rem 0.45rem',borderRadius:'10px'}}>{newInquiries}</span>}
          </div>

          <div style={{padding:'0.85rem 1.25rem 0.25rem',fontSize:'0.5rem',fontWeight:700,letterSpacing:'0.2em',textTransform:'uppercase',color:'rgba(255,255,255,0.3)'}}>Profile</div>
          <div onClick={()=>navTo('bio')} style={{padding:'0.72rem 1.25rem',fontSize:'0.72rem',fontWeight:tab==='bio'?700:400,color:'#ffffff',borderLeft:tab==='bio'?`3px solid ${GOLD}`:'3px solid transparent',background:tab==='bio'?'rgba(255,255,255,0.1)':'transparent',cursor:'pointer',userSelect:'none'}}>My Bio & Story</div>
        </nav>

        {/* FOOTER */}
        <div style={{padding:'1rem 1.25rem',borderTop:'1px solid rgba(255,255,255,0.08)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontSize:'0.62rem',color:'rgba(255,255,255,0.35)',fontFamily:FONT}}>Leo Williams</span>
          <div style={{display:'flex',gap:'1rem'}}>
            <a href="/" target="_blank" style={{fontSize:'0.6rem',color:'rgba(255,255,255,0.35)',textDecoration:'none',fontFamily:FONT}}>Site ↗</a>
            <button onClick={async()=>{await getSupabase().auth.signOut();setAuthed(false)}} style={{background:'none',border:'none',color:'rgba(255,255,255,0.35)',fontSize:'0.6rem',cursor:'pointer',padding:0,fontFamily:FONT}}>Sign Out</button>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{background:PAPER,overflow:'auto'}}>
        {/* TOPBAR */}
        <div style={{background:'#fff',borderBottom:`1px solid ${RULE}`,padding:'0 2rem',height:'56px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:10}}>
          <div style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
            {tabHistory.length>0 && (
              <button onClick={goBack} style={{background:'none',border:`1px solid ${RULE}`,color:'#6B6B68',cursor:'pointer',padding:'0.3rem 0.75rem',fontSize:'0.62rem',fontWeight:600,fontFamily:FONT}}>← Back</button>
            )}
            <span style={{fontSize:'0.82rem',fontWeight:600,color:INK,fontFamily:FONT}}>{tabLabel}</span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:'1rem'}}>
            <span style={{fontSize:'0.62rem',color:'#9B9B98',fontFamily:FONT}}>{live} live · {draft} draft · {rented} rented</span>
            <button onClick={()=>{setForm(EMPTY);setEditId(null);navTo('add')}} style={s.btn}>+ Add Listing</button>
          </div>
        </div>

        <div style={{padding:'2rem'}}>

          {/* DASHBOARD */}
          {tab==='dashboard' && (
            <div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'1rem',marginBottom:'2rem'}}>
                {[
                  {label:'Live Listings',value:live,click:()=>{setManageFilter('live');navTo('manage')}},
                  {label:'Drafts',value:draft,click:()=>{setManageFilter('draft');navTo('manage')}},
                  {label:'New Inquiries',value:newInquiries,click:()=>navTo('inquiries')},
                  {label:'Rented',value:rented,click:()=>{setManageFilter('rented');navTo('manage')}},
                ].map(stat=>(
                  <div key={stat.label} onClick={stat.click} style={{background:'#fff',border:`1px solid ${RULE}`,padding:'1.5rem',cursor:'pointer'}}>
                    <div style={{fontFamily:SERIF,fontSize:'2.4rem',fontWeight:300,color:BLUE,lineHeight:1}}>{stat.value}</div>
                    <div style={{fontSize:'0.58rem',fontWeight:600,letterSpacing:'0.14em',textTransform:'uppercase',color:'#9B9B98',margin:'0.3rem 0 0.75rem',fontFamily:FONT}}>{stat.label}</div>
                    <div style={{fontSize:'0.58rem',fontWeight:600,color:GOLD,fontFamily:FONT}}>Manage →</div>
                  </div>
                ))}
              </div>
              <div style={{background:'#fff',border:`1px solid ${RULE}`,padding:'1.5rem'}}>
                <div style={{fontSize:'0.58rem',fontWeight:600,letterSpacing:'0.16em',textTransform:'uppercase',color:'#9B9B98',marginBottom:'1rem',fontFamily:FONT}}>Recent Listings</div>
                {listings.slice(0,6).map(l=>(
                  <div key={l.id} onClick={()=>editListing(l)} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.75rem 0',borderBottom:`1px solid ${RULE}`,cursor:'pointer'}}>
                    <div>
                      <div style={{fontSize:'0.78rem',fontWeight:500,color:INK,fontFamily:FONT}}>{l.neighborhood} · {l.price}</div>
                      <div style={{fontSize:'0.62rem',color:'#9B9B98',fontFamily:FONT}}>{l.beds||'Studio'} bed · {l.baths} bath</div>
                    </div>
                    <span style={{fontSize:'0.52rem',fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase',padding:'0.2rem 0.6rem',fontFamily:FONT,background:l.status==='live'?'#E8F5EE':l.status==='draft'?PAPER:'#F3EEFF',color:l.status==='live'?'#1A6B3A':l.status==='draft'?'#6B6B68':'#7B5EA7'}}>{l.status}</span>
                  </div>
                ))}
                {listings.length===0 && <div style={{textAlign:'center',padding:'2rem',color:'#9B9B98',fontSize:'0.78rem',fontFamily:FONT}}>No listings yet.</div>}
              </div>
            </div>
          )}

          {/* ADD / EDIT */}
          {tab==='add' && (
            <div style={{background:'#fff',border:`1px solid ${RULE}`,padding:'2rem'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem',marginBottom:'1rem'}}>
                {([
                  {label:'Neighborhood',key:'neighborhood',placeholder:'Upper West Side'},
                  {label:'Price',key:'price',placeholder:'$3,200/mo'},
                  {label:'Beds (leave blank for Studio)',key:'beds',placeholder:'1, 2, 3...'},
                  {label:'Baths',key:'baths',placeholder:'1'},
                  {label:'Lease Length',key:'lease_length',placeholder:'12 months'},
                  {label:'Concessions',key:'concessions',placeholder:'1 month free'},
                  {label:'Badge',key:'badge',placeholder:'New, Featured...'},
                  {label:'Full Address (private)',key:'full_address',placeholder:'123 Main St, Apt 4B'},
                ] as {label:string,key:string,placeholder:string}[]).map(f=>(
                  <div key={f.key}>
                    <label style={s.label}>{f.label}</label>
                    <input value={(form as any)[f.key]} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} placeholder={f.placeholder} style={s.inp} />
                  </div>
                ))}
              </div>
              <div style={{marginBottom:'1rem'}}>
                <label style={s.label}>Description</label>
                <textarea value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} placeholder="Describe the apartment..." rows={4} style={{...s.inp,resize:'vertical'}} />
              </div>
              <div style={{marginBottom:'1rem'}}>
                <label style={s.label}>Amenities (comma separated)</label>
                <input value={form.amenities as string} onChange={e=>setForm(p=>({...p,amenities:e.target.value}))} placeholder="Doorman, Gym, Laundry in unit, Elevator..." style={s.inp} />
              </div>
              <div style={{display:'flex',alignItems:'center',gap:'0.75rem',marginBottom:'1.5rem'}}>
                <input type="checkbox" id="op_paid" checked={form.op_paid} onChange={e=>setForm(p=>({...p,op_paid:e.target.checked}))} style={{width:'16px',height:'16px',cursor:'pointer'}} />
                <label htmlFor="op_paid" style={{fontSize:'0.75rem',color:INK,cursor:'pointer',fontFamily:FONT}}>Owner Paid — No Fee listing</label>
              </div>
              <div style={{display:'flex',gap:'0.75rem',flexWrap:'wrap'}}>
                <button onClick={()=>saveListing('live')} style={s.btn}>{saveStatus==='saving'?'Saving...':saveStatus==='saved'?'✓ Published!':'Publish Live'}</button>
                <button onClick={()=>saveListing('draft')} style={s.btnGhost}>Save Draft</button>
                {editId && <button onClick={()=>saveListing('rented')} style={{...s.btnGhost,color:'#7B5EA7',borderColor:'#D9CCF5',background:'#F3EEFF'}}>Mark Rented</button>}
                {editId && <button onClick={()=>{setForm(EMPTY);setEditId(null);goBack()}} style={{...s.btnGhost,color:DANGER,borderColor:'#FDECEA'}}>Cancel</button>}
              </div>
              {saveStatus==='error' && <div style={{marginTop:'0.75rem',fontSize:'0.7rem',color:DANGER,fontFamily:FONT}}>Something went wrong. Try again.</div>}
            </div>
          )}

          {/* MANAGE */}
          {tab==='manage' && (
            <div>
              <div style={{display:'flex',gap:'0.5rem',marginBottom:'1.5rem',flexWrap:'wrap'}}>
                {(['all','live','draft','rented'] as string[]).map(f=>(
                  <button key={f} onClick={()=>setManageFilter(f)} style={{...s.btnGhost,background:manageFilter===f?INK:'#fff',color:manageFilter===f?'#fff':'#6B6B68',padding:'0.4rem 1rem',fontSize:'0.58rem',fontWeight:600,letterSpacing:'0.12em',textTransform:'uppercase'}}>
                    {f.charAt(0).toUpperCase()+f.slice(1)}
                  </button>
                ))}
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:'0.75rem'}}>
                {filteredListings.map(l=>(
                  <div key={l.id} style={{background:'#fff',border:`1px solid ${RULE}`,padding:'1.25rem 1.5rem',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div>
                      <div style={{fontSize:'0.85rem',fontWeight:500,color:INK,fontFamily:FONT,marginBottom:'0.2rem'}}>{l.neighborhood} · {l.price}</div>
                      <div style={{fontSize:'0.62rem',color:'#9B9B98',fontFamily:FONT}}>{l.beds||'Studio'} bed · {l.baths} bath · {l.lease_length}{l.op_paid?' · No Fee':''}</div>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
                      <span style={{fontSize:'0.52rem',fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase',padding:'0.2rem 0.6rem',fontFamily:FONT,background:l.status==='live'?'#E8F5EE':l.status==='draft'?PAPER:'#F3EEFF',color:l.status==='live'?'#1A6B3A':l.status==='draft'?'#6B6B68':'#7B5EA7'}}>{l.status}</span>
                      <button onClick={()=>editListing(l)} style={{fontSize:'0.62rem',fontWeight:500,color:BLUE,background:'none',border:'none',cursor:'pointer',fontFamily:FONT}}>Edit</button>
                      <button onClick={()=>deleteListing(l.id!)} style={{fontSize:'0.62rem',fontWeight:500,color:DANGER,background:'none',border:'none',cursor:'pointer',fontFamily:FONT}}>Delete</button>
                    </div>
                  </div>
                ))}
                {filteredListings.length===0 && <div style={{textAlign:'center',padding:'3rem',color:'#9B9B98',fontSize:'0.78rem',background:'#fff',border:`1px solid ${RULE}`,fontFamily:FONT}}>No listings found.</div>}
              </div>
            </div>
          )}

          {/* INQUIRIES */}
          {tab==='inquiries' && (
            <div>
              <div style={{display:'flex',gap:'0.5rem',marginBottom:'1.5rem',flexWrap:'wrap'}}>
                {([
                  {key:'all',label:'All'},
                  {key:'renter',label:'Renters'},
                  {key:'landlord',label:'Landlords & Property Owners'},
                ] as {key:string,label:string}[]).map(f=>(
                  <button key={f.key} onClick={()=>setInquiryFilter(f.key)} style={{...s.btnGhost,background:inquiryFilter===f.key?INK:'#fff',color:inquiryFilter===f.key?'#fff':'#6B6B68',padding:'0.4rem 1rem',fontSize:'0.58rem',fontWeight:600,letterSpacing:'0.12em',textTransform:'uppercase'}}>
                    {f.label}
                  </button>
                ))}
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:'0.75rem'}}>
                {filteredInquiries.map(i=>(
                  <div key={i.id} style={{background:'#fff',border:`1px solid ${expandedInquiry===i.id?GOLD:RULE}`}}>
                    <div style={{padding:'1.25rem 1.5rem',display:'flex',justifyContent:'space-between',alignItems:'center',cursor:'pointer'}} onClick={()=>setExpandedInquiry(expandedInquiry===i.id?null:i.id)}>
                      <div>
                        <div style={{fontSize:'0.85rem',fontWeight:600,color:INK,fontFamily:FONT,marginBottom:'0.2rem'}}>{i.first_name} {i.last_name}</div>
                        <div style={{fontSize:'0.62rem',color:'#9B9B98',fontFamily:FONT}}>{i.inquiry_type==='landlord'?'Landlord / Property Owner':'Renter'} · {i.neighborhood||'Any'} · {i.budget||'Flexible'} · {new Date(i.created_at).toLocaleDateString()}</div>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
                        <span style={{fontSize:'0.52rem',fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase',padding:'0.2rem 0.6rem',fontFamily:FONT,background:i.status==='new'?'#EEF2F8':i.status==='contacted'?'#E8F5EE':PAPER,color:i.status==='new'?BLUE:i.status==='contacted'?'#1A6B3A':'#6B6B68'}}>{i.status}</span>
                        <span style={{color:'#9B9B98',fontSize:'0.75rem'}}>{expandedInquiry===i.id?'▲':'▼'}</span>
                      </div>
                    </div>
                    {expandedInquiry===i.id && (
                      <div style={{borderTop:`1px solid ${RULE}`,padding:'1.25rem 1.5rem'}}>
                        <div style={{display:'flex',gap:'0.75rem',marginBottom:'1.25rem',flexWrap:'wrap',alignItems:'center'}}>
                          {i.email && <a href={`mailto:${i.email}`} style={{...s.btn,textDecoration:'none',display:'inline-block',fontSize:'0.6rem'}}>✉ Email</a>}
                          {i.phone && <a href={`tel:${i.phone}`} style={{...s.btn,background:BLUE,textDecoration:'none',display:'inline-block',fontSize:'0.6rem'}}>📞 Call</a>}
                          {i.phone && <a href={`sms:${i.phone}`} style={{...s.btnGhost,textDecoration:'none',display:'inline-block',fontSize:'0.6rem'}}>💬 Text</a>}
                          <select value={i.status} onChange={e=>updateInquiryStatus(i.id,e.target.value)} style={{marginLeft:'auto',fontSize:'0.62rem',fontFamily:FONT,background:OFF,border:`1px solid ${RULE}`,padding:'0.4rem 0.7rem',color:INK,outline:'none'}}>
                            <option value="new">New</option>
                            <option value="contacted">Contacted</option>
                            <option value="closed">Closed</option>
                          </select>
                        </div>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.5rem',marginBottom:'1rem',fontSize:'0.72rem',color:'#6B6B68',fontFamily:FONT}}>
                          <div><strong style={{color:INK}}>Email:</strong> {i.email||'—'}</div>
                          <div><strong style={{color:INK}}>Phone:</strong> {i.phone||'—'}</div>
                          <div><strong style={{color:INK}}>Neighborhood:</strong> {i.neighborhood||'Any'}</div>
                          <div><strong style={{color:INK}}>Budget:</strong> {i.budget||'Flexible'}</div>
                        </div>
                        {i.message && <div style={{background:OFF,border:`1px solid ${RULE}`,padding:'0.85rem 1rem',fontSize:'0.75rem',color:'#6B6B68',lineHeight:1.7,marginBottom:'1rem',fontFamily:FONT}}>{i.message}</div>}
                        <label style={s.label}>Internal Notes</label>
                        <textarea value={inquiryNotes[i.id]||''} onChange={e=>setInquiryNotes(p=>({...p,[i.id]:e.target.value}))} placeholder="Add private notes..." rows={3} style={{...s.inp,resize:'vertical',marginBottom:'0.5rem'}} />
                        <button onClick={()=>saveNotes(i.id)} style={{...s.btn,fontSize:'0.58rem',padding:'0.5rem 1rem'}}>Save Notes</button>
                      </div>
                    )}
                  </div>
                ))}
                {filteredInquiries.length===0 && <div style={{textAlign:'center',padding:'3rem',color:'#9B9B98',fontSize:'0.78rem',background:'#fff',border:`1px solid ${RULE}`,fontFamily:FONT}}>No inquiries found.</div>}
              </div>
            </div>
          )}

          {/* BIO & PROFILE */}
          {tab==='bio' && (
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1.5rem'}}>
              {/* LEFT — Photo + Contact */}
              <div style={{display:'flex',flexDirection:'column',gap:'1.5rem'}}>
                <div style={{background:'#fff',border:`1px solid ${RULE}`,padding:'1.5rem'}}>
                  <div style={{fontSize:'0.58rem',fontWeight:600,letterSpacing:'0.16em',textTransform:'uppercase',color:'#9B9B98',marginBottom:'1.25rem',fontFamily:FONT}}>Profile Photo</div>
                  {photoUrl
                    ? <img src={photoUrl} alt="Profile" style={{width:'130px',height:'160px',objectFit:'cover',objectPosition:'center top',marginBottom:'1rem',display:'block',border:`1px solid ${RULE}`}} />
                    : <div style={{width:'130px',height:'160px',background:PAPER,border:`1px solid ${RULE}`,marginBottom:'1rem',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.65rem',color:'#9B9B98',fontFamily:FONT}}>No photo</div>
                  }
                  <input ref={photoInputRef} type="file" accept="image/*" onChange={uploadPhoto} style={{display:'none'}} />
                  <button onClick={()=>photoInputRef.current?.click()} disabled={photoUploading} style={{...s.btn,fontSize:'0.58rem',padding:'0.6rem 1.1rem',display:'block',marginBottom:'0.4rem'}}>
                    {photoUploading?'Uploading...':photoUrl?'Replace Photo':'Upload Photo'}
                  </button>
                  <div style={{fontSize:'0.6rem',color:'#9B9B98',fontFamily:FONT}}>Appears on the public About section.</div>
                </div>

                <div style={{background:'#fff',border:`1px solid ${RULE}`,padding:'1.5rem'}}>
                  <div style={{fontSize:'0.58rem',fontWeight:600,letterSpacing:'0.16em',textTransform:'uppercase',color:'#9B9B98',marginBottom:'1rem',fontFamily:FONT}}>Contact Details</div>
                  <div style={{marginBottom:'0.75rem'}}><label style={s.label}>Phone</label><input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="(212) 555-0100" style={s.inp} /></div>
                  <div style={{marginBottom:'1rem'}}><label style={s.label}>Email</label><input value={contactEmail} onChange={e=>setContactEmail(e.target.value)} placeholder="leo@leowilliamsnyc.com" style={s.inp} /></div>
                  <button onClick={saveProfile} style={s.btn}>{profileSaved?'✓ Saved!':'Save Profile'}</button>
                </div>
              </div>

              {/* RIGHT — Bio */}
              <div style={{background:'#fff',border:`1px solid ${RULE}`,padding:'1.5rem'}}>
                <div style={{fontSize:'0.58rem',fontWeight:600,letterSpacing:'0.16em',textTransform:'uppercase',color:'#9B9B98',marginBottom:'1.25rem',fontFamily:FONT}}>Generate Bio with AI</div>
                {([
                  {label:"What brought you to NYC real estate?",value:bioQ1,set:setBioQ1},
                  {label:"What makes you different from other agents?",value:bioQ2,set:setBioQ2},
                  {label:"What do your clients say about working with you?",value:bioQ3,set:setBioQ3},
                ] as {label:string,value:string,set:(v:string)=>void}[]).map((q,idx)=>(
                  <div key={idx} style={{marginBottom:'1rem'}}>
                    <label style={{...s.label,textTransform:'none',letterSpacing:0,fontSize:'0.68rem',color:'#6B6B68'}}>{q.label}</label>
                    <textarea value={q.value} onChange={e=>q.set(e.target.value)} rows={2} style={{...s.inp,resize:'vertical'}} />
                  </div>
                ))}
                <button onClick={generateBio} disabled={bioGenerating} style={{...s.btn,background:BLUE,marginBottom:'1.5rem'}}>
                  {bioGenerating?'Generating...':'✨ Generate Bio'}
                </button>
                <label style={s.label}>Bio Text</label>
                <textarea value={bio} onChange={e=>setBio(e.target.value)} rows={8} placeholder="Your bio will appear here..." style={{...s.inp,resize:'vertical',marginBottom:'1rem'}} />
                <button onClick={saveProfile} style={s.btn}>{profileSaved?'✓ Saved!':'Save Bio'}</button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
