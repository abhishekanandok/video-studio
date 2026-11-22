# Research pack: "Compute: the race for the world's most powerful machines" (film4)

Checked 30 Sep 2026. Every line names its source; [P] marks a primary source (the company's or person's own words,
filings, government rules). Say WHO claims what. Where a claim is disputed, give both sides. Claims that could not be
read at the source are marked [SNIPPET] and must be re-checked by the agent before use, or dropped.

Planned chapters: 1 cold open ($700B a year on AI compute) · 2 vacuum tubes to Moore's law · 3 the GPU accident ·
4 the chokepoint (chip design and Taiwan) · 5 the chip war (US export controls on China) · 6 China's answer (doing more
with less: DeepSeek) · 7 why America wants to win · 8 Claude, Anthropic and who should control powerful AI ·
9 the costs (power, money, bubble, India) · 10 verdict. Chapters 1-7 and 9-10 are researched by the agent.

## 8. Claude, Anthropic and who should control powerful AI

The honest question for this chapter: Anthropic, the company that makes Claude, argues that democracies (in practice
the US and its allies) must stay ahead of China in AI and backs chip export controls. Its critics say it uses fear to
shape the rules in its own favour. Present Anthropic in its own words, then its critics in theirs. (Disclosure for the
creator: this pack was drafted with Claude, Anthropic's model; that is why every line below is quoted from the source.)

### What Anthropic says
- Dario Amodei, Anthropic CEO, essay "On DeepSeek and Export Controls", January 2025 [P] (darioamodei.com):
  - DeepSeek's releases "make export control policies even more existentially important than they were a week ago."
  - "Well-enforced export controls are the only thing that can prevent China from getting millions of chips, and are
    therefore the most important determinant of whether we end up in a unipolar or bipolar world."
  - Unipolar: "only the US and its allies have these models", where "a temporary lead could be parlayed into a durable
    advantage". Bipolar: both the US and China have powerful AI, and China could direct more "to military applications".
  - On DeepSeek's reported ~$6M cost: not comparable; "Claude 3.5 Sonnet is a mid-sized model that cost a few $10M's
    to train." He expected about 4x a year of algorithmic progress, so DeepSeek fit the expected cost curve.
  - He called DeepSeek's engineers "smart, curious researchers who just want to make useful technology", separating
    them from China's government.
- Anthropic, "Updating restrictions of sales to unsupported regions", 4 September 2025 [P] (anthropic.com):
  - Blocked companies "more than 50% owned, directly or indirectly, by companies headquartered in unsupported regions".
  - Reasons: laws that "can compel them to share data, cooperate with intelligence services"; the risk they "use our
    capabilities to develop applications and services that ultimately serve adversarial military and intelligence
    services"; and "distillation" to "compete globally with trusted technology companies headquartered in the United
    States and allied countries". Names "adversarial nations like China".
  - Reported revenue impact "low hundreds of millions of dollars" [SNIPPET: Tom's Hardware/Yahoo; not in Anthropic's post].
- Distillation accusations:
  - 23 February 2026 (TechCrunch): Anthropic accused DeepSeek, Moonshot AI and MiniMax of more than 24,000 fake
    accounts and more than 16 million exchanges with Claude (DeepSeek 150,000+, Moonshot 3.4 million, MiniMax 13
    million). Anthropic: "the scale of extraction DeepSeek, MiniMax, and Moonshot performed requires access to advanced
    chips" and "distillation attacks therefore reinforce the rationale for export controls". The labs had not responded
    when TechCrunch published.
  - June 2026 [SNIPPET: Tom's Hardware, The Next Web]: in a 10 June letter to the Senate Banking Committee, Anthropic
    accused Alibaba's Qwen lab of 28.8 million Claude conversations through 25,000 fake accounts (22 April-5 June).
  - September 2026 [SNIPPET]: Anthropic's threat report described five campaigns, nearly 190 million exchanges, May-July 2026.
- On regulation: Anthropic was the only major AI company to publicly back California's SB 53 (transparency and
  whistleblower rules). Jack Clark, co-founder: "This is the equivalent of having a label on the side of the AI products
  you use — everything else, ranging from food to medicine to aircraft, has labels. Why not AI?" (The Decoder, 16 Oct 2025)

### What the critics say
- David Sacks, White House AI adviser, on X, October 2025: Anthropic "is running a sophisticated regulatory capture
  strategy based on fear-mongering" and is "principally responsible for the state regulatory frenzy that is damaging
  the startup ecosystem." Jack Clark called the attack "perplexing" and said Anthropic is "extremely lined up" with the
  administration "in many areas" (The Decoder, 16 Oct 2025; Newcomer, 12 Jun 2026).
- Jensen Huang, Nvidia CEO, VivaTech Paris, June 2025 [SNIPPET: Tom's Hardware]: "he believes that AI is so scary that
  only they should do it." Anthropic's reply: "Dario has never claimed that 'only Anthropic' can build safe and powerful
  AI"; it advocates "a national transparency standard for AI developers (including Anthropic)". Huang: "If you want
  things to be done safely and responsibly, you do it in the open… Don't do it in a dark room and tell me it's safe."
- Jensen Huang, May 2026, on the jobs warnings (AOL, 2 May 2026): "These kinds of comments are not helpful… Somehow,
  because they became CEOs, you adopt a God complex and, before you know it, you know everything."
- Note that Nvidia sells the chips export controls restrict: Huang's side has a commercial stake too, as Anthropic's does.
- The defence: Eric Newcomer (Newcomer, 12 Jun 2026) disagrees with Sacks: Anthropic grew out of genuine safety concerns,
  and its stance has helped it hire, so the cynical reading does not hold.

### OpenAI, for comparison
- OpenAI's submission to the US "AI Action Plan", 13 March 2025 [P via TechCrunch]: called DeepSeek "state-subsidized"
  and "state-controlled" and suggested banning "PRC-produced" models in allied countries over "security risks",
  including "risk of IP theft". TechCrunch noted there "isn't a clear link between the Chinese government and DeepSeek"
  (a spin-off of the hedge fund High-Flyer). Days later OpenAI said it meant export rules, not bans on use.

### The policy they are all arguing about (for chapter 5; re-check at the source)
- April 2025: the US required a licence to sell Nvidia's H20 to China; Nvidia took a $4.5 billion charge (Nvidia 10-K FY2026 [P]).
- January 2026: the administration moved H200 sales to China to case-by-case licences, with the US taking 25% of sales
  and China capped at 50% of the volume made for US customers [SNIPPET: CNBC, Euronews, SCMP, Nextgov, 14 Jan 2026].
- May 2026: Forbes framed the US-China race as hinging on "whether Dario Amodei or Jensen Huang" wins the chip-export
  argument [SNIPPET: headline only].

## Do NOT use
- "$40 million to an advocacy group" (appeared only in a search summary; not found at a readable source).
- Any claim that Anthropic wants to be "the only company" building AI, stated as fact: that is Huang's characterisation,
  which Anthropic denies. Use it only as his quote.

## Sources
https://darioamodei.com/post/on-deepseek-and-export-controls
https://www.anthropic.com/news/updating-restrictions-of-sales-to-unsupported-regions
https://techcrunch.com/2026/02/23/anthropic-accuses-chinese-ai-labs-of-mining-claude-as-us-debates-ai-chip-exports/
https://www.tomshardware.com/tech-industry/artificial-intelligence/anthropic-claims-that-chinas-alibaba-illicitly-distilled-its-models-from-april-to-june-2026-says-effort-involved-25-000-fake-accounts-and-28-8-million-exchanges-on-claude
https://the-decoder.com/trumps-ai-advisor-accuses-anthropic-of-regulatory-capture/
https://www.newcomer.co/p/david-sacks-warning-about-anthropic
https://www.tomshardware.com/tech-industry/artificial-intelligence/anthropic-fires-back-at-nvidia-ceo-jensen-huang-says-it-has-never-claimed-only-anthropic-can-build-safe-and-powerful-ai
https://www.aol.com/news/jensen-huang-over-dire-predictions-163208900.html
https://techcrunch.com/2025/03/13/openai-calls-deepseek-state-controlled-calls-for-bans-on-prc-produced-models/
https://www.sec.gov/Archives/edgar/data/1045810/000104581026000021/nvda-20260125.htm
https://www.cnbc.com/2026/01/14/trump-nvidia-h200-china-ai-chips.html
https://www.forbes.com/sites/drewbernstein/2026/05/29/jensen-and-dario-square-off-on-ai-chip-exports/
https://www.axios.com/2026/09/24/trump-anthropic-ai-doomerism-dario-amodei
