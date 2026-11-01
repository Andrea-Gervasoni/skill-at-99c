// English and Italian. The page is written in English; in Italian every block of prose is
// swapped by its English text, and the strings built in code go through t(). Numbers keep one
// notation in both languages (a decimal point), so the prose always matches the charts.

const pick = () => {
  const q = new URLSearchParams(location.search).get('lang');
  if (q === 'it' || q === 'en') return q;
  try { const s = localStorage.getItem('lang'); if (s === 'it' || s === 'en') return s; } catch {}
  return (navigator.language || '').toLowerCase().startsWith('it') ? 'it' : 'en';
};
export const lang = pick();

const IT = {
  // first view
  'Risk 99¢ to make 1¢.': 'Rischi 99¢ per guadagnare 1¢.',
  'The test calls it skill.': 'Il test la chiama abilità.',
  'Risk 99¢ to make 1¢. The test calls it skill.': 'Rischi 99¢ per guadagnare 1¢. Il test la chiama abilità.',
  'one strip = 1¢': 'una striscia = 1¢',
  '99¢ · the stake': '99¢ · la posta',
  '1¢ · the profit': '1¢ · il guadagno',
  '0000 / 1,000 sign flips': '0000 / 1,000 inversioni di segno',
  // signature
  'Twenty bets, replayed 1,000 times with their signs flipped.': 'Venti scommesse, rigiocate 1,000 volte con i segni invertiti.',
  '99¢, no loss': '99¢, nessuna perdita',
  '99¢, one loss': '99¢, una perdita',
  '50¢, fair coin': '50¢, moneta equa',
  'Real record': 'Risultato reale',
  '95th pct of the null': '95° percentile del nullo',
  'Histories above · tied': 'Storie sopra · pari',
  'Verdict': 'Verdetto',
  'Each bill is one history: the same 20 profits, every sign flipped at random. Piles count histories by total profit. The test calls a trader skilled when fewer than 5% of histories beat the real record. Hover a pile to read it.':
    'Ogni banconota è una storia: gli stessi 20 profitti, con ogni segno invertito a caso. Le pile contano le storie per profitto totale. Il test chiama abile un trader quando meno del 5% delle storie batte il risultato reale.',
  'Simulation, not market data · unit stake · seed 20261031 + round(q×1000), computed in your browser.': 'Simulazione, non dati di mercato · posta unitaria · seed 20261031 + round(q×1000), calcolata nel tuo browser.',
  'Total profit of each history, $': 'Profitto totale di ogni storia, $',
  'Histories': 'Storie',
  '95th pct': '95° pct',
  // method
  'The route: read the paper, prove the test on traders whose answer is known, then cut 1.27 billion fills down to 5,000 accounts.': 'Il percorso: leggere il paper, provare il test su trader di cui si conosce la risposta, poi ridurre 1.27 miliardi di eseguiti a 5,000 conti.',
  '01 · Read': '01 · Lettura',
  "The test comes from Gómez-Cram, Guo, Jensen and Kung (25 June 2026): give each event's profit a random sign, 1,000 times, and count how often chance beats the real record.": 'Il test viene da Gómez-Cram, Guo, Jensen e Kung (25 giugno 2026): dare al profitto di ogni evento un segno casuale, 1,000 volte, e contare quante volte il caso batte il risultato reale.',
  'spec · sign-randomization skill test': 'specifica · test di abilità a segni casuali',
  "the sign this event's profit gets, flipped at random": 'il segno che prende il profitto di questo evento, estratto a caso',
  '02 · Check': '02 · Verifica',
  'On synthetic traders with a known answer, pure noise is flagged 5.95% of the time, a real 10-point edge needs about 160 trades to be found, and favourite buyers with no edge are flagged 59.25%.': 'Su trader sintetici di cui si conosce la risposta, il puro rumore viene segnalato il 5.95% delle volte, un vantaggio vero di 10 punti richiede circa 160 trade per essere trovato, e chi compra favoriti senza vantaggio viene segnalato il 59.25% delle volte.',
  'of favourite buyers with no edge are flagged skilled, in synthetic data': 'dei compratori di favoriti senza vantaggio viene segnalato abile, su dati sintetici',
  'Synthetic: share flagged skilled, by trades per account': 'Sintetico: quota segnalata abile, per trade per conto',
  '03 · Data': '03 · Dati',
  'A frozen release of 1,266,885,846 fills, read in place with DuckDB, becomes 5,000 accounts and 1,848,270 trades for Nov–Dec 2025.': 'Una versione congelata di 1,266,885,846 eseguiti, letta sul posto con DuckDB, diventa 5,000 conti e 1,848,270 trade per novembre–dicembre 2025.',
  'accounts sampled from 82,568 eligible ones': 'conti estratti da 82,568 idonei',
  'Accounts kept at each step, log scale': 'Conti tenuti a ogni passo, scala logaritmica',
  '04 · Test': '04 · Test',
  'On real accounts the p-values do not lie flat: 1,430 fall below 0.05, and 737 of them belong to the 879 accounts that pay 95¢ or more on average.': 'Sui conti reali i p-value non sono piatti: 1,430 cadono sotto 0.05, e 737 di questi appartengono agli 879 conti che pagano in media 95¢ o più.',
  'accounts fall below p = 0.05; a fair test would give about 250': 'conti cadono sotto p = 0.05; un test equo ne darebbe circa 250',
  'Each account: mean buy price against raw p-value': 'Ogni conto: prezzo medio di acquisto contro p-value grezzo',
  // finding
  'Of 702 accounts that pay 99¢ or more, 613 are flagged skilled. None is flagged anti-skilled.': 'Dei 702 conti che pagano 99¢ o più, 613 sono segnalati abili. Nessuno è segnalato anti-abile.',
  'Nov–Dec 2025': 'Nov–Dic 2025',
  'Dec 2025 only': 'Solo dic 2025',
  'of accounts that pay 99¢ or more are flagged skilled': 'dei conti che pagano 99¢ o più è segnalato abile',
  'Accounts flagged, by average buy price': 'Conti segnalati, per prezzo medio di acquisto',
  // mechanism
  'Flipping signs builds a null that is symmetric around zero. A 99¢ contract pays +1¢ almost every time and −99¢ about once in a hundred.': 'Invertire i segni costruisce un nullo simmetrico attorno a zero. Un contratto a 99¢ paga +1¢ quasi sempre e −99¢ circa una volta su cento.',
  'Over 20 events the most likely history has no loss (81.8% of the time), and that is the most extreme history the null can produce.': 'Su 20 eventi la storia più probabile non ha perdite (81.8% delle volte), ed è la storia più estrema che il nullo possa produrre.',
  'of zero-edge traders are called skilled at 99¢ and 20 events, in simulation': 'dei trader senza vantaggio è chiamato abile a 99¢ e 20 eventi, in simulazione',
  'Simulation: zero-edge traders called skilled, by price and events': 'Simulazione: trader senza vantaggio chiamati abili, per prezzo ed eventi',
  // price cap
  "With no cap, 26.9% are skilled and 11.1% anti-skilled, the reverse of the paper's Table 1. At an 80¢ cap the two come close: 11.4% and 14.1%.": 'Senza tetto, il 26.9% è abile e l’11.1% anti-abile, il contrario della Tabella 1 del paper. Con un tetto a 80¢ i due si avvicinano: 11.4% e 14.1%.',
  'Raw p': 'p grezzo',
  'skilled with no price cap, against 8.63% in the paper': 'abili senza tetto di prezzo, contro l’8.63% del paper',
  'Skilled and anti-skilled share, by price cap': 'Quota di abili e anti-abili, per tetto di prezzo',
  // table
  'Same test, same thresholds. Where the price cap sits decides which side is larger.': 'Stesso test, stesse soglie. Dove sta il tetto di prezzo decide quale lato è più grande.',
  'Sample': 'Campione', 'Accounts': 'Conti', 'Skilled, raw': 'Abili, grezzo', 'Anti, raw': 'Anti, grezzo', 'Skilled, BH': 'Abili, BH', 'Anti, BH': 'Anti, BH',
  // results
  'Compared four ways, the flags follow the price paid more than the trader who paid it.': 'Confrontate in quattro modi, le segnalazioni seguono il prezzo pagato più del trader che lo ha pagato.',
  'A · Against the paper': 'A · Contro il paper',
  "With no cap the replication flags 3.12 times the paper's skilled share and 0.66 times its anti-skilled share; under an 80¢ cap the order flips back to the paper's, with 0.81 skilled per anti-skilled account against the paper's 0.51.": 'Senza tetto la replica segnala 3.12 volte la quota di abili del paper e 0.66 volte quella di anti-abili; con un tetto a 80¢ l’ordine torna quello del paper, con 0.81 abili per ogni anti-abile contro lo 0.51 del paper.',
  "the paper's skilled share, with no cap": 'la quota di abili del paper, senza tetto',
  'Paper against replication: 100 accounts per bundle': 'Paper contro replica: 100 conti per mazzetta',
  'B · Against a trader with no edge': 'B · Contro un trader senza vantaggio',
  'In five of six price buckets, in both windows, the share flagged skilled sits inside the range a simulated trader with no edge would get; only 80–90¢ is above it, at 42.2% against at most 35.2%.': 'In cinque fasce di prezzo su sei, in entrambe le finestre, la quota segnalata abile sta dentro l’intervallo di un trader simulato senza vantaggio; solo 80–90¢ è sopra, al 42.2% contro un massimo del 35.2%.',
  'price buckets sit inside the zero-edge range': 'fasce di prezzo stanno dentro l’intervallo senza vantaggio',
  'Observed skilled share against the zero-edge range, by price bucket': 'Quota abile osservata contro l’intervallo senza vantaggio, per fascia di prezzo',
  'C · Against the correction': 'C · Contro la correzione',
  'Benjamini–Hochberg removes 53.1% of the anti-skilled flags but only 10.3% of the skilled ones; under an 80¢ cap it removes 37.8% and 52.3%. It corrects for many tests, not for a null that ignores the price.': 'Benjamini–Hochberg toglie il 53.1% delle segnalazioni anti-abili ma solo il 10.3% di quelle abili; con un tetto a 80¢ ne toglie il 37.8% e il 52.3%. Corregge per i test multipli, non per un nullo che ignora il prezzo.',
  'skilled flags removed by Benjamini–Hochberg, against −53.1% anti-skilled': 'segnalazioni abili tolte da Benjamini–Hochberg, contro il −53.1% delle anti-abili',
  'Raw p against Benjamini–Hochberg, Nov–Dec 2025': 'p grezzo contro Benjamini–Hochberg, nov–dic 2025',
  'D · Where the flags come from': 'D · Da dove vengono le segnalazioni',
  'The 14.5% of buyers who pay 99¢ or more on average produce 47% of all skilled flags in Nov–Dec; in December alone, 19.7% produce 53.4%.': 'Il 14.5% dei compratori che paga in media 99¢ o più produce il 47% di tutte le segnalazioni abili in nov–dic; nel solo dicembre, il 19.7% ne produce il 53.4%.',
  'of skilled flags come from 14.5% of buyers': 'delle segnalazioni abili viene dal 14.5% dei compratori',
  'Share of accounts against share of skilled flags': 'Quota di conti contro quota di segnalazioni abili',
  // verdict
  'On these trades the sign-flip test measures the price of the contract before it measures the skill of the trader.': 'Su questi trade il test a segni invertiti misura il prezzo del contratto prima dell’abilità del trader.',
  'of accounts that pay 99¢ or more are flagged skilled, close to the 82.7% a trader with no edge gets in simulation at 99¢ and 20 events.': 'dei conti che pagano 99¢ o più è segnalato abile, vicino all’82.7% che ottiene in simulazione un trader senza vantaggio a 99¢ e 20 eventi.',
  'price buckets, in both windows, sit inside the zero-edge range: the flags are what the null produces when payoffs are this skewed.': 'fasce di prezzo, in entrambe le finestre, stanno dentro l’intervallo senza vantaggio: le segnalazioni sono ciò che il nullo produce quando i payoff sono così asimmetrici.',
  'of all skilled flags come from 14.5% of buyers, the favourite buyers; correcting with BH barely touches them.': 'di tutte le segnalazioni abili viene dal 14.5% dei compratori, quelli che comprano favoriti; la correzione BH quasi non le tocca.',
  'skilled per anti-skilled account under an 80¢ cap, against 2.43 with no cap and 0.51 in the paper: where the price mix is closer to fair, the replication moves toward the paper.': 'abili per ogni anti-abile con un tetto a 80¢, contro 2.43 senza tetto e 0.51 nel paper: dove il mix di prezzi è più equo, la replica si avvicina al paper.',
  'So a count of "skilled" accounts on Polymarket depends on how many favourites they buy. It does not show that the paper is wrong; it shows that its Table 1 needs the price mix next to it, and that a fair-price null is the test to run next.': 'Quindi il numero di conti “abili” su Polymarket dipende da quanti favoriti comprano. Non dimostra che il paper sbagli: dimostra che la sua Tabella 1 ha bisogno del mix di prezzi accanto, e che il prossimo test da fare è un nullo a prezzo equo.',
  // claims, next, close, footer
  'What this shows, what it does not, and where it is thin.': 'Cosa mostra, cosa non mostra, e dove è debole.',
  'Next: replace sign flipping with a fair-price null. Skill that survives above 90¢ is real; what disappears was skew.': 'Prossimo passo: sostituire l’inversione dei segni con un nullo a prezzo equo. L’abilità che resiste sopra 90¢ è vera; ciò che sparisce era asimmetria.',
  "Redraw every event's outcome as a coin that lands with the probability of the price paid, and recompute profit 1,000 times.": 'Riestrarre l’esito di ogni evento come una moneta che cade con la probabilità del prezzo pagato, e ricalcolare il profitto 1,000 volte.',
  'Reproduce': 'Riproduci',
  'Pay 99¢. Collect $1. Get called skilled.': 'Paghi 99¢. Incassi $1. Ti chiamano abile.',
  'Research and site by Andrea Gervasoni for TKS Build, November 2026.': 'Ricerca e sito di Andrea Gervasoni per TKS Build, novembre 2026.',
  'Not investment advice. The simulation is a model, not market data.': 'Non è un consiglio di investimento. La simulazione è un modello, non dati di mercato.',
  'Back to top ↑': 'Torna su ↑',
  'Source and method': 'Fonte e metodo',
  // built in code
  'Supported': 'Supportato', 'Not supported': 'Non supportato', 'Limits': 'Limiti',
  'Price drives the signal.': 'È il prezzo a guidare il segnale.',
  'The skilled share rises from 11.4% below 80¢ to 87.3% at 99¢ or more, while the anti-skilled share falls to zero.': 'La quota di abili sale dall’11.4% sotto 80¢ all’87.3% a 99¢ o più, mentre quella di anti-abili scende a zero.',
  'The mechanism holds in simulation.': 'Il meccanismo regge in simulazione.',
  'A trader with no edge who pays 99¢ over 20 events is flagged skilled 82.7% of the time.': 'Un trader senza vantaggio che paga 99¢ su 20 eventi è segnalato abile l’82.7% delle volte.',
  'Table 1 does not replicate.': 'La Tabella 1 non si replica.',
  'Without a price cap, these data give more skilled than anti-skilled accounts, the opposite of the paper.': 'Senza tetto di prezzo, questi dati danno più abili che anti-abili, il contrario del paper.',
  'That the paper is wrong.': 'Che il paper sbagli.',
  'The test is applied as published. The problem appears when payoffs are this skewed.': 'Il test è applicato come pubblicato. Il problema appare quando i payoff sono così asimmetrici.',
  'That no 99¢ buyer has skill.': 'Che nessun compratore a 99¢ sia abile.',
  'Some buy when the outcome is already known. The test cannot separate that from skew.': 'Alcuni comprano quando l’esito è già noto. Il test non riesce a separarlo dall’asimmetria.',
  'That the simulation is the market.': 'Che la simulazione sia il mercato.',
  'Real accounts mix prices and stakes; the simulation uses one price and a unit stake.': 'I conti reali mescolano prezzi e poste; la simulazione usa un solo prezzo e una posta unitaria.',
  'Two months of data.': 'Due mesi di dati.',
  'The 2023–2025 run failed in DuckDB for lack of memory, even at 12 GB.': 'L’elaborazione 2023–2025 è fallita in DuckDB per mancanza di memoria, anche a 12 GB.',
  '5,000 accounts per window.': '5,000 conti per finestra.',
  'Standard error is about 0.55 points at a 14% share.': 'L’errore standard è circa 0.55 punti a una quota del 14%.',
  'December sits inside Nov–Dec.': 'Dicembre sta dentro nov–dic.',
  'The two windows are not independent samples.': 'Le due finestre non sono campioni indipendenti.',
  '218,781 duplicate rows kept.': '218,781 righe duplicate tenute.',
  'They are 11.8% of the rows.': 'Sono l’11.8% delle righe.',
  '232 market makers excluded.': '232 market maker esclusi.',
  'Two judgment calls sit here: how "trades both sides" is read, and how neg-risk markets are handled.': 'Qui ci sono due scelte di giudizio: come si legge “opera su entrambi i lati” e come si trattano i mercati neg-risk.',
  '126 of 150 accounts with no buys flagged skilled.': '126 su 150 conti senza acquisti segnalati abili.',
  'Not traced yet.': 'Non ancora tracciato.',
  'B = 1,000 sign flips.': 'B = 1,000 inversioni di segno.',
  'A p-value can be 0, and Benjamini–Hochberg assumes weak dependence.': 'Un p-value può essere 0, e Benjamini–Hochberg assume dipendenza debole.',
  'Two runs differ by one account.': 'Due elaborazioni differiscono di un conto.',
  '536 against 537.': '536 contro 537.',
  'Touch a pile to read it.': 'Tocca una pila per leggerla.',
  'Hover a pile to read it.': 'Passa su una pila per leggerla.',
  'skilled': 'abile', 'anti-skilled': 'anti-abile', 'none': 'nessuno',
  'Opening': 'Apertura', 'Signature': 'Firma', 'Method': 'Metodo', 'Finding': 'Risultato', 'Mechanism': 'Meccanismo', 'Price cap': 'Tetto di prezzo', 'Table 1': 'Tabella 1', 'Results': 'Confronti', 'Claims': 'Tesi', 'Next test': 'Prossimo test',
  '1,000 sign-flipped histories': '1,000 storie a segni invertiti', 'read, check, data, test': 'lettura, verifica, dati, test', '613 of 702 at ≥ 99¢': '613 su 702 a ≥ 99¢', 'why a favourite looks skilled': 'perché un favorito sembra abile', 'the cap decides the side': 'il tetto decide il lato', 'paper against replication': 'paper contro replica', 'compared four ways': 'confronti in quattro modi', 'what the test measures': 'cosa misura il test', 'supported, not, limits': 'supportato, no, limiti', 'a fair-price null': 'un nullo a prezzo equo',
  '5 of 6': '5 su 6', '3.12×': '3.12×',
  'Copy': 'Copia', 'Copied': 'Copiato', 'Select and copy': 'Seleziona e copia'
};

// Phrases inside chart labels, readouts and tips, which are built around numbers. Longest first;
// each is matched as whole words, so 'Dec' never touches 'Decimal'.
const PHRASES = [
  ['5% plane: what a fair test flags', 'piano al 5%: ciò che segnala un test equo'],
  ['5%: what a fair test flags', '5%: ciò che segnala un test equo'],
  ['Mean buy price, $ · p-value up the side', 'Prezzo medio di acquisto, $ · p-value in verticale'],
  ['Trades per account, doubling', 'Trade per conto, raddoppiando'],
  ['Total profit of each history, $', 'Profitto totale di ogni storia, $'],
  ['buckets inside the zero-edge range, in both windows', 'fasce dentro l’intervallo senza vantaggio, in entrambe le finestre'],
  ['fills per account: median', 'eseguiti per conto: mediana'],
  ['favourite buyers, no edge', 'compratori di favoriti, senza vantaggio'],
  ['favourite buyers', 'compratori di favoriti'],
  ['of real edges found', 'dei vantaggi veri trovati'],
  ['real 10-point edge', 'vantaggio vero di 10 punti'],
  ['called skilled, simulated', 'chiamati abili, simulato'],
  ['skilled per anti-skilled', 'abili per anti-abile'],
  ['skilled per anti', 'abili per anti'],
  ['zero-edge simulation', 'simulazione senza vantaggio'],
  ['zero-edge range', 'intervallo senza vantaggio'],
  ['zero-edge', 'senza vantaggio'],
  ['above the range', 'sopra l’intervallo'],
  ['of skilled flags', 'delle segnalazioni abili'],
  ['skilled flags', 'segnalazioni abili'],
  ['of accounts', 'dei conti'],
  ['Paper, Table 1', 'Paper, Tabella 1'],
  ['Table 1', 'Tabella 1'],
  ['Paper, skilled', 'Paper, abili'],
  ['pure noise', 'puro rumore'],
  ['80% power', 'potenza 80%'],
  ['5% nominal', '5% nominale'],
  ['Price paid', 'Prezzo pagato'],
  ['anti-skilled', 'anti-abili'],
  ['skilled', 'abili'],
  ['after BH', 'dopo BH'],
  ['raw p', 'p grezzo'],
  ['raw', 'grezzo'],
  ['No cap', 'Senza tetto'],
  ['no cap', 'senza tetto'],
  ['Under 80¢', 'Sotto 80¢'],
  ['under 80¢', 'sotto 80¢'],
  ['under 95¢', 'sotto 95¢'],
  ['cap ¢', 'tetto ¢'],
  ['none', 'nessuno'],
  ['mean buy', 'acquisto medio'],
  ['buyers', 'compratori'],
  ['accounts', 'conti'],
  ['histories', 'storie'],
  ['history', 'storia'],
  ['events', 'eventi'],
  ['trades', 'trade'],
  ['dropped', 'tolti'],
  ['outside', 'fuori'],
  ['inside', 'dentro'],
  ['above', 'sopra'],
  ['paper', 'paper'],
  ['Nov–Dec', 'Nov–Dic'],
  ['Dec', 'Dic']
].map(([en, it]) => [new RegExp('(^|[^\\p{L}])' + en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\p{L}])', 'gu'), it]);

// a label or readout put together in code
export function tr(s) {
  if (lang !== 'it' || !s) return s;
  for (const [re, it] of PHRASES) s = s.replace(re, (m, pre) => pre + it);
  return s.replace(/(\d) of (\d)/g, '$1 su $2').replace(/\bof\b/g, 'di');
}
// the text inside an SVG string, leaving tags and attributes alone
export function trSvg(svg) { return lang !== 'it' ? svg : svg.replace(/>([^<]+)</g, (m, x) => '>' + tr(x) + '<'); }

export function t(s) { return lang === 'it' && IT[s] != null ? IT[s] : s; }

const norm = s => s.replace(/\s+/g, ' ').trim();
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const nums = s => s.replace(/(\d[\d,.%¢–]*)/g, '<span class="num">$1</span>');

// swap every block of prose whose English text is in the dictionary
export function translatePage(root = document) {
  document.documentElement.lang = lang;
  if (lang !== 'it') return;
  document.title = 'Abilità a 99¢';
  const sel = 'h1, h2, p, dt, th, summary, .state__label, .fig__name, .fig__lab, .step__k, .claims__head, .coin__cap, .hl, .hero__w, .lab--axis, .lab--yaxis, .lab--real b, .lab--p95, .fig__num, .opt, .foot__top, .verdict li p, .claim__t, .claim__body p, .nav__l, .nav__d';
  root.querySelectorAll(sel).forEach(el => {
    if (el.querySelector('a, button, details, [data-out], [data-lab-val], [data-count], [data-coin-read], [data-loader-count]')) return;
    const hint = el.querySelector('[data-hint]');
    const key = norm(el.textContent), it = IT[key];
    if (it == null) return;
    if (el.classList.contains('fig__num')) el.textContent = it; // the big figure is one run of type
    else el.innerHTML = nums(esc(it));
    if (hint) { el.append(' '); el.appendChild(hint); } // the hint keeps its own line, set in code
  });
}

// the switch: remembered, and the page is rebuilt in the other language
export function setLang(l) {
  try { localStorage.setItem('lang', l); } catch {}
  const u = new URL(location.href); u.searchParams.set('lang', l); location.href = u.toString();
}
