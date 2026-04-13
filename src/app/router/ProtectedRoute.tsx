
import { Navigate } from 'react-router-dom';
import { useSession } from '@/app/session/SessionContext';
export function ProtectedRoute({children}){
 const s=useSession();
 if(s.isBootstrapping) return null;
 if(!s.isAuthenticated) return <Navigate to="/login" replace/>;
 return children;
}
