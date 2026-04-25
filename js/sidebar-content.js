// ============================================================
// sidebar-content.js — Context-sensitive right sidebar content
// Maps page IDs to arrays of slide objects (4 slides per section).
// ============================================================

const SIDEBAR_CONTENT = {

  home: [
    {
      title: "What Is Controlled Convergence?",
      body: `Controlled Convergence is a structured method for making design decisions. It takes you from a fuzzy project idea to a defensible, well-reasoned concept choice — step by step. Each stage builds on the last: you define what success looks like, identify who cares, translate that into measurable requirements, and then score competing design concepts against those requirements. The result isn't just a selection — it's a selection you can explain and defend.`
    },
    {
      title: "How to Navigate This Tool",
      body: `Work through the steps in order using the Tools menu at the top. Each step feeds into the next, so skipping ahead makes later steps harder. Start with Goal Statement and work your way to Convergence Summary. You can return to earlier steps to revise at any time — your work saves automatically when you're logged in. The ⓘ icons throughout each page open explanations for that specific topic.`
    },
    {
      title: "Common Mistakes to Avoid",
      body: `The most common mistake is jumping straight to concept selection without doing the earlier steps carefully. If your requirements are vague or your weightings are arbitrary, the Pugh Matrix just reflects your existing biases back at you. The quality of your final decision is made in the goal statement and requirements — those early steps deserve your real attention.`
    },
    {
      title: "Where to Begin",
      body: `Start with the Goal Statement. It's a single sentence that defines what your project needs to accomplish — everything else flows from it. If you haven't set up a project yet, go to Project Manager first.`
    },
  ],

  proj: [
    {
      title: "What Is a Project?",
      body: `A project is the container for all your work. There are two types: <strong>Quick Projects</strong> put the entire analysis on a single page so you can move fast with minimal setup — good for early exploration or time-limited situations. <strong>Full Projects</strong> walk you through the complete step-by-step workflow — goal statement, stakeholders, ilities, requirements, weighting, concept scoring, and the Pugh Matrix. Quick Projects can be converted to Full Projects, so you won't lose any work if you start simple and want to go deeper.`
    },
    {
      title: "How to Create a Project",
      body: `Navigate to Project Manager and start a Quick or Full Project, give it a name that reflects the design challenge you're solving. Your new project becomes the active project and its name appears in the top navigation bar. From here, head to Goal Statement to start defining what you're trying to accomplish.`
    },
    {
      title: "Common Mistakes",
      body: `Don't name your project after a solution — "Electric Bicycle Project" is a solution, not a challenge. A better name describes the problem space: "Urban Cargo Commuting" or "Last-Mile Delivery for Cyclists." Naming it after a solution biases your thinking before you've even started.`
    },
    {
      title: "What's Next",
      body: `Once your project is saved, go to Goal Statement. That's where you'll write a one-sentence description of what your project needs to accomplish — the anchor for everything that follows.`
    },
  ],

  tbus: [
    {
      title: "What Is a Goal Statement?",
      body: `A goal statement defines what your project needs to accomplish before you decide how to accomplish it. It keeps your team focused on the outcome — not on a specific solution. A good goal statement is solution-neutral: it describes the problem clearly enough that multiple different design concepts could all reasonably respond to it. Everything downstream — your stakeholders, requirements, and concept scoring — is anchored here.`
    },
    {
      title: "How to Write a Goal Statement",
      body: `Start with the outcome for a person, not a product. Describe what needs to be accomplished, not how you'll accomplish it. Then add specifics: how you intend to approach the problem, any hard constraints that could actually eliminate a design concept, and what "done" looks like. A strong goal statement is specific enough to focus your team but open enough that more than one solution could satisfy it. If there's only one possible answer, you've already made the decision — you're just documenting it.`
    },
    {
      title: "Common Mistakes",
      body: `The most common mistake is writing a solution into the goal — "To build an electric bicycle" tells you nothing about what the bicycle actually needs to do. Another is writing constraints that don't constrain anything, like "while being user-friendly." A real constraint has teeth — it can knock a concept out of contention. If every design you can imagine satisfies it, rewrite it.`
    },
    {
      title: "What's Next",
      body: `Once your goal statement is complete, move to Stakeholders. The people affected by your project will shape which requirements actually matter — and you'll only find them by thinking carefully about who your goal statement is really for.`
    },
  ],

  stak: [
    {
      title: "What Are Stakeholders?",
      body: `Stakeholders are anyone who has an interest in your project's outcome — not just the end user. They include the people who will use the thing you design, the people who will build it, maintain it, pay for it, regulate it, or be affected by it in any way. Identifying them broadly at this stage ensures that the requirements you write later actually reflect the full range of needs your design has to meet.`
    },
    {
      title: "How to Identify Stakeholders",
      body: `Start with the obvious users, then work outward. One powerful technique is to trace your system's full lifecycle chronologically — from concept and funding through design, manufacturing, delivery, operation, maintenance, and eventual retirement or disposal. Ask who is involved or affected at each stage. The engineer designing it, the technician installing it, the operator using it daily, the regulator certifying it, and the recycler breaking it down at end of life are all stakeholders with distinct needs. A useful test at any stage: if this design fails or causes harm here, who would be impacted? That person belongs on your list.`
    },
    {
      title: "Common Mistakes",
      body: `The most common mistake is stopping at the primary user. Real projects have regulators, maintainers, procurement teams, bystanders, and others who all have legitimate needs that could show up as requirements. Ignoring them early means discovering them late — often after you've already scored and selected a concept that doesn't serve them.`
    },
    {
      title: "What's Next",
      body: `Once you've identified your stakeholders, move to Lifecycle Properties. Ilities help you categorize the kinds of requirements each stakeholder group is likely to care about — performance, reliability, safety, cost, and more.`
    },
  ],

  ilities: [
    {
      title: "What Are Lifecycle Properties?",
      body: `Lifecycle properties — often called "ilities" — are the broad quality dimensions your system needs to satisfy across its entire life. Things like reliability, maintainability, safety, affordability, and sustainability. They aren't requirements themselves, but they're the categories that requirements fall into. Selecting the right ilities for your project ensures that when you write requirements, you don't accidentally leave entire dimensions of performance unaddressed.`
    },
    {
      title: "How to Select Ilities",
      body: `Review the list and select every ility that is genuinely relevant to your project and stakeholders. Think back to the stakeholders you identified — a maintainer cares about maintainability, a regulator cares about safety and compliance, a procurement team cares about affordability. Use your stakeholder list to pressure-test your selections. If an ility doesn't connect to at least one stakeholder's real concern, you can probably skip it. Note that not every lifecycle property ends in "-ility" — performance is a good example. The name is a shorthand for the category, not a grammatical rule. If you have a need that isn't covered by the standard list, you can add a custom one.`
    },
    {
      title: "Common Mistakes",
      body: `Selecting every ility "just in case" defeats the purpose — you'll end up with requirements spread so thin that nothing is weighted meaningfully. On the other hand, selecting too few means you'll miss whole categories of stakeholder needs. Aim for the set that genuinely reflects your project's context, not the longest or shortest possible list.`
    },
    {
      title: "What's Next",
      body: `Once your ilities are selected, move to Requirements. You'll write specific, measurable requirements and tag each one to an ility — giving you a clear picture of which quality dimensions your requirements actually cover.`
    },
  ],

  requirements: [
    {
      title: "What Is a Requirement?",
      body: `A requirement is a statement of something your design needs to do or satisfy — ranging from non-negotiable to nice-to-have. Requirements can be Essential, Desirable, Optional, Will Not, or Must Not, reflecting that not everything carries equal weight or certainty. They're derived from your stakeholders' real needs and organized against the ilities you selected. Together they form the scorecard your design concepts will be judged against, so the quality of your requirements directly shapes the quality of your final decision.`
    },
    {
      title: "How to Write Strong Requirements",
      body: `Use the Agile format built into the tool: <em>As a [stakeholder], I care about [ility], and I want [requirement], so that [outcome].</em> This structure keeps every requirement grounded in a real person's need and connected to a quality dimension you've already said matters. A good requirement is specific enough that you could test whether a design satisfies it — avoid vague language like "easy to use" and instead describe what that actually means in your context. The "so that" field is optional but worth filling in — it's often the clearest way to explain why a requirement exists.`
    },
    {
      title: "Common Mistakes",
      body: `Writing requirements that are really solutions in disguise — "must use aluminum construction" is a design choice, not a requirement. The real requirement might be "must weigh less than 2kg." Another common mistake is writing requirements so broad that every concept scores identically against them — those requirements add no information to your analysis and should be sharpened or dropped.`
    },
    {
      title: "What's Next",
      body: `Once your requirements are written, move to Weighting. Pairwise comparison will help you determine which requirements matter most — because not all requirements are equal, and your scoring needs to reflect that.`
    },
  ],

  pair: [
    {
      title: "What Is Weighting?",
      body: `Weighting determines where you would invest additional time, money, or resources if you had more to give. The assumption going in is that your team has achieved a minimum viable product — every essential requirement is met, none of the desirable ones are. Weighting isn't about which requirements you'll skip. It's about which ones you'd go further on if you could. You can apply weights to your <strong>Ilities</strong> or your <strong>Requirements</strong> — whichever level is most useful for your analysis. Weighting is optional; if your team agrees no single dimension dominates, equal weights are a valid choice.`
    },
    {
      title: "How to Weight",
      body: `Choose between two methods. <strong>Pairwise comparison</strong> presents your items two at a time and asks: given that all essentials are met, which would you spend extra resources on? You work through every possible pair and the tool tallies the results — and flags any logical inconsistencies along the way. <strong>Forced ranking</strong> lets you drag items into order from most to least important, and the tool assigns weights of 1–5 automatically based on position. Use pairwise when you want to be thorough and deliberate; use forced ranking when you have a clear enough sense of priority to move faster.`
    },
    {
      title: "Common Mistakes",
      body: `The most common mistake is confusing importance with essentialness — every item on your list is already assumed to be met at a minimum level. The question is where you'd invest more, not what matters at all. Another mistake is letting perceived difficulty or cost influence your comparisons. Weighting should reflect what you value, not what you think is achievable — that trade-off gets resolved in the Pugh Matrix.`
    },
    {
      title: "What's Next",
      body: `Once your weights are set, move to Concept Scoring. There you'll define the design concepts you're evaluating and score each one against your requirements before the Pugh Matrix compares them head-to-head.`
    },
  ],

  scor: [
    {
      title: "What Is Concept Scoring?",
      body: `Concept scoring is where you define the design alternatives you're evaluating and score each one against your requirements. Every concept is compared to a baseline called the Datum — typically your current solution, an industry standard, or a key competitor. Scores are relative to the Datum: better, worse, or about the same. This structured comparison removes gut-feel from the evaluation and makes the strengths and weaknesses of each concept visible before the Pugh Matrix rolls everything up.`
    },
    {
      title: "How to Score Concepts",
      body: `Add each design concept you want to evaluate — the first one you enter becomes the Datum. Then score each remaining concept requirement by requirement. Basic scoring uses +, 0, and − to indicate better, equivalent, or worse than the Datum. Advanced scoring (Account+) extends this to a +3 to −3 scale, where you define anchors for each requirement: what the best realistic performance looks like (+3) and what the worst does (−3). Work requirement by requirement, not concept by concept — it keeps your comparisons consistent and honest.`
    },
    {
      title: "Common Mistakes",
      body: `Choosing a weak or unrealistic Datum distorts everything downstream — if the baseline is too easy to beat, your scores will be artificially optimistic across the board. Another mistake is scoring based on overall impressions of a concept rather than requirement by requirement. A concept can excel on some requirements and fall short on others; the point of this step is to surface exactly that, not paper over it.`
    },
    {
      title: "What's Next",
      body: `Once your concepts are scored, move to the Pugh Matrix. It combines your scores with your weights to produce a ranked comparison — and gives you the tools to interpret what the results actually mean for your decision.`
    },
  ],

  pugh: [
    {
      title: "What Is the Pugh Matrix?",
      body: `The Pugh Matrix is the view where everything comes together. It displays all of your concepts scored against all of your requirements in a single table. If you applied weights in the Weighting step, those are reflected in the totals — if not, all requirements contribute equally. The result is a summary score for each concept that reflects both how well each concept performs and how much each requirement matters. It's not the decision itself, but it's the clearest possible picture of where each concept stands.`
    },
    {
      title: "How to Read the Matrix",
      body: `Each column is a concept, each row is a requirement, and the cells show the score for that concept against that requirement. Weighted totals at the bottom roll everything up into a summary score. A good starting point is to seed your matrix with competitive products and existing designs — they give you an honest picture of how the current market performs and where it falls short, which sharpens your scoring of new concepts. The matrix also shows two key indicators: <strong>MTHUS</strong> (Maximum Theoretic Hybrid Utility Score) and <strong>MTHUWS</strong> (Maximum Theoretic Hybrid Utility Weighted Score). These represent the best possible score you could achieve by combining the strongest elements of your existing concepts into an ideal hybrid. If either score is above 0.8, you're already close to the ceiling of what hybridization can deliver — your time is better spent ideating genuinely new concepts. If they're low, there's significant value still available just by hybridizing what you already have.`
    },
    {
      title: "Common Mistakes",
      body: `The most common mistake is treating the highest score as the automatic winner. The matrix surfaces your best supported option — it doesn't make the decision for you. If a concept is winning but doesn't feel right, that's often a signal that you're missing a requirement, not that the matrix is wrong. Ask yourself why you don't like it, then check that concern against your requirements — if the concern isn't captured there, you may need to add a requirement. Look at the pattern of scores, not just the totals, and if the results genuinely surprise you, go back and check your scoring and weighting before questioning your concepts.`
    },
    {
      title: "What's Next",
      body: `Once you've studied the matrix, move to Convergence Summary. That's where you record your chosen concept, explain your rationale, complete your goal statement, and document lessons learned and next steps.`
    },
  ],

  conv: [
    {
      title: "What Is Convergence?",
      body: `Convergence is the moment the process completes — you've evaluated your concepts, studied the matrix, and chosen a direction. The Convergence Summary page is where you make that decision official and document everything that led to it. It's not just a record of what you chose, but why you chose it and what you learned along the way. A well-completed convergence summary is something you can hand to a teammate, a stakeholder, or your future self.`
    },
    {
      title: "How to Complete the Convergence Summary",
      body: `Select your chosen concept and write your rationale — this is your chance to explain the decision in plain language, including any factors that the matrix couldn't fully capture, like cost, feasibility, or stakeholder preference. Then work through the lessons learned prompts: what surprised you about your requirements, what concepts you wish you'd explored, what assumptions turned out to be wrong, and what you'd do differently. Finally, log any open risks or unvalidated assumptions, assign next steps, and hit Log Convergence Date to close the project.`
    },
    {
      title: "Common Mistakes",
      body: `Skipping the lessons learned is the most common mistake — it feels like extra work once the decision is made, but it's where the real organizational value lives. The prompts are structured to surface things you'll actually want to know next time you run this process. Also resist the urge to write your rationale as a restatement of the matrix scores. The rationale should explain your judgment, not just repeat the numbers — anyone can read the matrix.`
    },
    {
      title: "What's Next",
      body: `With your convergence logged, you're done — for this iteration. Design is rarely a single pass. Your lessons learned, open risks, and next steps point toward where the work continues. Return to Project Manager to start a new project or revisit an existing one.`
    },
  ],

  basic: [
    {
      title: "What Is a Quick Project?",
      body: `A Quick Project puts the entire Controlled Convergence analysis on a single page. You define a goal, add requirements, add concepts, and score them against each other in a Pugh Matrix — all without moving between pages. It's designed for speed: early-stage exploration, time-limited workshops, or situations where you want to test an idea before committing to the full workflow. Quick Projects can be converted to Full Projects at any time without losing your work.`
    },
    {
      title: "How to Use It",
      body: `Start by giving your project a name and writing a one-sentence goal describing what you're trying to accomplish. Then add your requirements as rows and your concepts as columns — the first concept you name becomes the Datum, your baseline for comparison. Score each concept against each requirement using +, 0, or − to indicate better, equivalent, or worse than the Datum. The matrix and chart update as you go. When you're ready, generate a Quick PDF Report to export a snapshot of your analysis.`
    },
    {
      title: "Common Mistakes",
      body: `The most common mistake is treating the Quick Project as a shortcut around the thinking, not just the steps. The goal, requirements, and Datum still need to be chosen carefully — vague inputs produce misleading scores just as they do in a Full Project. Also remember that without an account, your work isn't saved between sessions. If your analysis is worth keeping, create an account or convert to a Full Project before closing the tab.`
    },
    {
      title: "What's Next",
      body: `If your Quick Project analysis reveals a strong direction worth pursuing further, convert it to a Full Project. The full workflow adds stakeholders, ilities, requirement weighting, and structured lessons learned — giving you a more complete and defensible result. Use Quick Projects to explore; use Full Projects to decide.`
    },
  ],

};
