import { Link } from 'react-router-dom'
import { Clock, ArrowRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import api from '../api'

const CATEGORIES = ['All', 'Shilajit', 'Health', 'Wellness', 'Science']

export default function BlogPage() {
  const [posts, setPosts] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    api.get('/blogs?limit=12')
      .then(res => { if (!mounted) return; setPosts(res.data.blogs || []); setError(null) })
      .catch(err => { if (!mounted) return; setError(err?.response?.data?.message || err.message || 'Failed to load'); setPosts([]) })
      .finally(() => { if (!mounted) return; setLoading(false) })
    return () => { mounted = false }
  }, [])

  if (loading) return <div className="min-h-screen p-8">Loading blogs…</div>
  if (error) return (
    <div className="min-h-screen p-8">
      <h2 className="text-xl font-semibold">Unable to load blogs</h2>
      <p className="text-sm text-forest-500">{error}</p>
      <button onClick={() => window.location.reload()} className="btn-gold mt-4">Retry</button>
    </div>
  )

  if (!posts || posts.length === 0) return (
    <div className="min-h-screen p-8 text-center">
      <h1 className="text-3xl font-serif font-bold mb-3">Our Blog</h1>
      <p className="text-forest-500 mb-6">No blog posts available yet.</p>
      <Link to="/" className="btn-gold">Back to Home</Link>
    </div>
  )

  return (
    <div className="min-h-screen">
      <div className="bg-forest-900 py-14 px-4 text-center">
        <span className="badge-gold mb-3 inline-block">Ayurvedic Wisdom</span>
        <h1 className="text-4xl font-bold text-white mb-2" style={{ fontFamily: "'Playfair Display',serif" }}>Our Blog</h1>
        <p className="text-forest-300 text-sm">Ancient wisdom. Modern insights. Real results.</p>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-14">
        {/* Featured post */}
        <div className="card overflow-hidden mb-12 grid md:grid-cols-2">
          <img src={posts[0].featuredImage || posts[0].img || ''} alt={posts[0].title} className="w-full h-64 md:h-auto object-cover" />
          <div className="p-8 flex flex-col justify-center">
            <span className="badge-gold mb-3 inline-block">{posts[0].category?.name || ''}</span>
            <h2 className="text-2xl font-bold text-forest-900 mb-3 leading-snug" style={{ fontFamily: "'Playfair Display',serif" }}>
              {posts[0].title}
            </h2>
            <p className="text-forest-500 text-sm leading-relaxed mb-5">{posts[0].excerpt}</p>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-xs text-forest-400"><Clock size={12} /> {posts[0].readTime} · {new Date(posts[0].publishDate || posts[0].createdAt).toLocaleDateString()}</span>
              <Link to={`/blog/${posts[0].slug}`} className="flex items-center gap-1 text-forest-800 font-semibold text-sm hover:text-forest-900">
                Read More <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.slice(1).map(post => (
            <Link key={post.slug || post._id} to={`/blog/${post.slug || post._id}`} className="card group overflow-hidden block">
              <div className="overflow-hidden aspect-video">
                <img src={post.featuredImage || post.img || ''} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="p-5">
                <span className="badge-green text-xs mb-3 inline-block">{post.category?.name || ''}</span>
                <h3 className="font-serif font-bold text-forest-900 text-base leading-snug mb-2 group-hover:text-forest-800 transition-colors">
                  {post.title}
                </h3>
                <p className="text-forest-500 text-xs leading-relaxed line-clamp-2 mb-4">{post.excerpt}</p>
                <div className="flex items-center gap-2 text-xs text-forest-400">
                  <Clock size={12} /> {post.readTime} · {new Date(post.publishDate || post.createdAt).toLocaleDateString()}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
