# Security policy

## Supported versions

Following the publication of v0.1.0, the latest release line (currently
v0.1) and `main` receive security fixes. Earlier 0.x release lines are not
guaranteed fixes.

## Project-check trust boundary

The local checks in `.baton/config.yml` are shell commands supplied by the
checked-out branch. Any phase whose `.baton/phases.yml` entry or exit includes
`local-checks-pass` runs them during receive or write; land runs them by
default. Review both files before receiving or writing a baton on an
untrusted pull request. Baton does not pin commands to the default branch.

## Self-review process guard

The checkout token and hashed worktree path detect accidental same-checkout review or land. An owner-answered
override applies to only one implement/work cycle. This is a **process guard, not a security boundary**:
someone with local write access can edit the baton or claim an owner role in the CLI. Use a separate reviewer
and checkout for independent review; do not treat `E_SELF_REVIEW` as an authorization control.
Older batons without a worktree hash remain token-only until the next implement/work write.

## Reporting a vulnerability

Use [GitHub private vulnerability reporting](https://github.com/dermonaco-labs/baton/security/advisories/new)
to report a vulnerability. Do not open a public issue with exploit details,
tokens, credentials, or personal data. Include affected versions, steps to
reproduce, and the expected and observed outcomes. A maintainer will triage
the report privately and coordinate disclosure and remediation. If private
reporting is unavailable, open a public issue **without sensitive details**
requesting a private reporting channel.
