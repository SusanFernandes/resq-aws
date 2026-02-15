'use client'

import { RecoilRoot } from 'recoil'

export function RootProvider({ children }: { children: React.ReactNode }) {
  return (
    <RecoilRoot>
      {children}
    </RecoilRoot>
  )
} 