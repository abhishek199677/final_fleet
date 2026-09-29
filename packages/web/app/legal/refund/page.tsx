import type { Metadata } from 'next';
import Link from 'next/link';
import { BUSINESS, POLICY_LAST_UPDATED } from '@/lib/site-info';

export const metadata: Metadata = {
  title: 'Refund Policy',
  description:
    'How Perceptiqx handles charges, cancellations and refunds for Fleet OS — and what happens if paid plans are introduced.',
};

export default function RefundPolicyPage() {
  return (
    <article>
      <h1>Refund Policy</h1>
      <p className="lead">Last updated: {POLICY_LAST_UPDATED}</p>

      <p>
        This Refund Policy explains how <strong>{BUSINESS.legalName}</strong> handles charges,
        cancellations and refunds for {BUSINESS.productName}.
      </p>

      <h2>1. Fleet OS is not currently charged for</h2>
      <p>
        Today the Service is provided without a paid subscription. We do not take payment card
        details through Fleet OS, we do not run a recurring billing cycle against you, and there is
        therefore nothing for us to refund. Creating a workspace and using the product costs
        nothing.
      </p>

      <h2>2. No automatic charges</h2>
      <ul>
        <li>We do not store your payment card number in the product.</li>
        <li>
          We do not roll you into a paid plan at the end of a trial — there is no trial that
          converts to a paid subscription without you actively choosing a plan.
        </li>
        <li>We will not charge you for using Fleet OS without your explicit agreement first.</li>
      </ul>

      <h2>3. Costs that are not ours</h2>
      <p>
        Any data or messaging charges from your own mobile or internet provider, and any third-party
        services you connect to your own workspace, are between you and those providers and are not
        refundable by us.
      </p>

      <h2>4. If paid plans are introduced</h2>
      <p>
        Should we introduce paid plans, this policy will be updated before they launch and you will
        be told the price, the billing period and the cancellation terms before you agree to
        anything. Unless a different term is agreed in writing at that point, the following will
        apply:
      </p>
      <ul>
        <li>
          <strong>Advance notice</strong> — existing workspaces get reasonable notice before any
          charge applies, and can decline and stop using the paid features.
        </li>
        <li>
          <strong>Cooling-off</strong> — where the law gives you a right to cancel at a distance,
          you can exercise it within the statutory period for a full refund.
        </li>
        <li>
          <strong>Pro-rata refunds</strong> — if we cancel a paid plan, or a billed period cannot
          be delivered for reasons attributable to us, we refund the unused portion.
        </li>
        <li>
          <strong>Billing errors</strong> — if you are charged incorrectly, tell us and we correct
          it or refund the difference.
        </li>
      </ul>

      <h2>5. How to ask for a refund or raise a billing concern</h2>
      <ul>
        <li>
          Sign in and open <strong>Support</strong> to raise a ticket (fastest — it carries your
          workspace context), or
        </li>
        <li>
          email {BUSINESS.supportContact} from the address registered to your account, including the
          workspace name, what you were charged for (if anything) and the date.
        </li>
      </ul>
      <p>
        We acknowledge requests promptly and aim to resolve them within fourteen days of having the
        information we need.
      </p>

      <h2>6. Your statutory rights</h2>
      <p>
        Nothing in this policy limits any refund, cancellation or consumer right you have under
        mandatory local law. Where mandatory law gives you a stronger right than this policy, the
        law applies.
      </p>

      <h2>7. Contact</h2>
      <p>
        {BUSINESS.legalName}, {BUSINESS.registeredAddress}, {BUSINESS.placeOfRegistration}
        <br />
        Billing and support: {BUSINESS.supportContact}
        <br />
        Legal: {BUSINESS.legalContact}
      </p>
      <p>
        Related documents:{' '}
        <Link href="/legal/terms">Terms and Conditions</Link> ·{' '}
        <Link href="/legal/privacy">Privacy Policy</Link> ·{' '}
        <Link href="/legal/cookies">Cookie Policy</Link>
      </p>
    </article>
  );
}
