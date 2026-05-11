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

const SB: React.CSSProperties = {fontFamily:"'Montserrat',system-ui,sans-serif"}
const gold = '#B8975A'
const ink = '#111110'
const rule = '#E2E0DA'
const off = '#F8F7F4'
const paper = '#F2F1ED'
const blue = '#1B3A6B'
const danger = '#C0392B'

function NavItem({label, active, onClick, badge}: {label:string, active:boolean, onClick:()=>void, badge?:number}) {
  return (
    <a href="#" onClick={e=>{e.preventDefault();onClick()}} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0.7rem 1.25rem',fontSize:'0.72rem',fontWeight:active?600:400,color:active?'#fff':'rgba(255,255,255,0.55)',textDecoration:'none',borderLeft:`2px solid ${active?gold:'transparent'}`,background:active?'rgba(255,255,255,0.08)':'transparent',...SB}}>
      <span>{label}</span>
      {badge ? <span style={{background:gold,color:'#fff',fontSize:'0.55rem',fontWeight:600,padding:'0.15rem 0.45rem',borderRadius:'10px'}}>{badge}</span> : null}
    </a>
  )
}

function SectionLabel({label}: {label:string}) {
  return <div style={{padding:'0.75rem 1.25rem 0.25rem',fontSize:'0.52rem',fontWeight:600,letterSpacing:'0.2em',textTransform:'uppercase' as const,color:'rgba(255,255,255,0.2)',...SB}}>{label}</div>
}

export default function Admin() {
  const [authed, setAuthed] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [tab, setTab] = useState('dashboard')
  const [listings, setListings] = useState<Listing[]>([])
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [newInquiries, setNewInquiries] = useState(0)
  const [form, setForm] = useState<Listing>(EMPTY)
  const [editId, setEditId] = useState<string|null>(null)
  const [saveStatus, setSaveStatus] = useState('')
  const [manageFilter, setManageFilter] = useState('all')
  const [bio, setBio] = useState('')
  const [phone, setPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [bioQ1, setBioQ1] = useState('')
  const [bioQ2, setBioQ2] = useState('')
  const [bioQ3, setBioQ3] = useState('')
  const [bioGenerating, setBioGenerating] = useState(false)
  const [bioSaved, setBioSaved] = useState(false)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [expandedInquiry, setExpandedInquiry] = useState<string|null>(null)
  const [inquiryFilter, setInquiryFilter] = useState('all')
  const [inquiryNotes, setInquiryNotes] = useState<Record<string,string>>({})
  const photoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getSupabase().auth.getSession().then(({ data }) => {
      if (data.session) { setAuthed(true); loadAll() }
    })
  }, [])

  async function doLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoginLoading(true)
    setLoginError('')
    const { error } = await getSupabase().auth.signInWithPassword({ email, password })
    setLoginLoading(false)
    if (error) { setLoginError('Incorrect email or password.'); return }
    setAuthed(true)
    loadAll()
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
    if (p) {
      setBio(p.bio_text || '')
      setPhone(p.phone || '')
      setContactEmail(p.email || '')
      setPhotoUrl(p.photo_url || '')
    }
  }

  async function saveListing(status: string) {
    setSaveStatus('saving')
    const payload = {
      ...form,
      status,
      amenities: typeof form.amenities === 'string'
        ? form.amenities.split(',').map((a:string) => a.trim()).filter(Boolean)
        : form.amenities,
    }
    let error
    if (editId) {
      ({ error } = await getSupabase().from('listings').update(payload).eq('id', editId))
    } else {
      ({ error } = await getSupabase().from('listings').insert([payload]))
    }
    if (error) { setSaveStatus('error'); return }
    setSaveStatus('saved')
    setForm(EMPTY)
    setEditId(null)
    loadAll()
    setTimeout(() => { setSaveStatus(''); setTab('manage') }, 1200)
  }

  async function deleteListing(id: string) {
    if (!confirm('Delete this listing?')) return
    await getSupabase().from('listings').delete().eq('id', id)
    loadAll()
  }

  function editListing(l: Listing) {
    setForm({ ...l, amenities: Array.isArray(l.amenities) ? l.amenities.join(', ') : l.amenities || '' })
    setEditId(l.id || null)
    setTab('add')
  }

  async function updateInquiryStatus(id: string, status: string) {
    await getSupabase().from('inquiries').update({ status }).eq('id', id)
    loadAll()
  }

  async function saveNotes(id: string) {
    await getSupabase().from('inquiries').update({ notes: inquiryNotes[id] || '' }).eq('id', id)
  }

  async function generateBio() {
    if (!bioQ1 && !bioQ2 && !bioQ3) return
    setBioGenerating(true)
    try {
      const res = await fetch('/api/generate-bio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q1: bioQ1, q2: bioQ2, q3: bioQ3 })
      })
      const data = await res.json()
      setBio(data.bio)
    } catch(e) { console.error(e) }
    setBioGenerating(false)
  }

  async function saveProfile() {
    const { data: existing } = await getSupabase().from('profile').select('id').limit(1).single()
    const payload = { bio_text: bio, phone, email: contactEmail, photo_url: photoUrl }
    if (existing) {
      await getSupabase().from('profile').update(payload).eq('id', existing.id)
    } else {
      await getSupabase().from('profile').insert([payload])
    }
    setBioSaved(true)
    setTimeout(() => setBioSaved(false), 2000)
  }

  async function uploadPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoUploading(true)
    const ext = file.name.split('.').pop()
    const path = `profile/leo-photo.${ext}`
    const { error } = await getSupabase().storage.from('listing-photos').upload(path, file, { upsert: true })
    if (error) { console.error(error); setPhotoUploading(false); return }
    const { data } = getSupabase().storage.from('listing-photos').getPublicUrl(path)
    setPhotoUrl(data.publicUrl)
    setPhotoUploading(false)
  }

  const filteredListings = listings.filter(l => {
    if (manageFilter === 'all') return true
    if (manageFilter === 'live') return l.status === 'live'
    if (manageFilter === 'draft') return l.status === 'draft'
    if (manageFilter === 'rented') return l.status === 'rented'
    return true
  })

  const live = listings.filter(l => l.status === 'live').length
  const draft = listings.filter(l => l.status === 'draft').length
  const rented = listings.filter(l => l.status === 'rented').length

  const inp = {width:'100%',background:off,border:`1px solid ${rule}`,color:ink,fontFamily:"'Montserrat',system-ui,sans-serif",fontSize:'0.8rem',padding:'0.6rem 0.85rem',outline:'none'} as React.CSSProperties

  if (!authed) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:ink,padding:'1rem',...SB}}>
      <div style={{background:'#fff',padding:'2.5rem',width:'100%',maxWidth:'380px'}}>
        <div style={{fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:'1.3rem',fontWeight:300,marginBottom:'0.3rem'}}>Leo <em style={{fontStyle:'italic',color:gold}}>Williams</em></div>
        <div style={{fontSize:'0.6rem',fontWeight:500,letterSpacing:'0.16em',textTransform:'uppercase',color:'#9B9B98',marginBottom:'2rem'}}>Admin Dashboard</div>
        <form onSubmit={doLogin}>
          <div style={{marginBottom:'1rem'}}>
            <label style={{display:'block',fontSize:'0.55rem',fontWeight:600,letterSpacing:'0.14em',textTransform:'uppercase',color:'#6B6B68',marginBottom:'0.3rem'}}>Email</label>
            <input type="email" required placeholder="leo@leowilliamsnyc.com" value={email} onChange={e=>setEmail(e.target.value)} style={inp} />
          </div>
          <div style={{marginBottom:'1rem'}}>
            <label style={{display:'block',fontSize:'0.55rem',fontWeight:600,letterSpacing:'0.14em',textTransform:'uppercase',color:'#6B6B68',marginBottom:'0.3rem'}}>Password</label>
            <input type="password" required placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} style={inp} />
          </div>
          {loginError && <div style={{fontSize:'0.68rem',color:danger,marginBottom:'0.5rem'}}>{loginError}</div>}
          <button type="submit" disabled={loginLoading} style={{width:'100%',background:ink,color:'#fff',...SB,fontSize:'0.62rem',fontWeight:600,letterSpacing:'0.16em',textTransform:'uppercase',padding:'0.85rem',border:'none',cursor:'pointer',marginTop:'0.25rem'}}>
            {loginLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )

  return (
    <div style={{display:'grid',gridTemplateColumns:'220px 1fr',minHeight:'100vh',...SB}}>
      {/* SIDEBAR */}
      <aside style={{background:ink,display:'flex',flexDirection:'column',position:'sticky',top:0,height:'100vh'}}>
        <div style={{padding:'1.25rem 1.25rem 1rem',borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
          <div style={{fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:'1rem',fontWeight:300,color:'#fff'}}>Leo <em style={{fontStyle:'italic',color:gold}}>Williams</em></div>
          <div style={{fontSize:'0.52rem',letterSpacing:'0.16em',textTransform:'uppercase',color:'rgba(255,255,255,0.28)',marginTop:'3px'}}>Admin Dashboard</div>
        </div>
        <nav style={{flex:1,paddingTop:'0.5rem',overflowY:'auto'}}>
          <NavItem label="Overview" active={tab==='dashboard'} onClick={()=>setTab('dashboard')} />
          <SectionLabel label="Listings" />
          <NavItem label="Add New Listing" active={tab==='add'} onClick={()=>{setForm(EMPTY);setEditId(null);setTab('add')}} />
          <NavItem label="Manage Listings" active={tab==='manage'} onClick={()=>{setManageFilter('all');setTab('manage')}} />
          <SectionLabel label="Inquiries" />
          <NavItem label="Inquiries" active={tab==='inquiries'} onClick={()=>setTab('inquiries')} badge={newInquiries||undefined} />
          <SectionLabel label="Profile" />
          <NavItem label="My Bio & Story" active={tab==='bio'} onClick={()=>setTab('bio')} />
        </nav>
        <div style={{padding:'1rem 1.25rem',borderTop:'1px solid rgba(255,255,255,0.07)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{fontSize:'0.65rem',color:'rgba(255,255,255,0.4)'}}>Leo Williams</div>
          <div style={{display:'flex',gap:'1rem'}}>
            <a href="/" target="_blank" style={{fontSize:'0.6rem',color:'rgba(255,255,255,0.35)',textDecoration:'none'}}>Site ↗</a>
            <button onClick={async()=>{await getSupabase().auth.signOut();setAuthed(false)}} style={{background:'none',border:'none',color:'rgba(255,255,255,0.35)',fontSize:'0.6rem',cursor:'pointer',padding:0}}>Sign Out</button>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{background:paper,overflow:'auto'}}>
        {/* TOPBAR */}
        <div style={{background:'#fff',borderBottom:`1px solid ${rule}`,padding:'0 2rem',height:'56px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:10}}>
          <div style={{fontSize:'0.82rem',fontWeight:600,color:ink}}>
            {tab==='dashboard'?'Overview':tab==='add'?editId?'Edit Listing':'Add New Listing':tab==='manage'?'Manage Listings':tab==='inquiries'?'Inquiries':'My Bio & Story'}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:'1rem'}}>
            <span style={{fontSize:'0.62rem',color:'#9B9B98'}}>{live} live · {draft} draft · {rented} rented</span>
            <button onClick={()=>{setForm(EMPTY);setEditId(null);setTab('add')}} style={{background:ink,color:'#fff',...SB,fontSize:'0.6rem',fontWeight:600,letterSpacing:'0.14em',textTransform:'uppercase',padding:'0.5rem 1.1rem',border:'none',cursor:'pointer'}}>+ Add Listing</button>
          </div>
        </div>

        <div style={{padding:'2rem'}}>

          {/* DASHBOARD */}
          {tab==='dashboard' && (
            <div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'1rem',marginBottom:'2rem'}}>
                {[
                  {label:'Live Listings',value:live,action:()=>{setManageFilter('live');setTab('manage')}},
                  {label:'Drafts',value:draft,action:()=>{setManageFilter('draft');setTab('manage')}},
                  {label:'New Inquiries',value:newInquiries,action:()=>setTab('inquiries')},
                  {label:'Rented',value:rented,action:()=>{setManageFilter('rented');setTab('manage')}},
                ].map(s=>(
                  <div key={s.label} style={{background:'#fff',border:`1px solid ${rule}`,padding:'1.5rem',cursor:'pointer'}} onClick={s.action}>
                    <div style={{fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:'2.2rem',fontWeight:300,color:ink,lineHeight:1}}>{s.value}</div>
                    <div style={{fontSize:'0.58rem',fontWeight:600,letterSpacing:'0.14em',textTransform:'uppercase',color:'#9B9B98',margin:'0.3rem 0 0.75rem'}}>{s.label}</div>
                    <div style={{fontSize:'0.58rem',fontWeight:600,color:gold}}>Manage →</div>
                  </div>
                ))}
              </div>
              <div style={{background:'#fff',border:`1px solid ${rule}`,padding:'1.5rem'}}>
                <div style={{fontSize:'0.58rem',fontWeight:600,letterSpacing:'0.16em',textTransform:'uppercase',color:'#9B9B98',marginBottom:'1rem'}}>Recent Listings</div>
                {listings.slice(0,5).map(l=>(
                  <div key={l.id} onClick={()=>editListing(l)} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.75rem 0',borderBottom:`1px solid ${rule}`,cursor:'pointer'}}>
                    <div>
                      <div style={{fontSize:'0.78rem',fontWeight:500,color:ink}}>{l.neighborhood} · {l.price}</div>
                      <div style={{fontSize:'0.62rem',color:'#9B9B98'}}>{l.beds||'Studio'} bed · {l.baths} bath</div>
                    </div>
                    <span style={{fontSize:'0.52rem',fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase',padding:'0.2rem 0.6rem',background:l.status==='live'?'#E8F5EE':l.status==='draft'?paper:'#F3EEFF',color:l.status==='live'?'#1A6B3A':l.status==='draft'?'#6B6B68':'#7B5EA7'}}>{l.status}</span>
                  </div>
                ))}
                {listings.length === 0 && <div style={{textAlign:'center',padding:'2rem',color:'#9B9B98',fontSize:'0.78rem'}}>No listings yet. <button onClick={()=>setTab('add')} style={{color:blue,background:'none',border:'none',cursor:'pointer',fontSize:'0.78rem'}}>Add one →</button></div>}
              </div>
            </div>
          )}

          {/* ADD / EDIT */}
          {tab==='add' && (
            <div style={{background:'#fff',border:`1px solid ${rule}`,padding:'2rem'}}>
              <div style={{fontSize:'0.58rem',fontWeight:600,letterSpacing:'0.16em',textTransform:'uppercase',color:'#9B9B98',marginBottom:'1.5rem'}}>{editId?'Editing Listing':'New Listing'}</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
                {([
                  {label:'Neighborhood',key:'neighborhood',placeholder:'Upper West Side'},
                  {label:'Price',key:'price',placeholder:'$3,200/mo'},
                  {label:'Beds',key:'beds',placeholder:'2 (or leave blank for Studio)'},
                  {label:'Baths',key:'baths',placeholder:'1'},
                  {label:'Lease Length',key:'lease_length',placeholder:'12 months'},
                  {label:'Badge',key:'badge',placeholder:'New, Featured...'},
                  {label:'Concessions',key:'concessions',placeholder:'1 month free'},
                  {label:'Full Address (private)',key:'full_address',placeholder:'123 Main St, Apt 4B'},
                ] as {label:string,key:string,placeholder:string}[]).map(f=>(
                  <div key={f.key}>
                    <label style={{display:'block',fontSize:'0.52rem',fontWeight:600,letterSpacing:'0.14em',textTransform:'uppercase',color:'#9B9B98',marginBottom:'0.3rem'}}>{f.label}</label>
                    <input value={(form as any)[f.key]} onChange={e=>setForm(prev=>({...prev,[f.key]:e.target.value}))} placeholder={f.placeholder} style={inp} />
                  </div>
                ))}
              </div>
              <div style={{marginTop:'1rem'}}>
                <label style={{display:'block',fontSize:'0.52rem',fontWeight:600,letterSpacing:'0.14em',textTransform:'uppercase',color:'#9B9B98',marginBottom:'0.3rem'}}>Description</label>
                <textarea value={form.description} onChange={e=>setForm(prev=>({...prev,description:e.target.value}))} placeholder="Describe the apartment..." rows={4} style={{...inp,resize:'vertical'}} />
              </div>
              <div style={{marginTop:'1rem'}}>
                <label style={{display:'block',fontSize:'0.52rem',fontWeight:600,letterSpacing:'0.14em',textTransform:'uppercase',color:'#9B9B98',marginBottom:'0.3rem'}}>Amenities (comma separated)</label>
                <input value={form.amenities as string} onChange={e=>setForm(prev=>({...prev,amenities:e.target.value}))} placeholder="Doorman, Gym, Laundry in unit, Elevator..." style={inp} />
              </div>
              <div style={{marginTop:'1rem',display:'flex',alignItems:'center',gap:'0.75rem'}}>
                <input type="checkbox" id="op_paid" checked={form.op_paid} onChange={e=>setForm(prev=>({...prev,op_paid:e.target.checked}))} style={{width:'16px',height:'16px',cursor:'pointer'}} />
                <label htmlFor="op_paid" style={{fontSize:'0.75rem',color:'#2C2C2A',cursor:'pointer'}}>Owner Paid — No Fee listing</label>
              </div>
              <div style={{marginTop:'1.5rem',display:'flex',gap:'0.75rem',flexWrap:'wrap'}}>
                <button onClick={()=>saveListing('live')} style={{background:ink,color:'#fff',...SB,fontSize:'0.6rem',fontWeight:600,letterSpacing:'0.16em',textTransform:'uppercase',padding:'0.75rem 1.5rem',border:'none',cursor:'pointer'}}>
                  {saveStatus==='saving'?'Saving...':saveStatus==='saved'?'✓ Published!':'Publish Live'}
                </button>
                <button onClick={()=>saveListing('draft')} style={{background:'#fff',color:'#6B6B68',...SB,fontSize:'0.6rem',padding:'0.75rem 1.5rem',border:`1px solid ${rule}`,cursor:'pointer'}}>Save Draft</button>
                {editId && (
                  <button onClick={()=>saveListing('rented')} style={{background:'#F3EEFF',color:'#7B5EA7',...SB,fontSize:'0.6rem',padding:'0.75rem 1.5rem',border:'1px solid #D9CCF5',cursor:'pointer'}}>Mark Rented</button>
                )}
                {editId && (
                  <button onClick={()=>{setForm(EMPTY);setEditId(null);setTab('manage')}} style={{background:'#fff',color:danger,...SB,fontSize:'0.6rem',padding:'0.75rem 1.5rem',border:`1px solid #FDECEA`,cursor:'pointer'}}>Cancel</button>
                )}
              </div>
              {saveStatus==='error' && <div style={{marginTop:'0.75rem',fontSize:'0.7rem',color:danger}}>Something went wrong. Try again.</div>}
            </div>
          )}

          {/* MANAGE */}
          {tab==='manage' && (
            <div>
              <div style={{display:'flex',gap:'0.5rem',marginBottom:'1.5rem',flexWrap:'wrap'}}>
                {(['all','live','draft','rented'] as string[]).map(f=>(
                  <button key={f} onClick={()=>setManageFilter(f)} style={{fontSize:'0.58rem',fontWeight:600,letterSpacing:'0.12em',textTransform:'uppercase',padding:'0.4rem 1rem',border:`1px solid ${rule}`,cursor:'pointer',background:manageFilter===f?ink:'#fff',color:manageFilter===f?'#fff':'#6B6B68',...SB}}>
                    {f.charAt(0).toUpperCase()+f.slice(1)}
                  </button>
                ))}
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:'0.75rem'}}>
                {filteredListings.map(l=>(
                  <div key={l.id} style={{background:'#fff',border:`1px solid ${rule}`,padding:'1.25rem 1.5rem',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div>
                      <div style={{fontSize:'0.85rem',fontWeight:500,color:ink,marginBottom:'0.2rem'}}>{l.neighborhood} · {l.price}</div>
                      <div style={{fontSize:'0.62rem',color:'#9B9B98'}}>{l.beds||'Studio'} bed · {l.baths} bath · {l.lease_length}{l.op_paid?' · No Fee':''}</div>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
                      <span style={{fontSize:'0.52rem',fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase',padding:'0.2rem 0.6rem',background:l.status==='live'?'#E8F5EE':l.status==='draft'?paper:'#F3EEFF',color:l.status==='live'?'#1A6B3A':l.status==='draft'?'#6B6B68':'#7B5EA7'}}>{l.status}</span>
                      <button onClick={()=>editListing(l)} style={{fontSize:'0.62rem',fontWeight:500,color:blue,background:'none',border:'none',cursor:'pointer',...SB}}>Edit</button>
                      <button onClick={()=>deleteListing(l.id!)} style={{fontSize:'0.62rem',fontWeight:500,color:danger,background:'none',border:'none',cursor:'pointer',...SB}}>Delete</button>
                    </div>
                  </div>
                ))}
                {filteredListings.length===0 && (
                  <div style={{textAlign:'center',padding:'3rem',color:'#9B9B98',fontSize:'0.78rem',background:'#fff',border:`1px solid ${rule}`}}>
                    No listings found.{' '}
                    <button onClick={()=>setTab('add')} style={{color:blue,background:'none',border:'none',cursor:'pointer',fontSize:'0.78rem',...SB}}>Add one →</button>
                  </div>
                )}
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
                  <button key={f.key} onClick={()=>setInquiryFilter(f.key)} style={{fontSize:'0.58rem',fontWeight:600,letterSpacing:'0.12em',textTransform:'uppercase',padding:'0.4rem 1rem',border:`1px solid ${rule}`,cursor:'pointer',background:inquiryFilter===f.key?ink:'#fff',color:inquiryFilter===f.key?'#fff':'#6B6B68',...SB}}>
                    {f.label}
                  </button>
                ))}
              </div>
            <div style={{display:'flex',flexDirection:'column',gap:'0.75rem'}}>
              {inquiries.filter(i=>inquiryFilter==='all'||i.inquiry_type===inquiryFilter).map(i=>(
                <div key={i.id} style={{background:'#fff',border:`1px solid ${expandedInquiry===i.id?'#B8975A':rule}`}}>
                  {/* HEADER ROW */}
                  <div style={{padding:'1.25rem 1.5rem',display:'flex',justifyContent:'space-between',alignItems:'center',cursor:'pointer'}} onClick={()=>setExpandedInquiry(expandedInquiry===i.id?null:i.id)}>
                    <div>
                      <div style={{fontSize:'0.85rem',fontWeight:600,color:ink,marginBottom:'0.2rem'}}>{i.first_name} {i.last_name}</div>
                      <div style={{fontSize:'0.62rem',color:'#9B9B98'}}>{i.inquiry_type} · {i.neighborhood||'Any'} · {i.budget||'Flexible'} · {new Date(i.created_at).toLocaleDateString()}</div>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
                      <span style={{fontSize:'0.52rem',fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase',padding:'0.2rem 0.6rem',background:i.status==='new'?'#EEF2F8':i.status==='contacted'?'#E8F5EE':paper,color:i.status==='new'?blue:i.status==='contacted'?'#1A6B3A':'#6B6B68'}}>{i.status}</span>
                      <span style={{color:'#9B9B98',fontSize:'0.8rem'}}>{expandedInquiry===i.id?'▲':'▼'}</span>
                    </div>
                  </div>

                  {/* EXPANDED */}
                  {expandedInquiry===i.id && (
                    <div style={{borderTop:`1px solid ${rule}`,padding:'1.25rem 1.5rem'}}>
                      {/* CONTACT ACTIONS */}
                      <div style={{display:'flex',gap:'0.75rem',marginBottom:'1.25rem',flexWrap:'wrap'}}>
                        {i.email && (
                          <a href={`mailto:${i.email}`} style={{display:'inline-flex',alignItems:'center',gap:'0.4rem',fontSize:'0.62rem',fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase',color:'#fff',background:ink,padding:'0.55rem 1rem',textDecoration:'none',...SB}}>
                            ✉ Email
                          </a>
                        )}
                        {i.phone && (
                          <a href={`tel:${i.phone}`} style={{display:'inline-flex',alignItems:'center',gap:'0.4rem',fontSize:'0.62rem',fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase',color:'#fff',background:blue,padding:'0.55rem 1rem',textDecoration:'none',...SB}}>
                            📞 Call
                          </a>
                        )}
                        {i.phone && (
                          <a href={`sms:${i.phone}`} style={{display:'inline-flex',alignItems:'center',gap:'0.4rem',fontSize:'0.62rem',fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase',color:ink,background:'#fff',border:`1px solid ${rule}`,padding:'0.55rem 1rem',textDecoration:'none',...SB}}>
                            💬 Text
                          </a>
                        )}
                        <select value={i.status} onChange={e=>updateInquiryStatus(i.id,e.target.value)} style={{fontSize:'0.62rem',...SB,background:off,border:`1px solid ${rule}`,padding:'0.4rem 0.7rem',color:ink,outline:'none',marginLeft:'auto'}}>
                          <option value="new">New</option>
                          <option value="contacted">Contacted</option>
                          <option value="closed">Closed</option>
                        </select>
                      </div>

                      {/* CONTACT DETAILS */}
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.5rem',marginBottom:'1rem',fontSize:'0.72rem',color:'#6B6B68'}}>
                        <div><strong style={{color:ink}}>Email:</strong> {i.email||'—'}</div>
                        <div><strong style={{color:ink}}>Phone:</strong> {i.phone||'—'}</div>
                        <div><strong style={{color:ink}}>Neighborhood:</strong> {i.neighborhood||'Any'}</div>
                        <div><strong style={{color:ink}}>Budget:</strong> {i.budget||'Flexible'}</div>
                      </div>

                      {/* MESSAGE */}
                      {i.message && (
                        <div style={{background:off,border:`1px solid ${rule}`,padding:'0.85rem 1rem',fontSize:'0.75rem',color:'#6B6B68',lineHeight:1.7,marginBottom:'1rem'}}>
                          {i.message}
                        </div>
                      )}

                      {/* NOTES */}
                      <div>
                        <label style={{display:'block',fontSize:'0.52rem',fontWeight:600,letterSpacing:'0.14em',textTransform:'uppercase',color:'#9B9B98',marginBottom:'0.3rem'}}>Internal Notes</label>
                        <textarea
                          value={inquiryNotes[i.id]||''}
                          onChange={e=>setInquiryNotes(prev=>({...prev,[i.id]:e.target.value}))}
                          placeholder="Add notes about this inquiry..."
                          rows={3}
                          style={{...inp,resize:'vertical',marginBottom:'0.5rem'}}
                        />
                        <button onClick={()=>saveNotes(i.id)} style={{fontSize:'0.58rem',fontWeight:600,letterSpacing:'0.12em',textTransform:'uppercase',color:'#fff',background:ink,border:'none',cursor:'pointer',padding:'0.5rem 1rem',...SB}}>
                          Save Notes
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {inquiries.filter(i=>inquiryFilter==='all'||i.inquiry_type===inquiryFilter).length===0 && <div style={{textAlign:'center',padding:'3rem',color:'#9B9B98',fontSize:'0.78rem',background:'#fff',border:`1px solid ${rule}`}}>No inquiries found.</div>}
            </div>
            </div>
          )}

          {/* BIO */}
          {tab==='bio' && (
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1.5rem'}}>
              <div style={{background:'#fff',border:`1px solid ${rule}`,padding:'1.5rem'}}>
                <div style={{fontSize:'0.58rem',fontWeight:600,letterSpacing:'0.16em',textTransform:'uppercase',color:'#9B9B98',marginBottom:'1.25rem'}}>Profile Photo</div>
                {photoUrl && <img src={photoUrl} alt="Profile" style={{width:'120px',height:'150px',objectFit:'cover',objectPosition:'center top',marginBottom:'1rem',display:'block',border:`1px solid ${rule}`}} />}
                <input ref={photoInputRef} type="file" accept="image/*" onChange={uploadPhoto} style={{display:'none'}} />
                <button onClick={()=>photoInputRef.current?.click()} disabled={photoUploading} style={{fontSize:'0.6rem',fontWeight:600,letterSpacing:'0.14em',textTransform:'uppercase',color:'#fff',background:ink,border:'none',cursor:'pointer',padding:'0.65rem 1.25rem',display:'block',marginBottom:'0.5rem',...SB}}>
                  {photoUploading?'Uploading...':photoUrl?'Replace Photo':'Upload Photo'}
                </button>
                <div style={{fontSize:'0.62rem',color:'#9B9B98'}}>Appears on the public About section.</div>

                <div style={{borderTop:`1px solid ${rule}`,marginTop:'1.5rem',paddingTop:'1.5rem'}}>
                  <div style={{fontSize:'0.58rem',fontWeight:600,letterSpacing:'0.16em',textTransform:'uppercase',color:'#9B9B98',marginBottom:'1rem'}}>Contact Details</div>
                  {[
                    {label:'Phone',value:phone,set:setPhone,placeholder:'(212) 555-0100'},
                    {label:'Email',value:contactEmail,set:setContactEmail,placeholder:'leo@leowilliamsnyc.com'},
                  ].map(f=>(
                    <div key={f.label} style={{marginBottom:'0.75rem'}}>
                      <label style={{display:'block',fontSize:'0.52rem',fontWeight:600,letterSpacing:'0.14em',textTransform:'uppercase',color:'#9B9B98',marginBottom:'0.3rem'}}>{f.label}</label>
                      <input value={f.value} onChange={e=>f.set(e.target.value)} placeholder={f.placeholder} style={inp} />
                    </div>
                  ))}
                </div>

                <button onClick={saveProfile} style={{fontSize:'0.6rem',fontWeight:600,letterSpacing:'0.14em',textTransform:'uppercase',color:'#fff',background:ink,border:'none',cursor:'pointer',padding:'0.65rem 1.25rem',marginTop:'0.5rem',...SB}}>
                  {bioSaved?'✓ Saved!':'Save Profile'}
                </button>
              </div>

              <div style={{background:'#fff',border:`1px solid ${rule}`,padding:'1.5rem'}}>
                <div style={{fontSize:'0.58rem',fontWeight:600,letterSpacing:'0.16em',textTransform:'uppercase',color:'#9B9B98',marginBottom:'1.25rem'}}>Generate Bio with AI</div>
                {[
                  {label:'What brought you to NYC real estate?',value:bioQ1,set:setBioQ1},
                  {label:'What makes you different from other agents?',value:bioQ2,set:setBioQ2},
                  {label:'What do your clients say about working with you?',value:bioQ3,set:setBioQ3},
                ].map((q,idx)=>(
                  <div key={idx} style={{marginBottom:'1rem'}}>
                    <label style={{display:'block',fontSize:'0.62rem',color:'#6B6B68',marginBottom:'0.3rem',...SB}}>{q.label}</label>
                    <textarea value={q.value} onChange={e=>q.set(e.target.value)} rows={2} style={{...inp,resize:'vertical'}} />
                  </div>
                ))}
                <button onClick={generateBio} disabled={bioGenerating} style={{fontSize:'0.6rem',fontWeight:600,letterSpacing:'0.14em',textTransform:'uppercase',color:'#fff',background:blue,border:'none',cursor:'pointer',padding:'0.65rem 1.25rem',marginBottom:'1.5rem',...SB}}>
                  {bioGenerating?'Generating...':'✨ Generate Bio'}
                </button>

                <div style={{fontSize:'0.58rem',fontWeight:600,letterSpacing:'0.16em',textTransform:'uppercase',color:'#9B9B98',marginBottom:'0.5rem'}}>Bio Text</div>
                <textarea value={bio} onChange={e=>setBio(e.target.value)} rows={7} placeholder="Your bio will appear here..." style={{...inp,resize:'vertical',marginBottom:'1rem'}} />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
