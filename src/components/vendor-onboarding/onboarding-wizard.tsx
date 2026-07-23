'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';
import { CheckStatusBadge } from './check-status-badge';
import {
  GSTIN_REGEX,
  PAN_REGEX,
  IFSC_REGEX,
  BANK_ACCOUNT_REGEX,
  MSME_REGEX,
  verifyGstin,
  verifyPan,
  verifyBankAccount,
  verifyMsme,
} from '@/lib/onboarding-verification';
import { saveOnboardingRecord } from '@/lib/onboarding-store';
import {
  GstCheckResult,
  PanCheckResult,
  BankCheckResult,
  MsmeCheckResult,
  OnboardingRecord,
} from '@/types/onboarding';
import { toast } from 'sonner';

const idleGst: GstCheckResult = { status: 'IDLE' };
const idlePan: PanCheckResult = { status: 'IDLE' };
const idleBank: BankCheckResult = { status: 'IDLE' };
const idleMsme: MsmeCheckResult = { status: 'IDLE' };

export default function OnboardingWizard() {
  const router = useRouter();

  const [companyName, setCompanyName] = useState('');
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [msmeNumber, setMsmeNumber] = useState('');

  const [gstResult, setGstResult] = useState<GstCheckResult>(idleGst);
  const [panResult, setPanResult] = useState<PanCheckResult>(idlePan);
  const [bankResult, setBankResult] = useState<BankCheckResult>(idleBank);
  const [msmeResult, setMsmeResult] = useState<MsmeCheckResult>(idleMsme);

  const [submitting, setSubmitting] = useState(false);

  const handleVerifyGst = async () => {
    if (!GSTIN_REGEX.test(gstin)) {
      setGstResult({ status: 'INVALID' });
      return;
    }
    setGstResult({ status: 'CHECKING' });
    const result = await verifyGstin(gstin);
    setGstResult(result);
  };

  const handleVerifyPan = async () => {
    if (!PAN_REGEX.test(pan)) {
      setPanResult({ status: 'INVALID' });
      return;
    }
    setPanResult({ status: 'CHECKING' });
    const result = await verifyPan(pan, companyName);
    setPanResult(result);
  };

  const handleVerifyBank = async () => {
    if (!BANK_ACCOUNT_REGEX.test(bankAccountNumber) || !IFSC_REGEX.test(ifsc)) {
      setBankResult({ status: 'INVALID' });
      return;
    }
    setBankResult({ status: 'CHECKING' });
    const result = await verifyBankAccount(bankAccountNumber, ifsc);
    setBankResult(result);
  };

  const handleVerifyMsme = async () => {
    if (!MSME_REGEX.test(msmeNumber)) {
      setMsmeResult({ status: 'NOT_FOUND' });
      return;
    }
    setMsmeResult({ status: 'CHECKING' });
    const result = await verifyMsme(msmeNumber);
    setMsmeResult(result);
  };

  const allChecked =
    gstResult.status !== 'IDLE' &&
    panResult.status !== 'IDLE' &&
    bankResult.status !== 'IDLE' &&
    msmeResult.status !== 'IDLE';

  const allVerified =
    gstResult.status === 'VERIFIED' &&
    panResult.status === 'VERIFIED' &&
    bankResult.status === 'VERIFIED' &&
    msmeResult.status === 'VERIFIED';

  const canSubmit = companyName.trim().length > 0 && allChecked;

  const handleSubmit = async () => {
    setSubmitting(true);

    const overallStatus: OnboardingRecord['overallStatus'] = allVerified
      ? 'VERIFIED'
      : [gstResult.status, panResult.status, bankResult.status, msmeResult.status].some(
          (s) => s === 'INVALID' || s === 'CANCELLED' || s === 'NOT_FOUND',
        )
      ? 'REJECTED'
      : 'NEEDS_REVIEW';

    const record: OnboardingRecord = {
      id: `ob-${Date.now()}`,
      companyName,
      gstin,
      gstResult,
      pan,
      panResult,
      bankAccountNumber,
      ifsc,
      bankResult,
      msmeNumber,
      msmeResult,
      overallStatus,
      submittedAt: new Date().toISOString(),
    };

    saveOnboardingRecord(record);
    toast.success('Onboarding submitted', { description: `Status: ${overallStatus.replace('_', ' ')}` });
    router.push(`/vendor-onboarding/${record.id}`);
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Company Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 max-w-md">
            <Label htmlFor="companyName">Company / Vendor Name</Label>
            <Input
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Vantage Components Manufacturing"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between flex-wrap gap-2">
            <span>GST Validation</span>
            <CheckStatusBadge status={gstResult.status} />
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="grid gap-2 max-w-md">
            <Label htmlFor="gstin">GSTIN</Label>
            <Input
              id="gstin"
              value={gstin}
              onChange={(e) => setGstin(e.target.value.toUpperCase())}
              placeholder="e.g. 27ABCDE1234F1Z5"
              maxLength={15}
            />
          </div>
          <div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleVerifyGst}
              disabled={gstResult.status === 'CHECKING' || gstin.length === 0}
            >
              {gstResult.status === 'CHECKING' && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Verify GSTIN
            </Button>
          </div>
          {gstResult.status === 'VERIFIED' && (
            <div className="text-sm text-muted-foreground rounded-md border bg-muted/30 p-3">
              <p><span className="font-medium text-foreground">Legal Name:</span> {gstResult.legalName}</p>
              <p><span className="font-medium text-foreground">Trade Name:</span> {gstResult.tradeName}</p>
              <p><span className="font-medium text-foreground">State:</span> {gstResult.state}</p>
              <p><span className="font-medium text-foreground">Registered:</span> {gstResult.registrationDate}</p>
            </div>
          )}
          {gstResult.status === 'CANCELLED' && (
            <p className="text-sm text-destructive">
              This GSTIN's registration has been cancelled ({gstResult.state}). Do not proceed without further review.
            </p>
          )}
          {gstResult.status === 'INVALID' && (
            <p className="text-sm text-destructive">Invalid GSTIN format. Expected 15 characters, e.g. 27ABCDE1234F1Z5.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between flex-wrap gap-2">
            <span>PAN Validation</span>
            <CheckStatusBadge status={panResult.status} />
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="grid gap-2 max-w-md">
            <Label htmlFor="pan">PAN</Label>
            <Input
              id="pan"
              value={pan}
              onChange={(e) => setPan(e.target.value.toUpperCase())}
              placeholder="e.g. ABCDE1234F"
              maxLength={10}
            />
          </div>
          <div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleVerifyPan}
              disabled={panResult.status === 'CHECKING' || pan.length === 0}
            >
              {panResult.status === 'CHECKING' && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Verify PAN
            </Button>
          </div>
          {panResult.status === 'VERIFIED' && (
            <p className="text-sm text-muted-foreground rounded-md border bg-muted/30 p-3">
              <span className="font-medium text-foreground">Name on Record:</span> {panResult.nameOnRecord}
            </p>
          )}
          {panResult.status === 'MISMATCH' && (
            <p className="text-sm text-destructive">
              Name mismatch — PAN record shows &quot;{panResult.nameOnRecord}&quot;, which differs from the company name entered.
            </p>
          )}
          {panResult.status === 'INVALID' && (
            <p className="text-sm text-destructive">Invalid PAN format. Expected 10 characters, e.g. ABCDE1234F.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between flex-wrap gap-2">
            <span>Bank Account Validation</span>
            <CheckStatusBadge status={bankResult.status} />
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="grid gap-3 max-w-md sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="bankAccountNumber">Bank Account Number</Label>
              <Input
                id="bankAccountNumber"
                value={bankAccountNumber}
                onChange={(e) => setBankAccountNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 123456789012"
                maxLength={18}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ifsc">IFSC Code</Label>
              <Input
                id="ifsc"
                value={ifsc}
                onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                placeholder="e.g. HDFC0001234"
                maxLength={11}
              />
            </div>
          </div>
          <div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleVerifyBank}
              disabled={bankResult.status === 'CHECKING' || !bankAccountNumber || !ifsc}
            >
              {bankResult.status === 'CHECKING' && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Verify Bank Account
            </Button>
          </div>
          {bankResult.status === 'VERIFIED' && (
            <div className="text-sm text-muted-foreground rounded-md border bg-muted/30 p-3">
              <p><span className="font-medium text-foreground">Bank:</span> {bankResult.bankName}</p>
              <p><span className="font-medium text-foreground">Branch:</span> {bankResult.branch}</p>
            </div>
          )}
          {bankResult.status === 'INVALID' && (
            <p className="text-sm text-destructive">
              Invalid account number or IFSC. Account: 9-18 digits. IFSC: 4 letters + 0 + 6 alphanumeric, e.g. HDFC0001234.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between flex-wrap gap-2">
            <span>MSME / Udyam Validation</span>
            <CheckStatusBadge status={msmeResult.status} />
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="grid gap-2 max-w-md">
            <Label htmlFor="msmeNumber">Udyam Registration Number</Label>
            <Input
              id="msmeNumber"
              value={msmeNumber}
              onChange={(e) => setMsmeNumber(e.target.value.toUpperCase())}
              placeholder="e.g. UDYAM-MH-03-1234567"
            />
          </div>
          <div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleVerifyMsme}
              disabled={msmeResult.status === 'CHECKING' || msmeNumber.length === 0}
            >
              {msmeResult.status === 'CHECKING' && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Verify MSME
            </Button>
          </div>
          {msmeResult.status === 'VERIFIED' && (
            <div className="text-sm text-muted-foreground rounded-md border bg-muted/30 p-3">
              <p><span className="font-medium text-foreground">Enterprise:</span> {msmeResult.enterpriseName}</p>
              <p><span className="font-medium text-foreground">Category:</span> {msmeResult.category}</p>
            </div>
          )}
          {msmeResult.status === 'NOT_FOUND' && (
            <p className="text-sm text-destructive">
              Invalid or unregistered Udyam number. Expected format UDYAM-XX-00-0000000. This vendor may not be MSME-registered.
            </p>
          )}
        </CardContent>
      </Card>

      <Separator className="my-1" />

      <div className="flex justify-end">
        <Button disabled={!canSubmit || submitting} onClick={handleSubmit} className="min-w-[180px]">
          Submit Onboarding
        </Button>
      </div>
    </div>
  );
}
