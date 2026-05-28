---
contract_version: 1
title: "<título do conteúdo>"
slug: "<slug-kebab-case>"
published_at: "<YYYY-MM-DD>"
source_url: "<url canônica do post no site>"
origin: "blog"
clusters: []
# role:
#   <cluster-slug>: pillar | satellite
---

# <título do conteúdo>

<!--
Modelo de artigo de blog publicado. Mantém o conteúdo fiel ao publicado: este
arquivo é arquivo, não rascunho. Errata vai como nota no final + entrada
`type: correction` em [[../../brain/log]].

`clusters:` é obrigatório com no mínimo 1 slug que exista como pasta em
../../clusters/<slug>/. Para declarar o papel do conteúdo no cluster
(pillar ou satellite), descomente o bloco `role:` e preencha; sem `role`,
o conteúdo entra na tabela do cluster como satélite por padrão.
-->

<conteúdo do artigo>

---

## Errata

<!-- Adicionar entradas conforme houver correções pós-publicação. Cada errata aqui também gera entrada `type: correction` em [[../../brain/log]]. -->

- <YYYY-MM-DD>: <o que mudou e por quê>
