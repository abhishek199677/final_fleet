import type { Metadata } from 'next';
import Link from 'next/link';
import { BUSINESS, POLICY_LAST_UPDATED } from '@/lib/site-info';

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description:
    'The cookies and local storage Fleet OS uses, which are strictly necessary, and how to change your choice.',
};

const FIRST_PARTY_COOKIES = [
  {
    name: 'fleetos_cookie_consent',
    purpose:
      'Remembers your cookie choice (necessary only, or analytics allowed) so we do not ask again.',
    type: 'Preference — strictly necessary',
    duration: '180 days',
  },
  {
    name: 'sidebar_state',
    purpose: 'Remembers whether the signed-in sidebar is expanded or collapsed.',
    type: 'Functionality — strictly necessary',
    duration: '7 days',
  },
];

const LOCAL_STORAGE = [
  {
    name: 'fleetos_token',
    purpose: 'Keeps you signed in between visits. Held in local storage, not sent with every request.',
    duration: 'Until you sign out',
  },
  {
    name: 'fleetos_dark',
    purpose: 'Remembers your light or dark appearance choice.',
    duration: 'Until you clear it',
  },
  {
    name: 'fleetos_locale',
    purpose: 'Remembers your language and reading direction.',
    duration: 'Until you clear it',
  },
];

export default function CookiePolicyPage() {
  return (
    <article>
      <h1>Cookie Policy</h1>
      <p className="lead">Last updated: {POLICY_LAST_UPDATED}</p>

      <p>
        This Cookie Policy explains what cookies and similar browser storage{' '}
        {BUSINESS.legalName} uses on {BUSINESS.productName}, why they exist, and how you stay in
        control of them. It should be read with our <Link href="/legal/privacy">Privacy Policy</Link>
        .
      </p>

      <h2>1. What cookies are</h2>
      <p>
        Cookies are small text files a website asks your browser to keep. Similar technologies
        include local storage, which keeps data in your browser without sending it back to us on
        every request. Both can remember your choices between pages and visits.
      </p>

      <h2>2. Our position in one line</h2>
      <p>
        Fleet OS runs no analytics, advertising or social-media tracking. The cookies we set are
        there so the product works as you asked it to.
      </p>

      <h2>3. Cookies we set</h2>
      <div className="overflow-x-auto">
        <table>
          <caption className="sr-only">Cookies set by Fleet OS</caption>
          <thead>
          <tr>
            <th scope="col">Cookie</th>
            <th scope="col">What it does</th>
            <th scope="col">Category</th>
            <th scope="col">How long</th>
          </tr>
        </thead>
        <tbody>
          {FIRST_PARTY_COOKIES.map((cookie) => (
            <tr key={cookie.name}>
              <td>
                <code>{cookie.name}</code>
              </td>
              <td>{cookie.purpose}</td>
              <td>{cookie.type}</td>
              <td>{cookie.duration}</td>
            </tr>
          ))}
          </tbody>
        </table>
      </div>
      <p>
        Strictly necessary cookies are exempt from consent in most jurisdictions because the
        service cannot work without them. Our hosting provider may also set cookies that are
        strictly necessary to deliver and protect the site itself.
      </p>

      <h2>4. Browser storage we use</h2>
      <div className="overflow-x-auto">
        <table>
          <caption className="sr-only">Browser local-storage keys used by Fleet OS</caption>
          <thead>
            <tr>
              <th scope="col">Key</th>
              <th scope="col">What it does</th>
              <th scope="col">How long</th>
            </tr>
          </thead>
          <tbody>
            {LOCAL_STORAGE.map((entry) => (
              <tr key={entry.name}>
                <td>
                  <code>{entry.name}</code>
                </td>
                <td>{entry.purpose}</td>
                <td>{entry.duration}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>5. Analytics and advertising</h2>
      <p>
        None. At the time of writing Fleet OS loads no analytics or advertising scripts and sets no
        tracking cookies, so there is nothing to reject. If we add analytics later, they will be
        listed here, they will stay disabled by default, and they will only switch on if you tick
        &ldquo;Analytics and measurement&rdquo; in the consent banner.
      </p>

      <h2>6. Third-party content</h2>
      <p>
        Some pages fetch graphics and 3D assets from public content delivery networks, and the
        signed-in home screen may load a 3D scene from its author&apos;s CDN. When your browser
        fetches one of those files it connects directly to that provider, which sees your IP address
        and browser details. Those providers are not permitted to use the asset request to identify
        you, and we do not receive analytics from them.
      </p>
      <p>
        Optional messaging and OCR features also connect to their providers when switched on — see
        the <Link href="/legal/privacy">Privacy Policy</Link>.
      </p>

      <h2>7. How to control cookies</h2>
      <ul>
        <li>
          Use the <strong>Cookie preferences</strong> link in the footer of any page to change or
          withdraw your choice at any time.
        </li>
        <li>
          Most browsers let you block or delete cookies in their settings. Blocking strictly
          necessary cookies will sign you out and stop preferences being remembered.
        </li>
        <li>
          Clearing local storage removes your sign-in token, theme and language choices — you will
          need to sign in again.
        </li>
      </ul>

      <h2>8. Changes</h2>
      <p>
        We will update this policy if the cookies we use change, and we will ask for your choice
        again when a new optional category is introduced.
      </p>

      <h2>9. Contact</h2>
      <p>
        Questions about cookies or privacy go to {BUSINESS.privacyContact}.
      </p>
      <p>
        Related documents:{' '}
        <Link href="/legal/privacy">Privacy Policy</Link> ·{' '}
        <Link href="/legal/terms">Terms and Conditions</Link> ·{' '}
        <Link href="/legal/refund">Refund Policy</Link>
      </p>
    </article>
  );
}
