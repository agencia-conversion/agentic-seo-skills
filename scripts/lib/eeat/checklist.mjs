// Fixed E-E-A-T checklist. Mirrors skills/eeat/references/checklist.md.
// Edits here must be reflected in the reference doc.

export const CHECKLIST = {
  experience: [
    { id: "ex1", label: "Envolvimento direto", description: "A página demonstra operação, uso, teste, execução ou vivência direta no tópico." },
    { id: "ex2", label: "Trabalho real", description: "Há casos, exemplos, clientes, projetos ou provas concretas de atuação." },
    { id: "ex3", label: "Ativos próprios", description: "A página mostra dados, artefatos, imagens, screenshots, ferramentas, processos ou materiais próprios." },
    { id: "ex4", label: "Escopo e contexto", description: "Claims de experiência trazem período, escopo, amostra, contexto, limites ou condições." },
    { id: "ex5", label: "Prática específica", description: "O conteúdo diferencia prática real de conselho genérico ou síntese passiva." },
  ],
  expertise: [
    { id: "eq1", label: "Responsável adequado", description: "Entidade, equipe, autor ou revisor responsável é identificável quando isso é esperado para a página." },
    { id: "eq2", label: "Qualificação compatível", description: "Papéis, credenciais, histórico, especialização ou qualificação combinam com o tópico." },
    { id: "eq3", label: "Profundidade técnica", description: "A página mostra raciocínio, método, distinções técnicas ou domínio do assunto." },
    { id: "eq4", label: "Fontes e dados", description: "Quando o tópico exige, há fontes, padrões, dados, metodologia ou referências primárias." },
    { id: "eq5", label: "Atualidade e precisão", description: "O conteúdo é atual o bastante para o tópico e evita simplificações enganosas." },
  ],
  authoritativeness: [
    { id: "au1", label: "Reputação externa", description: "Há menções independentes, reviews, imprensa, rankings ou fontes externas relevantes." },
    { id: "au2", label: "Provas verificáveis", description: "Clientes, parceiros, certificações, prêmios ou afiliações são verificáveis." },
    { id: "au3", label: "Reconhecimento no nicho", description: "A entidade ou criador demonstra reconhecimento tópico no mercado ou comunidade." },
    { id: "au4", label: "Ativos de autoridade", description: "Cases, publicações, estudos, cursos, palestras, ferramentas ou propriedade intelectual sustentam autoridade." },
    { id: "au5", label: "Separação de prova", description: "A página distingue evidência externa, evidência própria e claim promocional." },
  ],
  trust: [
    { id: "tr1", label: "Identidade da entidade", description: "A página deixa claro quem é responsável pelo site, negócio, produto ou conteúdo." },
    { id: "tr2", label: "Caminhos de contato e políticas", description: "Contato, suporte, privacidade, termos ou caminhos legais esperados são acessíveis." },
    { id: "tr3", label: "Claims substanciados", description: "Claims comerciais, garantias, números e superlativos têm evidência proporcional." },
    { id: "tr4", label: "Transparência comercial", description: "Patrocínio, afiliação, conflitos, preço, captura de dados ou finalidade comercial são claros quando relevantes." },
    { id: "tr5", label: "Experiência segura e honesta", description: "A página evita UX enganosa, conteúdo obstruído, malware, phishing, exagero ou sinais de spam." },
  ],
};

export const PILLARS = ["experience", "expertise", "authoritativeness", "trust"];
export const PAGE_TYPES = ["homepage", "about", "service", "case_study", "article", "author_profile", "contact", "policy", "product_tool", "landing_page"];

export const RATING_LABELS = ["Lowest", "Low", "Medium", "High", "Highest"];
export const RATING_POINTS = { Lowest: 0, Low: 25, Medium: 50, High: 75, Highest: 100 };
export const STATE_VALUES = { present: 1.0, partial: 0.5, absent: 0.0, unclear: 0.0, not_applicable: null };
export const CRITERION_SCORES = { present: 100, partial: 50, absent: 0, unclear: 0, not_applicable: null };
export const FINAL_WEIGHTS = { trust: 0.35, expertise: 0.25, experience: 0.20, authoritativeness: 0.20 };

const NA = "not_applicable";
const EXPECTED = "expected";
const REQUIRED = "required";
const OPTIONAL = "optional";

export const DEFAULT_APPLICABILITY = Object.fromEntries(PAGE_TYPES.map((type) => [type, EXPECTED]));

export const APPLICABILITY = {
  ex1: { contact: NA, policy: NA, author_profile: OPTIONAL },
  ex2: { contact: NA, policy: NA, author_profile: OPTIONAL },
  ex3: { homepage: OPTIONAL, about: OPTIONAL, service: OPTIONAL, article: OPTIONAL, contact: NA, policy: NA },
  ex4: { homepage: EXPECTED, about: OPTIONAL, contact: NA, policy: NA, author_profile: OPTIONAL },
  ex5: { homepage: EXPECTED, contact: NA, policy: NA },
  eq1: { homepage: EXPECTED, about: REQUIRED, service: EXPECTED, case_study: EXPECTED, article: REQUIRED, author_profile: REQUIRED, contact: NA, policy: EXPECTED, product_tool: EXPECTED, landing_page: EXPECTED },
  eq2: { homepage: OPTIONAL, about: EXPECTED, service: EXPECTED, case_study: EXPECTED, article: EXPECTED, author_profile: REQUIRED, contact: NA, policy: OPTIONAL },
  eq3: { contact: NA, policy: OPTIONAL },
  eq4: { homepage: OPTIONAL, about: OPTIONAL, service: OPTIONAL, case_study: EXPECTED, article: EXPECTED, author_profile: OPTIONAL, contact: NA, policy: OPTIONAL },
  eq5: { contact: OPTIONAL, policy: EXPECTED },
  au1: { contact: OPTIONAL, policy: OPTIONAL },
  au2: { contact: OPTIONAL, policy: OPTIONAL },
  au3: { contact: OPTIONAL, policy: OPTIONAL },
  au4: { contact: OPTIONAL, policy: OPTIONAL },
  au5: { homepage: EXPECTED, about: EXPECTED, service: EXPECTED, case_study: EXPECTED, article: OPTIONAL, author_profile: OPTIONAL, contact: OPTIONAL, policy: OPTIONAL },
  tr1: { homepage: REQUIRED, about: REQUIRED, service: EXPECTED, case_study: EXPECTED, article: EXPECTED, author_profile: EXPECTED, contact: REQUIRED, policy: REQUIRED, product_tool: REQUIRED, landing_page: EXPECTED },
  tr2: { homepage: EXPECTED, about: EXPECTED, service: EXPECTED, case_study: OPTIONAL, article: OPTIONAL, author_profile: OPTIONAL, contact: REQUIRED, policy: REQUIRED, product_tool: EXPECTED, landing_page: EXPECTED },
  tr3: { homepage: REQUIRED, about: EXPECTED, service: REQUIRED, case_study: REQUIRED, article: EXPECTED, author_profile: OPTIONAL, contact: OPTIONAL, policy: EXPECTED, product_tool: REQUIRED, landing_page: REQUIRED },
  tr4: { homepage: EXPECTED, about: OPTIONAL, service: EXPECTED, case_study: EXPECTED, article: EXPECTED, author_profile: OPTIONAL, contact: OPTIONAL, policy: REQUIRED, product_tool: EXPECTED, landing_page: EXPECTED },
  tr5: { homepage: REQUIRED, about: EXPECTED, service: EXPECTED, case_study: EXPECTED, article: EXPECTED, author_profile: EXPECTED, contact: EXPECTED, policy: EXPECTED, product_tool: REQUIRED, landing_page: REQUIRED },
};

export const APPLICABILITY_WEIGHTS = { required: 1.25, expected: 1, optional: 0.5 };

export function criterionById(id) {
  for (const pillar of PILLARS) {
    const found = CHECKLIST[pillar].find((c) => c.id === id);
    if (found) return { pillar, ...found };
  }
  return null;
}

export function applicabilityFor(id, pageType = "homepage") {
  const normalized = PAGE_TYPES.includes(pageType) ? pageType : "homepage";
  return APPLICABILITY[id]?.[normalized] ?? DEFAULT_APPLICABILITY[normalized] ?? EXPECTED;
}

export function applicabilityWeight(applicability) {
  return APPLICABILITY_WEIGHTS[applicability] ?? 1;
}

export function ratioToRating(ratio) {
  if (ratio >= 0.85) return "Highest";
  if (ratio >= 0.65) return "High";
  if (ratio >= 0.40) return "Medium";
  if (ratio >= 0.20) return "Low";
  return "Lowest";
}

export function scoreToPageQuality(score) {
  if (score >= 85) return "Highest";
  if (score >= 65) return "High";
  if (score >= 40) return "Medium";
  if (score >= 20) return "Low";
  return "Lowest";
}
