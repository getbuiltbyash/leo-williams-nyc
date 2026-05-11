'use client'
import { useEffect, useState, useRef } from 'react'
import { getSupabase } from '@/lib/supabase'

type Listing = {
  id: string
  neighborhood: string
  full_address?: string
  price: string
  beds: number | string | null
  baths: number | string | null
  lease_length?: string
  concessions?: string
  op_paid?: boolean
  description?: string
  amenities?: string[]
  photos?: string[]
  status: string
  badge?: string
}

type Profile = {
  bio_text?: string
  tagline?: string
  photo_url?: string
  phone?: string
  email?: string
}

const HERO_IMG = 'https://images.pexels.com/photos/5997967/pexels-photo-5997967.jpeg?auto=compress&cs=tinysrgb&w=1200'
const FALLBACK_IMG = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=700&q=80'

function bedsLabel(beds: number | string | null): string {
  if (!beds || beds === '0' || beds === 0) return 'Studio'
  return String(beds)
}

export default function Home() {
  const [listings, setListings] = useState<Listing[]>([])
  const [filtered, setFiltered] = useState<Listing[]>([])
  const [profile, setProfile] = useState<Profile>({})
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<Listing | null>(null)
  const [carouselIdx, setCarouselIdx] = useState(0)
  const [formData, setFormData] = useState({ first_name:'', last_name:'', email:'', phone:'', city:'', neighborhood:'', budget:'', move_in:'', message:'', inquiry_type:'renter' })
  const [formSent, setFormSent] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [searchHood, setSearchHood] = useState('Any')
  const [searchBeds, setSearchBeds] = useState('Any')
  const [searchMin, setSearchMin] = useState('No min')
  const [searchMax, setSearchMax] = useState('No max')
  const listingsRef = useRef<HTMLElement>(null)

  useEffect(() => {
    loadListings()
    loadProfile()
  }, [])

  useEffect(() => {
    if (modal) {
      document.body.style.overflow = 'hidden'
      setCarouselIdx(0)
    } else {
      document.body.style.overflow = ''
    }
  }, [modal])

  async function loadListings() {
    try {
      const { data, error } = await getSupabase()
        .from('listings')
        .select('*')
        .in('status', ['live', 'rented'])
        .order('created_at', { ascending: false })
      if (error) throw error
      setListings(data || [])
      setFiltered(data || [])
    } catch(e) {
      console.error('Listings fetch failed:', e)
    } finally {
      setLoading(false)
    }
  }

  async function loadProfile() {
    const { data } = await getSupabase().from('profile').select('*').limit(1).single()
    if (data) setProfile(data)
  }

  function filterListings() {
    const priceMap: Record<string,number> = {'No min':0,'$1,500/mo':1500,'$2,000/mo':2000,'$2,500/mo':2500,'$3,500/mo':3500}
    const maxMap: Record<string,number> = {'No max':99999,'$2,500/mo':2500,'$3,500/mo':3500,'$5,000/mo':5000,'$7,500+':7500}
    const minP = priceMap[searchMin] || 0
    const maxP = maxMap[searchMax] || 99999
    const result = listings.filter(l => {
      const bv = bedsLabel(l.beds)
      const price = parseInt((l.price||'0').replace(/[^0-9]/g,'')) || 0
      const hoodMatch = searchHood === 'Any' || l.neighborhood.toLowerCase().includes(searchHood.toLowerCase())
      const bedsMatch = searchBeds === 'Any' ||
        (searchBeds === 'Studio' && bv === 'Studio') ||
        (searchBeds === '1 Bed' && bv === '1') ||
        (searchBeds === '2 Bed' && bv === '2') ||
        (searchBeds === '3+ Bed' && parseInt(bv) >= 3)
      const priceMatch = price >= minP && price <= maxP
      return hoodMatch && bedsMatch && priceMatch
    })
    setFiltered(result)
    listingsRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  function filterByHood(hood: string) {
    const result = listings.filter(l => l.neighborhood === hood)
    setFiltered(result)
    listingsRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const hoods = Array.from(new Set(listings.map(l => l.neighborhood)))

  async function submitForm(e: React.FormEvent) {
    e.preventDefault()
    setFormLoading(true)
    const neighborhoodStr = [formData.city, formData.neighborhood].filter(Boolean).join(' - ')
    const { error } = await getSupabase().from('inquiries').insert([{ ...formData, neighborhood: neighborhoodStr, status: 'new', source: 'website' }])
    setFormLoading(false)
    if (!error) setFormSent(true)
  }

  const photos = modal?.photos?.length ? modal.photos : [FALLBACK_IMG]

  return (
    <>
      {/* NAV */}
      <nav>
        <a href="/" className="nav-logo">
          <span className="nav-logo-name">Leo <em>Williams</em></span>
          <span className="nav-logo-sub">Real Estate Salesperson</span>
        </a>
        <ul className="nav-links">
          <li><a href="#listings">Listings</a></li>
          <li><a href="#neighborhoods">Neighborhoods</a></li>
          <li><a href="#about">About</a></li>
          <li><a href="#contact">Contact</a></li>
        </ul>
        <a href="#contact" className="nav-cta">Contact Me</a>
      </nav>

      {/* HERO */}
      <div className="hero">
        <div className="hero-img">
          <img src={HERO_IMG} alt="New York City" />
        </div>
        <div className="hero-content">
          <div className="eyebrow">— NYC Rental Specialist</div>
          <h1 className="hero-h1">The City.<br /><em>Perfectly</em><br />Placed.</h1>
          <div className="hero-rule" />
          <p className="hero-sub">Curated rentals and expert guidance across New York. I&apos;ll find you the right place and get you moved in, fast.</p>
          <div className="hero-btns">
            <a href="#listings" className="btn-dark">Browse Listings</a>
            <a href="#contact" className="btn-outline">Request a Tour</a>
          </div>
          <div className="search-block">
            <div className="search-label">Search Rentals</div>
            <div className="sfields">
              <div className="sf"><label>Neighborhood</label>
                <select value={searchHood} onChange={e=>setSearchHood(e.target.value)}>
                  <option>Any</option>
                  {hoods.map(h=><option key={h}>{h}</option>)}
                </select>
              </div>
              <div className="sf"><label>Bedrooms</label>
                <select value={searchBeds} onChange={e=>setSearchBeds(e.target.value)}>
                  <option>Any</option><option>Studio</option><option>1 Bed</option><option>2 Bed</option><option>3+ Bed</option>
                </select>
              </div>
              <div className="sf"><label>Min Price</label>
                <select value={searchMin} onChange={e=>setSearchMin(e.target.value)}>
                  <option>No min</option><option>$1,500/mo</option><option>$2,000/mo</option><option>$2,500/mo</option><option>$3,500/mo</option>
                </select>
              </div>
              <div className="sf"><label>Max Price</label>
                <select value={searchMax} onChange={e=>setSearchMax(e.target.value)}>
                  <option>No max</option><option>$2,500/mo</option><option>$3,500/mo</option><option>$5,000/mo</option><option>$7,500+</option>
                </select>
              </div>
            </div>
            <button className="search-btn" onClick={filterListings}>Search Listings</button>
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="stats-strip">
        <div className="stat"><div className="stat-n">New York</div><div className="stat-l">Modern Luxury Rentals</div></div>
        <div className="stat"><div className="stat-n">Same-Day</div><div className="stat-l">Response Guaranteed</div></div>
        <div className="stat"><div className="stat-n">Curated</div><div className="stat-l">Listings Tailored to Clients</div></div>
      </div>

      {/* LISTINGS */}
      <section id="listings" ref={listingsRef} style={{paddingTop:'4rem',paddingBottom:'5rem'}}>
        <div className="sec-header">
          <div>
            <div className="sec-label">Featured Listings</div>
            <h2 className="sec-title">Current Availability</h2>
          </div>
          <button className="link-more" onClick={()=>{ setFiltered(listings); listingsRef.current?.scrollIntoView({behavior:'smooth'}) }}>View all listings →</button>
        </div>
        <div className="listings-grid">
          {loading ? (
            <div style={{gridColumn:'1/-1',textAlign:'center',padding:'3rem',color:'var(--ink4)',fontSize:'0.78rem'}}>Loading listings...</div>
          ) : filtered.length === 0 ? (
            <div style={{gridColumn:'1/-1',textAlign:'center',padding:'3rem',color:'var(--ink4)',fontSize:'0.78rem'}}>No listings match your search.</div>
          ) : filtered.map(l => {
            const bv = bedsLabel(l.beds)
            const photo = l.photos?.length ? l.photos[0] : FALLBACK_IMG
            return (
              <div key={l.id} className="lcard" onClick={()=>setModal(l)}>
                <div className="lcard-img">
                  {l.op_paid && <span className="lcard-badge badge-nofee">No Fee</span>}
                  {!l.op_paid && l.badge && <span className="lcard-badge badge-new">{l.badge}</span>}
                  {l.status === 'rented' && <span className="lcard-badge" style={{background:'var(--blue)',color:'var(--white)',right:'0.85rem',left:'auto'}}>Rented</span>}
                  <img src={photo} alt={l.neighborhood} loading="lazy" />
                </div>
                <div className="lcard-body">
                  <div className="lcard-price">{l.price}</div>
                  <div className="lcard-name">{l.neighborhood}{bv ? ` · ${bv}${bv === 'Studio' ? '' : ' Bed'}` : ''}</div>
                  <div className="lcard-loc">📍 {l.neighborhood}</div>
                  <div className="lcard-specs">
                    <div className="lcard-spec"><strong>{bv}</strong>{bv === 'Studio' ? 'Type' : 'Bed'}</div>
                    <div className="lcard-spec"><strong>{l.baths || '—'}</strong>Bath</div>
                    <div className="lcard-spec"><strong>{l.lease_length || '—'}</strong>Lease</div>
                  </div>
                  <div className="lcard-hint">📷 View photos &amp; details</div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <div className="gold-rule" />

      {/* NEIGHBORHOODS */}
      <section className="hoods-sec" id="neighborhoods" style={{padding:'5rem 4rem'}}>
        <div className="sec-header">
          <div>
            <div className="sec-label">Explore by Area</div>
            <h2 className="sec-title">NYC Neighborhood Guides</h2>
            <p className="sec-sub" style={{marginTop:'0.5rem'}}>Not sure where to live? I can guide you to the right neighborhood.</p>
          </div>
        </div>
        <div className="hoods-grid">
          {hoods.length > 0 ? hoods.map(hood => {
            const count = listings.filter(l=>l.neighborhood===hood).length
            return (
              <div key={hood} className="hood-card" onClick={()=>filterByHood(hood)}>
                <div className="hood-name">{hood}</div>
                <div className="hood-count">{count} listing{count!==1?'s':''} available</div>
              </div>
            )
          }) : ['Upper West Side','Upper East Side','Midtown','West Village','Williamsburg','Astoria, Queens'].map(hood=>(
            <div key={hood} className="hood-card" onClick={()=>filterByHood(hood)}>
              <div className="hood-name">{hood}</div>
              <div className="hood-count">View available listings</div>
            </div>
          ))}
        </div>
      </section>

      <div className="gold-rule" />

      {/* LANDLORD */}
      <div className="landlord-sec" id="landlords">
        <div>
          <div className="landlord-label">For Landlords &amp; Property Owners</div>
          <h2 className="landlord-title">Your vacancy,<br />filled with the<br /><em style={{fontStyle:'italic',color:'var(--gold)'}}>right people.</em></h2>
        </div>
        <div>
          <div className="landlord-points">
            {[
              ['Qualified tenants only', 'pre-screened and ready to move. No tire-kickers, no wasted showings.'],
              ['A 3D digital twin of your space', 'giving renters an immersive look before the first showing. Better presentation, more serious inquiries.'],
              ['Full-service representation', 'from listing to signed lease. One point of contact, handled properly.'],
            ].map(([bold, rest]) => (
              <div key={bold} className="landlord-point">
                <div className="landlord-point-icon">✓</div>
                <div className="landlord-point-text"><strong>{bold}</strong>, {rest}</div>
              </div>
            ))}
          </div>
          <a href="#contact" className="landlord-cta">List Your Property</a>
        </div>
      </div>

      <div className="gold-rule" />

      {/* ABOUT */}
      <section className="about-sec" id="about">
        <div className="about-img-wrap">
          <img src={profile.photo_url || '/leo-headshot.jpg'} alt="Leo Williams" style={{width:'100%',height:'100%',minHeight:'520px',objectFit:'cover',objectPosition:'center top',display:'block'}} />
        </div>
        <div className="about-content">
          <div className="sec-label">About Leo</div>
          <h2 className="sec-title">New York.<br />No Runaround.<br />No Guesswork.</h2>
          <p className="about-body">
            {profile.bio_text || "I've spent years learning this city, neighborhood by neighborhood. The buildings worth living in, the landlords who actually take care of their tenants, and the homes that feel right the moment you walk in. Whether you're relocating, renting for the first time, or just ready for something better, I'll get you there without the runaround."}
          </p>
          <blockquote className="about-quote">
            &ldquo;I don&apos;t just find you an apartment. I find you a home that actually fits your life.&rdquo;
          </blockquote>
          <div className="chips">
            {['Licensed Salesperson','DiGiulio Group','NYC Specialist','FARE Act Compliant'].map(c=>(
              <span key={c} className="chip">{c}</span>
            ))}
          </div>
          <a href="#contact" className="btn-dark" style={{alignSelf:'flex-start'}}>Work with Me</a>
        </div>
      </section>

      {/* CONTACT */}
      <section className="contact-sec" id="contact">
        <div className="contact-left">
          <div className="sec-label" style={{color:'var(--gold)'}}>Get in Touch</div>
          <h2 className="sec-title" style={{color:'var(--white)'}}>Find Your<br />Next Apartment</h2>
          <p className="contact-sub">Get in touch or request a tour on any listing. I'll get back to you the same day.</p>
          <div className="cways">
            <div className="cway">
              <div className="cway-icon">📞</div>
              <span>{profile.phone && profile.phone.trim() ? <a href={`tel:${profile.phone}`}>{profile.phone}</a> : 'Update in admin'}</span>
            </div>
            <div className="cway">
              <div className="cway-icon">✉</div>
              <span>{profile.email && profile.email.trim() ? <a href={`mailto:${profile.email}`}>{profile.email}</a> : 'Update in admin'}</span>
            </div>
            <div className="cway">
              <div className="cway-icon">🏢</div>
              <span>DiGiulio Group · New York, NY</span>
            </div>
          </div>
        </div>
        <div className="contact-right">
          {formSent ? (
            <div style={{textAlign:'center',padding:'3rem 0'}}>
              <div style={{fontFamily:'var(--serif)',fontSize:'1.8rem',fontWeight:300,marginBottom:'0.75rem'}}>Thank you.</div>
              <p style={{fontSize:'0.8rem',color:'var(--ink3)'}}>I&apos;ll be in touch within one business day.</p>
            </div>
          ) : (
            <form onSubmit={submitForm}>
              <div className="form-section-label">Your Inquiry</div>
              <div style={{display:'flex',gap:'0',marginBottom:'1.25rem'}}>
                <button type="button" className={`type-btn ${formData.inquiry_type==='renter'?'active':'inactive'}`} onClick={()=>setFormData(f=>({...f,inquiry_type:'renter'}))}>I am a Renter</button>
                <button type="button" className={`type-btn ${formData.inquiry_type==='landlord'?'active':'inactive'}`} onClick={()=>setFormData(f=>({...f,inquiry_type:'landlord'}))}>I am a Landlord</button>
              </div>
              <div className="form-row">
                <div className="ff"><label>First Name</label><input required placeholder="Jane" value={formData.first_name} onChange={e=>setFormData(f=>({...f,first_name:e.target.value}))} /></div>
                <div className="ff"><label>Last Name</label><input required placeholder="Smith" value={formData.last_name} onChange={e=>setFormData(f=>({...f,last_name:e.target.value}))} /></div>
              </div>
              <div className="form-row">
                <div className="ff"><label>Email</label><input required type="email" placeholder="jane@email.com" value={formData.email} onChange={e=>setFormData(f=>({...f,email:e.target.value}))} /></div>
                <div className="ff"><label>Phone</label><input placeholder="(212) 555-0100" value={formData.phone} onChange={e=>setFormData(f=>({...f,phone:e.target.value}))} /></div>
              </div>
              <div className="form-row">
                <div className="ff"><label>City / Borough</label>
                  <select value={formData.city} onChange={e=>setFormData(f=>({...f,city:e.target.value}))}>
                    <option value="" disabled>e.g. Manhattan, Brooklyn...</option>
                    <option>Manhattan</option>
                    <option>Brooklyn</option>
                    <option>Queens</option>
                    <option>The Bronx</option>
                    <option>Staten Island</option>
                  </select>
                </div>
                <div className="ff"><label>Budget</label>
                  <input type="text" placeholder="e.g. $3,000/mo or flexible" value={formData.budget} onChange={e=>setFormData(f=>({...f,budget:e.target.value}))} />
                </div>
              </div>
              <div className="ff"><label>Specific Neighborhoods (optional)</label>
                <input type="text" placeholder="e.g. Williamsburg, Upper West Side, Nolita..." value={formData.neighborhood} onChange={e=>setFormData(f=>({...f,neighborhood:e.target.value}))} />
              </div>
              <div className="ff"><label>Move-in Date</label>
                <input type="text" placeholder="e.g. June 1, ASAP, flexible..." value={formData.move_in} onChange={e=>setFormData(f=>({...f,move_in:e.target.value}))} />
              </div>
              <div className="ff"><label>Message</label><textarea placeholder="Tell me what you're looking for..." value={formData.message} onChange={e=>setFormData(f=>({...f,message:e.target.value}))} /></div>
              <button type="submit" className="form-submit" disabled={formLoading}>{formLoading ? 'Sending...' : 'Send Message'}</button>
            </form>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="footer-logo">Leo Williams · Licensed Real Estate Salesperson · <a href="https://digiuliogroup.com" target="_blank" rel="noopener noreferrer" style={{color:'var(--gold)',textDecoration:'none'}}>DiGiulio Group</a></div>
        <ul className="footer-links">
          <li><a href="#listings">Listings</a></li>
          <li><a href="#neighborhoods">Neighborhoods</a></li>
          <li><a href="#about">About</a></li>
          <li><a href="#contact">Contact</a></li>
        </ul>
        <div className="footer-copy">© {new Date().getFullYear()} Leo Williams. All rights reserved.</div>
      </footer>

      {/* MODAL */}
      {modal && (
        <div className="modal-overlay open" onClick={e=>{if(e.target===e.currentTarget)setModal(null)}}>
          <div className="modal">
            <button className="modal-close" onClick={()=>setModal(null)}>✕</button>
            <div className="carousel">
              <div className="carousel-track" style={{transform:`translateX(-${carouselIdx*100}%)`}}>
                {photos.map((p,i)=>(
                  <div key={i} className="carousel-slide"><img src={p} alt={`Photo ${i+1}`} /></div>
                ))}
              </div>
              {photos.length > 1 && <>
                <button className="cbtn cprev" onClick={()=>setCarouselIdx(i=>Math.max(0,i-1))}>‹</button>
                <button className="cbtn cnext" onClick={()=>setCarouselIdx(i=>Math.min(photos.length-1,i+1))}>›</button>
                <div className="cdots">
                  {photos.map((_,i)=><button key={i} className={`cdot${carouselIdx===i?' active':''}`} onClick={()=>setCarouselIdx(i)} />)}
                </div>
              </>}
              <div className="ccount">{carouselIdx+1} / {photos.length}</div>
            </div>
            <div className="modal-body">
              <div className="modal-price">{modal.price}</div>
              <div className="modal-name">{modal.neighborhood}{bedsLabel(modal.beds) ? ` · ${bedsLabel(modal.beds)}${bedsLabel(modal.beds)==='Studio'?'':' Bed'}` : ''}</div>
              <div className="modal-loc">📍 {modal.neighborhood}, New York</div>
              <div className="modal-specs">
                <div className="modal-spec"><strong>{bedsLabel(modal.beds)}</strong>Bed</div>
                <div className="modal-spec"><strong>{modal.baths || '—'}</strong>Bath</div>
                {modal.lease_length && <div className="modal-spec"><strong>{modal.lease_length}</strong>Lease</div>}
                {modal.op_paid && <div className="modal-spec"><strong style={{color:'var(--blue)'}}>No Fee</strong>Op Paid</div>}
              </div>
              {modal.description && <p className="modal-desc">{modal.description}</p>}
              {modal.concessions && <p style={{fontSize:'0.78rem',color:'var(--blue)',marginBottom:'1.25rem'}}>🎁 {modal.concessions}</p>}
              {modal.amenities && modal.amenities.length > 0 && <>
                <div className="modal-am-title">Amenities</div>
                <div className="modal-ams">{modal.amenities.map(a=><span key={a} className="modal-am">{a}</span>)}</div>
              </>}
              <div className="modal-actions">
                <a href="#contact" className="modal-cta" onClick={()=>setModal(null)}>Request a Tour</a>
                <a href="#contact" className="modal-cta-sec" onClick={()=>setModal(null)}>Ask a Question</a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
