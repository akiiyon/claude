import { lazy } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { QuoteStreamProvider } from '@/components/QuoteStreamProvider'
import { ApiError } from '@/lib/api'
import { Dashboard } from '@/pages/Dashboard'
import { NotFound } from '@/pages/NotFound'

// Chart-heavy routes are split into their own chunks.
const StockDetail = lazy(() => import('@/pages/StockDetail').then((m) => ({ default: m.StockDetail })))
const Compare = lazy(() => import('@/pages/Compare').then((m) => ({ default: m.Compare })))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Client errors (unknown symbol, bad input) won't fix themselves on retry.
      retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 2,
    },
  },
})

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Dashboard /> },
      { path: '/stock/:symbol', element: <StockDetail /> },
      { path: '/compare', element: <Compare /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <QuoteStreamProvider>
        <RouterProvider router={router} />
      </QuoteStreamProvider>
    </QueryClientProvider>
  )
}
