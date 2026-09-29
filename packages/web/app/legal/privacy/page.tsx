import type { Metadata } from 'next';
import Link from 'next/link';
import { BUSINESS, POLICY_LAST_UPDATED } from '@/lib/site-info';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How Perceptiqx collects, uses, shares and protects personal data when you use Fleet OS.',
};

export default function PrivacyPolicyPage() {
  return (
    <article>
      <h1>Privacy Policy</h1>
      <p className="lead">
        Last updated: {POLICY_LAST_UPDATED}
      </p>

      <p>
        This Privacy Policy explains how <strong>{BUSINESS.legalName}</strong> (&ldquo;we&rdquo;,
        &ldquo;us&rdquo;, &ldquo;our&rdquo;) handles personal data when you use{' '}
        {BUSINESS.productName} (the &ldquo;Service&rdquo;). It applies to visitors of our website,
        people who register an account, and people who contact support.
      </p>

      <h2>1. Who we are</h2>
      <p>
        The controller of your personal data is {BUSINESS.legalName}, {BUSINESS.registeredAddress},{' '}
        {BUSINESS.placeOfRegistration}. Privacy questions and data-subject requests go to{' '}
        {BUSINESS.privacyContact}.
      </p>

      <h2>2. What we collect</h2>
      <p>
        We collect the minimum needed to run the Service. We do not buy data about you, build
        marketing profiles, or sell personal data.
      </p>
      <ul>
        <li>
          <strong>Account data</strong> — at sign-up we ask only for your work email address, a
          password and your company or workspace name. Passwords are stored as salted hashes, never
          in plain text.
        </li>
        <li>
          <strong>Workspace data</strong> — the operational records your team enters: machines,
          sites, clients, operators, deployments, work sessions, meter readings, fuel, downtime,
          expenses, maintenance visits, cash counts and uploaded photos.
        </li>
        <li>
          <strong>Support data</strong> — the subject and description of tickets you submit, plus
          their status and timestamps.
        </li>
        <li>
          <strong>Technical data</strong> — IP address, browser and device type, timestamps and
          security logs used to authenticate you and detect misuse. Sign-in tokens are held in your
          browser&apos;s local storage rather than in tracking cookies.
        </li>
        <li>
          <strong>Cookies and similar storage</strong> — see our{' '}
          <Link href="/legal/cookies">Cookie Policy</Link>.
        </li>
      </ul>

      <h2>3. Why we use it (lawful bases)</h2>
      <ul>
        <li>
          <strong>To provide the Service</strong> (performance of a contract) — sign you in, store
          the records you create, generate the reports you ask for, and answer support tickets.
        </li>
        <li>
          <strong>To keep the Service secure</strong> (legitimate interest) — authenticate sessions,
          enforce role-based access, maintain audit logs and investigate abuse.
        </li>
        <li>
          <strong>To comply with the law</strong> — respond to lawful requests and retain records we
          are obliged to keep.
        </li>
        <li>
          <strong>Optional cookies</strong> (consent) — analytics, if we ever introduce any, run
          only after you opt in through the consent banner.
        </li>
      </ul>

      <h2>4. What we do not do</h2>
      <ul>
        <li>No analytics, advertising or cross-site tracking cookies today.</li>
        <li>No sale or rental of personal data.</li>
        <li>No collection of payment card details through the Service.</li>
        <li>No processing of special-category or sensitive personal data — please do not enter it.</li>
      </ul>

      <h2>5. Who we share it with</h2>
      <p>
        We share data only with service providers that help us run the Service, under contracts that
        limit their use of it:
      </p>
      <ul>
        <li>
          <strong>Hosting and database</strong> — the application and its PostgreSQL database run on
          our hosting and managed-database providers.
        </li>
        <li>
          <strong>Content delivery</strong> — some graphics and 3D assets are served from public
          content delivery networks, which receive your IP address when the asset is fetched.
        </li>
        <li>
          <strong>Optional AI features</strong> — when enabled by us for meter-photo OCR or written
          insights, the relevant image or text is sent to the model provider. These features are
          feature-flagged and can be switched off.
        </li>
        <li>
          <strong>Messaging</strong> — when notifications are enabled, operational messages are
          delivered through our WhatsApp or SMS provider.
        </li>
      </ul>
      <p>
        We do not disclose personal data to anyone else unless required by law, or as part of a
        business transfer where this policy continues to apply.
      </p>

      <h2>6. International transfers</h2>
      <p>
        Our providers may process data in countries other than your own. Where a transfer is
        restricted by law, we rely on the safeguards those laws provide (for example standard
        contractual clauses) before transferring data.
      </p>

      <h2>7. Retention and deletion</h2>
      <ul>
        <li>
          Workspace records are kept while your workspace is active, because the Service exists to
          maintain them and because operations teams need history.
        </li>
        <li>
          Audit entries and voided or corrected records are retained rather than erased, so that the
          history of a record stays intact.
        </li>
        <li>
          Support tickets are kept while they are open and for a reasonable period afterwards so we
          can see what happened before.
        </li>
        <li>
          On offboarding we provide an export and then delete workspace data, unless we must keep
          specific records to meet a legal obligation.
        </li>
      </ul>

      <h2>8. How we protect it</h2>
      <ul>
        <li>Row-level tenant isolation in the database, so one customer cannot read another&apos;s rows.</li>
        <li>Role-based access control: Owner, Operations and Platform roles with different grants.</li>
        <li>Append-only records — corrections create new versions instead of overwriting history.</li>
        <li>SHA-256 integrity checks on uploaded photos.</li>
        <li>Encrypted connections in transit, hashed passwords, and signed expiring session tokens.</li>
      </ul>
      <p>
        No system is perfectly secure. If we learn of an incident affecting your personal data, we
        will notify you and the relevant authority as the law requires.
      </p>

      <h2>9. Your rights</h2>
      <p>
        Depending on where you live, you may have the right to access, correct, delete, restrict or
        object to our use of your personal data, to receive a portable copy, and to withdraw consent
        at any time. To exercise any of these, email {BUSINESS.privacyContact} from the address
        registered to your account. We respond within the period the law requires.
      </p>
      <p>
        If you are unhappy with how we handle your data you may complain to your local data
        protection authority.
      </p>

      <h2>10. Children</h2>
      <p>
        Fleet OS is a business tool for adults. We do not knowingly collect data from anyone under
        the age at which they can enter a contract. If you believe a child has provided us with
        personal data, contact us and we will delete it.
      </p>

      <h2>11. Changes to this policy</h2>
      <p>
        We may update this policy as the Service or the law changes. The &quot;Last updated&quot;
        date at the top shows when it last changed. If a change materially affects how we use your
        data, we will notify you in the product or by email before it takes effect.
      </p>

      <h2>12. Contact</h2>
      <p>
        {BUSINESS.legalName}, {BUSINESS.registeredAddress}, {BUSINESS.placeOfRegistration}
        <br />
        Privacy: {BUSINESS.privacyContact}
        <br />
        Legal: {BUSINESS.legalContact}
      </p>
      <p>
        Related documents:{' '}
        <Link href="/legal/terms">Terms and Conditions</Link> ·{' '}
        <Link href="/legal/cookies">Cookie Policy</Link> ·{' '}
        <Link href="/legal/refund">Refund Policy</Link>
      </p>
    </article>
  );
}
