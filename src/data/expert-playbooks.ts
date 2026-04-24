export interface Playbook {
  tag: string;
  actionableInsight: string;
  whereToStart: string[];
  whatToResearch: string;
  theVision: string;
}

export const EXPERT_PLAYBOOKS: Record<string, Playbook> = {
  Consumer: {
    tag: "Consumer",
    actionableInsight: "The Indian consumer is graduating from 'price-conscious' to 'value-conscious'. The wedge is no longer discounting; it is specific, localized utility wrapped in high-trust packaging.",
    whereToStart: [
      "Identify a massive horizontal FMCG category dominated by a slow incumbent (e.g. skin creams, oral care).",
      "Narrow down to exactly ONE highly specific demographic that the incumbent ignores (e.g. Gen-Z men, post-partum mothers).",
      "Launch a single heroic SKU via Quick Commerce networks like Zepto and Blinkit to bypass regional distributor cartels."
    ],
    whatToResearch: "Analyze the top 50 search queries on Amazon India under the Beauty/Wellness category that yield 3-star average product reviews.",
    theVision: "To become the default 'House of Brands' for the next 200 million transacting Indian internet users, owning the direct relationship without renting it from Meta."
  },
  D2C: {
    tag: "D2C",
    actionableInsight: "Direct-to-Consumer requires treating content not as marketing overhead, but as an autonomous margin-generating business unit.",
    whereToStart: [
      "Do not build a Shopify store first. Build an audience first using organic vertical short-form video (Reels/Shorts).",
      "Spin up a WhatsApp-first checkout loop. The Indian D2C customer expects conversational commerce, not abstract cart drop-offs.",
      "Outsource 100% of manufacturing initially to Baddi-based contract manufacturers. Keep CapEx at zero while you validate the USP."
    ],
    whatToResearch: "Study 'WhatsApp Business API' cart recovery rates. Trace the supply chain of top local D2C brands via Zauba Corp import records.",
    theVision: "A natively digital conglomerate that acquires fragmented independent D2C players, plugging them into a centralized, hyper-efficient distribution and ad-buying engine."
  },
  Capital: {
    tag: "Capital",
    actionableInsight: "Only raise venture capital if your growth equation requires a linear scaling of highly defensible technology. Never raise to validate demand.",
    whereToStart: [
      "Determine your business model: Are you a cash-flow SME or a binary-outcome VC startup? Do not mix the playbooks.",
      "If raising: Cap your seed round dilution strictly at 15-20%. The cap table is your leverage.",
      "Identify operator-angels who can provide distribution networks rather than just writing checks."
    ],
    whatToResearch: "Model your capitalization table through a theoretical Series B. Read 'Venture Deals' and understand liquidation preferences.",
    theVision: "Creating an ecosystem where Indian founders utilize private equity and local debt creatively, breaking the cycle of foreign VC over-dilution."
  },
  RealEstate: {
    tag: "RealEstate",
    actionableInsight: "Pure residential plays are dead capital. The alpha exists strictly in commercial yield compression and fractionalized ownership models.",
    whereToStart: [
      "Target Tier-2 cities (Coimbatore, Indore) where IT talent is currently migrating due to remote infrastructure.",
      "Utilize SEBI's Fractional Ownership Platform (FOP) framework to syndicate commercial properties.",
      "Market exclusively to high-earning NRIs who want exposure to Indian infrastructure without managing tenants."
    ],
    whatToResearch: "Deep dive into local REIT regulations and the supply of Grade-A commercial office space in Tier-2 demographic hubs.",
    theVision: "Democratizing Grade-A commercial real estate access, dropping the barrier of entry from ₹5 Crores to ₹50,000 for the retail Indian investor."
  },
  AI: {
    tag: "AI",
    actionableInsight: "Do not build foundational LLMs. Build hyper-local, verticalized workflow agents that possess proprietary, culturally-nuanced context.",
    whereToStart: [
      "Identify deep vertical workflows currently bottlenecked by entry-level manual labor (e.g. Legal document parsing for Indian courts).",
      "Implement local open-source models (Llama 3) via RAG (Retrieval-Augmented Generation) trained specifically on internal company PDFs.",
      "Sell the implementation as a subscription service, not the software itself. Hand-holding is the real product."
    ],
    whatToResearch: "Evaluate the latency, token costs, and vernacular language benchmarks for fine-tuned open source models vs OpenAI APIs.",
    theVision: "Empowering every Indian SME with an autonomous agentic workforce, freeing human capital for creative and strategic scaling."
  },
  Content: {
    tag: "Content",
    actionableInsight: "The Creator Economy is a misnomer; it is the Trust Economy. Attention converts into equity, not just sponsorship revenue.",
    whereToStart: [
      "Lock down a hyper-specific niche. Don't be 'Finance', be 'Bootstrapped SaaS Financials'.",
      "Capture intent immediately by migrating algorithmic followers to owned channels like Substack or specialized Discord communities.",
      "Launch cohort-based education models or niche software tools once the community retention passes 6 months."
    ],
    whatToResearch: "Analyze the exact conversion funnels of top creators moving users from YouTube to paid SaaS ecosystems or premium newsletters.",
    theVision: "Transitioning top Indian creators from 'influencers renting attention' to fully-fledged software and holding-company CEOs."
  },
  Metaverse: {
    tag: "Metaverse",
    actionableInsight: "The hardware hasn't caught up, but the protocol shift has. Ignore VR headsets; focus on digital identity, verifiable ownership, and interoperable gaming assets.",
    whereToStart: [
      "Focus on the infrastructure layer that bridges Web2 databases with Web3 wallets.",
      "Target the massive Indian mobile gaming audience not with crypto, but with 'verifiable digital skins'.",
      "Build APIs that allow creators to cleanly mint and gate access to their content universally."
    ],
    whatToResearch: "Study Epic Games' Unreal engine integrations and the economics of secondary-market sales in gaming models.",
    theVision: "Creating the underlying verification layer for digital goods that serves the next billion users seamlessly without mentioning 'Blockchain'."
  }
};
