import { useRouter } from 'next/router'
 
export default function Page() {
  const router = useRouter();
  const session_id = router.query.slug;

  
}