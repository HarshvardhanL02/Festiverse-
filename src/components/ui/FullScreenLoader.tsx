import { Spinner } from './common'

export function FullScreenLoader({ label }: { label?: string }) {
  return (
    <div className="fixed inset-0 grid place-items-center bg-ink">
      <Spinner label={label} />
    </div>
  )
}
