import {EducationShell} from '../education/shell';
import {LearningLibrary} from '../education/library';
import {LearningTracks} from '../education/foundations';

export const metadata={
  title:'Learn Arduino coding, circuits & electronics | CircuitByte',
  description:'Free beginner lessons in electronics, basic circuits, Arduino coding, component specifications and DIY projects using CircuitByte parts.'
};

export default function Learn(){
  return <EducationShell>
    <section className="edu-hero">
      <div><p className="edu-kicker">THE CIRCUITBYTE LEARNING LAB</p>
        <h1>Learn the basics.<br/><em>Build with confidence.</em></h1>
        <p className="edu-lead">Start from zero with circuits and electronics, learn Arduino programming step by step, then discover what every component in the shop can do.</p>
        <div className="edu-actions"><a className="edu-button" href="#learning-paths">Start learning ↓</a><a href="/diy">Explore DIY projects ↗</a></div>
      </div>
      <aside className="edu-hero-note"><span>START WITH THE FUNDAMENTALS</span>
        <h2>Read → Connect<br/>→ Code → Test</h2>
        <p>Learn safely with guided low-voltage activities, connection maps, Arduino sketches, and simple check-your-understanding questions.</p>
        <div>14 beginner lessons · 101 part profiles · 13 complete builds</div>
      </aside>
    </section>
    <section className="edu-principles" aria-label="Three rules for safer learning">
      <div><b>01 / Voltage first</b><p>5 V and 3.3 V logic are not interchangeable.</p></div>
      <div><b>02 / Identify the variant</b><p>A chip datasheet and a breakout board can have different supply requirements.</p></div>
      <div><b>03 / Test what you build</b><p>Begin with low-voltage prototypes and compare your results with expected behavior.</p></div>
    </section>
    <LearningTracks/>
    <section id="component-library" aria-label="Component learning reference"><div className="edu-foundations-intro edu-section"><p className="edu-kicker">COMPONENT REFERENCE LIBRARY</p><h2>Explore the parts behind your projects</h2><p>Search specifications, applications and related guides for products from our live CircuitByte catalog.</p></div><LearningLibrary/></section>
  </EducationShell>;
}
