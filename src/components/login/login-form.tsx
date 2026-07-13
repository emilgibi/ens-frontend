'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { EyeIcon, EyeOffIcon, Loader2, MailIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { LoginFormData, loginFormSchema } from '@/lib/definitions';
import { cn } from '@/lib/utils';

import { useSettings } from '@/contexts/settings-context';
import { ToastMessage } from '../shared/toast-message';
import { signIn } from '@/actions/auth';

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const { updateSettings } = useSettings();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginFormSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    startTransition(async () => {
      const response = await signIn(data);
      if (response.success) {
        updateSettings({
          email: data.email,
          fullName: response.username,
          userId: response.userId,
        });
        reset();
        router.push('/entity-universe');
      } else {
        toast.custom(() => (
          <ToastMessage
            variant={'error'}
            title="Login failed"
            message={response.message}
          />
        ));
      }
    });
  };

  return (
    <div className={cn('flex flex-col', className)} {...props}>
      {/* Header */}
      <div className="mb-10">
        <p style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#FFE600', fontWeight: 500, marginBottom: '10px' }}>
          Secure Access
        </p>
        <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#fff', marginBottom: '6px', fontFamily: 'Georgia, "Times New Roman", serif' }}>
          Welcome to RiskLens
        </h2>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', fontWeight: 300 }}>
          Enter your credentials to continue
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">

        {/* Email */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="email" style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>
            Email Address
          </Label>
          <div className="relative">
            <Input
              id="email"
              type="text"
              placeholder="you@domain.com"
              autoFocus
              {...register('email')}
              {...(errors.email ? { 'aria-invalid': true } : {})}
              className={cn(
                'h-11 pr-10 text-sm font-light',
                'border text-white placeholder:text-white/25',
                'focus-visible:ring-0 focus-visible:ring-offset-0',
                errors.email ? 'border-red-500/50' : ''
              )}
              style={{
                background: 'rgba(255,255,255,0.05)',
                borderColor: errors.email ? undefined : 'rgba(255,255,255,0.1)',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = '#FFE600'; e.currentTarget.style.background = 'rgba(255,230,0,0.04)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = errors.email ? '' : 'rgba(255,255,255,0.1)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
            />
            <MailIcon size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'rgba(255,255,255,0.25)' }} />
          </div>
          {errors.email?.message && (
            <p className="text-xs" style={{ color: '#f87171' }} role="alert">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>
              Password
            </Label>
            <button type="button"
              style={{ fontSize: '11px', color: '#FFE600', opacity: 0.7, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              onMouseOver={e => (e.currentTarget.style.opacity = '1')}
              onMouseOut={e => (e.currentTarget.style.opacity = '0.7')}
              onClick={() => { /* TODO: forgot password */ }}>
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={isVisible ? 'text' : 'password'}
              placeholder="••••••••••"
              {...register('password')}
              {...(errors.password ? { 'aria-invalid': true } : {})}
              className={cn(
                'h-11 pr-10 text-sm font-light',
                'border text-white placeholder:text-white/25',
                'focus-visible:ring-0 focus-visible:ring-offset-0',
                errors.password ? 'border-red-500/50' : ''
              )}
              style={{
                background: 'rgba(255,255,255,0.05)',
                borderColor: errors.password ? undefined : 'rgba(255,255,255,0.1)',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = '#FFE600'; e.currentTarget.style.background = 'rgba(255,230,0,0.04)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = errors.password ? '' : 'rgba(255,255,255,0.1)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
            />
            <button type="button"
              onClick={() => setIsVisible(!isVisible)}
              aria-label={isVisible ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 border-none bg-transparent p-0 cursor-pointer transition-colors"
              style={{ color: 'rgba(255,255,255,0.3)' }}
              onMouseOver={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
              onMouseOut={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}>
              {isVisible ? <EyeOffIcon size={14} /> : <EyeIcon size={14} />}
            </button>
          </div>
          {errors.password?.message && (
            <p className="text-xs" style={{ color: '#f87171' }} role="alert">{errors.password.message}</p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isPending || !isDirty}
          className="w-full h-11 rounded-md font-semibold cursor-pointer border-none transition-all duration-150 mt-1"
          style={{ background: '#FFE600', color: '#111', fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase' }}
          onMouseOver={e => { if (!isPending && isDirty) e.currentTarget.style.opacity = '0.88'; }}
          onMouseOut={e => { e.currentTarget.style.opacity = '1'; }}>
          {isPending ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Authenticating…
            </span>
          ) : 'Sign In'}
        </button>
      </form>

      <p className="mt-8 text-center leading-relaxed" style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)' }}>
        By signing in you agree to our{' '}
        <a href="/terms" style={{ color: 'rgba(255,255,255,0.45)', textDecoration: 'underline' }}>Terms</a>
        {' '}and{' '}
        <a href="/privacy" style={{ color: 'rgba(255,255,255,0.45)', textDecoration: 'underline' }}>Privacy Policy</a>.
      </p>
    </div>
  );
}