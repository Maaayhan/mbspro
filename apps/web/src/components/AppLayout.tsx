'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  HomeIcon, 
  ClipboardDocumentCheckIcon, 
  DocumentTextIcon,
  UserCircleIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline'

interface AppLayoutProps {
  children: React.ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname()
  
  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'AI Suggestions', href: '/suggestions', icon: ClipboardDocumentCheckIcon },
    { name: 'Claim Builder', href: '/claim-builder', icon: DocumentTextIcon },
  ]

  const isActive = (href: string) => pathname === href

  const getCurrentPageName = () => {
    const currentNav = navigation.find(item => isActive(item.href))
    return currentNav?.name || 'Dashboard'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg">
        {/* Logo */}
        <div className="flex h-16 items-center justify-center border-b border-gray-200">
          <Link href="/" className="flex items-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
              <span className="text-sm font-bold text-white">M</span>
            </div>
            <span className="ml-2 text-xl font-bold text-gray-900">MBSPro</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="mt-6 px-3">
          <div className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive(item.href)
                      ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </div>
        </nav>

        {/* Bottom section */}
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Cog6ToothIcon className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-600">Settings</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 items-center justify-between bg-white px-6 shadow-sm border-b border-gray-200">
          <div className="flex items-center">
            <h1 className="text-lg font-semibold text-gray-900">
              {getCurrentPageName()}
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <UserCircleIcon className="h-8 w-8 text-gray-400" />
              <div className="text-sm">
                <div className="font-medium text-gray-900">Dr. Johnson</div>
                <div className="text-gray-500">General Practice</div>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
