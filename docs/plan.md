---
view-start: 2026-05-04
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
- start: 2026-05-28
- days: 5
- end: 2026-06-03
- depends-on: tech-spec

## evals: Evals
- owner: Sunah
- start: 2026-05-22
- days: 3
- end: 2026-05-26
- depends-on: tech-spec

## ingestion: Spin up infrastructure and build Catalogs ingestion pipeline
- owner: Meredith
- start: 2026-05-22
- days: 7
- end: 2026-06-01
- depends-on: tech-spec

## backfill: Design, build, and run Catalogs backfill
- owner: Meredith
- start: 2026-06-03
- days: 10
- end: 2026-06-16
- depends-on: ingestion, datastore

## indexing: Build storage solution and enable indexing
- owner: Sunah
- start: 2026-06-03
- days: 7
- end: 2026-06-11
- depends-on: datastore

## rollout: Rollout
- owner: Sunah
- start: 2026-07-06
- days: 5
- end: 2026-07-10
- depends-on: backfill, indexing

## pto: PTO
- Meredith: 2026-05-08
- Sunah: 2026-06-09
