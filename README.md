# Skill at 99¢

Pay 99¢ for a contract that pays $1. If you win you make a cent, if you lose you lose 99. A statistical test I rebuilt looked at traders doing exactly this and called them skilled.

I'm a high-school student in Italy and this is my TKS project. It started simple. A 2026 paper (Gómez-Cram, Guo, Jensen and Kung) says a sign-randomization test can tell skilled Polymarket traders from lucky ones, and I wanted to see if I could get the same numbers. I couldn't. Mine came out almost backwards, and most of the project turned into finding out why.

- Live site: https://andrea-gervasoni.github.io/skill-at-99c/
- Article: [on Medium](https://medium.com/@gervandre09/i-rebuilt-a-skill-test-on-1-8-million-polymarket-trades-it-called-a-7-cent-profit-skill-1e2cf6bf2562)
- The research code, with the test, the data pipeline and 87 tests: [polymarket-skill-test-replication](https://github.com/Andrea-Gervasoni/polymarket-skill-test-replication)

![Skill at 99¢](assets/og.png)

## What happened

| | Skilled (raw p) | Anti-skilled (raw p) |
|---|---|---|
| Paper, Table 1, 2023–2025 | 8.63% | 16.84% |
| My replication, Nov–Dec 2025 | 26.89% | 11.05% |

The thing I kept coming back to was price. Accounts that paid 99¢ or more were flagged skilled 613 times out of 702 (87.3%), and not one of them was flagged anti-skilled. Under 80¢ the test looks a lot like the paper's: 11.4% skilled, 14.1% anti-skilled.

So I invented a trader with no edge at all who buys at 99¢ over 20 events. The test flagged them as skilled 82.7% of the time. My guess is that the test flips the sign of each event's profit at random, and twenty wins of 1¢ are almost impossible to beat by shuffling. The loss that would give the game away, a single 99¢ hit, mostly doesn't happen in 20 events.

I'm not saying the paper is wrong. I had less data and a smaller sample, and I ran the test as published. It just seems to break when the payoffs are this lopsided.

## How I ran it

First I wrote the test as a Python package and tried it on fake traders where I already knew the answer. That caught three bugs, and the package ended up with 87 tests.

The data is the public Polymarket history on Hugging Face (`SII-WANGZJ/Polymarket_data`, commit `73bc1adc`): 1,266,885,846 fills in a 45.8 GB table. With DuckDB I rebuilt every account's trades per event, converted NO trades to YES terms, read outcomes from the final prices (45 ambiguous markets dropped) and removed market makers with the paper's rule.

The full 2023–2025 run crashed my laptop twice for lack of memory, so I cut it down to November–December 2025. That left 82,568 eligible accounts. I drew 5,000 of them in a fixed order (4,850 with at least one buy) and gave each 1,000 sign flips, seed 20261031, mid-p value. Those 5,000 accounts made the 1,848,270 trades I keep mentioning.

## Still open

- I only have two months of data. The paper has three years.
- The standard error is about half a percentage point.
- 126 of the 150 accounts with no buys at all are flagged skilled too. I have no explanation yet.

## The site

It's one static page in English and Italian (add `?lang=it`), with no build step and no tracking. three.js draws the stack of $1 notes, the coin and the headline. GSAP ScrollTrigger and Lenis handle the scrolling and the charts. Every number on the page comes from `data/site_data.json`, and the scatter plot reads `data/accounts_novdec2025.json`.

It uses ES modules, so open it through a local server:

```bash
python3 -m http.server 8000
```

Then go to http://localhost:8000.

## Credits

- **Paper:** Gómez-Cram, R., Guo, Y., Jensen, T. I., & Kung, H. (2026). *Prediction Market Accuracy: Crowd Wisdom or Informed Minority?* SSRN Working Paper.
- **Data:** SII-WANGZJ, *Polymarket_data*, Hugging Face.
- **$1 note:** scan of the obverse, public domain (work of the United States Government), via Wikimedia Commons. It is shown on one side only and at a size different from a real note, for education (31 CFR 411.1). It is not legal tender.
- **Coin:** a coin of Trajan, photo by Classical Numismatic Group, Inc., [CC BY-SA 2.5](https://creativecommons.org/licenses/by-sa/2.5/), via [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Traianus_denarius_105_90020184.jpg). I cropped it and made it greyscale for the 3D coins, and the edited textures (`assets/coin-*.webp`) keep the same licence.
- **Fonts:** Newsreader and Geist Mono, SIL Open Font License.
- **Libraries:** three.js (MIT), Lenis (MIT), GSAP (standard license).

## License

The code is MIT, see [LICENSE](LICENSE). The coin textures stay under CC BY-SA 2.5.

This is a student research project, not investment advice.

Andrea Gervasoni · TKS · November 2026
