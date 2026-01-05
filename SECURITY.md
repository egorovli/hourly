# Security Policy

## Reporting a Vulnerability

**Do not open a public issue for security vulnerabilities.**

Instead, email [anton@egorov.io](mailto:anton@egorov.io) with:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fixes (optional)

## Response Timeline

- **Acknowledgment:** within 48 hours
- **Initial assessment:** within 7 days
- **Fix timeline:** depends on severity, typically 30-90 days

## Disclosure Policy

We follow coordinated disclosure:

1. Reporter notifies us privately
2. We investigate and develop a fix
3. Fix is released
4. Public disclosure after users have time to update

We credit reporters in release notes unless they prefer anonymity.

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest  | ✅        |
| Older   | ❌        |

Only the latest release receives security updates.

## Scope

In scope:
- Authentication and authorization flaws
- Data exposure vulnerabilities
- Injection vulnerabilities
- Cross-site scripting (XSS)

Out of scope:
- Denial of service attacks
- Social engineering
- Physical security
- Third-party dependencies (report to upstream)

