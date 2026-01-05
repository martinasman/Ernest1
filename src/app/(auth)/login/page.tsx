'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { GoogleButton, GitHubButton, OAuthDividerSignIn } from '@/components/auth/oauth-buttons'
import { Loader2, Eye, EyeOff, ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    const supabase = createClient()

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setIsLoading(false)
      return
    }

    // Redirect to main page after login - user can prompt from there
    router.push('/')
  }

  return (
    <div className="py-8">
      {/* Logo */}
      <div className="mb-10">
        <span className="text-2xl font-serif text-gray-900">ernest</span>
      </div>

      {/* Header */}
      <h1 className="text-2xl font-semibold mb-8">Welcome back</h1>

      {/* OAuth Buttons */}
      <div className="space-y-3">
        <GoogleButton mode="signin" />
        <GitHubButton mode="signin" />
      </div>

      <OAuthDividerSignIn />

      {/* Email Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gray-900 text-white py-3 rounded-lg font-medium tracking-wide uppercase text-sm hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
        >
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          Sign In
        </button>
      </form>

      {/* Signup Link Card */}
      <Link
        href="/signup"
        className="mt-8 flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group"
      >
        <div>
          <p className="font-medium text-gray-900">Don&apos;t have an account?</p>
          <p className="text-sm text-gray-500">Sign up instead</p>
        </div>
        <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" />
      </Link>

      {/* Footer */}
      <div className="mt-8 text-center">
        <Link href="/terms" className="text-sm text-gray-500 underline underline-offset-2">
          Terms of Use
        </Link>
      </div>
    </div>
  )
}
