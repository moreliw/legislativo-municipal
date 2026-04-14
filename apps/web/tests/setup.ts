import { vi } from 'vitest'

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
}))

// Mock Next.js Image
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => null,
}))

// Mock environment
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001'
