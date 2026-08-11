const fs = require('fs');
const path = require('path');
const os = require('os');
const { pathToFileURL } = require('url');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'sample-data', 'asterflow');
const HTML = path.join(OUT, 'html-source');
const BROWSER_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];

const esc = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

function bullets(items) {
  return `<ul>${items.map((item) => `<li>${item}</li>`).join('')}</ul>`;
}

function table(headers, rows) {
  return `<table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows
    .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`)
    .join('')}</tbody></table>`;
}

const documents = [
  {
    filename: '01_asterflow_company_knowledge_base.pdf',
    title: 'AsterFlow Technologies — Company Knowledge Base',
    subtitle: 'Authoritative organization context • Synthetic test company • Version 1.0 • 10 August 2026',
    audience: 'All organization personas',
    pages: [
      {
        title: 'Company identity and mission',
        html: `<p><b>Legal name:</b> AsterFlow Technologies Pvt. Ltd. <b>Trading name:</b> AsterFlow. <b>Founded:</b> 2022. <b>Headquarters:</b> Kathmandu, Nepal. <b>Regional office:</b> Singapore. <b>Employees:</b> 86. <b>Ownership:</b> Privately held.</p>
        <p>AsterFlow builds cloud software for field-service businesses that install, inspect, maintain, and repair equipment at customer locations. Its mission is: <i>make every field visit predictable, profitable, and easy to prove.</i></p>
        ${bullets([
          '<b>Primary market:</b> South Asia and Southeast Asia; English-language product and support.',
          '<b>Primary buyers:</b> COO, Head of Operations, Service Director, and CFO.',
          '<b>Primary users:</b> dispatchers, field technicians, service managers, inventory coordinators, and finance teams.',
          '<b>Core promise:</b> replace spreadsheets, chat groups, and disconnected tools with one operational record.',
          '<b>2026 theme:</b> profitable growth through faster implementation and measurable customer outcomes.'
        ])}`,
      },
      {
        title: 'Product portfolio',
        html: `${table(['Product', 'What it does', 'Primary users'], [
          ['AsterFlow Dispatch', 'Work-order intake, scheduling, drag-and-drop dispatch, route planning, technician mobile app, offline mode, proof of service.', 'Dispatchers and technicians'],
          ['AsterFlow AssetCare', 'Asset registry, service history, preventive-maintenance schedules, warranty tracking, QR labels, compliance checklists.', 'Service managers and technicians'],
          ['AsterFlow Insight', 'Operational dashboards, SLA alerts, job profitability, first-time-fix analysis, and scheduled exports.', 'Operations leaders and finance'],
          ['AsterFlow Connect', 'REST API, webhooks, SSO, and packaged connectors for common CRM and accounting systems.', 'IT and operations admins']
        ])}
        <p><b>Not offered:</b> payroll, full accounting, consumer delivery routing, general-purpose CRM, or hardware repair. Never promise these as native modules.</p>
        <p><b>Supported clients:</b> current Chrome, Edge, Safari, Android 10+, and iOS 16+. The mobile app supports offline job updates; changes sync when connectivity returns.</p>`,
      },
      {
        title: 'Ideal customer profile and segments',
        html: `${table(['Segment', 'Profile', 'Fit signal'], [
          ['Growth', '25–100 technicians; one or two countries; operations managed in spreadsheets or legacy desktop software.', 'Strong fit when missed appointments, manual dispatch, or weak asset history are visible.'],
          ['Scale', '101–500 technicians; multiple branches; formal SLAs; ERP or CRM integration required.', 'Strong fit when leadership needs standard processes and cross-branch reporting.'],
          ['Enterprise', '501–2,000 technicians; complex security, procurement, data, and rollout requirements.', 'Selective fit; requires solution review before commitments.']
        ])}
        <p><b>Priority industries:</b> commercial HVAC, solar installation and maintenance, medical-equipment service, facilities management, industrial equipment, and telecom field maintenance.</p>
        <p><b>Poor fit:</b> fewer than 10 technicians, last-mile consumer delivery, organizations requiring a fully on-premises deployment, or buyers seeking only GPS employee surveillance.</p>`,
      },
      {
        title: 'Positioning and value proposition',
        html: `<p><b>Positioning statement:</b> For multi-site service companies that need reliable field execution, AsterFlow is a field-service operations platform that connects dispatch, technicians, assets, customers, and performance data. Unlike spreadsheet workflows or generic CRMs, it provides an auditable service record and role-specific operational controls.</p>
        ${bullets([
          '<b>Predictability:</b> live workload visibility, SLA alerts, and preventive scheduling.',
          '<b>Productivity:</b> fewer manual handoffs and better route and skill matching.',
          '<b>Proof:</b> timestamped job events, photos, signatures, parts, forms, and asset history.',
          '<b>Profitability:</b> job-cost signals, fewer repeat visits, and faster invoice-ready completion.',
          '<b>Time to value:</b> standard Growth deployments target first live branch within 30 calendar days.'
        ])}
        <p>Approved short description: “AsterFlow helps field-service teams schedule work, guide technicians, maintain asset histories, and prove service outcomes from one platform.”</p>`,
      },
      {
        title: 'Plans and commercial baseline',
        html: `${table(['Plan', 'Annual list price', 'Included scope'], [
          ['Growth', 'USD 39 per active field user/month + USD 499 one-time onboarding', 'Dispatch, mobile, AssetCare essentials, standard dashboards; 20-user minimum.'],
          ['Scale', 'USD 69 per active field user/month + USD 2,500 implementation', 'Growth plus advanced workflows, Insight, API/webhooks, sandbox; 50-user minimum.'],
          ['Enterprise', 'Custom; starting reference USD 85 per active field user/month', 'Scale plus SSO, advanced audit, premium support, negotiated data terms; 200-user minimum.']
        ])}
        <p>All prices are synthetic test data, quoted in USD, exclude taxes, and assume annual billing. Monthly billing is available only for Growth at a 15% premium. Standard annual uplift is capped at 7% unless the order form says otherwise.</p>
        <p><b>Commercial authority:</b> Sales may offer up to 10% annual discount. 11–20% requires VP Sales approval. More than 20%, free custom development, unlimited liability, or non-standard uptime commitments require executive and legal approval.</p>`,
      },
      {
        title: 'Implementation and customer journey',
        html: `${table(['Phase', 'Typical timing', 'Exit condition'], [
          ['Discover', 'Days 1–5', 'Success outcomes, owners, scope, risks, and source data confirmed.'],
          ['Configure', 'Days 6–15', 'Roles, workflows, forms, SLAs, and integrations configured in sandbox.'],
          ['Validate', 'Days 16–22', 'Data sample accepted, supervisor UAT complete, critical issues resolved.'],
          ['Enable', 'Days 18–26', 'Admins and champions trained; technician communication approved.'],
          ['Go live', 'Target by day 30 for standard Growth', 'First branch actively dispatching and completing jobs.'],
          ['Adopt and expand', 'Days 31–90+', 'Usage and outcome reviews drive improvements and rollout.']
        ])}
        <p>Complex integrations, more than three source systems, custom security reviews, or multi-country rollouts require a separately agreed implementation plan. Never guarantee 30 days before discovery confirms standard scope.</p>`,
      },
      {
        title: 'Security, privacy, and reliability',
        html: `${bullets([
          '<b>Data hosting:</b> customer production data is hosted in AWS Singapore by default. Enterprise regional options require written confirmation.',
          '<b>Encryption:</b> TLS 1.2+ in transit and AES-256 at rest.',
          '<b>Access:</b> role-based access control; SSO/SAML is an Enterprise capability.',
          '<b>Backups:</b> encrypted daily backups with a 30-day retention period.',
          '<b>Availability target:</b> 99.9% monthly uptime for production services, excluding documented exclusions.',
          '<b>Privacy:</b> AsterFlow acts as processor for customer operational data; customer remains controller.',
          '<b>Retention:</b> production data is retained during the contract and deleted within 45 days after verified termination request, subject to legal obligations.',
          '<b>Security evidence:</b> share only approved documents through the controlled security-review process.'
        ])}
        <p><b>Guardrail:</b> This synthetic KB does not claim SOC 2, ISO 27001, HIPAA, or GDPR certification. State only documented controls; route certification questions to Security.</p>`,
      },
      {
        title: 'Support and service policy',
        html: `${table(['Severity', 'Definition', 'Initial response target'], [
          ['P1 Critical', 'Production unavailable for most users, active data-loss risk, or security incident.', '30 minutes, 24×7 for Premium Support; 1 business hour otherwise.'],
          ['P2 High', 'Major function unavailable with no reasonable workaround; significant operational impact.', '2 business hours.'],
          ['P3 Normal', 'Limited impact, workaround exists, or non-critical defect.', '1 business day.'],
          ['P4 Request', 'How-to question, enhancement idea, or cosmetic issue.', '2 business days.']
        ])}
        <p>Standard support hours are Monday–Friday, 09:00–18:00 Nepal Time, excluding published holidays. Premium Support includes 24×7 P1 intake and a named escalation manager. Support targets are response targets, not guaranteed resolution times.</p>
        <p>Official channels: in-app support portal and support@asterflow.example. Suspected security incidents must also be escalated to security@asterflow.example.</p>`,
      },
      {
        title: '2026 goals, metrics, and current challenges',
        html: `${bullets([
          '<b>Revenue goal:</b> grow annual recurring revenue from USD 4.2M to USD 6.5M by 31 December 2026.',
          '<b>Retention goal:</b> maintain gross revenue retention of at least 92% and net revenue retention of at least 108%.',
          '<b>Implementation goal:</b> reduce median time to first live branch from 42 to 28 days.',
          '<b>Adoption goal:</b> 75% of licensed field users active weekly by day 60.',
          '<b>Market goal:</b> establish repeatable acquisition in Indonesia and Malaysia without weakening Nepal and India service quality.'
        ])}
        <p><b>Current challenges:</b> inconsistent lead qualification, overly broad competitor claims, incomplete CRM handoffs, delayed customer data preparation, adoption gaps among supervisors, and renewal risk discovered too late.</p>
        <p><b>North-star customer outcome:</b> percentage of customers achieving at least two agreed operational outcomes within 90 days.</p>`,
      },
      {
        title: 'Governance, vocabulary, and source rules',
        html: `<p><b>Source priority:</b> signed order form → current policy or approved product documentation → this company KB → persona playbook → external web source. When sources conflict, disclose the conflict and use the higher-priority source.</p>
        ${bullets([
          '<b>Active field user:</b> a licensed worker who can receive or complete field jobs.',
          '<b>First-time-fix rate (FTFR):</b> jobs resolved without a repeat visit within 14 days.',
          '<b>Time to first live branch (TTFLB):</b> days from kickoff to first production branch completing jobs.',
          '<b>Adoption:</b> meaningful use of assigned workflows, not merely login count.',
          '<b>Customer health:</b> evidence-based risk and opportunity assessment; never a substitute for human judgment.',
          '<b>Confidentiality:</b> do not expose one customer’s pricing, data, roadmap, or security materials to another.'
        ])}
        <p>This is entirely fictional, safe synthetic test data. Names, prices, contacts, customers, and results are invented for software evaluation.</p>`,
      },
    ],
  },
  {
    filename: '02_sales_qualification_and_pipeline_playbook.pdf',
    title: 'AsterFlow Sales KB — Qualification & Pipeline Playbook',
    subtitle: 'Persona role: SALES • Owner: Revenue Enablement • Review cycle: Quarterly',
    audience: 'Sales persona',
    pages: [
      { title: 'Purpose and sales operating principles', html: `<p>The Sales persona helps representatives qualify fit, run structured discovery, advance deals, and create accurate handoffs. It must be commercially helpful without inventing product features, customer evidence, discounts, or legal positions.</p>${bullets(['Lead with the buyer’s operational problem, not a feature list.','Separate verified facts from assumptions; label missing discovery explicitly.','Use the company KB for product, pricing, security, and company claims.','Do not mark a stage complete without its evidence-based exit criteria.','Disqualifying a poor-fit opportunity early is a successful outcome.'])}` },
      { title: 'Qualification framework — FIELD', html: `${table(['Element','Questions','Positive evidence'],[['F — Friction','Where does work break today? What is the cost of missed SLAs, repeat visits, or manual coordination?','Quantified operational pain with an accountable owner.'],['I — Impact','Which metric must change and by how much?','Baseline plus target for FTFR, travel time, utilization, or invoice delay.'],['E — Environment','How many users, branches, countries, systems, and security requirements?','Scope fits supported deployment and integrations.'],['L — Leadership','Who owns the outcome, budget, security, and final decision?','Economic buyer and operational champion identified.'],['D — Decision','What are criteria, process, timeline, procurement steps, and competing options?','Mutual evaluation plan with dates and owners.']])}<p>Strong fit normally requires 25+ technicians, multi-step field work, a recognized operational pain, and a sponsor able to coordinate change.</p>` },
      { title: 'Pipeline stages and exit criteria', html: `${table(['Stage','Required evidence to exit'],[['1. New','Account profile and trigger recorded; obvious poor fits removed.'],['2. Discovery','Current workflow, pain, baseline metrics, stakeholders, scope, and decision process documented.'],['3. Solution fit','Relevant workflow demonstrated; gaps and dependencies recorded; technical review requested if needed.'],['4. Validation','Success criteria agreed; security/integration questions owned; pilot or proof plan approved when required.'],['5. Commercial','Configuration, quantities, term, pricing, approvals, procurement, and target signature date confirmed.'],['6. Commit','Final paper with buyer; no unresolved material blocker; implementation owner aware.'],['7. Closed won','Signed order form and handoff accepted by Customer Success.'],['Closed lost','Reason, competitor/status quo, evidence, and future trigger recorded.']])}` },
      { title: 'Discovery agenda and questions', html: `<p><b>Suggested 45-minute agenda:</b> context 5 min; current workflow 12 min; impact 10 min; desired future 8 min; decision process 5 min; next step 5 min.</p>${bullets(['Walk me through a job from request to invoice-ready completion.','Where do dispatchers and technicians re-enter information?','How are urgent jobs prioritized and SLA breaches detected today?','What percentage of jobs require a repeat visit within 14 days?','How long after field completion can Finance invoice?','Which systems must remain the source of truth?','What would supervisors and technicians resist about this change?','Who signs off on operations, security, finance, and procurement?','What must be true 90 days after kickoff for this to be called successful?'])}` },
      { title: 'CRM hygiene and CS handoff', html: `${bullets(['Record user count, branches, countries, workflows, integrations, data sources, timeline, and contractual exceptions.','Store baseline, target, owner, and measurement method for every promised outcome.','List named champion, executive sponsor, admin, security contact, procurement contact, and detractor if known.','Attach only approved final pricing and scope; label verbal discussion as non-binding.','Before Closed Won, schedule internal handoff and confirm CS acceptance.'])}<p><b>Minimum handoff:</b> business case; why now; purchased plan and users; promised outcomes; scope and exclusions; stakeholder map; risks; technical dependencies; decisions made; open actions; target kickoff and go-live. Never hide sales-stage risk from Customer Success.</p>` },
    ],
  },
  {
    filename: '03_sales_pricing_objections_and_competition.pdf',
    title: 'AsterFlow Sales KB — Pricing, Objections & Competition',
    subtitle: 'Persona role: SALES • Approved response guidance • Synthetic commercial data',
    audience: 'Sales persona',
    pages: [
      { title: 'Pricing application rules', html: `${table(['Scenario','Guidance'],[['Growth, annual','USD 39 per active field user/month; 20-user minimum; USD 499 onboarding.'],['Growth, monthly','15% premium; do not apply annual discount assumptions.'],['Scale, annual','USD 69 per active field user/month; 50-user minimum; USD 2,500 implementation.'],['Enterprise','Custom; reference starts at USD 85/user/month; 200-user minimum; solution review required.'],['Discount','0–10% Sales authority; 11–20% VP Sales; >20% executive and legal.']])}<p>Always state term, billing cadence, user definition, implementation, tax exclusion, and approval status. Never present an unapproved price as final.</p>` },
      { title: 'Common objections', html: `${table(['Objection','Recommended response'],[['“Spreadsheets are free.”','Acknowledge flexibility, then quantify coordination, missed SLA, repeat visit, audit, and reporting costs. Offer to compare total workflow cost.'],['“Technicians will not adopt it.”','Explore past change failures. Show offline mobile flow, champion model, supervisor enablement, and day-30/day-60 adoption measures.'],['“Your price is too high.”','Return to quantified outcomes and required scope. Trade scope, term, or timing before discount.'],['“We need every feature before launch.”','Separate critical go-live workflow from later optimization; propose phased rollout with explicit dependencies.'],['“Can you guarantee savings?”','No. Provide an assumption-based business case and measurement plan; customer outcomes depend on adoption and process change.']])}` },
      { title: 'Competitive context', html: `${table(['Alternative','Typical strength','AsterFlow angle','Do not claim'],[['Spreadsheets + chat','Flexible, familiar, low license cost.','Operational audit trail, controlled workflows, real-time dispatch, measurable outcomes.','That spreadsheets are insecure or always fail.'],['Generic CRM','Customer and pipeline record.','Purpose-built job, technician, asset, SLA, and proof-of-service workflows.','That AsterFlow replaces every CRM.'],['Legacy field-service suite','Deep mature functionality and installed base.','Faster standard deployment, modern mobile experience, focused regional enablement.','Universal lower cost or feature superiority.'],['Custom-built system','Exact initial fit and internal control.','Reduced maintenance burden, product roadmap, repeatable upgrades.','That custom software is always more expensive.']])}<p>No competitor trademark or named-vendor claim is approved in this synthetic dataset. Compare capabilities only after confirming current evidence.</p>` },
      { title: 'Negotiation give-get menu', html: `${table(['Customer request','Possible give','Required get'],[['Lower price','Within approval band','Longer term, annual prepay, higher committed user floor, or reduced scope.'],['Free pilot','Time-bound validation only when justified','Written success criteria, executive sponsor, data readiness, decision date.'],['Custom feature','Roadmap review; no promise','Validated business requirement and Product assessment.'],['Non-standard terms','Legal review','Clear business reason, redlines, and decision timeline.'],['Delayed start','Reserved kickoff subject to capacity','Signed order and agreed billing/start terms.']])}<p>Never trade away data protection, security controls, truthful claims, or implementation feasibility.</p>` },
      { title: 'Approval and escalation checklist', html: `${bullets(['Pricing beyond authority → VP Sales or executive approval.','Custom integration or workflow → Solutions and Product review.','Security questionnaire, pen-test evidence, or residency exception → Security.','DPA, liability, indemnity, governing law, or unusual termination → Legal.','Outcome guarantee, service credit, or uptime change → Legal plus executive approval.','Enterprise deployment plan → Customer Success/Implementation acceptance before signature.'])}<p>The Sales persona should answer: what is documented, what can be proposed, which assumption needs validation, and who must approve. It should not simulate an approval.</p>` },
    ],
  },
  {
    filename: '04_sales_roi_cases_and_demo_guidance.pdf',
    title: 'AsterFlow Sales KB — ROI, Customer Cases & Demo Guidance',
    subtitle: 'Persona role: SALES • Illustrative evidence • Do not represent as audited',
    audience: 'Sales persona',
    pages: [
      { title: 'Business-case model', html: `<p>Build a transparent annual model; keep inputs editable and show low/base/high scenarios.</p>${table(['Value lever','Illustrative formula'],[['Avoided repeat visits','Annual jobs × baseline repeat rate × expected reduction × cost per visit'],['Dispatcher capacity','Dispatchers × hours saved/week × loaded hourly cost × 48 weeks'],['Technician capacity','Technicians × productive hours gained/week × loaded hourly cost × 48 weeks'],['Faster invoicing','Invoice value affected × days reduced × customer cost-of-capital assumption'],['Avoided SLA penalties','Historical penalties × conservative avoidable percentage']])}<p>Subtract subscription, implementation, integration, internal project time, devices, and change-management cost. Do not count the same recovered hour as both cost saving and new revenue.</p>` },
      { title: 'Illustrative ROI example', html: `<p><b>Scenario:</b> 80 technicians, 30,000 jobs/year, 12% repeat-visit rate, USD 45 cost/visit, expected 20% reduction in repeats.</p><p>Avoided repeat-visit value = 30,000 × 12% × 20% × USD 45 = <b>USD 32,400/year</b>.</p><p>If four dispatchers each save five hours/week at USD 18/hour for 48 weeks, dispatcher capacity value = 4 × 5 × 18 × 48 = <b>USD 17,280/year</b>.</p><p>Total quantified benefit before other levers = USD 49,680. This is an illustration, not a forecast or guarantee. Validate baselines, achievable change, cost treatment, and adoption assumptions with the buyer.</p>` },
      { title: 'Synthetic customer story — SunPeak Solar Services', html: `<p>SunPeak is a fictional 120-technician solar maintenance provider operating across three regions. Before AsterFlow, dispatch used spreadsheets and technicians submitted photos in chat groups.</p>${bullets(['Challenge: 14% of jobs needed a repeat visit; asset history was difficult to retrieve.','Deployment: Scale plan, 126 users, two branches first, then third branch; first branch live in 37 days.','Adoption: 81% weekly active field users by day 60.','Observed at day 120: repeat-visit rate declined from 14% to 10.5%; median invoice-ready delay declined from 4.2 to 2.1 days.','Caveat: Results are synthetic, not audited, and cannot be generalized.'])}` },
      { title: 'Synthetic customer story — MediServe Equipment Care', html: `<p>MediServe is a fictional 55-technician medical-equipment maintenance company. Its priority was traceable preventive maintenance and signed service evidence.</p>${bullets(['Challenge: supervisors spent about 24 hours/week assembling compliance records.','Deployment: Growth plan plus structured forms; first branch live in 29 days.','Observed at day 90: 93% of completed jobs included required service evidence; supervisor reporting effort fell to about 9 hours/week.','Constraint: an accounting integration was deferred until after adoption stabilized.','Caveat: Results are synthetic, not audited, and should be presented only as an illustrative scenario.'])}` },
      { title: 'Demo design and next-step test', html: `${bullets(['Choose one buyer workflow and reflect their terminology; avoid an unfocused feature tour.','Start with the triggering event, follow dispatch → technician → proof → manager insight.','Show only configured or standard capabilities; identify mock data and future-state assumptions.','Pause after each outcome to confirm relevance and capture objections.','Close with a dated mutual action: validation, technical review, commercial review, or disqualification.'])}<p><b>Example proof question:</b> “If we can show that supervisors detect SLA risk before breach and technicians capture complete evidence offline, would that satisfy the operational part of your evaluation? What else must be proven?”</p>` },
    ],
  },
  {
    filename: '05_customer_success_onboarding_and_implementation.pdf',
    title: 'AsterFlow Customer Success KB — Onboarding & Implementation',
    subtitle: 'Persona role: CUSTOMER_SUCCESS_EXPERT • Owner: Customer Outcomes',
    audience: 'Customer Success persona',
    pages: [
      { title: 'Purpose and engagement model', html: `<p>The Customer Success persona turns purchased scope into measurable adoption and outcomes. It guides kickoff, implementation, change management, governance, and risk response. It does not rewrite contracts, promise unsupported features, or conceal delivery risk.</p>${bullets(['Begin with signed scope and sales handoff, then validate assumptions with the customer.','Define outcomes as baseline + target + owner + method + date.','Make data readiness and customer tasks visible.','Prefer a usable first workflow over an over-customized delayed launch.','Escalate scope, security, product, and commercial decisions to accountable humans.'])}` },
      { title: 'Kickoff checklist', html: `${table(['Area','Required kickoff output'],[['Outcomes','Two or three measurable outcomes and executive success statement.'],['Scope','Branches, users, workflows, forms, assets, integrations, exclusions.'],['People','Executive sponsor, operational owner, admin, champions, IT/security, data owner.'],['Plan','Milestones, dependency owners, meeting cadence, decision path, target go-live.'],['Data','Source inventory, templates, quality risks, sample and final delivery dates.'],['Change','Affected roles, likely resistance, communication, training, adoption measures.']])}<p>A kickoff is not complete when slides end; it is complete when owners, dates, decisions, and unknowns are recorded and acknowledged.</p>` },
      { title: 'Standard 30-day Growth plan', html: `${table(['Timing','AsterFlow responsibility','Customer responsibility'],[['Days 1–5','Confirm outcomes, scope, configuration, templates.','Provide owners, process decisions, data samples, user list.'],['Days 6–15','Configure roles, workflows, forms, SLAs; review data.','Review within two business days; resolve data errors.'],['Days 16–22','Support UAT and defect triage.','Run agreed scenarios; approve or record critical gaps.'],['Days 18–26','Train admins and champions; provide materials.','Attend, practice, and approve technician communication.'],['Days 27–30','Production readiness and go-live support.','Authorize launch and staff floor support.']])}<p>This is a target for standard scope, not a blanket guarantee. Rebaseline when customer dependencies or approved scope change.</p>` },
      { title: 'Data migration and UAT', html: `${bullets(['Minimum useful data: customers/sites, active assets, open work orders, users, skills, branches, and relevant SLA rules.','Validate unique identifiers, required fields, duplicates, date formats, ownership, and record counts.','Use a representative sample before full import; retain written acceptance evidence.','UAT must cover normal job, urgent job, offline completion, failed validation, reassignment, parts/evidence, and supervisor reporting.','Critical go-live defects block launch; workarounds for non-critical issues require owner and follow-up date.'])}<p>Customer Success coordinates the process; the customer owns source-data correctness and business-process decisions unless the contract states otherwise.</p>` },
      { title: 'Enablement and change plan', html: `${table(['Audience','Enablement focus','Evidence'],[['Admins','Configuration, access, audit, troubleshooting.','Can create user, change safe setting, and find logs.'],['Dispatchers','Intake, prioritization, assignment, exception handling.','Completes scenario without facilitator.'],['Technicians','Mobile workflow, offline behavior, evidence, sync.','Completes representative job correctly.'],['Supervisors','Queues, SLA risk, quality review, coaching.','Runs daily control routine.'],['Executives','Outcome dashboard, governance, decisions.','Agrees review cadence and metric owners.']])}<p>Measure behavior after training. Attendance is not adoption. Publish office hours and a champion escalation route for the first two weeks.</p>` },
    ],
  },
  {
    filename: '06_customer_success_health_support_and_escalation.pdf',
    title: 'AsterFlow Customer Success KB — Health, Support & Escalation',
    subtitle: 'Persona role: CUSTOMER_SUCCESS_EXPERT • Evidence-based risk management',
    audience: 'Customer Success persona',
    pages: [
      { title: 'Customer health framework', html: `${table(['Dimension','Weight','Evidence'],[['Outcomes','30%','Progress against agreed business metrics; executive confirmation.'],['Adoption','25%','Weekly active field users, workflow completion, key-feature depth.'],['Support experience','15%','Incident severity, recurrence, aging, sentiment.'],['Relationship','15%','Champion strength, sponsor engagement, stakeholder coverage.'],['Delivery & data','10%','Milestones, integration/data readiness, admin capacity.'],['Commercial','5%','Renewal timing, payment issues, contraction or expansion signal.']])}<p>Score each dimension 0–100 using evidence. Overall health is a prompt for judgment, not an automatic truth.</p>` },
      { title: 'Health bands and intervention', html: `${table(['Band','Definition','Required action'],[['Green 80–100','Outcomes on track; adoption and sponsorship healthy.','Document value, optimize, and explore relevant expansion.'],['Yellow 60–79','One material risk or several leading indicators weakening.','Create recovery actions with owners and dates; review weekly.'],['Red <60','Outcome, adoption, relationship, delivery, or commercial failure threatens continuation.','Open success recovery plan; executive alignment; cross-functional escalation.'],['Unknown','Insufficient or stale evidence.','Do not assume green; collect current data and stakeholder view.']])}<p>A single P1 incident, sponsor departure, explicit cancellation signal, or failed critical go-live may override the numerical band to Red.</p>` },
      { title: 'Support triage and communication', html: `${bullets(['Capture customer, environment, users affected, start time, business impact, reproduction, workaround, and evidence.','Use company severity definitions. Do not inflate severity to gain attention or downgrade impact without evidence.','For P1: acknowledge, establish incident channel, name coordinator, state known facts and next update time.','Never speculate about root cause or resolution time. Separate confirmed facts, active hypotheses, and next actions.','After resolution, confirm customer recovery and track any promised review.'])}<p>Customer Success owns relationship continuity; Support/Engineering owns technical diagnosis and fix. The persona should help route and communicate, not pretend to be incident commander unless assigned.</p>` },
      { title: 'Escalation paths', html: `${table(['Trigger','Route','CS responsibility'],[['P1/service outage','Support incident process + Engineering','Customer impact, stakeholders, update rhythm, recovery confirmation.'],['Security concern','Security immediately','Preserve exact report; avoid admission or speculation.'],['Data issue','Support + Engineering + customer data owner','Scope affected records and safe workaround.'],['Adoption risk','CS leader + customer operational owner','Recovery plan, champions, training/process action.'],['Scope/custom request','Solutions/Product; Sales if commercial','Clarify need and impact; avoid roadmap promise.'],['Renewal/legal/payment','Account owner + Finance/Legal','Facts, dates, customer intent; no unilateral concession.']])}` },
      { title: 'Success recovery plan', html: `<p>A recovery plan must include: executive problem statement; evidence; business impact; health band; desired recovered state; actions; owner; date; dependency; status; communication cadence; and decision deadline.</p>${bullets(['Stabilize immediate operational impact before long-term optimization.','Limit to the few actions most likely to change the outcome.','Include customer-owned actions; do not make AsterFlow the owner of customer decisions.','Record decisions and explicitly close completed or obsolete actions.','Exit Red only when leading evidence improves and stakeholders confirm recovery—not because a meeting occurred.'])}` },
    ],
  },
  {
    filename: '07_customer_success_adoption_renewal_and_expansion.pdf',
    title: 'AsterFlow Customer Success KB — Adoption, Renewal & Expansion',
    subtitle: 'Persona role: CUSTOMER_SUCCESS_EXPERT • Outcome-led lifecycle guidance',
    audience: 'Customer Success persona',
    pages: [
      { title: 'Adoption measures', html: `${table(['Measure','Definition','Day-60 target'],[['Weekly active field-user rate','Active field users completing meaningful work ÷ licensed field users.','75% or agreed customer target.'],['Workflow completion','Jobs completing required states and evidence ÷ eligible jobs.','At least 85%.'],['Supervisor control adoption','Branches running agreed daily/weekly review routine.','All live branches.'],['Data completeness','Required job/asset fields complete ÷ eligible records.','At least 90%.'],['Outcome instrumentation','Agreed outcomes with current baseline and measurement.','100% of priority outcomes.']])}<p>Segment measures by branch and role. Organization-wide averages can hide a failing branch.</p>` },
      { title: '30/60/90-day success rhythm', html: `${table(['Checkpoint','Focus','Outputs'],[['Day 30','Launch stability and behavior','Go-live review, defects, active users, training gaps, early wins.'],['Day 60','Adoption depth','Role/branch adoption, workflow completeness, recovery actions, outcome trend.'],['Day 90','Value and scale decision','Outcome review, executive narrative, optimization roadmap, expansion or stabilization plan.']])}<p>Use operational evidence plus stakeholder observation. Avoid claiming causal impact when external changes or incomplete baselines make attribution uncertain.</p>` },
      { title: 'Executive business review', html: `${bullets(['Restate original business priorities and what changed.','Show baseline, current value, target, date, source, and confidence for each outcome.','Explain adoption and operational drivers behind results.','Name risks and decisions directly; do not bury them in activity metrics.','Agree the next 90-day outcomes, owners, investments, and governance cadence.'])}<p>A good review answers: Are we achieving the intended outcomes? Why or why not? What will both organizations do next? It is not a product-usage slideshow.</p>` },
      { title: 'Renewal process', html: `${table(['Timing before renewal','Action'],[['180–120 days','Confirm contract facts, stakeholders, value evidence, health, risks, and procurement timeline.'],['120–90 days','Executive value review; open recovery plan for unresolved risk; identify scope changes.'],['90–60 days','Align proposed scope and commercials through account owner; complete security/procurement tasks.'],['60–30 days','Track paper process, approvals, signatures, and contingency actions.'],['After signature','Update entitlements, success plan, stakeholders, and next value milestones.']])}<p>Customer Success provides value and risk evidence. Sales/account owner controls commercial proposal. Never surprise the customer with unmentioned risk or the internal team with an unforecasted cancellation.</p>` },
      { title: 'Ethical expansion and advocacy', html: `${bullets(['Expand only when the added capability, users, or branch supports a validated customer outcome.','Check current adoption and delivery capacity before introducing new scope.','Document trigger, value hypothesis, stakeholders, timing, dependencies, and risk.','Do not tie support attention to purchase decisions or manufacture urgency.','Request references or case-study participation only after value is established; obtain explicit approval for every use.'])}<p><b>Persona distinction:</b> Sales optimizes fit and an accurate purchase decision. Customer Success optimizes realized value, adoption, retention, and responsible growth. The same question—“Should we add 50 users?”—therefore requires both commercial fit and readiness evidence.</p>` },
    ],
  },
];

function renderDocument(doc) {
  const pageCount = doc.pages.length;
  const pages = doc.pages.map((page, index) => `
    <section class="page">
      <header><span>ASTERFLOW / ${esc(doc.audience).toUpperCase()}</span><span>${index + 1} / ${pageCount}</span></header>
      ${index === 0 ? `<div class="document-title"><div class="eyebrow">KNOWLEDGE BASE DOCUMENT</div><h1>${esc(doc.title)}</h1><p>${esc(doc.subtitle)}</p></div>` : `<h1>${esc(doc.title)}</h1>`}
      <h2>${esc(page.title)}</h2>
      <main>${page.html}</main>
      <footer>Synthetic test data • AsterFlow Technologies • Generated 10 August 2026</footer>
    </section>`).join('\n');

  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(doc.title)}</title><style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #e9eef5; color: #182232; font-family: Arial, Helvetica, sans-serif; }
    .page { width: 210mm; height: 297mm; padding: 16mm 17mm 14mm; margin: 0 auto; background: white; position: relative; page-break-after: always; overflow: hidden; }
    .page:last-child { page-break-after: auto; }
    header { color: #53657a; border-bottom: 1px solid #cfdae7; padding-bottom: 3mm; display: flex; justify-content: space-between; font-size: 8.5pt; letter-spacing: .08em; }
    .document-title { margin: 13mm 0 9mm; padding: 8mm; color: white; background: linear-gradient(120deg, #163b66, #147d83); border-radius: 4mm; }
    .document-title h1 { color: white; margin: 2mm 0 3mm; font-size: 25pt; line-height: 1.13; }
    .document-title p { margin: 0; color: #d9f7f4; font-size: 10pt; }
    .eyebrow { font-size: 8pt; font-weight: bold; letter-spacing: .14em; color: #9be0d8; }
    h1 { color: #163b66; font-size: 10pt; margin: 6mm 0 2mm; }
    h2 { color: #0d6b72; font-size: 19pt; margin: 6mm 0 5mm; line-height: 1.15; }
    p, li, td, th { font-size: 10.2pt; line-height: 1.45; }
    p { margin: 0 0 4mm; }
    ul { margin: 2mm 0 5mm; padding-left: 6mm; }
    li { margin: 0 0 2.2mm; }
    table { width: 100%; border-collapse: collapse; margin: 2mm 0 5mm; table-layout: fixed; }
    th { background: #163b66; color: white; text-align: left; padding: 2.5mm; }
    td { border: 1px solid #ccd7e3; vertical-align: top; padding: 2.5mm; }
    tr:nth-child(even) td { background: #f3f7fa; }
    footer { position: absolute; left: 17mm; right: 17mm; bottom: 7mm; border-top: 1px solid #cfdae7; padding-top: 2mm; color: #6c7c8f; font-size: 8pt; }
    @media print { body { background: white; } .page { margin: 0; } }
  </style></head><body>${pages}</body></html>`;
}

function main() {
  fs.mkdirSync(HTML, { recursive: true });
  const browser = BROWSER_CANDIDATES.find(fs.existsSync);
  if (!browser) throw new Error('Microsoft Edge or Google Chrome is required to print PDFs.');
  const browserProfile = fs.mkdtempSync(path.join(os.tmpdir(), 'asterflow-pdf-'));

  try {
    for (const doc of documents) {
      const htmlPath = path.join(HTML, doc.filename.replace(/\.pdf$/i, '.html'));
      const pdfPath = path.join(OUT, doc.filename);
      fs.writeFileSync(htmlPath, renderDocument(doc), 'utf8');
      execFileSync(browser, [
        '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-software-rasterizer',
        '--disable-dev-shm-usage', `--user-data-dir=${browserProfile}`, '--no-pdf-header-footer',
        `--print-to-pdf=${pdfPath}`, pathToFileURL(htmlPath).href,
      ], { stdio: 'pipe' });
      if (!fs.existsSync(pdfPath)) throw new Error(`PDF was not created: ${pdfPath}`);
      console.log(`${doc.filename}: ${doc.pages.length} pages`);
    }
  } finally {
    fs.rmSync(browserProfile, { recursive: true, force: true });
  }
}

main();
