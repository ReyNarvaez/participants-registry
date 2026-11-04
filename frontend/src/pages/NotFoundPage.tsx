import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function NotFoundPage() {
  return (
    <Card className="mx-auto max-w-md text-center">
      <CardHeader>
        <CardTitle>
          <h2>Page not found</h2>
        </CardTitle>
        <CardDescription>There is nothing at this address.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild>
          <Link to="/participants">Go to participants</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
