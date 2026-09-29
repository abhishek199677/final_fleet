import type { Metadata } from 'next';
import Link from 'next/link';
import { BUSINESS, POLICY_LAST_UPDATED } from '@/lib/site-info';

export const metadata: Metadata = {
  title: 'Terms and Conditions',
  description: 'The agreement that applies when you use Fleet OS, operated by Perceptiqx.',
};

export default function TermsAndConditionsPage() {
  return (
    <article>
      <h1>Terms and Conditions</h1>
      <p className="lead">Last updated: {POLICY_LAST_UPDATED}</p>

      <p>
        These Terms and Conditions (the &ldquo;Terms&rdquo;) are the agreement between you and{' '}
        <strong>{BUSINESS.legalName}</strong> (&ldquo;we&rdquo;, &ldquo;us&rdquo;) for your use of{' '}
        {BUSINESS.productName} (the &ldquo;Service&rdquo;). By creating an account or using the
        Service you accept them. If you do not accept them, do not use the Service.
      </p>

      <h2>1. About us</h2>
      <p>
        {BUSINESS.legalName}, {BUSINESS.registeredAddress}, {BUSINESS.placeOfRegistration}. Legal
        notices go to {BUSINESS.legalContact}.
      </p>

      <h2>2. The Service</h2>
      <p>
        Fleet OS is a web application for running heavy-equipment fleets: machines, sites,
        deployments, work sessions, meter readings, fuel, downtime, expenses, maintenance, cash
        counts, billing rates and reporting. Features may change as we improve the product.
      </p>

      <h2>3. Accounts and workspaces</h2>
      <ul>
        <li>You must provide an accurate business email and keep your password confidential.</li>
        <li>
          You are responsible for everything that happens under your account and for the people you
          invite into your workspace.
        </li>
        <li>
          Tell us at {BUSINESS.supportContact} as soon as you suspect your credentials have been
          compromised.
        </li>
        <li>
          You must be legally able to enter this agreement in your country to use the Service.
        </li>
      </ul>

      <h2>4. Acceptable use</h2>
      <p>You must not:</p>
      <ul>
        <li>break the law with the Service, or use it to harm anyone or their property;</li>
        <li>try to gain unauthorised access to the Service, its data or its infrastructure;</li>
        <li>probe, scan or test the vulnerability of the Service without our written permission;</li>
        <li>reverse engineer or copy the Service except where the law expressly allows it;</li>
        <li>upload malware, or content you have no right to upload;</li>
        <li>resell or white-label the Service without a written agreement.</li>
      </ul>

      <h2>5. Your data</h2>
      <ul>
        <li>You keep ownership of the records you and your team enter into Fleet OS.</li>
        <li>
          You give us a licence to host, process, back up and display that data solely to run the
          Service for you and as described in the{' '}
          <Link href="/legal/privacy">Privacy Policy</Link>.
        </li>
        <li>
          You are responsible for having a lawful basis to enter that data, including any personal
          details of your operators and clients.
        </li>
        <li>You can export your data and request deletion when you close the workspace.</li>
      </ul>

      <h2>6. Our intellectual property</h2>
      <p>
        The Service, including its software, interface, design and documentation, belongs to us and
        our licensors. Nothing in these Terms transfers you any ownership of it. Feedback you send
        may be used to improve the Service without obligation to you.
      </p>

      <h2>7. Third-party services</h2>
      <p>
        The Service relies on third-party hosting, database, content delivery and (where enabled)
        messaging and model providers. Those providers process data under their own terms and ours.
        Details are in the <Link href="/legal/privacy">Privacy Policy</Link>.
      </p>

      <h2>8. Fees</h2>
      <p>
        Fleet OS is currently offered without charge and the Service does not collect payment
        details from you. If we introduce paid plans we will tell you before they take effect, the
        price and what it covers, and the then-current{' '}
        <Link href="/legal/refund">Refund Policy</Link> will apply. Any custom commercial arrangement
        requires a separate written agreement signed by both of us.
      </p>

      <h2>9. Availability</h2>
      <p>
        We work hard to keep Fleet OS available, but we do not promise uninterrupted or error-free
        operation unless a service level has been agreed with you in writing. Maintenance, incidents
        and events outside our control may take the Service offline.
      </p>

      <h2>10. Suspension and termination</h2>
      <ul>
        <li>
          You can stop using Fleet OS at any time and ask us to close your workspace by contacting{' '}
          {BUSINESS.supportContact}.
        </li>
        <li>
          We may suspend or close an account that breaches these Terms, creates a security risk, or
          is used unlawfully, and we will notify you where we reasonably can.
        </li>
        <li>
          Sections that by their nature should survive termination (including 5, 6, 11, 12, 13 and
          14) survive it.
        </li>
      </ul>

      <h2>11. The Service is provided &ldquo;as is&rdquo;</h2>
      <p>
        To the fullest extent the law allows, we make no warranty that the Service meets your
        requirements, is uninterrupted, or that all errors will be corrected. Any guidance we give
        about maintenance intervals, alerts or reports is operational support, not engineering,
        safety or compliance advice — you remain responsible for your own equipment decisions.
      </p>

      <h2>12. Limitation of liability</h2>
      <p>
        To the fullest extent the law allows, we are not liable for indirect, incidental, special,
        consequential or punitive losses, or for lost profits, lost revenue, loss of data, or
        business interruption, arising from your use of the Service. Our total liability for any
        claim about the Service is limited to the amount you paid us for the Service in the twelve
        months before the claim (or, if you pay nothing, one hundred units of your local currency).
        Nothing in these Terms limits liability that cannot be limited by law, including for fraud
        or for death or personal injury caused by negligence.
      </p>

      <h2>13. Indemnity</h2>
      <p>
        You will defend and indemnify us against claims arising from the data you enter into the
        Service, your use of the Service, or your breach of these Terms, except to the extent caused
        by our own breach.
      </p>

      <h2>14. Changes to these Terms</h2>
      <p>
        We may update these Terms. The date at the top shows the latest version. If a change
        materially affects your rights we will give you reasonable advance notice in the product or
        by email. Continuing to use the Service after that means you accept the change; if you do
        not accept it, stop using the Service and ask us to close your workspace.
      </p>

      <h2>15. Governing law and disputes</h2>
      <p>
        These Terms are governed by {BUSINESS.governingLaw}. Before starting proceedings, please
        contact us so we can try to resolve the issue informally — most problems are settled in a
        conversation.
      </p>

      <h2>16. Contact</h2>
      <p>
        {BUSINESS.legalName}, {BUSINESS.registeredAddress}, {BUSINESS.placeOfRegistration}
        <br />
        Legal: {BUSINESS.legalContact}
        <br />
        Support: {BUSINESS.supportContact}
      </p>
      <p>
        Related documents:{' '}
        <Link href="/legal/privacy">Privacy Policy</Link> ·{' '}
        <Link href="/legal/cookies">Cookie Policy</Link> ·{' '}
        <Link href="/legal/refund">Refund Policy</Link>
      </p>
    </article>
  );
}
