/**
 * Website-to-Files Converter
 * Converts Ernest website JSON data to actual React/Vite code files
 */

interface WebsiteSection {
  type: string
  headline: string
  subheadline?: string
  content?: string
  layout?: string
  darkSection?: boolean
  badgeText?: string
  items?: Array<{
    title: string
    description: string
    icon?: string
    price?: string
    features?: string[]
    question?: string
    answer?: string
    role?: string
    stripePriceId?: string
  }>
  ctaText?: string
  ctaHref?: string
  image?: { alt: string; description: string }
  stats?: Array<{ value: string; label: string }>
  testimonials?: Array<{
    quote: string
    author: string
    role?: string
    company?: string
  }>
  // Cal.com booking section
  calcomUsername?: string
  calcomEventSlug?: string
}

interface WebsitePage {
  slug: string
  title: string
  metaTitle?: string
  metaDescription?: string
  sections: WebsiteSection[]
}

interface WebsiteData {
  pages: WebsitePage[]
  navigation?: Array<{ label: string; href: string; isPrimary?: boolean }>
  footer?: {
    copyright: string
    tagline?: string
    links: Array<{ label: string; href: string }>
  }
}

interface BrandData {
  name?: string
  tagline?: string
  colors?: {
    primary?: string
    primaryLight?: string
    primaryDark?: string
    secondary?: string
    secondaryLight?: string
    accent?: string
    background?: string
    foreground?: string
    muted?: string
    mutedForeground?: string
    success?: string
    warning?: string
    destructive?: string
  }
  fonts?: {
    heading?: string
    headingWeight?: string
    body?: string
    bodyWeight?: string
  }
  borderRadius?: string
}

/**
 * Convert website JSON data to code files
 */
export function convertWebsiteToFiles(
  website: WebsiteData,
  brand?: BrandData
): Record<string, string> {
  const files: Record<string, string> = {}

  // Generate package.json
  files['package.json'] = generatePackageJson()

  // Generate Vite config
  files['vite.config.ts'] = generateViteConfig()

  // Generate index.html
  files['index.html'] = generateIndexHtml(website, brand)

  // Generate CSS with brand variables
  files['src/index.css'] = generateGlobalCSS(brand)

  // Generate main entry
  files['src/main.tsx'] = generateMain()

  // Generate App component with routing
  files['src/App.tsx'] = generateApp(website)

  // Generate layout components
  files['src/components/Layout.tsx'] = generateLayout(website, brand)
  files['src/components/Navigation.tsx'] = generateNavigation(website, brand)
  files['src/components/Footer.tsx'] = generateFooter(website, brand)

  // Generate section components
  files['src/components/sections/HeroSection.tsx'] = generateHeroSection()
  files['src/components/sections/FeaturesSection.tsx'] = generateFeaturesSection()
  files['src/components/sections/TestimonialsSection.tsx'] = generateTestimonialsSection()
  files['src/components/sections/PricingSection.tsx'] = generatePricingSection()
  files['src/components/sections/FAQSection.tsx'] = generateFAQSection()
  files['src/components/sections/CTASection.tsx'] = generateCTASection()
  files['src/components/sections/StatsSection.tsx'] = generateStatsSection()
  files['src/components/sections/AboutSection.tsx'] = generateAboutSection()
  files['src/components/sections/ContactSection.tsx'] = generateContactSection()
  files['src/components/sections/ProcessSection.tsx'] = generateProcessSection()
  files['src/components/sections/TeamSection.tsx'] = generateTeamSection()
  files['src/components/sections/GallerySection.tsx'] = generateGallerySection()
  files['src/components/sections/BookingSection.tsx'] = generateBookingSection()
  files['src/components/sections/ProductsSection.tsx'] = generateProductsSection()
  files['src/components/sections/index.tsx'] = generateSectionsIndex()

  // Generate page components
  for (const page of website.pages) {
    files[`src/pages/${capitalize(page.slug)}Page.tsx`] = generatePage(page)
  }

  // Generate tailwind config
  files['tailwind.config.js'] = generateTailwindConfig(brand)

  // Generate postcss config
  files['postcss.config.js'] = generatePostCSSConfig()

  // Generate tsconfig
  files['tsconfig.json'] = generateTSConfig()

  return files
}

function generatePackageJson(): string {
  return JSON.stringify({
    name: 'ernest-preview',
    private: true,
    version: '0.0.0',
    type: 'module',
    scripts: {
      dev: 'vite --host',
      build: 'tsc && vite build',
      preview: 'vite preview',
    },
    dependencies: {
      react: '^18.2.0',
      'react-dom': '^18.2.0',
      'react-router-dom': '^6.20.0',
      'lucide-react': '^0.294.0',
      clsx: '^2.0.0',
    },
    devDependencies: {
      '@types/react': '^18.2.37',
      '@types/react-dom': '^18.2.15',
      '@vitejs/plugin-react': '^4.2.0',
      autoprefixer: '^10.4.16',
      postcss: '^8.4.31',
      tailwindcss: '^3.3.5',
      typescript: '^5.2.2',
      vite: '^5.0.0',
    },
  }, null, 2)
}

function generateViteConfig(): string {
  return `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
})
`
}

function generateIndexHtml(website: WebsiteData, brand?: BrandData): string {
  const homePage = website.pages.find(p => p.slug === 'home') || website.pages[0]
  const title = homePage?.metaTitle || brand?.name || 'Website'
  const description = homePage?.metaDescription || brand?.tagline || ''
  const fontUrl = brand?.fonts?.heading
    ? `https://fonts.googleapis.com/css2?family=${brand.fonts.heading.replace(/ /g, '+')}:wght@400;500;600;700&family=${(brand.fonts.body || brand.fonts.heading).replace(/ /g, '+')}:wght@400;500;600&display=swap`
    : 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="${escapeHtml(description)}" />
    <title>${escapeHtml(title)}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="${fontUrl}" rel="stylesheet">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`
}

function generateGlobalCSS(brand?: BrandData): string {
  const colors = brand?.colors || {}
  const fonts = brand?.fonts || {}

  return `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  /* Brand Colors */
  --color-primary: ${colors.primary || '#3b82f6'};
  --color-primary-light: ${colors.primaryLight || '#60a5fa'};
  --color-primary-dark: ${colors.primaryDark || '#2563eb'};
  --color-secondary: ${colors.secondary || '#6366f1'};
  --color-secondary-light: ${colors.secondaryLight || '#818cf8'};
  --color-accent: ${colors.accent || '#f59e0b'};
  --color-background: ${colors.background || '#ffffff'};
  --color-foreground: ${colors.foreground || '#111827'};
  --color-muted: ${colors.muted || '#f3f4f6'};
  --color-muted-foreground: ${colors.mutedForeground || '#6b7280'};
  --color-success: ${colors.success || '#22c55e'};
  --color-warning: ${colors.warning || '#f59e0b'};
  --color-destructive: ${colors.destructive || '#ef4444'};

  /* Typography */
  --font-heading: '${fonts.heading || 'Inter'}', system-ui, sans-serif;
  --font-body: '${fonts.body || 'Inter'}', system-ui, sans-serif;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: var(--font-body);
  background-color: var(--color-background);
  color: var(--color-foreground);
  line-height: 1.6;
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
  font-weight: ${fonts.headingWeight || '700'};
  line-height: 1.2;
}

.section-dark {
  background-color: var(--color-foreground);
  color: var(--color-background);
}

.section-muted {
  background-color: var(--color-muted);
}
`
}

function generateMain(): string {
  return `import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
`
}

function generateApp(website: WebsiteData): string {
  const pageImports = website.pages
    .map(p => `import ${capitalize(p.slug)}Page from './pages/${capitalize(p.slug)}Page'`)
    .join('\n')

  const routes = website.pages
    .map(p => {
      const path = p.slug === 'home' ? '/' : `/${p.slug}`
      return `        <Route path="${path}" element={<${capitalize(p.slug)}Page />} />`
    })
    .join('\n')

  return `import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
${pageImports}

function App() {
  return (
    <Layout>
      <Routes>
${routes}
      </Routes>
    </Layout>
  )
}

export default App
`
}

function generateLayout(website: WebsiteData, brand?: BrandData): string {
  return `import { ReactNode } from 'react'
import Navigation from './Navigation'
import Footer from './Footer'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  )
}
`
}

function generateNavigation(website: WebsiteData, brand?: BrandData): string {
  const navItems = website.navigation || []
  const brandName = brand?.name || 'Brand'

  return `import { Link } from 'react-router-dom'

export default function Navigation() {
  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="text-xl font-bold" style={{ color: 'var(--color-primary)' }}>
            ${escapeHtml(brandName)}
          </Link>

          <div className="flex items-center gap-6">
            ${navItems.map(item => {
              if (item.isPrimary) {
                return `<Link
              to="${item.href}"
              className="px-4 py-2 rounded-lg text-white font-medium transition-colors"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              ${escapeHtml(item.label)}
            </Link>`
              }
              return `<Link
              to="${item.href}"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              ${escapeHtml(item.label)}
            </Link>`
            }).join('\n            ')}
          </div>
        </div>
      </div>
    </nav>
  )
}
`
}

function generateFooter(website: WebsiteData, brand?: BrandData): string {
  const footer = website.footer || { copyright: '', links: [] }
  const brandName = brand?.name || 'Brand'

  return `import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <div className="text-xl font-bold mb-2">${escapeHtml(brandName)}</div>
            ${footer.tagline ? `<p className="text-gray-400">${escapeHtml(footer.tagline)}</p>` : ''}
          </div>

          <div className="flex gap-6">
            ${footer.links.map(link =>
              `<Link to="${link.href}" className="text-gray-400 hover:text-white transition-colors">
              ${escapeHtml(link.label)}
            </Link>`
            ).join('\n            ')}
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400 text-sm">
          ${escapeHtml(footer.copyright)}
        </div>
      </div>
    </footer>
  )
}
`
}

function generatePage(page: WebsitePage): string {
  const sectionImports = new Set<string>()
  page.sections.forEach(s => {
    sectionImports.add(`${capitalize(s.type)}Section`)
  })

  const imports = Array.from(sectionImports)
    .map(s => s)
    .join(', ')

  const sectionsJsx = page.sections
    .map((section, i) => {
      const Component = `${capitalize(section.type)}Section`
      // Build props, filtering out undefined values
      const props: string[] = [
        `headline="${escapeJsx(section.headline)}"`,
      ]

      if (section.subheadline) props.push(`subheadline="${escapeJsx(section.subheadline)}"`)
      if (section.content) props.push(`content="${escapeJsx(section.content)}"`)
      if (section.ctaText) props.push(`ctaText="${escapeJsx(section.ctaText)}"`)
      if (section.ctaHref) props.push(`ctaHref="${section.ctaHref}"`)
      if (section.darkSection) props.push('darkSection')
      if (section.layout) props.push(`layout="${section.layout}"`)
      if (section.badgeText) props.push(`badgeText="${escapeJsx(section.badgeText)}"`)
      if (section.items) props.push(`items={${JSON.stringify(section.items)}}`)
      if (section.stats) props.push(`stats={${JSON.stringify(section.stats)}}`)
      if (section.testimonials) props.push(`testimonials={${JSON.stringify(section.testimonials)}}`)
      // For booking sections, pass Cal.com config if available
      if (section.calcomUsername) props.push(`calcomUsername="${section.calcomUsername}"`)
      if (section.calcomEventSlug) props.push(`calcomEventSlug="${section.calcomEventSlug}"`)

      return `      <${Component}
        ${props.join('\n        ')}
      />`
    })
    .join('\n')

  return `import { ${imports} } from '../components/sections'

export default function ${capitalize(page.slug)}Page() {
  return (
    <>
${sectionsJsx}
    </>
  )
}
`
}

function generateSectionsIndex(): string {
  return `export { default as HeroSection } from './HeroSection'
export { default as FeaturesSection } from './FeaturesSection'
export { default as TestimonialsSection } from './TestimonialsSection'
export { default as PricingSection } from './PricingSection'
export { default as FAQSection } from './FAQSection'
export { default as CTASection } from './CTASection'
export { default as StatsSection } from './StatsSection'
export { default as AboutSection } from './AboutSection'
export { default as ContactSection } from './ContactSection'
export { default as ProcessSection } from './ProcessSection'
export { default as TeamSection } from './TeamSection'
export { default as GallerySection } from './GallerySection'
export { default as BookingSection } from './BookingSection'
export { default as ProductsSection } from './ProductsSection'
// Aliases for similar section types
export { default as BenefitsSection } from './FeaturesSection'
export { default as TrustSection } from './StatsSection'
`
}

function generateHeroSection(): string {
  return `import { Link } from 'react-router-dom'

interface HeroSectionProps {
  headline: string
  subheadline?: string
  ctaText?: string
  ctaHref?: string
  layout?: string
  darkSection?: boolean
  badgeText?: string
}

export default function HeroSection({
  headline,
  subheadline,
  ctaText,
  ctaHref,
  layout = 'centered',
  darkSection,
  badgeText,
}: HeroSectionProps) {
  const bgClass = darkSection ? 'section-dark' : ''
  const textMuted = darkSection ? 'text-gray-300' : 'text-gray-600'

  // Determine if link is internal (starts with / or #) or external
  const isInternal = ctaHref && (ctaHref.startsWith('/') || ctaHref.startsWith('#'))

  const CtaButton = ctaText ? (
    isInternal ? (
      <Link
        to={ctaHref || '/'}
        className="inline-block px-8 py-4 rounded-lg text-white font-semibold text-lg transition-all hover:scale-105 hover:shadow-lg"
        style={{ backgroundColor: 'var(--color-primary)' }}
      >
        {ctaText}
      </Link>
    ) : (
      <a
        href={ctaHref || '#'}
        className="inline-block px-8 py-4 rounded-lg text-white font-semibold text-lg transition-all hover:scale-105 hover:shadow-lg"
        style={{ backgroundColor: 'var(--color-primary)' }}
        target="_blank"
        rel="noopener noreferrer"
      >
        {ctaText}
      </a>
    )
  ) : null

  const Badge = badgeText ? (
    <span
      className="inline-block px-4 py-1.5 rounded-full text-sm font-medium mb-6"
      style={{
        backgroundColor: darkSection ? 'rgba(255,255,255,0.1)' : 'var(--color-primary)',
        color: darkSection ? 'var(--color-primary-light)' : 'white',
      }}
    >
      {badgeText}
    </span>
  ) : null

  // Bold layout - full bleed gradient background
  if (layout === 'bold') {
    return (
      <section
        className="min-h-[80vh] flex items-center px-6 text-white"
        style={{
          background: 'linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 50%, var(--color-secondary) 100%)'
        }}
      >
        <div className="max-w-5xl mx-auto text-center">
          {Badge}
          <h1 className="text-5xl md:text-8xl font-bold mb-8 leading-tight">{headline}</h1>
          {subheadline && (
            <p className="text-xl md:text-2xl opacity-90 mb-12 max-w-3xl mx-auto">
              {subheadline}
            </p>
          )}
          {ctaText && (
            isInternal ? (
              <Link
                to={ctaHref || '/'}
                className="inline-block px-10 py-5 rounded-lg font-bold text-lg transition-all hover:scale-105 hover:shadow-xl"
                style={{ backgroundColor: 'white', color: 'var(--color-primary-dark)' }}
              >
                {ctaText}
              </Link>
            ) : (
              <a
                href={ctaHref || '#'}
                className="inline-block px-10 py-5 rounded-lg font-bold text-lg transition-all hover:scale-105 hover:shadow-xl"
                style={{ backgroundColor: 'white', color: 'var(--color-primary-dark)' }}
              >
                {ctaText}
              </a>
            )
          )}
        </div>
      </section>
    )
  }

  // Minimal layout - lots of whitespace, elegant typography
  if (layout === 'minimal') {
    return (
      <section className={\`min-h-[90vh] flex items-center px-6 \${bgClass}\`}>
        <div className="max-w-6xl mx-auto">
          {Badge}
          <h1 className="text-6xl md:text-9xl font-bold mb-8 tracking-tight leading-none">{headline}</h1>
          {subheadline && (
            <p className={\`text-xl md:text-3xl \${textMuted} mb-12 max-w-2xl font-light\`}>
              {subheadline}
            </p>
          )}
          {CtaButton}
        </div>
      </section>
    )
  }

  // Bento layout - asymmetric grid
  if (layout === 'bento') {
    return (
      <section className={\`py-16 px-6 \${bgClass}\`}>
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 p-12 rounded-3xl" style={{ backgroundColor: 'var(--color-muted)' }}>
            {Badge}
            <h1 className="text-4xl md:text-6xl font-bold mb-6">{headline}</h1>
            {subheadline && (
              <p className={\`text-xl \${textMuted} mb-8\`}>{subheadline}</p>
            )}
            {CtaButton}
          </div>
          <div className="rounded-3xl aspect-square" style={{ backgroundColor: 'var(--color-primary-light)' }} />
          <div className="rounded-3xl aspect-video" style={{ backgroundColor: 'var(--color-secondary)' }} />
          <div className="md:col-span-2 rounded-3xl aspect-video bg-gray-200" />
        </div>
      </section>
    )
  }

  if (layout === 'split' || layout === 'split-reverse') {
    return (
      <section className={\`py-20 px-6 \${bgClass}\`}>
        <div className={\`max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center \${layout === 'split-reverse' ? 'md:flex-row-reverse' : ''}\`}>
          <div>
            {Badge}
            <h1 className="text-5xl md:text-6xl font-bold mb-6">{headline}</h1>
            {subheadline && (
              <p className={\`text-xl \${textMuted} mb-8\`}>{subheadline}</p>
            )}
            {CtaButton}
          </div>
          <div className="bg-gray-200 rounded-2xl aspect-video" />
        </div>
      </section>
    )
  }

  // Default centered layout
  return (
    <section className={\`py-24 px-6 text-center \${bgClass}\`}>
      <div className="max-w-4xl mx-auto">
        {Badge}
        <h1 className="text-5xl md:text-7xl font-bold mb-6">{headline}</h1>
        {subheadline && (
          <p className={\`text-xl md:text-2xl \${textMuted} mb-10 max-w-2xl mx-auto\`}>
            {subheadline}
          </p>
        )}
        {CtaButton}
      </div>
    </section>
  )
}
`
}

function generateFeaturesSection(): string {
  return `interface Item {
  title: string
  description: string
  icon?: string
}

interface FeaturesSectionProps {
  headline: string
  subheadline?: string
  items?: Item[]
  layout?: string
  darkSection?: boolean
  badgeText?: string
}

export default function FeaturesSection({
  headline,
  subheadline,
  items = [],
  layout = 'grid',
  darkSection,
  badgeText,
}: FeaturesSectionProps) {
  const bgClass = darkSection ? 'section-dark' : 'section-muted'
  const textMuted = darkSection ? 'text-gray-300' : 'text-gray-600'
  const cardBg = darkSection ? 'bg-white/10' : 'bg-white'

  const Badge = badgeText ? (
    <span
      className="inline-block px-4 py-1.5 rounded-full text-sm font-medium mb-4"
      style={{
        backgroundColor: darkSection ? 'rgba(255,255,255,0.1)' : 'var(--color-primary)',
        color: darkSection ? 'var(--color-primary-light)' : 'white',
      }}
    >
      {badgeText}
    </span>
  ) : null

  // Bento grid layout - modern asymmetric grid
  if (layout === 'bento') {
    return (
      <section className={\`py-20 px-6 \${bgClass}\`}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            {Badge}
            <h2 className="text-4xl font-bold mb-4">{headline}</h2>
            {subheadline && (
              <p className={\`text-xl \${textMuted} max-w-2xl mx-auto\`}>{subheadline}</p>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {items.map((item, i) => {
              // First item spans 2 columns, others are single
              const isLarge = i === 0
              return (
                <div
                  key={i}
                  className={\`\${isLarge ? 'md:col-span-2' : ''} p-8 rounded-2xl \${cardBg} shadow-sm hover:shadow-lg transition-all\`}
                >
                  <div
                    className="w-14 h-14 rounded-xl mb-6 flex items-center justify-center text-white"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    <span className="text-2xl">{item.icon || '✦'}</span>
                  </div>
                  <h3 className={\`\${isLarge ? 'text-2xl' : 'text-xl'} font-semibold mb-3\`}>{item.title}</h3>
                  <p className={\`\${textMuted} \${isLarge ? 'text-lg' : ''}\`}>{item.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    )
  }

  // Alternating layout - zigzag pattern
  if (layout === 'alternating') {
    return (
      <section className={\`py-20 px-6 \${bgClass}\`}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            {Badge}
            <h2 className="text-4xl font-bold mb-4">{headline}</h2>
            {subheadline && (
              <p className={\`text-xl \${textMuted} max-w-2xl mx-auto\`}>{subheadline}</p>
            )}
          </div>

          <div className="space-y-16">
            {items.map((item, i) => {
              const isReversed = i % 2 === 1
              return (
                <div
                  key={i}
                  className={\`flex flex-col md:flex-row gap-8 items-center \${isReversed ? 'md:flex-row-reverse' : ''}\`}
                >
                  <div className="flex-1">
                    <div
                      className="w-14 h-14 rounded-xl mb-4 flex items-center justify-center text-white"
                      style={{ backgroundColor: 'var(--color-primary)' }}
                    >
                      <span className="text-2xl">{item.icon || '✦'}</span>
                    </div>
                    <h3 className="text-2xl font-semibold mb-3">{item.title}</h3>
                    <p className={\`\${textMuted} text-lg\`}>{item.description}</p>
                  </div>
                  <div className="flex-1 aspect-video rounded-2xl bg-gray-200" />
                </div>
              )
            })}
          </div>
        </div>
      </section>
    )
  }

  // Cards layout - elevated cards with hover effects
  if (layout === 'cards') {
    return (
      <section className={\`py-20 px-6 \${bgClass}\`}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            {Badge}
            <h2 className="text-4xl font-bold mb-4">{headline}</h2>
            {subheadline && (
              <p className={\`text-xl \${textMuted} max-w-2xl mx-auto\`}>{subheadline}</p>
            )}
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {items.map((item, i) => (
              <div
                key={i}
                className={\`p-8 rounded-2xl \${cardBg} shadow-md hover:shadow-xl hover:-translate-y-1 transition-all border border-gray-100\`}
              >
                <div
                  className="w-16 h-16 rounded-2xl mb-6 flex items-center justify-center text-white"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  <span className="text-3xl">{item.icon || '✦'}</span>
                </div>
                <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                <p className={textMuted}>{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  // Default grid layout
  return (
    <section className={\`py-20 px-6 \${bgClass}\`}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          {Badge}
          <h2 className="text-4xl font-bold mb-4">{headline}</h2>
          {subheadline && (
            <p className={\`text-xl \${textMuted} max-w-2xl mx-auto\`}>{subheadline}</p>
          )}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {items.map((item, i) => (
            <div
              key={i}
              className={\`p-6 rounded-xl \${cardBg} shadow-sm hover:shadow-md transition-shadow\`}
            >
              <div
                className="w-12 h-12 rounded-lg mb-4 flex items-center justify-center text-white"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                <span className="text-2xl">{item.icon || '✦'}</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
              <p className={textMuted}>{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
`
}

function generateTestimonialsSection(): string {
  return `interface Testimonial {
  quote: string
  author: string
  role?: string
  company?: string
}

interface TestimonialsSectionProps {
  headline: string
  subheadline?: string
  testimonials?: Testimonial[]
  darkSection?: boolean
}

export default function TestimonialsSection({
  headline,
  subheadline,
  testimonials = [],
  darkSection,
}: TestimonialsSectionProps) {
  const bgClass = darkSection ? 'section-dark' : ''

  return (
    <section className={\`py-20 px-6 \${bgClass}\`}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">{headline}</h2>
          {subheadline && (
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">{subheadline}</p>
          )}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, i) => (
            <div
              key={i}
              className="p-6 rounded-xl bg-white shadow-sm border border-gray-100"
            >
              <p className="text-gray-700 mb-4 italic">"{testimonial.quote}"</p>
              <div>
                <p className="font-semibold">{testimonial.author}</p>
                {(testimonial.role || testimonial.company) && (
                  <p className="text-sm text-gray-500">
                    {testimonial.role}{testimonial.company ? \` at \${testimonial.company}\` : ''}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
`
}

function generatePricingSection(): string {
  return `import { Link } from 'react-router-dom'

interface PricingItem {
  title: string
  description: string
  price?: string
  features?: string[]
  stripePriceId?: string
  isPopular?: boolean
  ctaText?: string
  ctaHref?: string
}

interface PricingSectionProps {
  headline: string
  subheadline?: string
  items?: PricingItem[]
  darkSection?: boolean
  badgeText?: string
  layout?: string
  stripeEnabled?: boolean
}

export default function PricingSection({
  headline,
  subheadline,
  items = [],
  darkSection,
  badgeText,
  layout = 'cards',
  stripeEnabled = false,
}: PricingSectionProps) {
  const bgClass = darkSection ? 'section-dark' : 'section-muted'
  const textMuted = darkSection ? 'text-gray-300' : 'text-gray-600'
  const cardBg = darkSection ? 'bg-white/10' : 'bg-white'

  const handleSelectPlan = async (item: PricingItem) => {
    if (stripeEnabled && item.stripePriceId) {
      try {
        const response = await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ priceId: item.stripePriceId })
        })
        const { url } = await response.json()
        if (url) window.location.href = url
      } catch (error) {
        console.error('Checkout error:', error)
        alert('Checkout is not available yet. Please contact us.')
      }
    } else if (item.ctaHref) {
      // Navigate to the CTA href if provided
      window.location.href = item.ctaHref
    } else {
      alert(\`Interested in \${item.title}? Contact us to get started!\`)
    }
  }

  const Badge = badgeText ? (
    <span
      className="inline-block px-4 py-1.5 rounded-full text-sm font-medium mb-4"
      style={{
        backgroundColor: darkSection ? 'rgba(255,255,255,0.1)' : 'var(--color-primary)',
        color: darkSection ? 'var(--color-primary-light)' : 'white',
      }}
    >
      {badgeText}
    </span>
  ) : null

  // Determine grid columns based on number of items
  const gridCols = items.length === 2 ? 'md:grid-cols-2 max-w-3xl' :
                   items.length >= 4 ? 'md:grid-cols-2 lg:grid-cols-4 max-w-6xl' :
                   'md:grid-cols-3 max-w-5xl'

  return (
    <section className={\`py-20 px-6 \${bgClass}\`}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          {Badge}
          <h2 className="text-4xl font-bold mb-4">{headline}</h2>
          {subheadline && (
            <p className={\`text-xl \${textMuted} max-w-2xl mx-auto\`}>{subheadline}</p>
          )}
        </div>

        <div className={\`grid \${gridCols} gap-8 mx-auto\`}>
          {items.map((item, i) => {
            const isPopular = item.isPopular || i === 1 // Default middle item as popular
            return (
              <div
                key={i}
                className={\`relative p-8 rounded-2xl \${cardBg} text-center transition-all \${isPopular ? 'shadow-xl ring-2 scale-105' : 'shadow-md hover:shadow-lg'}\`}
                style={isPopular ? { '--tw-ring-color': 'var(--color-primary)' } as any : {}}
              >
                {isPopular && (
                  <div
                    className="absolute -top-4 left-1/2 transform -translate-x-1/2 px-4 py-1 rounded-full text-white text-sm font-medium"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    Most Popular
                  </div>
                )}
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className={\`\${textMuted} mb-4\`}>{item.description}</p>
                {item.price && (
                  <p className="text-4xl font-bold mb-6" style={{ color: 'var(--color-primary)' }}>
                    {item.price}
                  </p>
                )}
                {item.features && (
                  <ul className="text-left space-y-3 mb-8">
                    {item.features.map((feature, j) => (
                      <li key={j} className="flex items-start gap-3">
                        <span className="mt-0.5" style={{ color: 'var(--color-success)' }}>✓</span>
                        <span className={textMuted}>{feature}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  onClick={() => handleSelectPlan(item)}
                  className={\`w-full py-3 rounded-lg font-semibold transition-all hover:scale-105 \${isPopular ? 'text-white' : ''}\`}
                  style={{
                    backgroundColor: isPopular ? 'var(--color-primary)' : 'transparent',
                    color: isPopular ? 'white' : 'var(--color-primary)',
                    border: isPopular ? 'none' : '2px solid var(--color-primary)',
                  }}
                >
                  {item.ctaText || 'Get Started'}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
`
}

function generateFAQSection(): string {
  return `interface FAQItem {
  question?: string
  answer?: string
  title?: string
  description?: string
}

interface FAQSectionProps {
  headline: string
  subheadline?: string
  items?: FAQItem[]
  darkSection?: boolean
}

export default function FAQSection({
  headline,
  subheadline,
  items = [],
  darkSection,
}: FAQSectionProps) {
  const bgClass = darkSection ? 'section-dark' : ''

  return (
    <section className={\`py-20 px-6 \${bgClass}\`}>
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">{headline}</h2>
          {subheadline && (
            <p className="text-xl text-gray-600">{subheadline}</p>
          )}
        </div>

        <div className="space-y-4">
          {items.map((item, i) => (
            <details
              key={i}
              className="p-6 rounded-xl bg-white shadow-sm border border-gray-100 group"
            >
              <summary className="font-semibold cursor-pointer list-none flex justify-between items-center">
                {item.question || item.title}
                <span className="transition-transform group-open:rotate-180">▼</span>
              </summary>
              <p className="mt-4 text-gray-600">{item.answer || item.description}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
`
}

function generateCTASection(): string {
  return `import { Link } from 'react-router-dom'

interface CTASectionProps {
  headline: string
  subheadline?: string
  ctaText?: string
  ctaHref?: string
  darkSection?: boolean
  badgeText?: string
  layout?: string
}

export default function CTASection({
  headline,
  subheadline,
  ctaText,
  ctaHref,
  darkSection = true,
  badgeText,
  layout = 'centered',
}: CTASectionProps) {
  // Determine if link is internal or external
  const isInternal = ctaHref && (ctaHref.startsWith('/') || ctaHref.startsWith('#'))

  const CtaButton = ctaText ? (
    isInternal ? (
      <Link
        to={ctaHref || '/'}
        className="inline-block px-8 py-4 rounded-lg font-semibold text-lg transition-all hover:scale-105 hover:shadow-lg"
        style={{
          backgroundColor: 'var(--color-accent)',
          color: 'var(--color-foreground)',
        }}
      >
        {ctaText}
      </Link>
    ) : (
      <a
        href={ctaHref || '#'}
        className="inline-block px-8 py-4 rounded-lg font-semibold text-lg transition-all hover:scale-105 hover:shadow-lg"
        style={{
          backgroundColor: 'var(--color-accent)',
          color: 'var(--color-foreground)',
        }}
        target="_blank"
        rel="noopener noreferrer"
      >
        {ctaText}
      </a>
    )
  ) : null

  const Badge = badgeText ? (
    <span className="inline-block px-4 py-1.5 rounded-full text-sm font-medium mb-6 bg-white/20">
      {badgeText}
    </span>
  ) : null

  // Bold layout with gradient
  if (layout === 'bold') {
    return (
      <section
        className="py-24 px-6 text-white text-center"
        style={{
          background: 'linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-secondary) 100%)'
        }}
      >
        <div className="max-w-4xl mx-auto">
          {Badge}
          <h2 className="text-5xl md:text-6xl font-bold mb-6">{headline}</h2>
          {subheadline && (
            <p className="text-xl md:text-2xl opacity-90 mb-10">{subheadline}</p>
          )}
          {CtaButton}
        </div>
      </section>
    )
  }

  // Split layout with image
  if (layout === 'split') {
    return (
      <section
        className="py-20 px-6 text-white"
        style={{ backgroundColor: 'var(--color-primary-dark)' }}
      >
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            {Badge}
            <h2 className="text-4xl font-bold mb-4">{headline}</h2>
            {subheadline && (
              <p className="text-xl opacity-90 mb-8">{subheadline}</p>
            )}
            {CtaButton}
          </div>
          <div className="aspect-video rounded-2xl bg-white/10" />
        </div>
      </section>
    )
  }

  // Default centered layout
  return (
    <section
      className="py-20 px-6 text-white text-center"
      style={{ backgroundColor: 'var(--color-primary-dark)' }}
    >
      <div className="max-w-3xl mx-auto">
        {Badge}
        <h2 className="text-4xl font-bold mb-4">{headline}</h2>
        {subheadline && (
          <p className="text-xl opacity-90 mb-8">{subheadline}</p>
        )}
        {CtaButton}
      </div>
    </section>
  )
}
`
}

function generateStatsSection(): string {
  return `interface Stat {
  value: string
  label: string
}

interface StatsSectionProps {
  headline: string
  subheadline?: string
  stats?: Stat[]
  darkSection?: boolean
}

export default function StatsSection({
  headline,
  subheadline,
  stats = [],
  darkSection,
}: StatsSectionProps) {
  const bgClass = darkSection ? 'section-dark' : 'section-muted'

  return (
    <section className={\`py-20 px-6 \${bgClass}\`}>
      <div className="max-w-7xl mx-auto text-center">
        <h2 className="text-4xl font-bold mb-4">{headline}</h2>
        {subheadline && (
          <p className="text-xl text-gray-600 mb-12">{subheadline}</p>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <div key={i}>
              <p
                className="text-5xl font-bold mb-2"
                style={{ color: 'var(--color-primary)' }}
              >
                {stat.value}
              </p>
              <p className="text-gray-600">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
`
}

function generateAboutSection(): string {
  return `interface AboutSectionProps {
  headline: string
  subheadline?: string
  content?: string
  layout?: string
  darkSection?: boolean
}

export default function AboutSection({
  headline,
  subheadline,
  content,
  layout = 'split',
  darkSection,
}: AboutSectionProps) {
  const bgClass = darkSection ? 'section-dark' : ''

  return (
    <section className={\`py-20 px-6 \${bgClass}\`}>
      <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        <div>
          <h2 className="text-4xl font-bold mb-4">{headline}</h2>
          {subheadline && (
            <p className="text-xl text-gray-600 mb-6">{subheadline}</p>
          )}
          {content && (
            <p className="text-gray-600 leading-relaxed">{content}</p>
          )}
        </div>
        <div className="bg-gray-200 rounded-2xl aspect-square" />
      </div>
    </section>
  )
}
`
}

function generateContactSection(): string {
  return `interface ContactSectionProps {
  headline: string
  subheadline?: string
  ctaText?: string
  darkSection?: boolean
}

export default function ContactSection({
  headline,
  subheadline,
  ctaText = 'Send Message',
  darkSection,
}: ContactSectionProps) {
  const bgClass = darkSection ? 'section-dark' : 'section-muted'

  return (
    <section className={\`py-20 px-6 \${bgClass}\`}>
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">{headline}</h2>
          {subheadline && (
            <p className="text-xl text-gray-600">{subheadline}</p>
          )}
        </div>

        <form className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <input
              type="text"
              placeholder="Name"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2"
              style={{ '--tw-ring-color': 'var(--color-primary)' } as any}
            />
            <input
              type="email"
              placeholder="Email"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2"
            />
          </div>
          <textarea
            placeholder="Message"
            rows={5}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2"
          />
          <button
            type="submit"
            className="w-full py-3 rounded-lg text-white font-semibold"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            {ctaText}
          </button>
        </form>
      </div>
    </section>
  )
}
`
}

function generateProcessSection(): string {
  return `interface ProcessItem {
  title: string
  description: string
  icon?: string
}

interface ProcessSectionProps {
  headline: string
  subheadline?: string
  items?: ProcessItem[]
  layout?: string
  darkSection?: boolean
  badgeText?: string
}

export default function ProcessSection({
  headline,
  subheadline,
  items = [],
  layout = 'stacked',
  darkSection,
  badgeText,
}: ProcessSectionProps) {
  const bgClass = darkSection ? 'section-dark' : ''
  const textMuted = darkSection ? 'text-gray-300' : 'text-gray-600'
  const lineBg = darkSection ? 'bg-gray-700' : 'bg-gray-200'

  const Badge = badgeText ? (
    <span
      className="inline-block px-4 py-1.5 rounded-full text-sm font-medium mb-4"
      style={{
        backgroundColor: darkSection ? 'rgba(255,255,255,0.1)' : 'var(--color-primary)',
        color: darkSection ? 'var(--color-primary-light)' : 'white',
      }}
    >
      {badgeText}
    </span>
  ) : null

  // Alternating layout
  if (layout === 'alternating') {
    return (
      <section className={\`py-20 px-6 \${bgClass}\`}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            {Badge}
            <h2 className="text-4xl font-bold mb-4">{headline}</h2>
            {subheadline && (
              <p className={\`text-xl \${textMuted} max-w-2xl mx-auto\`}>{subheadline}</p>
            )}
          </div>

          <div className="space-y-16">
            {items.map((item, i) => {
              const isReversed = i % 2 === 1
              return (
                <div
                  key={i}
                  className={\`flex flex-col md:flex-row gap-8 items-center \${isReversed ? 'md:flex-row-reverse' : ''}\`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-4">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl"
                        style={{ backgroundColor: 'var(--color-primary)' }}
                      >
                        {i + 1}
                      </div>
                      <h3 className="text-2xl font-semibold">{item.title}</h3>
                    </div>
                    <p className={\`\${textMuted} text-lg ml-16\`}>{item.description}</p>
                  </div>
                  <div className="flex-1 aspect-video rounded-2xl bg-gray-200" />
                </div>
              )
            })}
          </div>
        </div>
      </section>
    )
  }

  // Default stacked layout with connecting line
  return (
    <section className={\`py-20 px-6 \${bgClass}\`}>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          {Badge}
          <h2 className="text-4xl font-bold mb-4">{headline}</h2>
          {subheadline && (
            <p className={\`text-xl \${textMuted} max-w-2xl mx-auto\`}>{subheadline}</p>
          )}
        </div>

        <div className="relative">
          {/* Connecting line */}
          <div className={\`absolute left-6 top-0 bottom-0 w-0.5 \${lineBg}\`} style={{ transform: 'translateX(-50%)' }} />

          <div className="space-y-12">
            {items.map((item, i) => (
              <div key={i} className="relative flex gap-6">
                <div
                  className="relative z-10 w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  {i + 1}
                </div>
                <div className="pt-2">
                  <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                  <p className={textMuted}>{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
`
}

function generateTeamSection(): string {
  return `interface TeamMember {
  title: string
  description: string
  role?: string
  image?: { alt: string; description: string }
}

interface TeamSectionProps {
  headline: string
  subheadline?: string
  items?: TeamMember[]
  layout?: string
  darkSection?: boolean
  badgeText?: string
}

export default function TeamSection({
  headline,
  subheadline,
  items = [],
  layout = 'grid',
  darkSection,
  badgeText,
}: TeamSectionProps) {
  const bgClass = darkSection ? 'section-dark' : ''
  const textMuted = darkSection ? 'text-gray-300' : 'text-gray-600'
  const cardBg = darkSection ? 'bg-white/10' : 'bg-white'

  const Badge = badgeText ? (
    <span
      className="inline-block px-4 py-1.5 rounded-full text-sm font-medium mb-4"
      style={{
        backgroundColor: darkSection ? 'rgba(255,255,255,0.1)' : 'var(--color-primary)',
        color: darkSection ? 'var(--color-primary-light)' : 'white',
      }}
    >
      {badgeText}
    </span>
  ) : null

  return (
    <section className={\`py-20 px-6 \${bgClass}\`}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          {Badge}
          <h2 className="text-4xl font-bold mb-4">{headline}</h2>
          {subheadline && (
            <p className={\`text-xl \${textMuted} max-w-2xl mx-auto\`}>{subheadline}</p>
          )}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {items.map((member, i) => (
            <div key={i} className={\`\${cardBg} rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow\`}>
              <div className="aspect-square bg-gray-200" />
              <div className="p-6 text-center">
                <h3 className="text-xl font-semibold mb-1">{member.title}</h3>
                {member.role && (
                  <p className="text-sm font-medium mb-2" style={{ color: 'var(--color-primary)' }}>
                    {member.role}
                  </p>
                )}
                {member.description && (
                  <p className={\`\${textMuted} text-sm\`}>{member.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
`
}

function generateGallerySection(): string {
  return `interface GalleryItem {
  title: string
  description: string
  image?: { alt: string; description: string }
}

interface GallerySectionProps {
  headline: string
  subheadline?: string
  items?: GalleryItem[]
  layout?: string
  darkSection?: boolean
  badgeText?: string
}

export default function GallerySection({
  headline,
  subheadline,
  items = [],
  layout = 'grid',
  darkSection,
  badgeText,
}: GallerySectionProps) {
  const bgClass = darkSection ? 'section-dark' : ''
  const textMuted = darkSection ? 'text-gray-300' : 'text-gray-600'

  const Badge = badgeText ? (
    <span
      className="inline-block px-4 py-1.5 rounded-full text-sm font-medium mb-4"
      style={{
        backgroundColor: darkSection ? 'rgba(255,255,255,0.1)' : 'var(--color-primary)',
        color: darkSection ? 'var(--color-primary-light)' : 'white',
      }}
    >
      {badgeText}
    </span>
  ) : null

  // Bento layout
  if (layout === 'bento') {
    return (
      <section className={\`py-20 px-6 \${bgClass}\`}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            {Badge}
            <h2 className="text-4xl font-bold mb-4">{headline}</h2>
            {subheadline && (
              <p className={\`text-xl \${textMuted} max-w-2xl mx-auto\`}>{subheadline}</p>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {items.map((item, i) => {
              // Create varied sizes for bento effect
              const isLarge = i === 0 || i === 3
              const isTall = i === 1
              return (
                <div
                  key={i}
                  className={\`\${isLarge ? 'md:col-span-2' : ''} \${isTall ? 'md:row-span-2' : ''} relative group rounded-2xl overflow-hidden bg-gray-200\`}
                  style={{ minHeight: isTall ? '400px' : '200px' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 text-white translate-y-full group-hover:translate-y-0 transition-transform">
                    <h3 className="text-lg font-semibold">{item.title}</h3>
                    <p className="text-sm opacity-90">{item.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    )
  }

  // Default grid layout
  return (
    <section className={\`py-20 px-6 \${bgClass}\`}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          {Badge}
          <h2 className="text-4xl font-bold mb-4">{headline}</h2>
          {subheadline && (
            <p className={\`text-xl \${textMuted} max-w-2xl mx-auto\`}>{subheadline}</p>
          )}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item, i) => (
            <div key={i} className="group relative rounded-2xl overflow-hidden aspect-[4/3] bg-gray-200">
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white translate-y-full group-hover:translate-y-0 transition-transform">
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="text-sm opacity-90">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
`
}

function generateBookingSection(): string {
  return `import { useEffect, useState } from 'react'

interface BookingSectionProps {
  headline: string
  subheadline?: string
  calcomUsername?: string
  calcomEventSlug?: string
  ctaText?: string
  darkSection?: boolean
  badgeText?: string
}

declare global {
  interface Window {
    Cal?: any
  }
}

export default function BookingSection({
  headline,
  subheadline,
  calcomUsername,
  calcomEventSlug,
  ctaText = 'Book Now',
  darkSection,
  badgeText,
}: BookingSectionProps) {
  const [calLoaded, setCalLoaded] = useState(false)
  const bgClass = darkSection ? 'section-dark' : 'section-muted'
  const textMuted = darkSection ? 'text-gray-300' : 'text-gray-600'

  const calLink = calcomEventSlug
    ? \`\${calcomUsername}/\${calcomEventSlug}\`
    : calcomUsername

  useEffect(() => {
    if (!calLink) return

    // Load Cal.com embed script
    const script = document.createElement('script')
    script.src = 'https://app.cal.com/embed/embed.js'
    script.async = true
    document.body.appendChild(script)

    script.onload = () => {
      if (window.Cal) {
        window.Cal('init', { origin: 'https://app.cal.com' })
        window.Cal('inline', {
          elementOrSelector: '#cal-embed',
          calLink,
          config: {
            theme: darkSection ? 'dark' : 'light',
          }
        })
        setCalLoaded(true)
      }
    }

    return () => {
      script.remove()
    }
  }, [calLink, darkSection])

  const Badge = badgeText ? (
    <span
      className="inline-block px-4 py-1.5 rounded-full text-sm font-medium mb-4"
      style={{
        backgroundColor: darkSection ? 'rgba(255,255,255,0.1)' : 'var(--color-primary)',
        color: darkSection ? 'var(--color-primary-light)' : 'white',
      }}
    >
      {badgeText}
    </span>
  ) : null

  // If Cal.com is configured, show the embed
  if (calLink) {
    return (
      <section className={\`py-20 px-6 \${bgClass}\`}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            {Badge}
            <h2 className="text-4xl font-bold mb-4">{headline}</h2>
            {subheadline && (
              <p className={\`text-xl \${textMuted}\`}>{subheadline}</p>
            )}
          </div>

          <div id="cal-embed" className="min-h-[600px] rounded-2xl overflow-hidden" />
        </div>
      </section>
    )
  }

  // Fallback: Show booking CTA if Cal.com not configured
  return (
    <section className={\`py-20 px-6 \${bgClass}\`}>
      <div className="max-w-3xl mx-auto text-center">
        {Badge}
        <h2 className="text-4xl font-bold mb-4">{headline}</h2>
        {subheadline && (
          <p className={\`text-xl \${textMuted} mb-8\`}>{subheadline}</p>
        )}

        <div className="p-12 rounded-2xl bg-white shadow-lg">
          <div
            className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
            style={{ backgroundColor: 'var(--color-primary-light)' }}
          >
            <svg className="w-10 h-10" style={{ color: 'var(--color-primary-dark)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-2xl font-semibold mb-4">Schedule Your Appointment</h3>
          <p className={\`\${textMuted} mb-8\`}>
            Ready to get started? Book a time that works best for you.
          </p>
          <button
            className="px-8 py-4 rounded-lg text-white font-semibold text-lg transition-all hover:scale-105"
            style={{ backgroundColor: 'var(--color-primary)' }}
            onClick={() => alert('Booking will be available soon!')}
          >
            {ctaText}
          </button>
        </div>
      </div>
    </section>
  )
}
`
}

function generateProductsSection(): string {
  return `import { Link } from 'react-router-dom'

interface ProductItem {
  title: string
  description: string
  price?: string
  image?: { alt: string; description: string }
  stripePriceId?: string
}

interface ProductsSectionProps {
  headline: string
  subheadline?: string
  items?: ProductItem[]
  layout?: string
  darkSection?: boolean
  badgeText?: string
  stripeEnabled?: boolean
}

export default function ProductsSection({
  headline,
  subheadline,
  items = [],
  layout = 'grid',
  darkSection,
  badgeText,
  stripeEnabled = false,
}: ProductsSectionProps) {
  const bgClass = darkSection ? 'section-dark' : ''
  const textMuted = darkSection ? 'text-gray-300' : 'text-gray-600'
  const cardBg = darkSection ? 'bg-white/10' : 'bg-white'

  const handleBuyClick = async (priceId?: string, productTitle?: string) => {
    if (stripeEnabled && priceId) {
      // In a real implementation, this would call your checkout API
      try {
        const response = await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ priceId })
        })
        const { url } = await response.json()
        if (url) window.location.href = url
      } catch (error) {
        console.error('Checkout error:', error)
        alert('Checkout is not available yet. Please contact us to purchase.')
      }
    } else {
      alert(\`Interested in \${productTitle}? Contact us to purchase!\`)
    }
  }

  const Badge = badgeText ? (
    <span
      className="inline-block px-4 py-1.5 rounded-full text-sm font-medium mb-4"
      style={{
        backgroundColor: darkSection ? 'rgba(255,255,255,0.1)' : 'var(--color-primary)',
        color: darkSection ? 'var(--color-primary-light)' : 'white',
      }}
    >
      {badgeText}
    </span>
  ) : null

  // Bento layout
  if (layout === 'bento') {
    return (
      <section className={\`py-20 px-6 \${bgClass}\`}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            {Badge}
            <h2 className="text-4xl font-bold mb-4">{headline}</h2>
            {subheadline && (
              <p className={\`text-xl \${textMuted} max-w-2xl mx-auto\`}>{subheadline}</p>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {items.map((item, i) => {
              const isLarge = i === 0
              return (
                <div
                  key={i}
                  className={\`\${isLarge ? 'md:col-span-2 md:row-span-2' : ''} \${cardBg} rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all group\`}
                >
                  <div className={\`\${isLarge ? 'aspect-square' : 'aspect-video'} bg-gray-200 group-hover:scale-105 transition-transform\`} />
                  <div className="p-6">
                    <h3 className={\`\${isLarge ? 'text-2xl' : 'text-xl'} font-semibold mb-2\`}>{item.title}</h3>
                    <p className={\`\${textMuted} mb-4 \${isLarge ? '' : 'line-clamp-2'}\`}>{item.description}</p>
                    <div className="flex items-center justify-between">
                      {item.price && (
                        <span className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>
                          {item.price}
                        </span>
                      )}
                      <button
                        onClick={() => handleBuyClick(item.stripePriceId, item.title)}
                        className="px-6 py-2 rounded-lg text-white font-medium transition-all hover:scale-105"
                        style={{ backgroundColor: 'var(--color-primary)' }}
                      >
                        Buy Now
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    )
  }

  // Default grid layout
  return (
    <section className={\`py-20 px-6 \${bgClass}\`}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          {Badge}
          <h2 className="text-4xl font-bold mb-4">{headline}</h2>
          {subheadline && (
            <p className={\`text-xl \${textMuted} max-w-2xl mx-auto\`}>{subheadline}</p>
          )}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {items.map((item, i) => (
            <div
              key={i}
              className={\`\${cardBg} rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all group\`}
            >
              <div className="aspect-square bg-gray-200 group-hover:scale-105 transition-transform overflow-hidden" />
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className={\`\${textMuted} text-sm mb-4 line-clamp-2\`}>{item.description}</p>
                <div className="flex items-center justify-between">
                  {item.price && (
                    <span className="text-xl font-bold" style={{ color: 'var(--color-primary)' }}>
                      {item.price}
                    </span>
                  )}
                  <button
                    onClick={() => handleBuyClick(item.stripePriceId, item.title)}
                    className="px-4 py-2 rounded-lg text-white font-medium text-sm transition-all hover:scale-105"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    Buy Now
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
`
}

function generateTailwindConfig(brand?: BrandData): string {
  const colors = brand?.colors || {}

  return `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '${colors.primary || '#3b82f6'}',
          light: '${colors.primaryLight || '#60a5fa'}',
          dark: '${colors.primaryDark || '#2563eb'}',
        },
        secondary: {
          DEFAULT: '${colors.secondary || '#6366f1'}',
          light: '${colors.secondaryLight || '#818cf8'}',
        },
        accent: '${colors.accent || '#f59e0b'}',
      },
    },
  },
  plugins: [],
}
`
}

function generatePostCSSConfig(): string {
  return `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
`
}

function generateTSConfig(): string {
  return JSON.stringify({
    compilerOptions: {
      target: 'ES2020',
      useDefineForClassFields: true,
      lib: ['ES2020', 'DOM', 'DOM.Iterable'],
      module: 'ESNext',
      skipLibCheck: true,
      moduleResolution: 'bundler',
      allowImportingTsExtensions: true,
      resolveJsonModule: true,
      isolatedModules: true,
      noEmit: true,
      jsx: 'react-jsx',
      strict: true,
      noUnusedLocals: true,
      noUnusedParameters: true,
      noFallthroughCasesInSwitch: true,
    },
    include: ['src'],
    references: [{ path: './tsconfig.node.json' }],
  }, null, 2)
}

// Utility functions
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function escapeJsx(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
}
