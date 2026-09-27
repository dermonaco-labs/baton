The fixture generator copies the pinned, licensed ATV agent payloads from
`baton.lock.json`, then removes every newline. This reproduces the
ATV v2.6.3 frontmatter corruption signature without vendoring another
unverified upstream version. Run `node test/fixtures/make-broken.mjs <destination>`
to populate a disposable fixture directory.
