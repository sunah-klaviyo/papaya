---
view-start: 2026-05-01
---

## align: Disambiguate high level requirements and get product alignment
- owner: Sunah
- start: 2026-03-16
- end: 2026-04-10
- depends-on:

## tech-spec: Disambiguate technical requirements and produce tech spec
- owner: Sunah
- start: 2026-04-10
- end: 2026-05-22
- depends-on: align

## datastore: Build product datastore
- owner: Sunah
- start: 2026-05-22
- end: 2026-06-17
- depends-on: tech-spec

## ingestion: Spin up infrastructure and build Catalogs ingestion pipeline
- owner: Meredith
- start: 2026-05-22
- end: 2026-06-17
- depends-on: tech-spec

## backfill: Design, build, and run Catalogs backfill
- owner: Meredith
- start: 2026-06-17
- end: 2026-07-05
- depends-on: ingestion, datastore

## indexing: Build storage solution and enable indexing
- owner: Sunah
- start: 2026-06-17
- end: 2026-06-29
- depends-on: datastore

## rollout: Rollout
- owner: Sunah
- start: 2026-07-06
- end: 2026-07-10
- depends-on: backfill, indexing
