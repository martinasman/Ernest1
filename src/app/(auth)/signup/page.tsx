'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { GoogleButton, GitHubButton, OAuthDivider } from '@/components/auth/oauth-buttons'
import { Loader2, Eye, EyeOff, ArrowRight } from 'lucide-react'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!termsAccepted) {
      setError('Please accept the Terms of Use to continue')
      return
    }

    setIsLoading(true)

    const supabase = createClient()

    // Sign up the user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError) {
      setError(authError.message)
      setIsLoading(false)
      return
    }

    if (!authData.user) {
      setError('Failed to create account')
      setIsLoading(false)
      return
    }

    // Setup workspace via server-side API (bypasses RLS)
    const setupResponse = await fetch('/api/auth/setup-workspace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: authData.user.id,
        email: email,
      }),
    })

    if (!setupResponse.ok) {
      const data = await setupResponse.json()
      setError(data.error || 'Failed to setup workspace')
      setIsLoading(false)
      return
    }

    const { slug } = await setupResponse.json()
    router.push(`/${slug}/overview`)
  }

  return (
    <div className="py-8">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-10">
        <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
          <span className="text-lg font-bold text-white">E</span>
        </div>
        <span className="text-xl font-semibold">ernest</span>
      </div>

      {/* Header */}
      <h1 className="text-2xl font-semibold mb-8">Create a new account</h1>

      {/* OAuth Buttons */}
      <div className="space-y-3">
        <GoogleButton mode="signup" />
        <GitHubButton mode="signup" />
      </div>

      <OAuthDivider />

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
              minLength={6}
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

        {/* Terms Checkbox */}
        <div className="flex items-start gap-3 pt-2">
          <input
            id="terms"
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
          />
          <label htmlFor="terms" className="text-sm text-gray-600">
            I have read and accepted the{' '}
            <Link href="/terms" className="text-gray-900 underline underline-offset-2">
              Terms of Use
            </Link>
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gray-900 text-white py-3 rounded-lg font-medium tracking-wide uppercase text-sm hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
        >
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          Create Account
        </button>
      </form>

      {/* Login Link Card */}
      <Link
        href="/login"
        className="mt-8 flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group"
      >
        <div>
          <p className="font-medium text-gray-900">Already have an account?</p>
          <p className="text-sm text-gray-500">Log in instead</p>
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
