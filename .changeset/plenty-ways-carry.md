---
'kolorist': minor
---

Add support for 24bit TrueColor detection.

This is supported in nearly every modern terminals these days. The exception to that is the built in Terminal app on macOS and CI systems. TrueColor values are automatically converted to Ansi 256 when TrueColor isn't supported, but Ansi 256 is. The only case where I found that in practice was with Terminal.app on macOS which only supports Ansi 256.
