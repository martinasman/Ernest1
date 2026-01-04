'use client'

import { Star, Check, ChevronDown, ChevronUp, Quote, Users, Zap, Shield, Heart, Clock, Mail, Phone, MapPin, Calendar, ArrowRight, Sparkles, TrendingUp, Award, Target, Rocket, Globe, Coffee, Briefcase, Building, Gift, Lightbulb, Play, Send, MessageCircle } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

// Theme interface - 4 simple colors
export interface WebsiteTheme {
  primary: string      // Brand accent color
  background: string   // Page background
  foreground: string   // Text color
  muted: string        // Cards/sections background
}

// Default light theme
export const DEFAULT_THEME: WebsiteTheme = {
  primary: '#3B82F6',
  background: '#FFFFFF',
  foreground: '#111827',
  muted: '#F3F4F6',
}

// Map icon names to Lucide components - expanded for more variety
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  star: Star,
  check: Check,
  users: Users,
  zap: Zap,
  shield: Shield,
  heart: Heart,
  clock: Clock,
  mail: Mail,
  phone: Phone,
  'map-pin': MapPin,
  calendar: Calendar,
  'arrow-right': ArrowRight,
  sparkles: Sparkles,
  trending: TrendingUp,
  award: Award,
  target: Target,
  rocket: Rocket,
  globe: Globe,
  coffee: Coffee,
  briefcase: Briefcase,
  building: Building,
  gift: Gift,
  lightbulb: Lightbulb,
  play: Play,
  send: Send,
  message: MessageCircle,
}

function getIcon(iconName?: string) {
  if (!iconName) return Zap
  const normalized = iconName.toLowerCase().replace(/\s+/g, '-')
  return ICON_MAP[normalized] || Zap
}

// Helper to get contrasting text color
export function getContrastColor(bgColor: string): string {
  const hex = bgColor.replace('#', '')
  const r = parseInt(hex.substr(0, 2), 16)
  const g = parseInt(hex.substr(2, 2), 16)
  const b = parseInt(hex.substr(4, 2), 16)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000
  return brightness > 128 ? '#111827' : '#FFFFFF'
}

// Helper to create a lighter/darker shade
function adjustColor(color: string, amount: number): string {
  const hex = color.replace('#', '')
  const r = Math.min(255, Math.max(0, parseInt(hex.substr(0, 2), 16) + amount))
  const g = Math.min(255, Math.max(0, parseInt(hex.substr(2, 2), 16) + amount))
  const b = Math.min(255, Math.max(0, parseInt(hex.substr(4, 2), 16) + amount))
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

// Helper to add alpha to a hex color
function withAlpha(color: string, alpha: number): string {
  const hex = color.replace('#', '')
  const r = parseInt(hex.substr(0, 2), 16)
  const g = parseInt(hex.substr(2, 2), 16)
  const b = parseInt(hex.substr(4, 2), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// Helper to create gradient background
function createGradient(color1: string, color2: string, direction = '135deg'): string {
  return `linear-gradient(${direction}, ${color1}, ${color2})`
}

// Modern button styles
const buttonStyles = {
  primary: (theme: WebsiteTheme) => ({
    background: createGradient(theme.primary, adjustColor(theme.primary, -30)),
    color: getContrastColor(theme.primary),
    boxShadow: `0 4px 14px 0 ${withAlpha(theme.primary, 0.4)}`,
  }),
  secondary: (theme: WebsiteTheme) => ({
    background: 'transparent',
    color: theme.foreground,
    border: `2px solid ${withAlpha(theme.foreground, 0.15)}`,
  }),
  ghost: (theme: WebsiteTheme) => ({
    background: withAlpha(theme.primary, 0.1),
    color: theme.primary,
  }),
}

// Card shadow styles
const cardShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
const cardShadowHover = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
const cardShadowLg = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'

interface SectionItem {
  title: string
  description: string
  icon?: string
  price?: string
  features?: string[]
  question?: string
  answer?: string
}

interface Testimonial {
  quote: string
  author: string
  role?: string
  company?: string
}

interface Stat {
  value: string
  label: string
}

type Layout = 'centered' | 'split' | 'split-reverse' | 'grid' | 'stacked' | 'alternating' | 'minimal' | 'bold' | 'cards' | 'bento'

export interface WebsiteSection {
  type: 'hero' | 'features' | 'benefits' | 'testimonials' | 'pricing' | 'faq' | 'team' | 'about' | 'cta' | 'gallery' | 'contact' | 'booking' | 'products' | 'stats' | 'process' | 'trust'
  layout?: Layout
  darkSection?: boolean
  headline: string
  subheadline?: string
  content?: string
  items?: SectionItem[]
  ctaText?: string
  ctaHref?: string
  image?: { alt: string; description: string }
  stats?: Stat[]
  testimonials?: Testimonial[]
}

interface SectionRendererProps {
  section: WebsiteSection
  theme?: WebsiteTheme
  sectionIndex?: number
  isSelected?: boolean
  onSelect?: (sectionIndex: number, sectionType: string) => void
}

export function SectionRenderer({
  section,
  theme = DEFAULT_THEME,
  sectionIndex,
  isSelected = false,
  onSelect,
}: SectionRendererProps) {
  // If darkSection, invert background/foreground
  const effectiveTheme = section.darkSection ? {
    ...theme,
    background: '#111827',
    foreground: '#FFFFFF',
    muted: '#1F2937',
  } : theme

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onSelect && sectionIndex !== undefined) {
      onSelect(sectionIndex, section.type)
    }
  }

  const renderSection = () => {
    switch (section.type) {
      case 'hero':
        return <HeroSection section={section} theme={effectiveTheme} />
      case 'features':
      case 'benefits':
        return <FeaturesSection section={section} theme={effectiveTheme} />
      case 'testimonials':
        return <TestimonialsSection section={section} theme={effectiveTheme} />
      case 'pricing':
        return <PricingSection section={section} theme={effectiveTheme} />
      case 'faq':
        return <FAQSection section={section} theme={effectiveTheme} />
      case 'stats':
        return <StatsSection section={section} theme={effectiveTheme} />
      case 'cta':
        return <CTASection section={section} theme={effectiveTheme} />
      case 'about':
        return <AboutSection section={section} theme={effectiveTheme} />
      case 'contact':
        return <ContactSection section={section} theme={effectiveTheme} />
      case 'process':
        return <ProcessSection section={section} theme={effectiveTheme} />
      case 'trust':
        return <TrustSection section={section} theme={effectiveTheme} />
      case 'team':
        return <TeamSection section={section} theme={effectiveTheme} />
      case 'booking':
        return <BookingSection section={section} theme={effectiveTheme} />
      case 'products':
      case 'gallery':
        return <ProductsSection section={section} theme={effectiveTheme} />
      default:
        return <GenericSection section={section} theme={effectiveTheme} />
    }
  }

  // Wrap in selectable container if onSelect is provided
  if (onSelect) {
    return (
      <div
        onClick={handleClick}
        className={cn(
          'relative cursor-pointer transition-all duration-200',
          isSelected && 'selection-glow'
        )}
      >
        {renderSection()}
      </div>
    )
  }

  return renderSection()
}

// ============ HERO SECTION ============
function HeroSection({ section, theme }: { section: WebsiteSection; theme: WebsiteTheme }) {
  const layout = section.layout || 'centered'

  if (layout === 'split' || layout === 'split-reverse') {
    return (
      <div
        className="py-24 px-8 relative overflow-hidden"
        style={{ backgroundColor: theme.background }}
      >
        {/* Subtle gradient background accent */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{ background: `radial-gradient(ellipse at ${layout === 'split-reverse' ? '20%' : '80%'} 50%, ${theme.primary}, transparent 70%)` }}
        />
        <div className={cn(
          "max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center relative z-10",
          layout === 'split-reverse' && "direction-rtl"
        )}>
          <div className={layout === 'split-reverse' ? 'md:order-2' : ''}>
            {/* Subtle badge */}
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6"
              style={{ backgroundColor: withAlpha(theme.primary, 0.1), color: theme.primary }}
            >
              <Sparkles className="w-4 h-4" />
              <span>Welcome</span>
            </div>
            <h1
              className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-[1.1] tracking-tight"
              style={{ color: theme.foreground }}
            >
              {section.headline}
            </h1>
            {section.subheadline && (
              <p
                className="text-lg md:text-xl mb-8 leading-relaxed"
                style={{ color: withAlpha(theme.foreground, 0.7) }}
              >
                {section.subheadline}
              </p>
            )}
            {section.ctaText && (
              <div className="flex flex-wrap gap-4">
                <button
                  className="px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5"
                  style={buttonStyles.primary(theme)}
                >
                  {section.ctaText}
                  <ArrowRight className="w-5 h-5 inline ml-2" />
                </button>
                <button
                  className="px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 hover:scale-[1.02]"
                  style={buttonStyles.secondary(theme)}
                >
                  Learn More
                </button>
              </div>
            )}
          </div>
          <div className={layout === 'split-reverse' ? 'md:order-1' : ''}>
            {section.image ? (
              <div
                className="rounded-3xl h-96 flex items-center justify-center relative overflow-hidden"
                style={{
                  backgroundColor: theme.muted,
                  boxShadow: cardShadowLg,
                  border: `1px solid ${withAlpha(theme.foreground, 0.05)}`,
                }}
              >
                {/* Decorative gradient overlay */}
                <div
                  className="absolute inset-0 opacity-20"
                  style={{ background: createGradient(theme.primary, adjustColor(theme.primary, 40), '45deg') }}
                />
                <p className="text-sm px-4 opacity-60 relative z-10" style={{ color: theme.foreground }}>
                  {section.image.description}
                </p>
              </div>
            ) : (
              <div
                className="rounded-3xl h-96 relative overflow-hidden"
                style={{
                  backgroundColor: theme.muted,
                  boxShadow: cardShadowLg,
                  border: `1px solid ${withAlpha(theme.foreground, 0.05)}`,
                }}
              >
                <div
                  className="absolute inset-0 opacity-10"
                  style={{ background: createGradient(theme.primary, adjustColor(theme.primary, 40), '45deg') }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (layout === 'bold') {
    return (
      <div
        className="py-28 px-8 relative overflow-hidden"
        style={{ background: createGradient(theme.primary, adjustColor(theme.primary, -40), '135deg') }}
      >
        {/* Abstract decorative shapes */}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10 -translate-y-1/2 translate-x-1/2" style={{ backgroundColor: '#fff' }} />
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full opacity-10 translate-y-1/2 -translate-x-1/2" style={{ backgroundColor: '#fff' }} />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h1
            className="text-5xl md:text-7xl font-bold mb-8 leading-[1.05] tracking-tight"
            style={{ color: getContrastColor(theme.primary) }}
          >
            {section.headline}
          </h1>
          {section.subheadline && (
            <p
              className="text-xl md:text-2xl mb-12 opacity-90 max-w-2xl mx-auto leading-relaxed"
              style={{ color: getContrastColor(theme.primary) }}
            >
              {section.subheadline}
            </p>
          )}
          {section.ctaText && (
            <button
              className="px-10 py-5 rounded-xl font-semibold text-lg transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1"
              style={{
                backgroundColor: theme.background,
                color: theme.foreground,
                boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
              }}
            >
              {section.ctaText}
              <ArrowRight className="w-5 h-5 inline ml-2" />
            </button>
          )}
        </div>
      </div>
    )
  }

  if (layout === 'minimal') {
    return (
      <div
        className="py-36 px-8"
        style={{ backgroundColor: theme.background }}
      >
        <div className="max-w-3xl mx-auto text-center">
          <h1
            className="text-5xl md:text-7xl font-light mb-8 leading-[1.1] tracking-tight"
            style={{ color: theme.foreground }}
          >
            {section.headline}
          </h1>
          {section.subheadline && (
            <p
              className="text-xl mb-14 leading-relaxed"
              style={{ color: withAlpha(theme.foreground, 0.6) }}
            >
              {section.subheadline}
            </p>
          )}
          {section.ctaText && (
            <button
              className="px-10 py-4 rounded-full font-medium text-lg transition-all duration-300 hover:scale-[1.02] border-2"
              style={{
                borderColor: theme.primary,
                color: theme.primary,
                backgroundColor: 'transparent',
              }}
            >
              {section.ctaText}
            </button>
          )}
        </div>
      </div>
    )
  }

  // Default: centered - enhanced with polish
  return (
    <div
      className="py-24 md:py-32 px-8 relative overflow-hidden"
      style={{ backgroundColor: theme.background }}
    >
      {/* Subtle radial gradient accent */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{ background: `radial-gradient(ellipse at 50% 0%, ${theme.primary}, transparent 60%)` }}
      />
      <div className="max-w-4xl mx-auto text-center relative z-10">
        {/* Small decorative badge */}
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-8"
          style={{ backgroundColor: withAlpha(theme.primary, 0.1), color: theme.primary }}
        >
          <Sparkles className="w-4 h-4" />
          <span>Welcome</span>
        </div>
        <h1
          className="text-4xl md:text-6xl lg:text-7xl font-bold mb-8 leading-[1.05] tracking-tight"
          style={{ color: theme.foreground }}
        >
          {section.headline}
        </h1>
        {section.subheadline && (
          <p
            className="text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed"
            style={{ color: withAlpha(theme.foreground, 0.7) }}
          >
            {section.subheadline}
          </p>
        )}
        {section.ctaText && (
          <div className="flex flex-wrap justify-center gap-4">
            <button
              className="px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5"
              style={buttonStyles.primary(theme)}
            >
              {section.ctaText}
              <ArrowRight className="w-5 h-5 inline ml-2" />
            </button>
          </div>
        )}
        {section.image && (
          <div
            className="mt-20 rounded-3xl h-96 flex items-center justify-center relative overflow-hidden"
            style={{
              backgroundColor: theme.muted,
              boxShadow: cardShadowLg,
              border: `1px solid ${withAlpha(theme.foreground, 0.05)}`,
            }}
          >
            <div
              className="absolute inset-0 opacity-10"
              style={{ background: createGradient(theme.primary, adjustColor(theme.primary, 40), '45deg') }}
            />
            <p className="text-sm px-4 opacity-60 relative z-10" style={{ color: theme.foreground }}>
              {section.image.description}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ============ FEATURES SECTION ============
function FeaturesSection({ section, theme }: { section: WebsiteSection; theme: WebsiteTheme }) {
  const layout = section.layout || 'grid'

  if (layout === 'alternating' && section.items) {
    return (
      <div className="py-24 px-8" style={{ backgroundColor: theme.background }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-4"
              style={{ backgroundColor: withAlpha(theme.primary, 0.1), color: theme.primary }}
            >
              <Target className="w-4 h-4" />
              <span>Features</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight" style={{ color: theme.foreground }}>
              {section.headline}
            </h2>
            {section.subheadline && (
              <p className="text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: withAlpha(theme.foreground, 0.7) }}>
                {section.subheadline}
              </p>
            )}
          </div>
          <div className="space-y-28">
            {section.items.map((item, i) => {
              const Icon = getIcon(item.icon)
              return (
                <div
                  key={i}
                  className={cn(
                    "grid md:grid-cols-2 gap-16 items-center",
                    i % 2 === 1 && "md:flex-row-reverse"
                  )}
                >
                  <div className={i % 2 === 1 ? 'md:order-2' : ''}>
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
                      style={{ background: createGradient(withAlpha(theme.primary, 0.15), withAlpha(theme.primary, 0.05)) }}
                    >
                      <span style={{ color: theme.primary }}>
                        <Icon className="w-7 h-7" />
                      </span>
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold mb-4 tracking-tight" style={{ color: theme.foreground }}>
                      {item.title}
                    </h3>
                    <p className="text-lg leading-relaxed" style={{ color: withAlpha(theme.foreground, 0.7) }}>
                      {item.description}
                    </p>
                  </div>
                  <div
                    className={cn("rounded-3xl h-72 relative overflow-hidden", i % 2 === 1 ? 'md:order-1' : '')}
                    style={{
                      backgroundColor: theme.muted,
                      boxShadow: cardShadowLg,
                      border: `1px solid ${withAlpha(theme.foreground, 0.05)}`,
                    }}
                  >
                    <div
                      className="absolute inset-0 opacity-10"
                      style={{ background: createGradient(theme.primary, adjustColor(theme.primary, 40), i % 2 === 0 ? '45deg' : '135deg') }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  if (layout === 'bento' && section.items) {
    return (
      <div className="py-24 px-8" style={{ backgroundColor: theme.background }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-4"
              style={{ backgroundColor: withAlpha(theme.primary, 0.1), color: theme.primary }}
            >
              <Zap className="w-4 h-4" />
              <span>Features</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight" style={{ color: theme.foreground }}>
              {section.headline}
            </h2>
            {section.subheadline && (
              <p className="text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: withAlpha(theme.foreground, 0.7) }}>
                {section.subheadline}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {section.items.slice(0, 6).map((item, i) => {
              const Icon = getIcon(item.icon)
              const isLarge = i === 0 || i === 3
              return (
                <div
                  key={i}
                  className={cn(
                    "rounded-3xl p-6 md:p-8 transition-all duration-300 hover:-translate-y-1 group relative overflow-hidden",
                    isLarge && "col-span-2 row-span-2"
                  )}
                  style={{
                    backgroundColor: theme.muted,
                    boxShadow: cardShadow,
                    border: `1px solid ${withAlpha(theme.foreground, 0.05)}`,
                  }}
                >
                  {/* Subtle gradient on hover */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-300"
                    style={{ background: createGradient(theme.primary, adjustColor(theme.primary, 40)) }}
                  />
                  <div
                    className={cn("rounded-2xl flex items-center justify-center mb-4 md:mb-6 relative", isLarge ? "w-16 h-16" : "w-12 h-12")}
                    style={{ background: createGradient(withAlpha(theme.primary, 0.15), withAlpha(theme.primary, 0.05)) }}
                  >
                    <span style={{ color: theme.primary }}>
                      <Icon className={cn(isLarge ? "w-8 h-8" : "w-5 h-5")} />
                    </span>
                  </div>
                  <h3
                    className={cn("font-bold mb-2 tracking-tight relative", isLarge ? "text-xl md:text-2xl" : "text-base md:text-lg")}
                    style={{ color: theme.foreground }}
                  >
                    {item.title}
                  </h3>
                  <p className={cn("leading-relaxed relative", isLarge ? "text-base" : "text-sm")} style={{ color: withAlpha(theme.foreground, 0.7) }}>
                    {item.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // Default: grid/cards - enhanced
  return (
    <div className="py-24 px-8" style={{ backgroundColor: theme.background }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-4"
            style={{ backgroundColor: withAlpha(theme.primary, 0.1), color: theme.primary }}
          >
            <Zap className="w-4 h-4" />
            <span>Features</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight" style={{ color: theme.foreground }}>
            {section.headline}
          </h2>
          {section.subheadline && (
            <p className="text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: withAlpha(theme.foreground, 0.7) }}>
              {section.subheadline}
            </p>
          )}
        </div>
        {section.items && (
          <div className={cn(
            'grid gap-6',
            section.items.length === 2 ? 'grid-cols-1 md:grid-cols-2' :
            section.items.length === 4 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' :
            'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
          )}>
            {section.items.map((item, i) => {
              const Icon = getIcon(item.icon)
              return (
                <div
                  key={i}
                  className="p-8 rounded-3xl transition-all duration-300 hover:-translate-y-1 group relative overflow-hidden"
                  style={{
                    backgroundColor: theme.muted,
                    boxShadow: cardShadow,
                    border: `1px solid ${withAlpha(theme.foreground, 0.05)}`,
                  }}
                >
                  {/* Subtle gradient on hover */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-300"
                    style={{ background: createGradient(theme.primary, adjustColor(theme.primary, 40)) }}
                  />
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 relative"
                    style={{ background: createGradient(withAlpha(theme.primary, 0.15), withAlpha(theme.primary, 0.05)) }}
                  >
                    <span style={{ color: theme.primary }}>
                      <Icon className="w-7 h-7" />
                    </span>
                  </div>
                  <h3 className="text-xl font-bold mb-3 tracking-tight relative" style={{ color: theme.foreground }}>
                    {item.title}
                  </h3>
                  <p className="leading-relaxed relative" style={{ color: withAlpha(theme.foreground, 0.7) }}>
                    {item.description}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ============ TESTIMONIALS SECTION ============
function TestimonialsSection({ section, theme }: { section: WebsiteSection; theme: WebsiteTheme }) {
  const testimonials: Testimonial[] = section.testimonials || section.items?.map(item => ({
    quote: item.description,
    author: item.title,
    role: item.icon,
    company: undefined,
  })) || []

  const layout = section.layout || 'cards'

  if (layout === 'minimal' && testimonials.length > 0) {
    const featured = testimonials[0]
    return (
      <div className="py-28 px-8 relative overflow-hidden" style={{ backgroundColor: theme.background }}>
        {/* Decorative quote marks */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[300px] font-serif opacity-[0.03] select-none"
          style={{ color: theme.primary }}
        >
          "
        </div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-10"
            style={{ background: createGradient(withAlpha(theme.primary, 0.15), withAlpha(theme.primary, 0.05)) }}
          >
            <Quote className="w-8 h-8" style={{ color: theme.primary }} />
          </div>
          <p
            className="text-2xl md:text-4xl font-medium mb-10 leading-relaxed"
            style={{ color: theme.foreground }}
          >
            &ldquo;{featured.quote}&rdquo;
          </p>
          <div className="flex items-center justify-center gap-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center font-semibold text-lg"
              style={{ background: createGradient(theme.primary, adjustColor(theme.primary, -30)), color: getContrastColor(theme.primary) }}
            >
              {featured.author.charAt(0)}
            </div>
            <div className="text-left">
              <p className="font-semibold text-lg" style={{ color: theme.foreground }}>{featured.author}</p>
              {(featured.role || featured.company) && (
                <p style={{ color: withAlpha(theme.foreground, 0.6) }}>
                  {featured.role}{featured.role && featured.company ? ', ' : ''}{featured.company}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Default: cards - enhanced
  return (
    <div className="py-24 px-8" style={{ backgroundColor: theme.muted }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-4"
            style={{ backgroundColor: withAlpha(theme.primary, 0.1), color: theme.primary }}
          >
            <Star className="w-4 h-4" />
            <span>Testimonials</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight" style={{ color: theme.foreground }}>
            {section.headline}
          </h2>
          {section.subheadline && (
            <p className="text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: withAlpha(theme.foreground, 0.7) }}>
              {section.subheadline}
            </p>
          )}
        </div>
        <div className={cn(
          'grid gap-6',
          testimonials.length === 1 ? 'grid-cols-1 max-w-2xl mx-auto' :
          testimonials.length === 2 ? 'grid-cols-1 md:grid-cols-2' :
          'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
        )}>
          {testimonials.map((testimonial, i) => (
            <div
              key={i}
              className="p-8 rounded-3xl relative overflow-hidden group transition-all duration-300 hover:-translate-y-1"
              style={{
                backgroundColor: theme.background,
                boxShadow: cardShadow,
                border: `1px solid ${withAlpha(theme.foreground, 0.05)}`,
              }}
            >
              {/* Decorative corner accent */}
              <div
                className="absolute -top-10 -right-10 w-24 h-24 rounded-full opacity-10"
                style={{ backgroundColor: theme.primary }}
              />
              {/* Star rating */}
              <div className="flex gap-1 mb-6">
                {[...Array(5)].map((_, idx) => (
                  <Star key={idx} className="w-5 h-5 fill-current" style={{ color: '#FBBF24' }} />
                ))}
              </div>
              <p className="mb-8 text-lg leading-relaxed relative z-10" style={{ color: withAlpha(theme.foreground, 0.8) }}>
                &ldquo;{testimonial.quote}&rdquo;
              </p>
              <div className="flex items-center gap-4 relative z-10">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center font-semibold"
                  style={{ background: createGradient(theme.primary, adjustColor(theme.primary, -30)), color: getContrastColor(theme.primary) }}
                >
                  {testimonial.author.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold" style={{ color: theme.foreground }}>{testimonial.author}</p>
                  {(testimonial.role || testimonial.company) && (
                    <p className="text-sm" style={{ color: withAlpha(theme.foreground, 0.6) }}>
                      {testimonial.role}{testimonial.role && testimonial.company ? ', ' : ''}{testimonial.company}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============ PRICING SECTION ============
function PricingSection({ section, theme }: { section: WebsiteSection; theme: WebsiteTheme }) {
  return (
    <div className="py-24 px-8" style={{ backgroundColor: theme.background }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-4"
            style={{ backgroundColor: withAlpha(theme.primary, 0.1), color: theme.primary }}
          >
            <Award className="w-4 h-4" />
            <span>Pricing</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight" style={{ color: theme.foreground }}>
            {section.headline}
          </h2>
          {section.subheadline && (
            <p className="text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: withAlpha(theme.foreground, 0.7) }}>
              {section.subheadline}
            </p>
          )}
        </div>
        {section.items && (
          <div className={cn(
            'grid gap-6',
            section.items.length === 2 ? 'grid-cols-1 md:grid-cols-2 max-w-3xl mx-auto' :
            section.items.length >= 3 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
            'grid-cols-1 max-w-md mx-auto'
          )}>
            {section.items.map((tier, i) => {
              const isPopular = i === Math.floor(section.items!.length / 2)
              return (
                <div
                  key={i}
                  className={cn(
                    'p-8 rounded-3xl relative transition-all duration-300 hover:-translate-y-1',
                    isPopular && 'lg:scale-105 z-10'
                  )}
                  style={{
                    backgroundColor: isPopular ? theme.foreground : theme.muted,
                    boxShadow: isPopular ? `0 25px 50px -12px ${withAlpha(theme.primary, 0.25)}` : cardShadow,
                    border: `1px solid ${withAlpha(theme.foreground, 0.05)}`,
                  }}
                >
                  {isPopular && (
                    <div
                      className="absolute -top-4 left-1/2 -translate-x-1/2 px-5 py-1.5 rounded-full text-sm font-semibold flex items-center gap-2"
                      style={{ background: createGradient(theme.primary, adjustColor(theme.primary, -30)), color: getContrastColor(theme.primary), boxShadow: `0 4px 14px ${withAlpha(theme.primary, 0.4)}` }}
                    >
                      <Sparkles className="w-4 h-4" />
                      Most Popular
                    </div>
                  )}
                  <h3 className="text-xl font-bold mb-2" style={{ color: isPopular ? theme.background : theme.foreground }}>
                    {tier.title}
                  </h3>
                  {tier.price && (
                    <div className="mb-4 flex items-baseline gap-1">
                      <span className="text-5xl font-bold tracking-tight" style={{ color: isPopular ? theme.background : theme.foreground }}>
                        {tier.price}
                      </span>
                      {!tier.price.includes('Custom') && (
                        <span className="text-lg" style={{ color: isPopular ? withAlpha(theme.background, 0.6) : withAlpha(theme.foreground, 0.6) }}>/month</span>
                      )}
                    </div>
                  )}
                  <p className="mb-8 leading-relaxed" style={{ color: isPopular ? withAlpha(theme.background, 0.7) : withAlpha(theme.foreground, 0.7) }}>
                    {tier.description}
                  </p>
                  {tier.features && (
                    <ul className="space-y-4 mb-8">
                      {tier.features.map((feature, fi) => (
                        <li key={fi} className="flex items-start gap-3">
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                            style={{ backgroundColor: isPopular ? withAlpha(theme.primary, 0.2) : withAlpha(theme.primary, 0.15) }}
                          >
                            <Check className="w-3 h-3" style={{ color: isPopular ? theme.primary : theme.primary }} />
                          </div>
                          <span style={{ color: isPopular ? withAlpha(theme.background, 0.9) : theme.foreground }}>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <button
                    className="w-full py-4 rounded-xl font-semibold transition-all duration-300 hover:scale-[1.02]"
                    style={isPopular ? {
                      backgroundColor: theme.primary,
                      color: getContrastColor(theme.primary),
                      boxShadow: `0 4px 14px ${withAlpha(theme.primary, 0.4)}`,
                    } : buttonStyles.secondary(theme)}
                  >
                    Get Started
                    <ArrowRight className="w-4 h-4 inline ml-2" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ============ FAQ SECTION ============
function FAQSection({ section, theme }: { section: WebsiteSection; theme: WebsiteTheme }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const faqs = section.items?.map(item => ({
    question: item.question || item.title,
    answer: item.answer || item.description,
  })) || []

  return (
    <div className="py-24 px-8" style={{ backgroundColor: theme.background }}>
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-16">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-4"
            style={{ backgroundColor: withAlpha(theme.primary, 0.1), color: theme.primary }}
          >
            <MessageCircle className="w-4 h-4" />
            <span>FAQ</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight" style={{ color: theme.foreground }}>
            {section.headline}
          </h2>
          {section.subheadline && (
            <p className="text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: withAlpha(theme.foreground, 0.7) }}>
              {section.subheadline}
            </p>
          )}
        </div>
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="rounded-2xl overflow-hidden transition-all duration-300"
              style={{
                backgroundColor: openIndex === i ? theme.muted : theme.background,
                boxShadow: openIndex === i ? cardShadow : 'none',
                border: `1px solid ${withAlpha(theme.foreground, 0.08)}`,
              }}
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full p-6 flex items-center justify-between text-left transition-colors"
                style={{ color: theme.foreground }}
              >
                <span className="font-semibold text-lg pr-4">{faq.question}</span>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300"
                  style={{
                    backgroundColor: openIndex === i ? theme.primary : withAlpha(theme.foreground, 0.1),
                    transform: openIndex === i ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                >
                  <ChevronDown
                    className="w-4 h-4"
                    style={{ color: openIndex === i ? getContrastColor(theme.primary) : theme.foreground }}
                  />
                </div>
              </button>
              {openIndex === i && (
                <div className="px-6 pb-6 leading-relaxed" style={{ color: withAlpha(theme.foreground, 0.7) }}>
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============ STATS SECTION ============
function StatsSection({ section, theme }: { section: WebsiteSection; theme: WebsiteTheme }) {
  const stats = section.stats || []

  return (
    <div
      className="py-20 px-8 relative overflow-hidden"
      style={{ background: createGradient(theme.primary, adjustColor(theme.primary, -40), '135deg') }}
    >
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-64 h-64 rounded-full opacity-10 -translate-x-1/2 -translate-y-1/2" style={{ backgroundColor: '#fff' }} />
      <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full opacity-10 translate-x-1/2 translate-y-1/2" style={{ backgroundColor: '#fff' }} />
      <div className="max-w-6xl mx-auto relative z-10">
        {section.headline && (
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight" style={{ color: getContrastColor(theme.primary) }}>
              {section.headline}
            </h2>
            {section.subheadline && (
              <p className="text-lg max-w-2xl mx-auto opacity-90 leading-relaxed" style={{ color: getContrastColor(theme.primary) }}>
                {section.subheadline}
              </p>
            )}
          </div>
        )}
        <div className={cn(
          'grid gap-8',
          stats.length === 2 ? 'grid-cols-2' :
          stats.length === 3 ? 'grid-cols-1 md:grid-cols-3' :
          'grid-cols-2 md:grid-cols-4'
        )}>
          {stats.map((stat, i) => (
            <div
              key={i}
              className="text-center p-8 rounded-3xl"
              style={{ backgroundColor: withAlpha('#fff', 0.1) }}
            >
              <div
                className="text-5xl md:text-6xl font-bold mb-3 tracking-tight"
                style={{ color: getContrastColor(theme.primary) }}
              >
                {stat.value}
              </div>
              <div className="text-lg opacity-80" style={{ color: getContrastColor(theme.primary) }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============ CTA SECTION ============
function CTASection({ section, theme }: { section: WebsiteSection; theme: WebsiteTheme }) {
  const layout = section.layout || 'centered'

  if (layout === 'bold') {
    return (
      <div
        className="py-24 px-8 relative overflow-hidden"
        style={{ background: createGradient(theme.primary, adjustColor(theme.primary, -40), '135deg') }}
      >
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10 translate-x-1/2 -translate-y-1/2" style={{ backgroundColor: '#fff' }} />
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full opacity-10 -translate-x-1/2 translate-y-1/2" style={{ backgroundColor: '#fff' }} />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2
            className="text-3xl md:text-5xl lg:text-6xl font-bold mb-8 tracking-tight leading-[1.1]"
            style={{ color: getContrastColor(theme.primary) }}
          >
            {section.headline}
          </h2>
          {section.subheadline && (
            <p
              className="text-lg md:text-xl mb-12 opacity-90 max-w-2xl mx-auto leading-relaxed"
              style={{ color: getContrastColor(theme.primary) }}
            >
              {section.subheadline}
            </p>
          )}
          {section.ctaText && (
            <button
              className="px-10 py-5 rounded-xl font-semibold text-lg transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1"
              style={{
                backgroundColor: theme.background,
                color: theme.foreground,
                boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
              }}
            >
              {section.ctaText}
              <ArrowRight className="w-5 h-5 inline ml-2" />
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="py-24 px-8" style={{ backgroundColor: theme.muted }}>
      <div
        className="max-w-4xl mx-auto text-center p-12 md:p-16 rounded-3xl relative overflow-hidden"
        style={{
          backgroundColor: theme.background,
          boxShadow: cardShadowLg,
          border: `1px solid ${withAlpha(theme.foreground, 0.05)}`,
        }}
      >
        {/* Decorative accent */}
        <div
          className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-10"
          style={{ backgroundColor: theme.primary }}
        />
        <div
          className="absolute -bottom-16 -left-16 w-32 h-32 rounded-full opacity-10"
          style={{ backgroundColor: theme.primary }}
        />
        <div className="relative z-10">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-8"
            style={{ background: createGradient(withAlpha(theme.primary, 0.15), withAlpha(theme.primary, 0.05)) }}
          >
            <Rocket className="w-8 h-8" style={{ color: theme.primary }} />
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight" style={{ color: theme.foreground }}>
            {section.headline}
          </h2>
          {section.subheadline && (
            <p className="text-lg mb-10 max-w-xl mx-auto leading-relaxed" style={{ color: withAlpha(theme.foreground, 0.7) }}>
              {section.subheadline}
            </p>
          )}
          {section.ctaText && (
            <button
              className="px-10 py-5 rounded-xl font-semibold text-lg transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5"
              style={buttonStyles.primary(theme)}
            >
              {section.ctaText}
              <ArrowRight className="w-5 h-5 inline ml-2" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ============ ABOUT SECTION ============
function AboutSection({ section, theme }: { section: WebsiteSection; theme: WebsiteTheme }) {
  const layout = section.layout || 'stacked'

  if (layout === 'split' || layout === 'split-reverse') {
    return (
      <div className="py-24 px-8" style={{ backgroundColor: theme.background }}>
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div className={layout === 'split-reverse' ? 'md:order-2' : ''}>
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6"
              style={{ backgroundColor: withAlpha(theme.primary, 0.1), color: theme.primary }}
            >
              <Heart className="w-4 h-4" />
              <span>About Us</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-8 tracking-tight leading-[1.1]" style={{ color: theme.foreground }}>
              {section.headline}
            </h2>
            {section.content && (
              <div className="space-y-6">
                {section.content.split('\n\n').map((paragraph, i) => (
                  <p key={i} className="text-lg leading-relaxed" style={{ color: withAlpha(theme.foreground, 0.7) }}>
                    {paragraph}
                  </p>
                ))}
              </div>
            )}
          </div>
          <div className={layout === 'split-reverse' ? 'md:order-1' : ''}>
            <div
              className="rounded-3xl h-96 relative overflow-hidden"
              style={{
                backgroundColor: theme.muted,
                boxShadow: cardShadowLg,
                border: `1px solid ${withAlpha(theme.foreground, 0.05)}`,
              }}
            >
              <div
                className="absolute inset-0 opacity-10"
                style={{ background: createGradient(theme.primary, adjustColor(theme.primary, 40), '45deg') }}
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="py-24 px-8" style={{ backgroundColor: theme.background }}>
      <div className="max-w-4xl mx-auto">
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6"
          style={{ backgroundColor: withAlpha(theme.primary, 0.1), color: theme.primary }}
        >
          <Heart className="w-4 h-4" />
          <span>About Us</span>
        </div>
        <h2 className="text-3xl md:text-5xl font-bold mb-10 tracking-tight" style={{ color: theme.foreground }}>
          {section.headline}
        </h2>
        {section.content && (
          <div className="space-y-6">
            {section.content.split('\n\n').map((paragraph, i) => (
              <p key={i} className="text-lg leading-relaxed" style={{ color: withAlpha(theme.foreground, 0.7) }}>
                {paragraph}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ============ CONTACT SECTION ============
function ContactSection({ section, theme }: { section: WebsiteSection; theme: WebsiteTheme }) {
  return (
    <div className="py-24 px-8" style={{ backgroundColor: theme.muted }}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-4"
            style={{ backgroundColor: withAlpha(theme.primary, 0.1), color: theme.primary }}
          >
            <Mail className="w-4 h-4" />
            <span>Contact</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight" style={{ color: theme.foreground }}>
            {section.headline}
          </h2>
          {section.subheadline && (
            <p className="text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: withAlpha(theme.foreground, 0.7) }}>
              {section.subheadline}
            </p>
          )}
        </div>
        <div className="grid md:grid-cols-5 gap-8">
          <div className="md:col-span-2 space-y-6">
            <div
              className="p-6 rounded-2xl flex items-start gap-4"
              style={{
                backgroundColor: theme.background,
                boxShadow: cardShadow,
                border: `1px solid ${withAlpha(theme.foreground, 0.05)}`,
              }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: createGradient(withAlpha(theme.primary, 0.15), withAlpha(theme.primary, 0.05)) }}
              >
                <Mail className="w-5 h-5" style={{ color: theme.primary }} />
              </div>
              <div>
                <h3 className="font-semibold mb-1" style={{ color: theme.foreground }}>Email</h3>
                <p className="text-sm" style={{ color: withAlpha(theme.foreground, 0.7) }}>contact@example.com</p>
              </div>
            </div>
            <div
              className="p-6 rounded-2xl flex items-start gap-4"
              style={{
                backgroundColor: theme.background,
                boxShadow: cardShadow,
                border: `1px solid ${withAlpha(theme.foreground, 0.05)}`,
              }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: createGradient(withAlpha(theme.primary, 0.15), withAlpha(theme.primary, 0.05)) }}
              >
                <Phone className="w-5 h-5" style={{ color: theme.primary }} />
              </div>
              <div>
                <h3 className="font-semibold mb-1" style={{ color: theme.foreground }}>Phone</h3>
                <p className="text-sm" style={{ color: withAlpha(theme.foreground, 0.7) }}>(555) 123-4567</p>
              </div>
            </div>
            <div
              className="p-6 rounded-2xl flex items-start gap-4"
              style={{
                backgroundColor: theme.background,
                boxShadow: cardShadow,
                border: `1px solid ${withAlpha(theme.foreground, 0.05)}`,
              }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: createGradient(withAlpha(theme.primary, 0.15), withAlpha(theme.primary, 0.05)) }}
              >
                <MapPin className="w-5 h-5" style={{ color: theme.primary }} />
              </div>
              <div>
                <h3 className="font-semibold mb-1" style={{ color: theme.foreground }}>Location</h3>
                <p className="text-sm" style={{ color: withAlpha(theme.foreground, 0.7) }}>123 Business St, City, ST 12345</p>
              </div>
            </div>
          </div>
          <div
            className="md:col-span-3 rounded-3xl p-8"
            style={{
              backgroundColor: theme.background,
              boxShadow: cardShadowLg,
              border: `1px solid ${withAlpha(theme.foreground, 0.05)}`,
            }}
          >
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: theme.foreground }}>Name</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-xl border transition-all focus:outline-none focus:ring-2"
                    style={{
                      backgroundColor: theme.muted,
                      color: theme.foreground,
                      borderColor: withAlpha(theme.foreground, 0.1),
                    }}
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: theme.foreground }}>Email</label>
                  <input
                    type="email"
                    className="w-full px-4 py-3 rounded-xl border transition-all focus:outline-none focus:ring-2"
                    style={{
                      backgroundColor: theme.muted,
                      color: theme.foreground,
                      borderColor: withAlpha(theme.foreground, 0.1),
                    }}
                    placeholder="your@email.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: theme.foreground }}>Subject</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 rounded-xl border transition-all focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: theme.muted,
                    color: theme.foreground,
                    borderColor: withAlpha(theme.foreground, 0.1),
                  }}
                  placeholder="How can we help?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: theme.foreground }}>Message</label>
                <textarea
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border resize-none transition-all focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: theme.muted,
                    color: theme.foreground,
                    borderColor: withAlpha(theme.foreground, 0.1),
                  }}
                  placeholder="Tell us more about your project..."
                />
              </div>
              <button
                className="w-full py-4 rounded-xl font-semibold transition-all duration-300 hover:scale-[1.02]"
                style={buttonStyles.primary(theme)}
              >
                Send Message
                <Send className="w-4 h-4 inline ml-2" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============ PROCESS SECTION ============
function ProcessSection({ section, theme }: { section: WebsiteSection; theme: WebsiteTheme }) {
  return (
    <div className="py-24 px-8" style={{ backgroundColor: theme.background }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-4"
            style={{ backgroundColor: withAlpha(theme.primary, 0.1), color: theme.primary }}
          >
            <Lightbulb className="w-4 h-4" />
            <span>How It Works</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight" style={{ color: theme.foreground }}>
            {section.headline}
          </h2>
          {section.subheadline && (
            <p className="text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: withAlpha(theme.foreground, 0.7) }}>
              {section.subheadline}
            </p>
          )}
        </div>
        {section.items && (
          <div className="grid gap-6 md:grid-cols-3 relative">
            {/* Connection line (desktop only) */}
            <div
              className="hidden md:block absolute top-12 left-[16.67%] right-[16.67%] h-0.5"
              style={{ backgroundColor: withAlpha(theme.primary, 0.2) }}
            />
            {section.items.map((step, i) => {
              const Icon = getIcon(step.icon)
              return (
                <div
                  key={i}
                  className="relative p-8 rounded-3xl text-center group transition-all duration-300 hover:-translate-y-1"
                  style={{
                    backgroundColor: theme.muted,
                    boxShadow: cardShadow,
                    border: `1px solid ${withAlpha(theme.foreground, 0.05)}`,
                  }}
                >
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold mx-auto mb-6 relative z-10"
                    style={{
                      background: createGradient(theme.primary, adjustColor(theme.primary, -30)),
                      color: getContrastColor(theme.primary),
                      boxShadow: `0 4px 14px ${withAlpha(theme.primary, 0.3)}`,
                    }}
                  >
                    {i + 1}
                  </div>
                  <h3 className="text-xl font-bold mb-3 tracking-tight" style={{ color: theme.foreground }}>
                    {step.title}
                  </h3>
                  <p className="leading-relaxed" style={{ color: withAlpha(theme.foreground, 0.7) }}>
                    {step.description}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ============ TRUST SECTION ============
function TrustSection({ section, theme }: { section: WebsiteSection; theme: WebsiteTheme }) {
  return (
    <div className="py-16 px-8" style={{ backgroundColor: theme.muted }}>
      <div className="max-w-6xl mx-auto">
        {section.headline && (
          <div className="text-center mb-10">
            <p className="text-sm uppercase tracking-wider font-medium" style={{ color: withAlpha(theme.foreground, 0.5) }}>
              {section.headline}
            </p>
          </div>
        )}
        {section.items && (
          <div className="flex flex-wrap justify-center items-center gap-10 md:gap-16">
            {section.items.map((item, i) => (
              <div
                key={i}
                className="px-6 py-3 rounded-xl text-lg font-semibold transition-all duration-300 hover:scale-105"
                style={{
                  color: withAlpha(theme.foreground, 0.4),
                  backgroundColor: withAlpha(theme.foreground, 0.03),
                }}
              >
                {item.title}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ============ TEAM SECTION ============
function TeamSection({ section, theme }: { section: WebsiteSection; theme: WebsiteTheme }) {
  return (
    <div className="py-24 px-8" style={{ backgroundColor: theme.background }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-4"
            style={{ backgroundColor: withAlpha(theme.primary, 0.1), color: theme.primary }}
          >
            <Users className="w-4 h-4" />
            <span>Our Team</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight" style={{ color: theme.foreground }}>
            {section.headline}
          </h2>
          {section.subheadline && (
            <p className="text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: withAlpha(theme.foreground, 0.7) }}>
              {section.subheadline}
            </p>
          )}
        </div>
        {section.items && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {section.items.map((member, i) => (
              <div
                key={i}
                className="text-center p-8 rounded-3xl group transition-all duration-300 hover:-translate-y-1"
                style={{
                  backgroundColor: theme.muted,
                  boxShadow: cardShadow,
                  border: `1px solid ${withAlpha(theme.foreground, 0.05)}`,
                }}
              >
                <div
                  className="w-24 h-24 rounded-2xl mx-auto mb-6 flex items-center justify-center text-2xl font-bold relative overflow-hidden"
                  style={{
                    background: createGradient(theme.primary, adjustColor(theme.primary, -30)),
                    color: getContrastColor(theme.primary),
                    boxShadow: `0 4px 14px ${withAlpha(theme.primary, 0.3)}`,
                  }}
                >
                  {member.title.split(' ').map(n => n[0]).join('')}
                </div>
                <h3 className="text-xl font-bold mb-1" style={{ color: theme.foreground }}>
                  {member.title}
                </h3>
                <p className="text-sm font-medium mb-4" style={{ color: theme.primary }}>
                  {member.icon || 'Team Member'}
                </p>
                <p className="text-sm leading-relaxed" style={{ color: withAlpha(theme.foreground, 0.7) }}>
                  {member.description}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ============ BOOKING SECTION ============
function BookingSection({ section, theme }: { section: WebsiteSection; theme: WebsiteTheme }) {
  return (
    <div className="py-24 px-8" style={{ backgroundColor: theme.muted }}>
      <div className="max-w-4xl mx-auto text-center">
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-4"
          style={{ backgroundColor: withAlpha(theme.primary, 0.1), color: theme.primary }}
        >
          <Calendar className="w-4 h-4" />
          <span>Book Now</span>
        </div>
        <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight" style={{ color: theme.foreground }}>
          {section.headline}
        </h2>
        {section.subheadline && (
          <p className="text-lg mb-12 max-w-xl mx-auto leading-relaxed" style={{ color: withAlpha(theme.foreground, 0.7) }}>
            {section.subheadline}
          </p>
        )}
        <div
          className="rounded-3xl p-10 max-w-md mx-auto relative overflow-hidden"
          style={{
            backgroundColor: theme.background,
            boxShadow: cardShadowLg,
            border: `1px solid ${withAlpha(theme.foreground, 0.05)}`,
          }}
        >
          {/* Decorative accent */}
          <div
            className="absolute -top-16 -right-16 w-32 h-32 rounded-full opacity-10"
            style={{ backgroundColor: theme.primary }}
          />
          <div className="relative z-10">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-8"
              style={{ background: createGradient(withAlpha(theme.primary, 0.15), withAlpha(theme.primary, 0.05)) }}
            >
              <Calendar className="w-10 h-10" style={{ color: theme.primary }} />
            </div>
            <p className="mb-8 leading-relaxed" style={{ color: withAlpha(theme.foreground, 0.7) }}>
              Select a date and time that works for you
            </p>
            <button
              className="w-full py-4 rounded-xl font-semibold transition-all duration-300 hover:scale-[1.02]"
              style={buttonStyles.primary(theme)}
            >
              {section.ctaText || 'Book Now'}
              <ArrowRight className="w-4 h-4 inline ml-2" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============ PRODUCTS SECTION ============
function ProductsSection({ section, theme }: { section: WebsiteSection; theme: WebsiteTheme }) {
  return (
    <div className="py-24 px-8" style={{ backgroundColor: theme.background }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-4"
            style={{ backgroundColor: withAlpha(theme.primary, 0.1), color: theme.primary }}
          >
            <Gift className="w-4 h-4" />
            <span>Products</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight" style={{ color: theme.foreground }}>
            {section.headline}
          </h2>
          {section.subheadline && (
            <p className="text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: withAlpha(theme.foreground, 0.7) }}>
              {section.subheadline}
            </p>
          )}
        </div>
        {section.items && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {section.items.map((product, i) => (
              <div
                key={i}
                className="rounded-3xl overflow-hidden transition-all duration-300 hover:-translate-y-1 group"
                style={{
                  backgroundColor: theme.muted,
                  boxShadow: cardShadow,
                  border: `1px solid ${withAlpha(theme.foreground, 0.05)}`,
                }}
              >
                <div
                  className="h-56 flex items-center justify-center relative overflow-hidden"
                  style={{ backgroundColor: adjustColor(theme.muted, -10) }}
                >
                  {/* Gradient overlay */}
                  <div
                    className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity"
                    style={{ background: createGradient(theme.primary, adjustColor(theme.primary, 40), '45deg') }}
                  />
                  <span style={{ color: withAlpha(theme.foreground, 0.3) }}>Product Image</span>
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-bold mb-2" style={{ color: theme.foreground }}>
                    {product.title}
                  </h3>
                  <p className="text-sm mb-4 leading-relaxed" style={{ color: withAlpha(theme.foreground, 0.7) }}>
                    {product.description}
                  </p>
                  <div className="flex items-center justify-between">
                    {product.price && (
                      <p className="text-2xl font-bold" style={{ color: theme.primary }}>
                        {product.price}
                      </p>
                    )}
                    <button
                      className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105"
                      style={buttonStyles.ghost(theme)}
                    >
                      View
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ============ GENERIC SECTION ============
function GenericSection({ section, theme }: { section: WebsiteSection; theme: WebsiteTheme }) {
  return (
    <div className="py-20 px-8" style={{ backgroundColor: theme.background }}>
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold mb-6 tracking-tight" style={{ color: theme.foreground }}>
          {section.headline}
        </h2>
        {section.subheadline && (
          <p className="text-lg mb-6 leading-relaxed" style={{ color: withAlpha(theme.foreground, 0.7) }}>
            {section.subheadline}
          </p>
        )}
        {section.content && (
          <div className="prose prose-lg" style={{ color: withAlpha(theme.foreground, 0.7) }}>
            {section.content.split('\n\n').map((paragraph, i) => (
              <p key={i} className="leading-relaxed mb-4">{paragraph}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
