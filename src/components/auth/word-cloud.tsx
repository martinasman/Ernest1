'use client'

export function WordCloud() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <svg
        viewBox="0 0 500 500"
        className="w-full h-full max-w-[600px] max-h-[600px]"
        style={{ transform: 'translateY(-5%)' }}
      >
        <defs>
          {/* Paths for curved text */}
          <path
            id="arc1"
            d="M 100,250 A 150,150 0 0,1 400,250"
            fill="none"
          />
          <path
            id="arc2"
            d="M 80,280 A 170,170 0 0,1 420,280"
            fill="none"
          />
          <path
            id="arc3"
            d="M 60,310 A 190,190 0 0,1 440,310"
            fill="none"
          />
          <path
            id="arc4"
            d="M 40,340 A 210,210 0 0,1 460,340"
            fill="none"
          />
          <path
            id="arc5"
            d="M 120,220 A 130,130 0 0,1 380,220"
            fill="none"
          />
        </defs>

        {/* Arc 5 - Top */}
        <text className="fill-blue-900/60 text-[18px] font-medium tracking-wide">
          <textPath href="#arc5" startOffset="15%">
            AI
          </textPath>
          <textPath href="#arc5" startOffset="45%">
            Growth
          </textPath>
          <textPath href="#arc5" startOffset="75%">
            Brand
          </textPath>
        </text>

        {/* Arc 1 */}
        <text className="fill-blue-800/50 text-[16px] font-medium tracking-wide">
          <textPath href="#arc1" startOffset="5%">
            Automation
          </textPath>
          <textPath href="#arc1" startOffset="35%">
            Revenue
          </textPath>
          <textPath href="#arc1" startOffset="65%">
            Website
          </textPath>
          <textPath href="#arc1" startOffset="88%">
            CRM
          </textPath>
        </text>

        {/* Arc 2 */}
        <text className="fill-blue-700/45 text-[15px] font-medium tracking-wide">
          <textPath href="#arc2" startOffset="8%">
            Analytics
          </textPath>
          <textPath href="#arc2" startOffset="32%">
            Flow
          </textPath>
          <textPath href="#arc2" startOffset="52%">
            Strategy
          </textPath>
          <textPath href="#arc2" startOffset="78%">
            Tools
          </textPath>
        </text>

        {/* Arc 3 */}
        <text className="fill-blue-600/40 text-[14px] font-medium tracking-wide">
          <textPath href="#arc3" startOffset="5%">
            Insights
          </textPath>
          <textPath href="#arc3" startOffset="25%">
            Data
          </textPath>
          <textPath href="#arc3" startOffset="45%">
            Customers
          </textPath>
          <textPath href="#arc3" startOffset="70%">
            Marketing
          </textPath>
          <textPath href="#arc3" startOffset="92%">
            Scale
          </textPath>
        </text>

        {/* Arc 4 - Bottom */}
        <text className="fill-blue-500/35 text-[13px] font-medium tracking-wide">
          <textPath href="#arc4" startOffset="10%">
            Operations
          </textPath>
          <textPath href="#arc4" startOffset="35%">
            Finance
          </textPath>
          <textPath href="#arc4" startOffset="55%">
            Workflows
          </textPath>
          <textPath href="#arc4" startOffset="80%">
            Integration
          </textPath>
        </text>

        {/* Center highlight word */}
        <text
          x="250"
          y="190"
          textAnchor="middle"
          className="fill-blue-900/70 text-[24px] font-semibold"
        >
          Ernest
        </text>

        {/* Decorative dots */}
        <circle cx="180" cy="200" r="3" className="fill-blue-400/40" />
        <circle cx="320" cy="200" r="3" className="fill-blue-400/40" />
        <circle cx="150" cy="260" r="2" className="fill-blue-300/30" />
        <circle cx="350" cy="260" r="2" className="fill-blue-300/30" />
        <circle cx="130" cy="300" r="2" className="fill-blue-300/25" />
        <circle cx="370" cy="300" r="2" className="fill-blue-300/25" />
      </svg>

      {/* Tagline at bottom */}
      <div className="absolute bottom-12 left-0 right-0 px-8">
        <p className="text-lg text-blue-900/70 text-center font-medium">
          Build and run your entire business
          <br />
          with <span className="font-semibold">AI-powered intelligence</span>
        </p>
      </div>
    </div>
  )
}
