import type { ReactNode } from 'react'
import { Spinner } from '@/components/ui/spinner'

type BusyProps = { busy: boolean; label: string; children: ReactNode }

/** Keeps its content on screen under a spinner while `busy`, e.g. the previous page while the next one loads. */
export function Busy({ busy, label, children }: BusyProps) {
  return (
    <div className="relative">
      {children}
      {busy && (
        <div className="absolute inset-0 grid place-items-center rounded-lg bg-background/60">
          <Spinner className="size-6 text-primary" aria-label={label} />
        </div>
      )}
    </div>
  )
}
