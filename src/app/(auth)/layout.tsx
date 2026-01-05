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
        <div
          className="absolute inset-0 animate-gradient-flow"
          style={{
            background: 'linear-gradient(-45deg, #c8ff00, #9acd32, #adff2f, #b8ef00, #dfff00)',
            backgroundSize: '400% 400%',
            animation: 'gradientFlow 8s ease infinite',
          }}
        />
        <style jsx>{`
          @keyframes gradientFlow {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
        `}</style>
      </div>
    </div>
  )
}
