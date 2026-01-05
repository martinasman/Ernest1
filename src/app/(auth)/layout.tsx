export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left - Form Area */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-16 xl:px-24 bg-white">
        <div className="mx-auto w-full max-w-[420px]">
          {children}
        </div>
      </div>

      {/* Right - Animated Lime Green Gradient */}
      <div className="hidden lg:flex lg:flex-1 relative overflow-hidden rounded-l-[40px]">
        <div className="absolute inset-0 animate-gradient-lime" />
      </div>
    </div>
  )
}
