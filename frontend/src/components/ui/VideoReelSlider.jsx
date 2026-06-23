import { useRef, useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, VolumeX, Volume2, X } from 'lucide-react'

// Auto-generate a thumbnail from the Cloudinary video URL (frame at 1 second, 80×80 crop).
// This avoids any external/hardcoded image dependency — each card shows its own video frame.
const cloudinaryVideoThumb = (videoUrl) =>
  videoUrl
    .replace('/video/upload/', '/video/upload/so_1.0,w_80,h_80,c_fill/')
    .replace(/\.mp4$/, '.jpg')

const REELS = [
  { video: 'https://res.cloudinary.com/drqutfwoe/video/upload/v1782126313/arebianveda/media/lbcl44n176i5bsxguqn7.mp4', label: 'Arebianveda Shilajit Resins', link: '/shop' },
  { video: 'https://res.cloudinary.com/drqutfwoe/video/upload/v1782126312/arebianveda/media/pu83mquervcy0mlj7l0r.mp4', label: 'Arebianveda Black Tower',    link: '/shop' },
  { video: 'https://res.cloudinary.com/drqutfwoe/video/upload/v1782126308/arebianveda/media/kdwqpask4coytakfsca8.mp4', label: 'Arebianveda Shilajit Lump', link: '/shop' },
  { video: 'https://res.cloudinary.com/drqutfwoe/video/upload/v1782126307/arebianveda/media/h51524piuskttuhydgju.mp4', label: 'Arebianveda D99 Kwath',     link: '/shop' },
  { video: 'https://res.cloudinary.com/drqutfwoe/video/upload/v1782126301/arebianveda/media/idt9aohsfpzviymu4puo.mp4', label: 'Arebianveda Shilajit Resins', link: '/shop' },
]

function getCardStyle(isMobile) {
  if (isMobile) {
    return {
      scrollSnapAlign: 'start',
      flexShrink: 0,
      width: '80vw',
      height: 'min(calc(80vw * 16 / 9), 78vh)',
    }
  }
  return { scrollSnapAlign: 'start', flexShrink: 0 }
}

export default function VideoReelSlider() {
  const sliderRef = useRef(null)
  const [popup, setPopup] = useState(null)
  const [muted, setMuted] = useState(true)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640)
  const popupVideoRef = useRef(null)

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const scroll = (dir) => {
    const el = sliderRef.current
    if (!el) return
    const cardW = el.firstChild?.offsetWidth || 280
    el.scrollBy({ left: dir * (cardW + 16), behavior: 'smooth' })
  }

  const openPopup  = (i) => { setMuted(true); setPopup(i) }
  const closePopup = () => setPopup(null)
  const prevPopup  = (e) => { e.stopPropagation(); setPopup(i => (i - 1 + REELS.length) % REELS.length) }
  const nextPopup  = (e) => { e.stopPropagation(); setPopup(i => (i + 1) % REELS.length) }

  useEffect(() => {
    if (popup !== null && popupVideoRef.current) {
      popupVideoRef.current.muted = muted
      popupVideoRef.current.play().catch(() => {})
    }
  }, [popup])

  useEffect(() => {
    if (popupVideoRef.current) popupVideoRef.current.muted = muted
  }, [muted])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') closePopup() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <style>{`
        .reel-slider::-webkit-scrollbar { display: none; }
        .reel-slider { -ms-overflow-style: none; scrollbar-width: none; }
        @media (min-width: 640px)  { .reel-card { width: 46% !important; height: 400px !important; } }
        @media (min-width: 768px)  { .reel-card { width: 32% !important; height: 420px !important; } }
        @media (min-width: 1024px) { .reel-card { width: 23% !important; height: 460px !important; } }
      `}</style>

      <section className="py-14 px-4 bg-[#faf9f6]">
        <div className="max-w-7xl mx-auto">

          <div className="text-center mb-8">
            <span className="badge-gold mb-3 inline-block">Our Products in Action</span>
            <h2 className="text-3xl md:text-4xl font-bold text-forest-900" style={{ fontFamily: "'Playfair Display', serif" }}>
              See Real Results
            </h2>
          </div>

          <div className="relative">

            <button onClick={() => scroll(-1)}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 hidden sm:flex w-9 h-14 bg-white shadow-lg items-center justify-center text-forest-800 hover:scale-110 transition-transform -translate-x-4 rounded-sm">
              <ChevronLeft size={22} />
            </button>

            <button onClick={() => scroll(1)}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 hidden sm:flex w-9 h-14 bg-white shadow-lg items-center justify-center text-forest-800 hover:scale-110 transition-transform translate-x-4 rounded-sm">
              <ChevronRight size={22} />
            </button>

            <div style={{ overflow: 'hidden' }}>
              <div
                ref={sliderRef}
                className="reel-slider"
                style={{ display: 'flex', gap: '16px', overflowX: 'auto', scrollSnapType: 'x mandatory', scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch' }}
              >
                {REELS.map((r, i) => (
                  <div
                    key={i}
                    className="reel-card relative bg-black cursor-pointer rounded-[20px] overflow-hidden shadow-xl transition-transform duration-300 hover:-translate-y-1"
                    style={getCardStyle(isMobile)}
                    onClick={() => openPopup(i)}
                  >
                    <video autoPlay muted loop playsInline className="w-full h-full object-cover">
                      <source src={r.video} />
                    </video>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                    <a
                      href={r.link}
                      onClick={e => e.stopPropagation()}
                      className="absolute bottom-3 left-3 flex items-center gap-2 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-2xl text-xs font-semibold text-black shadow-lg hover:-translate-y-0.5 transition-transform"
                      style={{ maxWidth: 'calc(100% - 24px)' }}
                    >
                      <img src={cloudinaryVideoThumb(r.video)} alt={r.label} className="w-5 h-5 rounded-md object-cover flex-shrink-0" onError={e => { e.target.style.display = 'none' }} />
                      <span className="truncate">{r.label}</span>
                    </a>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {popup !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/93 flex items-center justify-center"
          onClick={closePopup}
        >
          <button onClick={prevPopup}
            className="relative z-10 w-11 h-11 rounded-full bg-white/20 backdrop-blur-sm text-white flex items-center justify-center hover:bg-white/35 hover:scale-110 transition-all mr-3 md:mr-6 flex-shrink-0">
            <ChevronLeft size={22} />
          </button>

          <video
            ref={popupVideoRef}
            key={popup}
            controls
            muted={muted}
            className="relative z-10 rounded-[22px] shadow-2xl"
            style={{ width: 'min(400px, 80vw)', maxHeight: '82vh', objectFit: 'contain' }}
            onClick={e => e.stopPropagation()}
          >
            <source src={REELS[popup].video} />
          </video>

          <button onClick={nextPopup}
            className="relative z-10 w-11 h-11 rounded-full bg-white/20 backdrop-blur-sm text-white flex items-center justify-center hover:bg-white/35 hover:scale-110 transition-all ml-3 md:ml-6 flex-shrink-0">
            <ChevronRight size={22} />
          </button>

          <div className="absolute top-4 right-4 z-10 flex gap-3">
            <button
              onClick={e => { e.stopPropagation(); setMuted(m => !m) }}
              className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-forest-800 hover:scale-110 transition-transform shadow">
              {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
            </button>
            <button
              onClick={e => { e.stopPropagation(); closePopup() }}
              className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-forest-800 hover:scale-110 transition-transform shadow">
              <X size={17} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
