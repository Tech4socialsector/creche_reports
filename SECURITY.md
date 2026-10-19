# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in this app, please report it privately rather than opening a public GitHub issue.

Email: **tech4socialsector@azimpremjifoundation.org**

Please include:
- A description of the vulnerability and its potential impact
- Steps to reproduce (proof-of-concept code or requests, if applicable)
- The affected version/commit

We will acknowledge receipt within 5 business days and aim to provide a fix or mitigation plan within 30 days, depending on severity.

## Scope

This app manages financial data (budgets, disbursements, utilisation reports) for creche partners. Data access is scoped per user via standard Frappe "User Permission" records against Creche Partners, Creche Budget, State, District, and Block. Any report of a way to view or modify data outside a user's permitted scope is treated as high priority.

## Supported Versions

Security fixes are applied to the `develop` branch and released from there. There is no separate long-term-support branch at this time.
