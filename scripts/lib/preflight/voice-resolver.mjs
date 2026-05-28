const VOICE_PATH = "wiki/tom-de-voz/index.md";

export function resolveVoicePolicy({ wikiContext }) {
  const page = (wikiContext?.pages || []).find((p) => p.path === VOICE_PATH);
  if (!page || !page.exists) {
    return {
      status: "missing",
      path: VOICE_PATH,
      recommendation: "block-until-approved",
    };
  }
  const status = String(page.status || "").toLowerCase();
  if (status === "approved") {
    return {
      status: "approved",
      path: VOICE_PATH,
      recommendation: "use-current",
    };
  }
  if (status === "draft") {
    return {
      status: "draft-as-guide",
      path: VOICE_PATH,
      recommendation: "use-draft",
    };
  }
  return {
    status: "draft-as-guide",
    path: VOICE_PATH,
    recommendation: "use-draft",
  };
}
