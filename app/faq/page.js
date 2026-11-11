import {EducationShell} from '../education/shell';
import './faq.css';

export const metadata={
 title:'Frequently asked questions | CircuitByte',
 description:'Help with CircuitByte accounts, shopping, QR Ph payments, order tracking, invoices, and Project Studio.'
};

const groups=[
 {id:'account',title:'Account',questions:[
  ['Can I use one account for Shop and Studio?',<>Yes. <a href="/dashboard?register=1">Create a CircuitByte account</a>, verify your email with the six-digit registration code, then use that email and password to sign in to both.</>],
  ['What if the email code expires or I forget my password?',<>From <a href="/dashboard">My Dashboard</a>, choose <strong>Enter a registration code</strong> to request another code, or use the password link to reset your password. Check your spam folder if the email is delayed.</>]
 ]},
 {id:'orders',title:'Orders and handover',questions:[
  ['How do I order components?',<>Add parts and any required variants to your cart, sign in, choose a payment method, and submit your order. We email an order confirmation. You can also buy components from the parts list in <a href="/studio">Project Studio</a>.</>],
  ['Where can I receive my order?',<>Propose a meetup point within Roxas City, Capiz at checkout. CircuitByte will confirm the exact handover location and schedule.</>],
  ['Where do I track an order?',<>Open <a href="/dashboard">My Dashboard</a> and look under <strong>My orders</strong> for progress, handover details, and invoice references. If you have a private tracking link from an earlier order, you can still use the <a href="/track.html">tracking page</a>.</>],
  ['How do I change or cancel an order?',<>Message the <a href="https://www.facebook.com/circuitbyteph" target="_blank" rel="noopener noreferrer">CircuitByte page</a> with your order reference. Include the requested change and whether you have already paid.</>]
 ]},
 {id:'payments',title:'Payments and invoices',questions:[
  ['How do I pay with QR Ph?',<>Select <strong>QR Ph</strong> at checkout. After CircuitByte checks stock and opens payment, open the order in <a href="/dashboard">My Dashboard</a> and select <strong>Pay with QR Ph</strong>. Check the amount and recipient, scan or save the code, and submit the transfer reference from your banking or wallet app.</>],
  ['When is my QR Ph order confirmed?',<>CircuitByte holds the items while payment is open. Once the shop matches the transfer to the payment received, the order moves to <strong>Confirmed</strong> and the stock reservation is finalized.</>],
  ['Can I pay in cash?',<>Yes. Choose <strong>Cash on delivery / at meetup</strong> and pay when you receive your components.</>],
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
    {group.questions.map(([question,answer])=><details key={question}><summary>{question}</summary><p>{answer}</p></details>)}
   </section>)}
   <section className="faq-contact"><h2>Need help with something else?</h2><p>For order or payment issues, include your order reference.</p>
    <a className="edu-button" href="https://www.facebook.com/circuitbyteph" target="_blank" rel="noopener noreferrer">Message the CircuitByte page ↗</a>
   </section>
  </section>
 </EducationShell>;
}
