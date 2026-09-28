# Security policy

## Supported versions

Until the first release, only the current `main` branch receives security
fixes. After v0.1 is released, the latest release line and `main` are
supported; earlier 0.x releases are not guaranteed fixes.

## Project-check trust boundary

The local checks in `.baton/config.yml` are shell commands supplied by the
checked-out branch. Any phase whose `.baton/phases.yml` entry or exit includes
`local-checks-pass` runs them during receive or write; land runs them by
default. Review both files before receiving or writing a baton on an
untrusted pull request. Baton does not pin commands to the default branch.

## Reporting a vulnerability

Use [GitHub private vulnerability reporting](https://github.com/dermonaco-labs/baton/security/advisories/new)
to report a vulnerability. Do not open a public issue with exploit details,
tokens, credentials, or personal data. Include affected versions, steps to
reproduce, and the expected and observed outcomes. A maintainer will triage
the report privately and coordinate disclosure and remediation. If private
reporting is unavailable, open a public issue **without sensitive details**
requesting a private reporting channel.
