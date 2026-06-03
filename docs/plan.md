---
view-start: 2026-05-01
---

## align: Disambiguate high-level requirements
- owner: Sunah
- start: 2026-03-16
- end: 2026-04-10
- depends-on:

## tech-spec: Disambiguate technical requirements and produce tech spec
- owner: Sunah
- start: 2026-04-10
- end: 2026-05-22
- depends-on: align

## datastore: Build unified product datastore
- owner: Sunah
- start: 2026-05-22
- end: 2026-06-17
- depends-on: tech-spec

## ingestion: Build Catalogs Ingestion
- owner: Meredith
- start: 2026-05-22
- end: 2026-06-17
- depends-on: tech-spec

## integration: Build Catalogs Integration
- owner: Meredith
- start: 2026-05-25
- end: 2026-06-12
- depends-on: tech-spec

## search: Support indexing and search
- owner: Sunah
- start: 2026-06-17
- end: 2026-06-29
- depends-on: datastore

## backfill: Build Catalogs Backfill
- owner: Meredith
- start: 2026-06-17
- end: 2026-07-05
- depends-on: ingestion, datastore

## agent-ui: Support agent context input and build UI component
- owner: Sunah
- start: 2026-06-29
- end: 2026-07-11
- depends-on: search

## rollout: Rollout
- owner: Sunah
- start: 2026-07-11
- end: 2026-07-15
- depends-on: agent-ui, backfill
