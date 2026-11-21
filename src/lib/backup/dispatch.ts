/**
 * GitHub workflow dispatch (MVP.md §9.1, §9.2).
 *
 * SERVER ONLY.
 *
 * The admin "Run backup now" button triggers the backup workflow through the
 * GitHub REST API. That needs a token with `actions:write` on this repository,
 * which is a real credential and lives in the environment, never in the repo.
 *
 * When the token is absent the function says so plainly instead of pretending a
 * run started. A button that silently does nothing is worse than a button that
 * explains what is missing.
 */

export type DispatchResult =
  | { ok: true; message: string }
  | { ok: false; message: string; missing?: string };

const GITHUB_API = "https://api.github.com";

function repoSlug(): string | null {
  const explicit = process.env.GITHUB_REPOSITORY?.trim();
  if (explicit && explicit.includes("/")) return explicit;
  return null;
}

/**
 * Trigger a `workflow_dispatch` on the backup workflow.
 *
 * `ref` defaults to `main` because the workflow file must exist on that branch
 * for dispatch to work at all.
 */
export async function dispatchBackupWorkflow(
  ref = "main",
): Promise<DispatchResult> {
  const token = process.env.GITHUB_BACKUP_TOKEN?.trim();
  const repo = repoSlug();

  if (!token) {
    return {
      ok: false,
      missing: "GITHUB_BACKUP_TOKEN",
      message:
        "No GitHub token is configured, so the workflow cannot be triggered from here. " +
        "Set GITHUB_BACKUP_TOKEN in the environment, or run the workflow from the Actions tab.",
    };
  }

  if (!repo) {
    return {
      ok: false,
      missing: "GITHUB_REPOSITORY",
      message:
        "GITHUB_REPOSITORY is not set, so there is no repository to dispatch against. " +
        "Set it to owner/name, or run the workflow from the Actions tab.",
    };
  }

  const workflow = process.env.GITHUB_BACKUP_WORKFLOW?.trim() || "backup-weekly.yml";

  let response: Response;
  try {
    response = await fetch(
      `${GITHUB_API}/repos/${repo}/actions/workflows/${encodeURIComponent(workflow)}/dispatches`,
      {
        method: "POST",
        headers: {
          accept: "application/vnd.github+json",
          authorization: `Bearer ${token}`,
          "x-github-api-version": "2022-11-28",
          "content-type": "application/json",
          "user-agent": "junaedhossain-admin",
        },
        body: JSON.stringify({ ref }),
        // A hung dispatch should fail the button, not hang the page.
        signal: AbortSignal.timeout(10_000),
      },
    );
  } catch (error) {
    return {
      ok: false,
      message: `Could not reach GitHub: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    };
  }

  // 204 No Content is the documented success for a dispatch.
  if (response.status === 204) {
    return { ok: true, message: `Backup workflow dispatched on ${ref}.` };
  }

  // Read the body for the real reason; GitHub puts it in `message`.
  let detail = "";
  try {
    const body = (await response.json()) as { message?: string };
    detail = body.message ?? "";
  } catch {
    detail = "";
  }

  if (response.status === 401 || response.status === 403) {
    return {
      ok: false,
      message:
        `GitHub refused the token (${response.status}). It needs the "Actions: write" ` +
        `permission on ${repo}.${detail ? ` GitHub said: ${detail}` : ""}`,
    };
  }

  if (response.status === 404) {
    return {
      ok: false,
      message:
        `Workflow "${workflow}" or repository "${repo}" was not found (404). ` +
        `Check the workflow file name and that it exists on ${ref}.`,
    };
  }

  return {
    ok: false,
    message: `GitHub returned ${response.status}${detail ? `: ${detail}` : ""}.`,
  };
}
