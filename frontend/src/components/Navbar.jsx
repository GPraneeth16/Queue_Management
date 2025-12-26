import React, { useContext, useState, useEffect } from 'react'
import { assets } from '../assets/assets'
import { NavLink, useNavigate } from 'react-router-dom'
import { AppContext } from '../context/AppContext'

const Navbar = () => {
  const navigate = useNavigate()
  const [showMenu, setShowMenu] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { token, setToken, userData } = useContext(AppContext)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const logout = () => {
    setToken(false)
    navigate('/login')
  }

  return (
    <>
      {/* Spacer to prevent content from going under fixed navbar */}
      <div className='h-[72px] md:h-[80px]'></div>
      
      <div className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled 
          ? 'bg-white/80 backdrop-blur-xl shadow-xl' 
          : 'bg-white/95 backdrop-blur-md shadow-lg'
      }`}>
        <div className='container-custom'>
          <div className='flex items-center justify-between py-3 md:py-4'>
          {/* Logo with Glow Effect */}
          <div 
            onClick={() => navigate('/')} 
            className='cursor-pointer transform hover:scale-105 transition-all duration-300 relative group'
          >
            <div className='absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-full'></div>
            <img 
              className='w-40 md:w-48 lg:w-52 relative z-10' 
              src={assets.logo} 
              alt="MediQueue Logo" 
            />
          </div>

          {/* Desktop Navigation with Modern Styling */}
          <ul className='hidden md:flex items-center gap-1 lg:gap-2'>
            {[
              { to: '/', label: 'HOME' },
              { to: '/doctors', label: 'ALL DOCTORS' },
              { to: '/about', label: 'ABOUT' },
              { to: '/contact', label: 'CONTACT' }
            ].map((item) => (
              <NavLink 
                key={item.to}
                to={item.to} 
                className={({ isActive }) => 
                  `relative px-4 py-2 text-sm lg:text-base font-semibold tracking-wide transition-all duration-300 rounded-xl ${
                    isActive 
                      ? 'text-primary' 
                      : 'text-gray-700 hover:text-primary'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className='relative z-10'>{item.label}</span>
                    {isActive && (
                      <span className='absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl animate-pulse'></span>
                    )}
                    <span className='absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-primary to-accent transition-all duration-300 group-hover:w-3/4 rounded-full'></span>
                  </>
                )}
              </NavLink>
            ))}
          </ul>

          {/* User Actions */}
          <div className='flex items-center gap-3'>
            {token && userData ? (
              <div className='relative group'>
                {/* Profile Button */}
                <button className='flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-primary/5 to-accent/5 hover:from-primary/10 hover:to-accent/10 border border-primary/20 hover:border-primary/40 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20'>
                  <div className='relative'>
                    <img 
                      className='w-8 h-8 rounded-full object-cover ring-2 ring-primary/30 group-hover:ring-primary/60 transition-all duration-300' 
                      src={userData.image} 
                      alt="Profile" 
                    />
                    <span className='absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full'></span>
                  </div>
                  <svg 
                    className='w-3.5 h-3.5 text-gray-600 group-hover:text-primary transition-all duration-300 group-hover:rotate-180' 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                <div className='absolute top-full right-0 mt-3 w-72 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform group-hover:translate-y-0 translate-y-2'>
                  <div className='bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden'>
                    {/* User Info Header */}
                    <div className='relative p-6 bg-gradient-to-br from-primary via-primary to-accent overflow-hidden'>
                      <div className='absolute inset-0 bg-black/5'></div>
                      <div className='absolute -top-12 -right-12 w-32 h-32 bg-white/10 rounded-full blur-2xl'></div>
                      <div className='absolute -bottom-8 -left-8 w-24 h-24 bg-white/10 rounded-full blur-2xl'></div>
                      <div className='relative flex items-center gap-4'>
                        <img 
                          src={userData.image} 
                          alt="Profile" 
                          className='w-14 h-14 rounded-full object-cover ring-4 ring-white/40 shadow-lg'
                        />
                        <div className='flex-1 min-w-0'>
                          <p className='font-bold text-white text-lg truncate'>{userData.name || 'User'}</p>
                          <p className='text-white/90 text-sm truncate'>{userData.email}</p>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className='p-2'>
                      <button
                        onClick={() => navigate('/my-profile')}
                        className='w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gradient-to-r hover:from-primary/5 hover:to-accent/5 transition-all duration-300 group/item text-left'
                      >
                        <div className='w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover/item:bg-primary/20 transition-colors'>
                          <svg className='w-5 h-5 text-primary' fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <div>
                          <p className='font-semibold text-gray-800'>My Profile</p>
                          <p className='text-xs text-gray-500'>View and edit profile</p>
                        </div>
                      </button>

                      <button
                        onClick={() => navigate('/my-appointments')}
                        className='w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gradient-to-r hover:from-primary/5 hover:to-accent/5 transition-all duration-300 group/item text-left'
                      >
                        <div className='w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center group-hover/item:bg-accent/20 transition-colors'>
                          <svg className='w-5 h-5 text-accent' fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className='font-semibold text-gray-800'>My Appointments</p>
                          <p className='text-xs text-gray-500'>Manage bookings</p>
                        </div>
                      </button>

                      <div className='my-2 border-t border-gray-100'></div>

                      <button
                        onClick={logout}
                        className='w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 transition-all duration-300 group/item text-left'
                      >
                        <div className='w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center group-hover/item:bg-red-100 transition-colors'>
                          <svg className='w-5 h-5 text-red-600' fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                        </div>
                        <div>
                          <p className='font-semibold text-red-600'>Logout</p>
                          <p className='text-xs text-red-400'>Sign out of account</p>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => navigate('/login')} 
                className='hidden md:flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-primary to-accent text-white font-semibold rounded-xl hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 transform hover:scale-105 hover:-translate-y-0.5'
              >
                <span>Get Started</span>
                <svg className='w-4 h-4' fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            )}
            
            {/* Mobile Menu Button */}
            <button 
              onClick={() => setShowMenu(true)} 
              className='md:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 hover:from-primary/20 hover:to-accent/20 transition-all duration-300 hover:shadow-lg'
            >
              <svg className='w-6 h-6 text-primary' fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <div 
        className={`md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm transition-all duration-300 z-50 ${
          showMenu ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}
        onClick={() => setShowMenu(false)}
      >
        <div 
          className={`absolute right-0 top-0 bottom-0 w-80 max-w-[85vw] bg-white shadow-2xl transition-transform duration-300 ${
            showMenu ? 'translate-x-0' : 'translate-x-full'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Mobile Menu Header */}
          <div className='flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-primary/5 to-accent/5'>
            <img src={assets.logo} className='w-36' alt="MediQueue Logo" />
            <button 
              onClick={() => setShowMenu(false)} 
              className='w-10 h-10 flex items-center justify-center rounded-xl hover:bg-red-50 transition-all duration-300 group'
            >
              <svg className='w-6 h-6 text-gray-600 group-hover:text-red-600 transition-colors' fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Mobile Menu Items */}
          <div className='p-6 space-y-2'>
            {[
              { to: '/', label: 'HOME', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
              { to: '/doctors', label: 'ALL DOCTORS', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
              { to: '/about', label: 'ABOUT', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
              { to: '/contact', label: 'CONTACT', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' }
            ].map((item) => (
              <NavLink 
                key={item.to}
                onClick={() => setShowMenu(false)} 
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                    isActive
                      ? 'bg-gradient-to-r from-primary to-accent text-white shadow-lg'
                      : 'hover:bg-gradient-to-r hover:from-primary/10 hover:to-accent/10 text-gray-700'
                  }`
                }
              >
                <svg className='w-5 h-5' fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                </svg>
                <span className='font-semibold'>{item.label}</span>
              </NavLink>
            ))}
          </div>
          
          {!token && (
            <div className='absolute bottom-0 left-0 right-0 p-6 border-t border-gray-100 bg-gradient-to-t from-gray-50'>
              <button 
                onClick={() => { navigate('/login'); setShowMenu(false); }} 
                className='w-full py-3.5 bg-gradient-to-r from-primary to-accent text-white font-bold rounded-xl hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 transform hover:scale-105'
              >
                Get Started
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  )
}

export default Navbar