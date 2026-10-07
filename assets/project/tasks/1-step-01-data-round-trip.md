# 1-step-01-data-round-trip

Replace the mock data behind the approved UI with a real end-to-end data round-trip.

## Goal

The first screen that writes data does it through the real API and persistence layer, and the saved record reads back after a refresh. The UI approved in 0-gate-ui-review does not change; only what is behind it does.

## Deliverables

- The mock behind one write path replaced by a real API call that persists a single record
- The matching read path replaced by a real query that returns the record after a refresh
- The mock module still used by every screen not yet wired, so nothing breaks half-way

## Acceptance Criteria

- Write one record through the approved UI form.
- Refresh the page / re-query; verify the saved record appears.
- The screen looks the same as it did at sign-off in 0-gate-ui-review.

**Depends:** 0-gate-deploy · **Blocks:** the rest of Phase 1 · **handoff:** software-engineer
