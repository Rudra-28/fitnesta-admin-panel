import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import useAuthStore from '@/store/authStore';
import { checkAdmin, loginWithOtp } from '@/api/admin';
import { sendOTP, verifyOTP } from '@/lib/firebase';

// ── Error maps ────────────────────────────────────────────────────────────────
const BACKEND_ERRORS = {
  USER_NOT_FOUND: 'No admin account found with this mobile number.',
  ROLE_MISMATCH: 'This number is not registered as an admin.',
  APPROVAL_PENDING: 'Your admin account is pending approval.',
  REGISTRATION_REJECTED: 'Your admin account has been rejected.',
  ACCOUNT_SUSPENDED: 'Your account has been suspended. Contact support.',
  ADMIN_RECORD_NOT_FOUND: 'Admin record not found. Contact super-admin.',
};

const FIREBASE_ERRORS = {
  'auth/invalid-phone-number': 'Enter a valid 10-digit Indian mobile number.',
  'auth/too-many-requests': 'Too many OTP attempts. Please try again later.',
  'auth/invalid-verification-code': 'Incorrect OTP. Please check and try again.',
  'auth/code-expired': 'OTP expired. Please request a new one.',
  'auth/missing-phone-number': 'Phone number is required.',
};

const friendlyError = (err) =>
  FIREBASE_ERRORS[err?.code] ?? err?.message ?? 'Something went wrong. Please retry.';

// ── Boxed OTP Input ───────────────────────────────────────────────────────────
function OtpInput({ value, onChange, disabled }) {
  const inputRefs = useRef([]);
  const digits = (value || '').split('').slice(0, 6);
  while (digits.length < 6) digits.push('');

  const update = (index, char) => {
    const next = [...digits];
    next[index] = char;
    onChange(next.join(''));
    if (char && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKey = (e, index) => {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        update(index, '');
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
        update(index - 1, '');
      }
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted) {
      onChange(pasted.padEnd(6, '').slice(0, 6));
      inputRefs.current[Math.min(pasted.length, 5)]?.focus();
    }
    e.preventDefault();
  };

  return (
    <div className="flex gap-2 justify-center">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (inputRefs.current[i] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          disabled={disabled}
          onChange={(e) => update(i, e.target.value.replace(/\D/g, '').slice(-1))}
          onKeyDown={(e) => handleKey(e, i)}
          onPaste={i === 0 ? handlePaste : undefined}
          className={[
            'w-11 h-12 text-center text-lg font-semibold rounded-lg border-2',
            'bg-background transition-all outline-none',
            d ? 'border-primary' : 'border-border',
            'focus:border-primary focus:ring-2 focus:ring-primary/20',
            disabled ? 'opacity-50 cursor-not-allowed' : '',
          ].join(' ')}
        />
      ))}
    </div>
  );
}

// ── Main Login page ───────────────────────────────────────────────────────────
export default function Login() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [step, setStep] = useState('mobile'); // 'mobile' | 'otp'
  const [mobile, setMobile] = useState('');
  const [mobileErr, setMobileErr] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  // Resend countdown
  useEffect(() => {
    if (resendTimer <= 0) return;
    const id = setTimeout(() => setResendTimer((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [resendTimer]);

  // ── Step 1: check admin → fire OTP ───────────────────────────────────────
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setMobileErr('');
    const cleaned = mobile.replace(/^(\+91|0)/, '').trim();
    if (!/^[6-9]\d{9}$/.test(cleaned)) {
      setMobileErr('Enter a valid 10-digit Indian mobile number.');
      return;
    }
    setLoading(true);
    try {
      await checkAdmin(cleaned);   // pre-check: is this an admin?
      await sendOTP(cleaned);      // Firebase sends SMS
      setStep('otp');
      setResendTimer(30);
      toast.success(`OTP sent to +91 ${cleaned}`);
    } catch (err) {
      const code = err.response?.data?.error_code;
      toast.error(
        code
          ? (BACKEND_ERRORS[code] ?? err.response?.data?.message)
          : friendlyError(err)
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: verify OTP → backend login ───────────────────────────────────
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.replace(/\D/g, '').length < 6) {
      toast.error('Enter all 6 digits.');
      return;
    }
    setLoading(true);
    try {
      const idToken = await verifyOTP(otp);
      const res = await loginWithOtp(idToken);
      setAuth(res.data.token, res.data.user);
      navigate('/');
    } catch (err) {
      const code = err.response?.data?.error_code;
      toast.error(
        code
          ? (BACKEND_ERRORS[code] ?? err.response?.data?.message)
          : friendlyError(err)
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Resend OTP ────────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (resendTimer > 0) return;
    setOtp('');
    setLoading(true);
    try {
      const cleaned = mobile.replace(/^(\+91|0)/, '').trim();
      await sendOTP(cleaned);
      setResendTimer(30);
      toast.success('New OTP sent.');
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-muted/30">
      {/* Firebase invisible reCAPTCHA anchor — must exist in DOM */}
      <div id="recaptcha-container" />

      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-center text-xl">Fitnesta Admin</CardTitle>
          {step === 'otp' && (
            <p className="text-center text-sm text-muted-foreground mt-1">
              OTP sent to{' '}
              <span className="font-medium text-foreground">
                +91 {mobile.replace(/^(\+91|0)/, '').trim()}
              </span>
            </p>
          )}
        </CardHeader>

        <CardContent>
          {/* ── Step 1 ── */}
          {step === 'mobile' && (
            <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium" htmlFor="mobile">
                  Mobile Number
                </label>
                <Input
                  id="mobile"
                  type="tel"
                  placeholder="9876543210"
                  value={mobile}
                  onChange={(e) => { setMobile(e.target.value); setMobileErr(''); }}
                  aria-invalid={!!mobileErr}
                  disabled={loading}
                />
                {mobileErr && (
                  <p className="text-xs text-destructive">{mobileErr}</p>
                )}
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? 'Checking…' : 'Send OTP'}
              </Button>
            </form>
          )}

          {/* ── Step 2 ── */}
          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-5">
              <OtpInput value={otp} onChange={setOtp} disabled={loading} />

              <Button
                type="submit"
                disabled={loading || otp.replace(/\D/g, '').length < 6}
              >
                {loading ? 'Verifying…' : 'Verify & Sign In'}
              </Button>

              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => { setStep('mobile'); setOtp(''); }}
                  disabled={loading}
                >
                  ← Change number
                </button>
                <button
                  type="button"
                  className={
                    resendTimer > 0
                      ? 'text-muted-foreground cursor-not-allowed'
                      : 'text-primary hover:underline font-medium'
                  }
                  onClick={handleResend}
                  disabled={resendTimer > 0 || loading}
                >
                  {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
                </button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
