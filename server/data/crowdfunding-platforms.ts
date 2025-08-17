// C.A.R.E.N. Crowdfunding and Investment Platform Data
export const crowdfundingPlatforms = [
  {
    id: 'startengine',
    name: 'StartEngine',
    type: 'equity',
    description: 'Leading equity crowdfunding platform for U.S. startups. Enables non-accredited investors to purchase shares under Reg CF or Reg A+',
    maxRaise: '$50M (Reg A+), $1.07M (Reg CF)',
    features: ['Control over offering', 'Quick fund access after $10K', 'Non-accredited investors'],
    website: 'https://startengine.com',
    fit: 'Excellent for C.A.R.E.N. community-driven equity raises'
  },
  {
    id: 'wefunder',
    name: 'Wefunder',
    type: 'equity',
    description: 'Equity crowdfunding platform supporting unaccredited investors in early-stage startups under the JOBS Act',
    features: ['Community-driven investment rounds', 'JOBS Act compliance', 'Early-stage focus'],
    website: 'https://wefunder.com',
    fit: 'Perfect for C.A.R.E.N. mission-aligned community funding'
  },
  {
    id: 'indiegogo',
    name: 'Indiegogo',
    type: 'rewards',
    description: 'Reward-based crowdfunding with global reach, perfect for hardware and tech products',
    fees: '5% platform fee plus payment processing',
    features: ['Hardware campaign support', 'Flexible funding models', 'Global reach'],
    website: 'https://indiegogo.com',
    fit: 'Ideal for pre-selling C.A.R.E.N. Units and building user interest'
  },
  {
    id: 'microventures',
    name: 'MicroVentures',
    type: 'equity',
    description: 'FINRA-registered brokerage equity crowdfunding site accepting accredited and qualified non-accredited investors',
    averageRaise: '$250K',
    features: ['FINRA registered', 'Both accredited and non-accredited', 'Established platform'],
    website: 'https://microventures.com',
    fit: 'Good for structured equity raises with regulatory compliance'
  }
];

export const impactInvestorNetworks = [
  {
    id: 'black-angel-group',
    name: 'Black Angel Group (BAG)',
    type: 'angel',
    description: 'Angel collective investing from seed to Series A, focusing on scalable and impactful ventures',
    stage: 'Seed to Series A',
    focus: ['Scalable ventures', 'Impact-driven', 'Diverse founders'],
    website: 'https://blackangelgroup.com',
    fit: 'Strong alignment with C.A.R.E.N. social justice mission'
  },
  {
    id: 'swan-impact',
    name: 'SWAN Impact Network',
    type: 'impact',
    description: 'Early-stage impact investor network prioritizing startups with measurable societal/environmental benefits',
    focus: ['Societal benefits', 'Environmental impact', 'Measurable outcomes'],
    website: 'https://swanimpactnetwork.com',
    fit: 'Excellent fit for C.A.R.E.N. public safety and justice mission'
  }
];

export const vcFirms = [
  {
    id: 'andreessen-horowitz',
    name: 'Andreessen Horowitz',
    type: 'vc',
    description: 'Leading VC firm backing AI-enabled incident-response and transparency tools',
    focus: ['AI technology', 'Public safety tech', 'Transparency tools'],
    recentActivity: 'Investing in safety and law enforcement tech ($990M in 2025)',
    website: 'https://a16z.com',
    fit: 'Prime target for C.A.R.E.N. AI safety technology'
  },
  {
    id: 'sequoia-capital',
    name: 'Sequoia Capital',
    type: 'vc',
    description: 'Top-tier VC firm with interest in public safety and mobility solutions',
    focus: ['Mobility solutions', 'Public safety', 'Scalable technology'],
    website: 'https://sequoiacap.com',
    fit: 'Strategic partner for scaling C.A.R.E.N. nationally'
  },
  {
    id: 'eniac-ventures',
    name: 'Eniac Ventures',
    type: 'vc',
    description: 'Early-stage VC focused on mobile and internet technologies',
    focus: ['Mobile technology', 'Internet platforms', 'Early-stage'],
    website: 'https://eniac.vc',
    fit: 'Good fit for C.A.R.E.N. mobile platform development'
  }
];

export const businessCapitalSources = [
  {
    id: 'america-business-capital',
    name: 'America Business Capital',
    type: 'lending',
    description: 'Business lending and capital solutions for growing companies',
    website: 'https://americabusinesscapital.com',
    services: ['Business loans', 'Equipment financing', 'Working capital', 'SBA loans'],
    fit: 'Alternative funding source for C.A.R.E.N. operations and equipment'
  }
];

export const carenFundingStrategy = {
  seedRound: {
    goal: '$500,000',
    breakdown: {
      hardwareRD: '$200,000',
      appDevelopmentAI: '$150,000',
      legalCompliance: '$50,000',
      marketingOutreach: '$100,000'
    }
  },
  platforms: {
    phase1: ['Wefunder', 'StartEngine', 'Indiegogo'],
    phase2: ['SWAN Impact Network', 'Black Angel Group'],
    phase3: ['Andreessen Horowitz', 'Sequoia Capital']
  },
  marketOpportunity: {
    industry: 'Public safety & roadside assistance',
    size: '$15B+',
    tam: '230M licensed drivers in the U.S.',
    growth: 'U.S. venture investment in safety tech nearly doubled to $990M in 2025'
  }
};

export const campaignProfile = {
  title: 'C.A.R.E.N. — Roadside Safety Powered by AI & Community Trust',
  tagline: 'Protecting motorists. Recording truth. Empowering communities.',
  overview: `C.A.R.E.N. (Citizen Assistance for Roadside Emergencies and Navigation) is a groundbreaking mobile + hardware platform designed to safeguard motorists during one of the most vulnerable times of their lives—roadside encounters with police, breakdowns, and emergencies.

With real-time recording, multilingual support, GPS tracking, attorney directories, and our proprietary C.A.R.E.N. Unit in-car device, we deliver unmatched security and legal protection.`,
  
  whyNow: [
    'Roadside safety is a $15B+ industry (insurance, legal, tech)',
    'Public demand for transparency and accountability is at an all-time high',
    'U.S. venture investment in public-safety tech nearly doubled in 2025 to $990M'
  ],
  
  rewardTiers: [
    { amount: 100, reward: 'Early Access Beta Membership' },
    { amount: 250, reward: 'C.A.R.E.N. Founder Backer T-Shirt + Beta App' },
    { amount: 500, reward: 'Pre-order of C.A.R.E.N. Unit Device' },
    { amount: 1000, reward: 'Lifetime Premium App Access + Hardware' },
    { amount: 5000, reward: 'Investor Circle Invite' }
  ]
};