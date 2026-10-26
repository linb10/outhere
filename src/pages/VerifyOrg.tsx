import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { BadgeCheck, Clock } from 'lucide-react';
import type { OrgType } from '@/types';
import { useApp } from '@/store/app';
import { useAsync } from '@/lib/hooks';
import { checkText } from '@/lib/moderation';
import { Button, Card, Chip, FormField, PageTitle, Skeleton } from '@/components/ui';

const TYPES: OrgType[] = ['School', 'Library', 'Government/Official', 'Nonprofit', 'Parks', 'Community Board', 'Other'];
const schema = z.object({
  orgName: z.string().trim().min(2).max(80).refine((s) => !checkText(s), 'Not allowed'),
  type: z.enum(TYPES as [OrgType, ...OrgType[]]),
  website: z.string().trim().url('Full URL, e.g. https://…'),
  email: z.string().trim().email('Invalid email'),
  role: z.string().trim().min(2, 'Required').max(60),
});
type V = z.infer<typeof schema>;

export default function VerifyOrg() {
  const { user, ds, toast } = useApp();
  const { data: req, loading, reload } = useAsync(() => ds.myOrgRequest(), [ds, user?.uid]);
  const [busy, setBusy] = useState(false);
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<V>({ resolver: zodResolver(schema), defaultValues: { type: 'Nonprofit' } });
  if (!user) return <Navigate to="/login" replace state={{ from: '/verify-org' }} />;

  if (user.verifiedOrg) return (
    <div className="mx-auto max-w-md"><PageTitle>Verified</PageTitle><Card className="flex items-center gap-3 p-5 text-lg font-semibold"><BadgeCheck className="text-accent-ink" /> {user.verifiedOrg}</Card></div>
  );
  if (loading) return <Skeleton className="h-64" />;
  if (req?.status === 'pending') return (
    <div className="mx-auto max-w-md"><PageTitle>Pending</PageTitle><Card className="flex items-center gap-3 p-5 font-semibold"><Clock /> {req.orgName} is under review.</Card></div>
  );

  const submit = async (v: V) => {
    setBusy(true);
    try {
      await ds.requestOrg(v);
      toast('Request sent');
      reload();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
    setBusy(false);
  };
  const type = watch('type');

  return (
    <div className="mx-auto max-w-xl">
      <PageTitle>Get verified</PageTitle>
      {req?.status === 'rejected' && <p className="mb-4 rounded-xl bg-elev px-4 py-3 text-sm font-semibold">Last request wasn’t approved. You can apply again.</p>}
      <form onSubmit={handleSubmit(submit)} className="grid grid-cols-1 gap-5" noValidate>
        <FormField label="Organization" error={errors.orgName?.message}><input className="field" {...register('orgName')} /></FormField>
        <div>
          <span className="label mb-2 block">Type</span>
          <div className="flex flex-wrap gap-2">{TYPES.map((t) => <Chip type="button" key={t} active={type === t} onClick={() => setValue('type', t)}>{t}</Chip>)}</div>
        </div>
        <FormField label="Website" error={errors.website?.message}><input className="field" type="url" placeholder="https://" {...register('website')} /></FormField>
        <FormField label="Contact email" error={errors.email?.message} hint="Official domain preferred. Admins only."><input className="field" type="email" {...register('email')} /></FormField>
        <FormField label="Your role" error={errors.role?.message}><input className="field" placeholder="Program coordinator" {...register('role')} /></FormField>
        <Button type="submit" size="lg" loading={busy}>Submit</Button>
      </form>
    </div>
  );
}
