'use client'

import { useWorkspace } from '@/hooks/use-workspace'

interface WebsiteSection {
  type: string
  headline: string
  subheadline?: string
  content?: string
  items?: Array<{
    title: string
    description: string
    icon?: string
  }>
}

interface WebsitePage {
  slug: string
  title: string
  description: string
  sections: WebsiteSection[]
}

interface WebsiteData {
  pages: WebsitePage[]
}

export default function WebsitePage() {
  const { workspace } = useWorkspace()

  const websiteData = (workspace?.ai_context as Record<string, unknown>)?.website as WebsiteData | undefined
  const homePage = websiteData?.pages?.find((p) => p.slug === 'home') || websiteData?.pages?.[0]

  if (!homePage) {
    return (
      <div className="flex items-center justify-center h-full bg-[#1c1c1c] text-gray-400">
        <p>No website generated yet. Ask Ernest to build your website.</p>
      </div>
    )
  }

  return (
    <div className="h-full w-full bg-[#1c1c1c] overflow-auto">
      {homePage.sections.map((section, index) => (
        <div key={index} className="p-8 border-b border-[#2a2a2a]">
          {section.type === 'hero' && (
            <div className="text-center py-16">
              <h1 className="text-4xl font-bold text-gray-100 mb-4">{section.headline}</h1>
              {section.subheadline && (
                <p className="text-xl text-gray-400 max-w-2xl mx-auto">{section.subheadline}</p>
              )}
            </div>
          )}

          {section.type === 'features' && (
            <div className="py-12">
              <h2 className="text-3xl font-bold text-gray-100 text-center mb-8">{section.headline}</h2>
              {section.items && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                  {section.items.map((item, i) => (
                    <div key={i} className="text-center p-6">
                      <h3 className="text-lg font-semibold text-gray-200 mb-2">{item.title}</h3>
                      <p className="text-gray-400">{item.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {section.type === 'cta' && (
            <div className="text-center py-12 bg-[#2a2a2a] rounded-lg">
              <h2 className="text-2xl font-bold text-gray-100 mb-4">{section.headline}</h2>
              {section.subheadline && (
                <p className="text-gray-400 mb-6">{section.subheadline}</p>
              )}
              <button className="px-6 py-3 bg-[#c8ff00] text-gray-900 rounded-lg font-medium">
                Get Started
              </button>
            </div>
          )}

          {!['hero', 'features', 'cta'].includes(section.type) && (
            <div className="py-8">
              <h2 className="text-2xl font-bold text-gray-100 mb-4">{section.headline}</h2>
              {section.content && <p className="text-gray-400">{section.content}</p>}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
