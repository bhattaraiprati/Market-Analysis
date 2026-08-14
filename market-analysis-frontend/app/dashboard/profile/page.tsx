'use client';

import type { LucideIcon } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import {
  Briefcase,
  Building2,
  CalendarDays,
  CircleAlert,
  Flag,
  Globe2,
  Mail,
  MapPin,
  ShieldCheck,
  Target,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { useAuthStore } from '@/lib/stores/authStore';
import type { Organization } from '@/types/api';

const colors = {
  canvas: '#f8f9ff',
  surface: '#ffffff',
  primary: '#005657',
  primarySoft: '#e8f5f4',
  primaryMuted: '#dff3f2',
  text: '#0b1c30',
  textMuted: '#3f4948',
  textSubtle: '#596563',
  border: '#dce5e4',
};

function getInitials(name?: string, email?: string) {
  const source = name?.trim() || email?.split('@')[0] || 'User';

  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function formatLabel(value?: string) {
  if (!value) return 'Member';

  return value
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value?: string) {
  if (!value) return 'Not available';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';

  return new Intl.DateTimeFormat('en', {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function getWebsite(website?: string | null) {
  const value = website?.trim();
  if (!value) return null;

  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    if (!['http:', 'https:'].includes(url.protocol)) return null;

    return {
      href: url.toString(),
      label: url.hostname.replace(/^www\./, ''),
    };
  } catch {
    return null;
  }
}

function hasOrganizationProfile(
  organization: Organization | null
): organization is Organization {
  return Boolean(
    organization?.name &&
    organization.industry &&
    organization.product_or_service &&
    organization.target_customers &&
    organization.business_goals
  );
}

function getStatusStyle(status?: string) {
  switch (status?.toUpperCase()) {
    case 'ACTIVE':
      return { background: '#e7f6ed', border: '#b9dfc8', color: '#176b3a' };
    case 'PENDING_APPROVAL':
      return { background: '#fff6df', border: '#ead49a', color: '#765a08' };
    case 'REJECTED':
      return { background: '#ffebee', border: '#f2bec3', color: '#93000a' };
    case 'SUSPENDED':
      return { background: '#f0f2f2', border: '#d4dada', color: '#4d5957' };
    default:
      return { background: colors.primarySoft, border: '#b9dbd9', color: colors.primary };
  }
}

function AccountDetail({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 py-3.5">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: colors.primarySoft, color: colors.primary }}
      >
        <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium" style={{ color: colors.textSubtle }}>
          {label}
        </p>
        <p className="mt-0.5 truncate text-sm font-medium" style={{ color: colors.text }}>
          {value}
        </p>
      </div>
    </div>
  );
}

function CompanyFact({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-xl bg-white p-4">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: colors.primarySoft, color: colors.primary }}
      >
        <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium" style={{ color: colors.textSubtle }}>
          {label}
        </p>
        <div className="mt-1 break-words text-sm font-semibold" style={{ color: colors.text }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function BusinessDetail({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value?: string | null;
}) {
  return (
    <article
      className="rounded-xl border p-5"
      style={{ backgroundColor: '#fbfcff', borderColor: colors.border }}
    >
      <div className="mb-3 flex items-center gap-2.5">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ backgroundColor: colors.primarySoft, color: colors.primary }}
        >
          <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
        </span>
        <h4 className="text-sm font-semibold" style={{ color: colors.text }}>
          {label}
        </h4>
      </div>
      <p
        className="break-words whitespace-pre-line text-sm leading-6"
        style={{ color: value ? colors.textMuted : colors.textSubtle }}
      >
        {value || 'Not provided during organization setup.'}
      </p>
    </article>
  );
}

function OrganizationLoadingState() {
  return (
    <div className="p-5 sm:p-7">
      <h2 id="organization-profile-heading" className="sr-only">
        Organization profile
      </h2>
      <div className="animate-pulse space-y-7 motion-reduce:animate-none" aria-hidden="true">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-xl bg-[#dff3f2]" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-28 rounded bg-[#dce5e4]" />
            <div className="h-7 w-52 max-w-full rounded bg-[#e8eeed]" />
          </div>
        </div>
        <div className="grid gap-3 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-20 rounded-xl bg-[#f0f5f4]" />
          ))}
        </div>
        <div className="space-y-3">
          <div className="h-4 w-40 rounded bg-[#dce5e4]" />
          <div className="h-3 w-full rounded bg-[#edf1f1]" />
          <div className="h-3 w-4/5 rounded bg-[#edf1f1]" />
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-32 rounded-xl bg-[#f0f5f4]" />
          ))}
        </div>
      </div>
    </div>
  );
}

function OrganizationErrorState({
  message,
  onRetry,
  isLoading,
}: {
  message: string;
  onRetry: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="flex min-h-80 flex-col items-center justify-center p-8 text-center">
      <span
        className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
        style={{ backgroundColor: '#ffebee', color: '#93000a' }}
        aria-hidden="true"
      >
        <CircleAlert size={23} strokeWidth={1.8} />
      </span>
      <h2
        id="organization-profile-heading"
        className="text-xl font-bold"
        style={{ fontFamily: 'var(--font-hanken-grotesk), sans-serif', color: colors.text }}
      >
        We couldn&apos;t load organization details
      </h2>
      <p className="mt-2 max-w-md text-sm leading-6" style={{ color: colors.textMuted }} role="alert">
        {message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        disabled={isLoading}
        className="mt-5 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a7070] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70"
        style={{ backgroundColor: colors.primary }}
      >
        {isLoading ? 'Trying again…' : 'Try again'}
      </button>
    </div>
  );
}

export default function ProfilePage() {
  const {
    user,
    organization,
    isOrganizationLoading,
    organizationError,
    loadOrganization,
  } = useAuthStore();
  const hasOrganizationDetails = hasOrganizationProfile(organization);
  const website = getWebsite(organization?.website);
  const organizationStatus = organization?.status ?? user?.organizationStatus ?? undefined;
  const organizationStatusStyle = getStatusStyle(organizationStatus);
  const accountRole = formatLabel(organization?.memberRole || user?.role);
  const accountStatus = user?.isVerified === true
    ? 'Verified account'
    : user?.isVerified === false
      ? 'Verification pending'
      : formatLabel(user?.status || 'Account');
  const organizationHeadingRef = useRef<HTMLHeadingElement>(null);
  const isRetryingOrganizationRef = useRef(false);

  useEffect(() => {
    void loadOrganization().catch(() => undefined);
  }, [loadOrganization]);

  useEffect(() => {
    if (
      isRetryingOrganizationRef.current &&
      !isOrganizationLoading &&
      !organizationError &&
      hasOrganizationDetails
    ) {
      organizationHeadingRef.current?.focus();
      isRetryingOrganizationRef.current = false;
    }
  }, [hasOrganizationDetails, isOrganizationLoading, organizationError]);

  const retryOrganization = () => {
    isRetryingOrganizationRef.current = true;
    void loadOrganization().catch(() => undefined);
  };

  return (
    <main
      className="min-h-[calc(100vh-4rem)]"
      style={{ backgroundColor: colors.canvas, fontFamily: 'var(--font-inter), sans-serif' }}
    >
      <div className="mx-auto w-full max-w-[1320px] p-4 sm:p-6 lg:p-10">
        <header
          className="mb-6 flex items-start gap-3 border-b pb-5 sm:mb-8"
          style={{ borderColor: colors.border }}
        >
          <span
            className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: colors.primaryMuted, color: colors.primary }}
          >
            <UserRound size={21} strokeWidth={1.9} aria-hidden="true" />
          </span>
          <div>
            <h1
              className="text-2xl font-bold tracking-[-0.02em] sm:text-[28px]"
              style={{ fontFamily: 'var(--font-hanken-grotesk), sans-serif', color: colors.primary }}
            >
              Profile
            </h1>
            <p className="mt-1 text-sm leading-5" style={{ color: colors.textMuted }}>
              Your account and organization details in one place.
            </p>
          </div>
        </header>

        <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {isOrganizationLoading
            ? organizationError
              ? 'Retrying organization details.'
              : hasOrganizationDetails
                ? 'Refreshing organization details.'
                : 'Loading organization details.'
            : !organizationError && hasOrganizationDetails
              ? 'Organization details loaded.'
              : ''}
        </p>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(280px,0.72fr)_minmax(0,1.8fr)]">
          <section
            className="overflow-hidden rounded-2xl border bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)] lg:sticky lg:top-24"
            style={{ borderColor: colors.border }}
            aria-labelledby="personal-profile-heading"
          >
            <div
              className="h-24"
              style={{
                background:
                  'radial-gradient(circle at 82% 10%, rgba(163, 240, 239, 0.95), transparent 42%), linear-gradient(135deg, #005657 0%, #1a7070 100%)',
              }}
            />

            <div className="px-5 pb-6 sm:px-6">
              <div
                className="relative -mt-12 flex h-24 w-24 items-center justify-center rounded-2xl border-4 text-2xl font-bold shadow-sm"
                style={{
                  backgroundColor: colors.primaryMuted,
                  borderColor: colors.surface,
                  color: colors.primary,
                }}
                role="img"
                aria-label={`${user?.name || 'User'} avatar`}
              >
                <span aria-hidden="true">{getInitials(user?.name, user?.email)}</span>
                {user?.profilePicture && (
                  <span
                    className="absolute inset-0 rounded-[12px] bg-cover bg-center"
                    style={{ backgroundImage: `url(${JSON.stringify(user.profilePicture)})` }}
                    aria-hidden="true"
                  />
                )}
                {user?.isVerified && (
                  <span
                    className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white"
                    style={{ backgroundColor: colors.primary, color: colors.surface }}
                    aria-hidden="true"
                  >
                    <ShieldCheck size={15} strokeWidth={2.2} aria-hidden="true" />
                  </span>
                )}
              </div>

              <div className="mt-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: colors.primary }}>
                  Personal profile
                </p>
                <h2
                  id="personal-profile-heading"
                  className="text-2xl font-bold tracking-[-0.02em]"
                  style={{ fontFamily: 'var(--font-hanken-grotesk), sans-serif', color: colors.text }}
                >
                  {user?.name || 'Your profile'}
                </h2>
                <p className="mt-1 break-all text-sm" style={{ color: colors.textMuted }}>
                  {user?.email || 'Email unavailable'}
                </p>
              </div>

              <div
                className="mt-5 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
                style={{ backgroundColor: colors.primarySoft, color: colors.primary }}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#1a7070]" aria-hidden="true" />
                {accountStatus}
              </div>

              <div className="mt-5 divide-y divide-[#dce5e4]">
                <AccountDetail icon={Mail} label="Email address" value={user?.email || 'Not available'} />
                <AccountDetail
                  icon={ShieldCheck}
                  label={organization?.memberRole ? 'Workspace role' : 'Account role'}
                  value={accountRole}
                />
                <AccountDetail icon={CalendarDays} label="Member since" value={formatDate(user?.created_at)} />
              </div>
            </div>
          </section>

          <section
            className="overflow-hidden rounded-2xl border bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]"
            style={{ borderColor: colors.border }}
            aria-labelledby="organization-profile-heading"
            aria-busy={isOrganizationLoading}
          >
            {hasOrganizationDetails ? (
              <>
                <div
                  className="border-b p-5 sm:p-7"
                  style={{
                    borderColor: colors.border,
                    background:
                      'linear-gradient(135deg, rgba(232, 245, 244, 0.9) 0%, rgba(248, 249, 255, 0.45) 68%, #ffffff 100%)',
                  }}
                >
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-4">
                      <span
                        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-lg font-bold"
                        style={{ backgroundColor: colors.primary, color: colors.surface }}
                        aria-hidden="true"
                      >
                        {getInitials(organization.name)}
                      </span>
                      <div className="min-w-0">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: colors.primary }}>
                          Organization profile
                        </p>
                        <h2
                          ref={organizationHeadingRef}
                          id="organization-profile-heading"
                          tabIndex={-1}
                          className="truncate text-2xl font-bold tracking-[-0.02em] outline-none focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1a7070] sm:text-[28px]"
                          style={{ fontFamily: 'var(--font-hanken-grotesk), sans-serif', color: colors.text }}
                        >
                          {organization.name}
                        </h2>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {isOrganizationLoading && (
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full border bg-white px-3 py-1.5 text-xs font-semibold"
                          style={{ borderColor: colors.border, color: colors.textMuted }}
                        >
                          <span className="material-symbols-outlined animate-spin text-[14px] motion-reduce:animate-none" aria-hidden="true">
                            progress_activity
                          </span>
                          Refreshing
                        </span>
                      )}
                      {organizationStatus && (
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold"
                          style={{
                            backgroundColor: organizationStatusStyle.background,
                            borderColor: organizationStatusStyle.border,
                            color: organizationStatusStyle.color,
                          }}
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: organizationStatusStyle.color }}
                            aria-hidden="true"
                          />
                          {formatLabel(organizationStatus)}
                        </span>
                      )}
                      <span
                        className="w-fit max-w-full break-words rounded-full border px-3 py-1.5 text-left text-xs font-semibold"
                        style={{
                          backgroundColor: colors.surface,
                          borderColor: '#b9dbd9',
                          color: colors.primary,
                        }}
                      >
                        {organization.industry || 'Industry not specified'}
                      </span>
                    </div>
                  </div>
                </div>

                {organizationError && (
                  <div
                    className="mx-5 mt-5 flex flex-col gap-3 rounded-xl border p-4 sm:mx-7 sm:flex-row sm:items-center sm:justify-between"
                    style={{ backgroundColor: '#fff8e8', borderColor: '#ead49a' }}
                  >
                    <div className="flex items-start gap-2.5">
                      <CircleAlert
                        className="mt-0.5 shrink-0"
                        size={18}
                        style={{ color: '#765a08' }}
                        aria-hidden="true"
                      />
                      <div>
                        <p className="text-sm font-semibold" style={{ color: colors.text }}>
                          Couldn&apos;t refresh organization details
                        </p>
                        <p className="mt-0.5 text-xs leading-5" style={{ color: colors.textMuted }} role="alert">
                          {organizationError} — showing the last available details.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={retryOrganization}
                      disabled={isOrganizationLoading}
                      className="shrink-0 self-start rounded-lg px-3 py-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a7070] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70 sm:self-auto"
                      style={{ backgroundColor: colors.surface, color: colors.primary }}
                    >
                      {isOrganizationLoading ? 'Trying again…' : 'Try again'}
                    </button>
                  </div>
                )}

                <div className="p-5 sm:p-7">
                  <div
                    className="grid gap-2 rounded-2xl p-2 xl:grid-cols-3"
                    style={{ backgroundColor: '#f3f7f7' }}
                  >
                    <CompanyFact icon={Globe2} label="Website">
                      {website ? (
                        <a
                          href={website.href}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex max-w-full items-center gap-1 break-all text-[#005657] underline decoration-[#9fc9c7] underline-offset-4 hover:decoration-[#005657]"
                        >
                          {website.label}
                          <span className="material-symbols-outlined text-[15px]" aria-hidden="true">
                            north_east
                          </span>
                          <span className="sr-only"> (opens in a new tab)</span>
                        </a>
                      ) : (
                        <span style={{ color: colors.textSubtle }}>Not provided</span>
                      )}
                    </CompanyFact>
                    <CompanyFact icon={UsersRound} label="Company size">
                      {organization.company_size
                        ? `${organization.company_size} employees`
                        : <span style={{ color: colors.textSubtle }}>Not provided</span>}
                    </CompanyFact>
                    <CompanyFact icon={MapPin} label="Location">
                      {organization.location || <span style={{ color: colors.textSubtle }}>Not provided</span>}
                    </CompanyFact>
                  </div>

                  <div className="mt-7">
                    <h3 className="text-sm font-semibold" style={{ color: colors.text }}>
                      About the organization
                    </h3>
                    <p
                      className="mt-2 break-words whitespace-pre-line text-sm leading-6"
                      style={{ color: organization.description ? colors.textMuted : colors.textSubtle }}
                    >
                      {organization.description || 'No organization description was provided during setup.'}
                    </p>
                  </div>

                  <div className="my-7 h-px" style={{ backgroundColor: colors.border }} />

                  <div>
                    <div className="mb-4">
                      <h3
                        className="text-lg font-bold"
                        style={{ fontFamily: 'var(--font-hanken-grotesk), sans-serif', color: colors.text }}
                      >
                        Business overview
                      </h3>
                      <p className="mt-1 text-sm" style={{ color: colors.textMuted }}>
                        The context added when this organization was created.
                      </p>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-2">
                      <BusinessDetail
                        icon={Briefcase}
                        label="Product or service"
                        value={organization.product_or_service}
                      />
                      <BusinessDetail
                        icon={Target}
                        label="Target customers"
                        value={organization.target_customers}
                      />
                      <BusinessDetail
                        icon={Flag}
                        label="Business goals"
                        value={organization.business_goals}
                      />
                      <BusinessDetail
                        icon={CircleAlert}
                        label="Current challenges"
                        value={organization.current_challenges}
                      />
                    </div>
                  </div>

                  <div className="mt-7">
                    <div className="mb-3 flex items-center gap-2.5">
                      <span
                        className="flex h-8 w-8 items-center justify-center rounded-lg"
                        style={{ backgroundColor: colors.primarySoft, color: colors.primary }}
                      >
                        <Building2 size={17} strokeWidth={1.8} aria-hidden="true" />
                      </span>
                      <h3 className="text-sm font-semibold" style={{ color: colors.text }}>
                        Known competitors
                      </h3>
                    </div>

                    {organization.known_competitors?.length ? (
                      <div className="flex flex-wrap gap-2">
                        {organization.known_competitors.map((competitor) => (
                          <span
                            key={competitor}
                            className="max-w-full break-words rounded-full border px-3 py-1.5 text-xs font-medium"
                            style={{
                              backgroundColor: '#fbfcff',
                              borderColor: colors.border,
                              color: colors.textMuted,
                            }}
                          >
                            {competitor}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm" style={{ color: colors.textSubtle }}>
                        No competitors were added during organization setup.
                      </p>
                    )}
                  </div>
                </div>
              </>
            ) : organizationError ? (
              <OrganizationErrorState
                message={organizationError}
                onRetry={retryOrganization}
                isLoading={isOrganizationLoading}
              />
            ) : (
              <OrganizationLoadingState />
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
