import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Loader2, FileQuestion } from 'lucide-react'
import api from '../api'

export default function PolicyPage() {
  const { slug } = useParams()
  const [policy, setPolicy] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    setLoading(true)
    setNotFound(false)
    api.get(`/policies/${slug}`)
      .then(({ data }) => setPolicy(data.policy))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-forest-800" size={32} />
      </div>
    )
  }

  if (notFound || !policy) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <FileQuestion size={40} className="text-forest-300 mb-3" />
        <h1 className="text-2xl font-bold text-forest-900 font-serif mb-2">Page not found</h1>
        <p className="text-forest-500 mb-5">The policy you're looking for doesn't exist or is no longer available.</p>
        <Link to="/" className="btn-gold text-sm">Back to Home</Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
      <h1 className="section-title mb-6">{policy.title}</h1>
      <div className="policy-content" dangerouslySetInnerHTML={{ __html: policy.content }} />
    </div>
  )
}
