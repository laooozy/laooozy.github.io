# Security policy

## Supported versions

This is a static personal site, not a versioned library. Only the latest commit
on `main` and the deployment it produces are supported.

| Version                 | Supported |
| :---------------------- | :-------- |
| Latest commit on `main` | Yes       |
| Older commits and forks | No        |

## Reporting a vulnerability

Do not open a public issue for a security problem.

Use GitHub private vulnerability reporting from the repository's **Security**
tab if it is available to you. You can also email
[laooozy@outlook.com](mailto:laooozy@outlook.com) with:

- A short description of the issue and its impact.
- Steps to reproduce, or a minimal proof of concept.
- The affected URL or file, and the browser or environment you used.
- Any suggested fix or mitigation.

If you use email, please keep the details private until a fix is deployed.

## Scope

In scope:

- Source code, build scripts and configuration in this repository.
- The GitHub Actions workflows and the deployed site at
  <https://laooozy.github.io>.
- Client-side behavior such as the locale switch, search, the music player and
  the Instagram gate.

Out of scope:

- GitHub Pages, GitHub itself and other third-party services.
- Copyright or content-licensing disputes. See [LICENSE](LICENSE) instead.
- Spam, social engineering and reports that require attacking accounts or data
  you do not own.
- Denial-of-service testing against the live site.
- A dependency advisory with no reachable path in this project.

## Response expectations

This is a volunteer-run personal project. I aim to acknowledge a report within
5 business days and give an initial assessment within 10 business days. Fix
timing depends on severity and available time. There is no bug bounty.
