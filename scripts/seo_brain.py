#!/usr/bin/env python3
"""SEO Brain v0.1 local CLI.

The CLI gives each plugin skill a deterministic executable surface. LLM-based
judgment still lives in the skills/sub-agents, but file creation, Wiki status,
provider calls, and audits should be reproducible here.
"""

from __future__ import annotations

import argparse
import base64
import datetime as dt
import html.parser
import json
import os
import re
import shutil
import sys
import textwrap
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
PROJECTS_DIR = ROOT / "projects"
TEMPLATES_DIR = ROOT / "templates" / "project"
REQUIRED_WIKI_PAGES = [
    "index.md",
    "eeat.md",
    "schema.md",
    "tecnologia/index.md",
    "tom-de-voz/index.md",
    "conteudos/index.md",
    "conteudos/topic-clusters.md",
    "log/index.md",
    "sources/index.md",
]
STRATEGIC_PAGES = {
    "index.md",
    "eeat.md",
    "tecnologia/index.md",
    "tom-de-voz/index.md",
}
DATAFORSEO_MODES = {"offline", "live", "standard", "async"}


def now_iso() -> str:
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()


def today() -> str:
    return dt.date.today().isoformat()


def slugify(value: str) -> str:
    value = value.strip().lower()
    value = unicodedata.normalize("NFKD", value)
    value = "".join(ch for ch in value if not unicodedata.combining(ch))
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = re.sub(r"-+", "-", value).strip("-")
    if not value:
        raise SystemExit("Project slug is empty after normalization.")
    if value in {".", ".."} or "/" in value:
        raise SystemExit("Unsafe project slug.")
    return value[:80]


def project_path(project: str) -> Path:
    return PROJECTS_DIR / slugify(project)


def ensure_project(project: str) -> Path:
    path = project_path(project)
    if not path.exists():
        raise SystemExit(f"Project not found: {path}")
    return path


def read_env_file(path: Path = ROOT / ".env") -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def get_secret(name: str) -> str:
    env = os.environ.get(name)
    if env:
        return env
    return read_env_file().get(name, "")


def mask(value: str) -> str:
    if not value:
        return "missing"
    if len(value) <= 6:
        return "***"
    return f"{value[:2]}***{value[-2:]}"


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def append_log(project: str, event_type: str, title: str, files: list[str], summary: str, approval: str) -> None:
    wiki_log = project_path(project) / "wiki" / "log" / "index.md"
    wiki_log.parent.mkdir(parents=True, exist_ok=True)
    links = ", ".join(f"[[{f}]]" for f in files) if files else "n/a"
    entry = textwrap.dedent(
        f"""

        ## [{today()}] {event_type} | {title}

        - Actor: agent
        - Files: {links}
        - Summary: {summary}
        - Approval: {approval}
        """
    )
    with wiki_log.open("a", encoding="utf-8") as file:
        file.write(entry)


def parse_frontmatter(text: str) -> tuple[dict[str, str], str]:
    if not text.startswith("---\n"):
        return {}, text
    _, raw, body = text.split("---", 2)
    data: dict[str, str] = {}
    for line in raw.splitlines():
        if ":" in line:
            key, value = line.split(":", 1)
            data[key.strip()] = value.strip()
    return data, body.lstrip("\n")


def set_frontmatter_value(path: Path, updates: dict[str, str]) -> None:
    """Update top-level frontmatter keys without flattening multi-line values.

    The previous implementation reserialized the whole frontmatter from a flat
    dict, which dropped list values like `sources:` followed by indented items.
    This version performs targeted replacements per key, preserving every
    untouched line including indented continuation lines that belong to the
    parent key.
    """
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---\n"):
        lines = ["---"]
        for key, value in updates.items():
            lines.append(f"{key}: {value}")
        lines.extend(["---", "", text])
        path.write_text("\n".join(lines), encoding="utf-8")
        return
    end = text.find("\n---", 4)
    if end == -1:
        raise SystemExit(f"Malformed frontmatter in {path}")
    fm_block = text[4:end]
    body = text[end + 4:]
    for key, value in updates.items():
        pattern = re.compile(rf"^{re.escape(key)}:.*(?:\n[ \t].*)*", re.MULTILINE)
        replacement = f"{key}: {value}"
        if pattern.search(fm_block):
            fm_block = pattern.sub(replacement, fm_block, count=1)
        else:
            if not fm_block.endswith("\n"):
                fm_block += "\n"
            fm_block += replacement + "\n"
    new_text = "---\n" + fm_block.rstrip("\n") + "\n---" + body
    path.write_text(new_text, encoding="utf-8")


def dataforseo_credentials_present() -> bool:
    login = os.environ.get("CLAUDE_PLUGIN_OPTION_dataforseo_login") or get_secret("DATAFORSEO_LOGIN")
    password = os.environ.get("CLAUDE_PLUGIN_OPTION_dataforseo_password") or get_secret("DATAFORSEO_PASSWORD")
    return bool(login and password)


def resolve_seo_provider(prefer: str | None = None) -> dict[str, str]:
    """Pick the SEO data provider for seo-analysis.

    Returns {"provider": "dataforseo"|"websearch", "reason": str}.
    Default ("auto" or None) prefers DataForSEO when credentials are present
    and falls back to websearch otherwise. Forcing dataforseo without
    credentials raises a clear error.
    """
    choice = (prefer or "auto").strip().lower()
    has_creds = dataforseo_credentials_present()
    if choice == "websearch":
        return {"provider": "websearch", "reason": "Forced by --provider websearch."}
    if choice == "dataforseo":
        if not has_creds:
            raise SystemExit(
                "DataForSEO credentials missing. Set DATAFORSEO_LOGIN/DATAFORSEO_PASSWORD or use --provider websearch."
            )
        return {"provider": "dataforseo", "reason": "Forced by --provider dataforseo."}
    if choice != "auto":
        raise SystemExit(f"Unsupported provider preference: {choice}. Use dataforseo, websearch, or auto.")
    if has_creds:
        return {"provider": "dataforseo", "reason": "DataForSEO credentials present in environment."}
    return {"provider": "websearch", "reason": "DataForSEO credentials absent; falling back to websearch."}


def dataforseo_request(method: str, endpoint: str, payload: Any | None = None, sandbox: bool = False) -> dict[str, Any]:
    login = os.environ.get("CLAUDE_PLUGIN_OPTION_dataforseo_login") or get_secret("DATAFORSEO_LOGIN")
    password = os.environ.get("CLAUDE_PLUGIN_OPTION_dataforseo_password") or get_secret("DATAFORSEO_PASSWORD")
    if not login or not password:
        raise RuntimeError("DataForSEO credentials are missing.")
    host = "https://sandbox.dataforseo.com" if sandbox else "https://api.dataforseo.com"
    url = host + endpoint
    raw = None if payload is None else json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(url, data=raw, method=method.upper())
    token = base64.b64encode(f"{login}:{password}".encode("utf-8")).decode("ascii")
    request.add_header("Authorization", f"Basic {token}")
    request.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.loads(response.read().decode("utf-8"))


def resolve_dataforseo_mode(args: argparse.Namespace) -> str:
    if getattr(args, "live", False):
        return "live"
    if getattr(args, "offline", False):
        return "offline"
    configured = (
        getattr(args, "mode", None)
        or os.environ.get("CLAUDE_PLUGIN_OPTION_dataforseo_mode")
        or os.environ.get("SEO_BRAIN_DATAFORSEO_MODE")
        or read_env_file().get("SEO_BRAIN_DATAFORSEO_MODE")
        or "standard"
    )
    mode = configured.strip().lower()
    if mode not in DATAFORSEO_MODES:
        raise SystemExit(f"Unsupported DataForSEO mode: {mode}. Use one of: {', '.join(sorted(DATAFORSEO_MODES))}.")
    return mode


def add_dataforseo_mode_args(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--mode", choices=sorted(DATAFORSEO_MODES), help="DataForSEO mode. Default: standard.")
    parser.add_argument("--live", action="store_true", help="Shortcut for --mode live.")
    parser.add_argument("--offline", action="store_true", help="Shortcut for --mode offline; does not call DataForSEO.")
    parser.add_argument("--sandbox", action="store_true", help="Use DataForSEO sandbox host.")


def add_callback_args(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--pingback-url", help="DataForSEO pingback URL for async tasks. Supports $id and $tag.")
    parser.add_argument("--postback-url", help="DataForSEO postback URL for async tasks. Supports $id and $tag.")
    parser.add_argument("--postback-data", choices=["regular", "advanced", "html"], default="advanced")


def task_ids_from_response(response: dict[str, Any]) -> list[str]:
    ids = []
    for task in response.get("tasks") or []:
        task_id = task.get("id")
        if task_id:
            ids.append(task_id)
    return ids


def task_result_ready(response: dict[str, Any]) -> bool:
    tasks = response.get("tasks") or []
    if not tasks:
        return False
    task = tasks[0]
    if task.get("result"):
        return True
    status_code = int(task.get("status_code") or response.get("status_code") or 0)
    if status_code in {40601, 40602}:
        return False
    if status_code >= 40000:
        return True
    return False


def dataforseo_standard_task(
    post_endpoint: str,
    get_endpoint_template: str,
    payload: list[dict[str, Any]],
    sandbox: bool,
    poll_interval: int,
    timeout: int,
) -> dict[str, Any]:
    post_response = dataforseo_request("POST", post_endpoint, payload, sandbox=sandbox)
    ids = task_ids_from_response(post_response)
    if not ids:
        return {"mode": "standard", "post_response": post_response, "tasks": post_response.get("tasks") or []}

    deadline = time.time() + timeout
    task_get_responses: list[dict[str, Any]] = []
    pending = set(ids)
    while pending and time.time() < deadline:
        for task_id in list(pending):
            response = dataforseo_request("GET", get_endpoint_template.format(id=task_id), sandbox=sandbox)
            if task_result_ready(response):
                task_get_responses.append(response)
                pending.remove(task_id)
        if pending:
            time.sleep(poll_interval)

    if pending:
        return {
            "mode": "standard",
            "status": "pending_timeout",
            "post_response": post_response,
            "pending_task_ids": sorted(pending),
            "task_get_responses": task_get_responses,
        }
    if len(task_get_responses) == 1:
        task_get_responses[0]["mode"] = "standard"
        task_get_responses[0]["post_response"] = post_response
        return task_get_responses[0]
    return {"mode": "standard", "post_response": post_response, "task_get_responses": task_get_responses}


def dataforseo_async_task(
    post_endpoint: str,
    payload: list[dict[str, Any]],
    sandbox: bool,
    pingback_url: str | None,
    postback_url: str | None,
    postback_data: str = "advanced",
) -> dict[str, Any]:
    enriched = []
    for item in payload:
        item = dict(item)
        if pingback_url:
            item["pingback_url"] = pingback_url
        if postback_url:
            item["postback_url"] = postback_url
            item["postback_data"] = postback_data
        enriched.append(item)
    response = dataforseo_request("POST", post_endpoint, enriched, sandbox=sandbox)
    return {
        "mode": "async",
        "task_ids": task_ids_from_response(response),
        "callback": {
            "pingback_url": mask(pingback_url or ""),
            "postback_url": mask(postback_url or ""),
            "postback_data": postback_data if postback_url else None,
        },
        "post_response": response,
    }


class SEOHTMLParser(html.parser.HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.title = ""
        self._in_title = False
        self._heading: str | None = None
        self.headings: list[dict[str, str]] = []
        self.meta: dict[str, str] = {}
        self.links: list[dict[str, str]] = []
        self.images: list[dict[str, str]] = []
        self.structured_data = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr = {k.lower(): v or "" for k, v in attrs}
        tag = tag.lower()
        if tag == "title":
            self._in_title = True
        elif tag in {"h1", "h2", "h3", "h4", "h5", "h6"}:
            self._heading = tag
        elif tag == "meta":
            key = attr.get("name") or attr.get("property")
            if key:
                self.meta[key.lower()] = attr.get("content", "")
        elif tag == "link":
            self.links.append(attr)
        elif tag == "img":
            self.images.append(attr)
        elif tag == "script" and attr.get("type") == "application/ld+json":
            self.structured_data += 1

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "title":
            self._in_title = False
        if tag.lower() == self._heading:
            self._heading = None

    def handle_data(self, data: str) -> None:
        text = " ".join(data.split())
        if not text:
            return
        if self._in_title:
            self.title += text
        if self._heading:
            self.headings.append({"level": self._heading, "text": text})


def extract_html(html: str) -> dict[str, Any]:
    parser = SEOHTMLParser()
    parser.feed(html)
    canonical = ""
    for link in parser.links:
        if link.get("rel", "").lower() == "canonical":
            canonical = link.get("href", "")
    return {
        "title": parser.title.strip(),
        "meta_description": parser.meta.get("description", ""),
        "meta_robots": parser.meta.get("robots", ""),
        "canonical": canonical,
        "headings": parser.headings,
        "images": parser.images,
        "structured_data_blocks": parser.structured_data,
    }


def fetch_url(url: str) -> tuple[int, str]:
    request = urllib.request.Request(url, headers={"User-Agent": "SEO-Brain/0.1"})
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return response.status, response.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as error:
        return error.code, error.read().decode("utf-8", errors="replace")


def command_project_init(args: argparse.Namespace) -> None:
    slug = slugify(args.name)
    path = project_path(slug)
    for directory in ["wiki", "web", "sources", "reports", "artifacts", ".seo-brain"]:
        (path / directory).mkdir(parents=True, exist_ok=True)
    template_wiki = TEMPLATES_DIR / "wiki"
    if template_wiki.exists():
        shutil.copytree(template_wiki, path / "wiki", dirs_exist_ok=True)
    config = {
        "name": args.name,
        "slug": slug,
        "created_at": now_iso(),
        "language": args.language,
        "market": args.market,
        "status": "draft",
    }
    write_json(path / ".seo-brain" / "project.json", config)
    append_log(slug, "init", "Projeto criado", ["index"], f"Projeto {args.name} inicializado.", "pending")
    print(json.dumps({"ok": True, "project": slug, "path": str(path)}, ensure_ascii=False))


def command_wiki_lint(args: argparse.Namespace) -> None:
    path = ensure_project(args.project)
    wiki = path / "wiki"
    findings: list[dict[str, str]] = []
    for rel in REQUIRED_WIKI_PAGES:
        page = wiki / rel
        if not page.exists():
            findings.append({"severity": "error", "file": rel, "message": "required Wiki page missing"})
            continue
        fm, body = parse_frontmatter(page.read_text(encoding="utf-8"))
        if "status" not in fm:
            findings.append({"severity": "warning", "file": rel, "message": "missing status frontmatter"})
        if rel in STRATEGIC_PAGES and fm.get("status") == "approved" and not fm.get("approved_by"):
            findings.append({"severity": "error", "file": rel, "message": "strategic page approved without approved_by"})
        for link in re.findall(r"\[\[([^\]]+)\]\]", body):
            target = link.split("|", 1)[0].strip()
            candidate = wiki / (target if target.endswith(".md") else f"{target}.md")
            if not candidate.exists():
                findings.append({"severity": "warning", "file": rel, "message": f"broken wikilink: [[{link}]]"})
    result = {"ok": not any(f["severity"] == "error" for f in findings), "findings": findings}
    write_json(path / "reports" / "wiki-lint.json", result)
    append_log(args.project, "lint", "Wiki lint", ["reports/wiki-lint.json"], f"{len(findings)} apontamentos encontrados.", "not-required")
    print(json.dumps(result, ensure_ascii=False, indent=2))


def command_wiki_approve(args: argparse.Namespace) -> None:
    path = ensure_project(args.project)
    rel = args.page.strip("/")
    page = path / "wiki" / rel
    if not page.exists():
        raise SystemExit(f"Wiki page not found: {page}")
    set_frontmatter_value(
        page,
        {
            "status": "approved",
            "approved_by": json.dumps(args.by, ensure_ascii=False),
            "approved_at": json.dumps(now_iso()),
            "last_reviewed": json.dumps(today()),
        },
    )
    append_log(args.project, "approval", rel, [rel.removesuffix(".md")], f"Pagina {rel} aprovada por {args.by}.", "approved")
    print(json.dumps({"ok": True, "approved": rel, "by": args.by}, ensure_ascii=False))


def command_wiki_ingest(args: argparse.Namespace) -> None:
    path = ensure_project(args.project)
    source = Path(args.source)
    if not source.exists():
        raise SystemExit(f"Source not found: {source}")
    target = path / "sources" / "manual" / f"{today()}-{slugify(source.stem)}{source.suffix}"
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, target)
    append_log(args.project, "ingest", source.name, [str(target.relative_to(path))], "Fonte manual adicionada ao projeto.", "not-required")
    print(json.dumps({"ok": True, "source": str(target)}, ensure_ascii=False))


def command_data_setup(args: argparse.Namespace) -> None:
    login = os.environ.get("CLAUDE_PLUGIN_OPTION_dataforseo_login") or get_secret("DATAFORSEO_LOGIN")
    password = os.environ.get("CLAUDE_PLUGIN_OPTION_dataforseo_password") or get_secret("DATAFORSEO_PASSWORD")
    mode = resolve_dataforseo_mode(args)
    decision = resolve_seo_provider(None)
    status: dict[str, Any] = {
        "dataforseo_login": mask(login),
        "dataforseo_password": mask(password),
        "default_mode": mode,
        "dataforseo_configured": bool(login and password),
        "websearch_available": True,
        "provider_default": decision["provider"],
        "provider_default_reason": decision["reason"],
        "modes": {
            "live": "ultrarrapido: usa endpoints /live; retorna em segundos e costuma custar mais.",
            "standard": "medio: usa task_post + polling task_get; padrao do SEO Brain.",
            "async": "assincrono: usa task_post com pingback_url/postback_url quando informado.",
            "offline": "teste local: nao chama a DataForSEO.",
        },
        "credentials_present": bool(login and password),
        "checked_live": bool(args.check),
    }
    if args.check:
        try:
            data = dataforseo_request("GET", "/v3/appendix/user_data", sandbox=args.sandbox)
            task = (data.get("tasks") or [{}])[0]
            result = (task.get("result") or [{}])[0]
            status.update(
                {
                    "live_ok": data.get("status_code") == 20000,
                    "status_message": data.get("status_message"),
                    "balance": result.get("money", {}).get("balance") or result.get("balance"),
                }
            )
        except Exception as exc:  # noqa: BLE001 - CLI should report provider failure clearly.
            status.update({"live_ok": False, "error": str(exc)})
    print(json.dumps(status, ensure_ascii=False, indent=2))


def command_serp_extract(args: argparse.Namespace) -> None:
    path = ensure_project(args.project)
    mode = resolve_dataforseo_mode(args)
    payload = [
        {
            "keyword": args.keyword,
            "location_name": args.location,
            "language_code": args.language,
            "device": args.device,
            "depth": args.depth,
        }
    ]
    source: dict[str, Any]
    if mode == "live":
        source = dataforseo_request("POST", "/v3/serp/google/organic/live/advanced", payload, sandbox=args.sandbox)
        source["mode"] = "live"
    elif mode == "standard":
        source = dataforseo_standard_task(
            "/v3/serp/google/organic/task_post",
            "/v3/serp/google/organic/task_get/advanced/{id}",
            payload,
            sandbox=args.sandbox,
            poll_interval=args.poll_interval,
            timeout=args.timeout,
        )
    elif mode == "async":
        source = dataforseo_async_task(
            "/v3/serp/google/organic/task_post",
            payload,
            sandbox=args.sandbox,
            pingback_url=args.pingback_url,
            postback_url=args.postback_url,
            postback_data=args.postback_data,
        )
    else:
        source = {"status_code": "offline", "mode": "offline", "tasks": [], "note": "Run with --mode standard or --mode live to fetch DataForSEO SERP data."}
    normalized = normalize_serp(source, args.keyword, args.location, args.language, args.device)
    stamp = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    base = path / "sources" / "serp" / f"{stamp}-{slugify(args.keyword)}"
    write_json(base.with_suffix(".raw.json"), source)
    write_json(base.with_suffix(".normalized.json"), normalized)
    write_json(path / "reports" / "serp" / f"{stamp}-{slugify(args.keyword)}.json", normalized)
    append_log(args.project, "serp", args.keyword, [str(base.with_suffix(".normalized.json").relative_to(path))], "SERP extraida e normalizada.", "not-required")
    print(json.dumps(normalized, ensure_ascii=False, indent=2))


def normalize_serp(source: dict[str, Any], keyword: str, location: str, language: str, device: str) -> dict[str, Any]:
    results: list[dict[str, Any]] = []
    tasks = source.get("tasks") or []
    if source.get("task_get_responses"):
        tasks = []
        for response in source.get("task_get_responses") or []:
            tasks.extend(response.get("tasks") or [])
    items = []
    if tasks:
        task_results = tasks[0].get("result") or []
        if task_results:
            items = task_results[0].get("items") or []
    for item in items:
        if item.get("type") == "organic":
            results.append(
                {
                    "rank_group": item.get("rank_group"),
                    "rank_absolute": item.get("rank_absolute"),
                    "title": item.get("title"),
                    "url": item.get("url"),
                    "domain": item.get("domain"),
                    "snippet": item.get("description") or item.get("snippet"),
                }
            )
    return {
        "keyword": keyword,
        "provider": "dataforseo" if tasks else ("dataforseo" if source.get("mode") == "async" else "offline"),
        "mode": source.get("mode", "unknown"),
        "task_ids": source.get("task_ids") or task_ids_from_response(source.get("post_response") or {}),
        "pending_task_ids": source.get("pending_task_ids") or [],
        "timestamp": now_iso(),
        "location": location,
        "language": language,
        "device": device,
        "organic_results": results,
        "serp_features": sorted({item.get("type", "") for item in items if item.get("type") != "organic"}),
    }


def command_keyword_research(args: argparse.Namespace) -> None:
    path = ensure_project(args.project)
    mode = resolve_dataforseo_mode(args)
    payload = [{"keywords": [args.keyword], "location_name": args.location, "language_code": args.language}]
    if mode == "live":
        source = dataforseo_request("POST", "/v3/keywords_data/google_ads/search_volume/live", payload, sandbox=args.sandbox)
        source["mode"] = "live"
    elif mode == "standard":
        source = dataforseo_standard_task(
            "/v3/keywords_data/google_ads/search_volume/task_post",
            "/v3/keywords_data/google_ads/search_volume/task_get/{id}",
            payload,
            sandbox=args.sandbox,
            poll_interval=args.poll_interval,
            timeout=args.timeout,
        )
    elif mode == "async":
        source = dataforseo_async_task(
            "/v3/keywords_data/google_ads/search_volume/task_post",
            payload,
            sandbox=args.sandbox,
            pingback_url=args.pingback_url,
            postback_url=args.postback_url,
            postback_data=args.postback_data,
        )
    else:
        source = {"status_code": "offline", "mode": "offline", "tasks": [], "note": "Run with --mode standard or --mode live to fetch DataForSEO keyword metrics."}
    normalized = normalize_keywords(source, args.keyword, args.location, args.language)
    stamp = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    base = path / "sources" / "keyword-research" / f"{stamp}-{slugify(args.keyword)}"
    write_json(base.with_suffix(".raw.json"), source)
    write_json(base.with_suffix(".normalized.json"), normalized)
    write_json(path / "reports" / "keyword-research" / f"{stamp}-{slugify(args.keyword)}.json", normalized)
    append_log(args.project, "keyword-research", args.keyword, [str(base.with_suffix(".normalized.json").relative_to(path))], "Pesquisa de keyword registrada.", "not-required")
    print(json.dumps(normalized, ensure_ascii=False, indent=2))


def normalize_keywords(source: dict[str, Any], keyword: str, location: str, language: str) -> dict[str, Any]:
    items: list[dict[str, Any]] = []
    tasks = source.get("tasks") or []
    if source.get("task_get_responses"):
        tasks = []
        for response in source.get("task_get_responses") or []:
            tasks.extend(response.get("tasks") or [])
    if tasks:
        for result in tasks[0].get("result") or []:
            items.append(
                {
                    "keyword": result.get("keyword", keyword),
                    "search_volume": result.get("search_volume"),
                    "competition": result.get("competition"),
                    "cpc": result.get("cpc"),
                    "monthly_searches": result.get("monthly_searches"),
                }
            )
    else:
        items = [{"keyword": keyword, "search_volume": None, "competition": None, "cpc": None, "monthly_searches": None}]
    return {
        "keyword": keyword,
        "provider": "dataforseo" if tasks else ("dataforseo" if source.get("mode") == "async" else "offline"),
        "mode": source.get("mode", "unknown"),
        "task_ids": source.get("task_ids") or task_ids_from_response(source.get("post_response") or {}),
        "pending_task_ids": source.get("pending_task_ids") or [],
        "timestamp": now_iso(),
        "location": location,
        "language": language,
        "keywords": items,
        "note": (
            "Async task created; collect results via pingback/postback or task_get."
            if source.get("mode") == "async"
            else ("Task still pending; rerun task_get later." if source.get("pending_task_ids") else (None if tasks else "Metrics unavailable without a provider call."))
        ),
    }


def command_backlink_analysis(args: argparse.Namespace) -> None:
    path = ensure_project(args.project)
    mode = resolve_dataforseo_mode(args)
    payload = [{"target": args.target, "include_subdomains": True, "backlinks_status_type": "live"}]
    if mode in {"live", "standard"}:
        source = dataforseo_request("POST", "/v3/backlinks/summary/live", payload, sandbox=args.sandbox)
        source["mode"] = "live"
        if mode == "standard":
            source["mode_note"] = "DataForSEO Backlinks API supports only Live retrieval; standard maps to live for backlinks."
    elif mode == "async":
        raise SystemExit("DataForSEO Backlinks API supports only Live retrieval in v3; async is not available for backlink-analysis.")
    else:
        source = {"status_code": "offline", "mode": "offline", "tasks": [], "note": "Run with --mode live or --mode standard to fetch DataForSEO backlink data."}
    tasks = source.get("tasks") or []
    result = ((tasks[0].get("result") or [{}])[0] if tasks else {})
    normalized = {
        "target": args.target,
        "provider": "dataforseo" if tasks else "offline",
        "mode": source.get("mode", "unknown"),
        "timestamp": now_iso(),
        "backlinks": result.get("backlinks"),
        "referring_domains": result.get("referring_domains"),
        "referring_main_domains": result.get("referring_main_domains"),
        "rank": result.get("rank"),
        "spam_score": result.get("backlinks_spam_score"),
        "note": source.get("mode_note") or (None if tasks else "Backlink metrics unavailable without a provider call."),
    }
    stamp = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    base = path / "sources" / "backlinks" / f"{stamp}-{slugify(args.target)}"
    write_json(base.with_suffix(".raw.json"), source)
    write_json(path / "reports" / "backlinks" / f"{stamp}-{slugify(args.target)}.json", normalized)
    append_log(args.project, "backlinks", args.target, [str(base.with_suffix(".raw.json").relative_to(path))], "Analise de backlinks registrada.", "not-required")
    print(json.dumps(normalized, ensure_ascii=False, indent=2))


def latest_file(directory: Path, pattern: str) -> Path | None:
    files = sorted(directory.glob(pattern), key=lambda p: p.stat().st_mtime, reverse=True)
    return files[0] if files else None


def load_dataforseo_serp_results(path: Path, keyword: str, override: str | None) -> list[dict[str, Any]]:
    serp_file = Path(override) if override else None
    if not serp_file:
        serp_file = latest_file(path / "sources" / "serp", f"*-{slugify(keyword)}.normalized.json")
    if not serp_file or not serp_file.exists():
        return []
    data = json.loads(serp_file.read_text(encoding="utf-8"))
    return data.get("organic_results") or []


def load_websearch_results(path: Path, keyword: str, override: str | None) -> list[dict[str, Any]]:
    websearch_file = Path(override) if override else path / "sources" / "websearch" / f"{slugify(keyword)}.json"
    if not websearch_file.exists():
        return []
    data = json.loads(websearch_file.read_text(encoding="utf-8"))
    return data.get("results") or data.get("organic_results") or []


def load_keyword_metrics(path: Path, keyword: str) -> dict[str, Any] | None:
    report = latest_file(path / "reports" / "keyword-research", f"*-{slugify(keyword)}.json")
    if not report:
        return None
    data = json.loads(report.read_text(encoding="utf-8"))
    keywords = data.get("keywords") or []
    if not keywords:
        return None
    primary = keywords[0]
    if primary.get("search_volume") is None and primary.get("competition") is None:
        return None
    return {
        "search_volume": primary.get("search_volume"),
        "competition": primary.get("competition"),
        "cpc": primary.get("cpc"),
        "source_path": str(report.relative_to(path)),
    }


def command_seo_analysis(args: argparse.Namespace) -> None:
    path = ensure_project(args.project)
    decision = resolve_seo_provider(getattr(args, "provider", None))
    provider = decision["provider"]
    provider_reason = decision["reason"]

    if provider == "dataforseo":
        organic = load_dataforseo_serp_results(path, args.keyword, args.serp_file)
        keyword_metrics = load_keyword_metrics(path, args.keyword)
    else:
        organic = load_websearch_results(path, args.keyword, args.websearch_file)
        keyword_metrics = None

    top_results: list[dict[str, Any]] = []
    for idx, item in enumerate(organic, start=1):
        top_results.append(
            {
                "position": item.get("rank_absolute") or item.get("rank_group") or item.get("position") or idx,
                "title": item.get("title", ""),
                "url": item.get("url", ""),
                "snippet": item.get("snippet") or item.get("description") or "",
                "domain": item.get("domain", ""),
            }
        )

    competitors: list[dict[str, Any]] = []
    for entry in top_results[:3]:
        url = entry.get("url")
        extracted: dict[str, Any] = {}
        status = None
        if url and getattr(args, "fetch_pages", False):
            status, html = fetch_url(url)
            extracted = extract_html(html)
        competitors.append({"serp": entry, "http_status": status, "page": extracted})

    heading_patterns: list[dict[str, Any]] = []
    for c in competitors:
        headings = (c.get("page") or {}).get("headings") or []
        if headings:
            heading_patterns.append(
                {
                    "url": c["serp"].get("url"),
                    "h1": next((h["text"] for h in headings if h["level"] == "h1"), ""),
                    "h2_count": sum(1 for h in headings if h["level"] == "h2"),
                }
            )

    title_blob = " ".join((r.get("title") or "").lower() for r in top_results)
    if any(token in title_blob for token in ("comprar", "preço", "preco", "melhor", "vs ", "review")):
        intent = "commercial investigation"
    elif any(token in title_blob for token in ("o que e", "o que é", "guia", "como", "tutorial")):
        intent = "informational"
    else:
        intent = "mixed"

    incomplete = len(top_results) < 5
    limitations: list[str] = []
    if incomplete:
        limitations.append(f"Apenas {len(top_results)} resultados disponíveis; ideal >=5.")
    if provider == "websearch" and not top_results:
        limitations.append(
            f"Nenhum resultado em sources/websearch/{slugify(args.keyword)}.json. Rode WebSearch e grave o JSON antes de reexecutar."
        )
    if provider == "dataforseo" and keyword_metrics is None:
        limitations.append("Sem keyword-research recente para enriquecer keyword_metrics.")

    report = {
        "keyword": args.keyword,
        "provider": provider,
        "provider_reason": provider_reason,
        "keyword_metrics": keyword_metrics,
        "top_results": top_results,
        "competitors": competitors,
        "intent": intent,
        "heading_patterns": heading_patterns,
        "gaps": [
            "Mapear entidades e subtópicos pouco cobertos pelo top 3.",
            "Confirmar formato dominante: artigo, listicle, guia passo a passo.",
            "Identificar perguntas reais do leitor não respondidas pelos competidores.",
        ],
        "improvement_hypotheses": [
            "Cobertura mais densa de exemplos brasileiros do que os concorrentes.",
            "EEAT explícito com autoria e proveniência declarada, ausente em parte do top 3.",
            "Estrutura de heading que responda a intenção observada antes de aprofundar.",
        ],
        "limitations": limitations,
        "incomplete": incomplete,
        "generated_at": now_iso(),
    }

    out = path / "reports" / "seo-analysis" / f"{slugify(args.keyword)}.json"
    write_json(out, report)
    append_log(
        args.project,
        "seo-analysis",
        args.keyword,
        [str(out.relative_to(path))],
        f"Análise SEO via {provider} ({len(top_results)} resultados).",
        "not-required",
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))


def seo_analysis_path(project_path: Path, slug: str) -> Path:
    return project_path / "reports" / "seo-analysis" / f"{slug}.json"


def command_topic_cluster(args: argparse.Namespace) -> None:
    path = ensure_project(args.project)
    seed_slug = slugify(args.seed)
    analysis_file = seo_analysis_path(path, seed_slug)
    hypothesis_only = bool(getattr(args, "hypothesis_only", False))

    if not analysis_file.exists() and not hypothesis_only:
        raise SystemExit(
            "Missing seo-analysis for this seed. Run: "
            f"bin/seo-brain seo-analysis --project {args.project} --keyword \"{args.seed}\" "
            "or rerun with --hypothesis-only to produce a hypothesis-grade cluster."
        )

    intent = "to-be-validated"
    analysis_data: dict[str, Any] | None = None
    if analysis_file.exists():
        analysis_data = json.loads(analysis_file.read_text(encoding="utf-8"))
        intent = analysis_data.get("intent") or intent

    if hypothesis_only and not analysis_data:
        cluster_status = "hypothesis"
        supporting_pages = [
            {"title": f"O que é {args.seed}", "intent": "informational", "judgment": "hypothesis"},
            {"title": f"Como avaliar {args.seed}", "intent": "commercial investigation", "judgment": "hypothesis"},
            {"title": f"{args.seed}: exemplos práticos", "intent": "informational", "judgment": "hypothesis"},
        ]
    else:
        cluster_status = "draft"
        supporting_pages = [
            {"title": f"O que é {args.seed}", "intent": intent, "judgment": "draft"},
            {"title": f"Como avaliar {args.seed}", "intent": intent, "judgment": "draft"},
            {"title": f"{args.seed}: exemplos brasileiros", "intent": intent, "judgment": "draft"},
        ]

    cluster = {
        "seed": args.seed,
        "seed_slug": seed_slug,
        "status": cluster_status,
        "generated_at": now_iso(),
        "pillar_page": f"/{seed_slug}/",
        "supporting_pages": supporting_pages,
        "business_hypothesis": "Precisa de validação humana: conectar demanda orgânica a oferta, conversão e margem.",
        "data_provenance": {
            "seo_analysis": (
                {
                    "path": str(analysis_file.relative_to(path)),
                    "provider": analysis_data.get("provider") if analysis_data else None,
                    "provider_reason": analysis_data.get("provider_reason") if analysis_data else None,
                }
                if analysis_data
                else {"path": None, "provider": None, "provider_reason": "hypothesis-only run"}
            )
        },
    }
    out_json = path / "reports" / "topic-cluster" / f"{seed_slug}.json"
    write_json(out_json, cluster)
    md = path / "wiki" / "conteudos" / "topic-clusters.md"
    with md.open("a", encoding="utf-8") as file:
        file.write(f"\n\n## {args.seed}\n\n")
        file.write(f"- Página pilar: `{cluster['pillar_page']}`\n")
        file.write(f"- Status: {cluster_status}\n")
        file.write(f"- Intenção dominante: {intent}\n")
        file.write("- Hipótese de negócio: precisa de validação humana.\n")
        for page in cluster["supporting_pages"]:
            file.write(f"- {page['title']} ({page['intent']})\n")
    append_log(
        args.project,
        "topic-cluster",
        args.seed,
        ["conteudos/topic-clusters"],
        f"Cluster em status {cluster_status}.",
        "pending",
    )
    print(json.dumps(cluster, ensure_ascii=False, indent=2))


def command_eeat(args: argparse.Namespace) -> None:
    path = ensure_project(args.project)
    page = path / "wiki" / "eeat.md"
    if not page.exists():
        shutil.copy2(TEMPLATES_DIR / "wiki" / "eeat.md", page)
    evidence = {
        "claim": args.claim or "Evidencia a mapear",
        "source": args.source or "sem fonte",
        "status": args.status,
        "timestamp": now_iso(),
    }
    report = {
        "project": args.project,
        "timestamp": now_iso(),
        "evidence": evidence,
        "rules": [
            "Nao inventar experiencia, clientes, credenciais, premios ou provas.",
            "Marcar alegacoes sem fonte como gap.",
            "Manter wiki/eeat.md em draft ou needs-review ate aprovacao explicita.",
        ],
    }
    with page.open("a", encoding="utf-8") as file:
        file.write("\n\n## Evidencia registrada\n\n")
        file.write(f"- Alegacao: {evidence['claim']}\n")
        file.write(f"- Fonte: {evidence['source']}\n")
        file.write(f"- Status: {evidence['status']}\n")
    out = path / "reports" / "eeat" / f"{dt.datetime.now().strftime('%Y%m%d-%H%M%S')}.json"
    write_json(out, report)
    append_log(args.project, "eeat", "Evidencia EEAT", ["eeat", str(out.relative_to(path))], "Evidencia ou lacuna EEAT registrada.", "pending")
    print(json.dumps(report, ensure_ascii=False, indent=2))


def command_content_seo(args: argparse.Namespace) -> None:
    path = ensure_project(args.project)
    topic_slug = slugify(args.topic)
    keyword = args.keyword or args.topic
    keyword_slug = slugify(keyword)
    analysis_file = seo_analysis_path(path, keyword_slug)
    skip_data = bool(getattr(args, "skip_data", False))
    skip_reason = getattr(args, "skip_data_reason", None)

    if not analysis_file.exists() and not skip_data:
        raise SystemExit(
            "Missing seo-analysis for this topic. Run: "
            f"bin/seo-brain seo-analysis --project {args.project} --keyword \"{keyword}\" "
            "or rerun content-seo with --skip-data --skip-data-reason \"motivo claro\" para gerar um briefing sem proveniência de SERP."
        )
    if skip_data and not skip_reason:
        raise SystemExit("--skip-data requires --skip-data-reason \"motivo claro\".")

    analysis_data: dict[str, Any] | None = None
    if analysis_file.exists():
        analysis_data = json.loads(analysis_file.read_text(encoding="utf-8"))

    intent = (analysis_data or {}).get("intent", "to-be-validated")
    provenance = (
        {
            "path": str(analysis_file.relative_to(path)),
            "provider": analysis_data.get("provider") if analysis_data else None,
            "provider_reason": analysis_data.get("provider_reason") if analysis_data else None,
            "generated_at": analysis_data.get("generated_at") if analysis_data else None,
        }
        if analysis_data
        else {"path": None, "provider": None, "provider_reason": f"skip-data: {skip_reason}"}
    )

    must_not_mention_in_prose = sorted(
        {
            (entry.get("domain") or "").strip().lower()
            for entry in (analysis_data or {}).get("top_results", [])
            if entry.get("domain")
        }
    )

    report = {
        "topic": args.topic,
        "topic_slug": topic_slug,
        "keyword": keyword,
        "keyword_slug": keyword_slug,
        "generated_at": now_iso(),
        "data_provenance": {"seo_analysis": provenance},
        "brief": {
            "intent": intent,
            "reader_need": "Responder com profundidade, sem cair em padrões genéricos de IA.",
            "must_include": [
                "definição direta no início",
                "critérios práticos de decisão",
                "exemplos brasileiros verificáveis",
                "próximos passos para o leitor",
            ],
            "must_avoid": [
                "título em padrão americano",
                "URL ou slug interno em prosa",
                "voz de Wiki em texto público",
                "anchor text genérico tipo clique aqui",
                "menção em prosa a domínio que aparece no top_results da análise SEO",
                "referência a fonte externa fora de backlink Markdown",
                "sequência longa de parágrafos de uma linha",
                "metáforas traduzidas literalmente do inglês",
                "adjetivos vazios como robusto, completo, líder",
            ],
        },
        "voice_check": {
            "audience": "leitor de blog público que entende SEO",
            "tense_perspective": "terceira pessoa, voz informativa",
            "link_test": "remover qualquer link e a frase deve continuar coerente",
        },
        "must_not_mention_in_prose": must_not_mention_in_prose,
        "draft_status": "outline",
    }
    write_json(path / "reports" / "content" / f"{topic_slug}.brief.json", report)
    markdown = textwrap.dedent(
        f"""\
        ---
        title: "{args.topic}"
        status: draft
        pillar: conteudo
        owner: shared
        judgment_level: editorial
        cluster: ""
        url: "/{topic_slug}/"
        primary_keyword: "{keyword}"
        sources: []
        ---

        # {args.topic}

        ## Briefing

        Intenção, ângulo e argumentos foram derivados de reports/seo-analysis/{keyword_slug}.json.
        Reescrever para o leitor de blog: sem expor URL interna em prosa, sem voz de Wiki.

        ## Estrutura proposta

        1. Resposta direta no topo.
        2. Definição clara, com escopo e limites.
        3. Critérios práticos.
        4. Exemplos brasileiros verificáveis.
        5. Próximo passo concreto.

        ## Revisão anti-slop e registro de publicação

        - Título em frase normal, sem padrão americano.
        - Nenhum path interno (ex.: /tema/sub-tema/) aparece em prosa.
        - Links internos usam o título da página de destino como anchor text.
        - Cada frase com link continua coerente sem o link.
        - Evitar sequência longa de parágrafos de uma linha.
        - Reduzir bullets quando a explicação pedir desenvolvimento.
        """
    )
    write_text(path / "wiki" / "conteudos" / f"{topic_slug}.md", markdown)
    append_log(args.project, "content", args.topic, [f"conteudos/{topic_slug}"], "Briefing e estrutura de conteúdo criados.", "pending")
    print(json.dumps(report, ensure_ascii=False, indent=2))


def command_technical_seo(args: argparse.Namespace) -> None:
    if args.html_file:
        html = Path(args.html_file).read_text(encoding="utf-8")
        status = None
        source = args.html_file
    elif args.url:
        status, html = fetch_url(args.url)
        source = args.url
    else:
        raise SystemExit("Provide --url or --html-file.")
    extracted = extract_html(html)
    findings = []
    if not extracted["title"]:
        findings.append({"severity": "error", "check": "title", "message": "Missing title tag."})
    if not extracted["meta_description"]:
        findings.append({"severity": "warning", "check": "meta_description", "message": "Missing meta description."})
    h1s = [h for h in extracted["headings"] if h["level"] == "h1"]
    if len(h1s) != 1:
        findings.append({"severity": "error", "check": "h1", "message": f"Expected exactly one h1, found {len(h1s)}."})
    if not extracted["canonical"]:
        findings.append({"severity": "warning", "check": "canonical", "message": "Missing canonical link."})
    missing_alt = [img.get("src", "") for img in extracted["images"] if not img.get("alt")]
    if missing_alt:
        findings.append({"severity": "warning", "check": "image_alt", "message": f"{len(missing_alt)} images missing alt."})
    result = {
        "source": source,
        "page_type": args.page_type,
        "http_status": status,
        "extracted": extracted,
        "findings": findings,
        "ok": not any(f["severity"] == "error" for f in findings),
    }
    if args.project:
        path = ensure_project(args.project)
        stamp = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
        out = path / "reports" / "technical-seo" / f"{stamp}.json"
        write_json(out, result)
        append_log(args.project, "technical-seo", args.page_type, [str(out.relative_to(path))], "Auditoria tecnica deterministica executada.", "not-required")
    print(json.dumps(result, ensure_ascii=False, indent=2))


def command_next_website_creator(args: argparse.Namespace) -> None:
    path = ensure_project(args.project)
    web = path / "web"
    (web / "app" / "blog" / "[slug]").mkdir(parents=True, exist_ok=True)
    (web / "app" / "contato").mkdir(parents=True, exist_ok=True)
    (web / "app" / "servicos").mkdir(parents=True, exist_ok=True)
    write_json(web / "package.json", {"scripts": {"dev": "next dev", "build": "next build", "start": "next start"}, "dependencies": {"next": "latest", "react": "latest", "react-dom": "latest"}, "devDependencies": {"typescript": "latest", "@types/react": "latest", "@types/node": "latest"}})
    write_text(web / "app" / "layout.tsx", "export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang=\"pt-BR\"><body>{children}</body></html>; }\n")
    write_text(web / "app" / "page.tsx", f"export default function Page() {{ return <main><h1>{args.project}</h1><p>Site SEO Brain em rascunho.</p></main>; }}\n")
    write_text(web / "app" / "servicos" / "page.tsx", "export default function Page() { return <main><h1>Servicos</h1></main>; }\n")
    write_text(web / "app" / "contato" / "page.tsx", "export default function Page() { return <main><h1>Contato</h1></main>; }\n")
    write_text(web / "app" / "blog" / "page.tsx", "export default function Page() { return <main><h1>Blog</h1></main>; }\n")
    write_text(web / "app" / "blog" / "[slug]" / "page.tsx", "export default function Page() { return <main><h1>Post</h1></main>; }\n")
    append_log(args.project, "technology", "Next.js site", ["web"], "Starter Next.js SSG criado.", "pending")
    print(json.dumps({"ok": True, "web": str(web)}, ensure_ascii=False))


def command_payload_cms(args: argparse.Namespace) -> None:
    path = ensure_project(args.project)
    web = path / "web"
    web.mkdir(parents=True, exist_ok=True)
    write_text(
        web / "payload.config.ts",
        textwrap.dedent(
            """\
            import { buildConfig } from 'payload'

            export default buildConfig({
              collections: [
                { slug: 'pages', fields: [{ name: 'title', type: 'text', required: true }, { name: 'seoTitle', type: 'text' }, { name: 'seoDescription', type: 'textarea' }] },
                { slug: 'posts', fields: [{ name: 'title', type: 'text', required: true }, { name: 'slug', type: 'text', required: true }, { name: 'content', type: 'richText' }] },
                { slug: 'authors', fields: [{ name: 'name', type: 'text', required: true }, { name: 'bio', type: 'textarea' }] }
              ]
            })
            """
        ),
    )
    append_log(args.project, "technology", "Payload CMS", ["web/payload.config.ts"], "Config inicial do Payload criada.", "pending")
    print(json.dumps({"ok": True, "payload_config": str(web / "payload.config.ts")}, ensure_ascii=False))


def command_ux_web(args: argparse.Namespace) -> None:
    path = ensure_project(args.project)
    report_links = []
    for report in sorted((path / "reports").glob("**/*")):
        if report.is_file():
            report_links.append(f"<li>{report.relative_to(path)}</li>")
    pending = []
    for rel in STRATEGIC_PAGES:
        page = path / "wiki" / rel
        if page.exists():
            fm, _ = parse_frontmatter(page.read_text(encoding="utf-8"))
            if fm.get("status") != "approved":
                pending.append(f"<li>{rel}: {fm.get('status', 'sem status')}</li>")
    html = textwrap.dedent(
        f"""\
        <!doctype html>
        <html lang="pt-BR">
        <meta charset="utf-8">
        <title>SEO Brain - {args.project}</title>
        <body>
          <main>
            <h1>SEO Brain: {args.project}</h1>
            <h2>Aprovacoes pendentes</h2>
            <ul>{''.join(pending) or '<li>Nenhuma</li>'}</ul>
            <h2>Relatorios</h2>
            <ul>{''.join(report_links) or '<li>Nenhum relatorio gerado</li>'}</ul>
          </main>
        </body>
        </html>
        """
    )
    out = path / "artifacts" / "dashboard" / "index.html"
    write_text(out, html)
    append_log(args.project, "ux", "Dashboard", [str(out.relative_to(path))], "Dashboard HTML gerado.", "not-required")
    print(json.dumps({"ok": True, "dashboard": str(out)}, ensure_ascii=False))


def command_autoresearch(args: argparse.Namespace) -> None:
    skill_files = sorted(p for p in (ROOT / "skills").glob("*/SKILL.md") if not p.parts[-2].startswith("_"))
    results = []
    for skill in skill_files:
        text = skill.read_text(encoding="utf-8")
        score = 0
        checks = {
            "frontmatter": text.startswith("---\n"),
            "contract": "## Contract" in text,
            "required_behavior": "## Required Behavior" in text,
            "done_criteria": "## Done Criteria" in text,
            "shared_reference": "operating-model.md" in text or skill.parts[-2] in {"technical-seo", "data-setup"},
        }
        score = sum(20 for ok in checks.values() if ok)
        results.append({"skill": skill.parts[-2], "score": score, "checks": checks, "promoted": score >= args.threshold})
    report = {"timestamp": now_iso(), "threshold": args.threshold, "results": results, "ok": all(r["promoted"] for r in results)}
    run_dir = ROOT / "runs" / dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    write_json(run_dir / "autoresearch-report.json", report)
    print(json.dumps(report, ensure_ascii=False, indent=2))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="seo-brain")
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser("project-init")
    p.add_argument("name")
    p.add_argument("--language", default="pt-BR")
    p.add_argument("--market", default="Brasil")
    p.set_defaults(func=command_project_init)

    p = sub.add_parser("wiki-lint")
    p.add_argument("--project", required=True)
    p.set_defaults(func=command_wiki_lint)

    p = sub.add_parser("wiki-approve")
    p.add_argument("--project", required=True)
    p.add_argument("--page", required=True)
    p.add_argument("--by", required=True)
    p.set_defaults(func=command_wiki_approve)

    p = sub.add_parser("wiki-ingest")
    p.add_argument("--project", required=True)
    p.add_argument("--source", required=True)
    p.set_defaults(func=command_wiki_ingest)

    p = sub.add_parser("data-setup")
    add_dataforseo_mode_args(p)
    p.add_argument("--check", action="store_true", help="Validate credentials with free user_data request.")
    p.set_defaults(func=command_data_setup)

    for name, func in [
        ("serp-extract", command_serp_extract),
        ("keyword-research", command_keyword_research),
    ]:
        p = sub.add_parser(name)
        p.add_argument("--project", required=True)
        p.add_argument("--keyword", required=True)
        p.add_argument("--location", default="Brazil")
        p.add_argument("--language", default="pt")
        add_dataforseo_mode_args(p)
        add_callback_args(p)
        p.add_argument("--poll-interval", type=int, default=10, help="Seconds between task_get polls in standard mode.")
        p.add_argument("--timeout", type=int, default=180, help="Max seconds to wait in standard mode.")
        if name == "serp-extract":
            p.add_argument("--device", default="desktop")
            p.add_argument("--depth", type=int, default=10)
        p.set_defaults(func=func)

    p = sub.add_parser("backlink-analysis")
    p.add_argument("--project", required=True)
    p.add_argument("--target", required=True)
    add_dataforseo_mode_args(p)
    p.set_defaults(func=command_backlink_analysis)

    p = sub.add_parser("seo-analysis")
    p.add_argument("--project", required=True)
    p.add_argument("--keyword", required=True)
    p.add_argument("--provider", choices=["dataforseo", "websearch", "auto"], default="auto",
                   help="SEO data provider for SERP. Default auto: DataForSEO when configured, else websearch.")
    p.add_argument("--serp-file", help="Override path to a normalized SERP JSON (DataForSEO).")
    p.add_argument("--websearch-file", help="Override path to a websearch results JSON.")
    p.add_argument("--fetch-pages", action="store_true")
    p.set_defaults(func=command_seo_analysis)

    p = sub.add_parser("topic-cluster")
    p.add_argument("--project", required=True)
    p.add_argument("--seed", required=True)
    p.add_argument("--hypothesis-only", action="store_true",
                   help="Generate a hypothesis-grade cluster without seo-analysis precondition.")
    p.set_defaults(func=command_topic_cluster)

    p = sub.add_parser("eeat")
    p.add_argument("--project", required=True)
    p.add_argument("--claim")
    p.add_argument("--source")
    p.add_argument("--status", choices=["verified", "gap", "needs-review"], default="gap")
    p.set_defaults(func=command_eeat)

    p = sub.add_parser("content-seo")
    p.add_argument("--project", required=True)
    p.add_argument("--topic", required=True)
    p.add_argument("--keyword", help="Keyword used to locate reports/seo-analysis/<slug>.json. Defaults to topic.")
    p.add_argument("--skip-data", action="store_true",
                   help="Bypass the seo-analysis precondition. Requires --skip-data-reason.")
    p.add_argument("--skip-data-reason", help="Reason logged in the brief when --skip-data is used.")
    p.set_defaults(func=command_content_seo)

    p = sub.add_parser("technical-seo")
    p.add_argument("--project")
    p.add_argument("--url")
    p.add_argument("--html-file")
    p.add_argument("--page-type", default="unknown")
    p.set_defaults(func=command_technical_seo)

    p = sub.add_parser("next-website-creator")
    p.add_argument("--project", required=True)
    p.set_defaults(func=command_next_website_creator)

    p = sub.add_parser("payload-cms")
    p.add_argument("--project", required=True)
    p.set_defaults(func=command_payload_cms)

    p = sub.add_parser("ux-web")
    p.add_argument("--project", required=True)
    p.set_defaults(func=command_ux_web)

    p = sub.add_parser("autoresearch")
    p.add_argument("--threshold", type=int, default=90)
    p.set_defaults(func=command_autoresearch)

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    try:
        args.func(args)
        return 0
    except RuntimeError as exc:
        print(json.dumps({"ok": False, "error": str(exc)}, ensure_ascii=False), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
