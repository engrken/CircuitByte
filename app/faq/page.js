import {EducationShell} from '../education/shell';
import './faq.css';

export const metadata={
 title:'Frequently asked questions | CircuitByte',
 description:'Help with CircuitByte orders, warranty and replacement, payments, accounts, and Project Studio.'
};

const groups=[
 {id:'account',title:'Account',questions:[
  ['Can I use one account for Shop and Studio?',<>Yes. <a href="/dashboard?register=1">Create a CircuitByte account</a>, then request a verification link or six-digit code in My Dashboard. Once verified, you can place orders and use Project Studio.</>],
  ['What if my verification link or code expires?',<>Sign in to <a href="/dashboard">My Dashboard</a> and request a new link or code. Check your spam folder if the email is delayed. Open verification links while signed in to the account that requested them.</>]
 ]},
 {id:'orders',title:'Orders and handover',questions:[
  ['How do I order components?',<>Add parts and any required variants to your cart. Sign in with a verified account, choose a payment method, and submit your order. We email an order confirmation. You can also buy components from the parts list in <a href="/studio">Project Studio</a>.</>],
  ['Where can I receive my order?',<>Choose a meetup or Maxim door-to-door delivery in Roxas City, or request LBC shipping to a supported address in the Philippines. LBC’s shipping charge is quoted separately based on the destination and parcel details and is paid by the buyer. CircuitByte confirms the shipping quote and payment arrangement before dispatch. The buyer pays a Maxim fee unless a free Maxim promotion applies.</>],
  ['How do I use a promo code?',<>Enter the code in your Shop cart and select <strong>Apply</strong> before placing the order. You can use one valid code per order. Checkout shows the discount, free gift, or covered Maxim delivery when the cart qualifies.</>],
  ['Where do I track an order?',<>Open <a href="/dashboard">My Dashboard</a> and look under <strong>My orders</strong> for progress, handover details, and invoice references. If you have a private tracking link from an earlier order, use the <a href="/track.html">tracking page</a> to see the order reference and status.</>],
  ['How do I change or cancel an order?',<>Message the <a href="https://www.facebook.com/circuitbyteph" target="_blank" rel="noopener noreferrer">CircuitByte page</a> with your order reference. Include the requested change and whether you have already paid.</>]
 ]},
 {id:'warranty',title:'Warranty and replacement',questions:[
  ['What is the Shop warranty?',<>All products sold by CircuitByte come with a <strong>3-day warranty and replacement for defects</strong>. The three days start when you receive the product, whether by pickup or delivery. Your rights under Philippine consumer law also apply.</>],
  ['How do I request a replacement?',<>Message the <a href="https://www.facebook.com/circuitbyteph" target="_blank" rel="noopener noreferrer">CircuitByte Facebook page</a> with your order reference, the product name, and a short description of the defect. You can find your order reference in <a href="/dashboard">My Dashboard</a>.</>]
 ]},
 {id:'payments',title:'Payments and invoices',questions:[
  ['How do I pay with QR Ph?',<>Select <strong>QR Ph</strong> at checkout. After CircuitByte checks stock and opens payment, open the order in <a href="/dashboard">My Dashboard</a> and select <strong>Pay with QR Ph</strong>. Scan or save the code, pay the items total plus the applicable Kolek fee shown with the QR, and submit the transfer reference from your banking or wallet app.</>],
  ['When is my QR Ph order confirmed?',<>CircuitByte holds the items while payment is open. Once the shop matches the transfer to the payment received in Peddlr Kankolek, the order moves to <strong>Confirmed</strong> and the stock reservation is finalized.</>],
  ['Can I pay in cash?',<>Choose <strong>Cash at handover</strong> for meetup. For Maxim delivery, CircuitByte confirms how the items will be paid before dispatch.</>],
  ['When will I receive my invoice?',<>CircuitByte issues your order invoice when the order is marked <strong>Completed</strong> and emails it to the address on file. You can add billing details at checkout and see the invoice reference in My Orders.</>]
 ]},
 {id:'studio',title:'Project Studio and learning',questions:[
  ['What can I do in Studio?',<>Use <a href="/studio">Project Studio</a> to explore guided projects, draft Arduino sketches, review wiring, and preview supported circuits. See <a href="/studio/pricing">Studio access and allowances</a> for the current cloud features.</>],
  ['Can I pay for Studio project parts with QR Ph?',<>Yes. Add available components from the Studio parts list, then choose <strong>Checkout with QR Ph</strong>. This pays for the components in your cart. The Student / Hobby UAT is free during its published dates.</>]
 ]}
];

export default function Faq(){
 return <EducationShell active="faq">
  <section className="faq-page">
   <header><h1>Frequently asked questions</h1><p>Help with your CircuitByte account, orders, payments, and Project Studio.</p></header>
   <nav aria-label="FAQ topics">{groups.map(group=><a href={'#'+group.id} key={group.id}>{group.title}</a>)}</nav>
   {groups.map(group=><section className="faq-group" id={group.id} key={group.id}>
    <h2>{group.title}</h2>
    {group.questions.map(([question,answer])=><details key={question} open={group.id==='warranty'}><summary>{question}</summary><p>{answer}</p></details>)}
   </section>)}
   <section className="faq-contact"><h2>Need help with something else?</h2><p>For order or payment issues, include your order reference.</p>
    <a className="edu-button" href="https://www.facebook.com/circuitbyteph" target="_blank" rel="noopener noreferrer">Message the CircuitByte page ↗</a>
   </section>
  </section>
 </EducationShell>;
}
