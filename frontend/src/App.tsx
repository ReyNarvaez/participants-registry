import { useEffect, useState } from 'react'
import { getHealth } from './api.ts'

function App() {
  const [db, setDb] = useState('checking...')

  useEffect(() => {
    getHealth()
      .then((health) => setDb(health.db))
      .catch(() => setDb('unreachable'))
  }, [])

  return (
    <main>
      <h1>Participant Registry</h1>
      <p>Database: {db}</p>
    </main>
  )
}

export default App
