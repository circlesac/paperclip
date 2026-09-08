# GitHub private attachment authority

This records the bounded implementation and qualification boundary, not a claim
that arbitrary private GitHub files are downloadable by an installation App.

## Supported authority

GitHub documents installation access tokens for the exact
[issue-comment GET](https://docs.github.com/en/rest/issues/comments#get-an-issue-comment)
with existing Issues or Pull requests read permission. Its
`application/vnd.github.full+json` representation includes both the original
body and rendered HTML. The corresponding
[review-comment GET](https://docs.github.com/en/rest/pulls/comments#get-a-review-comment-for-a-pull-request)
requires Pull requests read and uses
`application/vnd.github-commitcomment.full+json`.

Those are legitimate fixed-repository comment reads. They do not document a
general private-attachment download API. GitHub's
[attachment documentation](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/attaching-files)
distinguishes anonymous public uploads from repository-gated private uploads;
its [private attachment change](https://github.blog/changelog/2023-05-08-more-secure-private-attachments/)
explains why knowing the original private URL is insufficient.

## Narrow implementation

1. Only attachment references from an admitted, exact provider comment receive
   a version-2 locator with the original body SHA-256. Existing four-field
   locators remain anonymous-only; replay does not invent missing provenance.
2. An anonymous 401/403/404 may trigger one exact-comment GET using the existing
   installation App, fixed `api.github.com`, no query, and no redirects. PAT,
   cookie, user-token, unbound-installation, and custom-host fallbacks are absent.
3. The authenticated response must match comment ID, repository, issue/PR,
   review-root when applicable, and the original body hash. A single anchor to
   the original asset must contain exactly one image targeting the same asset
   UUID on `private-user-images.githubusercontent.com`, with a sole JWT query.
   Ambiguous or changed renderings fail closed. HTML parsing is inert and bounded.
4. The signed image target is ephemeral. Download requests never receive App
   credentials or cookies. Existing HTTPS/public-address pinning, redirect
   allowlisting, byte/MIME validation, 20-second file and 60-second download-batch
   budgets remain. The batch budget is not a hard total admission deadline.
5. Current principal, runtime credential generation, destination, conversation,
   issue, and original input authority are checked before network access, after
   download, and under locks with attachment registration. Storage I/O is outside
   governance transactions; explicit revocation after storage removes the new,
   unregistered blob. No provider response HTML or signed query enters the
   delivery ledger, model context, or logs.

## Remaining gap and truthful UX

The real private text fixture under `/user-attachments/files/31948982/` remained
unavailable to anonymous intake; its provider browser anchor remained the
original file URL. The image-specific canonical mapping above does not invent
a signed generic-file endpoint. Such files remain a current-input
`download_unavailable` omission: no imported bytes, no claim of inspection, and
no substitution of an older task file. Activity currently shows that closed
omission rather than asserting that every 404 specifically means “private.”

Outbound is separate: the official
[GitHub CLI uploader](https://github.com/cli/cli/blob/trunk/internal/attachments/client.go)
allows OAuth, personal-access, and fine-grained personal-access tokens, not App
installation tokens. Paperclip keeps the private-task output-file fallback and
does not acquire extra repository permissions or impersonate the browser user.

## Qualification gate

Contract tests prove the real SDK's installation-token exchange and fixed
guarded comment GET, exact body/source binding, old-locator compatibility,
restart reconstruction, credential-free bytes, malformed/ambiguous rendering
denial, and revocation during download/storage. They are not live provider proof.

On the signed-in provider browser, upload a new private image to the existing
authorized test issue/PR comment, ask Maya to inspect that exact image, and
compare the stored hash/bytes with the fixture. Verify that no signed URL or
HTML is persisted. Repeat with a private text file; unless GitHub actually
provides a separately reviewed supported representation, it must still report
unavailable without substituting another attachment. Then test a review-comment
image and a changed/deleted source. Do not make the repository public to obtain
a passing result.
