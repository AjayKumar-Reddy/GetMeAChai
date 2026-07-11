import React from 'react'

const Footer = () => {
  return (
    <footer className="bg-transparent border-t border-white/5 py-5 px-6 mt-auto">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
        
        {/* Left Section */}
        <p className="text-xs text-slate-500 font-medium">
          © {new Date().getFullYear()} <span className="text-slate-400">GetMeAChai</span>. All rights reserved.
        </p>
        
        {/* Right Section */}
        <p className="text-xs font-semibold tracking-wide text-indigo-400/80 uppercase">
          Fund your projects with chai ☕
        </p>
      </div>
    </footer>
  )
}

export default Footer
