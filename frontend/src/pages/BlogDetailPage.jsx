import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Clock } from 'lucide-react'
import api from '../api'

export default function BlogDetailPage() {
  const { slug } = useParams()
  const [searchParams] = useSearchParams()
  const [post, setPost] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const preview = searchParams.get('preview') === 'true'
    api.get(`/blogs/${slug}${preview ? '?preview=true' : ''}`)
      .then(r => setPost(r.data.blog))
      .catch(err => {
        setError(err?.response?.data?.message || 'Unable to load blog')
      })
  }, [slug, searchParams])

  if (error) return <div className="min-h-screen p-8 text-center text-red-600">{error}</div>
  if (!post) return <div className="min-h-screen p-8">Loading…</div>

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      {post.featuredImage && <img src={post.featuredImage} alt={post.title} className="w-full h-72 object-cover rounded mb-6" />}
      <h1 className="text-3xl font-serif font-bold mb-2">{post.title}</h1>
      <div className="flex flex-wrap items-center gap-3 text-sm text-forest-500 mb-6"><Clock size={14} /> {post.readTime} · {new Date(post.publishDate || post.createdAt).toLocaleDateString()}</div>
      <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: post.content }} />
    </div>
  )
}
