import { SurveyQuestion } from '@/types/survey';

const scale4 = (labels: [string, string, string, string]): SurveyQuestion['options'] =>
  labels.map((label, i) => ({ id: `o${i}`, label, score: i }));

export const surveyQuestions: SurveyQuestion[] = [
  // Financial Stability
  {
    id: 'q1',
    category: 'Financial Stability',
    weight: 1,
    text: 'How would you describe the vendor\'s revenue trend over the last 2 fiscal years?',
    options: scale4([
      'Consistently growing',
      'Stable, minor fluctuation',
      'Declining but manageable',
      'Sharply declining / distressed',
    ]),
  },
  {
    id: 'q2',
    category: 'Financial Stability',
    weight: 1,
    text: 'What is the vendor\'s current credit rating trend?',
    options: scale4([
      'Upgraded in last 12 months',
      'Stable, no change',
      'Watch/negative outlook issued',
      'Recently downgraded',
    ]),
  },

  // Operational Resilience
  {
    id: 'q3',
    category: 'Operational Resilience',
    weight: 1,
    text: 'Does the vendor have a documented business continuity / disaster recovery plan?',
    options: scale4([
      'Yes, tested within last 12 months',
      'Yes, but not recently tested',
      'In draft / partial',
      'No plan in place',
    ]),
  },
  {
    id: 'q4',
    category: 'Operational Resilience',
    weight: 1,
    text: 'How concentrated is the vendor\'s production across sites?',
    options: scale4([
      'Multiple redundant sites',
      'Two sites, some redundancy',
      'Single site, backup plan exists',
      'Single site, no backup plan',
    ]),
  },

  // Compliance & Regulatory
  {
    id: 'q5',
    category: 'Compliance & Regulatory',
    weight: 1.2,
    text: 'Has the vendor had any regulatory inspection findings in the last 24 months?',
    options: scale4([
      'No findings',
      'Minor observations, closed out',
      'Open observations, in remediation',
      'Major finding / regulatory action',
    ]),
  },
  {
    id: 'q6',
    category: 'Compliance & Regulatory',
    weight: 1,
    text: 'Does the vendor operate in a jurisdiction with active sanctions or export-control exposure?',
    options: scale4([
      'No exposure',
      'Indirect / low exposure',
      'Some exposure, monitored',
      'Direct, significant exposure',
    ]),
  },

  // Reputational & ESG
  {
    id: 'q7',
    category: 'Reputational & ESG',
    weight: 0.8,
    text: 'Has the vendor been the subject of adverse media coverage in the last 12 months?',
    options: scale4([
      'None found',
      'Minor / isolated mentions',
      'Recurring negative coverage',
      'Major scandal or investigation',
    ]),
  },
  {
    id: 'q8',
    category: 'Reputational & ESG',
    weight: 0.8,
    text: 'Does the vendor have a published ESG / sustainability policy?',
    options: scale4([
      'Yes, third-party certified',
      'Yes, self-published',
      'In progress',
      'No policy',
    ]),
  },

  // Cybersecurity
  {
    id: 'q9',
    category: 'Cybersecurity',
    weight: 1,
    text: 'Does the vendor hold a current information security certification (e.g. ISO 27001, SOC 2)?',
    options: scale4([
      'Yes, current and audited',
      'Yes, but expiring soon',
      'In progress',
      'No certification',
    ]),
  },
  {
    id: 'q10',
    category: 'Cybersecurity',
    weight: 1,
    text: 'Has the vendor disclosed any data breach or security incident in the last 24 months?',
    options: scale4([
      'None',
      'Minor incident, contained',
      'Moderate incident, some data exposed',
      'Major breach, significant data exposed',
    ]),
  },
];
