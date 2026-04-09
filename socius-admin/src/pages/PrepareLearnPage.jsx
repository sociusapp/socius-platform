import { Navigate } from 'react-router-dom';

/** Legacy URL — “Learn more” is edited on Prepare cards. */
export default function PrepareLearnPage() {
  return <Navigate to="/prepare-cards" replace />;
}
