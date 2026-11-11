import {EducationShell} from '../education/shell';
import './privacy.css';

export const metadata={
 title:'Privacy Notice | CircuitByte',
 description:'How CircuitByte handles personal data for accounts, orders, deliveries, payments and Project Studio.'
};

export default function PrivacyNotice(){
 return <EducationShell active="privacy"><article className="privacy-notice">
  <header>
   <h1>CircuitByte Privacy Notice</h1>
   <p>CircuitByte, based in Roxas City, Capiz, manages the personal data used to run the CircuitByte Shop and Project Studio. This notice explains how we handle your data and how to exercise your rights under the Philippine Data Privacy Act of 2012.</p>
   <p><a href="https://privacy.gov.ph/data-privacy-act-/">Read Republic Act No. 10173 at the National Privacy Commission</a></p>
  </header>
  <section>
   <h2>What we collect and why</h2>
   <ul>
    <li><strong>Account.</strong> Your name, email, and a hashed password support registration, verification, and sign-in. Session cookies keep you signed in.</li>
    <li><strong>Orders.</strong> Your order, contact number, meetup point or delivery address, and instructions let us process the purchase and arrange handover. We use your transfer reference to verify QR payments and optional billing details to prepare your invoice.</li>
    <li><strong>Studio.</strong> We use the projects you save, account profile details you choose to supply, and service usage records to provide Studio features. Public school listings require opt-in and review.</li>
    <li><strong>Website operation.</strong> We use request and security records to investigate errors and protect accounts and orders. Your browser can store your cart, Studio drafts, and a private tracking code.</li>
   </ul>
   <p>We process the information needed to provide the account, order or Studio service you request, protect those services, and meet applicable recordkeeping obligations.</p>
  </section>
  <section>
   <h2>Who receives your information</h2>
   <p>CircuitByte uses hosting, database, and email service providers to operate the website and send service messages. If you request Maxim delivery, CircuitByte shares only the name, contact number, drop-off address, and directions needed for the handover with the delivery provider or rider.</p>
   <p>QR Ph transfers take place in your bank or wallet and are received through Peddlr Kankolek. CircuitByte uses the transfer reference to match the payment to your order. Enter banking credentials only in your bank or wallet.</p>
  </section>
  <section>
   <h2>Access and retention</h2>
   <p>Full order details are available to the signed-in customer and authorized CircuitByte staff. A private tracking code shows the order reference, status, and last update time. Payment instructions and delivery addresses are available in the signed-in order view.</p>
   <p>We keep account and saved-project data while your account exists. We keep order, invoice, and payment records as needed for fulfillment, dispute handling, and applicable recordkeeping. You can ask CircuitByte about the retention period for a specific record or request removal where applicable.</p>
  </section>
  <section>
   <h2>Your privacy rights</h2>
   <p>You may ask about how your data is used, request access or corrections, object to certain processing, request erasure or blocking where applicable, and exercise your other rights under the Act. To make a request, send a private message to the CircuitByte page and ask for the privacy contact. Include your order reference if relevant. We may verify your identity before releasing or changing records.</p>
   <p><a href="https://www.facebook.com/circuitbyteph" target="_blank" rel="noopener noreferrer">Message CircuitByte about privacy</a> · <a href="https://privacy.gov.ph/data-subject-rights/">National Privacy Commission data subject rights</a></p>
  </section>
 </article></EducationShell>;
}
