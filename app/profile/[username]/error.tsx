'use client';
import { RouteErrorFallback } from '../../components/RouteErrorFallback';

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return <RouteErrorFallback error={error} retry={unstable_retry} routeLabel="profile" />;
}
