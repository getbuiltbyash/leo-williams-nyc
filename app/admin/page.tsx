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
  amenities: string
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

const EMPTY_LISTING: Listing = {
  neighborhood:'', full_address:'', price:'', beds:'', baths:'',
  lease_length:'', concessions:'', op_paid:false, description:'',
  amenities:'', photos:[], status:'draft', badge:''
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
  const [form, setForm] = useState<Listing>(EMPTY_LISTING)
  const [editId, setEditId] = useState<string|null>(null)
  const [saveStatus, setSaveStatus] = useState('')
  const [manageFilter, setManageFilter] = useState('all')
  const [bio, setBio] = useState('')
  const [tagline, setTagline] = useState('')
  const [phone, setPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [bioQ1, setBioQ1] = useState('')
  const [bioQ2, setBioQ2] = useState('')
  const [bioQ3, setBioQ3] = useState('')
  const [bioGenerating, setBioGenerating] = useState(false)
  const [bioSaved, setBioSaved] = useState(false)
  const [photoUploading, setPhotoUploading] = useState(false)
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
    if (p) {
      setBio(p.bio_text || '')
      setTagline(p.tagline || '')
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
      amenities: form.amenities ? form.amenities.split(',').map((a:string) => a.trim()).filter(Boolean) : [],
    }
    let error
    if (editId) {
      ({ error } = await getSupabase().from('listings').update(payload).eq('id', editId))
    } else {
      ({ error } = await getSupabase().from('listings').insert([payload]))
    }
    if (error) { setSaveStatus('error'); return }
    setSaveStatus('saved')
    setForm(EMPTY_LISTING)
    setEditId(null)
    loadAll()
    setTimeout(() => { setSaveStatus(''); setTab('manage') }, 1000)
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
    const payload = { bio_text: bio, tagline, phone, email: contactEmail, photo_url: photoUrl }
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
    if (manageFilter === 'active') return l.status === 'live'
    if (manageFilter === 'draft') return l.status === 'draft'
    if (manageFilter === 'rented') return l.status === 'rented'
    return true
  })

  const live = listings.filter(l => l.status === 'live').length
  const draft = listings.filter(l => l.status === 'draft').length
  const rented = listings.filter(l => l.status === 'rented').length

  if (!authed) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'#111110',padding:'1rem',fontFamily:"'Montserrat',system-ui,sans-serif"}}>
      <div style={{background:'#fff',padding:'2.5rem',width:'100%',maxWidth:'380px'}}>
        <div style={{fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:'1.3rem',fontWeight:300,marginBottom:'0.3rem'}}>Leo <em style={{fontStyle:'italic',color:'#B8975A'}}>Williams</em></div>
        <div style={{fontSize:'0.6rem',fontWeight:500,letterSpacing:'0.16em',textTransform:'uppercase',color:'#9B9B98',marginBottom:'2rem'}}>Admin Dashboard</div>
        <form onSubmit={doLogin}>
          <div style={{marginBottom:'1rem'}}>
            <label style={{display:'block',fontSize:'0.55rem',fontWeight:600,letterSpacing:'0.14em',textTransform:'uppercase',color:'#6B6B68',marginBottom:'0.3rem'}}>Email</label>
            <input type="email" required placeholder="leo@leowilliamsnyc.com" value={email} onChange={e=>setEmail(e.target.value)} style={{width:'100%',background:'#F8F7F4',border:'1px solid #E2E0DA',color:'#111110',fontFamily:'inherit',fontSize:'0.82rem',padding:'0.65rem 0.85rem',outline:'none'}} />
          </div>
          <div style={{marginBottom:'1rem'}}>
            <label style={{display:'block',fontSize:'0.55rem',fontWeight:600,letterSpacing:'0.14em',textTransform:'uppercase',color:'#6B6B68',marginBottom:'0.3rem'}}>Password</label>
            <input type="password" required placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} style={{width:'100%',background:'#F8F7F4',border:'1px solid #E2E0DA',color:'#111110',fontFamily:'inherit',fontSize:'0.82rem',padding:'0.65rem 0.85rem',outline:'none'}} />
          </div>
          {loginError && <div style={{fontSize:'0.68rem',color:'#C0392B',marginBottom:'0.5rem'}}>{loginError}</div>}
          <button type="submit" disabled={loginLoading} style={{width:'100%',background:'#111110',color:'#fff',fontFamily:'inherit',fontSize:'0.62rem',fontWeight:600,letterSpacing:'0.16em',textTransform:'uppercase',padding:'0.85rem',border:'none',cursor:'pointer',marginTop:'0.25rem'}}>
            {loginLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )

  return (
    <div style={{display:'grid',gridTemplateColumns:'220px 1fr',minHeight:'100vh',fontFamily:"'Montserrat',system-ui,sans-serif"}}>
      {/* SIDEBAR */}
      <aside style={{background:'#111110',display:'flex',flexDirection:'column'}}>
        <div style={{padding:'1.25rem',borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
          <div style={{fontSize:'1rem',fontWeight:300,color:'#fff',fontFamily:"'Cormorant Garamond',Georgia,serif"}}>Leo <em style={{fontStyle:'italic',color:'#B8975A'}}>Williams</em></div>
          <div style={{fontSize:'0.55rem',letterSpacing:'0.16em',textTransform:'uppercase',color:'rgba(255,255,255,0.28)',marginTop:'3px'}}>Admin Dashboard</div>
        </div>
        <nav style={{flex:1,padding:'0.75rem 0'}}>
          {[
            { id:'dashboard', icon:'ti-layout-dashboard', label:'Overview' },
            { id:'add', icon:'ti-plus', label: editId ? 'Edit Listing' : 'Add New Listing' },
            { id:'manage', icon:'ti-list', label:'Manage Listings' },
            { id:'inquiries', icon:'ti-mail', label:'Inquiries', badge: newInquiries },
            { id:'bio', icon:'ti-user', label:'My Bio & Story' },
          ].map(item => (
            <a key={item.id} href="#" onClick={e=>{e.preventDefault();setTab(item.id)}} style={{display:'flex',alignItems:'center',gap:'0.6rem',padding:'0.6rem 1.25rem',fontSize:'0.72rem',color:tab===item.id?'#fff':'rgba(255,255,255,0.5)',textDecoration:'none',borderLeft:`2px solid ${tab===item.id?'#B8975A':'transparent'}`,background:tab===item.id?'rgba(255,255,255,0.06)':'transparent'}}>
              <i className={`ti ${item.icon}`} />
              {item.label}
              {item.badge ? <span style={{background:'#B8975A',color:'#fff',fontSize:'0.55rem',fontWeight:600,padding:'0.1rem 0.4rem',borderRadius:'10px',marginLeft:'auto'}}>{item.badge}</span> : null}
            </a>
          ))}
        </nav>
        <div style={{padding:'1rem',borderTop:'1px solid rgba(255,255,255,0.07)'}}>
          <a href="/" target="_blank" style={{display:'flex',alignItems:'center',gap:'0.5rem',fontSize:'0.62rem',color:'rgba(255,255,255,0.35)',textDecoration:'none',marginBottom:'0.5rem'}}>
            <i className="ti ti-external-link" /> View Site
          </a>
          <button onClick={async()=>{await getSupabase().auth.signOut();setAuthed(false)}} style={{background:'none',border:'none',color:'rgba(255,255,255,0.35)',fontSize:'0.62rem',cursor:'pointer',padding:0,display:'flex',alignItems:'center',gap:'0.5rem'}}>
            <i className="ti ti-logout" /> Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{background:'#F2F1ED',overflow:'auto'}}>
        <div style={{background:'#fff',borderBottom:'1px solid #E2E0DA',padding:'0 2rem',height:'56px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{fontSize:'0.78rem',fontWeight:600,color:'#111110'}}>
            {tab==='dashboard'?'Overview':tab==='add'?editId?'Edit Listing':'Add New Listing':tab==='manage'?'Manage Listings':tab==='inquiries'?'Inquiries':'My Bio & Story'}
          </div>
          <div style={{fontSize:'0.65rem',color:'#9B9B98'}}>{live} live · {draft} draft · {rented} rented</div>
        </div>

        <div style={{padding:'2rem'}}>

          {/* DASHBOARD */}
          {tab==='dashboard' && (
            <div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'1rem',marginBottom:'2rem'}}>
                {[
                  {label:'Live Listings',value:live,action:()=>{setManageFilter('active');setTab('manage')}},
                  {label:'Drafts',value:draft,action:()=>{setManageFilter('draft');setTab('manage')}},
                  {label:'Inquiries',value:inquiries.length,action:()=>setTab('inquiries')},
                  {label:'Rented',value:rented,action:()=>{setManageFilter('rented');setTab('manage')}},
                ].map(s=>(
                  <div key={s.label} style={{background:'#fff',border:'1px solid #E2E0DA',padding:'1.5rem'}}>
                    <div style={{fontSize:'2rem',fontFamily:"'Cormorant Garamond',Georgia,serif",fontWeight:300,color:'#111110'}}>{s.value}</div>
                    <div style={{fontSize:'0.6rem',fontWeight:600,letterSpacing:'0.14em',textTransform:'uppercase',color:'#9B9B98',margin:'0.25rem 0 1rem'}}>{s.label}</div>
                    <button onClick={s.action} style={{fontSize:'0.58rem',fontWeight:600,letterSpacing:'0.12em',textTransform:'uppercase',color:'#B8975A',background:'none',border:'none',cursor:'pointer',padding:0}}>Manage →</button>
                  </div>
                ))}
              </div>
              <div style={{background:'#fff',border:'1px solid #E2E0DA',padding:'1.5rem'}}>
                <div style={{fontSize:'0.6rem',fontWeight:600,letterSpacing:'0.16em',textTransform:'uppercase',color:'#9B9B98',marginBottom:'1rem'}}>Recent Listings</div>
                {listings.slice(0,5).map(l=>(
                  <div key={l.id} onClick={()=>editListing(l)} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.75rem 0',borderBottom:'1px solid #E2E0DA',cursor:'pointer'}}>
                    <div>
                      <div style={{fontSize:'0.78rem',fontWeight:500,color:'#111110'}}>{l.neighborhood}</div>
                      <div style={{fontSize:'0.65rem',color:'#9B9B98'}}>{l.price} · {l.beds||'Studio'} bed</div>
                    </div>
                    <span style={{fontSize:'0.55rem',fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase',padding:'0.2rem 0.6rem',background:l.status==='live'?'#E8F5EE':l.status==='draft'?'#F2F1ED':'#F3EEFF',color:l.status==='live'?'#1A6B3A':l.status==='draft'?'#6B6B68':'#7B5EA7'}}>{l.status}</span>
                  </div>
                ))}
                <button onClick={()=>setTab('add')} style={{marginTop:'1rem',fontSize:'0.6rem',fontWeight:600,letterSpacing:'0.14em',textTransform:'uppercase',color:'#fff',background:'#111110',border:'none',cursor:'pointer',padding:'0.65rem 1.25rem'}}>+ Add New Listing</button>
              </div>
            </div>
          )}

          {/* ADD / EDIT LISTING */}
          {tab==='add' && (
            <div style={{background:'#fff',border:'1px solid #E2E0DA',padding:'2rem'}}>
              <div style={{fontSize:'0.6rem',fontWeight:600,letterSpacing:'0.16em',textTransform:'uppercase',color:'#9B9B98',marginBottom:'1.5rem'}}>{editId ? 'Editing Listing' : 'New Listing'}</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
                {[
                  {label:'Neighborhood',key:'neighborhood',placeholder:'Upper West Side'},
                  {label:'Price',key:'price',placeholder:'$3,200/mo'},
                  {label:'Beds',key:'beds',placeholder:'2 or Studio'},
                  {label:'Baths',key:'baths',placeholder:'1'},
                  {label:'Lease Length',key:'lease_length',placeholder:'12 months'},
                  {label:'Badge',key:'badge',placeholder:'New, Featured...'},
                  {label:'Concessions',key:'concessions',placeholder:'1 month free'},
                  {label:'Full Address (private)',key:'full_address',placeholder:'123 Main St, Apt 4B'},
                ].map(f=>(
                  <div key={f.key}>
                    <label style={{display:'block',fontSize:'0.52rem',fontWeight:600,letterSpacing:'0.14em',textTransform:'uppercase',color:'#9B9B98',marginBottom:'0.3rem'}}>{f.label}</label>
                    <input value={(form as any)[f.key]} onChange={e=>setForm(prev=>({...prev,[f.key]:e.target.value}))} placeholder={f.placeholder} style={{width:'100%',background:'#F8F7F4',border:'1px solid #E2E0DA',color:'#111110',fontFamily:'inherit',fontSize:'0.8rem',padding:'0.6rem 0.85rem',outline:'none'}} />
                  </div>
                ))}
              </div>
              <div style={{marginTop:'1rem'}}>
                <label style={{display:'block',fontSize:'0.52rem',fontWeight:600,letterSpacing:'0.14em',textTransform:'uppercase',color:'#9B9B98',marginBottom:'0.3rem'}}>Description</label>
                <textarea value={form.description} onChange={e=>setForm(prev=>({...prev,description:e.target.value}))} placeholder="Describe the apartment..." rows={4} style={{width:'100%',background:'#F8F7F4',border:'1px solid #E2E0DA',color:'#111110',fontFamily:'inherit',fontSize:'0.8rem',padding:'0.6rem 0.85rem',outline:'none',resize:'vertical'}} />
              </div>
              <div style={{marginTop:'1rem'}}>
                <label style={{display:'block',fontSize:'0.52rem',fontWeight:600,letterSpacing:'0.14em',textTransform:'uppercase',color:'#9B9B98',marginBottom:'0.3rem'}}>Amenities (comma separated)</label>
                <input value={form.amenities as string} onChange={e=>setForm(prev=>({...prev,amenities:e.target.value}))} placeholder="Doorman, Gym, Laundry..." style={{width:'100%',background:'#F8F7F4',border:'1px solid #E2E0DA',color:'#111110',fontFamily:'inherit',fontSize:'0.8rem',padding:'0.6rem 0.85rem',outline:'none'}} />
              </div>
              <div style={{marginTop:'1rem',display:'flex',alignItems:'center',gap:'0.75rem'}}>
                <input type="checkbox" id="op_paid" checked={form.op_paid} onChange={e=>setForm(prev=>({...prev,op_paid:e.target.checked}))} />
                <label htmlFor="op_paid" style={{fontSize:'0.75rem',color:'#2C2C2A',cursor:'pointer'}}>Owner Paid (No Fee)</label>
              </div>
              <div style={{marginTop:'1.5rem',display:'flex',gap:'0.75rem'}}>
                <button onClick={()=>saveListing('live')} style={{background:'#111110',color:'#fff',fontFamily:'inherit',fontSize:'0.6rem',fontWeight:600,letterSpacing:'0.16em',textTransform:'uppercase',padding:'0.75rem 1.5rem',border:'none',cursor:'pointer'}}>
                  {saveStatus==='saving'?'Saving...':saveStatus==='saved'?'✓ Published!':'Publish Live'}
                </button>
                <button onClick={()=>saveListing('draft')} style={{background:'#fff',color:'#6B6B68',fontFamily:'inherit',fontSize:'0.6rem',fontWeight:500,padding:'0.75rem 1.5rem',border:'1px solid #E2E0DA',cursor:'pointer'}}>Save as Draft</button>
                {editId && <button onClick={()=>{setForm(EMPTY_LISTING);setEditId(null)}} style={{background:'#fff',color:'#C0392B',fontFamily:'inherit',fontSize:'0.6rem',fontWeight:500,padding:'0.75rem 1.5rem',border:'1px solid #FDECEA',cursor:'pointer'}}>Cancel Edit</button>}
              </div>
            </div>
          )}

          {/* MANAGE */}
          {tab==='manage' && (
            <div>
              <div style={{display:'flex',gap:'0.5rem',marginBottom:'1.5rem'}}>
                {['all','active','draft','rented'].map(f=>(
                  <button key={f} onClick={()=>setManageFilter(f)} style={{fontSize:'0.58rem',fontWeight:600,letterSpacing:'0.12em',textTransform:'uppercase',padding:'0.4rem 1rem',border:'1px solid #E2E0DA',cursor:'pointer',background:manageFilter===f?'#111110':'#fff',color:manageFilter===f?'#fff':'#6B6B68'}}>
                    {f==='all'?'All':f==='active'?'Live':f.charAt(0).toUpperCase()+f.slice(1)}
                  </button>
                ))}
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:'0.75rem'}}>
                {filteredListings.map(l=>(
                  <div key={l.id} style={{background:'#fff',border:'1px solid #E2E0DA',padding:'1.25rem 1.5rem',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div>
                      <div style={{fontSize:'0.85rem',fontWeight:500,color:'#111110',marginBottom:'0.2rem'}}>{l.neighborhood} · {l.price}</div>
                      <div style={{fontSize:'0.65rem',color:'#9B9B98'}}>{l.beds||'Studio'} bed · {l.baths} bath · {l.lease_length}</div>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
                      <span style={{fontSize:'0.55rem',fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase',padding:'0.2rem 0.6rem',background:l.status==='live'?'#E8F5EE':l.status==='draft'?'#F2F1ED':'#F3EEFF',color:l.status==='live'?'#1A6B3A':l.status==='draft'?'#6B6B68':'#7B5EA7'}}>{l.status}</span>
                      <button onClick={()=>editListing(l)} style={{fontSize:'0.6rem',fontWeight:500,color:'#1B3A6B',background:'none',border:'none',cursor:'pointer'}}>Edit</button>
                      <button onClick={()=>deleteListing(l.id!)} style={{fontSize:'0.6rem',fontWeight:500,color:'#C0392B',background:'none',border:'none',cursor:'pointer'}}>Delete</button>
                    </div>
                  </div>
                ))}
                {filteredListings.length === 0 && <div style={{textAlign:'center',padding:'3rem',color:'#9B9B98',fontSize:'0.78rem'}}>No listings found.</div>}
              </div>
            </div>
          )}

          {/* INQUIRIES */}
          {tab==='inquiries' && (
            <div style={{display:'flex',flexDirection:'column',gap:'0.75rem'}}>
              {inquiries.map(i=>(
                <div key={i.id} style={{background:'#fff',border:'1px solid #E2E0DA',padding:'1.5rem'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'0.75rem'}}>
                    <div>
                      <div style={{fontSize:'0.85rem',fontWeight:600,color:'#111110'}}>{i.first_name} {i.last_name}</div>
                      <div style={{fontSize:'0.65rem',color:'#9B9B98'}}>{i.email} · {i.phone}</div>
                    </div>
                    <select value={i.status} onChange={e=>updateInquiryStatus(i.id,e.target.value)} style={{fontSize:'0.6rem',fontFamily:'inherit',background:'#F8F7F4',border:'1px solid #E2E0DA',padding:'0.3rem 0.6rem',color:'#111110',outline:'none'}}>
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                  {i.message && <p style={{fontSize:'0.75rem',color:'#6B6B68',lineHeight:1.7,marginBottom:'0.5rem'}}>{i.message}</p>}
                  <div style={{fontSize:'0.6rem',color:'#9B9B98'}}>
                    {i.inquiry_type} · {i.neighborhood||'Any'} · {i.budget||'Flexible'} · {new Date(i.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
              {inquiries.length === 0 && <div style={{textAlign:'center',padding:'3rem',color:'#9B9B98',fontSize:'0.78rem'}}>No inquiries yet.</div>}
            </div>
          )}

          {/* BIO */}
          {tab==='bio' && (
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1.5rem'}}>
              <div style={{background:'#fff',border:'1px solid #E2E0DA',padding:'1.5rem'}}>
                <div style={{fontSize:'0.6rem',fontWeight:600,letterSpacing:'0.16em',textTransform:'uppercase',color:'#9B9B98',marginBottom:'1.25rem'}}>Profile Photo</div>
                {photoUrl && <img src={photoUrl} alt="Profile" style={{width:'120px',height:'120px',objectFit:'cover',objectPosition:'center top',marginBottom:'1rem',display:'block'}} />}
                <input ref={photoInputRef} type="file" accept="image/*" onChange={uploadPhoto} style={{display:'none'}} />
                <button onClick={()=>photoInputRef.current?.click()} disabled={photoUploading} style={{fontSize:'0.6rem',fontWeight:600,letterSpacing:'0.14em',textTransform:'uppercase',color:'#fff',background:'#111110',border:'none',cursor:'pointer',padding:'0.65rem 1.25rem',marginBottom:'0.5rem'}}>
                  {photoUploading ? 'Uploading...' : photoUrl ? 'Replace Photo' : 'Upload Photo'}
                </button>
                <div style={{fontSize:'0.62rem',color:'#9B9B98',marginTop:'0.4rem'}}>This will appear on the public site.</div>

                <div style={{borderTop:'1px solid #E2E0DA',marginTop:'1.5rem',paddingTop:'1.5rem'}}>
                  <div style={{fontSize:'0.6rem',fontWeight:600,letterSpacing:'0.16em',textTransform:'uppercase',color:'#9B9B98',marginBottom:'1rem'}}>Contact Details</div>
                  {[
                    {label:'Phone',value:phone,set:setPhone,placeholder:'(212) 555-0100'},
                    {label:'Email',value:contactEmail,set:setContactEmail,placeholder:'leo@leowilliamsnyc.com'},
                  ].map(f=>(
                    <div key={f.label} style={{marginBottom:'0.75rem'}}>
                      <label style={{display:'block',fontSize:'0.52rem',fontWeight:600,letterSpacing:'0.14em',textTransform:'uppercase',color:'#9B9B98',marginBottom:'0.3rem'}}>{f.label}</label>
                      <input value={f.value} onChange={e=>f.set(e.target.value)} placeholder={f.placeholder} style={{width:'100%',background:'#F8F7F4',border:'1px solid #E2E0DA',color:'#111110',fontFamily:'inherit',fontSize:'0.8rem',padding:'0.6rem 0.85rem',outline:'none'}} />
                    </div>
                  ))}
                </div>
              </div>

              <div style={{background:'#fff',border:'1px solid #E2E0DA',padding:'1.5rem'}}>
                <div style={{fontSize:'0.6rem',fontWeight:600,letterSpacing:'0.16em',textTransform:'uppercase',color:'#9B9B98',marginBottom:'1.25rem'}}>Generate Bio with AI</div>
                {[
                  {label:'What brought you to NYC real estate?',value:bioQ1,set:setBioQ1},
                  {label:'What makes you different from other agents?',value:bioQ2,set:setBioQ2},
                  {label:'What do your clients say about working with you?',value:bioQ3,set:setBioQ3},
                ].map((q,idx)=>(
                  <div key={idx} style={{marginBottom:'1rem'}}>
                    <label style={{display:'block',fontSize:'0.62rem',color:'#6B6B68',marginBottom:'0.3rem'}}>{q.label}</label>
                    <textarea value={q.value} onChange={e=>q.set(e.target.value)} rows={2} style={{width:'100%',background:'#F8F7F4',border:'1px solid #E2E0DA',color:'#111110',fontFamily:'inherit',fontSize:'0.78rem',padding:'0.6rem 0.85rem',outline:'none',resize:'vertical'}} />
                  </div>
                ))}
                <button onClick={generateBio} disabled={bioGenerating} style={{fontSize:'0.6rem',fontWeight:600,letterSpacing:'0.14em',textTransform:'uppercase',color:'#fff',background:'#1B3A6B',border:'none',cursor:'pointer',padding:'0.65rem 1.25rem',marginBottom:'1.5rem'}}>
                  {bioGenerating ? 'Generating...' : '✨ Generate Bio'}
                </button>

                <div style={{fontSize:'0.6rem',fontWeight:600,letterSpacing:'0.16em',textTransform:'uppercase',color:'#9B9B98',marginBottom:'0.5rem'}}>Bio Text</div>
                <textarea value={bio} onChange={e=>setBio(e.target.value)} rows={6} placeholder="Your bio will appear here..." style={{width:'100%',background:'#F8F7F4',border:'1px solid #E2E0DA',color:'#111110',fontFamily:'inherit',fontSize:'0.78rem',padding:'0.6rem 0.85rem',outline:'none',resize:'vertical',marginBottom:'1rem'}} />

                <button onClick={saveProfile} style={{fontSize:'0.6rem',fontWeight:600,letterSpacing:'0.14em',textTransform:'uppercase',color:'#fff',background:'#111110',border:'none',cursor:'pointer',padding:'0.65rem 1.25rem'}}>
                  {bioSaved ? '✓ Saved!' : 'Save Profile'}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
