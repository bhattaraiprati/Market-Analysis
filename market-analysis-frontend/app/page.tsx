import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0B0C10' }}>
      <div className="max-w-4xl w-full text-center">
        {/* Logo and Header */}
        <div className="mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl" style={{ background: '#00D2FF', color: '#0B0C10' }}>
              🤖
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-4" style={{ color: '#F0F6FC' }}>
            PersonaFlow
          </h1>
          <p className="text-xl md:text-2xl mb-2" style={{ color: '#00D2FF' }}>
            AI Knowledge Management
          </p>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: '#8B949E' }}>
            Manage your AI personas and knowledge base with intelligent, context-aware assistance
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
          <Link
            href="/register"
            className="w-full sm:w-auto px-8 py-4 rounded-lg text-base font-semibold transition-all hover:opacity-90 focus:outline-none focus:ring-2"
            style={{
              background: '#00D2FF',
              color: '#0B0C10',
              boxShadow: '0 0 30px rgba(0, 210, 255, 0.4)'
            }}
          >
            Get Started Free
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-4 rounded-lg text-base font-semibold transition-all hover:opacity-80 focus:outline-none focus:ring-2"
            style={{
              background: '#21262D',
              border: '1px solid #30363D',
              color: '#F0F6FC'
            }}
          >
            Sign In
          </Link>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
          <div className="p-6 rounded-xl" style={{ background: '#161B22', border: '1px solid #30363D' }}>
            <div className="text-3xl mb-4">🎯</div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: '#F0F6FC' }}>
              AI Personas
            </h3>
            <p className="text-sm" style={{ color: '#8B949E' }}>
              Create and manage multiple AI personas tailored to different use cases
            </p>
          </div>
          <div className="p-6 rounded-xl" style={{ background: '#161B22', border: '1px solid #30363D' }}>
            <div className="text-3xl mb-4">📚</div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: '#F0F6FC' }}>
              Knowledge Base
            </h3>
            <p className="text-sm" style={{ color: '#8B949E' }}>
              Organize and access your knowledge with intelligent search and retrieval
            </p>
          </div>
          <div className="p-6 rounded-xl" style={{ background: '#161B22', border: '1px solid #30363D' }}>
            <div className="text-3xl mb-4">⚡</div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: '#F0F6FC' }}>
              Intelligent Insights
            </h3>
            <p className="text-sm" style={{ color: '#8B949E' }}>
              Get context-aware insights powered by advanced AI technology
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
