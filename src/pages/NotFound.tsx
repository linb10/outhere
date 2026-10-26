import { useNavigate } from 'react-router-dom';
import { MapPinOff } from 'lucide-react';
import { Button, EmptyState } from '@/components/ui';

export default function NotFound() {
  const nav = useNavigate();
  return <EmptyState icon={MapPinOff} text="Page not found" action={<Button size="sm" onClick={() => nav('/')}>Home</Button>} />;
}
