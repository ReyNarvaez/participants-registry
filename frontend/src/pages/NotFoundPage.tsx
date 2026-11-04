import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <section aria-labelledby="not-found-heading">
      <h2 id="not-found-heading">Page not found</h2>
      <p>
        <Link to="/participants">Go to participants</Link>
      </p>
    </section>
  )
}
